<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import type { ApiErrorPayload } from '@/api/http'
import { uploadFile } from '@/api/user'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const themeStore = useThemeStore()
const DEFAULT_THEME_COLOR = '#2f6fed'
const successMessage = ref('')
const errorMessage = ref('')
const isUploading = ref(false)

const form = reactive({
  themeColor: '#2f6fed',
  backgroundOverlay: 'medium' as 'light' | 'medium' | 'strong',
  useSystemTheme: false,
  backgroundImageUrl: null as string | null,
  backgroundImageFileId: null as string | null,
})

const overlayOptions = [
  { label: 'Light overlay', value: 'light' },
  { label: 'Medium overlay', value: 'medium' },
  { label: 'Strong overlay', value: 'strong' },
] as const

const previewStyle = computed(() => ({
  '--preview-primary': form.themeColor || DEFAULT_THEME_COLOR,
  '--preview-image': form.backgroundImageUrl ? `url("${form.backgroundImageUrl}")` : 'none',
}))

function syncFromStore() {
  form.themeColor = themeStore.resolvedPreferences.themeColor ?? DEFAULT_THEME_COLOR
  form.backgroundOverlay = themeStore.resolvedPreferences.backgroundOverlay
  form.useSystemTheme = themeStore.resolvedPreferences.useSystemTheme
  form.backgroundImageUrl = themeStore.resolvedPreferences.backgroundImageUrl
  form.backgroundImageFileId = null
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorPayload>
  const message = axiosError.response?.data?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  return message ?? 'Unable to save appearance settings.'
}

function applyPreview() {
  themeStore.setPreferences({
    themeColor: form.useSystemTheme ? null : form.themeColor,
    backgroundImageUrl: form.backgroundImageUrl,
    backgroundOverlay: form.backgroundOverlay,
    useSystemTheme: form.useSystemTheme,
  })
}

async function handleBackgroundSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isUploading.value = true

  try {
    const response = await uploadFile(file)
    form.backgroundImageFileId = response.data.id
    form.backgroundImageUrl = response.data.url
    applyPreview()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await themeStore.savePreferences({
      themeColor: form.useSystemTheme ? null : form.themeColor,
      backgroundImageFileId: form.backgroundImageFileId,
      backgroundOverlay: form.backgroundOverlay,
      useSystemTheme: form.useSystemTheme,
    })
    successMessage.value = 'Appearance settings saved.'
    syncFromStore()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

function restoreDefaults() {
  form.themeColor = DEFAULT_THEME_COLOR
  form.backgroundOverlay = 'medium'
  form.useSystemTheme = false
  form.backgroundImageUrl = null
  form.backgroundImageFileId = null
  applyPreview()
}

function goBack() {
  router.back()
}

onMounted(() => {
  syncFromStore()
})
</script>

<template>
  <section class="settings-page">
    <div class="settings-header">
      <div>
        <h2>Appearance</h2>
        <p>Adjust theme color and background image for the login screen and main workspace.</p>
      </div>
      <button class="secondary-button" type="button" @click="goBack">Back</button>
    </div>

    <div class="appearance-grid">
      <form class="settings-card" @submit.prevent="handleSubmit">
        <div class="section-heading">
          <h3>Theme</h3>
          <p>Use a single brand color and propagate it through buttons, links, and focus states.</p>
        </div>

        <label class="checkbox-row">
          <input v-model="form.useSystemTheme" type="checkbox" @change="applyPreview" />
          <span>Use default system theme</span>
        </label>

        <label>
          <span>Theme color</span>
          <div class="color-row">
            <input
              v-model="form.themeColor"
              type="color"
              :disabled="form.useSystemTheme"
              @input="applyPreview"
            />
            <input
              v-model="form.themeColor"
              type="text"
              :disabled="form.useSystemTheme"
              placeholder="#2f6fed"
              @input="applyPreview"
            />
          </div>
        </label>

        <label>
          <span>Background overlay</span>
          <select v-model="form.backgroundOverlay" @change="applyPreview">
            <option v-for="option in overlayOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label>
          <span>Background image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="isUploading"
            @change="handleBackgroundSelected"
          />
          <small>Recommended: 1600x900 or larger. JPG, PNG, or WEBP.</small>
        </label>

        <div class="actions">
          <button class="primary-button" type="submit" :disabled="themeStore.isSaving || isUploading">
            {{ themeStore.isSaving ? 'Saving...' : 'Save appearance' }}
          </button>
          <button class="secondary-button" type="button" @click="restoreDefaults">Restore defaults</button>
        </div>

        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>

      <section class="preview-card" :style="previewStyle">
        <div class="preview-surface">
          <div class="preview-topbar">
            <span class="preview-chip">SmartPM</span>
            <span class="preview-link">Preview</span>
          </div>

          <div class="preview-panel">
            <p>Workspace surface</p>
            <h3>Theme preview</h3>
            <div class="preview-actions">
              <button type="button">Primary action</button>
              <span>Selected navigation</span>
            </div>
          </div>
        </div>
      </section>
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
.section-heading h3,
.preview-panel h3 {
  margin: 0;
  color: var(--color-text-primary);
}

.settings-header p,
.section-heading p,
.preview-panel p,
small {
  margin: 0;
  color: var(--color-text-secondary);
}

.appearance-grid {
  display: grid;
  grid-template-columns: minmax(0, 540px) minmax(320px, 1fr);
  gap: 20px;
}

.settings-card,
.preview-card {
  border: 1px solid var(--color-border-default);
  border-radius: 24px;
  background: var(--color-bg-panel);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
}

.settings-card {
  display: grid;
  gap: 18px;
  padding: 24px;
}

label {
  display: grid;
  gap: 8px;
  color: var(--color-text-primary);
  font-weight: 600;
}

input[type='text'],
input[type='file'],
select {
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  padding: 11px 12px;
}

input[type='text']:focus,
input[type='file']:focus,
select:focus {
  border-color: var(--color-primary);
  outline: 3px solid var(--color-focus-ring);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
}

.color-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
}

input[type='color'] {
  width: 72px;
  height: 48px;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
  padding: 6px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.primary-button,
.secondary-button {
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 700;
}

.primary-button {
  border: 0;
  background: var(--color-primary);
  color: #ffffff;
}

.secondary-button {
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
}

.preview-card {
  position: relative;
  overflow: hidden;
  min-height: 420px;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
    var(--preview-image),
    radial-gradient(circle at top left, #f5f9ff, #dbeafe 45%, #bfdbfe);
  background-size: cover;
  background-position: center;
}

.preview-card::before {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  content: '';
}

.preview-surface {
  position: relative;
  z-index: 1;
  display: grid;
  height: 100%;
  grid-template-rows: auto 1fr;
  gap: 20px;
  padding: 22px;
}

.preview-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-chip,
.preview-link {
  border-radius: 999px;
  backdrop-filter: blur(12px);
  padding: 8px 12px;
  font-weight: 700;
}

.preview-chip {
  background: rgba(255, 255, 255, 0.92);
  color: var(--preview-primary);
}

.preview-link {
  background: rgba(15, 23, 42, 0.42);
  color: #ffffff;
}

.preview-panel {
  align-self: end;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  padding: 24px;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
}

.preview-actions button {
  border: 0;
  border-radius: 12px;
  background: var(--preview-primary);
  color: #ffffff;
  padding: 10px 16px;
  font-weight: 700;
}

.preview-actions span {
  color: var(--preview-primary);
  font-weight: 700;
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
  .appearance-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .settings-header {
    flex-direction: column;
  }

  .color-row {
    grid-template-columns: 1fr;
  }
}
</style>
