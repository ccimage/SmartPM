<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { getProject } from '@/api/project'
import { getWorkspace } from '@/api/workspace'
import BreadcrumbNav from '@/components/layout/BreadcrumbNav.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const appStore = useAppStore()
const route = useRoute()

function getParamValue(value: unknown) {
  return typeof value === 'string' ? value : ''
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
      <BreadcrumbNav class="breadcrumb-area" />
      <UserMenu />
    </header>
    <main class="page-content">
      <RouterView />
    </main>
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
  z-index: 1;
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
