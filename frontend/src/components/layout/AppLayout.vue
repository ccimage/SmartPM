<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { RouterView, useRoute } from 'vue-router'
import { getProject } from '@/api/project'
import { getWorkspace } from '@/api/workspace'
import BreadcrumbNav from '@/components/layout/BreadcrumbNav.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'


const authStore = useAuthStore()
const appStore = useAppStore()
const route = useRoute()
const menuRoot = ref<HTMLElement | null>(null)

function getParamValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

const open = ref(false)
const router = useRouter()

function toggleUserMenu() {
  open.value = !open.value
}

onClickOutside(menuRoot, () => {
  open.value = false
})

function handleLogout() {
  open.value = false
  authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchMe()
  }
})

watch(
  () => getParamValue(route.params.workspaceId ?? route.params.id),
  async (id) => {
    if (!id) {
      appStore.setCurrentWorkspace(null)
      return
    }

    if (appStore.currentWorkspace?.id === id) {
      return
    }

    try {
      const response = await getWorkspace(id)
      appStore.setCurrentWorkspace(response.data)
    } catch {
      appStore.setCurrentWorkspace(null)
    }
  },
  { immediate: true },
)

watch(
  () => getParamValue(route.params.projectId),
  async (id) => {
    if (!id) {
      appStore.setCurrentProject(null)
      return
    }

    if (appStore.currentProject?.id === id) {
      return
    }

    try {
      const response = await getProject(id)
      appStore.setCurrentProject(response.data)
    } catch {
      appStore.setCurrentProject(null)
    }
  },
  { immediate: true },
)

</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">SmartPM</span>
      </div>
      <div ref="menuRoot" class="user-menu-shell">
        <UserMenu :open="open" @toggle-menu="toggleUserMenu" />
      </div>
    </header>
    <main class="page-content">
      <BreadcrumbNav class="page-breadcrumb" />
      <RouterView />
    </main>
    <div>
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
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background-image: var(--app-background-image, none);
  background-size: cover;
  background-position: center;
  position: relative;
}

.app-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--app-background-overlay, rgba(15, 23, 42, 0.34));
  pointer-events: none;
  z-index: 0;
}

.topbar {
  position: relative;
  z-index: 0;
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
  padding: 0 28px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 700;
}

.brand-mark {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--color-primary);
}

.breadcrumb-area {
  flex: 1;
  display: flex;
  justify-content: center;
}

.page-breadcrumb {
  margin-bottom: 16px;
}

.page-content {
  position: relative;
  z-index: 1;
  padding: 28px;
}

@media (max-width: 760px) {
  .topbar {
    height: auto;
    flex-direction: column;
    gap: 12px;
    padding: 14px 18px;
  }

  .page-content {
    padding: 18px;
  }
}
</style>
<style scoped>
.user-menu-shell {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.user-dropdown {
  position: absolute;
  top: 60px;
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
