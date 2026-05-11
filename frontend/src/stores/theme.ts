import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getPreferences,
  updatePreferences,
  type BackgroundOverlay,
  type UpdatePreferencesPayload,
  type UserPreferences,
} from '@/api/user'

const THEME_STORAGE_KEY = 'smartpm_theme_preferences'
const DEFAULT_THEME_COLOR = '#2f6fed'

const defaultPreferences: UserPreferences = {
  themeColor: DEFAULT_THEME_COLOR,
  backgroundImageUrl: null,
  backgroundOverlay: 'medium',
  useSystemTheme: false,
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized
  const value = Number.parseInt(full, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => clamp(value).toString(16).padStart(2, '0'))
    .join('')}`
}

function mix(hex: string, target: string, weight: number) {
  const sourceRgb = hexToRgb(hex)
  const targetRgb = hexToRgb(target)
  const mixChannel = (source: number, next: number, ratio: number) => source + (next - source) * ratio

  return rgbToHex(
    mixChannel(sourceRgb.r, targetRgb.r, weight),
    mixChannel(sourceRgb.g, targetRgb.g, weight),
    mixChannel(sourceRgb.b, targetRgb.b, weight),
  )
}

function parseStoredPreferences() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)

  if (!stored) {
    return null
  }

  try {
    const parsed = JSON.parse(stored) as Partial<UserPreferences>

    return {
      ...defaultPreferences,
      ...parsed,
    }
  } catch {
    return null
  }
}

function persistPreferences(preferences: UserPreferences) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences))
}

function applyTheme(preferences: UserPreferences) {
  const root = document.documentElement
  const primary = preferences.themeColor ?? DEFAULT_THEME_COLOR
  const primaryHover = mix(primary, '#000000', 0.12)
  const primarySoft = mix(primary, '#ffffff', 0.9)
  const primaryText = mix(primary, '#0f172a', 0.18)
  const focusRing = mix(primary, '#ffffff', 0.72)

  root.style.setProperty('--color-primary', primary)
  root.style.setProperty('--color-primary-hover', primaryHover)
  root.style.setProperty('--color-primary-soft', primarySoft)
  root.style.setProperty('--color-primary-text', primaryText)
  root.style.setProperty('--color-focus-ring', focusRing)
  root.style.setProperty(
    '--app-background-image',
    preferences.backgroundImageUrl ? `url("${preferences.backgroundImageUrl}")` : 'none',
  )

  const overlayMap: Record<BackgroundOverlay, string> = {
    light: 'rgba(15, 23, 42, 0.18)',
    medium: 'rgba(15, 23, 42, 0.34)',
    strong: 'rgba(15, 23, 42, 0.48)',
  }

  root.style.setProperty('--app-background-overlay', overlayMap[preferences.backgroundOverlay])
}

export const useThemeStore = defineStore('theme', () => {
  const preferences = ref<UserPreferences>(parseStoredPreferences() ?? defaultPreferences)
  const isLoaded = ref(Boolean(parseStoredPreferences()))
  const isSaving = ref(false)
  const resolvedPreferences = computed(() => ({
    ...defaultPreferences,
    ...preferences.value,
  }))

  function setPreferences(nextPreferences: UserPreferences) {
    preferences.value = {
      ...defaultPreferences,
      ...nextPreferences,
    }
    persistPreferences(preferences.value)
    applyTheme(preferences.value)
    isLoaded.value = true
  }

  async function loadPreferences() {
    const response = await getPreferences()
    setPreferences(response.data)
    return response.data
  }

  async function savePreferences(payload: UpdatePreferencesPayload) {
    isSaving.value = true

    try {
      const response = await updatePreferences(payload)
      setPreferences(response.data)
      return response.data
    } finally {
      isSaving.value = false
    }
  }

  function applyStoredTheme() {
    applyTheme(resolvedPreferences.value)
  }

  return {
    preferences,
    resolvedPreferences,
    isLoaded,
    isSaving,
    setPreferences,
    loadPreferences,
    savePreferences,
    applyStoredTheme,
  }
})
