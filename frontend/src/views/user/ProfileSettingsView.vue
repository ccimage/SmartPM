<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import type { ApiErrorPayload } from '@/api/http'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { uploadFile } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const avatarInput = ref<HTMLInputElement | null>(null)
const user = computed(() => authStore.user)
const successMessage = ref('')
const errorMessage = ref('')
const isSaving = ref(false)
const isUploading = ref(false)

const form = reactive({
  name: '',
  email: '',
  avatarUrl: null as string | null,
  gravatarUrl: null as string | null,
  createdAt: '',
})

const joinedAt = computed(() => {
  if (!form.createdAt) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(form.createdAt))
})

function syncFromUser() {
  form.name = user.value?.name ?? ''
  form.email = user.value?.email ?? ''
  form.avatarUrl = user.value?.avatarUrl ?? null
  form.gravatarUrl = user.value?.gravatarUrl ?? null
  form.createdAt = user.value?.createdAt ?? ''
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorPayload>
  const message = axiosError.response?.data?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  return message ?? 'Unable to update profile.'
}

function openAvatarPicker() {
  avatarInput.value?.click()
}

async function handleAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isUploading.value = true

  try {
    const uploadResponse = await uploadFile(file)
    await authStore.updateProfile({ avatarUrl: uploadResponse.data.url })
    successMessage.value = 'Avatar updated.'
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

async function handleRemoveAvatar() {
  if (!form.avatarUrl || isSaving.value || isUploading.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSaving.value = true

  try {
    await authStore.updateProfile({ avatarUrl: null })
    successMessage.value = 'Avatar removed.'
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}

async function handleSubmit() {
  const name = form.name.trim()

  if (!name) {
    errorMessage.value = 'Name is required.'
    successMessage.value = ''
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSaving.value = true

  try {
    await authStore.updateProfile({ name })
    successMessage.value = 'Profile updated.'
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.back()
}

watch(user, syncFromUser, { immediate: true })
</script>

<template>
  <section class="settings-page">
    <div class="settings-header">
      <div>
        <h2>Profile</h2>
        <p>Update your display name, avatar, and account details used across SmartPM.</p>
      </div>
      <button class="secondary-button" type="button" @click="goBack">Back</button>
    </div>

    <div class="profile-layout">
      <form class="settings-card profile-form" @submit.prevent="handleSubmit">
        <div class="profile-hero">
          <UserAvatar
            :name="form.name"
            :email="form.email"
            :avatar-url="form.avatarUrl"
            :gravatar-url="user?.gravatarUrl"
            :size="96"
            style="border-radius: 28px"
          />

          <div class="profile-summary">
            <p class="eyebrow">Account</p>
            <h3>{{ form.name || 'Unnamed user' }}</h3>
            <p>{{ form.email || 'No email' }}</p>
            <small>Member since {{ joinedAt }}</small>
          </div>

          <div class="avatar-actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="isUploading"
              @click="openAvatarPicker"
            >
              {{ isUploading ? 'Uploading...' : 'Upload avatar' }}
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="!form.avatarUrl || isSaving || isUploading"
              @click="handleRemoveAvatar"
            >
              Remove avatar
            </button>
            <input
              ref="avatarInput"
              class="hidden-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="handleAvatarSelected"
            />
          </div>
        </div>

        <label>
          <span>Display name</span>
          <input
            v-model="form.name"
            type="text"
            maxlength="100"
            autocomplete="name"
            placeholder="Your name"
          />
        </label>

        <label>
          <span>Email</span>
          <input :value="form.email" type="email" disabled readonly />
        </label>

        <div class="actions">
          <button class="primary-button" type="submit" :disabled="isSaving || isUploading">
            {{ isSaving ? 'Saving...' : 'Save profile' }}
          </button>
          <RouterLink class="secondary-link" to="/settings/appearance">Appearance settings</RouterLink>
          <RouterLink class="secondary-link" to="/settings/password">Change password</RouterLink>
        </div>

        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>

      <aside class="settings-card detail-card">
        <h3>Profile details</h3>

        <div class="detail-grid">
          <div>
            <span class="label">Avatar status</span>
            <strong>{{ form.avatarUrl ? 'Custom avatar active' : 'Initials fallback' }}</strong>
          </div>
          <div>
            <span class="label">Display name</span>
            <strong>{{ form.name || '-' }}</strong>
          </div>
          <div>
            <span class="label">Email</span>
            <strong>{{ form.email || '-' }}</strong>
          </div>
          <div>
            <span class="label">Member since</span>
            <strong>{{ joinedAt }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 20px;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.settings-header h2,
.profile-summary h3,
.detail-card h3 {
  margin: 0;
  color: var(--color-text-primary);
}

.settings-header p,
.profile-summary p,
.profile-summary small {
  margin: 0;
  color: var(--color-text-secondary);
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 20px;
}

.settings-card {
  display: grid;
  gap: 20px;
  border: 1px solid var(--color-border-default);
  border-radius: 24px;
  background: var(--color-bg-panel);
  padding: 24px;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
}

.profile-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
}

.profile-summary {
  display: grid;
  gap: 4px;
}

.eyebrow,
.label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.avatar-actions,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.avatar-actions {
  justify-content: flex-end;
}

.hidden-input {
  display: none;
}

label {
  display: grid;
  gap: 8px;
  color: var(--color-text-primary);
  font-weight: 600;
}

input {
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  padding: 11px 12px;
}

input:focus {
  border-color: var(--color-primary);
  outline: 3px solid var(--color-focus-ring);
}

input:disabled {
  background: rgba(148, 163, 184, 0.08);
  color: var(--color-text-secondary);
}

.primary-button,
.secondary-button,
.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
}

.primary-button {
  border: 0;
  background: var(--color-primary);
  color: #ffffff;
}

.secondary-button,
.secondary-link {
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
}

.detail-card {
  align-content: start;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.detail-grid div {
  display: grid;
  gap: 6px;
}

strong {
  color: var(--color-text-primary);
}

.error-message,
.success-message {
  margin: 0;
  border-radius: 12px;
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

@media (max-width: 980px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .profile-hero {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .avatar-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .settings-header {
    flex-direction: column;
  }
}
</style>
