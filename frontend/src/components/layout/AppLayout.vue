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
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>SmartPM</span>
      </div>
      <nav class="nav">
        <RouterLink to="/workspaces" class="nav-link">
          <span class="nav-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
            </svg>
          </span>
          <span>Workspaces</span>
        </RouterLink>
        <RouterLink
          v-if="workspaceId"
          :to="`/workspaces/${workspaceId}`"
          class="nav-link"
        >
          <span class="nav-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M1 4.5A1.5 1.5 0 0 1 2.5 3h3.086a1.5 1.5 0 0 1 1.06.44l.915.914A1.5 1.5 0 0 0 8.62 5H13.5A1.5 1.5 0 0 1 15 6.5v6A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5v-8Z"
                fill="currentColor"
                opacity=".9"
              />
            </svg>
          </span>
          {{ appStore.currentWorkspace?.name ?? 'Workspace' }}
        </RouterLink>
        <RouterLink
          v-if="workspaceId && projectId"
          :to="`/workspaces/${workspaceId}/projects/${projectId}`"
          class="nav-link sub-link"
        >
          <span class="nav-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="4" height="10" rx="1.5" fill="currentColor" />
              <rect x="6" y="3" width="4" height="7" rx="1.5" fill="currentColor" />
              <rect x="11" y="3" width="4" height="5" rx="1.5" fill="currentColor" />
            </svg>
          </span>
          {{ appStore.currentProject?.name ?? 'Project board' }}
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <button class="sidebar-logout" type="button" @click="handleLogout">
          <span class="nav-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M11 11l3-3-3-3M14 8H6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span>Logout</span>
        </button>
      </div>
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 5.5A2.5 2.5 0 1 1 8 10.5A2.5 2.5 0 0 1 8 5.5Z"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M6.11 1.87 5.45 3.33a6.2 6.2 0 0 0-1.45.85l-1.5-.12-.98 2.9 1.17.98a6.1 6.1 0 0 0 0 1.94l-1.17.98.98 2.9 1.5-.12c.44.34.93.63 1.45.85l.66 1.46h3.78l.66-1.46c.52-.22 1.01-.51 1.45-.85l1.5.12.98-2.9-1.17-.98c.07-.32.11-.64.11-.97s-.04-.65-.11-.97l1.17-.98-.98-2.9-1.5.12a6.2 6.2 0 0 0-1.45-.85l-.66-1.46H6.11Z"
                stroke="currentColor"
                stroke-width="1.1"
                stroke-linejoin="round"
              />
            </svg>
          </RouterLink>
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
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  padding: 24px 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
}

.brand-mark {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--color-primary);
}

.nav {
  flex: 1;
  display: grid;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  color: var(--color-text-secondary);
  padding: 10px 12px;
  font-weight: 600;
  text-decoration: none;
}

.nav-link.router-link-active {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.nav-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.sub-link {
  padding-left: 24px;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
}

.sidebar-logout {
  display: inline-flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-secondary);
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
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
  line-height: 0;
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
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    min-height: auto;
    padding: 14px 18px;
  }

  .brand {
    margin: 0;
  }

  .nav {
    margin-top: 14px;
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
