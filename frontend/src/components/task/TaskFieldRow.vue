<script setup lang="ts">
defineProps<{
  icon: string
  label?: string
}>()
</script>

<template>
  <div class="field-row">
    <span class="field-icon" aria-hidden="true">
      <i :class="'fa-solid fa-' + icon" />
    </span>
    <span v-if="label" class="field-label">{{ label }}</span>
    <div class="field-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.field-row {
  display: grid;
  grid-template-columns: 24px auto 1fr;
  align-items: start;
  gap: 8px;
}

.field-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  padding-top: 10px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.field-label {
  padding-top: 10px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.field-content {
  min-width: 0;
}
</style>
