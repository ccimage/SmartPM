# SmartPM AI 模块设计

> 版本：v1.0 | 日期：2026-04-30 | 依赖：01-architecture.md、02-database.md、04-nsq-design.md

---

## 一、定位与边界

AI 模块是 SmartPM 相对 tower.im 的核心差异点。三个功能：

| 功能           | 入口               | 输出                     |
|--------------|------------------|------------------------|
| AI 任务生成     | 用户输入需求描述       | 结构化任务列表，可一键导入项目  |
| AI 需求拆分     | 用户粘贴需求文档       | 多级子任务树，含优先级和截止建议 |
| AI 日报总结     | 用户触发（或定时）     | 当日任务进展的自然语言总结      |

**边界**：AI 只生成建议，不自动写库。用户确认后，由前端调用标准任务 CRUD 接口落库。唯一例外是日报总结，直接写入 `ai_logs.output_text`，前端展示即可。

---

## 二、整体异步流程

```
用户触发
   │
   ▼
POST /api/v1/ai/:type          ← 同步接口，只做入队
   │
   ├─ 写 ai_logs (status=pending)
   └─ 发布 NSQ ai.task 消息
         │
         ▼
   AIConsumer（后台）
         │
         ├─ 更新 status=processing
         ├─ 调用 LLM API
         │
         ├─ 成功 ──► 更新 status=done，写 output_text
         │           发布 notification.send (ai.done)
         │
         └─ 失败 ──► 更新 status=failed，写 extra.error
                     发布 notification.send (ai.failed)

用户轮询 / WebSocket 推送
   │
   ▼
GET /api/v1/ai/logs/:aiLogId   ← 查询结果
```

---

## 三、API 接口

### 3.1 触发 AI 任务生成

```
POST /api/v1/ai/generate-tasks
```

**Request**

```json
{
  "projectId": "uuid",
  "input": "开发一个用户登录功能，支持邮箱密码登录和第三方 OAuth，需要前后端联调"
}
```

**Response 202**

```json
{
  "data": {
    "aiLogId": "uuid",
    "status": "pending"
  }
}
```

---

### 3.2 触发 AI 需求拆分

```
POST /api/v1/ai/split-requirement
```

**Request**

```json
{
  "projectId": "uuid",
  "input": "## 用户管理模块\n需要支持注册、登录、找回密码、个人信息编辑、头像上传..."
}
```

**Response 202**

```json
{
  "data": {
    "aiLogId": "uuid",
    "status": "pending"
  }
}
```

---

### 3.3 触发 AI 日报总结

```
POST /api/v1/ai/daily-summary
```

**Request**

```json
{
  "projectId": "uuid",
  "date": "2026-04-30"   // 可选，默认今天
}
```

**Response 202**

```json
{
  "data": {
    "aiLogId": "uuid",
    "status": "pending"
  }
}
```

---

### 3.4 查询 AI 任务结果

```
GET /api/v1/ai/logs/:aiLogId
```

**Response 200（处理中）**

```json
{
  "data": {
    "aiLogId": "uuid",
    "type": "generate_tasks",
    "status": "processing",
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

**Response 200（完成）**

```json
{
  "data": {
    "aiLogId": "uuid",
    "type": "generate_tasks",
    "status": "done",
    "result": {
      "tasks": [
        {
          "title": "设计登录页面 UI",
          "description": "包含邮箱输入框、密码框、登录按钮、OAuth 入口",
          "priority": "high",
          "estimatedDays": 1
        }
      ]
    },
    "createdAt": "2026-04-30T10:00:00Z",
    "updatedAt": "2026-04-30T10:00:15Z"
  }
}
```

**Response 200（失败）**

```json
{
  "data": {
    "aiLogId": "uuid",
    "type": "generate_tasks",
    "status": "failed",
    "error": "LLM API 调用超时，请重试",
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 3.5 获取 AI 日志列表

```
GET /api/v1/ai/logs?projectId=uuid&page=1&limit=20
```

**Response 200**

```json
{
  "data": [
    {
      "aiLogId": "uuid",
      "type": "generate_tasks",
      "status": "done",
      "inputPreview": "开发一个用户登录功能...",
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### 3.6 确认导入 AI 生成的任务

仅 `generate_tasks` 和 `split_requirement` 需要此步骤。用户在前端确认后调用：

```
POST /api/v1/ai/logs/:aiLogId/import
```

**Request**

```json
{
  "tasks": [
    {
      "title": "设计登录页面 UI",
      "description": "...",
      "priority": "high",
      "parentId": null
    }
  ]
}
```

> 前端可在确认前编辑任务列表，最终提交的是用户修改后的版本。

**Response 201**

```json
{
  "data": {
    "imported": 5,
    "taskIds": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
  }
}
```

---

## 四、Prompt 模板

### 4.1 generate_tasks

```
你是一个项目管理助手。根据用户的需求描述，生成一组可执行的开发任务。

要求：
- 每个任务标题简洁，不超过 30 字
- 每个任务包含简短描述（1-2 句话）
- 优先级从 low / normal / high / urgent 中选择
- 预估工作天数（estimatedDays），整数
- 任务数量控制在 3~10 个
- 只输出 JSON，不要解释

输出格式：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "priority": "normal",
      "estimatedDays": 1
    }
  ]
}

用户需求：
{{input}}
```

---

### 4.2 split_requirement

```
你是一个项目管理助手。根据用户提供的需求文档，将其拆分为多级任务树。

要求：
- 顶级任务代表功能模块
- 子任务代表具体开发项
- 最多两级（顶级 + 子任务），不要三级
- 每个任务包含标题、描述、优先级
- 只输出 JSON，不要解释

输出格式：
{
  "tasks": [
    {
      "title": "顶级任务标题",
      "description": "模块描述",
      "priority": "high",
      "children": [
        {
          "title": "子任务标题",
          "description": "子任务描述",
          "priority": "normal"
        }
      ]
    }
  ]
}

需求文档：
{{input}}
```

---

### 4.3 daily_summary

```
你是一个项目管理助手。根据以下任务数据，生成一份简洁的当日工作总结。

要求：
- 总结分三段：今日完成、进行中、待处理
- 语言简洁，每段不超过 3 句话
- 如果某类任务为空，跳过该段
- 直接输出自然语言，不要 JSON，不要标题

任务数据（{{date}}）：
已完成：{{doneTasks}}
进行中：{{inProgressTasks}}
待处理（截止日期最近的 5 条）：{{pendingTasks}}
```

---

## 五、AIConsumer 实现要点

### 5.1 数据准备（daily_summary 特殊处理）

`generate_tasks` 和 `split_requirement` 直接用 `ai_logs.input_text` 作为 prompt 输入。

`daily_summary` 需要在 Consumer 内查库组装数据：

```typescript
async function buildDailySummaryInput(projectId: string, date: string) {
  const start = `${date}T00:00:00Z`;
  const end   = `${date}T23:59:59Z`;

  const done = await taskRepo.find({
    where: { projectId, status: 'done', updatedAt: Between(start, end) },
    select: ['title'],
  });

  const inProgress = await taskRepo.find({
    where: { projectId, status: 'in_progress' },
    select: ['title'],
  });

  const pending = await taskRepo.find({
    where: { projectId, status: 'todo', dueDate: Not(IsNull()) },
    order: { dueDate: 'ASC' },
    take: 5,
    select: ['title', 'dueDate'],
  });

  return { date, doneTasks: done, inProgressTasks: inProgress, pendingTasks: pending };
}
```

### 5.2 输出解析

`generate_tasks` 和 `split_requirement` 输出 JSON，需要做防御性解析：

```typescript
function parseJSON(raw: string): unknown {
  // LLM 有时会在 JSON 外包裹 markdown 代码块
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}
```

`daily_summary` 输出自然语言，直接存 `output_text`，无需解析。

### 5.3 结果存储

```typescript
// output_text 存原始 LLM 输出
// extra.parsed 存解析后的结构化数据（generate_tasks / split_requirement）
await aiLogRepo.update(aiLogId, {
  status: 'done',
  outputText: rawOutput,
  extra: { parsed: parsedResult },
  updatedAt: new Date(),
});
```

前端查询时，`result` 字段直接取 `extra.parsed`（日报取 `output_text`）。

---

## 六、前端交互设计

### generate_tasks / split_requirement

```
用户填写描述 → 点击"AI 生成"
   │
   ▼
POST /ai/generate-tasks → 返回 aiLogId
   │
   ▼
前端轮询 GET /ai/logs/:aiLogId（每 2s，最多 30 次）
   │
   ├─ status=processing → 显示 loading
   ├─ status=done       → 展示任务列表，用户可编辑
   └─ status=failed     → 显示错误，提供重试按钮
         │
         ▼（用户确认）
POST /ai/logs/:aiLogId/import → 任务写库
```

> 也可用 WebSocket 推送替代轮询，收到 `ai.done` 通知后刷新结果。两种方式均支持，前端按需选择。

### daily_summary

```
用户点击"生成日报" → POST /ai/daily-summary
   │
   ▼
WebSocket 推送 ai.done → 前端展示总结文本
（无需导入步骤，直接展示）
```

---

## 七、ai_logs 状态流转

```
pending
   │
   ▼ Consumer 开始处理
processing
   │
   ├─ LLM 成功 ──► done
   └─ LLM 失败 ──► failed
                      │
                      └─ 用户手动重试 ──► pending（重新入队）
```

**重试接口**

```
POST /api/v1/ai/logs/:aiLogId/retry
```

将 `ai_logs.status` 重置为 `pending`，重新发布 NSQ 消息。

---

## 八、LLM 接入约定

- 模型：默认 `claude-sonnet-4-6`，可通过环境变量覆盖
- 超时：单次调用 60s，超时视为失败
- 温度：`generate_tasks` / `split_requirement` 用 `temperature=0.3`（稳定输出），`daily_summary` 用 `temperature=0.7`（自然语言）
- 环境变量：

```env
LLM_PROVIDER=anthropic          # anthropic / openai
LLM_MODEL=claude-sonnet-4-6
LLM_API_KEY=sk-...
LLM_TIMEOUT_MS=60000
```
