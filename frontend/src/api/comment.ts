import http from './http'

export interface CommentAuthor {
  id: string
  name: string
  avatarUrl: string | null
}

export interface Comment {
  id: string
  content: string
  author: CommentAuthor
  mentions: { id: string; name: string }[]
  createdAt: string
  updatedAt: string
}

export interface CommentListMeta {
  page: number
  limit: number
  total: number
}

export function listComments(taskId: string): Promise<{ data: Comment[]; meta: CommentListMeta }> {
  return http.get<{ data: Comment[]; meta: CommentListMeta }>(`/tasks/${taskId}/comments`).then((response) => response.data)
}

export function createComment(taskId: string, content: string, mentionUserIds: string[] = []): Promise<Comment> {
  return http.post<Comment>(`/tasks/${taskId}/comments`, { content, mentionUserIds }).then((response) => response.data)
}

export function updateComment(
  commentId: string,
  content: string,
  mentionUserIds: string[] = [],
): Promise<{ id: string; content: string; updatedAt: string }> {
  return http
    .patch<{ id: string; content: string; updatedAt: string }>(`/comments/${commentId}`, { content, mentionUserIds })
    .then((response) => response.data)
}

export function deleteComment(commentId: string): Promise<void> {
  return http.delete<void>(`/comments/${commentId}`).then((response) => response.data)
}
