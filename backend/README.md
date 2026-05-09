# SmartPM Backend

SmartPM 后端服务，基于 NestJS + TypeScript 构建，提供项目管理核心 API 及 AI 增强能力。

## 技术栈

- **框架**: NestJS (Node.js + TypeScript)
- **数据库**: PostgreSQL + TypeORM
- **缓存**: Redis
- **消息队列**: NSQ
- **文件存储**: RustFS (S3 兼容)
- **实时通信**: Socket.io (WebSocket)

## 模块

| 模块 | 路径 | 说明 |
|------|------|------|
| Auth | `/api/v1/auth` | 注册、登录、JWT 刷新 |
| User | `/api/v1/users` | 用户信息管理 |
| Workspace | `/api/v1/workspaces` | 工作区 CRUD + 成员管理 |
| Project | `/api/v1/projects` | 项目 CRUD + 成员管理 |
| Task | `/api/v1/tasks` | 任务 CRUD + 子任务 + 标签 |
| Comment | `/api/v1/comments` | 评论 CRUD + @提及 |
| File | `/api/v1/files` | 文件上传 + 附件关联 |
| Notification | `/api/v1/notifications` | 通知列表 + 已读管理 |
| AI | `/api/v1/ai` | 任务生成 / 需求拆分 / 日报总结 |

## 快速开始

### 环境要求

- Node.js >= 20
- PostgreSQL >= 15
- Redis >= 7
- NSQ
- RustFS（或任意 S3 兼容存储）

### 安装依赖

```bash
npm install
```

### 环境变量

复制 `.env.example` 并填写配置：

```bash
cp .env.example .env
```

关键配置项：

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/smartpm

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d

# NSQ
NSQ_HOST=localhost
NSQ_PORT=4150

# 文件存储 (S3 兼容)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=smartpm

# AI
LLM_API_KEY=your-api-key
LLM_MODEL=claude-sonnet-4-6
LLM_TIMEOUT_MS=30000
```

### 启动

```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 测试

```bash
npm run test
npm run test:e2e
npm run test:cov
```

### 代码检查

```bash
npm run lint
npm run format
```

## 项目结构

```
src/
├── common/          # 全局过滤器、拦截器、装饰器、Guard
├── infra/           # 基础设施（DB、Redis、NSQ、WebSocket）
├── modules/         # 业务模块
│   ├── auth/
│   ├── user/
│   ├── workspace/
│   ├── project/
│   ├── task/
│   ├── comment/
│   ├── file/
│   ├── notification/
│   └── ai/
├── app.module.ts
└── main.ts
```

## API 文档

完整 API 设计见 `../docs/design/03-api.md`。

启动后访问 Swagger UI：`http://localhost:3000/api/docs`（如已启用）。
