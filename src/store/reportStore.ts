import { create } from 'zustand'
import type { Report } from '../types'
import * as reportService from '../services/report'

interface ReportState {
  currentReport: Report | null
  reports: Report[]
  analysisStatus: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'
  submitAnalysis: (imageUrl: string, imageKey: string, userName?: string, userAge?: number) => Promise<string>
  fetchReport: (reportId: string) => Promise<void>
  fetchReports: () => Promise<void>
}

export const useReportStore = create<ReportState>((set) => ({
  currentReport: null,
  reports: [],
  analysisStatus: 'idle',

  submitAnalysis: async (imageUrl, imageKey, userName, userAge) => {
    set({ analysisStatus: 'analyzing' })
    try {
      const res = await reportService.generateReport(imageUrl, imageKey, userName, userAge)
      if (res.code === 0) {
        set({ analysisStatus: 'completed' })
        return res.data.reportId
      }
      throw new Error(res.message)
    } catch {
      set({ analysisStatus: 'error' })
      throw new Error('分析失败')
    }
  },

  fetchReport: async (reportId) => {
    const res = await reportService.getReport(reportId)
    if (res.code === 0) set({ currentReport: res.data })
  },

  fetchReports: async () => {
    const res = await reportService.listReports()
    if (res.code === 0) set({ reports: res.data })
  },
}))
