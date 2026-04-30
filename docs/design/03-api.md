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
