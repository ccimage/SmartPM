# SmartPM 任务看板与项目协作增强设计文档

> 版本：v1.0 | 日期：2026-05-15 | 依赖：01-architecture.md、02-database.md、03-api.md、docs/requirements/task-board-collaboration-prd.md

---

## 一、目标

在现有 SmartPM 任务系统基础上，完成以下设计域：

1. 固定三列任务看板升级为可配置“看板列表 / 任务清单”
2. 支持看板列表排序、任务排序、任务过滤
3. 支持看板列表和任务删除后进入项目回收站
4. 支持项目成员角色分层与基于邮件的一次性邀请
5. 支持任务多负责人
6. 支持父任务内的子任务列表、内嵌编辑与详情跳转
7. 支持“快速新增任务 + 完整编辑框”双模式创建

---

## 二、现状基线

| 模块 | 现状 |
|------|------|
| 任务看板 | 前端固定三列：`todo / in_progress / done` |
| 任务排序 | 仅支持跨列状态变更，无显式同列排序 |
| 任务过滤 | 无完整过滤栏，接口过滤能力有限 |
| 项目成员 | 已有 `project_members` 表和基础成员接口 |
| 任务负责人 | 单人负责人：`assigneeId / assignee` |
| 子任务 | 后端支持 `parentId` 与子任务列表接口，前端未形成完整交互 |
| 删除语义 | 任务已有软删除；看板列表、项目回收站尚不存在 |
| 邀请成员 | 无项目级邮件邀请与一次性注册链接 |

---

## 三、总体方案

本次方案采取“在现有任务模型上增量演进”的方式，而不是完全推翻重建。

核心思路：

- 将原先固定 `status` 驱动的看板列，替换为 `board_lists` 驱动的动态列。
- 为任务和看板列表引入显式排序字段，实现可持久化拖动排序。
- 将“删除”语义统一收敛为“进入项目回收站”，由恢复/彻底删除二次分流。
- 将单人负责人升级为多人负责人关联表，不再依赖 `tasks.assignee_id` 作为主模型。
- 邮件邀请采用一次性 token 链接，落到单独邀请表，由注册链接完成入项闭环。
- 新建任务拆成两条入口：
  - 快速新增：轻量、低阻力
  - 完整编辑框：结构化、信息完整

---

## 四、数据模型设计

### 4.1 新增 `board_lists`

新增项目级任务清单表：

```sql
CREATE TABLE board_lists (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  order_index NUMERIC(20,6) NOT NULL,
  created_by  UUID         NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_board_lists_project_order
ON board_lists(project_id, order_index)
WHERE deleted_at IS NULL;
```

说明：
- `name` 允许重名，不做唯一约束。
- `order_index` 使用稀疏排序值，降低频繁重排时全量更新的成本。
- `deleted_at` 支持进入回收站。

### 4.2 扩展 `tasks`

现有 `tasks` 表扩展如下：

```sql
ALTER TABLE tasks
  ADD COLUMN board_list_id UUID REFERENCES board_lists(id) ON DELETE SET NULL,
  ADD COLUMN order_index NUMERIC(20,6),
  ADD COLUMN deleted_by UUID REFERENCES users(id),
  ADD COLUMN deleted_from_board_list_id UUID,
  ADD COLUMN deleted_snapshot JSONB;
```

说明：
- `board_list_id` 成为任务当前所属看板列表的主归属字段。
- `order_index` 控制同一看板列表内任务顺序。
- `deleted_snapshot` 用于记录删除时必要上下文，便于回收站恢复。
- 原 `status` 字段保留一段时间用于兼容旧逻辑、活动日志、统计或迁移过渡，但不再驱动主看板。

### 4.3 新增 `task_assignees`

将任务负责人改为多对多关系：

```sql
CREATE TABLE task_assignees (
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX idx_task_assignees_user
ON task_assignees(user_id);
```

说明：
- 一个任务可有多个负责人。
- 项目成员之外的用户不得被写入此表。

### 4.4 扩展 `project_members`

现有 `project_members.role` 明确限定为：

```text
admin / member
```

规则：
- 至少保留一个 `admin`
- 只有 `admin` 可修改角色、移除成员
- `admin` 和 `member` 都可邀请成员、创建任务、编辑任务

### 4.5 新增 `project_invites`

邮件邀请模型：

```sql
CREATE TABLE project_invites (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email         VARCHAR(320) NOT NULL,
  token_hash    VARCHAR(128) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'member',
  invited_by    UUID         NOT NULL REFERENCES users(id),
  expires_at    TIMESTAMPTZ  NOT NULL,
  used_at       TIMESTAMPTZ,
  accepted_by   UUID         REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_project_invites_token_hash
ON project_invites(token_hash);
```

说明：
- 邮件中不直接发裸 token 的 hash，邮件链接携带原始 token，数据库存 hash。
- `used_at IS NULL` 且 `expires_at > NOW()` 才视为有效。
- 一次性使用，注册成功后写入 `used_at` 和 `accepted_by`。

### 4.6 回收站建模策略

本期不单独建 `recycle_bin_items` 总表，而采用“原表软删除 + 恢复上下文”策略：

- `board_lists.deleted_at IS NOT NULL` 表示看板列表在回收站
- `tasks.deleted_at IS NOT NULL` 表示任务在回收站
- 删除看板列表时：
  - 看板列表自身软删除
  - 其下任务一并软删除
  - 相关任务记录其删除来源看板列表

优点：
- 复用现有 soft-delete 模型
- 恢复时不需要额外跨表映射

风险：
- 回收站查询需聚合多个实体类型
- 恢复逻辑要处理父子任务、负责人、标签关联的一致性

---

## 五、迁移策略

### 5.1 项目默认看板列表

迁移后为每个现有项目自动创建 3 个默认看板列表：

1. Todo
2. In Progress
3. Done

### 5.2 旧任务归属迁移

根据旧 `status` 字段将任务映射到默认看板列表：

| 旧 status | 新 board list |
|-----------|---------------|
| `todo` | Todo |
| `in_progress` | In Progress |
| `done` | Done |

同时为每列内任务写入初始 `order_index`，可按 `created_at ASC` 或旧查询顺序生成。

### 5.3 单负责人迁移

若 `tasks.assignee_id` 有值，则写入 `task_assignees(task_id, user_id)`。

迁移完成后：
- `assignee_id` 可先保留为兼容字段
- 新代码只读写 `task_assignees`

---

## 六、后端接口设计

### 6.1 看板列表接口

#### 获取项目看板列表

```http
GET /api/v1/projects/:projectId/board-lists
```

响应：

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "开发中",
      "orderIndex": 2000,
      "taskCount": 12
    }
  ]
}
```

#### 创建看板列表

```http
POST /api/v1/projects/:projectId/board-lists
```

请求：

```json
{
  "name": "联调中"
}
```

#### 更新看板列表

```http
PATCH /api/v1/board-lists/:boardListId
```

支持字段：
- `name`

#### 看板列表排序

```http
PUT /api/v1/projects/:projectId/board-lists/reorder
```

请求：

```json
{
  "items": [
    { "id": "list-a", "orderIndex": 1000 },
    { "id": "list-b", "orderIndex": 2000 }
  ]
}
```

#### 删除看板列表

```http
DELETE /api/v1/board-lists/:boardListId
```

行为：
- 服务端执行软删除
- 看板列表下任务一并软删除
- 由前端负责二次确认弹窗

### 6.2 回收站接口

#### 获取项目回收站

```http
GET /api/v1/projects/:projectId/recycle-bin
```

响应：

```json
{
  "data": {
    "boardLists": [],
    "tasks": []
  }
}
```

#### 恢复看板列表

```http
POST /api/v1/recycle-bin/board-lists/:boardListId/restore
```

恢复规则：
- 恢复看板列表本身
- 同时恢复其因本次删除进入回收站的任务
- 恢复后的 `orderIndex` 追加到末尾

#### 恢复任务

```http
POST /api/v1/recycle-bin/tasks/:taskId/restore
```

恢复规则：
- 若原看板列表仍存在且未删除，则恢复到原看板列表
- 若原看板列表已不存在，则恢复到项目默认 Todo 看板列表

#### 彻底删除

```http
DELETE /api/v1/recycle-bin/board-lists/:boardListId
DELETE /api/v1/recycle-bin/tasks/:taskId
```

### 6.3 任务接口扩展

#### 创建任务

```http
POST /api/v1/projects/:projectId/tasks
```

请求统一支持：

```json
{
  "title": "实现邀请注册页",
  "boardListId": "uuid",
  "priority": "normal",
  "assigneeIds": ["u1", "u2"],
  "dueDate": "2026-05-20",
  "tagIds": ["t1", "t2"],
  "description": "<p>...</p>",
  "parentId": null
}
```

快速新增场景允许只传：

```json
{
  "title": "补登录错误提示",
  "boardListId": "uuid",
  "assigneeIds": ["u1"],
  "dueDate": "2026-05-20",
  "description": "<p>说明</p>"
}
```

#### 获取任务列表

```http
GET /api/v1/projects/:projectId/tasks
```

新增 query 参数：

| 参数 | 说明 |
|------|------|
| `title` | 标题模糊查询 |
| `boardListIds` | 看板列表多选 |
| `assigneeIds` | 多负责人过滤 |
| `priority` | 优先级 |
| `tagIds` | 标签多选 |
| `dueDateFrom` / `dueDateTo` | 截止日期区间 |
| `isSubtask` | 是否子任务 |
| `includeDeleted` | 是否查询回收站内容，默认 false |

列表返回结构调整为：

```json
{
  "data": [
    {
      "id": "uuid",
      "boardListId": "uuid",
      "title": "设计邀请页",
      "priority": "high",
      "assignees": [
        { "id": "u1", "name": "张三", "avatarUrl": null }
      ],
      "dueDate": "2026-05-20",
      "tags": [],
      "subTaskCount": 2,
      "orderIndex": 3000
    }
  ]
}
```

#### 更新任务

```http
PATCH /api/v1/tasks/:taskId
```

支持字段：
- `title`
- `boardListId`
- `priority`
- `assigneeIds`
- `dueDate`
- `description`
- `tagIds`
- `orderIndex`

#### 任务排序 / 拖动更新

建议新增显式接口：

```http
PUT /api/v1/projects/:projectId/tasks/reorder
```

请求：

```json
{
  "items": [
    {
      "taskId": "task-1",
      "boardListId": "list-a",
      "orderIndex": 1200
    }
  ]
}
```

理由：
- 将“拖动结果持久化”从通用更新接口中分离
- 便于批量提交
- 更易做并发控制与失败回滚

### 6.4 子任务接口

#### 获取子任务列表

```http
GET /api/v1/tasks/:taskId/subtasks
```

返回字段至少包括：
- `id`
- `title`
- `assignees`
- `dueDate`

#### 子任务内嵌快速编辑

不新增专门接口，复用：

```http
PATCH /api/v1/tasks/:taskId
```

用于更新：
- `title`
- `assigneeIds`
- `dueDate`

### 6.5 项目成员与邀请接口

#### 获取成员列表

```http
GET /api/v1/projects/:projectId/members
```

#### 修改成员角色

```http
PATCH /api/v1/projects/:projectId/members/:memberId
```

请求：

```json
{
  "role": "admin"
}
```

权限：
- 仅项目管理员可调用

#### 发起邮件邀请

```http
POST /api/v1/projects/:projectId/invites
```

请求：

```json
{
  "email": "new.user@example.com",
  "role": "member"
}
```

行为：
- 生成一次性 token
- 保存 `token_hash`
- 发送邮件：`https://app.example.com/invites/:token`

#### 校验邀请链接

```http
GET /api/v1/project-invites/:token
```

用于前端打开邀请页时检查：
- 是否存在
- 是否已使用
- 是否已过期
- 对应项目信息

#### 接受邀请并注册

建议使用单独接口：

```http
POST /api/v1/project-invites/:token/accept
```

请求：

```json
{
  "name": "新用户",
  "email": "new.user@example.com",
  "password": "******"
}
```

行为：
- 校验 token
- 创建用户或绑定现有账号
- 加入项目
- 标记 invite 为 `used_at = NOW()`
- 返回登录 token 和用户信息

---

## 七、权限设计

### 7.1 项目角色矩阵

| 能力 | 项目管理员 | 项目成员 |
|------|------------|----------|
| 查看项目 | 是 | 是 |
| 查看任务 | 是 | 是 |
| 创建任务 | 是 | 是 |
| 编辑任务 | 是 | 是 |
| 邀请成员 | 是 | 是 |
| 修改成员角色 | 是 | 否 |
| 移除成员 | 是 | 否 |
| 删除看板列表 | 是 | 建议否 |
| 恢复 / 清理回收站 | 是 | 建议否 |

说明：
- 需求已明确只有项目管理员能修改角色。
- 看板列表删除、回收站恢复/彻底删除属于高风险操作，设计上建议也仅管理员可执行。

### 7.2 权限校验位置

后端统一在 service 层收敛以下能力：

- `assertProjectReadable(userId, projectId)`
- `assertProjectMember(userId, projectId)`
- `assertProjectAdmin(userId, projectId)`

避免 controller 层散落条件判断。

---

## 八、排序设计

### 8.1 `order_index` 方案

采用稀疏数值排序：
- 初始值按 `1000, 2000, 3000 ...`
- 插入两个节点之间时取平均值
- 超出精度或过密时触发局部重排

优点：
- 单次拖动通常只需更新少量记录
- 避免每次排序全量重写

### 8.2 列排序

看板列表从左到右按 `order_index ASC`。

### 8.3 任务排序

同一 `board_list_id` 下，按 `order_index ASC`。

### 8.4 过滤场景下的拖动

过滤开启时仍允许拖动，但排序基于真实完整序列而不是过滤后的局部序列。

实现建议：
- 前端拖动提交时传目标前后邻居任务 id
- 后端根据完整序列计算新 `order_index`

这样可以避免只看见局部任务时排序错乱。

---

## 九、回收站设计

### 9.1 删除语义

#### 删除任务

- 写入 `tasks.deleted_at`
- 写入 `deleted_by`
- 保留负责人、标签、父子关系

#### 删除看板列表

- 写入 `board_lists.deleted_at`
- 批量软删除该列表下全部任务
- 将任务恢复上下文写入 `deleted_snapshot`

### 9.2 恢复语义

#### 恢复任务

- 恢复任务本身
- 若父任务仍在回收站且当前任务是子任务，需提示或联动恢复策略
- 若原列表丢失，则恢复到默认 Todo 列

#### 恢复看板列表

- 恢复列表
- 恢复与该次删除关联的任务
- 恢复后放到末尾，避免与当前已有排序冲突

### 9.3 彻底删除

- 彻底删除任务：物理清理 `tasks` 记录及其关联表
- 彻底删除看板列表：物理清理列表及尚在回收站中的关联任务

为了避免误删，前端应对“彻底删除”再次确认。

---

## 十、邮件邀请设计

### 10.1 邀请生成

流程：

1. 项目成员输入邮箱并提交邀请
2. 后端校验当前用户是否属于项目
3. 后端生成原始 token，如 `base64url(randomBytes(32))`
4. 数据库存储 `sha256(token)`
5. 发送邮件，邮件中包含邀请链接

### 10.2 邀请接受

流程：

1. 用户点击邀请链接
2. 前端打开邀请接受页
3. 前端调用校验接口获取项目、邀请者、过期状态
4. 用户完成注册
5. 后端创建账号并加入项目
6. 邀请标记为已使用
7. 返回登录态

### 10.3 安全策略

- token 仅存 hash，不存明文
- token 一次性使用
- token 有过期时间，如 7 天
- 邀请邮箱与注册邮箱必须一致
- 已存在账号时，如邮箱一致，可走登录后接受邀请流程，避免重复建号

---

## 十一、前端交互设计

### 11.1 看板页结构

```text
过滤栏
看板列表区（可横向拖动排序）
  列头：名称、数量、更多操作
  任务列表：可同列/跨列拖动
  快速新增任务入口
回收站入口
```

### 11.2 过滤栏

前端状态与 URL query 双向同步：

- `q`：标题关键字
- `assignees`：负责人 id 列表
- `lists`：看板列表 id 列表
- `priority`
- `tags`
- `dueFrom` / `dueTo`
- `isSubtask`

实现建议：
- 使用 `useRoute` + `useRouter`
- 表单状态变更时 debounce 更新 URL
- 首次进入页面时由 URL 初始化过滤状态

### 11.3 快速新增任务

每列底部保留快速新增入口。

字段：
- 标题：必填
- 负责人：可选
- 描述：可选
- 截止日期：可选

特点：
- 内嵌表单
- 默认折叠
- 提交成功后直接插入当前列

### 11.4 完整编辑框

延续现有任务详情弹出框形态，新增字段：
- 看板列表
- 多负责人
- 标签
- 子任务区域

### 11.5 负责人展示规则

#### 主任务详情

- 显示“头像 + 姓名”
- 最多展示 3 个
- 超过后显示 `...`

#### 看板卡片

- 仅显示头像
- hover / tooltip 展示姓名
- 最多展示 2 个
- 超过后显示 `...`

#### 子任务列表

- 仅显示头像
- hover / tooltip 展示姓名
- 最多展示 2 个
- 超过后显示 `...`

### 11.6 子任务列表

父任务详情中子任务为列表模式，列为：
- 标题
- 负责人
- 截止日期

支持：
- 标题内嵌编辑
- 负责人内嵌编辑
- 截止日期内嵌编辑
- 点击整行或标题进入子任务完整编辑框

---

## 十二、后端实现建议

### 12.1 模块划分

建议在现有 `task`、`project` 模块基础上新增或扩展：

- `TaskModule`
  - 任务 CRUD
  - 排序
  - 子任务
  - 回收站任务恢复/清理

- `BoardListModule` 或并入 `TaskModule`
  - 看板列表 CRUD
  - 看板列表排序
  - 看板列表删除/恢复

- `ProjectInviteModule` 或并入 `ProjectModule`
  - 邀请生成
  - 邀请校验
  - 邀请接受

### 12.2 事务边界

以下操作建议走事务：

- 删除看板列表及其任务
- 恢复看板列表及其任务
- 接受邀请并创建账号 / 加入项目
- 批量排序更新

### 12.3 活动日志

建议增加以下活动日志类型：

- `board_list.created`
- `board_list.renamed`
- `board_list.deleted`
- `board_list.restored`
- `task.reordered`
- `task.assignees_changed`
- `project.invite_sent`
- `project.member_role_changed`

---

## 十三、风险与权衡

### 13.1 保留 `status` 还是彻底移除

短期建议保留：
- 有利于迁移与回归
- 可避免一次性改动过大

长期建议移除或降级为派生字段，避免双源状态。

### 13.2 回收站恢复复杂度

回收站会引入以下恢复复杂度：
- 父子任务关系
- 被删除列表的恢复位置
- 多负责人与标签关联恢复

设计上需坚持“软删除不清关系表”或“恢复时按 snapshot 重建”二选一，避免半恢复。

### 13.3 快速新增与完整编辑框并存

优点：
- 保留高频创建效率

风险：
- 表单字段、校验、状态同步容易重复

建议：
- 抽象 `TaskFormModel`
- 前端仅在展示层裁剪字段，不拆分两套提交模型

### 13.4 邮件系统依赖

邮件邀请能力依赖：
- SMTP / 邮件服务配置
- 正式域名回调地址
- 模板邮件能力

本期开发时应预留本地开发兜底方案，例如日志打印邀请链接。

---

## 十四、验收要点

- 项目看板可新增、重命名、排序、删除任务清单
- 删除的看板列表和任务进入项目回收站，并支持恢复/彻底删除
- 任务可同列排序、跨列移动并持久化
- 过滤条件可同步到 URL 并在刷新后恢复
- 项目成员角色为 `admin / member`，只有管理员可改角色
- 项目成员和管理员都可通过邮件邀请新成员
- 一个任务可设置多个负责人，并按不同场景规则展示
- 子任务列表支持标题、负责人、截止日期的内嵌编辑
- 新建任务既支持快速新增，也支持完整编辑框
