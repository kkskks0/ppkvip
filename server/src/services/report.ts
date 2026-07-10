import { PrismaClient } from '@prisma/client'
import { analyzeImage } from './ai'
import { readFile } from './storage'

const prisma = new PrismaClient()

export async function generateReport(userId: string, imageUrl: string, imageKey: string, _userInfo: { name?: string; age?: number }) {
  const report = await prisma.report.create({
    data: {
      userId,
      imageUrl,
      imageKey,
      reportType: 'SINGLE_PAY',
    },
  })

  const imageBuffer = readFile(imageKey)
  const mimeType = imageKey.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const analysisText = await analyzeImage([{ buffer: imageBuffer, mimeType }])
  let analysis: Record<string, unknown>
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { comprehensiveAnalysis: analysisText }
  } catch {
    analysis = { comprehensiveAnalysis: analysisText }
  }

  await prisma.report.update({
    where: { id: report.id },
    data: { analysis: JSON.stringify(analysis) },
  })

  return { reportId: report.id, status: 'COMPLETED' }
}

export async function getReport(reportId: string, userId: string) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, userId, isDeleted: false },
  })
  if (!report) return null
  return { ...report, analysis: JSON.parse(report.analysis as string) }
}

export async function listReports(userId: string) {
  const reports = await prisma.report.findMany({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
  })
  return reports.map((r) => ({ ...r, analysis: JSON.parse(r.analysis as string) }))
}
