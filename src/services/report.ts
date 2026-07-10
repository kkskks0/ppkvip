import api from './api'
import type { ApiResponse, Report } from '../types'

export async function generateReport(imageUrl: string, imageKey: string, userName?: string, userAge?: number) {
  const res = await api.post<ApiResponse<{ reportId: string; status: string }>>('/report/generate', {
    imageUrl,
    imageKey,
    userName,
    userAge,
  })
  return res.data
}

export async function getReport(reportId: string) {
  const res = await api.get<ApiResponse<Report>>(`/report/${reportId}`)
  return res.data
}

export async function listReports() {
  const res = await api.get<ApiResponse<Report[]>>('/report')
  return res.data
}
