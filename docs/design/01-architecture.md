# SmartPM 系统架构设计

> 版本：v1.0 | 日期：2026-04-30

---

## 一、项目定位

对标 tower.im，面向中小团队的项目管理工具，核心差异点是 **AI 增强能力**。

约束条件：
- 目标规模：1000 人以内团队
- 开发模式：AI 辅助开发 + 快速迭代
- 架构原则：先能跑，再优雅；先单体，再扩展

---

## 二、架构风格

**模块化单体（Modular Monolith）**

理由：
- 1000 人规模不需要微服务
- AI 生成代码在单体架构下更稳定
- 调试成本低，后期可按模块拆分

---

## 三、整体架构图

```
┌──────────────────────────────────────┐
│               前端层                  │
│   Vue3 + Vite + Pinia + vxe-table    │
│   - 项目管理 UI                       │
│   - 实时协作（WebSocket）              │
└──────────────┬───────────────────────┘
               │ HTTP / WebSocket
┌──────────────▼───────────────────────┐
│           API 网关层（可选）           │
│   - 统一鉴权                          │
│   - 请求日志                          │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│           后端应用层（NestJS）         │
│                                      │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Auth     │  │ Notification     │  │
│  │ User     │  │ Activity Log     │  │
│  │ Workspace│  │ WebSocket Gateway│  │
│  │ Project  │  └──────────────────┘  │
│  │ Task     │                        │
│  │ Comment  │  ┌──────────────────┐  │
│  │ File     │  │ AI 模块 ⭐        │  │
│  └──────────┘  │ - 任务生成        │  │
│                │ - 需求拆分        │  │
│                │ - 日报总结        │  │
│                └──────────────────┘  │
└──────────────┬───────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────────┐
│  PostgreSQL  │  │       NSQ           │
│  - 业务数据  │  │  - 通知投递队列      │
│  - JSONB扩展 │  │  - AI 任务队列      │
└─────────────┘  │  - 活动日志队列      │
                 └──────────────────────┘
                        │
              ┌─────────┴──────────┐
              │                    │
       ┌──────▼──────┐    ┌────────▼──────┐
       │    Redis     │    │    RustFS     │
       │  - 会话缓存  │    │  - 文件存储   │
       │  - 热点数据  │    └───────────────┘
       └─────────────┘
```

---

## 四、技术栈

| 层       | 技术                                  |
|---------|--------------------------------------|
| 前端     | Vue3 + Vite + Pinia + vxe-table      |
| 后端     | NestJS（Node.js + TypeScript）        |
| 数据库   | PostgreSQL                           |
| 缓存     | Redis                                |
| 消息队列 | NSQ                                  |
| 文件存储 | RustFS                               |
| 实时通信 | WebSocket（Socket.io）               |
| 部署     | Docker + Linux                       |

---

## 五、模块拆分

### 1. 用户与组织

```
User        — 用户账号
Workspace   — 工作区（团队）
Membership  — 成员关系
```

权限模型（简化 RBAC）：`owner / admin / member`，不做复杂权限树。

---

### 2. 项目管理

```
Project        — 项目
ProjectMember  — 项目成员
```

---

### 3. 任务系统（核心）

```
Task     — 任务（支持子任务，parent_id 自引用）
Tag      — 标签
TaskTag  — 任务标签关联
```

状态：`todo / in_progress / done`（字符串枚举，不做状态机）

---

### 4. 协作系统

```
Comment      — 评论（支持 @提及）
ActivityLog  — 操作记录（异步写入，走 NSQ）
```

---

### 5. 文件系统

```
File         — 文件元数据
FileRelation — 文件关联（task / comment）
```

---

### 6. 通知系统

```
Notification — 站内通知（异步投递，走 NSQ）
```

流程：业务操作 → 发布到 NSQ `notification.send` → Consumer 写库 + WebSocket 推送

---

### 7. AI 模块（差异点 ⭐）

```
AI任务生成   — 根据描述生成任务列表
AI需求拆分   — 将需求文档拆分为子任务
AI日报总结   — 汇总当日任务生成日报
AILog        — AI 调用记录
```

所有 AI 操作均为异步：用户触发 → 发布到 NSQ `ai.task` → Consumer 调用 LLM → 结果回写 → 通知用户

---

## 六、NSQ 设计

### Topic 定义

| Topic               | 生产者           | 消费者                        | 说明               |
|--------------------|-----------------|------------------------------|--------------------|
| `notification.send` | 任务/评论/AI模块 | NotificationConsumer         | 通知异步投递        |
| `ai.task`           | AI 模块         | AIConsumer                   | AI 任务异步处理     |
| `activity.log`      | 所有业务模块     | ActivityLogConsumer          | 操作日志异步落库    |

### Channel 命名规范

```
<topic>.<consumer-group>
例：notification.send.ws-push
    notification.send.email-push（未来扩展）
```

### 消息格式（统一结构）

```typescript
interface NSQMessage<T> {
  id: string;        // UUID
  type: string;      // topic 内的事件类型
  payload: T;        // 业务数据
  timestamp: number; // Unix ms
}
```

---

## 七、核心表结构

### users

```sql
id           UUID PRIMARY KEY
email        VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
name         VARCHAR(100) NOT NULL
avatar_url   VARCHAR(500)
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

---

### workspaces

```sql
id         UUID PRIMARY KEY
name       VARCHAR(100) NOT NULL
owner_id   UUID REFERENCES users(id)
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

### workspace_members

```sql
id           UUID PRIMARY KEY
workspace_id UUID REFERENCES workspaces(id)
user_id      UUID REFERENCES users(id)
role         VARCHAR(20) NOT NULL  -- owner/admin/member
created_at   TIMESTAMPTZ DEFAULT NOW()
UNIQUE(workspace_id, user_id)
```

---

### projects

```sql
id           UUID PRIMARY KEY
workspace_id UUID REFERENCES workspaces(id)
name         VARCHAR(200) NOT NULL
description  TEXT
created_by   UUID REFERENCES users(id)
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
deleted_at   TIMESTAMPTZ  -- 软删除
```

---

### project_members

```sql
id         UUID PRIMARY KEY
project_id UUID REFERENCES projects(id)
user_id    UUID REFERENCES users(id)
role       VARCHAR(20) NOT NULL
created_at TIMESTAMPTZ DEFAULT NOW()
UNIQUE(project_id, user_id)
```

---

### tasks

```sql
id          UUID PRIMARY KEY
project_id  UUID REFERENCES projects(id)
parent_id   UUID REFERENCES tasks(id)  -- 子任务
title       VARCHAR(500) NOT NULL
description TEXT
status      VARCHAR(20) NOT NULL DEFAULT 'todo'  -- todo/in_progress/done
priority    VARCHAR(20) DEFAULT 'normal'          -- low/normal/high/urgent
assignee_id UUID REFERENCES users(id)
creator_id  UUID REFERENCES users(id)
due_date    DATE
extra       JSONB        -- 扩展字段
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
deleted_at  TIMESTAMPTZ  -- 软删除
```

---

### task_tags

```sql
id         UUID PRIMARY KEY
project_id UUID REFERENCES projects(id)
name       VARCHAR(50) NOT NULL
color      VARCHAR(20)
```

---

### task_tag_rel

```sql
task_id UUID REFERENCES tasks(id)
tag_id  UUID REFERENCES task_tags(id)
PRIMARY KEY(task_id, tag_id)
```

---

### comments

```sql
id         UUID PRIMARY KEY
task_id    UUID REFERENCES tasks(id)
user_id    UUID REFERENCES users(id)
content    TEXT NOT NULL
extra      JSONB  -- 存储 @提及 等元数据
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
deleted_at TIMESTAMPTZ
```

---

### activity_logs

```sql
id           UUID PRIMARY KEY
workspace_id UUID REFERENCES workspaces(id)
project_id   UUID REFERENCES projects(id)
user_id      UUID REFERENCES users(id)
action       VARCHAR(100) NOT NULL  -- task.created / task.updated / comment.added ...
entity_type  VARCHAR(50) NOT NULL   -- task / comment / project
entity_id    UUID NOT NULL
extra        JSONB
created_at   TIMESTAMPTZ DEFAULT NOW()
```

---

### notifications

```sql
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id)
type       VARCHAR(50) NOT NULL
content    TEXT
is_read    BOOLEAN DEFAULT FALSE
extra      JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

### files

```sql
id          UUID PRIMARY KEY
url         VARCHAR(1000) NOT NULL
filename    VARCHAR(500) NOT NULL
size        BIGINT
mime_type   VARCHAR(100)
uploaded_by UUID REFERENCES users(id)
created_at  TIMESTAMPTZ DEFAULT NOW()
```

---

### file_relations

```sql
id          UUID PRIMARY KEY
file_id     UUID REFERENCES files(id)
entity_type VARCHAR(50) NOT NULL  -- task / comment
entity_id   UUID NOT NULL
```

---

### ai_logs

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
project_id  UUID REFERENCES projects(id)
type        VARCHAR(50) NOT NULL  -- generate_tasks / split_requirement / daily_summary
input_text  TEXT
output_text TEXT
status      VARCHAR(20) DEFAULT 'pending'  -- pending/processing/done/failed
extra       JSONB
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## 八、关键设计决策

| 决策               | 方案                          | 理由                              |
|------------------|------------------------------|----------------------------------|
| ID 方案           | UUID                         | 分布式友好，无序列依赖               |
| 软删除            | `deleted_at TIMESTAMPTZ`     | 所有核心表（task/project/comment） |
| 扩展字段          | `extra JSONB`                | 避免频繁加列，AI数据/自定义配置      |
| 状态字段          | VARCHAR 字符串枚举             | 简单直接，不做复杂状态机             |
| 异步操作          | NSQ 队列                     | 通知、AI、日志三类场景解耦           |
| 时间字段          | TIMESTAMPTZ（带时区）          | 所有表统一，避免时区问题             |

---

## 九、开发优先级

### 第一阶段 — 可用

- [ ] 用户注册/登录（JWT）
- [ ] 工作区管理
- [ ] 项目 CRUD
- [ ] 任务基础 CRUD（含子任务）

### 第二阶段 — 好用

- [ ] 评论 + @提及
- [ ] 标签系统
- [ ] NSQ 接入（通知异步化 + 活动日志）
- [ ] WebSocket 实时推送

### 第三阶段 — 差异化

- [ ] AI 任务生成（走 NSQ 异步）
- [ ] AI 需求拆分
- [ ] AI 日报总结

---

## 十、后续设计文档

| 文档                        | 内容                              |
|---------------------------|----------------------------------|
| `02-database.md`          | 完整 ER 图 + 索引设计 + 迁移策略   |
| `03-api.md`               | REST API 路由、请求/响应格式规范    |
| `04-nsq-design.md`        | NSQ topic 详细设计、消息格式、重试策略 |
| `05-ai-module.md`         | AI 功能流程、prompt 模板、结果回写  |
