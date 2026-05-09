<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import { changePassword } from '@/api/auth'
import type { ApiErrorPayload } from '@/api/http'

const router = useRouter()

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})
const touched = reactive({
  oldPassword: false,
  newPassword: false,
  confirmNewPassword: false,
})
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

const fieldErrors = computed(() => ({
  oldPassword: form.oldPassword.length === 0 ? 'Current password is required.' : '',
  newPassword:
    form.newPassword.length === 0
      ? 'New password is required.'
      : form.newPassword.length >= 6
        ? ''
        : 'New password must be at least 6 characters.',
  confirmNewPassword:
    form.confirmNewPassword.length === 0
      ? 'Confirm your new password.'
      : form.confirmNewPassword === form.newPassword
        ? ''
        : 'Passwords do not match.',
}))

const canSubmit = computed(() => Object.values(fieldErrors.value).every((message) => message === ''))

function markAllTouched() {
  touched.oldPassword = true
  touched.newPassword = true
  touched.confirmNewPassword = true
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorPayload>
  const message = axiosError.response?.data?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  return message ?? 'Unable to change password.'
}

async function handleSubmit() {
  markAllTouched()

  if (!canSubmit.value || isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    await changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    })
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmNewPassword = ''
    successMessage.value = 'Password changed successfully.'
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <section class="settings-page">
    <div class="settings-header">
      <div>
        <h2>Change password</h2>
        <p>Update the password used to sign in to SmartPM.</p>
      </div>
      <button class="secondary-button" type="button" @click="goBack">Back</button>
    </div>

    <form class="password-form" @submit.prevent="handleSubmit">
      <label>
        <span>Current password</span>
        <input
          v-model="form.oldPassword"
          type="password"
          autocomplete="current-password"
          required
          @blur="touched.oldPassword = true"
        />
        <small v-if="touched.oldPassword && fieldErrors.oldPassword">
          {{ fieldErrors.oldPassword }}
        </small>
      </label>

      <label>
        <span>New password</span>
        <input
          v-model="form.newPassword"
          type="password"
          autocomplete="new-password"
          required
          @blur="touched.newPassword = true"
        />
        <small v-if="touched.newPassword && fieldErrors.newPassword">
          {{ fieldErrors.newPassword }}
        </small>
      </label>

      <label>
        <span>Confirm new password</span>
        <input
          v-model="form.confirmNewPassword"
          type="password"
          autocomplete="new-password"
          required
          @blur="touched.confirmNewPassword = true"
        />
        <small v-if="touched.confirmNewPassword && fieldErrors.confirmNewPassword">
          {{ fieldErrors.confirmNewPassword }}
        </small>
      </label>

      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <button type="submit" :disabled="!canSubmit || isSubmitting">
        {{ isSubmitting ? 'Saving...' : 'Save password' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 20px;
  max-width: 520px;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.settings-header h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.settings-header p {
  margin: 4px 0 0;
  color: #6b7280;
}

.password-form {
  display: grid;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 24px;
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

.error-message,
.success-message {
  margin: 0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}

.error-message {
  background: #fef2f2;
  color: #b91c1c;
}

.success-message {
  background: #ecfdf5;
  color: #047857;
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

.secondary-button {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  padding: 8px 12px;
}

@media (max-width: 640px) {
  .settings-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
