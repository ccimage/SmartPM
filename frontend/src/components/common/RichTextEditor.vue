<script setup lang="ts">
import { computed } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import '@vueup/vue-quill/dist/vue-quill.bubble.css'

const minimalToolbar = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean'],
]

const fullToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: [1, 2, 3, false] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'blockquote', 'code-block'],
  ['clean'],
]

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

const toolbar = computed(() => (props.toolbarPreset === 'full' ? fullToolbar : minimalToolbar))
const theme = computed(() => (props.readonly ? 'bubble' : 'snow'))
</script>

<template>
  <div class="rich-text-editor" :class="{ 'is-readonly': readonly }">
    <QuillEditor
      :content="modelValue"
      content-type="html"
      :placeholder="placeholder"
      :read-only="readonly"
      :theme="theme"
      :toolbar="readonly ? '' : toolbar"
      @update:content="emit('update:modelValue', String($event ?? ''))"
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

.rich-text-editor.is-readonly :deep(.ql-container) {
  border-radius: 12px;
}
</style>
