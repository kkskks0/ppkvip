/**
 * 数据查询与聚合分析层
 * 支持高效数据检索、趋势分析、用户画像聚合
 */

import { PrismaClient } from '@prisma/client'
import { deserializeAnalysisData } from './validator'

const prisma = new PrismaClient()

// ===== 类型定义 =====
export interface EnrichedReport {
  id: string
  userId: string
  imageUrl: string
  analysis: Record<string, unknown>
  reportType: string
  createdAt: string
  expiresAt?: string
  analysisVersion: number
}

export interface TrendData {
  trend: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
  metrics: {
    severityHistory: string[]
    colorHistory: string[]
    countHistory: number[]
    sizeHistory: string[]
  }
  insights: string[]
}

export interface AggregatedStats {
  totalReports: number
  lastReportDate: string | null
  dominantColor: string
  dominantShape: string
  avgStonesPerReport: number
  trendDirection: string
  highRiskCount: number
  memberStatus: string
  nextRecommendedDate?: string
}

// ===== 报告查询 =====

/** 获取富化的报告列表（含解析后的分析数据） */
export async function getEnrichedReports(userId: string, limit = 20, offset = 0): Promise<EnrichedReport[]> {
  const reports = await prisma.report.findMany({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return reports.map(r => ({
    id: r.id,
    userId: r.userId,
    imageUrl: r.imageUrl,
    analysis: deserializeAnalysisData(r.analysis) || {},
    reportType: r.reportType,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString(),
    analysisVersion: r.analysisVersion,
  }))
}

/** 按时间范围查询报告 */
export async function getReportsByTimeRange(userId: string, startDate: Date, endDate: Date): Promise<EnrichedReport[]> {
  const reports = await prisma.report.findMany({
    where: {
      userId,
      isDeleted: false,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
  })

  return reports.map(r => ({
    id: r.id,
    userId: r.userId,
    imageUrl: r.imageUrl,
    analysis: deserializeAnalysisData(r.analysis) || {},
    reportType: r.reportType,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString(),
    analysisVersion: r.analysisVersion,
  }))
}

// ===== 趋势分析 =====

/** 分析用户排出物趋势变化 */
export async function analyzeTrend(userId: string): Promise<TrendData> {
  const reports = await prisma.report.findMany({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    take: 10, // 最近10份报告足够趋势分析
  })

  if (reports.length < 2) {
    return {
      trend: 'insufficient_data',
      metrics: { severityHistory: [], colorHistory: [], countHistory: [], sizeHistory: [] },
      insights: ['数据不足，需要至少2份报告才能进行趋势分析'],
    }
  }

  const severityHistory: string[] = []
  const colorHistory: string[] = []
  const countHistory: number[] = []
  const sizeHistory: string[] = []
  const severityScores: number[] = []

  const sevScore: Record<string, number> = { 'Mild': 1, 'Moderate': 2, 'Severe': 3, '轻度': 1, '中度': 2, '重度': 3 }

  for (const r of reports) {
    const analysis = deserializeAnalysisData(r.analysis)
    if (!analysis) continue

    const color = (analysis.color as Record<string, unknown>) || {}
    const size = (analysis.size as Record<string, unknown>) || {}
    const quantity = (analysis.quantity as Record<string, unknown>) || {}
    const enriched = (analysis._enriched as Record<string, unknown>) || {}

    colorHistory.push((color.name as string) || '未知')
    sizeHistory.push((size.category as string) || '未知')

    const count = quantity.estimatedCount
    countHistory.push(typeof count === 'number' ? count : parseInt(String(count)) || 0)

    const sev = (enriched.colorMatch as Record<string, unknown>)?.severity as string || 'Moderate'
    severityHistory.push(sev)
    severityScores.push(sevScore[sev] || 2)
  }

  // 趋势判断：比较前半段和后半段的严重度
  const mid = Math.floor(severityScores.length / 2)
  const firstHalf = severityScores.slice(0, mid)
  const secondHalf = severityScores.slice(mid)
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  let trend: TrendData['trend']
  if (secondAvg < firstAvg * 0.9) trend = 'improving'
  else if (secondAvg > firstAvg * 1.1) trend = 'worsening'
  else trend = 'stable'

  const insights: string[] = []
  if (trend === 'improving') insights.push('排石效果持续改善，严重度呈下降趋势')
  if (trend === 'worsening') insights.push('近期排出物严重度上升，建议加强日常护肝措施')
  if (trend === 'stable') insights.push('排出物状况稳定，保持现有方案')
  if (colorHistory.length >= 3 && new Set(colorHistory.slice(-3)).size === 3) {
    insights.push('颜色类型多样，说明结石形成于不同时期')
  }

  return { trend, metrics: { severityHistory, colorHistory, countHistory, sizeHistory }, insights }
}

// ===== 聚合统计 =====

/** 获取用户聚合统计数据 */
export async function getAggregatedStats(userId: string): Promise<AggregatedStats> {
  const [reports, user, snapshots] = await Promise.all([
    prisma.report.findMany({ where: { userId, isDeleted: false }, orderBy: { createdAt: 'desc' } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.healthSnapshot.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  // 颜色统计
  const colorCount: Record<string, number> = {}
  const shapeCount: Record<string, number> = {}
  let totalStones = 0
  let reportWithCount = 0
  let highRiskCount = 0

  for (const r of reports) {
    const analysis = deserializeAnalysisData(r.analysis)
    if (!analysis) continue

    const color = (analysis.color as Record<string, unknown>) || {}
    const shape = (analysis.shape as Record<string, unknown>) || {}
    const quantity = (analysis.quantity as Record<string, unknown>) || {}
    const enriched = (analysis._enriched as Record<string, unknown>) || {}

    const cName = (color.name as string) || '未知'
    colorCount[cName] = (colorCount[cName] || 0) + 1

    const sType = (shape.type as string) || '未知'
    shapeCount[sType] = (shapeCount[sType] || 0) + 1

    const count = quantity.estimatedCount
    if (typeof count === 'number') { totalStones += count; reportWithCount++ }

    const sev = (enriched.colorMatch as Record<string, unknown>)?.severity as string
    if (sev === 'Severe') highRiskCount++
  }

  const dominantColor = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '未知'
  const dominantShape = Object.entries(shapeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '未知'

  // 下次排石推荐日期
  const lastReportDate = reports[0]?.createdAt
  const nextRecommendedDate = lastReportDate
    ? new Date(lastReportDate.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined

  return {
    totalReports: reports.length,
    lastReportDate: lastReportDate?.toISOString() || null,
    dominantColor,
    dominantShape,
    avgStonesPerReport: reportWithCount > 0 ? Math.round(totalStones / reportWithCount) : 0,
    trendDirection: await (async () => {
      if (reports.length < 2) return 'insufficient_data'
      return (await analyzeTrend(userId)).trend
    })(),
    highRiskCount,
    memberStatus: user?.memberType || 'FREE',
    nextRecommendedDate,
  }
}

// ===== 健康快照管理 =====

/** 为报告创建健康快照 */
export async function createHealthSnapshot(reportId: string): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId } })
  if (!report) return

  const analysis = deserializeAnalysisData(report.analysis)
  if (!analysis) return

  const color = (analysis.color as Record<string, unknown>) || {}
  const pattern = (analysis.pattern as Record<string, unknown>) || {}
  const quantity = (analysis.quantity as Record<string, unknown>) || {}
  const size = (analysis.size as Record<string, unknown>) || {}
  const enriched = (analysis._enriched as Record<string, unknown>) || {}
  const colorMatch = enriched.colorMatch as Record<string, unknown> | undefined

  await prisma.healthSnapshot.create({
    data: {
      userId: report.userId,
      reportId: report.id,
      colorHex: (color.hexColor as string) || '#999999',
      colorName: (color.name as string) || '未知',
      severityLevel: (colorMatch?.severity as string) || 'Moderate',
      stoneCount: typeof quantity.estimatedCount === 'number' ? quantity.estimatedCount : 0,
      stoneSizeCategory: (size.category as string) || '未知',
      patternType: (pattern.type as string) || undefined,
      riskLevel: (colorMatch?.severity === 'Severe' ? '高' : colorMatch?.severity === 'Moderate' ? '中' : '低'),
    },
  })
}

/** 获取用户健康变化时间线 */
export async function getHealthTimeline(userId: string, limit = 12) {
  return prisma.healthSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ===== 跨用户对比（知识库统计） =====

/** 全平台数据统计（匿名化） */
export async function getPlatformStats(): Promise<{
  totalUsers: number
  totalReports: number
  colorDistribution: Record<string, number>
  shapeDistribution: Record<string, number>
  avgSeverity: string
}> {
  const [totalUsers, totalReports] = await Promise.all([
    prisma.user.count(),
    prisma.report.count({ where: { isDeleted: false } }),
  ])

  const colorDistribution: Record<string, number> = {}
  const shapeDistribution: Record<string, number> = {}
  const sevScores: string[] = []

  const recentReports = await prisma.report.findMany({
    where: { isDeleted: false },
    select: { analysis: true },
    take: 500,
    orderBy: { createdAt: 'desc' },
  })

  for (const r of recentReports) {
    const analysis = deserializeAnalysisData(r.analysis)
    if (!analysis) continue
    const color = (analysis.color as Record<string, unknown>)
    const shape = (analysis.shape as Record<string, unknown>)
    const enriched = (analysis._enriched as Record<string, unknown>)
    const colorMatch = enriched?.colorMatch as Record<string, unknown> | undefined

    const cName = (color?.name as string) || '未知'
    colorDistribution[cName] = (colorDistribution[cName] || 0) + 1

    const sType = (shape?.type as string) || '未知'
    shapeDistribution[sType] = (shapeDistribution[sType] || 0) + 1

    if (colorMatch?.severity) sevScores.push(colorMatch.severity as string)
  }

  const avgSeverity =
    sevScores.filter(s => s === 'Severe').length > sevScores.length * 0.3 ? '偏高' :
    sevScores.filter(s => s === 'Mild').length > sevScores.length * 0.5 ? '偏低' : '正常'

  return { totalUsers, totalReports, colorDistribution, shapeDistribution, avgSeverity }
}
