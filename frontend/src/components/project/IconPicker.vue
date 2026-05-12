<script setup lang="ts">
import { PROJECT_ICONS } from '@/constants/project-icons'

withDefaults(
  defineProps<{
    modelValue?: string
  }>(),
  {
    modelValue: 'code',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="icon-picker-grid">
    <button
      v-for="icon in PROJECT_ICONS"
      :key="icon"
      type="button"
      :class="['icon-btn', { active: modelValue === icon }]"
      @click="emit('update:modelValue', icon)"
    >
      <i :class="'fa-solid fa-' + icon" />
    </button>
  </div>
</template>

<style scoped>
.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  padding: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 16px;
}

.icon-btn:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.icon-btn.active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary-text);
}
</style>
