<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { RouterLink, useRouter } from 'vue-router'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const displayName = computed(() => authStore.user?.name ?? authStore.user?.email ?? 'User')

onClickOutside(root, () => {
  open.value = false
})

function handleLogout() {
  open.value = false
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div ref="root" class="user-menu">
    <button class="user-menu-trigger" type="button" @click="open = !open">
      <UserAvatar
        :name="authStore.user?.name"
        :email="authStore.user?.email"
        :avatar-url="authStore.user?.avatarUrl"
        :gravatar-url="authStore.user?.gravatarUrl"
        :size="32"
      />
      <span class="user-name">{{ displayName }}</span>
      <span class="chevron" aria-hidden="true">▾</span>
    </button>

    <Transition name="dropdown">
      <div v-if="open" class="user-dropdown">
        <RouterLink class="menu-item" to="/settings/profile" @click="open = false">
          个人资料
        </RouterLink>
        <RouterLink class="menu-item" to="/settings/appearance" @click="open = false">
          外观设置
        </RouterLink>
        <hr class="menu-divider" />
        <button class="menu-item menu-button" type="button" @click="handleLogout">退出登录</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  min-width: 180px;
  border: 1px solid var(--color-border-default);
  border-radius: 14px;
  background: white;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  padding: 6px;
}

.menu-item {
  display: block;
  width: 100%;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  padding: 9px 14px;
  text-align: left;
  text-decoration: none;
}

.menu-item:hover {
  background: var(--color-primary-soft);
}

.menu-divider {
  border: 0;
  border-top: 1px solid var(--color-border-default);
  margin: 6px;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
