<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { getProject } from '@/api/project'
import { getWorkspace } from '@/api/workspace'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

const displayName = computed(() => authStore.user?.name ?? authStore.user?.email ?? 'User')
const workspaceId = computed(() => {
  const id = route.params.workspaceId ?? route.params.id
  return typeof id === 'string' ? id : ''
})
const projectId = computed(() => {
  const id = route.params.projectId
  return typeof id === 'string' ? id : ''
})
const headerEyebrow = computed(() => {
  if (appStore.currentWorkspace?.name && appStore.currentProject?.name) {
    return `${appStore.currentWorkspace.name} / ${appStore.currentProject.name}`
  }

  if (appStore.currentWorkspace?.name) {
    return appStore.currentWorkspace.name
  }

  return 'Project workspace'
})
const headerTitle = computed(() => {
  if (appStore.currentProject?.name) {
    return appStore.currentProject.name
  }

  if (route.name === 'workspaces') {
    return 'Workspaces'
  }

  if (route.name === 'workspace-projects') {
    return 'Projects'
  }

  return 'Dashboard'
})

onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchMe()
  }
})

watch(
  workspaceId,
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
  projectId,
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

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">SmartPM</div>
      <nav class="nav">
        <RouterLink to="/workspaces" class="nav-link">Workspaces</RouterLink>
        <RouterLink
          v-if="workspaceId"
          :to="`/workspaces/${workspaceId}`"
          class="nav-link"
        >
          {{ appStore.currentWorkspace?.name ?? 'Workspace' }}
        </RouterLink>
        <RouterLink
          v-if="workspaceId && projectId"
          :to="`/workspaces/${workspaceId}/projects/${projectId}`"
          class="nav-link sub-link"
        >
          {{ appStore.currentProject?.name ?? 'Project board' }}
        </RouterLink>
      </nav>
    </aside>

    <div class="content-shell">
      <header class="header">
        <div>
          <p class="eyebrow">{{ headerEyebrow }}</p>
          <h1>{{ headerTitle }}</h1>
        </div>

        <div class="user-actions">
          <span class="user-name">{{ displayName }}</span>
          <RouterLink class="secondary-button" to="/settings/password">Change password</RouterLink>
          <button class="secondary-button" type="button" @click="handleLogout">Logout</button>
        </div>
      </header>

      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 240px 1fr;
}

.sidebar {
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 24px 18px;
}

.brand {
  margin-bottom: 28px;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.nav {
  display: grid;
  gap: 8px;
}

.nav-link {
  border-radius: 8px;
  color: #4b5563;
  padding: 10px 12px;
  font-weight: 600;
}

.nav-link.router-link-active {
  background: #eef2ff;
  color: #3730a3;
}

.sub-link {
  padding-left: 24px;
}

.content-shell {
  min-width: 0;
}

.header {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 16px 28px;
}

.eyebrow {
  margin: 0 0 2px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-name {
  color: #374151;
  font-weight: 600;
}

.secondary-button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  padding: 8px 12px;
}

.main-content {
  padding: 28px;
}

@media (max-width: 760px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
    padding: 14px 18px;
  }

  .brand {
    margin: 0;
  }

  .header {
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
  }

  .user-actions {
    align-items: flex-end;
    flex-direction: column;
    gap: 8px;
  }

  .main-content {
    padding: 18px;
  }
}
</style>
