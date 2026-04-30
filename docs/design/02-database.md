# SmartPM 数据库设计

> 版本：v1.0 | 日期：2026-04-30 | 依赖：01-architecture.md

---

## 一、设计原则

| 原则         | 方案                                      |
|------------|------------------------------------------|
| 主键         | UUID（`gen_random_uuid()`）               |
| 时间字段     | `TIMESTAMPTZ`，统一带时区                  |
| 软删除       | `deleted_at TIMESTAMPTZ`，核心业务表必须有  |
| 扩展字段     | `extra JSONB`，避免频繁 ALTER TABLE        |
| 外键         | 显式声明，ON DELETE 策略见各表说明          |
| 枚举值       | VARCHAR 字符串，不用 PG ENUM（迁移成本低）  |

---

## 二、ER 关系图

```
users
 ├── workspaces (owner_id)
 ├── workspace_members (user_id)
 ├── project_members (user_id)
 ├── tasks (assignee_id, creator_id)
 ├── comments (user_id)
 ├── files (uploaded_by)
 ├── notifications (user_id)
 └── ai_logs (user_id)

workspaces
 ├── workspace_members (workspace_id)
 ├── projects (workspace_id)
 └── activity_logs (workspace_id)

projects
 ├── project_members (project_id)
 ├── tasks (project_id)
 ├── task_tags (project_id)
 ├── activity_logs (project_id)
 └── ai_logs (project_id)

tasks
 ├── tasks (parent_id) ← 自引用，子任务
 ├── task_tag_rel (task_id)
 ├── comments (task_id)
 └── file_relations (entity_id WHERE entity_type='task')

comments
 └── file_relations (entity_id WHERE entity_type='comment')

files
 └── file_relations (file_id)

task_tags
 └── task_tag_rel (tag_id)
```

---

## 三、完整表结构

### 3.1 users

```sql
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar_url    VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.2 workspaces

```sql
CREATE TABLE workspaces (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.3 workspace_members

```sql
CREATE TABLE workspace_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) NOT NULL,  -- owner / admin / member
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);
```

---

### 3.4 projects

```sql
CREATE TABLE projects (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  created_by   UUID         NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
```

---

### 3.5 project_members

```sql
CREATE TABLE project_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL,  -- admin / member
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);
```

---

### 3.6 tasks

```sql
CREATE TABLE tasks (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   UUID         REFERENCES tasks(id) ON DELETE CASCADE,  -- NULL = 顶级任务
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'todo',     -- todo / in_progress / done
  priority    VARCHAR(20)  NOT NULL DEFAULT 'normal',   -- low / normal / high / urgent
  assignee_id UUID         REFERENCES users(id) ON DELETE SET NULL,
  creator_id  UUID         NOT NULL REFERENCES users(id),
  due_date    DATE,
  extra       JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
```

> `parent_id ON DELETE CASCADE`：父任务删除时子任务一并删除（软删除场景下 deleted_at 传播由应用层处理）

---

### 3.7 task_tags

```sql
CREATE TABLE task_tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  color      VARCHAR(20),
  UNIQUE (project_id, name)
);
```

---

### 3.8 task_tag_rel

```sql
CREATE TABLE task_tag_rel (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

---

### 3.9 comments

```sql
CREATE TABLE comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id),
  content    TEXT        NOT NULL,
  extra      JSONB,       -- { "mentions": ["user_id1", "user_id2"] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

---

### 3.10 files

```sql
CREATE TABLE files (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  url         VARCHAR(1000) NOT NULL,
  filename    VARCHAR(500)  NOT NULL,
  size        BIGINT,
  mime_type   VARCHAR(100),
  uploaded_by UUID         NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

### 3.11 file_relations

```sql
CREATE TABLE file_relations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID        NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,  -- task / comment
  entity_id   UUID        NOT NULL
);
```

> `entity_id` 不设外键约束（多态关联），由应用层保证一致性。

---

### 3.12 activity_logs

```sql
CREATE TABLE activity_logs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   UUID         REFERENCES projects(id) ON DELETE SET NULL,
  user_id      UUID         NOT NULL REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,  -- task.created / task.updated / comment.added / ...
  entity_type  VARCHAR(50)  NOT NULL,  -- task / comment / project / file
  entity_id    UUID         NOT NULL,
  extra        JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

> 只追加，不更新，不软删除。由 NSQ `activity.log` Consumer 异步写入。

---

### 3.13 notifications

```sql
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,   -- task.assigned / comment.mentioned / ai.done / ...
  content    TEXT,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  extra      JSONB,                  -- { "entity_type": "task", "entity_id": "..." }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.14 ai_logs

```sql
CREATE TABLE ai_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
  type        VARCHAR(50) NOT NULL,   -- generate_tasks / split_requirement / daily_summary
  input_text  TEXT,
  output_text TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / processing / done / failed
  extra       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 四、索引设计

### 高频查询索引

```sql
-- 用户登录
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 工作区成员查询
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- 项目列表（过滤软删除）
CREATE INDEX idx_projects_workspace ON projects(workspace_id) WHERE deleted_at IS NULL;

-- 项目成员查询
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- 任务列表（最高频查询）
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;

-- 评论列表
CREATE INDEX idx_comments_task ON comments(task_id) WHERE deleted_at IS NULL;

-- 活动日志（按项目/实体查询）
CREATE INDEX idx_activity_logs_project ON activity_logs(project_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- 通知（未读查询）
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;

-- AI 日志（按状态轮询）
CREATE INDEX idx_ai_logs_status ON ai_logs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_ai_logs_user ON ai_logs(user_id, created_at DESC);

-- 文件关联
CREATE INDEX idx_file_relations_entity ON file_relations(entity_type, entity_id);

-- 标签关联
CREATE INDEX idx_task_tag_rel_tag ON task_tag_rel(tag_id);
```

---

## 五、枚举值定义

### task.status

| 值           | 含义   |
|-------------|------|
| `todo`       | 待处理 |
| `in_progress`| 进行中 |
| `done`       | 已完成 |

### task.priority

| 值       | 含义 |
|---------|-----|
| `low`    | 低  |
| `normal` | 普通 |
| `high`   | 高  |
| `urgent` | 紧急 |

### workspace_members.role / project_members.role

| 值       | 含义   |
|---------|------|
| `owner`  | 所有者 |
| `admin`  | 管理员 |
| `member` | 成员  |

### notification.type

| 值                   | 触发场景         |
|--------------------|----------------|
| `task.assigned`     | 任务被分配给我   |
| `task.due_soon`     | 任务即将到期     |
| `comment.mentioned` | 评论中被@提及    |
| `ai.done`           | AI 任务处理完成  |

### ai_logs.type

| 值                    | 含义       |
|---------------------|----------|
| `generate_tasks`     | AI 生成任务 |
| `split_requirement`  | AI 拆分需求 |
| `daily_summary`      | AI 日报总结 |

### ai_logs.status

| 值           | 含义     |
|-------------|--------|
| `pending`    | 等待处理 |
| `processing` | 处理中   |
| `done`       | 已完成   |
| `failed`     | 失败     |

### activity_logs.action

| 值                    | 含义         |
|---------------------|------------|
| `task.created`       | 创建任务     |
| `task.updated`       | 更新任务     |
| `task.deleted`       | 删除任务     |
| `task.assigned`      | 分配任务     |
| `task.status_changed`| 任务状态变更 |
| `comment.added`      | 添加评论     |
| `comment.deleted`    | 删除评论     |
| `project.created`    | 创建项目     |
| `member.added`       | 添加成员     |
| `member.removed`     | 移除成员     |

---

## 六、迁移策略

### 工具选型

使用 **TypeORM Migrations**（NestJS 默认集成），不用 ORM 自动同步（`synchronize: false`）。

```
src/
  migrations/
    001_create_users.ts
    002_create_workspaces.ts
    003_create_projects.ts
    ...
```

### 命名规范

```
{序号}_{动作}_{表名}.ts
例：001_create_users.ts
    010_add_deleted_at_to_tasks.ts
```

### 软删除查询约定

所有查询默认过滤软删除记录，在 TypeORM Repository 层统一处理：

```typescript
// 正确：默认过滤
repo.find({ where: { deletedAt: IsNull() } })

// 需要查已删除时显式传入
repo.find({ withDeleted: true })
```

---

## 七、JSONB 字段使用规范

| 表           | 字段    | 用途示例                                              |
|-------------|-------|-----------------------------------------------------|
| `tasks`      | extra | `{ "checklist": [...], "custom_fields": {...} }`    |
| `comments`   | extra | `{ "mentions": ["uuid1", "uuid2"] }`                |
| `notifications` | extra | `{ "entity_type": "task", "entity_id": "uuid" }` |
| `ai_logs`    | extra | `{ "model": "gpt-4o", "tokens": 1200, "raw": {} }` |
| `activity_logs` | extra | `{ "before": {...}, "after": {...} }`            |

> JSONB 字段不做强 schema 约束，但每个字段的用途在此文档中登记，避免随意写入。
