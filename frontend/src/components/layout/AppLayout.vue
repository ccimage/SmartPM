<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { getProject } from '@/api/project'
import { getWorkspace } from '@/api/workspace'
import UserAvatar from '@/components/common/UserAvatar.vue'
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

    <div class="main-area">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ headerEyebrow }}</p>
          <h1>{{ headerTitle }}</h1>
        </div>

        <div class="user-actions">
          <RouterLink class="profile-chip" to="/settings/profile">
            <UserAvatar
              :name="authStore.user?.name"
              :email="authStore.user?.email"
              :avatar-url="authStore.user?.avatarUrl"
              :gravatar-url="authStore.user?.gravatarUrl"
              :size="32"
            />
            <span class="user-name">{{ displayName }}</span>
          </RouterLink>
          <RouterLink
            class="settings-icon-button"
            to="/settings/appearance"
            aria-label="Appearance settings"
            title="Appearance settings"
          >
            ⚙
          </RouterLink>
          <RouterLink class="secondary-button" to="/settings/password">Change password</RouterLink>
          <button class="secondary-button" type="button" @click="handleLogout">Logout</button>
        </div>
      </header>

      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
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

.sidebar {
  position: relative;
  z-index: 1;
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
  padding: 24px 18px;
}

.brand {
  margin-bottom: 28px;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
}

.nav {
  display: grid;
  gap: 8px;
}

.nav-link {
  border-radius: 12px;
  color: var(--color-text-secondary);
  padding: 10px 12px;
  font-weight: 600;
}

.nav-link.router-link-active {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.sub-link {
  padding-left: 24px;
}

.main-area {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.topbar {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(18px);
  padding: 16px 28px;
}

.eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 22px;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.settings-icon-button {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-text-primary);
  font-size: 18px;
  line-height: 1;
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
}

.user-name {
  color: var(--color-text-primary);
  font-weight: 600;
}

.secondary-button {
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-text-primary);
  padding: 8px 12px;
}

.page-content {
  padding: 28px;
}

@media (max-width: 760px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    padding: 14px 18px;
  }

  .brand {
    margin: 0;
  }

  .topbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
  }

  .user-actions {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .page-content {
    padding: 18px;
  }
}
</style>
