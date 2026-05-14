<script setup lang="ts">
import { computed, createApp, defineComponent, h, onUnmounted, ref } from 'vue'
import type { App } from 'vue'
import Editor from 'primevue/editor'
import Select from 'primevue/select'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import { uploadImage } from '@/api/file'
import 'highlight.js/styles/tokyo-night-dark.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)

const hljsProxy = {
  ...hljs,
  highlight(code: string, options: any) {
    const lang = typeof options === 'object' ? options.language : options
    if (!lang || lang === 'plain') {
      return hljs.highlightAuto(code)
    }
    try {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true })
    } catch {
      return hljs.highlightAuto(code)
    }
  },
}

const quillInstance = ref<any>(null)
const mountedApps: App[] = []
let domObserver: MutationObserver | null = null

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    readonly?: boolean
    toolbarPreset?: 'full' | 'minimal'
  }>(),
  {
    modelValue: '',
    readonly: false,
    toolbarPreset: 'minimal',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const minimalToolbar = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'code-block', 'image'],
  ['clean'],
]

const fullToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: [1, 2, 3, false] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'blockquote', 'code-block', 'image'],
  ['clean'],
]

const languageOptions = [
  { key: 'plain', label: 'Plain' },
  { key: 'bash', label: 'Bash' },
  { key: 'css', label: 'CSS' },
  { key: 'go', label: 'Go' },
  { key: 'java', label: 'Java' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'json', label: 'JSON' },
  { key: 'python', label: 'Python' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'xml', label: 'HTML/XML' },
]

const editorModules = computed(() => ({
  syntax: {
    hljs: hljsProxy,
    languages: languageOptions,
  },
}))

const toolbar = computed(() =>
  props.readonly ? false : props.toolbarPreset === 'full' ? fullToolbar : minimalToolbar,
)

function syncCodeBlockTheme(root: ParentNode) {
  root.querySelectorAll('pre.ql-code-block').forEach((el) => {
    el.classList.add('hljs')
  })
}

function mountLanguageSelect(container: HTMLElement) {
  const nativeSelect = container.querySelector('select.ql-language') as HTMLSelectElement | null
  if (!nativeSelect || nativeSelect.dataset.replaced) return
  const selectEl = nativeSelect

  selectEl.dataset.replaced = '1'
  selectEl.style.display = 'none'

  const wrapper = document.createElement('div')
  wrapper.className = 'ql-language-vue'
  selectEl.parentElement?.appendChild(wrapper)

  const currentLang = ref(selectEl.value || 'plain')
  let suppressSync = false

  selectEl.addEventListener('change', () => {
    if (!suppressSync) currentLang.value = selectEl.value || 'plain'
  })

  const SelectApp = defineComponent({
    setup() {
      function onChange(val: string) {
        currentLang.value = val
        selectEl.value = val
        suppressSync = true
        selectEl.dispatchEvent(new Event('change', { bubbles: true }))
        suppressSync = false
      }
      return () =>
        h(Select, {
          modelValue: currentLang.value,
          options: languageOptions,
          optionLabel: 'label',
          optionValue: 'key',
          'onUpdate:modelValue': onChange,
        })
    },
  })

  const app = createApp(SelectApp)
  app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: 'none' } } })
  app.mount(wrapper)
  mountedApps.push(app)
}

function handleLoad(event: { instance: any }) {
  quillInstance.value = event.instance

  const tb = event.instance.getModule('toolbar')
  if (tb) {
    tb.addHandler('image', () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) handleImageFile(file)
      }
      input.click()
    })
  }

  event.instance.root.addEventListener('paste', (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) handleImageFile(file)
        break
      }
    }
  })

  event.instance.root.addEventListener('drop', (e: DragEvent) => {
    const files = e.dataTransfer?.files
    if (!files?.length) return
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        e.preventDefault()
        handleImageFile(file)
        break
      }
    }
  })

  if (!props.readonly) {
    const editorRoot = event.instance.root as HTMLElement
    const processContainers = () => {
      syncCodeBlockTheme(editorRoot)
      editorRoot.querySelectorAll('.ql-code-block-container').forEach((el) => {
        mountLanguageSelect(el as HTMLElement)
      })
    }
    processContainers()
    domObserver?.disconnect()
    domObserver = new MutationObserver(processContainers)
    domObserver.observe(editorRoot, { childList: true, subtree: true })
  }
}

onUnmounted(() => {
  mountedApps.forEach((app) => app.unmount())
  domObserver?.disconnect()
  domObserver = null
})

async function handleImageFile(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    console.warn('图片超过 10MB 限制')
    return
  }
  try {
    const result = await uploadImage(file)
    const quill = quillInstance.value
    if (!quill) return
    const index = quill.getSelection(true)?.index ?? quill.getLength()
    quill.insertEmbed(index, 'image', result.url)
  } catch (err) {
    console.error('图片上传失败', err)
  }
}
</script>

<template>
  <div class="rich-text-editor" :class="{ 'is-readonly': readonly }">
    <Editor
      :model-value="modelValue"
      :modules="editorModules"
      :toolbar="toolbar"
      :placeholder="placeholder ?? ''"
      :readonly="readonly"
      @update:model-value="emit('update:modelValue', $event ?? '')"
      @load="handleLoad"
    />
  </div>
</template>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
}

.rich-text-editor :deep(.ql-toolbar) {
  border: 0;
  border-bottom: 1px solid var(--color-border-default);
  border-radius: 12px 12px 0 0;
  background: var(--color-bg-panel);
}

.rich-text-editor :deep(.ql-container) {
  min-height: 120px;
  border: 0;
  border-radius: 0 0 12px 12px;
  color: var(--color-text-primary);
  font-family: inherit;
}

.rich-text-editor :deep(.ql-editor) {
  min-height: 120px;
}

.rich-text-editor :deep(.p-editor-container) {
  border: none;
}

/* 代码块：补齐 .hljs class 后，让 highlight.js 的 vs2015 主题接管配色 */
.rich-text-editor :deep(.ql-editor .ql-code-block-container) {
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
  margin: 4px 0;
  overflow: hidden;
}

.rich-text-editor :deep(.ql-editor .ql-code-block-container pre.ql-code-block) {
  padding: 12px 16px;
  margin: 0;
  font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.rich-text-editor :deep(.ql-editor .ql-code-block-container pre.ql-code-block.hljs) {
  background: #1e1e1e;
  color: #dcdcdc;
}

/* 隐藏原生 select，由 Vue 挂载的 PrimeVue Select 替代 */
.rich-text-editor :deep(.ql-ui select.ql-language) {
  display: none;
}

.rich-text-editor :deep(.ql-language-vue) {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
}

.rich-text-editor :deep(.ql-language-vue .p-select) {
  height: 24px;
  min-width: 110px;
  font-size: 12px;
  border-radius: 4px;
}

.rich-text-editor :deep(.ql-language-vue .p-select-label) {
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
}

.is-readonly :deep(.ql-toolbar) {
  display: none;
}

.is-readonly :deep(.ql-ui) {
  display: none;
}

.is-readonly :deep(.ql-container) {
  border-top: 1px solid var(--color-border-default);
  border-radius: 12px;
}
</style>
