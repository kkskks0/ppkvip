import api from './api'
import type { ApiResponse } from '../types'
import type { AggregatedStats, TrendData, HealthSnapshot, PlatformStats, Report } from '../types/report'

/** 获取用户聚合统计数据 */
export async function getUserStats(userId: string): Promise<ApiResponse<AggregatedStats>> {
  const res = await api.get<ApiResponse<AggregatedStats>>(`/data/stats/${userId}`)
  return res.data
}

/** 获取用户趋势分析 */
export async function getUserTrend(userId: string): Promise<ApiResponse<TrendData>> {
  const res = await api.get<ApiResponse<TrendData>>(`/data/trend/${userId}`)
  return res.data
}

/** 获取用户健康时间线 */
export async function getUserTimeline(userId: string, limit?: number): Promise<ApiResponse<HealthSnapshot[]>> {
  const res = await api.get<ApiResponse<HealthSnapshot[]>>(`/data/timeline/${userId}`, {
    params: limit ? { limit } : undefined,
  })
  return res.data
}

/** 获取富化的报告列表 */
export async function getEnrichedReports(userId: string, limit?: number, offset?: number): Promise<ApiResponse<Report[]>> {
  const res = await api.get<ApiResponse<Report[]>>(`/data/reports/${userId}`, {
    params: { ...(limit ? { limit } : {}), ...(offset ? { offset } : {}) },
  })
  return res.data
}

/** 获取全平台匿名统计 */
export async function getPlatformStats(): Promise<ApiResponse<PlatformStats>> {
  const res = await api.get<ApiResponse<PlatformStats>>('/data/platform-stats')
  return res.data
}
