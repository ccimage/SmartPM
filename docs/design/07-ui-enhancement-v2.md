# SmartPM UI 增强 v2 设计文档

> 版本：v1.0 | 日期：2026-05-12 | 依赖：01-architecture.md、02-database.md、06-frontend-experience-enhancement.md

---

## 一、目标

在 M1–M4 已完成的基础上，实现以下五个设计域：

1. 主界面布局重构（去侧边栏、面包屑、用户下拉菜单）
2. 项目图标与颜色（后端字段扩展 + 前端选择器）
3. 项目列表改版（大图/列表模式、悬浮快捷编辑）
4. 任务字段图标化与标签彩色化
5. 任务评论与操作日志（前端接入已有后端 API）

---

## 二、现状基线

| 模块 | 现状 |
|------|------|
| `AppLayout.vue` | 侧边栏 240px + 主区域，顶栏含面包屑文字和用户头像链接 |
| `project` 实体 | 无 `icon`、`color` 字段 |
| `task_tags` 实体 | 已有 `color VARCHAR(20) nullable` 字段 |
| `comment` 模块 | 完整 CRUD：`GET/POST /tasks/:taskId/comments`、`PATCH/DELETE /comments/:commentId` |
| `activity` 模块 | 只读：`GET /tasks/:taskId/activities`、`GET /projects/:projectId/activities` |
| `TaskBoardView.vue` | 任务详情抽屉，无评论/日志区域 |

---

## 三、主界面布局重构

### 3.1 布局结构

去掉 240px 侧边栏，改为全宽顶栏 + 内容区：

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] SmartPM  │  面包屑导航（中间）  │  用户区域 ▾   │  ← 顶栏 60px
├─────────────────────────────────────────────────────────┤
│                                                         │
│                     内容区（RouterView）                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

顶栏三段布局用 `display: flex; justify-content: space-between`：
- 左：品牌区（logo 方块 + "SmartPM" 文字）
- 中：`BreadcrumbNav` 组件
- 右：`UserMenu` 组件（头像 + 用户名 + ▾）

### 3.2 面包屑组件 `BreadcrumbNav.vue`

读取 `appStore.currentWorkspace` 和 `appStore.currentProject`，生成面包屑段：

```
工作区列表  →  {workspace.name}  →  {project.name}
```

规则：
- 每段为 `RouterLink`，点击跳转对应路由
- 段之间用 `/` 分隔符（非链接）
- 当前最后一段不加下划线，但仍可点击

路由映射：
| 段 | 跳转路由 |
|----|---------|
| 工作区列表 | `/workspaces` |
| `{workspace.name}` | `/workspaces/:workspaceId` |
| `{project.name}` | `/workspaces/:workspaceId/projects/:projectId` |

### 3.3 用户下拉菜单 `UserMenu.vue`

状态：`const open = ref(false)`

触发：点击用户区域 toggle `open`；`onClickOutside` 关闭。

动画：Vue `<Transition>` + CSS：

```css
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
```

菜单项：
1. 个人资料 → `/settings/profile`
2. 外观设置 → `/settings/appearance`
3. `<hr>` 分割线
4. 退出登录（调用 `authStore.logout()` + `router.push('/login')`）

菜单定位：`position: absolute; top: calc(100% + 8px); right: 0`，`z-index: 100`。

---

## 四、项目图标与颜色

### 4.1 后端数据模型

在 `projects` 表新增两列：

```sql
ALTER TABLE projects
  ADD COLUMN icon  VARCHAR(60)  NOT NULL DEFAULT 'code',
  ADD COLUMN color VARCHAR(20)  NOT NULL DEFAULT '#4f46e5';
```

对应 TypeORM entity 新增：

```typescript
@Column({ length: 60, default: 'code' })
icon: string;

@Column({ length: 20, default: '#4f46e5' })
color: string;
```

### 4.2 后端 DTO 扩展

`CreateProjectDto` 和 `UpdateProjectDto` 各增加：

```typescript
@IsOptional()
@IsString()
@MaxLength(60)
icon?: string;

@IsOptional()
@IsString()
@Matches(/^#[0-9a-fA-F]{3,8}$/)
color?: string;
```

`project.service.ts` 的 `create` 和 `update` 方法透传这两个字段；所有 project 响应 DTO 包含 `icon` 和 `color`。

### 4.3 前端图标集

定义常量文件 `frontend/src/constants/project-icons.ts`，导出 50 个 Font Awesome 6 Free 图标名数组：

```typescript
export const PROJECT_ICONS = [
  'code', 'code-branch', 'code-commit', 'code-compare', 'code-fork',
  'code-merge', 'code-pull-request', 'terminal', 'bug', 'bug-slash',
  'database', 'server', 'laptop-code', 'file-code', 'microchip',
  'memory', 'hard-drive', 'network-wired', 'sitemap', 'diagram-project',
  'cube', 'cubes', 'layer-group', 'puzzle-piece', 'plug',
  'hashtag', 'at', 'percent', 'infinity', 'superscript',
  'subscript', 'object-group', 'object-ungroup', 'bolt', 'fire',
  'rocket', 'star', 'flag', 'bookmark', 'tag',
  'tags', 'folder', 'folder-open', 'file', 'file-lines',
  'list', 'list-check', 'table-columns', 'chart-bar', 'chart-line',
] as const
```

安装 `@fortawesome/fontawesome-free`，在 `main.ts` 引入 CSS：

```typescript
import '@fortawesome/fontawesome-free/css/all.min.css'
```

图标渲染：`<i :class="`fa-solid fa-${iconName}`" />`

### 4.4 前端选择器组件

**`IconPicker.vue`**：
- Props：`modelValue: string`，Emits：`update:modelValue`
- 展示 50 个图标的 5×10 网格
- 选中项高亮（主题色背景）
- 可嵌入表单或浮层

**`ProjectColorPicker.vue`**：
- Props：`modelValue: string`，Emits：`update:modelValue`
- 12 个预设色块（圆形，选中有对勾）
- 一个 `<input type="color">` 自定义输入
- 预设颜色：`#ef4444 #f97316 #eab308 #22c55e #14b8a6 #3b82f6 #6366f1 #8b5cf6 #ec4899 #64748b #0ea5e9 #10b981`

---

## 五、项目列表改版

### 5.1 视图模式

`ProjectListView.vue` 顶部增加切换按钮组：

```html
<button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }">
  <i class="fa-solid fa-grip" />
</button>
<button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }">
  <i class="fa-solid fa-list" />
</button>
```

`viewMode` 用 `useLocalStorage('project-view-mode', 'grid')` 持久化（VueUse）。

### 5.2 大图模式卡片 `ProjectCard.vue`

结构：

```
┌──────────────────────────────┐
│  [图标大块，带颜色背景]  ★ ⓘ  │  ← hover 时右上角出现操作按钮
│                              │
│  项目名称                     │
│  描述摘要（1行截断）           │
│  [头像组]  12 个任务           │
└──────────────────────────────┘
```

图标块：`width: 64px; height: 64px; border-radius: 16px; background: {project.color}22`（颜色加 22 透明度），图标颜色为 `project.color`。

悬浮快捷操作（`v-show="hovered"`，绝对定位右上角）：
- 颜色按钮：点击展开 `ProjectColorPicker` 浮层，选色后调用 `PATCH /projects/:id` 立即保存
- 图标按钮：点击展开 `IconPicker` 浮层，选图标后立即保存
- 更多按钮（`⋯`）：下拉菜单含"编辑"和"删除"

浮层用 `position: absolute` + `z-index: 50`，点击外部关闭。

### 5.3 列表模式

`<table>` 或 flex 行，列：图标色块（32px）、名称、描述、成员数、任务数、创建时间、操作（编辑/删除）。

---

## 六、任务字段图标化与标签彩色化

### 6.1 字段图标行

任务详情抽屉中，每个字段用统一的 `TaskFieldRow.vue` 组件包裹：

```html
<TaskFieldRow icon="user" label="负责人">
  <AssigneePicker v-model="form.assigneeId" />
</TaskFieldRow>
```

`TaskFieldRow.vue` 渲染：

```
[图标 16px]  [slot 内容]
```

图标颜色：`var(--color-text-secondary)`，宽度固定 `24px`，与内容对齐。

### 6.2 标签彩色化

`task_tags.color` 字段已存在。前端展示逻辑：

```typescript
function tagStyle(color: string | null) {
  if (!color) return {}
  return {
    backgroundColor: color + '22',  // 透明背景
    color: color,
    borderColor: color + '44',
  }
}
```

标签胶囊：`border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; border: 1px solid`

### 6.3 快捷标签选择器 `TagSelector.vue`

- Props：`modelValue: string[]`（已选标签 id 数组），`projectId: string`
- 展示已选标签（彩色胶囊，点击移除）
- 点击"添加标签"展开下拉：
  - 搜索输入框
  - 候选列表（项目内所有标签，带颜色预览）
  - "创建新标签"入口（输入名称 + 选颜色）
- 创建标签调用 `POST /projects/:projectId/tags`（已有接口）

---

## 七、任务评论与操作日志

### 7.1 后端现状（已完整）

| 接口 | 说明 |
|------|------|
| `GET /tasks/:taskId/comments` | 分页获取评论列表，返回 `author`（含头像）、`content`、`createdAt` |
| `POST /tasks/:taskId/comments` | 创建评论，`content` 为 HTML 富文本 |
| `PATCH /comments/:commentId` | 更新评论（仅作者） |
| `DELETE /comments/:commentId` | 删除评论（仅作者） |
| `GET /tasks/:taskId/activities` | 获取任务操作日志，返回 `user`（含头像）、`action`、`entityType`、`extra`、`createdAt` |

无需后端改动。

### 7.2 前端 Tab 区域

在任务详情抽屉底部增加 `TaskActivityPanel.vue`：

```
[评论]  [日志]          ← Tab 切换
─────────────────────
评论列表 / 日志列表
─────────────────────
[头像] [评论输入框]  [发送]   ← 仅评论 Tab 显示
```

**评论列表项**：
- 左：用户头像（`UserAvatar` 组件，size=32）
- 右上：用户名 + 时间（相对时间，如"3分钟前"）
- 右下：评论内容（`v-html`，已由后端清洗）
- 悬浮显示删除按钮（仅自己的评论）

**日志列表项**：
- 左：用户头像（size=28）
- 右：操作描述文字 + 时间

操作描述由前端根据 `action` + `extra` 字段拼接，例如：

```typescript
function formatActivity(log: ActivityLog): string {
  switch (log.action) {
    case 'task.created': return '创建了任务'
    case 'task.status_changed':
      return `将状态从「${log.extra?.from}」改为「${log.extra?.to}」`
    case 'task.assignee_changed': return '修改了负责人'
    case 'task.due_date_changed': return '修改了截止时间'
    case 'task.tag_added': return `添加了标签 #${log.extra?.tagName}`
    case 'task.tag_removed': return `移除了标签 #${log.extra?.tagName}`
    default: return log.action
  }
}
```

### 7.3 API 调用

新增 `frontend/src/api/comment.ts` 和 `frontend/src/api/activity.ts`（如不存在）：

```typescript
// comment.ts
export const listComments = (taskId: string) =>
  http.get<Comment[]>(`/tasks/${taskId}/comments`)
export const createComment = (taskId: string, content: string) =>
  http.post<Comment>(`/tasks/${taskId}/comments`, { content })
export const deleteComment = (commentId: string) =>
  http.delete(`/comments/${commentId}`)

// activity.ts
export const listTaskActivities = (taskId: string) =>
  http.get<ActivityLog[]>(`/tasks/${taskId}/activities`)
```

---

## 八、后端需要的改动汇总

| 改动 | 文件 | 说明 |
|------|------|------|
| 新增 migration | `backend/src/infra/database/migrations/` | `projects` 表加 `icon`、`color` 列 |
| 更新 entity | `project.entity.ts` | 加 `icon`、`color` 字段 |
| 更新 DTO | `project.dto.ts` | `CreateProjectDto`、`UpdateProjectDto` 加 `icon`、`color` |
| 更新 service | `project.service.ts` | create/update/response 透传 `icon`、`color` |

评论、活动日志、标签颜色后端均已完整，无需改动。

---

## 九、前端新增/修改文件汇总

| 文件 | 类型 | 说明 |
|------|------|------|
| `components/layout/AppLayout.vue` | 修改 | 去侧边栏，重构顶栏 |
| `components/layout/BreadcrumbNav.vue` | 新增 | 面包屑组件 |
| `components/layout/UserMenu.vue` | 新增 | 用户下拉菜单 |
| `constants/project-icons.ts` | 新增 | 50 个图标名常量 |
| `components/project/IconPicker.vue` | 新增 | 图标选择器 |
| `components/project/ProjectColorPicker.vue` | 新增 | 颜色选择器 |
| `components/project/ProjectCard.vue` | 新增 | 大图模式卡片 |
| `views/workspace/ProjectListView.vue` | 修改 | 支持大图/列表切换 |
| `components/task/TaskFieldRow.vue` | 新增 | 带图标的字段行 |
| `components/task/TagSelector.vue` | 新增 | 快捷标签选择器 |
| `components/task/TaskActivityPanel.vue` | 新增 | 评论 + 日志 Tab 区域 |
| `views/project/TaskBoardView.vue` | 修改 | 接入 TaskFieldRow、TagSelector、TaskActivityPanel |
| `api/comment.ts` | 新增 | 评论 API 封装 |
| `api/activity.ts` | 新增 | 活动日志 API 封装 |
| `main.ts` | 修改 | 引入 Font Awesome CSS |

---

## 十、依赖变更

| 包 | 位置 | 用途 |
|----|------|------|
| `@fortawesome/fontawesome-free` | frontend | 图标 CSS |
| `@vueuse/core` | frontend | `useLocalStorage`（视图模式持久化）、`onClickOutside` |

`@vueuse/core` 如已安装则无需重复安装。
