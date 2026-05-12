import http from './http'

export type BackgroundOverlay = 'light' | 'medium' | 'strong'

export interface UserPreferences {
  themeColor: string | null
  backgroundImageUrl: string | null
  backgroundOverlay: BackgroundOverlay
  useSystemTheme: boolean
}

export interface UpdatePreferencesPayload {
  themeColor?: string | null
  backgroundImageFileId?: string | null
  backgroundOverlay?: BackgroundOverlay
  useSystemTheme?: boolean
}

export interface UploadedAsset {
  id: string
  url: string
  filename: string
  size?: string | null
  mimeType?: string | null
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  createdAt?: string
  preferences: UserPreferences
}

export interface UpdateProfilePayload {
  name?: string
  avatarUrl?: string | null
}

export function getPreferences() {
  return http.get<UserPreferences>('/users/me/preferences')
}

export function updatePreferences(payload: UpdatePreferencesPayload) {
  return http.patch<UserPreferences>('/users/me/preferences', payload)
}

export function updateProfile(payload: UpdateProfilePayload) {
  return http.patch<UserProfile>('/users/me', payload)
}

export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return http.post<UploadedAsset>('/files/upload', formData)
}
