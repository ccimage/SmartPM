# SmartPM PrimeVue 引入 & 富文本增强 任务文档

**版本**：v1.0  
**日期**：2026-05-13  
**关联文档**：
- `docs/requirements/primevue-richtext-prd.md`
- `docs/design/08-primevue-richtext.md`

---

## 一、里程碑划分

| 里程碑 | 目标 | 前置依赖 |
|--------|------|---------|
| P1 基础设施 | 安装 PrimeVue，配置主题，接入自动导入 | 无 |
| P2 富文本升级 | RichTextEditor 换用 PrimeVue Editor，代码高亮，图片上传 | P1 |
| P3 控件替换 | TaskBoardView、ProjectListView 控件换 PrimeVue | P1 |

P2 和 P3 可在 P1 完成后并行推进。

---

## 二、P1 基础设施

### P1-1 安装依赖

**执行命令**（在 `frontend/` 目录下）：

```bash
npm install primevue @primevue/themes primeicons
npm install quill-syntax-highlighter highlight.js
npm install --save-dev @primevue/auto-import-resolver
```

完成标准：
- [ ] `package.json` 中出现上述依赖
- [ ] `node_modules/primevue` 存在

---

### P1-2 注册 PrimeVue 插件

**文件**：`frontend/src/main.ts`

改动：
```typescript
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '[data-theme="dark"]',
    }
  }
})
```

完成标准：
- [ ] 应用启动无报错
- [ ] 在任意组件中使用 `<Button label="测试" />` 能正常渲染

---

### P1-3 配置自动导入

**文件**：`frontend/vite.config.ts`

改动：
```typescript
import { PrimeVueResolver } from '@primevue/auto-import-resolver'

Components({
  resolvers: [PrimeVueResolver()],
  dirs: ['src/components'],
  dts: 'src/components.d.ts',
})
```

完成标准：
- [ ] 组件中无需 import 即可使用 `<Button>`、`<InputText>`、`<Select>` 等
- [ ] TypeScript 类型提示正常

---

### P1-4 覆盖 PrimeVue CSS 变量

**文件**：`frontend/src/assets/main.css`（或全局样式入口）

在 `:root` 中添加：
```css
--p-primary-color: var(--color-primary);
--p-primary-contrast-color: #ffffff;
--p-surface-0: var(--color-bg-panel);
--p-surface-border: var(--color-border-default);
--p-text-color: var(--color-text-primary);
--p-text-muted-color: var(--color-text-secondary);
--p-border-radius-md: 8px;
--p-border-radius-lg: 12px;
```

完成标准：
- [ ] PrimeVue Button 主色与现有 `--color-primary` 一致
- [ ] 暗色模式下 PrimeVue 控件背景跟随主题切换

---

## 三、P2 富文本编辑器升级

### P2-1 添加图片上传 API 函数

**文件**：`frontend/src/api/file.ts`（若不存在则新建）

添加：
```typescript
export function uploadImage(file: File): Promise<{ url: string; id: string }> {
  const form = new FormData()
  form.append('file', file)
  return http.post('/files/upload', form)
}
```

完成标准：
- [ ] 函数存在且类型正确
- [ ] 调用后能成功上传并返回 url

---

### P2-2 重写 RichTextEditor.vue

**文件**：`frontend/src/components/common/RichTextEditor.vue`

实现要点：

1. **使用 PrimeVue `<Editor>`**，通过 `onLoad` 回调获取 Quill 实例
2. **代码高亮**：在 `onLoad` 中注册 `quill-syntax-highlighter` 模块，传入 `hljs` 实例（按需注册 10 种语言）
3. **图片上传**：
   - 覆盖 toolbar `image` handler：弹出 `<input type="file">` → 选择后调用 `uploadImage` → 插入 URL
   - 监听 Quill 容器 `paste` 事件：检测 `clipboardData.items` 中 `image/*` 类型 → 调用 `uploadImage` → 插入 URL
   - 监听 Quill 容器 `drop` 事件：读取 `dataTransfer.files` 中图片 → 调用 `uploadImage` → 插入 URL
4. **校验**：文件类型必须为 `image/*`，大小不超过 10MB，否则 `console.warn` 提示（后续可接 Toast）
5. **只读模式**：`readonly` prop 为 true 时，CSS 隐藏 `.ql-toolbar`
6. **工具栏配置**：
   - minimal: `[['bold','italic','underline'],['list','bullet'],['link','code-block','image'],['clean']]`
   - full: `[['bold','italic','underline','strike'],[{header:[1,2,3,false]}],['list','bullet'],['link','blockquote','code-block','image'],['clean']]`

**对外接口不变**（props/emits 与现有一致）。

完成标准：
- [ ] 工具栏有代码块和图片按钮
- [ ] 代码块内容有语法高亮
- [ ] 粘贴图片自动上传并插入
- [ ] 拖放图片自动上传并插入
- [ ] 工具栏图片按钮可选择文件上传
- [ ] 超过 10MB 的图片不上传，有提示
- [ ] `readonly: true` 时工具栏隐藏
- [ ] `v-model` 双向绑定正常（HTML 字符串）
- [ ] TypeScript 编译通过

---

## 四、P3 控件替换

### P3-1 替换 TaskBoardView.vue 中的控件

**文件**：`frontend/src/views/project/TaskBoardView.vue`

替换 modal（`.task-drawer`）内的控件：

| 原控件 | 替换为 | 备注 |
|--------|--------|------|
| `<input class="title-input">` | `<InputText>` | 保持 `v-model`，样式调整为全宽、大字号 |
| `<select v-model="detailForm.status">` | `<Select>` | options 为状态列表，`optionLabel`/`optionValue` |
| `<select v-model="detailForm.priority">` | `<Select>` | options 为优先级列表 |
| `<input type="date">` | `<DatePicker>` | `v-model` 绑定字符串，`dateFormat="yy-mm-dd"` |
| 保存按钮 | `<Button label="保存" />` | severity="primary" |
| 删除按钮 | `<Button label="删除" />` | severity="danger", outlined |
| 关闭按钮 | `<Button icon="pi pi-times" />` | text, rounded |

完成标准：
- [ ] modal 内所有控件使用 PrimeVue 组件
- [ ] 功能与替换前一致（保存、删除、关闭）
- [ ] 样式与整体设计系统协调
- [ ] TypeScript 编译通过

---

### P3-2 替换 ProjectListView.vue 中的控件

**文件**：`frontend/src/views/project/ProjectListView.vue`

替换创建表单中的控件：

| 原控件 | 替换为 | 备注 |
|--------|--------|------|
| `<input v-model="projectName">` | `<InputText>` | placeholder="项目名称" |
| `<input v-model="projectDescription">` | `<InputText>` | placeholder="描述" |
| 创建按钮 `<button type="submit">` | `<Button type="submit">` | severity="primary" |

完成标准：
- [ ] 创建表单使用 PrimeVue 控件
- [ ] 创建项目功能正常
- [ ] TypeScript 编译通过

---

## 五、验收总清单

- [ ] P1：PrimeVue 注册成功，主题颜色与设计系统一致，暗色模式正常
- [ ] P2：富文本支持代码高亮、图片粘贴/拖放/工具栏上传，只读模式正常
- [ ] P3：TaskBoardView 和 ProjectListView 控件替换完成，功能无回归
- [ ] 全局：`npx tsc --noEmit` 无报错
- [ ] 全局：`npm run build` 无报错
