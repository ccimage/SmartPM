import http from './http'

export interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
  role?: string
  joinedAt?: string
}

export interface CreateWorkspacePayload {
  name: string
}

export interface UpdateWorkspacePayload {
  name?: string
}

export function listWorkspaces() {
  return http.get<Workspace[]>('/workspaces')
}

export function getWorkspace(workspaceId: string) {
  return http.get<Workspace>(`/workspaces/${workspaceId}`)
}

export function createWorkspace(payload: CreateWorkspacePayload) {
  return http.post<Workspace>('/workspaces', payload)
}

export function updateWorkspace(workspaceId: string, payload: UpdateWorkspacePayload) {
  return http.patch<Workspace>(`/workspaces/${workspaceId}`, payload)
}
