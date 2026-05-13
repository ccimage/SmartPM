<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { createTag, listTags, type Tag } from '@/api/task'

const props = defineProps<{
  modelValue: string[]
  projectId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const searchText = ref('')
const newTagName = ref('')
const selectedColor = ref('#64748b')
const allTags = ref<Tag[]>([])
const isCreating = ref(false)

const presetColors = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#0ea5e9',
  '#10b981',
]

const selectedTags = computed(() => {
  const selectedIds = new Set(props.modelValue)
  return allTags.value.filter((tag) => selectedIds.has(tag.id))
})

const filteredTags = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()

  if (!keyword) {
    return allTags.value
  }

  return allTags.value.filter((tag) => tag.name.toLowerCase().includes(keyword))
})

async function loadTags() {
  if (!props.projectId) {
    allTags.value = []
    return
  }

  const response = await listTags(props.projectId)
  allTags.value = response.data
}

function isSelected(tagId: string) {
  return props.modelValue.includes(tagId)
}

function removeTag(tagId: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((id) => id !== tagId),
  )
}

function toggleTag(tagId: string) {
  if (isSelected(tagId)) {
    removeTag(tagId)
    return
  }

  emit('update:modelValue', [...props.modelValue, tagId])
}

async function handleCreateTag() {
  const name = newTagName.value.trim()

  if (!name || isCreating.value) {
    return
  }

  isCreating.value = true

  try {
    const response = await createTag(props.projectId, {
      name,
      color: selectedColor.value,
    })
    allTags.value = [...allTags.value, response.data]
    emit('update:modelValue', [...props.modelValue, response.data.id])
    newTagName.value = ''
    searchText.value = ''
  } finally {
    isCreating.value = false
  }
}

onClickOutside(rootRef, () => {
  open.value = false
})

onMounted(loadTags)
</script>

<template>
  <div ref="rootRef" class="tag-selector">
    <div class="tag-list">
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        class="selected-tag"
        :style="{
          background: (tag.color ?? '#64748b') + '18',
          color: tag.color ?? '#64748b',
        }"
      >
        {{ tag.name }}
        <button type="button" class="remove-tag" :aria-label="`移除 ${tag.name}`" @click="removeTag(tag.id)">
          <i class="fa-solid fa-xmark" />
        </button>
      </span>

      <button type="button" class="tag-trigger" @click="open = !open">+ 标签</button>
    </div>

    <Transition name="tag-pop">
      <div v-if="open" class="tag-panel">
        <input v-model="searchText" class="tag-search" type="text" placeholder="搜索标签..." />

        <div class="tag-options">
          <button
            v-for="tag in filteredTags"
            :key="tag.id"
            type="button"
            class="tag-option"
            @click="toggleTag(tag.id)"
          >
            <span
              class="tag-dot"
              :style="{ background: tag.color ?? '#64748b' }"
              aria-hidden="true"
            ></span>
            <span class="tag-name">{{ tag.name }}</span>
            <i v-if="isSelected(tag.id)" class="fa-solid fa-check" />
          </button>

          <p v-if="filteredTags.length === 0" class="empty-tags">没有匹配标签</p>
        </div>

        <hr />

        <section class="create-section">
          <p class="section-label">新建标签</p>
          <input v-model="newTagName" class="tag-search" type="text" placeholder="标签名称" />

          <div class="color-row">
            <button
              v-for="color in presetColors"
              :key="color"
              type="button"
              :class="['color-swatch', { active: selectedColor === color }]"
              :style="{ background: color }"
              :aria-label="`选择颜色 ${color}`"
              @click="selectedColor = color"
            >
              <i v-if="selectedColor === color" class="fa-solid fa-check" />
            </button>
          </div>

          <button
            type="button"
            class="create-button"
            :disabled="isCreating || !newTagName.trim()"
            @click="handleCreateTag"
          >
            创建
          </button>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tag-selector {
  position: relative;
  min-width: 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  padding: 3px 10px;
}

.remove-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: currentColor;
  font-size: 10px;
  line-height: 1;
  padding: 0;
}

.tag-trigger {
  border: 1px dashed var(--color-border-default);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
}

.tag-trigger:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  min-width: 220px;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
  padding: 10px;
}

.tag-search {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: 13px;
  padding: 8px 10px;
}

.tag-search:focus {
  border-color: var(--color-primary);
  outline: none;
}

.tag-options {
  display: grid;
  gap: 2px;
  max-height: 180px;
  overflow-y: auto;
  padding: 8px 0 2px;
}

.tag-option {
  display: grid;
  grid-template-columns: 10px 1fr 14px;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  padding: 7px 8px;
  text-align: left;
}

.tag-option:hover {
  background: var(--color-primary-soft);
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.tag-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-option .fa-check {
  color: var(--color-primary);
  font-size: 12px;
}

.empty-tags {
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: 8px;
}

hr {
  border: 0;
  border-top: 1px solid var(--color-border-default);
  margin: 10px 0;
}

.create-section {
  display: grid;
  gap: 8px;
}

.section-label {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.color-swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-radius: 50%;
  color: var(--color-bg-panel);
  font-size: 10px;
}

.color-swatch.active {
  border-color: var(--color-text-primary);
}

.create-button {
  border: 0;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-bg-panel);
  font-size: 13px;
  font-weight: 700;
  padding: 8px 10px;
}

.create-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tag-pop-enter-active,
.tag-pop-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.tag-pop-enter-from,
.tag-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
