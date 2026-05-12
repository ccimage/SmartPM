<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
  }>(),
  {
    modelValue: '#4f46e5',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

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
</script>

<template>
  <div class="color-picker">
    <div class="preset-colors">
      <button
        v-for="c in presetColors"
        :key="c"
        type="button"
        :class="['color-swatch', { active: modelValue === c }]"
        :style="{ background: c }"
        @click="emit('update:modelValue', c)"
      >
        <i v-if="modelValue === c" class="fa-solid fa-check" />
      </button>
    </div>
    <div class="custom-row">
      <label>自定义</label>
      <input
        type="color"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <input
        type="text"
        :value="modelValue"
        placeholder="#4f46e5"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.color-swatch.active {
  border-color: var(--color-text-primary);
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

input[type='color'] {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
}

input[type='text'] {
  width: 90px;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-bg-panel);
}
</style>
