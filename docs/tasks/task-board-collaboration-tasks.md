# SmartPM 任务看板与项目协作增强任务文档

**版本**：v1.0  
**日期**：2026-05-15  
**关联文档**：
- `docs/requirements/task-board-collaboration-prd.md`
- `docs/design/03-api.md`
- `docs/design/02-database.md`
- `docs/design/01-architecture.md`

---

## 一、里程碑划分

| 里程碑 | 目标 | 前置依赖 |
|--------|------|---------|
| M10 看板列表模型改造 | 引入自定义看板列表、列表排序、任务归属改造 | 无 |
| M11 任务排序、过滤与回收站 | 同列排序、跨列排序、过滤栏、URL 同步、回收站 | M10 |
| M12 项目成员与邮件邀请 | 项目管理员 / 项目成员角色、邀请与成员管理 | 无 |
| M13 多负责人与子任务增强 | 多负责人、子任务展示、内嵌编辑与跳转 | M10、M12 |
| M14 新建任务表单增强 | 快速新增 + 完整编辑框双模式 | M10、M12、M13 |
| M15 联调与回归 | 数据迁移、交互回归、权限回归 | M10–M14 |

说明：
- M10 与 M12 可并行推进。
- M11 依赖 M10，因为过滤、拖动排序和回收站都建立在新看板列表模型之上。
- M13 依赖 M12，因为负责人选择范围依赖项目成员体系。
- M14 依赖 M10 / M12 / M13，因为新建任务表单需要看板列表、多负责人和子任务相关数据基础。

---

## 二、M10 看板列表模型改造

### M10-1 后端：新增看板列表数据表与实体

**文件**：
- `backend/src/infra/database/migrations/` 新增 migration 文件
- `backend/src/modules/task/` 或新增 `board-list` 模块对应 entity / dto / service
- `docs/design/02-database.md`

改动：
- 新增 `board_lists` 表
- 字段至少包括：`id`、`project_id`、`name`、`order`、`created_at`、`updated_at`
- 增加软删除能力或等价回收站标记
- 为项目初始化默认创建 3 个基础看板列表
- 任务表增加 `board_list_id`
- 任务表增加排序字段，例如 `order`
- 任务表增加软删除能力或回收站标记

完成标准：
- [ ] migration 可执行
- [ ] 新项目或旧项目迁移后具备默认看板列表
- [ ] 任务可关联到看板列表
- [ ] 看板列表与任务顺序可被持久化
- [ ] 被删除的看板列表和任务可进入回收站

---

### M10-2 后端：看板列表 CRUD 与排序接口

**文件**：
- `backend/src/modules/task/` 或新增 `board-list` controller/service/dto
- `docs/design/03-api.md`

改动：
- 新增获取项目看板列表接口
- 新增创建看板列表接口
- 新增更新看板列表名称接口
- 新增看板列表排序接口
- 新增看板列表删除接口
- 删除看板列表时，关联任务一并进入回收站
- 删除前要求二次确认
- 新增项目回收站列表、恢复、彻底删除接口

完成标准：
- [ ] 可获取项目全部看板列表
- [ ] 可创建新看板列表
- [ ] 可修改看板列表名称
- [ ] 可保存看板列表顺序
- [ ] 可删除看板列表并进入回收站
- [ ] 可查看、恢复、彻底删除回收站内容
- [ ] API 文档同步更新

---

### M10-3 前端：任务页从固定状态列切换到动态看板列表

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要，拆分新组件到 `frontend/src/components/task/`

改动：
- 删除前端写死的 `Todo / In Progress / Done` 列定义
- 改为读取项目下看板列表数据渲染列
- 每列使用后端返回的 `id`、`name`、`order`
- 每列内任务按 `boardListId` 分组
- 保留列底部“新增任务”入口

完成标准：
- [ ] 页面可显示项目下全部自定义看板列表
- [ ] 默认三列仍可显示
- [ ] 新增看板列表后前端即时展示
- [ ] 旧固定状态逻辑不再驱动主视图

---

### M10-4 前端：新增看板列表创建入口

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增 `BoardListCreateDialog.vue` 或内联表单

实现：
- 页面提供“新增看板列表”入口
- 弹出框或内联表单输入名称
- 提交后调用创建接口
- 成功后刷新或局部插入新列表

完成标准：
- [ ] 可输入名称创建看板列表
- [ ] 名称为空时不可提交
- [ ] 创建成功后无需刷新页面即可看到新列

---

### M10-5 前端：看板列表删除与回收站入口

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增 `ProjectRecycleBinView.vue` 或 `RecycleBinDrawer.vue`

实现：
- 看板列表头部提供删除操作
- 删除前弹出二次确认
- 看板页提供回收站入口
- 回收站中可查看已删除的看板列表与任务
- 支持恢复和彻底删除

完成标准：
- [ ] 删除看板列表前必须二次确认
- [ ] 删除后可在回收站看到对应看板列表和任务
- [ ] 可恢复或彻底删除回收站内容

---

## 三、M11 任务排序、过滤与回收站

### M11-1 后端：任务排序能力

**文件**：
- `backend/src/modules/task/task.service.ts`
- `backend/src/modules/task/task.controller.ts`
- `backend/src/modules/task/dto/task.dto.ts`
- `docs/design/03-api.md`

改动：
- 支持同列内任务排序更新
- 支持跨列移动时同时更新 `boardListId` 和排序字段
- 新增批量排序接口或统一的拖拽落点更新接口

完成标准：
- [ ] 同列重排可持久化
- [ ] 跨列拖动可持久化
- [ ] 刷新页面后顺序保持一致

---

### M11-2 前端：看板列表拖动排序

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增拖拽 hook / util

实现：
- 支持拖动列头或整列容器排序
- 拖动完成后调用列表排序接口
- 拖动中提供明确反馈态

完成标准：
- [ ] 列可左右拖动
- [ ] 拖动完成后顺序立即变化
- [ ] 刷新后顺序保持

---

### M11-3 前端：同列与跨列任务拖动排序

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`

改动：
- 当前仅跨列状态变更的拖动逻辑，改为支持明确的插入位置
- 同列中任务可上下拖动排序
- 跨列时带入新列和新顺位
- 拖动失败时正确回滚

完成标准：
- [ ] 同列可排序
- [ ] 跨列可移动并定位到目标位置
- [ ] 保存失败时界面回滚正确

---

### M11-4 后端：任务过滤查询扩展

**文件**：
- `backend/src/modules/task/task.controller.ts`
- `backend/src/modules/task/task.service.ts`
- `backend/src/modules/task/dto/task.dto.ts`
- `docs/design/03-api.md`

改动：
- 扩展任务列表查询参数
- 至少支持：
  - `title` 模糊查询
  - `boardListId`
  - `assigneeId` 或 `assigneeIds`
  - `priority`
  - `tagIds`
  - `dueDateRange`
  - `isSubtask`

完成标准：
- [ ] 标题支持模糊查询
- [ ] 多字段过滤可组合使用
- [ ] 查询性能在项目常规数据量下可接受

---

### M11-5 前端：任务过滤栏

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增 `TaskFilterBar.vue`

实现：
- 顶部增加过滤栏
- 支持标题模糊搜索
- 支持负责人、标签、优先级、截止时间、看板列表等条件过滤
- 提供“清空过滤”入口
- 过滤条件同步到 URL query
- 页面初始化时从 URL 恢复过滤条件

完成标准：
- [ ] 标题模糊查询可用
- [ ] 多条件组合过滤可用
- [ ] 刷新页面后过滤条件可从 URL 恢复
- [ ] 清空后恢复完整任务视图

---

### M11-6 后端：回收站查询与恢复逻辑

**文件**：
- `backend/src/modules/task/task.service.ts`
- `backend/src/modules/task/task.controller.ts`
- 看板列表相关 service/controller
- `docs/design/03-api.md`

改动：
- 为已删除任务和看板列表提供回收站查询能力
- 提供恢复接口
- 提供彻底删除接口
- 明确恢复看板列表时是否连带恢复其任务

完成标准：
- [ ] 可查询项目回收站数据
- [ ] 可恢复任务和看板列表
- [ ] 可彻底删除任务和看板列表

---

## 四、M12 项目成员与邮件邀请

### M12-1 后端：项目成员角色模型升级

**文件**：
- `backend/src/modules/project/project-member.entity.ts`
- `backend/src/modules/project/dto/project.dto.ts`
- `backend/src/modules/project/project.service.ts`
- `backend/src/modules/project/project.controller.ts`
- `docs/design/03-api.md`

改动：
- 明确 `project_members.role` 支持 `admin` / `member`
- 为旧数据设置默认角色
- 增加成员角色更新能力
- 限制移除成员与角色修改权限
- 防止最后一个管理员被移除或降级

完成标准：
- [ ] 成员数据有明确角色
- [ ] 管理员可更新成员角色
- [ ] 至少保留一个管理员

---

### M12-2 后端：邀请成员与项目权限校验

**文件**：
- `backend/src/modules/project/project.service.ts`
- `backend/src/modules/project/project.controller.ts`

改动：
- 调整邀请逻辑，使项目管理员和项目成员都可邀请成员
- 新增基于邮箱的一次性邀请链接能力
- 新增邀请 token 生成、校验、使用、过期控制
- 被邀请人点击链接后进入注册流程，注册成功后自动加入项目
- 创建任务、编辑任务接口增加项目成员身份校验
- 查看项目任务、标签、成员等接口统一走项目成员权限判断

完成标准：
- [ ] 管理员和成员均可邀请项目成员
- [ ] 邮件邀请链接仅可使用一次
- [ ] 被邀请人注册后自动加入项目
- [ ] 非项目成员不可访问项目任务数据
- [ ] 管理员与成员在任务操作上权限一致

---

### M12-3 前端：项目成员管理界面

**文件**：
- 新增 `frontend/src/views/project/ProjectMembersView.vue` 或等价组件
- `frontend/src/router/index.ts`
- `frontend/src/api/project.ts`

实现：
- 展示成员列表、角色、邀请入口
- 邀请入口改为邮箱输入 + 发送邮件
- 支持管理员修改角色、移除成员
- 支持项目成员邀请新成员

完成标准：
- [ ] 可查看项目成员及角色
- [ ] 可通过邮箱发送邀请
- [ ] 管理员可改角色、移除成员

---

### M12-4 前端：邀请链接注册 / 接受邀请流程

**文件**：
- 新增邀请接受页，例如 `frontend/src/views/auth/ProjectInviteAcceptView.vue`
- `frontend/src/router/index.ts`
- `frontend/src/api/project.ts` 或 `frontend/src/api/auth.ts`

实现：
- 打开一次性邀请链接后展示项目信息
- 引导用户注册或完成账号创建
- 注册成功后自动加入项目并跳转

完成标准：
- [ ] 邀请链接可打开并识别有效性
- [ ] 新用户注册后自动加入项目
- [ ] 失效或已使用链接有明确提示

---

## 五、M13 多负责人与子任务增强

### M13-1 后端：多负责人数据结构改造

**文件**：
- `backend/src/infra/database/migrations/` 新增 migration 文件
- `backend/src/modules/task/task.entity.ts`
- `backend/src/modules/task/dto/task.dto.ts`
- `backend/src/modules/task/task.service.ts`
- `docs/design/02-database.md`
- `docs/design/03-api.md`

改动：
- 新增 `task_assignees` 关联表
- 任务创建、更新、详情、列表返回结构改为支持多负责人
- 兼容现有单人负责人字段或完成迁移

完成标准：
- [ ] 一个任务可保存多个负责人
- [ ] 列表和详情接口都能返回多负责人
- [ ] 旧数据迁移后不丢失负责人信息

---

### M13-2 前端：任务负责人字段改为多选

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增 `TaskAssigneeSelector.vue`

实现：
- 负责人字段改为多选组件
- 数据来源限制为项目成员
- 卡片与详情区展示多负责人
- 主任务详情展示“头像 + 姓名”，最多 3 个，超出显示 `...`
- 看板卡片中仅展示头像，hover 显示姓名，最多展示 2 个后 `...`
- 子任务列表中仅展示头像，hover 显示姓名，最多展示 2 个后 `...`

完成标准：
- [ ] 可选择多个负责人
- [ ] 多负责人可正确回显
- [ ] 卡片和详情展示一致
- [ ] 不同场景的负责人展示规则符合需求定义

---

### M13-3 前端：父任务中的子任务列表

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增 `SubtaskList.vue`

实现：
- 在任务详情区增加子任务区域
- 展示子任务标题、负责人、截止日期
- 支持新增子任务入口
- 支持标题、负责人、截止日期三项内嵌快速编辑
- 点击子任务标题后打开该子任务详情

完成标准：
- [ ] 父任务可看到子任务列表
- [ ] 子任务标题可点击进入详情
- [ ] 子任务标题、负责人、截止日期可内嵌编辑
- [ ] 子任务更新后列表同步刷新

---

### M13-4 后端：子任务详情与列表接口补强

**文件**：
- `backend/src/modules/task/task.service.ts`
- `backend/src/modules/task/task.controller.ts`
- `docs/design/03-api.md`

改动：
- 确认子任务列表响应中包含标题、负责人摘要、截止日期
- 确认任务详情接口可正确返回父子关系
- 为前端父任务详情中的子任务区域补齐最小数据字段
- 提供子任务列表项的轻量更新接口或复用现有更新接口支持内嵌编辑

完成标准：
- [ ] 子任务列表接口返回标题、负责人、截止日期等必要字段
- [ ] 子任务详情可复用现有任务详情接口
- [ ] 子任务列表项可支持内嵌编辑提交

---

## 六、M14 新建任务表单增强

### M14-1 前端：统一新建任务表单

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 如需要新增 `TaskCreateDialog.vue` 或 `TaskForm.vue`

改动：
- 保留快速新增模式，并补齐关键字段
- 快速新增字段包括：
  - 标题（必填）
  - 负责人（可选）
  - 描述（可选）
  - 截止时间（可选）
- 提供进入完整编辑框入口
- 完整编辑框字段包括：
  - 标题
  - 看板列表
  - 优先级
  - 多负责人
  - 截止时间
  - 标签
  - 描述

完成标准：
- [ ] 快速新增可录入标题、负责人、描述、截止时间
- [ ] 完整编辑框可录入全部核心字段
- [ ] 描述字段继续使用富文本组件
- [ ] 保存后卡片展示信息正确

---

### M14-2 后端：创建任务接口扩展

**文件**：
- `backend/src/modules/task/dto/task.dto.ts`
- `backend/src/modules/task/task.service.ts`
- `backend/src/modules/task/task.controller.ts`
- `docs/design/03-api.md`

改动：
- 创建任务 DTO 支持：
  - `boardListId`
  - `assigneeIds`
  - `dueDate`
  - `tagIds`
  - `description`
  - `parentId`
- 支持快速新增场景的最小字段提交
- 创建后返回完整任务数据

完成标准：
- [ ] 创建任务接口支持完整表单字段
- [ ] 创建任务接口兼容快速新增与完整编辑框两种提交模式
- [ ] 创建响应可直接驱动前端局部更新

---

### M14-3 前端：新建任务与详情编辑表单收敛

**文件**：
- `frontend/src/views/project/TaskBoardView.vue`
- 相关任务表单组件

改动：
- 新建任务与编辑任务尽量复用同一套字段组件
- 避免新建和编辑两套字段定义分叉
- 保证字段校验、默认值、提交格式一致
- 快速新增与完整编辑框共享尽可能一致的数据模型和提交转换逻辑

完成标准：
- [ ] 新建与编辑任务字段结构一致
- [ ] 前端字段转换逻辑统一

---

## 七、M15 联调与回归

### M15-1 数据迁移与兼容性验证

内容：
- 验证旧项目在迁移后自动生成默认看板列表
- 验证旧任务归属到默认看板列表
- 验证旧单人负责人迁移到多人负责人结构
- 验证已删除看板列表 / 任务的回收站数据完整性

完成标准：
- [ ] 迁移后旧项目可正常打开看板
- [ ] 旧任务不丢失
- [ ] 旧负责人数据不丢失
- [ ] 回收站数据可正确恢复与清理

---

### M15-2 权限回归

内容：
- 验证项目管理员权限
- 验证项目成员权限
- 验证非项目成员访问限制

完成标准：
- [ ] 管理员 / 成员权限符合文档定义
- [ ] 非成员无法访问项目任务数据

---

### M15-3 交互回归

内容：
- 看板列表新增、排序回归
- 看板列表删除与回收站回归
- 任务拖动排序回归
- 过滤栏组合查询回归
- URL 过滤同步回归
- 多负责人选择与展示回归
- 子任务创建、打开、编辑回归
- 子任务内嵌编辑回归
- 快速新增任务与完整编辑框回归

完成标准：
- [ ] 桌面端主流程可用
- [ ] 页面刷新后排序与数据不丢失
- [ ] 关键交互无明显回退

---

## 八、建议实施顺序

1. 先做 M10：把看板列表和任务排序字段落库
2. 并行做 M12：补项目成员角色与权限
3. 再做 M11：任务过滤和拖动排序
4. 再做 M13：多负责人与子任务增强
5. 最后做 M14：统一新建任务完整表单
6. 收尾执行 M15 联调与回归

---

## 九、依赖与风险

- 看板列表模型会影响现有任务 `status` 设计，迁移策略必须先明确。
- 多负责人会影响任务接口、前端展示、通知和活动日志结构。
- 拖动排序在过滤场景下容易出现顺序错乱，需要先确定排序语义。
- 项目成员“管理员 / 成员都能邀请”与“仅管理员可改角色/移除”要在权限代码里明确拆分。
- 邮件邀请引入 token、过期时间和注册链接，需要补安全校验与邮件通道能力。
- 回收站会影响删除语义，需要统一任务、看板列表、子任务的恢复规则。
- 子任务点击进入详情时，需避免与当前任务详情弹出框状态冲突。
- 快速新增和完整编辑框并存，容易造成前端状态与字段校验重复，需要提前做表单抽象。
