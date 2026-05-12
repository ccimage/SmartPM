<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string | null
    email?: string | null
    avatarUrl?: string | null
    gravatarUrl?: string | null
    size?: number
  }>(),
  { size: 36 },
)

const initial = computed(() => {
  const source = props.name?.trim() || props.email?.trim() || 'U'
  return source[0].toUpperCase()
})

const imgSrc = computed(() => props.avatarUrl || props.gravatarUrl || null)
const showImg = ref(!!imgSrc.value)

watch(
  imgSrc,
  (value) => {
    showImg.value = !!value
  },
  { immediate: true },
)

function onError() {
  showImg.value = false
}
</script>

<template>
  <div
    class="user-avatar"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.38)}px`,
    }"
  >
    <img v-if="showImg" :src="imgSrc ?? ''" :alt="name || email || 'User'" @error="onError" />
    <span v-else>{{ initial }}</span>
  </div>
</template>

<style scoped>
.user-avatar {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  font-weight: 700;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
