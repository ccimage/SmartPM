# SmartPM REST API 设计

> 版本：v1.0 | 日期：2026-04-30 | 依赖：01-architecture.md、02-database.md

---

## 一、全局约定

### Base URL

```
/api/v1
```

### 认证

所有接口（除 Auth 模块）需携带 JWT Token：

```
Authorization: Bearer <token>
```

### 请求格式

```
Content-Type: application/json
```

### 统一响应结构

**成功**

```json
{
  "data": { ... },
  "meta": { ... }   // 分页时携带
}
```

**失败**

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "任务不存在"
  }
}
```

### 分页参数（列表接口统一）

| 参数       | 类型   | 默认值 | 说明         |
|-----------|------|------|------------|
| `page`    | int  | 1    | 页码，从 1 开始 |
| `limit`   | int  | 20   | 每页条数，最大 100 |

分页响应 meta：

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### HTTP 状态码

| 状态码 | 含义                   |
|------|----------------------|
| 200  | 成功                   |
| 201  | 创建成功                 |
| 204  | 成功，无响应体（DELETE）      |
| 400  | 请求参数错误               |
| 401  | 未认证                  |
| 403  | 无权限                  |
| 404  | 资源不存在                |
| 409  | 冲突（如邮箱已注册）           |
| 422  | 业务逻辑错误               |
| 500  | 服务器内部错误              |

---

## 二、Auth 模块

### Admin 初始化（启动时自动执行）

系统启动时检查 `users` 表是否为空。若为空，自动创建超级管理员账号：

- **邮箱**：`admin@smartpm.com`
- **密码**：随机生成 12 位（含大小写字母+数字），在控制台/日志输出一次
- **姓名**：`Admin`
- 实现位置：`UserModule` 的 `OnModuleInit` 钩子

---

### 注册

```
POST /api/v1/auth/register
```

**Request**

```json
{
  "email": "user@example.com",
  "password": "Abc123456",
  "name": "张三"
}
```

**Response 201**

```json
{
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三",
      "avatarUrl": null,
      "createdAt": "2026-04-30T10:00:00Z"
    }
  }
}
```

---

### 登录

```
POST /api/v1/auth/login
```

**Request**

```json
{
  "email": "user@example.com",
  "password": "Abc123456"
}
```

**Response 200**

```json
{
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三",
      "avatarUrl": null
    }
  }
}
```

---

### 获取当前用户

```
GET /api/v1/auth/me
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "avatarUrl": "https://..."
  }
}
```

---

## 三、User 模块

### 更新当前用户信息

```
PATCH /api/v1/users/me
```

**Request**

```json
{
  "name": "李四",
  "avatarUrl": "https://..."
}
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "name": "李四",
    "avatarUrl": "https://...",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 修改密码

```
POST /api/v1/users/me/password
```

**Request**

```json
{
  "oldPassword": "Abc123456",
  "newPassword": "Xyz789012"
}
```

**Response 204**

---

## 四、Workspace 模块

### 创建工作区

```
POST /api/v1/workspaces
```

**Request**

```json
{
  "name": "我的团队"
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "name": "我的团队",
    "ownerId": "uuid",
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 获取我的工作区列表

```
GET /api/v1/workspaces
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "我的团队",
      "role": "owner",
      "memberCount": 5
    }
  ]
}
```

---

### 获取工作区详情

```
GET /api/v1/workspaces/:workspaceId
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "name": "我的团队",
    "ownerId": "uuid",
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 更新工作区

```
PATCH /api/v1/workspaces/:workspaceId
```

权限：`owner / admin`

**Request**

```json
{
  "name": "新团队名"
}
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "name": "新团队名",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 获取工作区成员列表

```
GET /api/v1/workspaces/:workspaceId/members
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "张三",
      "email": "user@example.com",
      "avatarUrl": null,
      "role": "admin",
      "joinedAt": "2026-04-30T10:00:00Z"
    }
  ]
}
```

---

### 邀请成员加入工作区

```
POST /api/v1/workspaces/:workspaceId/members
```

权限：`owner / admin`

**Request**

```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "role": "member"
  }
}
```

---

### 更新成员角色

```
PATCH /api/v1/workspaces/:workspaceId/members/:memberId
```

权限：`owner`

**Request**

```json
{
  "role": "admin"
}
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "role": "admin"
  }
}
```

---

### 移除成员

```
DELETE /api/v1/workspaces/:workspaceId/members/:memberId
```

权限：`owner / admin`（不能移除 owner）

**Response 204**

---

## 五、Project 模块

### 创建项目

```
POST /api/v1/workspaces/:workspaceId/projects
```

**Request**

```json
{
  "name": "SmartPM 开发",
  "description": "项目管理工具开发"
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "name": "SmartPM 开发",
    "description": "项目管理工具开发",
    "createdBy": "uuid",
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 获取工作区项目列表

```
GET /api/v1/workspaces/:workspaceId/projects
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "SmartPM 开发",
      "description": "...",
      "taskCount": 42,
      "memberCount": 5,
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ]
}
```

---

### 获取项目详情

```
GET /api/v1/projects/:projectId
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "name": "SmartPM 开发",
    "description": "...",
    "createdBy": "uuid",
    "createdAt": "2026-04-30T10:00:00Z",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 更新项目

```
PATCH /api/v1/projects/:projectId
```

**Request**

```json
{
  "name": "新项目名",
  "description": "新描述"
}
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "name": "新项目名",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 删除项目（软删除）

```
DELETE /api/v1/projects/:projectId
```

权限：项目 `admin` 或工作区 `owner`

**Response 204**

---

### 获取项目成员

```
GET /api/v1/projects/:projectId/members
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "张三",
      "avatarUrl": null,
      "role": "member"
    }
  ]
}
```

---

### 添加项目成员

```
POST /api/v1/projects/:projectId/members
```

**Request**

```json
{
  "userId": "uuid",
  "role": "member"
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "role": "member"
  }
}
```

---

### 移除项目成员

```
DELETE /api/v1/projects/:projectId/members/:memberId
```

**Response 204**

---

## 六、Task 模块

### 创建任务

```
POST /api/v1/projects/:projectId/tasks
```

**Request**

```json
{
  "title": "设计登录页面",
  "description": "包含邮箱输入、密码框、OAuth 入口",
  "status": "todo",
  "priority": "high",
  "assigneeId": "uuid",
  "dueDate": "2026-05-10",
  "parentId": null
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "parentId": null,
    "title": "设计登录页面",
    "description": "...",
    "status": "todo",
    "priority": "high",
    "assigneeId": "uuid",
    "creatorId": "uuid",
    "dueDate": "2026-05-10",
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 获取项目任务列表

```
GET /api/v1/projects/:projectId/tasks
```

**Query 参数**

| 参数          | 类型     | 说明                              |
|-------------|--------|----------------------------------|
| `status`    | string | 过滤状态：todo / in_progress / done  |
| `priority`  | string | 过滤优先级：low / normal / high / urgent |
| `assigneeId`| uuid   | 过滤负责人                         |
| `parentId`  | uuid   | 获取子任务（传 `null` 只取顶级任务）  |
| `page`      | int    | 默认 1                            |
| `limit`     | int    | 默认 20                           |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "设计登录页面",
      "status": "todo",
      "priority": "high",
      "assignee": {
        "id": "uuid",
        "name": "张三",
        "avatarUrl": null
      },
      "dueDate": "2026-05-10",
      "subTaskCount": 3,
      "commentCount": 2,
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15 }
}
```

---

### 获取任务详情

```
GET /api/v1/tasks/:taskId
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "parentId": null,
    "title": "设计登录页面",
    "description": "...",
    "status": "todo",
    "priority": "high",
    "assignee": { "id": "uuid", "name": "张三", "avatarUrl": null },
    "creator": { "id": "uuid", "name": "李四", "avatarUrl": null },
    "dueDate": "2026-05-10",
    "tags": [{ "id": "uuid", "name": "前端", "color": "#3B82F6" }],
    "subTaskCount": 3,
    "commentCount": 2,
    "createdAt": "2026-04-30T10:00:00Z",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 更新任务

```
PATCH /api/v1/tasks/:taskId
```

所有字段均为可选，只传需要修改的字段。

**Request**

```json
{
  "title": "新标题",
  "status": "in_progress",
  "priority": "urgent",
  "assigneeId": "uuid",
  "dueDate": "2026-05-15",
  "description": "新描述"
}
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "title": "新标题",
    "status": "in_progress",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 删除任务（软删除）

```
DELETE /api/v1/tasks/:taskId
```

> 子任务随父任务一并软删除，由应用层处理。

**Response 204**

---

### 获取子任务列表

```
GET /api/v1/tasks/:taskId/subtasks
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "实现邮箱登录",
      "status": "done",
      "priority": "normal",
      "assignee": { "id": "uuid", "name": "张三", "avatarUrl": null },
      "dueDate": null
    }
  ]
}
```

---

### 获取项目标签列表

```
GET /api/v1/projects/:projectId/tags
```

**Response 200**

```json
{
  "data": [
    { "id": "uuid", "name": "前端", "color": "#3B82F6" },
    { "id": "uuid", "name": "Bug", "color": "#EF4444" }
  ]
}
```

---

### 创建标签

```
POST /api/v1/projects/:projectId/tags
```

**Request**

```json
{
  "name": "前端",
  "color": "#3B82F6"
}
```

**Response 201**

```json
{
  "data": { "id": "uuid", "name": "前端", "color": "#3B82F6" }
}
```

---

### 设置任务标签

```
PUT /api/v1/tasks/:taskId/tags
```

全量替换，传空数组即清空所有标签。

**Request**

```json
{
  "tagIds": ["uuid1", "uuid2"]
}
```

**Response 200**

```json
{
  "data": {
    "tags": [
      { "id": "uuid1", "name": "前端", "color": "#3B82F6" },
      { "id": "uuid2", "name": "Bug", "color": "#EF4444" }
    ]
  }
}
```

---

## 七、Comment 模块

### 获取任务评论列表

```
GET /api/v1/tasks/:taskId/comments
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "content": "这个功能需要和后端确认接口格式 @李四",
      "author": { "id": "uuid", "name": "张三", "avatarUrl": null },
      "mentions": [{ "id": "uuid", "name": "李四" }],
      "createdAt": "2026-04-30T10:00:00Z",
      "updatedAt": "2026-04-30T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### 创建评论

```
POST /api/v1/tasks/:taskId/comments
```

**Request**

```json
{
  "content": "这个功能需要和后端确认接口格式 @李四",
  "mentionUserIds": ["uuid"]
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "content": "这个功能需要和后端确认接口格式 @李四",
    "author": { "id": "uuid", "name": "张三", "avatarUrl": null },
    "mentions": [{ "id": "uuid", "name": "李四" }],
    "createdAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 更新评论

```
PATCH /api/v1/comments/:commentId
```

权限：评论作者本人。

**Request**

```json
{
  "content": "修改后的内容",
  "mentionUserIds": ["uuid"]
}
```

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "content": "修改后的内容",
    "updatedAt": "2026-04-30T10:00:00Z"
  }
}
```

---

### 删除评论（软删除）

```
DELETE /api/v1/comments/:commentId
```

权限：评论作者或项目 admin。

**Response 204**

---

## 八、File 模块

### 上传文件

```
POST /api/v1/files/upload
Content-Type: multipart/form-data
```

**Request**

```
file: <binary>
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "url": "https://rustfs.example.com/files/xxx.png",
    "filename": "screenshot.png",
    "size": 204800,
    "mimeType": "image/png"
  }
}
```

---

### 关联文件到任务或评论

```
POST /api/v1/files/:fileId/attach
```

**Request**

```json
{
  "entityType": "task",
  "entityId": "uuid"
}
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "fileId": "uuid",
    "entityType": "task",
    "entityId": "uuid"
  }
}
```

---

### 获取任务附件列表

```
GET /api/v1/tasks/:taskId/files
```

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "url": "https://rustfs.example.com/files/xxx.png",
      "filename": "screenshot.png",
      "size": 204800,
      "mimeType": "image/png",
      "uploadedBy": { "id": "uuid", "name": "张三" },
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ]
}
```

---

### 删除文件关联

```
DELETE /api/v1/files/:fileId/attach
```

**Request**

```json
{
  "entityType": "task",
  "entityId": "uuid"
}
```

**Response 204**

---

## 九、Notification 模块

### 获取通知列表

```
GET /api/v1/notifications
```

**Query 参数**

| 参数       | 类型    | 说明                  |
|----------|-------|---------------------|
| `isRead` | bool  | true=已读，false=未读，不传=全部 |
| `page`   | int   | 默认 1                |
| `limit`  | int   | 默认 20               |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "task.assigned",
      "content": "张三 将任务「设计登录页面」分配给你",
      "isRead": false,
      "extra": { "entityType": "task", "entityId": "uuid" },
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8, "unreadCount": 3 }
}
```

---

### 标记通知为已读

```
PATCH /api/v1/notifications/:notificationId/read
```

**Response 200**

```json
{
  "data": { "id": "uuid", "isRead": true }
}
```

---

### 全部标记为已读

```
POST /api/v1/notifications/read-all
```

**Response 200**

```json
{
  "data": { "updated": 8 }
}
```

---

### 获取未读数量

```
GET /api/v1/notifications/unread-count
```

**Response 200**

```json
{
  "data": { "count": 3 }
}
```

---

## 十、Activity Log 模块

### 获取项目活动日志

```
GET /api/v1/projects/:projectId/activities
```

**Query 参数**

| 参数          | 类型   | 说明                    |
|-------------|------|------------------------|
| `entityType`| string | 过滤类型：task / comment / project |
| `entityId`  | uuid | 过滤特定实体              |
| `page`      | int  | 默认 1                  |
| `limit`     | int  | 默认 20                 |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "action": "task.status_changed",
      "entityType": "task",
      "entityId": "uuid",
      "user": { "id": "uuid", "name": "张三", "avatarUrl": null },
      "extra": {
        "before": { "status": "todo" },
        "after": { "status": "in_progress" }
      },
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50 }
}
```

---

### 获取任务活动日志

```
GET /api/v1/tasks/:taskId/activities
```

**Response 200**（结构同上，只返回该任务相关记录）

---

## 十一、AI 模块

> 详细设计见 `05-ai-module.md`，此处为接口速查。

### 触发 AI 任务生成

```
POST /api/v1/ai/generate-tasks
```

**Request**

```json
{
  "projectId": "uuid",
  "input": "开发用户登录功能，支持邮箱密码和 OAuth"
}
```

**Response 202**

```json
{
  "data": { "aiLogId": "uuid", "status": "pending" }
}
```

---

### 触发 AI 需求拆分

```
POST /api/v1/ai/split-requirement
```

**Request**

```json
{
  "projectId": "uuid",
  "input": "## 用户管理模块\n需要支持注册、登录..."
}
```

**Response 202**

```json
{
  "data": { "aiLogId": "uuid", "status": "pending" }
}
```

---

### 触发 AI 日报总结

```
POST /api/v1/ai/daily-summary
```

**Request**

```json
{
  "projectId": "uuid",
  "date": "2026-04-30"
}
```

**Response 202**

```json
{
  "data": { "aiLogId": "uuid", "status": "pending" }
}
```

---

### 查询 AI 任务结果

```
GET /api/v1/ai/logs/:aiLogId
```

**Response 200（done）**

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
          "description": "...",
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

---

### 确认导入 AI 生成的任务

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

**Response 201**

```json
{
  "data": { "imported": 3, "taskIds": ["uuid1", "uuid2", "uuid3"] }
}
```

---

### 重试失败的 AI 任务

```
POST /api/v1/ai/logs/:aiLogId/retry
```

**Response 202**

```json
{
  "data": { "aiLogId": "uuid", "status": "pending" }
}
```

---

### 获取 AI 日志列表

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
      "inputPreview": "开发用户登录功能...",
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

## 十二、WebSocket 事件

WebSocket 连接地址：`ws://<host>/ws?token=<jwt>`

### 服务端推送事件

| 事件名                    | 触发时机               | Payload                                      |
|-------------------------|----------------------|----------------------------------------------|
| `notification.new`       | 有新通知               | `{ id, type, content, extra, createdAt }`    |
| `task.updated`           | 任务被更新（同项目成员） | `{ taskId, changes: { field, before, after } }` |
| `comment.added`          | 任务有新评论            | `{ taskId, commentId, authorName }`          |
| `ai.done`                | AI 任务处理完成         | `{ aiLogId, type }`                          |
| `ai.failed`              | AI 任务处理失败         | `{ aiLogId, type, error }`                   |

### 客户端订阅事件

| 事件名              | 说明                    | Payload                  |
|-------------------|------------------------|--------------------------|
| `join.project`    | 订阅项目实时更新          | `{ projectId }`          |
| `leave.project`   | 取消订阅                 | `{ projectId }`          |
