import http from './http'

export interface Project {
  id: string
  name: string
  icon: string
  color: string
  description?: string | null
  workspaceId?: string
  createdBy?: string
  memberCount?: number
  createdAt: string
}

export interface CreateProjectPayload {
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface UpdateProjectPayload {
  name?: string
  description?: string | null
  icon?: string
  color?: string
}

export function listProjects(workspaceId: string) {
  return http.get<Project[]>(`/workspaces/${workspaceId}/projects`)
}

export function getProject(projectId: string) {
  return http.get<Project>(`/projects/${projectId}`)
}

export function createProject(workspaceId: string, payload: CreateProjectPayload) {
  return http.post<Project>(`/workspaces/${workspaceId}/projects`, payload)
}

export function updateProject(projectId: string, payload: UpdateProjectPayload) {
  return http.patch<Project>(`/projects/${projectId}`, payload)
}

export function deleteProject(projectId: string) {
  return http.delete<void>(`/projects/${projectId}`)
}
