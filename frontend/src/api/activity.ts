import http from './http'

export interface ActivityUser {
  id: string
  name: string
  avatarUrl: string | null
}

export interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string
  user: ActivityUser
  extra: Record<string, any> | null
  createdAt: string
}

export function listTaskActivities(
  taskId: string,
): Promise<{ data: ActivityLog[]; meta: { page: number; limit: number; total: number } }> {
  return http
    .get<{ data: ActivityLog[]; meta: { page: number; limit: number; total: number } }>(`/tasks/${taskId}/activities`)
    .then((response) => response.data)
}
