import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoginView from '@/views/auth/LoginView.vue'
import RegisterView from '@/views/auth/RegisterView.vue'
import TaskBoardView from '@/views/project/TaskBoardView.vue'
import ProjectListView from '@/views/project/ProjectListView.vue'
import AppearanceSettingsView from '@/views/user/AppearanceSettingsView.vue'
import ChangePasswordView from '@/views/user/ChangePasswordView.vue'
import ProfileSettingsView from '@/views/user/ProfileSettingsView.vue'
import WorkspaceListView from '@/views/workspace/WorkspaceListView.vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/workspaces',
      },
      {
        path: 'workspaces',
        name: 'workspaces',
        component: WorkspaceListView,
      },
      {
        path: 'workspaces/:id',
        name: 'workspace-projects',
        component: ProjectListView,
        props: true,
      },
      {
        path: 'workspaces/:workspaceId/projects/:projectId',
        name: 'project-board',
        component: TaskBoardView,
        props: true,
      },
      {
        path: 'settings/profile',
        name: 'profile-settings',
        component: ProfileSettingsView,
      },
      {
        path: 'settings/appearance',
        name: 'appearance-settings',
        component: AppearanceSettingsView,
      },
      {
        path: 'settings/password',
        name: 'change-password',
        component: ChangePasswordView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/workspaces'
  }

  return true
})

export default router
