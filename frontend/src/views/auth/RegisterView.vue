<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import type { ApiErrorPayload } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const touched = reactive({
  name: false,
  email: false,
  password: false,
  confirmPassword: false,
})
const errorMessage = ref('')
const isSubmitting = ref(false)

const fieldErrors = computed(() => ({
  name: form.name.trim() === '' ? 'Name is required.' : '',
  email:
    form.email.trim() === ''
      ? 'Email is required.'
      : emailPattern.test(form.email.trim())
        ? ''
        : 'Enter a valid email address.',
  password:
    form.password.length === 0
      ? 'Password is required.'
      : form.password.length >= 6
        ? ''
        : 'Password must be at least 6 characters.',
  confirmPassword:
    form.confirmPassword.length === 0
      ? 'Confirm your password.'
      : form.confirmPassword === form.password
        ? ''
        : 'Passwords do not match.',
}))

const canSubmit = computed(() => Object.values(fieldErrors.value).every((message) => message === ''))

function markAllTouched() {
  touched.name = true
  touched.email = true
  touched.password = true
  touched.confirmPassword = true
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorPayload>
  const message = axiosError.response?.data?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  return message ?? 'Registration failed.'
}

async function handleSubmit() {
  markAllTouched()

  if (!canSubmit.value || isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await authStore.register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    await router.push('/workspaces')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel">
      <div class="auth-heading">
        <p>SmartPM</p>
        <h1>Create account</h1>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label>
          <span>Name</span>
          <input
            v-model="form.name"
            type="text"
            autocomplete="name"
            required
            @blur="touched.name = true"
          />
          <small v-if="touched.name && fieldErrors.name">{{ fieldErrors.name }}</small>
        </label>

        <label>
          <span>Email</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            @blur="touched.email = true"
          />
          <small v-if="touched.email && fieldErrors.email">{{ fieldErrors.email }}</small>
        </label>

        <label>
          <span>Password</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            required
            @blur="touched.password = true"
          />
          <small v-if="touched.password && fieldErrors.password">{{ fieldErrors.password }}</small>
        </label>

        <label>
          <span>Confirm password</span>
          <input
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            @blur="touched.confirmPassword = true"
          />
          <small v-if="touched.confirmPassword && fieldErrors.confirmPassword">
            {{ fieldErrors.confirmPassword }}
          </small>
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" :disabled="!canSubmit || isSubmitting">
          {{ isSubmitting ? 'Creating...' : 'Create account' }}
        </button>
      </form>

      <p class="auth-footer">
        Already have an account?
        <RouterLink to="/login">Sign in</RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  background: #f5f7fb;
  padding: 24px;
}

.auth-panel {
  width: min(100%, 420px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 32px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.auth-heading {
  margin-bottom: 24px;
}

.auth-heading p {
  margin: 0 0 8px;
  color: #4f46e5;
  font-weight: 700;
}

.auth-heading h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.auth-form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 6px;
  color: #374151;
  font-weight: 600;
}

input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #111827;
  padding: 10px 12px;
}

input:focus {
  border-color: #4f46e5;
  outline: 3px solid #e0e7ff;
}

small {
  color: #b91c1c;
  font-size: 13px;
  font-weight: 500;
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
  border-radius: 8px;
  background: #4f46e5;
  color: #ffffff;
  padding: 11px 14px;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.auth-footer {
  margin: 20px 0 0;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.auth-footer a {
  color: #4f46e5;
  font-weight: 700;
}
</style>
