<script setup lang="ts">
import { computed } from 'vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const props = withDefaults(
  defineProps<{
    open?: boolean
  }>(),
  {
    open: false,
  },
)
const emit = defineEmits<{
  toggleMenu: []
}>()

const displayName = computed(() => authStore.user?.name ?? authStore.user?.email ?? 'User')
</script>

<template>
  <div class="user-menu">
    <button
      class="user-menu-trigger"
      type="button"
      :aria-expanded="props.open"
      aria-haspopup="menu"
      @click="emit('toggleMenu')"
    >
      <UserAvatar
        :name="authStore.user?.name"
        :email="authStore.user?.email"
        :avatar-url="authStore.user?.avatarUrl"
        :gravatar-url="authStore.user?.gravatarUrl"
        :size="32"
      />
      <span class="user-name">{{ displayName }}</span>
      <span class="chevron" :class="{ 'is-open': props.open }" aria-hidden="true">▾</span>
    </button>
  </div>
</template>

<style scoped>
.user-menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.user-name {
  color: var(--color-text-primary);
  font-weight: 600;
}

.chevron {
  color: var(--color-text-secondary);
  font-size: 12px;
  transition: transform 150ms ease;
}

.chevron.is-open {
  transform: rotate(180deg);
}
</style>
