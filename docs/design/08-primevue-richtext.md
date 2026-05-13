# SmartPM PrimeVue 引入 & 富文本增强 设计文档

**版本**：v1.0  
**日期**：2026-05-13  
**关联需求**：`docs/requirements/primevue-richtext-prd.md`

---

## 一、技术选型

### 1.1 PrimeVue

| 项目 | 选择 | 理由 |
|------|------|------|
| 版本 | PrimeVue 4.x | 最新稳定版，支持 Vue 3 Composition API |
| 主题 | Aura（Styled 模式） | 开箱即用，支持 CSS 变量覆盖 |
| 图标 | PrimeIcons | 与 PrimeVue 配套，补充 Font Awesome |
| 引入方式 | 按需自动导入（unplugin-vue-components） | 避免全量引入，减小包体积 |

### 1.2 富文本编辑器

| 项目 | 选择 | 理由 |
|------|------|------|
| 编辑器 | PrimeVue `<Editor>`（Quill v2） | 与 PrimeVue 统一，无需额外依赖 |
| 代码高亮 | `quill-syntax-highlighter` + `highlight.js` | Quill v2 官方推荐的语法高亮方案 |
| 图片处理 | 自定义 Quill 模块（paste/drop/toolbar handler） | Quill 原生图片插入为 base64，需替换为上传逻辑 |

---

## 二、PrimeVue 集成架构

### 2.1 安装与注册

```
npm install primevue @primevue/themes primeicons
```

在 `main.ts` 中注册：

```typescript
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '[data-theme="dark"]',  // 跟随现有主题切换
    }
  }
})
```

### 2.2 自动导入配置

`vite.config.ts` 中添加 PrimeVue 解析器：

```typescript
import { PrimeVueResolver } from '@primevue/auto-import-resolver'

Components({
  resolvers: [PrimeVueResolver()],
  dirs: ['src/components'],
  dts: 'src/components.d.ts',
})
```

这样 `<Button>`、`<InputText>`、`<Select>` 等组件无需手动 import，自动按需引入。

### 2.3 主题定制

在 `src/assets/main.css`（或全局样式文件）中覆盖 PrimeVue CSS 变量，使其跟随现有设计系统：

```css
:root {
  --p-primary-color: var(--color-primary);
  --p-primary-contrast-color: #ffffff;
  --p-surface-0: var(--color-bg-panel);
  --p-surface-border: var(--color-border-default);
  --p-text-color: var(--color-text-primary);
  --p-text-muted-color: var(--color-text-secondary);
  --p-border-radius-md: 8px;
  --p-border-radius-lg: 12px;
}
```

---

## 三、富文本编辑器设计

### 3.1 组件结构

```
RichTextEditor.vue
├── <Editor> (PrimeVue，内置 Quill v2)
│   ├── toolbar slot — 自定义工具栏按钮
│   └── Quill 实例
│       ├── quill-syntax-highlighter 模块（代码高亮）
│       └── 自定义 ImageUploadModule（图片上传）
└── 上传状态管理（uploading ref）
```

### 3.2 代码高亮方案

使用 `quill-syntax-highlighter`，在 Quill 初始化时注册：

```typescript
import QuillSyntaxHighlighter from 'quill-syntax-highlighter'
import hljs from 'highlight.js/lib/core'
// 按需注册语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
// ... 其他语言

hljs.registerLanguage('javascript', javascript)
// ...

Quill.register('modules/syntaxHighlighter', QuillSyntaxHighlighter)
```

Quill 配置：
```javascript
modules: {
  syntaxHighlighter: { hljs },
  toolbar: [...],
}
```

### 3.3 图片上传流程

```
用户操作（粘贴/拖放/工具栏）
        ↓
拦截默认行为（阻止 base64 插入）
        ↓
读取 File 对象
        ↓
校验（类型: image/*, 大小: ≤10MB）
        ↓
调用 uploadFile(file) → POST /api/v1/files/upload
        ↓
成功 → 获取 url → quill.insertEmbed(index, 'image', url)
失败 → 显示错误 toast
```

**三种触发方式的拦截点**：

| 触发方式 | 拦截方式 |
|---------|---------|
| 工具栏点击 | 覆盖 toolbar `image` handler，替换为自定义上传逻辑 |
| 粘贴（Ctrl+V） | 监听 Quill `paste` 事件，检测 `clipboardData.items` 中的 image 类型 |
| 拖放 | 监听编辑器 DOM 的 `drop` 事件，读取 `dataTransfer.files` |

### 3.4 上传 API 调用

复用现有 `frontend/src/api/file.ts`（或新增 `uploadImage` 函数）：

```typescript
export function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  return http.post('/files/upload', form)
}
```

后端 `POST /api/v1/files/upload` 返回结构（已有）：
```json
{ "url": "https://storage.example.com/files/xxx.png", "id": "...", ... }
```

### 3.5 只读模式

PrimeVue `<Editor>` 的 `readonly` prop 禁用编辑，但工具栏仍显示。需通过 CSS 隐藏工具栏：

```css
.is-readonly :deep(.ql-toolbar) {
  display: none;
}
.is-readonly :deep(.ql-container) {
  border-top: 1px solid var(--color-border-default);
  border-radius: 12px;
}
```

---

## 四、控件替换范围

### 4.1 全局替换策略

不做全量搜索替换，而是**按页面/组件逐步替换**，优先替换高频使用的页面：

1. `TaskBoardView.vue` — 任务详情 modal（状态 Select、优先级 Select、日期 DatePicker、标题 InputText、保存/删除 Button）
2. `ProjectListView.vue` — 创建项目表单（项目名 InputText、创建 Button）
3. 通用 `RichTextEditor.vue` — 替换为 PrimeVue Editor

### 4.2 样式隔离原则

- PrimeVue 组件使用 Aura 主题的默认样式，通过 CSS 变量覆盖与设计系统对齐
- 不在 PrimeVue 组件上叠加 `scoped` 样式，避免优先级冲突
- 如需微调，使用 `:deep()` 穿透

---

## 五、文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `frontend/package.json` | 修改 | 添加 primevue、@primevue/themes、primeicons、quill-syntax-highlighter、highlight.js |
| `frontend/vite.config.ts` | 修改 | 添加 PrimeVueResolver |
| `frontend/src/main.ts` | 修改 | 注册 PrimeVue 插件 |
| `frontend/src/assets/main.css` | 修改 | 添加 PrimeVue CSS 变量覆盖 |
| `frontend/src/components/common/RichTextEditor.vue` | 重写 | 换用 PrimeVue Editor + 代码高亮 + 图片上传 |
| `frontend/src/api/file.ts` | 修改 | 添加 `uploadImage` 函数 |
| `frontend/src/views/project/TaskBoardView.vue` | 修改 | 替换 modal 内控件为 PrimeVue |
| `frontend/src/views/project/ProjectListView.vue` | 修改 | 替换创建表单控件为 PrimeVue |

---

## 六、风险与注意事项

| 风险 | 说明 | 缓解措施 |
|------|------|---------|
| PrimeVue 样式与现有 CSS 冲突 | Aura 主题有全局 CSS reset | 通过 CSS 变量覆盖，不修改 PrimeVue 内部样式 |
| Quill v2 与 quill-syntax-highlighter 兼容性 | PrimeVue Editor 内置 Quill 版本可能与插件不匹配 | 锁定版本，测试后再升级 |
| 图片上传失败时 Quill 状态 | 上传失败后光标位置可能错乱 | 上传前不插入占位，失败后仅 toast 提示 |
| highlight.js 按需引入 | 需手动注册每种语言 | 注册 10 种常用语言，后续按需添加 |
