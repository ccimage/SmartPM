# SmartPM PrimeVue 组件库引入 & 富文本增强 需求文档

**版本**：v1.0  
**日期**：2026-05-13  
**范围**：引入 PrimeVue 组件库、全局替换基础控件、富文本编辑器升级（代码高亮、图片上传）

---

## 一、背景与目标

当前前端使用原生 HTML 控件（`<button>`、`<input>`、`<select>`）加手写 CSS，维护成本高、风格不统一。富文本编辑器（Quill）缺少代码高亮和图片功能，无法满足技术团队的使用需求。

本轮目标：
- 引入 PrimeVue 作为统一 UI 组件库，替换全局基础控件。
- 升级富文本编辑器，支持代码高亮、图片粘贴/拖放、图片自动上传到服务器。

---

## 二、详细需求

### 2.1 引入 PrimeVue 组件库

**范围**：全局基础控件替换

需要替换的控件类型：

| 原控件 | PrimeVue 替换 | 使用场景 |
|--------|--------------|---------|
| `<button>` | `<Button>` | 所有操作按钮（主要、次要、危险） |
| `<input type="text">` | `<InputText>` | 文本输入框 |
| `<input type="date">` | `<DatePicker>` | 日期选择 |
| `<select>` | `<Select>` | 下拉选择（状态、优先级等） |
| `<textarea>` | `<Textarea>` | 多行文本 |

**主题要求**：
- 使用 PrimeVue Aura 主题，配置为 `unstyled: false`
- 主色调跟随现有 CSS 变量 `--color-primary`（`#4f46e5`）
- 支持暗色模式（跟随现有主题切换机制）

**不替换的控件**：
- 自定义浮层组件（ProjectStylePicker、TagSelector 等）保持现有实现
- 面包屑、用户菜单等已有良好实现的组件保持不变

---

### 2.2 富文本编辑器升级

**替换方案**：使用 PrimeVue 内置的 `<Editor>` 组件（基于 Quill v2）

**必须支持的功能**：

#### 2.2.1 代码功能
- 工具栏有"代码块"按钮，插入 `<pre><code>` 块
- 代码块内容使用 `highlight.js` 进行语法高亮
- 支持常见语言：JavaScript、TypeScript、Python、Java、Go、Bash、JSON、HTML、CSS

#### 2.2.2 图片功能
- **粘贴图片**：Ctrl+V 粘贴剪贴板中的图片，自动上传并插入
- **拖放图片**：将图片文件拖入编辑器区域，自动上传并插入
- **工具栏插入**：点击工具栏图片按钮，弹出文件选择框，选择后上传并插入
- 上传接口：`POST /api/v1/files/upload`（multipart/form-data，字段名 `file`）
- 上传成功后将返回的文件 URL 插入编辑器
- 上传中显示加载占位（可选：显示进度或 loading 状态）
- 上传失败显示错误提示

#### 2.2.3 工具栏配置
最小工具栏（`toolbarPreset: 'minimal'`）：
```
加粗 | 斜体 | 下划线 | 有序列表 | 无序列表 | 链接 | 代码块 | 图片 | 清除格式
```

完整工具栏（`toolbarPreset: 'full'`）：
```
加粗 | 斜体 | 下划线 | 删除线 | 标题(H1/H2/H3) | 有序列表 | 无序列表 | 链接 | 引用 | 代码块 | 图片 | 清除格式
```

#### 2.2.4 只读模式
- `readonly: true` 时隐藏工具栏，内容区不可编辑
- 代码块仍然渲染高亮

---

### 2.3 组件接口保持不变

`RichTextEditor.vue` 对外接口不变：

```typescript
props: {
  modelValue?: string       // HTML 字符串
  placeholder?: string
  readonly?: boolean
  toolbarPreset?: 'full' | 'minimal'
}
emits: {
  'update:modelValue': [value: string]
}
```

调用方（`TaskBoardView.vue` 等）无需修改。

---

## 三、非功能需求

- **包体积**：highlight.js 按需引入语言包，不引入全量包（全量 ~1MB）
- **图片大小限制**：单张图片不超过 10MB，超出时提示用户
- **图片格式**：支持 PNG、JPG、GIF、WebP
- **上传安全**：使用现有 JWT Bearer Token 认证（Axios 拦截器已处理）

---

## 四、不在本轮范围内

- 富文本内容的服务端渲染/预览
- 视频嵌入
- 表格插入
- 协同编辑
