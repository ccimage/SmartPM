# SmartPM 前端体验增强设计文档

> 版本：v1.0 | 日期：2026-05-11 | 依赖：01-architecture.md、02-database.md、03-api.md

---

## 一、目标

基于当前 Vue3 + Vite + Pinia 前端和 NestJS 后端，实现一套可落地的前端体验增强方案，覆盖：

- 主题换肤
- 第三方登录
- 头像策略
- 图标体系
- 任务界面改版
- 富文本统一

设计原则：

- 不推翻现有路由与模块边界，在现有结构上增量演进。
- UI 改造优先走“语义化主题变量 + 通用组件”路线，避免页面级硬编码。
- 第三方登录走统一账号绑定模型，避免为每个平台单独打散业务逻辑。

---

## 二、现状基线

当前代码状态：

- 登录页为基础表单页：`frontend/src/views/auth/LoginView.vue`
- 主界面布局为基础侧边栏 + 顶栏：`frontend/src/components/layout/AppLayout.vue`
- 任务页为基础看板 + 右侧抽屉：`frontend/src/views/project/TaskBoardView.vue`
- 当前用户接口只支持 `name` 与 `avatarUrl` 更新：`PATCH /api/v1/users/me`
- 当前认证只支持注册、账号密码登录、`/auth/me`
- 当前全局样式仅有少量基础色值，尚未建立主题变量体系：`frontend/src/style.css`

---

## 三、总体方案

本次改造拆为 6 个设计域：

1. 主题与皮肤系统
2. 第三方登录与账号绑定
3. 头像来源与上传策略
4. 图标体系与界面美化
5. 任务界面重构
6. 统一富文本输入组件

---

## 四、主题与皮肤系统

## 4.1 设计目标

实现“用户改一个主题色，整套界面语义色随之变化”的能力，而不是页面内局部直接替换十六进制颜色。

---

## 4.2 数据模型

建议新增 `user_preferences` 表，而不是继续把皮肤配置塞入 `users` 主表。

```sql
CREATE TABLE user_preferences (
  user_id                    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme_color                VARCHAR(20),
  background_image_file_id   UUID REFERENCES files(id) ON DELETE SET NULL,
  background_image_url       VARCHAR(1000),
  background_overlay         VARCHAR(20) DEFAULT 'medium',
  use_system_theme           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

说明：

- `theme_color` 保存用户选择的主色。
- 背景图优先复用现有 `files` 上传能力。
- `background_image_url` 作为冗余展示字段，降低前端读取成本。
- 登录页和主界面先共用同一张背景图，分别通过遮罩与布局适配。

---

## 4.3 前端主题实现

在 `frontend/src/style.css` 中建立主题语义变量，例如：

```css
:root {
  --color-bg-app: #f5f7fb;
  --color-bg-panel: #ffffff;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border-default: #d1d5db;
  --color-primary: #2f6fed;
  --color-primary-hover: #2459c7;
  --color-primary-soft: #e8f0ff;
  --color-primary-text: #1d4ed8;
  --color-focus-ring: rgba(47, 111, 237, 0.18);
}
```

实现方式：

- 个人设置保存主题色后，后端返回用户偏好。
- 登录后在应用启动阶段拉取 `me + preferences`。
- `useThemeStore` 将主题色计算为一组语义色变量，写入 `document.documentElement.style`。
- 登录页和主布局通过 `body`/`#app` 的背景图与遮罩变量统一渲染。

不采用的方案：

- 不采用每个页面单独判断主题色。
- 不采用用户输入整套 CSS 文本。

---

## 4.4 设置页设计

新增个人设置页面：

- `/settings/profile`
- `/settings/appearance`

其中 `appearance` 页面包含：

- 主题色选择器
- 主题色预览卡片
- 背景图上传
- 恢复默认按钮
- 保存按钮

交互要求：

- 颜色调整时前端即时预览。
- 点击保存后持久化到服务端。
- 上传背景图时校验大小、格式、长宽比。

---

## 五、OAuth2 登录与账号绑定

## 5.1 方案说明

本项目不直接集成各第三方平台（微信、钉钉、飞书等），而是对接标准 OAuth2 协议。第三方账号的聚合由外部 OAuth 平台统一处理，本项目只需配置 `appid` 和 `appkey` 即可接入。

OAuth2 登录后通过标准 userinfo 端点获取：
- 姓名（昵称）
- email（作为用户唯一标识）

---

## 5.2 账号模型

不需要 `user_auth_identities` 表。以 email 作为唯一键，直接关联本地用户：

- 首次 OAuth2 登录：以 email 自动创建本地用户，记录 `login_source = 'oauth2'`。
- 已有相同 email 的本地账号：直接关联登录，无需额外确认。
- `users.password_hash` 允许为空，支持纯 OAuth2 注册用户。

---

## 5.3 登录流程

```
登录页点击 OAuth2 登录
  → 前端请求后端 GET /api/v1/auth/oauth2/start
  → 后端返回授权跳转地址（带 state）
  → 用户在 OAuth2 平台完成授权
  → OAuth2 平台回调后端 GET /api/v1/auth/oauth2/callback
  → 后端通过 userinfo 端点获取 name + email
  → 查找或创建本地用户，签发 JWT
  → 前端 /auth/callback 接收 JWT，进入主界面
```

---

## 5.4 API 设计

```http
GET  /api/v1/auth/oauth2/start       # 返回授权跳转地址
GET  /api/v1/auth/oauth2/callback    # OAuth2 回调，完成登录，签发 JWT
GET  /api/v1/auth/oauth2/config      # 返回是否已配置（前端据此决定是否显示入口）
```

`GET /api/v1/auth/oauth2/config` 响应示例：

```json
{
  "enabled": true,
  "loginButtonLabel": "企业 SSO 登录"
}
```

安全要求：
- 授权请求必须带 `state` 防 CSRF。
- 回调时校验 `state` 一致性。

---

## 5.5 配置方式

通过环境变量或系统配置项注入：

```
OAUTH2_CLIENT_ID=xxx
OAUTH2_CLIENT_SECRET=xxx
OAUTH2_AUTHORIZE_URL=https://sso.example.com/oauth/authorize
OAUTH2_TOKEN_URL=https://sso.example.com/oauth/token
OAUTH2_USERINFO_URL=https://sso.example.com/oauth/userinfo
OAUTH2_SCOPE=openid profile email
OAUTH2_LOGIN_BUTTON_LABEL=企业 SSO 登录
```

未配置 `OAUTH2_CLIENT_ID` 时，登录页不显示 OAuth2 入口。

---

## 六、头像来源与上传策略

## 6.1 头像优先级

统一优先级如下：

1. 用户自定义上传头像
2. gravatar 默认头像（存在 email 时）
3. 本地字母占位头像

---

## 6.2 数据设计

建议在 `users` 表补充以下字段：

```sql
ALTER TABLE users
  ADD COLUMN avatar_source VARCHAR(20) DEFAULT 'system',
  ADD COLUMN avatar_file_id UUID REFERENCES files(id) ON DELETE SET NULL;
```

字段说明：

- `avatar_source`：`custom / gravatar / system`
- `avatar_file_id`：复用文件表，表示用户上传头像

`avatar_url` 仍保留，作为最终可直接展示的头像地址缓存字段。

---

## 6.3 gravatar 规则

前端或后端均可生成 gravatar 地址，建议后端统一生成返回，规则如下：

- 用户存在 email
- 用户未上传自定义头像
- 用户未锁定使用第三方头像

计算方式：

- 对 email 做 `trim + lowercase`
- 对标准化结果计算 MD5
- 拼接 gravatar URL

说明：

- 若用户所在网络无法稳定访问 `gravatar.com`，前端需要在加载失败时降级为本地占位头像。

---

## 七、图标体系与主界面美化

## 7.1 图标策略

建议使用统一图标库，例如 `lucide-vue-next`，原因：

- Vue3 集成简单
- 线性图标风格干净
- 适合任务管理类产品

应用区域：

- 导航：工作区、项目、任务、设置
- 顶栏：用户、退出、通知、主题入口
- 列表项：成员、时间、标签、附件、评论
- 空状态：无任务、无项目、无工作区

---

## 7.2 主界面视觉改造要点

当前主布局的问题：

- 颜色层次少
- 信息区块过于平
- 头部缺少头像与操作聚合

改造方向：

- 侧栏增加品牌区、导航图标、选中态背景层次
- 顶栏增加头像、昵称、快捷设置入口
- 主内容区增加卡片、分组标题、弱背景层次
- 空状态增加图标和简短说明

---

## 八、任务界面改版

## 8.1 页面结构

保留当前“列表/看板 + 详情编辑”的模式，但重构详情区，使其更接近参考图中的正式任务编辑器。

建议结构：

- 左侧：任务看板列
- 右侧：任务详情抽屉/侧栏

详情抽屉字段顺序：

1. 标题
2. 负责人
3. 截止时间
4. 优先级
5. 标签
6. 描述（富文本）
7. 附件
8. 保存 / 删除 / 取消

---

## 8.2 组件拆分建议

把当前大文件 `TaskBoardView.vue` 继续拆为：

- `TaskBoardColumn.vue`
- `TaskCard.vue`
- `TaskDetailDrawer.vue`
- `TaskFieldRow.vue`
- `TaskRichEditor.vue`
- `TaskAttachmentList.vue`

这样可以避免任务页继续膨胀。

---

## 8.3 交互细节

- 任务卡片显示：标题、优先级、负责人头像、截止时间、标签数
- 详情抽屉顶部显示任务状态标签与标题
- 每个属性行左侧显示图标，提升识别效率
- 标签支持彩色胶囊样式
- 附件区展示文件名、大小、上传者、上传时间
- 保存按钮为主按钮，删除按钮为危险按钮

---

## 九、统一富文本输入方案

## 9.1 编辑器选择

优先选型：`Quill`

推荐接入方式：

- 直接集成 `quill`
- 或使用 Vue 封装层，例如 `@vueup/vue-quill`

备选：

- `tinymce-vue`

选型原则：

- 本项目优先选 `Quill`，因为集成轻量、工具栏裁剪简单、适合任务类富文本。
- 若接入验证后发现图片、中文输入法、移动端兼容性或样式隔离问题明显，再切到 `tinymce-vue`。

---

## 9.2 内容存储格式

本期建议后端统一存储 HTML，原因：

- 当前数据库中 `description`、`content` 均为 `TEXT`
- 前端展示与回显成本最低
- 对现有接口改动最小

同时约定：

- 服务端对富文本 HTML 做白名单清洗
- 禁止脚本、内联事件、危险 iframe

工具栏最小集合建议：

- 标题
- 粗体/斜体/下划线
- 有序列表/无序列表
- 引用
- 链接
- 图片
- 代码块
- 分割线

---

## 9.3 组件封装

新增统一组件：

- `frontend/src/components/editor/RichTextEditor.vue`

统一 props：

- `modelValue`
- `placeholder`
- `readonly`
- `toolbarPreset`

统一输出：

- `update:modelValue`
- `blur`
- `focus`

应用策略：

- 所有新增多行输入默认使用该组件
- 现有任务描述首先替换
- 评论、项目描述、工作区描述按页面落地逐步接入

---

## 十、后端接口补充

除现有 `/auth`、`/users/me`、`/files/upload` 外，建议新增：

```http
GET   /api/v1/users/me/preferences
PATCH /api/v1/users/me/preferences
POST  /api/v1/users/me/avatar
DELETE /api/v1/users/me/avatar
GET   /api/v1/auth/oauth2/start
GET   /api/v1/auth/oauth2/callback
GET   /api/v1/auth/oauth2/config
```

`PATCH /users/me/preferences` 请求示例：

```json
{
  "themeColor": "#2F6FED",
  "backgroundImageFileId": "uuid-or-null"
}
```

`GET /users/me` 返回补充字段建议：

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "avatarUrl": "https://...",
    "avatarSource": "custom",
    "preferences": {
      "themeColor": "#2F6FED",
      "backgroundImageUrl": "https://..."
    }
  }
}
```

---

## 十一、落地顺序

推荐实施顺序：

1. 建立主题变量体系与设置页
2. 头像上传与 gravatar 兜底
3. 主界面图标与布局改版
4. 任务页结构重构
5. 富文本组件接入
6. OAuth2 登录接入

原因：

- 前 5 项主要影响前端体验，可快速提升产品观感。
- OAuth2 登录依赖外部平台配置与回调域名，实施周期更长，适合最后并行推进。

---

## 十二、风险与注意事项

- OAuth2 要求提供方必须返回 email；若 userinfo 端点不返回 email，登录流程无法完成，需在接入前确认。
- `gravatar.com` 在部分网络环境下可能不可达，必须有加载失败降级。
- 富文本引入后，后端必须同步增加 HTML 清洗，否则存在 XSS 风险。
- 主题切换后需要验证文本对比度，避免”好看但不可读”。

