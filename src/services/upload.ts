import api from './api'
import type { ApiResponse } from '../types'

export async function uploadImage(file: File, onProgress?: (p: number) => void) {
  const formData = new FormData()
  formData.append('image', file)
  const res = await api.post<ApiResponse<{ uploadId: string; previewUrl: string; filePath: string }>>(
    '/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))),
    }
  )
  return res.data
}
