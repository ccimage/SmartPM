import http from './http'

export interface UploadedFile {
  id: string
  url: string
  filename: string
  mimetype: string
  size: number
}

export function uploadImage(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)

  return http.post<UploadedFile>('/files/upload', form).then((response) => response.data)
}
