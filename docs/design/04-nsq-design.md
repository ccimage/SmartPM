# SmartPM NSQ 消息队列设计

> 版本：v1.0 | 日期：2026-04-30 | 依赖：01-architecture.md、02-database.md

---

## 一、为什么引入 NSQ

三个场景必须异步，同步处理会直接阻塞请求：

| 场景         | 问题                                      | NSQ 解法                    |
|------------|------------------------------------------|---------------------------|
| 通知投递     | 一次任务变更可能触发多人通知 + WebSocket 推送 | 发完消息立即返回，Consumer 异步处理 |
| AI 任务处理  | LLM 调用耗时 5~30s，不能同步等待            | 异步队列 + 状态轮询/推送        |
| 活动日志写入  | 每次操作都写日志，不能让日志 IO 拖慢业务      | 发完即忘，Consumer 批量落库     |

其余模块（任务 CRUD、评论、文件上传）直接同步处理，不走 NSQ。

---

## 二、NSQ 基础概念（项目约定）

```
Producer  →  Topic  →  Channel  →  Consumer
```

- 一个 Topic 可以有多个 Channel，每个 Channel 独立消费全量消息
- 同一 Channel 下多个 Consumer 实例竞争消费（负载均衡）
- 本项目初期单实例部署，每个 Topic 只有一个 Channel

---

## 三、Topic 总览

| Topic               | 生产者模块                    | Channel                    | 消费者                    |
|--------------------|-----------------------------|-----------------------------|--------------------------|
| `notification.send` | Task / Comment / AI 模块    | `notification.send.default` | NotificationConsumer     |
| `ai.task`           | AI 模块                     | `ai.task.default`           | AIConsumer               |
| `activity.log`      | 所有业务模块                  | `activity.log.default`      | ActivityLogConsumer      |

---

## 四、统一消息信封

所有消息使用同一外层结构，Consumer 先解信封再处理 payload：

```typescript
interface NSQEnvelope<T = unknown> {
  id: string;        // 消息唯一 ID，UUID
  topic: string;     // 所属 topic，冗余字段，便于日志追踪
  type: string;      // 事件类型，见各 topic 定义
  payload: T;        // 业务数据
  timestamp: number; // 发送时间，Unix ms
}
```

**生产者工具函数**

```typescript
function buildMessage<T>(topic: string, type: string, payload: T): NSQEnvelope<T> {
  return {
    id: randomUUID(),
    topic,
    type,
    payload,
    timestamp: Date.now(),
  };
}
```

---

## 五、Topic 详细设计

### 5.1 notification.send

**职责**：将业务事件转化为用户通知，写库并通过 WebSocket 推送。

#### 事件类型

| type                  | 触发时机               | 通知接收人         |
|----------------------|----------------------|-----------------|
| `task.assigned`       | 任务被分配给某人         | assignee        |
| `task.due_soon`       | 任务距截止日 ≤ 1 天（定时触发）| assignee        |
| `comment.mentioned`   | 评论中 @提及某人         | 被提及的用户       |
| `ai.done`             | AI 任务处理完成          | 触发 AI 的用户    |
| `ai.failed`           | AI 任务处理失败          | 触发 AI 的用户    |

#### Payload 结构

```typescript
// task.assigned
interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  assigneeId: string;   // 通知接收人
  assignedBy: string;   // 操作人 userId
}

// comment.mentioned
interface CommentMentionedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  mentionedUserId: string;  // 通知接收人
  commentAuthorId: string;
  contentPreview: string;   // 评论内容前 100 字
}

// ai.done / ai.failed
interface AIDonePayload {
  aiLogId: string;
  userId: string;       // 通知接收人
  type: string;         // generate_tasks / split_requirement / daily_summary
  projectId: string | null;
}
```

#### Consumer 处理逻辑

```
1. 解析消息，确定 userId（通知接收人）
2. 写入 notifications 表
3. 查询该用户是否有在线 WebSocket 连接
4. 有连接 → 通过 WebSocket Gateway 推送
5. 无连接 → 仅写库，用户下次登录时拉取
6. 处理完成 → ACK
7. 失败 → REQUEUE（最多 3 次），超限后写 dead-letter 日志
```

---

### 5.2 ai.task

**职责**：异步执行 AI 任务，结果回写数据库，完成后触发通知。

#### 事件类型

| type                  | 含义           |
|----------------------|--------------|
| `generate_tasks`      | 根据描述生成任务列表 |
| `split_requirement`   | 将需求文档拆分为子任务 |
| `daily_summary`       | 汇总当日任务生成日报 |

#### Payload 结构

```typescript
// 所有 AI 任务共用基础结构
interface AITaskPayload {
  aiLogId: string;    // ai_logs 表主键，Consumer 通过此 ID 回写结果
  userId: string;
  projectId: string | null;
  type: string;
  input: string;      // 用户输入文本
}
```

#### Consumer 处理逻辑

```
1. 根据 aiLogId 查 ai_logs，确认状态为 pending
2. 更新 ai_logs.status = 'processing'
3. 根据 type 选择对应 prompt 模板，拼装 input
4. 调用 LLM API（流式或非流式）
5. 成功：
   a. 更新 ai_logs.status = 'done'，写入 output_text
   b. 发布 notification.send 消息（type: ai.done）
6. 失败：
   a. 更新 ai_logs.status = 'failed'，extra 写入错误信息
   b. 发布 notification.send 消息（type: ai.failed）
7. ACK（无论成功失败都 ACK，不 REQUEUE）
```

> AI 任务不 REQUEUE：LLM 调用失败通常是配额/网络问题，重试无意义，由用户手动重试。

---

### 5.3 activity.log

**职责**：异步记录所有业务操作，写入 activity_logs 表。

#### 事件类型（action 字段）

| type                    | 含义         |
|------------------------|------------|
| `task.created`          | 创建任务     |
| `task.updated`          | 更新任务     |
| `task.deleted`          | 删除任务     |
| `task.assigned`         | 分配任务     |
| `task.status_changed`   | 任务状态变更 |
| `comment.added`         | 添加评论     |
| `comment.deleted`       | 删除评论     |
| `project.created`       | 创建项目     |
| `member.added`          | 添加成员     |
| `member.removed`        | 移除成员     |

#### Payload 结构

```typescript
interface ActivityLogPayload {
  workspaceId: string;
  projectId: string | null;
  userId: string;
  action: string;
  entityType: string;   // task / comment / project / member
  entityId: string;
  extra?: {
    before?: Record<string, unknown>;  // 变更前快照（update 类操作）
    after?: Record<string, unknown>;   // 变更后快照
    [key: string]: unknown;
  };
}
```

#### Consumer 处理逻辑

```
1. 解析消息
2. 直接 INSERT INTO activity_logs
3. ACK
4. 失败 → REQUEUE（最多 5 次，日志写入不能丢）
```

> activity.log 是唯一需要积极 REQUEUE 的 topic，日志丢失不可接受。

---

## 六、生产者调用规范

在 NestJS 中封装统一的 NSQ Producer Service，业务模块只调用此 Service，不直接操作 NSQ 连接：

```typescript
@Injectable()
export class NSQProducerService {
  publish<T>(topic: string, type: string, payload: T): void {
    const message = buildMessage(topic, type, payload);
    // 序列化为 JSON，发布到 nsqd
    this.nsqd.publish(topic, JSON.stringify(message));
  }
}
```

**业务模块调用示例**

```typescript
// TaskService 中，任务分配后发通知 + 记日志
this.nsq.publish('notification.send', 'task.assigned', {
  taskId, taskTitle, projectId, projectName, assigneeId, assignedBy,
});

this.nsq.publish('activity.log', 'task.assigned', {
  workspaceId, projectId, userId: assignedBy,
  action: 'task.assigned',
  entityType: 'task', entityId: taskId,
  extra: { after: { assigneeId } },
});
```

---

## 七、错误处理与重试策略

| Topic               | 失败策略                        | 最大重试 | 说明                        |
|--------------------|-------------------------------|--------|---------------------------|
| `notification.send` | REQUEUE with backoff           | 3 次   | 超限记 dead-letter 日志，不阻塞  |
| `ai.task`           | 直接 ACK，更新状态为 failed      | 不重试  | 由用户手动重试                 |
| `activity.log`      | REQUEUE with backoff           | 5 次   | 日志不能丢，超限告警              |

**REQUEUE 退避策略**

```
第 1 次失败 → 延迟 5s 重试
第 2 次失败 → 延迟 30s 重试
第 3 次失败 → 延迟 120s 重试
超限 → 写 error 日志，ACK 丢弃（notification）或告警（activity.log）
```

---

## 八、部署配置

### Docker Compose 片段

```yaml
nsqlookupd:
  image: nsqio/nsq:v1.3.0
  command: /nsqlookupd
  ports:
    - "4160:4160"   # TCP
    - "4161:4161"   # HTTP

nsqd:
  image: nsqio/nsq:v1.3.0
  command: /nsqd --lookupd-tcp-address=nsqlookupd:4160
  ports:
    - "4150:4150"   # TCP（Producer/Consumer 连接）
    - "4151:4151"   # HTTP
  depends_on:
    - nsqlookupd

nsqadmin:
  image: nsqio/nsq:v1.3.0
  command: /nsqadmin --lookupd-http-address=nsqlookupd:4161
  ports:
    - "4171:4171"   # Web UI
  depends_on:
    - nsqlookupd
```

### NestJS 环境变量

```env
NSQ_HOST=localhost
NSQ_PORT=4150
NSQ_LOOKUPD_HTTP=http://localhost:4161
```

---

## 九、监控要点

| 指标                        | 告警阈值     | 说明                    |
|---------------------------|------------|------------------------|
| `ai.task` 队列深度           | > 50       | AI 处理积压，可能 LLM 超时  |
| `activity.log` 队列深度      | > 200      | 日志写入积压              |
| `notification.send` 失败率   | > 5%       | 通知投递异常              |
| `ai.task` Consumer 处理时长  | > 60s      | LLM 响应超时             |

通过 nsqadmin Web UI（`:4171`）或 NSQ HTTP API 采集以上指标。
