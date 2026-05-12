import axios, { type AxiosError, type AxiosResponse } from 'axios'

export const TOKEN_STORAGE_KEY = 'smartpm_token'

export interface ApiErrorPayload {
  message?: string | string[]
  error?: string | { code: number; message: string }
  statusCode?: number
}

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data !== null && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data
    }
    return response
  },
  (error: AxiosError<ApiErrorPayload>) => {
    const isPasswordChangeRequest = error.config?.url === '/users/me/password'

    if (error.response?.status === 401 && !isPasswordChangeRequest) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export default http
