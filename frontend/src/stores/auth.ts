import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { TOKEN_STORAGE_KEY } from '@/api/http'
import type { UserProfile } from '@/api/auth'
import { useThemeStore } from './theme'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY))
  const isAuthenticated = computed(() => Boolean(token.value))
  const themeStore = useThemeStore()

  function setSession(nextToken: string, nextUser: UserProfile) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    themeStore.setPreferences(nextUser.preferences)
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password)
    setSession(response.data.token, response.data.user)
  }

  async function register(payload: { email: string; password: string; name: string }) {
    const response = await authApi.register(payload)
    setSession(response.data.token, response.data.user)
  }

  async function fetchMe() {
    if (!token.value) {
      user.value = null
      return null
    }

    const response = await authApi.getMe()
    user.value = response.data
    themeStore.setPreferences(response.data.preferences)
    return response.data
  }

  async function updateProfile(payload: authApi.UpdateMePayload) {
    const response = await authApi.updateMe(payload)
    user.value = response.data
    themeStore.setPreferences(response.data.preferences)
    return response.data
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    fetchMe,
    updateProfile,
  }
})
