<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { PROJECT_ICONS } from '@/constants/project-icons'

withDefaults(
  defineProps<{
    icon?: string
    color?: string
  }>(),
  {
    icon: 'code',
    color: '#4f46e5',
  },
)

const emit = defineEmits<{
  'update:icon': [value: string]
  'update:color': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

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

onClickOutside(rootRef, () => {
  open.value = false
})
</script>

<template>
  <div ref="rootRef" class="project-style-picker">
    <button
      type="button"
      class="style-trigger"
      :style="{ color, background: color + '18', borderColor: color + '66' }"
      @click="open = !open"
    >
      <i :class="'fa-solid fa-' + icon" />
    </button>

    <Transition name="picker-pop">
      <div v-if="open" class="picker-panel">
        <section>
          <p class="section-label">颜色</p>
          <div class="color-row">
            <button
              v-for="c in presetColors"
              :key="c"
              type="button"
              :class="['color-swatch', { active: color === c }]"
              :style="{ background: c }"
              @click="emit('update:color', c)"
            >
              <i v-if="color === c" class="fa-solid fa-check" />
            </button>
          </div>
        </section>

        <hr />

        <section>
          <p class="section-label">图标</p>
          <div class="icon-grid">
            <button
              v-for="iconName in PROJECT_ICONS"
              :key="iconName"
              type="button"
              :class="['icon-button', { active: icon === iconName }]"
              :style="{
                color,
                background: icon === iconName ? color + '18' : undefined,
                borderColor: icon === iconName ? color : undefined,
              }"
              @click="emit('update:icon', iconName)"
            >
              <i :class="'fa-solid fa-' + iconName" />
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.project-style-picker {
  position: relative;
  display: inline-block;
}

.style-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid;
  border-radius: 12px;
  font-size: 18px;
}

.picker-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 200;
  width: 292px;
  background: white;
  border: 1px solid var(--color-border-default);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
  padding: 12px;
}

.section-label {
  margin: 0 0 8px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.color-row {
  display: flex;
  gap: 6px;
}

.color-swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-radius: 50%;
  color: white;
  font-size: 10px;
}

.color-swatch.active {
  border-color: var(--color-text-primary);
}

hr {
  border: 0;
  border-top: 1px solid var(--color-border-default);
  margin: 10px 0;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
}

.icon-button:hover {
  background: var(--color-primary-soft) !important;
  color: var(--color-primary-text) !important;
}

.picker-pop-enter-active,
.picker-pop-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.picker-pop-enter-from,
.picker-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
