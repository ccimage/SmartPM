import http from './http'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Tag {
  id: string
  projectId: string
  name: string
  color: string | null
}

export interface Task {
  id: string
  projectId: string
  parentId?: string | null
  title: string
  description?: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null
  dueDate?: string | null
  tags?: Tag[]
  subTaskCount?: number
  createdAt: string
  updatedAt?: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
}

export interface UpdateTaskPayload {
  title?: string
  description?: string
  status?: Task['status']
  priority?: Task['priority']
  assigneeId?: string | null
  dueDate?: string | null
}

export interface ListTasksResponse {
  data: Task[]
  meta: {
    total?: number
    page?: number
    pageSize?: number
    [key: string]: unknown
  }
}

export function listTasks(projectId: string) {
  return http.get<ListTasksResponse>(`/projects/${projectId}/tasks`)
}

export function createTask(projectId: string, payload: CreateTaskPayload) {
  return http.post<Task>(`/projects/${projectId}/tasks`, payload)
}

export function getTask(taskId: string) {
  return http.get<Task>(`/tasks/${taskId}`)
}

export function updateTask(taskId: string, payload: UpdateTaskPayload) {
  return http.patch<Task>(`/tasks/${taskId}`, payload)
}

export function deleteTask(taskId: string) {
  return http.delete<void>(`/tasks/${taskId}`)
}

export function listTags(projectId: string) {
  return http.get<Tag[]>(`/projects/${projectId}/tags`)
}

export function createTag(projectId: string, payload: { name: string; color?: string | null }) {
  return http.post<Tag>(`/projects/${projectId}/tags`, payload)
}

export function setTaskTags(taskId: string, tagIds: string[]) {
  return http.put<Task>(`/tasks/${taskId}/tags`, { tagIds })
}
