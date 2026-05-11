import type { UserPreferences } from './user'
import http from './http'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  createdAt?: string
  preferences: UserPreferences
}

export interface LoginResponse {
  token: string
  user: UserProfile
}

export interface UpdateMePayload {
  name?: string
  avatarUrl?: string | null
}

export function login(email: string, password: string) {
  return http.post<LoginResponse>('/auth/login', { email, password })
}

export function register(payload: { email: string; password: string; name: string }) {
  return http.post<LoginResponse>('/auth/register', payload)
}

export function getMe() {
  return http.get<UserProfile>('/auth/me')
}

export function updateMe(payload: UpdateMePayload) {
  return http.patch<UserProfile>('/users/me', payload)
}

export function changePassword(payload: { oldPassword: string; newPassword: string }) {
  return http.post('/users/me/password', payload)
}
