# SmartPM UI 增强 v2 任务文档

**版本**：v1.0  
**日期**：2026-05-12  
**关联文档**：
- `docs/requirements/ui-enhancement-v2-prd.md`
- `docs/design/07-ui-enhancement-v2.md`

---

## 一、里程碑划分

| 里程碑 | 目标 | 前置依赖 |
|--------|------|---------|
| M5 主界面布局重构 | 去侧边栏、面包屑、用户下拉菜单 | 无 |
| M6 项目图标与颜色 | 后端字段扩展 + 前端选择器 | 无 |
| M7 项目列表改版 | 大图/列表模式、悬浮快捷编辑 | M6 |
| M8 任务字段图标化与标签彩色化 | 字段图标行、标签彩色胶囊、快捷标签选择器 | 无 |
| M9 任务评论与操作日志 | 前端接入已有后端 API | 无 |

M5、M6、M8、M9 可并行推进；M7 依赖 M6 完成。

---

## 二、M5 主界面布局重构

### M5-1 去掉侧边栏，重构 AppLayout.vue

**文件**：`frontend/src/components/layout/AppLayout.vue`

改动：
- 删除 `.sidebar` 及其所有子元素
- 删除 `.app-shell` 的 `flex-direction: row` 布局，改为 `flex-direction: column`
- 顶栏 `.topbar` 改为三段 flex 布局：左（品牌区）、中（面包屑）、右（用户菜单）
- 品牌区：保留现有 `.brand-mark` 方块 + "SmartPM" 文字
- 删除顶栏中原有的 `headerEyebrow`、`headerTitle`、`profile-chip`、`settings-icon-button`
- 引入 `BreadcrumbNav` 和 `UserMenu` 组件

完成标准：
- [ ] 登录后无侧边栏
- [ ] 顶栏左侧显示 logo + SmartPM
- [ ] 顶栏中间为面包屑占位（M5-2 完成后填充）
- [ ] 顶栏右侧为用户菜单占位（M5-3 完成后填充）

---

### M5-2 新增面包屑组件 BreadcrumbNav.vue

**文件**：`frontend/src/components/layout/BreadcrumbNav.vue`

实现：
- 读取 `appStore.currentWorkspace` 和 `appStore.currentProject`
- 生成面包屑段数组，每段含 `label` 和 `to`（路由路径）
- 渲染为 `RouterLink` 列表，段间用 `/` 分隔
- 最后一段样式加粗，其余段为次要色

完成标准：
- [ ] 无工作区时显示"工作区"链接（`/workspaces`）
- [ ] 有工作区时显示工作区名称，可点击跳转
- [ ] 有项目时追加项目名称，可点击跳转
- [ ] 路由切换后面包屑自动更新

---

### M5-3 新增用户下拉菜单组件 UserMenu.vue

**文件**：`frontend/src/components/layout/UserMenu.vue`

实现：
- 触发区：`UserAvatar` + 用户名 + `▾` 指示器
- `open = ref(false)`，点击触发区 toggle
- `onClickOutside` 关闭菜单（使用 `@vueuse/core`）
- 菜单项：个人资料、外观设置、分割线、退出登录
- 动画：`<Transition name="dropdown">` + CSS（淡入 + 向下滑出 150ms）
- 菜单绝对定位，`top: calc(100% + 8px); right: 0; z-index: 100`

完成标准：
- [ ] 点击用户区域展开/收起菜单
- [ ] 展开/收起有动画
- [ ] 点击菜单外部自动关闭
- [ ] 下拉菜单不被页面内容区遮挡，菜单项可正常点击（topbar z-index 须高于 page-content）
- [ ] 点击"个人资料"跳转 `/settings/profile`
- [ ] 点击"外观设置"跳转 `/settings/appearance`
- [ ] 点击"退出登录"清除 token 并跳转 `/login`

---

## 三、M6 项目图标与颜色

### M6-1 后端：projects 表新增 icon 和 color 字段

**文件**：
- `backend/src/infra/database/migrations/` 新增 migration 文件
- `backend/src/modules/project/project.entity.ts`
- `backend/src/modules/project/dto/project.dto.ts`
- `backend/src/modules/project/project.service.ts`

改动：
- 生成 migration：`projects` 表加 `icon VARCHAR(60) NOT NULL DEFAULT 'code'` 和 `color VARCHAR(20) NOT NULL DEFAULT '#4f46e5'`
- `Project` entity 加 `icon: string` 和 `color: string` 字段
- `CreateProjectDto` 和 `UpdateProjectDto` 加可选的 `icon` 和 `color`（`@IsOptional @IsString @MaxLength`，color 加 `@Matches(/^#[0-9a-fA-F]{3,8}$/)` 校验）
- `project.service.ts` 的 `create`、`update` 方法透传 `icon`、`color`；所有响应包含这两个字段

完成标准：
- [ ] `npm run migration:run` 成功执行
- [ ] `POST /projects` 可传 `icon` 和 `color`
- [ ] `PATCH /projects/:id` 可更新 `icon` 和 `color`
- [ ] `GET /projects/:id` 响应包含 `icon` 和 `color`
- [ ] 不传时使用默认值

---

### M6-2 前端：安装 Font Awesome 并定义图标常量

**文件**：
- `frontend/package.json`（安装 `@fortawesome/fontawesome-free`）
- `frontend/src/main.ts`（引入 CSS）
- `frontend/src/constants/project-icons.ts`（新增）

改动：
- `npm install @fortawesome/fontawesome-free`
- `main.ts` 加 `import '@fortawesome/fontawesome-free/css/all.min.css'`
- `project-icons.ts` 导出 50 个图标名的 `PROJECT_ICONS` 常量数组

完成标准：
- [ ] Font Awesome 图标在页面中可正常渲染
- [ ] `PROJECT_ICONS` 数组包含 50 个有效图标名

---

### M6-3 前端：新增 IconPicker.vue 组件

**文件**：`frontend/src/components/project/IconPicker.vue`

实现：
- Props：`modelValue: string`，Emits：`update:modelValue`
- 5 列网格展示 50 个图标
- 每个图标为可点击方块，选中时主题色背景高亮
- 点击图标 emit `update:modelValue`

完成标准：
- [ ] 50 个图标正确渲染
- [ ] 选中图标高亮
- [ ] v-model 双向绑定正常

---

### M6-4 前端：新增 ProjectColorPicker.vue 组件

**文件**：`frontend/src/components/project/ProjectColorPicker.vue`

实现：
- Props：`modelValue: string`，Emits：`update:modelValue`
- 12 个预设色块（圆形，选中显示对勾）
- 一个 `<input type="color">` 自定义输入
- 预设颜色：`#ef4444 #f97316 #eab308 #22c55e #14b8a6 #3b82f6 #6366f1 #8b5cf6 #ec4899 #64748b #0ea5e9 #10b981`

完成标准：
- [ ] 12 个预设色块正确显示
- [ ] 选中预设色块高亮
- [ ] 自定义颜色输入有效
- [ ] v-model 双向绑定正常

---

### M6-5 前端：更新项目创建/编辑表单

**文件**：`frontend/src/views/workspace/ProjectListView.vue`（或项目表单所在文件）

改动：
- 创建/编辑项目的表单中加入 `IconPicker` 和 `ProjectColorPicker`
- 表单提交时携带 `icon` 和 `color`
- 更新 `frontend/src/api/project.ts` 的 `CreateProjectPayload` 和 `UpdateProjectPayload` 类型加入 `icon?` 和 `color?`

完成标准：
- [ ] 创建项目时可选图标和颜色
- [ ] 编辑项目时可修改图标和颜色
- [ ] 保存后接口正确传参

---

## 四、M7 项目列表改版

### M7-1 新增 ProjectCard.vue 组件（大图模式卡片）

**文件**：`frontend/src/components/project/ProjectCard.vue`

实现：
- Props：`project`（含 `icon`、`color`、`name`、`description`、`memberCount`、`taskCount`）
- 图标块：64×64px，圆角 16px，背景色为 `project.color + '22'`，图标颜色为 `project.color`
- 悬浮时（`@mouseenter/@mouseleave`）右上角显示快捷操作区
- 快捷操作区：颜色按钮（展开 `ProjectColorPicker` 浮层）、图标按钮（展开 `IconPicker` 浮层）、更多按钮（编辑/删除下拉）
- 浮层用 `onClickOutside` 关闭
- 颜色/图标选择后立即调用 `PATCH /projects/:id` 保存，并 emit `updated` 事件

完成标准：
- [ ] 卡片正确展示图标、颜色、名称、描述
- [ ] 悬浮时快捷操作区出现
- [ ] 快捷修改颜色/图标后卡片即时更新
- [ ] 更多菜单的编辑/删除可用

---

### M7-2 改造 ProjectListView.vue 支持大图/列表切换

**文件**：`frontend/src/views/workspace/ProjectListView.vue`（或对应视图文件）

改动：
- 顶部加视图切换按钮组（大图/列表图标按钮）
- `viewMode` 用 `useLocalStorage('project-view-mode', 'grid')` 持久化
- 大图模式：`display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`，渲染 `ProjectCard`
- 列表模式：flex 列表行，每行含图标色块（32px）、名称、描述、成员数、任务数、创建时间、操作按钮
- 末尾加"创建新项目"卡片/行（虚线样式）

完成标准：
- [ ] 默认大图模式
- [ ] 切换列表模式后布局变为紧凑行
- [ ] 视图偏好刷新后保持
- [ ] 两种模式下创建/编辑/删除项目均可用

---

## 五、M8 任务字段图标化与标签彩色化

### M8-1 新增 TaskFieldRow.vue 组件

**文件**：`frontend/src/components/task/TaskFieldRow.vue`

实现：
- Props：`icon: string`（FA 图标名），`label?: string`
- 渲染：`[图标 16px 固定宽 24px]  [slot]`
- 图标颜色：`var(--color-text-secondary)`

完成标准：
- [ ] 图标与内容对齐
- [ ] slot 内容正常渲染

---

### M8-2 新增 TagSelector.vue 组件

**文件**：`frontend/src/components/task/TagSelector.vue`

实现：
- Props：`modelValue: string[]`（已选标签 id），`projectId: string`
- 展示已选标签（彩色胶囊，点击 × 移除）
- 点击"+ 添加标签"展开下拉：
  - 搜索输入框（过滤候选列表）
  - 候选列表（项目内所有标签，带颜色圆点预览）
  - "创建新标签"入口（输入名称 + `ProjectColorPicker` 选颜色，回车或点击创建）
- 创建标签调用 `POST /projects/:projectId/tags`
- 下拉用 `onClickOutside` 关闭

完成标准：
- [ ] 已选标签以彩色胶囊展示
- [ ] 可搜索和选择候选标签
- [ ] 可创建新标签并选颜色
- [ ] v-model 双向绑定正常

---

### M8-3 改造 TaskBoardView.vue 接入字段图标和标签选择器

**文件**：`frontend/src/views/project/TaskBoardView.vue`

改动：
- 任务详情抽屉中，每个字段行用 `TaskFieldRow` 包裹，传入对应图标名
- 标签区域替换为 `TagSelector` 组件
- 标签展示样式改为彩色胶囊（`tagStyle` 函数计算背景色/文字色）

完成标准：
- [ ] 每个字段行左侧有对应图标
- [ ] 标签以彩色胶囊展示
- [ ] 可快捷添加/移除标签
- [ ] 创建新标签可选颜色

---

## 六、M9 任务评论与操作日志

### M9-1 新增 API 封装文件

**文件**：
- `frontend/src/api/comment.ts`（新增）
- `frontend/src/api/activity.ts`（新增）

实现：

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

同时定义对应 TypeScript 接口类型（`Comment`、`ActivityLog`）。

完成标准：
- [ ] API 函数可正常调用
- [ ] 类型定义与后端响应结构一致

---

### M9-2 新增 TaskActivityPanel.vue 组件

**文件**：`frontend/src/components/task/TaskActivityPanel.vue`

实现：
- Props：`taskId: string`，`currentUserId: string`
- Tab 切换：评论 / 日志（`activeTab = ref('comments')`）
- 评论 Tab：
  - 加载 `listComments(taskId)`，按时间正序展示
  - 每条评论：`UserAvatar`（size=32）+ 用户名 + 相对时间 + `v-html` 内容
  - 悬浮显示删除按钮（仅 `comment.userId === currentUserId`）
  - 底部：`RichTextEditor`（minimal 工具栏）+ 发送按钮
  - 发送后清空输入框，列表追加新评论
- 日志 Tab：
  - 加载 `listTaskActivities(taskId)`，按时间正序展示
  - 每条日志：`UserAvatar`（size=28）+ `formatActivity(log)` 文字 + 相对时间
  - `formatActivity` 函数根据 `action` 字段生成可读描述

完成标准：
- [ ] 评论 Tab 可加载和展示评论
- [ ] 可发表评论，发表后即时显示
- [ ] 可删除自己的评论
- [ ] 日志 Tab 可加载和展示操作历史
- [ ] 日志描述文字可读（非原始 action 字符串）

---

### M9-3 改造 TaskBoardView.vue 接入 TaskActivityPanel

**文件**：`frontend/src/views/project/TaskBoardView.vue`

改动：
- 任务详情抽屉底部引入 `TaskActivityPanel`
- 传入 `taskId`（当前打开的任务 id）和 `currentUserId`（`authStore.user?.id`）
- 当抽屉关闭时重置 `taskId`，避免残留数据

完成标准：
- [ ] 打开任务详情后底部显示评论/日志 Tab
- [ ] 切换任务时评论/日志内容正确刷新
- [ ] 关闭抽屉后再次打开不显示上一个任务的数据

---

## 七、验收清单

### M5 主界面布局
- [ ] 登录后无左侧边栏
- [ ] 顶栏左侧显示 SmartPM logo 和品牌名
- [ ] 面包屑正确反映路由层级，各段可点击
- [ ] 用户下拉菜单有动画，点击外部关闭
- [ ] 退出登录和设置入口在下拉菜单中

### M6 项目图标与颜色
- [ ] 数据库 migration 成功执行
- [ ] 创建/编辑项目可选图标和颜色
- [ ] 项目响应包含 icon 和 color 字段

### M7 项目列表
- [ ] 大图模式卡片展示图标和颜色
- [ ] 悬浮快捷修改颜色/图标，即时生效
- [ ] 列表模式可用
- [ ] 视图偏好持久化

### M8 任务字段
- [ ] 每个字段行有对应图标
- [ ] 标签彩色胶囊展示
- [ ] 快捷添加/创建标签可用

### M9 评论与日志
- [ ] 评论 Tab 可发表和删除评论
- [ ] 日志 Tab 展示操作历史
- [ ] 切换任务时内容正确刷新

---

## 八、依赖安装

```bash
# frontend
cd frontend
npm install @fortawesome/fontawesome-free
# @vueuse/core 如未安装
npm install @vueuse/core
```

后端无新增依赖。
