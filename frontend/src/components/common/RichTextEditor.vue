<script setup lang="ts">
import { computed, ref } from 'vue'
import Editor from 'primevue/editor'
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
import 'highlight.js/styles/github.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)

// Quill syntax 模块通过 window.hljs 查找，必须挂载
;(window as any).hljs = hljs

const quillInstance = ref<any>(null)

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

const editorModules = computed(() => ({
  syntax: true,  // 使用 window.hljs，已在上方挂载
}))

const toolbar = computed(() =>
  props.readonly ? false : props.toolbarPreset === 'full' ? fullToolbar : minimalToolbar,
)

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
}

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

.is-readonly :deep(.ql-toolbar) {
  display: none;
}

.is-readonly :deep(.ql-container) {
  border-top: 1px solid var(--color-border-default);
  border-radius: 12px;
}
</style>
