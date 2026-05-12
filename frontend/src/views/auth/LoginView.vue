<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import type { ApiErrorPayload } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const canSubmit = computed(() => email.value.trim() !== '' && password.value !== '')

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorPayload>
  const message = axiosError.response?.data?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  return message ?? 'Login failed. Check your email and password.'
}

async function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await authStore.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/workspaces'
    await router.push(redirect)
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <section class="login-panel">
      <div class="login-heading">
        <p>SmartPM</p>
        <h1>Sign in</h1>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="email" required />
        </label>

        <label>
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" :disabled="!canSubmit || isSubmitting">
          {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p class="login-footer">
        Need an account?
        <RouterLink to="/register">Register</RouterLink>
      </p>
    </section>
  </div>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: var(--app-background-image, none);
  background-size: cover;
  background-position: center;
  position: relative;
  padding: 24px;
}

.login-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--app-background-overlay, rgba(15, 23, 42, 0.34));
  z-index: 0;
}

.login-panel {
  position: relative;
  z-index: 1;
  width: min(100%, 420px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  padding: 32px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.login-heading {
  margin-bottom: 24px;
}

.login-heading p {
  margin: 0 0 8px;
  color: var(--color-primary-text);
  font-weight: 700;
}

.login-heading h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 28px;
}

.login-form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 6px;
  color: var(--color-text-primary);
  font-weight: 600;
}

input {
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.96);
  padding: 10px 12px;
}

input:focus {
  border-color: var(--color-primary);
  outline: 3px solid var(--color-focus-ring);
}

.error-message {
  margin: 0;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px 12px;
  font-size: 14px;
}

button {
  border: 0;
  border-radius: 12px;
  background: var(--color-primary);
  color: #ffffff;
  padding: 11px 14px;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.login-footer {
  margin: 20px 0 0;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
}

.login-footer a {
  color: var(--color-primary-text);
  font-weight: 700;
}
</style>
