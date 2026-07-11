import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import { saveFile, readFileAsync } from './services/storage'
import { quickAnalyze, deepAnalyze } from './services/ai'
import { prisma, disconnectPrisma } from './lib/prisma'
import multer from 'multer'
import { logError, logWarn, categorizeError, getUserFriendlyMessage } from './utils/logger'
import { v4 as uuid } from 'uuid'
import { createOrder, handleWechatNotify } from './services/payment'
import {
  parseAiJsonResponse,
  validateAndNormalize,
  checkDataIntegrity,
  serializeAnalysisData,
  validateTextureComposition,
  createHealthSnapshot,
  getEnrichedReports,
  getAggregatedStats,
  analyzeTrend,
  getHealthTimeline,
  getPlatformStats,
} from './data'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const app = express()
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
app.use(express.json({ limit: '20mb' }))

const MAX_IMAGES = 5
const QUICK_TIMEOUT_MS = 45_000   // Quick analysis: 45s total timeout
const DEEP_TIMEOUT_MS = 150_000   // Deep analysis: 150s total timeout

// Color calibration cache with TTL to prevent memory leaks
// imageFingerprint → { color, shape, size, expiresAt }
const CACHE_MAX_SIZE = 200
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const calibrationCache = new Map<string, { color: any; shape: any; size: any; expiresAt: number }>()

/** Set calibration cache entry with automatic eviction */
function setCalibrationCache(key: string, entry: { color: any; shape: any; size: any }) {
  // Evict oldest entries if cache is full
  while (calibrationCache.size >= CACHE_MAX_SIZE) {
    const oldest = calibrationCache.keys().next().value
    if (oldest !== undefined) calibrationCache.delete(oldest)
  }
  calibrationCache.set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Get calibration cache entry (TTL-checked) */
function getCalibrationCache(key: string): { color: any; shape: any; size: any } | undefined {
  const entry = calibrationCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    calibrationCache.delete(key)
    return undefined
  }
  return { color: entry.color, shape: entry.shape, size: entry.size }
}

// Periodic cleanup of expired cache entries (every 5 min)
const cacheCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of calibrationCache) {
    if (now > entry.expiresAt) calibrationCache.delete(key)
  }
}, 5 * 60 * 1000)

// Clean up interval on process exit
const cleanupCacheInterval = () => clearInterval(cacheCleanupInterval)
process.on('exit', cleanupCacheInterval)

// ==================== 通用辅助 ====================

/** 获取或创建 direct 用户 */
async function getOrCreateDirectUser() {
  let user = await prisma.user.findFirst({ where: { phone: 'direct' } })
  if (!user) {
    user = await prisma.user.create({ data: { phone: 'direct', name: 'Direct User' } })
  }
  return user
}

/** 读取图片 Buffer 列表 */
async function loadImageBuffers(
  images: { imageKey: string }[] | undefined,
  imageKey: string
): Promise<{ buffer: Buffer; mimeType: string }[]> {
  const uploadsDir = path.join(__dirname, '../uploads')
  const imageList = (images && Array.isArray(images) && images.length > 0)
    ? images.slice(0, MAX_IMAGES)
    : [{ imageKey }]

  const buffers: { buffer: Buffer; mimeType: string }[] = []
  for (const img of imageList) {
    const fp = path.resolve(uploadsDir, path.basename(img.imageKey))
    const buf = await readFileAsync(fp)
    const mime = img.imageKey.endsWith('.png') ? 'image/png' : 'image/jpeg'
    buffers.push({ buffer: buf, mimeType: mime })
  }
  return buffers
}

// ==================== 基础 ====================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ==================== 上传 ====================

app.post('/api/upload-direct', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 2001, message: '请选择图片' })
  }
  const user = await getOrCreateDirectUser()
  const { filePath, fileName, previewUrl } = saveFile(req.file.buffer, req.file.originalname, user.id)
  res.json({ code: 0, data: { uploadId: fileName, previewUrl, filePath, userId: user.id }, message: 'ok' })
})

// ==================== 阶段1：免费快速分析 ====================

app.post('/api/quick-analysis', async (req, res) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ code: 5001, message: '分析超时，请重试' })
    }
  }, QUICK_TIMEOUT_MS)

  try {
    const { imageUrl, imageKey, userName, hasCap, gender, images, lang } = req.body
    if (!imageUrl || !imageKey) {
      clearTimeout(timeoutId)
      return res.status(400).json({ code: 2001, message: '参数缺失' })
    }

    const user = await getOrCreateDirectUser()

    // 创建报告记录
    const report = await prisma.report.create({
      data: {
        userId: user.id, imageUrl, imageKey,
        reportType: 'SINGLE_PAY', isUnlocked: false,
        analysisType: 'PENDING',
      },
    })

    // 读取图片
    const imageBuffers = await loadImageBuffers(images, imageKey)
    if (res.headersSent) return

    // 颜色校准：计算图片指纹（采样前1KB + 尺寸信息）
    const primaryBuf = imageBuffers[0]?.buffer
    const colorFingerprint = primaryBuf
      ? crypto.createHash('sha256').update(primaryBuf.slice(0, 1024)).update(String(primaryBuf.length)).digest('hex').slice(0, 16)
      : ''

    // Check calibration cache with TTL validation
    const cached = colorFingerprint ? getCalibrationCache(colorFingerprint) : undefined
    if (cached) {
      console.log('[Quick] Hit calibration cache, reusing result')
    }

    // 调用轻量AI（仅颜色/形态/尺寸）— 低算力，快速响应
    console.log('[Quick] Starting quick analysis...')
    const quickResult = await quickAnalyze(
      imageBuffers,
      userName || '用户', hasCap || false, gender || '未填写', lang || 'zh'
    )
    if (res.headersSent) return

    // 解析快速分析结果
    const parseResult = parseAiJsonResponse(quickResult)
    if (!parseResult.data || !parseResult.repairable) {
      clearTimeout(timeoutId)
      logError('QuickParse', new Error(`parse failed: ${parseResult.errors.join('; ')}`))
      return res.status(500).json({ code: 5001, message: '图片识别失败，请确保图片清晰后重新上传' })
    }

    const validation = validateAndNormalize(parseResult.data)

    // 注入元数据
    validation.normalizedData.reportMeta = {
      userName: userName || '用户',
      gender: gender || '未填写',
      analysisTime: new Date().toLocaleString('zh-CN'),
      hasReference: hasCap,
      sampleImage: imageUrl,
      analysisStage: 'QUICK',
    }

    // 存储快速分析结果
    const quickSerialized = serializeAnalysisData(validation.normalizedData)
    await prisma.report.update({
      where: { id: report.id },
      data: {
        quickAnalysis: quickSerialized,
        analysisType: 'QUICK',
      },
    })

    // Write calibration cache with TTL (reuse results for same image)
    if (colorFingerprint) {
      setCalibrationCache(colorFingerprint, {
        color: validation.normalizedData.color,
        shape: validation.normalizedData.shape,
        size: validation.normalizedData.size,
      })
    }

    clearTimeout(timeoutId)
    res.json({
      code: 0,
      data: {
        reportId: report.id,
        status: 'QUICK_COMPLETED',
        isUnlocked: false,
        colorFingerprint,
        calibrated: cached ? true : false,
        // 返回快速分析的摘要供前端立即展示
        quickSummary: {
          color: validation.normalizedData.color,
          shape: validation.normalizedData.shape,
          size: validation.normalizedData.size,
        },
      },
      message: 'ok',
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (res.headersSent) return
    const category = categorizeError(err)
    const userMsg = getUserFriendlyMessage(category)
    logError('QuickAnalysis', err)
    res.status(500).json({ code: 5001, message: userMsg })
  }
})

// ==================== 阶段2：付费深度分析 ====================

app.post('/api/report/:id/deep-analysis', async (req, res) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ code: 5001, message: '深度分析超时，请稍后重试' })
    }
  }, DEEP_TIMEOUT_MS)

  try {
    const reportId = req.params.id
    const report = await prisma.report.findFirst({ where: { id: reportId, isDeleted: false } })
    if (!report) {
      clearTimeout(timeoutId)
      return res.status(404).json({ code: 3002, message: '报告不存在' })
    }
    if (report.analysisType === 'DEEP') {
      clearTimeout(timeoutId)
      return res.json({ code: 0, data: { reportId, status: 'ALREADY_DEEP', isUnlocked: true }, message: '已存在深度分析' })
    }

    // 提取快速分析上下文
    let quickContext = ''
    try {
      const quick = JSON.parse(report.quickAnalysis as string || '{}')
      if (quick.color?.name && quick.shape?.type && quick.size?.category) {
        quickContext = `初步判定：颜色${quick.color.name}（${quick.color.interpretation || ''}），形态${quick.shape.type}（${quick.shape.significance || ''}），尺寸${quick.size.category}（${quick.size.estimatedRangeMm || ''}）`
      }
    } catch { /* ignore */ }

    // 获取用户信息
    const user = await prisma.user.findUnique({ where: { id: report.userId } })

    // 读取图片
    const imageBuffers = await loadImageBuffers(undefined, report.imageKey)
    if (res.headersSent) return

    // 读取报告元数据
    let meta: any = {}
    try { meta = JSON.parse(report.quickAnalysis as string || '{}')?.reportMeta || {} } catch { /* */ }

    console.log('[Deep] Starting deep analysis...')
    const deepResult = await deepAnalyze(
      imageBuffers,
      meta.userName || user?.name || '用户',
      meta.hasReference || false,
      meta.gender || user?.gender || '未填写',
      'zh',
      quickContext
    )
    if (res.headersSent) return

    // 解析深度分析
    const parseResult = parseAiJsonResponse(deepResult)
    if (!parseResult.data || !parseResult.repairable) {
      clearTimeout(timeoutId)
      logError('DeepParse', new Error(`parse failed: ${parseResult.errors.join('; ')}`))
      return res.status(500).json({ code: 5001, message: '深度分析失败，请稍后重试' })
    }

    const validation = validateAndNormalize(parseResult.data)
    const integrity = checkDataIntegrity(validation.normalizedData)
    if (!integrity.passed) {
      logWarn('DeepIntegrity', `checks failed: ${integrity.checks.filter(c => !c.passed).map(c => c.name).join(', ')}`)
    }

    // 质地/成分 知识库验证（硬性约束：不在库中则标记无效）
    const tcValidation = validateTextureComposition(validation.normalizedData)
    validation.normalizedData._textureValid = tcValidation.texture.valid
    validation.normalizedData._compositionValid = tcValidation.composition.valid
    if (!tcValidation.texture.valid) {
      logWarn('DeepTC', 'Texture type not in knowledge base, will hide on frontend')
    }
    if (!tcValidation.composition.valid) {
      logWarn('DeepTC', 'Composition type not in knowledge base, will hide on frontend')
    }
    // 用知识库增强数据替换
    if (tcValidation.texture.data) {
      validation.normalizedData.texture = tcValidation.texture.data
    }
    if (tcValidation.composition.data) {
      validation.normalizedData.composition = tcValidation.composition.data
    }

    // 注入元数据
    validation.normalizedData.reportMeta = {
      ...meta,
      analysisTime: new Date().toLocaleString('zh-CN'),
      analysisStage: 'DEEP',
      validationInfo: {
        valid: validation.valid,
        warnings: validation.warnings,
        integrityChecks: integrity.checks,
        textureValid: tcValidation.texture.valid,
        compositionValid: tcValidation.composition.valid,
      },
    }

    // 存储深度分析结果
    const serialized = serializeAnalysisData(validation.normalizedData)
    await prisma.report.update({
      where: { id: reportId },
      data: {
        analysis: serialized,
        analysisVersion: validation.schemaVersion,
        analysisType: 'DEEP',
      },
    })

    // 异步健康快照
    createHealthSnapshot(reportId).catch(() => {})

    clearTimeout(timeoutId)
    res.json({
      code: 0,
      data: {
        reportId,
        status: 'DEEP_COMPLETED',
        isUnlocked: true,
      },
      message: '深度分析完成',
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (res.headersSent) return
    const category = categorizeError(err)
    const userMsg = getUserFriendlyMessage(category)
    logError('DeepAnalysis', err)
    res.status(500).json({ code: 5001, message: userMsg })
  }
})

// ==================== 向后兼容：旧版一键分析 ====================

app.post('/api/report-generate-direct', async (req, res) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ code: 5001, message: '图片分析超时，请重试' })
    }
  }, QUICK_TIMEOUT_MS)

  try {
    const { imageUrl, imageKey, userName, hasCap, userId, gender, images, lang } = req.body
    if (!imageUrl || !imageKey) {
      clearTimeout(timeoutId)
      return res.status(400).json({ code: 2001, message: '参数缺失' })
    }

    const user = await getOrCreateDirectUser()

    const report = await prisma.report.create({
      data: { userId: user.id, imageUrl, imageKey, reportType: 'SINGLE_PAY', isUnlocked: false, analysisType: 'PENDING' },
    })

    const imageBuffers = await loadImageBuffers(images, imageKey)
    if (res.headersSent) return

    // 快速分析
    const quickResult = await quickAnalyze(imageBuffers, userName || '用户', hasCap || false, gender || '未填写', lang || 'zh')
    if (res.headersSent) return

    const parseResult = parseAiJsonResponse(quickResult)
    if (!parseResult.data || !parseResult.repairable) {
      clearTimeout(timeoutId)
      return res.status(500).json({ code: 5001, message: '图片识别失败' })
    }

    const validation = validateAndNormalize(parseResult.data)
    validation.normalizedData.reportMeta = {
      userName: userName || '用户', gender: gender || '未填写',
      analysisTime: new Date().toLocaleString('zh-CN'),
      hasReference: hasCap, sampleImage: imageUrl,
      analysisStage: 'QUICK',
    }

    const quickSerialized = serializeAnalysisData(validation.normalizedData)
    await prisma.report.update({
      where: { id: report.id },
      data: { quickAnalysis: quickSerialized, analysisType: 'QUICK' },
    })

    clearTimeout(timeoutId)
    res.json({
      code: 0,
      data: { reportId: report.id, status: 'COMPLETED', isUnlocked: false },
      message: 'ok',
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (res.headersSent) return
    logError('ReportGenerate', err)
    res.status(500).json({ code: 5001, message: getUserFriendlyMessage(categorizeError(err)) })
  }
})

// ==================== 报告查询 ====================

app.get('/api/report-direct/:id', async (req, res) => {
  const report = await prisma.report.findFirst({ where: { id: req.params.id } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  if (report.isDeleted) return res.status(404).json({ code: 3002, message: '报告已删除' })

  // 获取数据源：深度分析 > 快速分析
  let analysis: any = {}
  let analysisType = report.analysisType

  try {
    if (report.analysisType === 'DEEP') {
      analysis = JSON.parse(report.analysis as string || '{}')
    } else if (report.analysisType === 'QUICK') {
      analysis = JSON.parse(report.quickAnalysis as string || '{}')
    }
  } catch { analysis = {} }

  // 如果有 reportMeta 数据（快速分析），补充元数据
  let quickMeta: any = {}
  try { quickMeta = JSON.parse(report.quickAnalysis as string || '{}')?.reportMeta || {} } catch { /* */ }

  if (!analysis.reportMeta) {
    analysis.reportMeta = quickMeta
  }

  // 快速分析阶段：返回颜色/形态/尺寸/质地/成分（免费）+ 锁定标记
  // 如果已解锁但深度分析尚未完成，返回完整快速数据 + 待完成标记
  if (analysisType === 'QUICK' || analysisType === 'PENDING') {
    // 对已存储的质地/成分数据进行知识库验证
    const tcValid = analysis.texture?.type || analysis.composition?.type
      ? validateTextureComposition(analysis)
      : { texture: { valid: false, data: null, dbEntry: null }, composition: { valid: false, data: null, dbEntry: null } }

    const textureData = tcValid.texture.valid ? (tcValid.texture.data || analysis.texture) : undefined
    const compositionData = tcValid.composition.valid ? (tcValid.composition.data || analysis.composition) : undefined

    // Ensure sampleImage fallback: use report.imageUrl if reportMeta.sampleImage is missing
    if (!analysis.reportMeta?.sampleImage) {
      if (!analysis.reportMeta) analysis.reportMeta = {}
      analysis.reportMeta.sampleImage = report.imageUrl
    }

    const baseResponse = {
      id: report.id,
      userId: report.userId,
      imageUrl: report.imageUrl,
      createdAt: report.createdAt,
      isUnlocked: report.isUnlocked,
      analysisType,
      analysis: {
        reportMeta: analysis.reportMeta,
        color: analysis.color,
        shape: analysis.shape,
        size: analysis.size,
        texture: textureData,
        composition: compositionData,
        _textureValid: tcValid.texture.valid,
        _compositionValid: tcValid.composition.valid,
        _locked: !report.isUnlocked,
      },
    }

    // Already unlocked but deep analysis pending → show all QUICK data with pending flag
    if (report.isUnlocked) {
      res.json({
        code: 0,
        data: {
          ...baseResponse,
          isDeepAnalysisPending: true,
        },
        message: 'ok',
      })
    } else {
      res.json({
        code: 0,
        data: baseResponse,
        message: 'ok',
      })
    }
  } else {
    // 深度分析完成：返回全部
    // 对质地/成分进行知识库验证
    const tcValid = analysis.texture?.type || analysis.composition?.type
      ? validateTextureComposition(analysis)
      : { texture: { valid: false, data: null, dbEntry: null }, composition: { valid: false, data: null, dbEntry: null } }

    // 用验证后的数据增强（如果已有 _textureValid 标记，以存储时的验证为准）
    const finalAnalysis = { ...analysis }
    if (tcValid.texture.valid && tcValid.texture.data && !analysis._textureValid) {
      finalAnalysis.texture = tcValid.texture.data
    }
    if (tcValid.composition.valid && tcValid.composition.data && !analysis._compositionValid) {
      finalAnalysis.composition = tcValid.composition.data
    }
    finalAnalysis._textureValid = analysis._textureValid ?? tcValid.texture.valid
    finalAnalysis._compositionValid = analysis._compositionValid ?? tcValid.composition.valid

    // Ensure sampleImage fallback
    if (!finalAnalysis.reportMeta?.sampleImage) {
      if (!finalAnalysis.reportMeta) finalAnalysis.reportMeta = {}
      finalAnalysis.reportMeta.sampleImage = report.imageUrl
    }

    res.json({
      code: 0,
      data: {
        id: report.id,
        userId: report.userId,
        imageUrl: report.imageUrl,
        createdAt: report.createdAt,
        isUnlocked: true,
        unlockType: report.unlockType,
        analysisType: 'DEEP',
        analysis: finalAnalysis,
        analysisVersion: report.analysisVersion,
      },
      message: 'ok',
    })
  }
})

// ==================== 报告解锁（触发深度分析） ====================

app.post('/api/report/:id/unlock', async (req, res) => {
  const { unlockType, userId } = req.body
  const reportId = req.params.id

  const report = await prisma.report.findFirst({ where: { id: reportId, isDeleted: false } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  if (report.isUnlocked) return res.status(400).json({ code: 3003, message: '报告已解锁' })

  try {
    // 先标记解锁
    await prisma.report.update({
      where: { id: reportId },
      data: { isUnlocked: true, unlockedAt: new Date(), unlockType },
    })

    if (unlockType === 'ANNUAL') {
      const uid = userId || report.userId
      await prisma.report.updateMany({
        where: { userId: uid, isDeleted: false },
        data: { isUnlocked: true, unlockedAt: new Date(), unlockType: 'ANNUAL' },
      })
      const expireAt = new Date()
      expireAt.setFullYear(expireAt.getFullYear() + 1)
      await prisma.user.update({
        where: { id: uid },
        data: { memberType: 'ANNUAL', memberExpireAt: expireAt },
      })
    }

    // 如果尚未进行深度分析，立即返回并告知前端需要触发深度分析
    const needsDeepAnalysis = report.analysisType !== 'DEEP'

    res.json({
      code: 0,
      data: {
        reportId,
        isUnlocked: true,
        unlockType,
        needsDeepAnalysis,
      },
      message: needsDeepAnalysis ? '解锁成功，深度分析进行中' : '解锁成功',
    })
  } catch (err) {
    logError('ReportUnlock', err)
    res.status(500).json({ code: 5001, message: '解锁失败，请稍后重试' })
  }
})

// ==================== 报告删除（永久硬删除，不可恢复） ====================

app.delete('/api/report-direct/:id', async (req, res) => {
  const report = await prisma.report.findFirst({ where: { id: req.params.id, isDeleted: false } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })

  try {
    // 事务：先清理关联的健康快照，再永久删除报告
    await prisma.$transaction([
      prisma.healthSnapshot.deleteMany({ where: { reportId: req.params.id } }),
      prisma.report.delete({ where: { id: req.params.id } }),
    ])
    res.json({ code: 0, message: '报告已永久删除' })
  } catch (err) {
    logError('ReportDelete', err)
    res.status(500).json({ code: 5001, message: '删除失败，请稍后重试' })
  }
})

// ==================== 用户相关 ====================

// User list endpoint REMOVED to prevent user enumeration and data leakage.
// Reports are now isolated per user — each user only sees their own records.

app.get('/api/user/:userId/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.params.userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, imageUrl: true, isUnlocked: true, unlockType: true,
        reportType: true, analysisType: true, createdAt: true,
      },
    })
    res.json({ code: 0, data: reports, message: 'ok' })
  } catch (err) {
    logError('UserReports', err)
    res.status(500).json({ code: 5001, message: '查询报告列表失败' })
  }
})

app.get('/api/user/:userId/profile', async (req, res) => {
  try {
    let profile = await prisma.customerProfile.findFirst({ where: { userId: req.params.userId } })
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } })
    if (!user) return res.status(404).json({ code: 3002, message: '用户不存在' })

    if (!profile) {
      profile = await prisma.customerProfile.create({ data: { userId: req.params.userId } })
    }

    // Only expose non-sensitive fields — no birthday, email, address, emergencyContact
    res.json({
      code: 0,
      data: {
        profile: {
          id: profile.id,
          medicalHistory: profile.medicalHistory,
          dietaryPreference: profile.dietaryPreference,
          notes: profile.notes,
        },
        user: {
          id: user.id, name: user.name,
          gender: user.gender, age: user.age,
          healthGoal: user.healthGoal,
          memberType: user.memberType, memberExpireAt: user.memberExpireAt,
        },
      },
      message: 'ok',
    })
  } catch (err) {
    logError('ProfileGet', err)
    res.status(500).json({ code: 5001, message: '获取档案失败' })
  }
})

app.put('/api/user/:userId/profile', async (req, res) => {
  const userId = req.params.userId
  // Only accept non-sensitive fields — birthday/email/address/emergencyContact removed
  const { name, age, gender, healthGoal, medicalHistory, dietaryPreference, notes } = req.body

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        age: age !== undefined ? age : undefined,
        gender: gender !== undefined ? gender : undefined,
        healthGoal: healthGoal !== undefined ? healthGoal : undefined,
      },
    })

    let profile = await prisma.customerProfile.findFirst({ where: { userId } })
    if (profile) {
      profile = await prisma.customerProfile.update({
        where: { id: profile.id },
        data: { medicalHistory, dietaryPreference, notes },
      })
    } else {
      profile = await prisma.customerProfile.create({
        data: { userId, medicalHistory, dietaryPreference, notes },
      })
    }

    res.json({ code: 0, data: { profile }, message: '档案更新成功' })
  } catch (err) {
    logError('ProfileUpdate', err)
    res.status(500).json({ code: 5001, message: '档案更新失败' })
  }
})

// ==================== 支付 ====================

app.post('/api/payment/create', async (req, res) => {
  const { productType, userId, reportId } = req.body
  const amount = productType === 'ANNUAL_MEMBER' ? 59 : 9.9

  try {
    let uid = userId
    if (!uid) uid = (await getOrCreateDirectUser()).id

    const tradeNo = `PPK${Date.now()}${uuid().slice(0, 8)}`
    const payment = await prisma.payment.create({
      data: { userId: uid, amount, productType, tradeNo, reportId: productType === 'PER_REPORT' ? reportId : null, status: 'PENDING' },
    })

    if (!config.wechat.appId || !config.wechat.privateKey) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } })
      if (productType === 'ANNUAL_MEMBER') {
        const expireAt = new Date()
        expireAt.setFullYear(expireAt.getFullYear() + 1)
        await prisma.user.update({ where: { id: uid }, data: { memberType: 'ANNUAL', memberExpireAt: expireAt } })
      }
      return res.json({
        code: 0,
        data: { paymentId: payment.id, tradeNo, payType: 'demo', demoMode: true, amount, productType },
        message: '支付成功（演示模式）',
      })
    }

    try {
      const result = await createOrder(uid, productType, amount, 'native', tradeNo)
      if (result.payUrl) {
        return res.json({ code: 0, data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'h5', payUrl: result.payUrl, amount, productType }, message: 'ok' })
      }
      if (result.codeUrl) {
        return res.json({ code: 0, data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'native', codeUrl: result.codeUrl, amount, productType }, message: 'ok' })
      }
    } catch (payErr) { logError('WechatPay', payErr) }

    return res.json({
      code: 0,
      data: { paymentId: payment.id, tradeNo, payType: 'demo', demoMode: true, amount, productType },
      message: '微信支付暂不可用，已切换演示模式',
    })
  } catch (err) {
    logError('PaymentCreate', err)
    res.status(500).json({ code: 4002, message: '创建订单失败' })
  }
})

app.get('/api/payment/:id/status', async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
  if (!payment) return res.status(404).json({ code: 4001, message: '订单不存在' })
  res.json({ code: 0, data: { status: payment.status, tradeNo: payment.tradeNo }, message: 'ok' })
})

app.post('/api/payment/notify', async (req, res) => {
  try {
    const success = await handleWechatNotify(req.headers as Record<string, string>, req.body)
    res.status(200).json({ code: success ? 'SUCCESS' : 'FAIL', message: success ? 'ok' : '处理失败' })
  } catch (err) {
    logError('WechatNotify', err)
    res.status(500).json({ code: 'FAIL', message: '服务异常' })
  }
})

app.post('/api/payment/demo-pay', async (req, res) => {
  const { tradeNo } = req.body
  try {
    const payment = await prisma.payment.findFirst({ where: { tradeNo } })
    if (!payment) return res.status(404).json({ code: 4001, message: '订单不存在' })

    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } })

    if (payment.productType === 'ANNUAL_MEMBER') {
      const expireAt = new Date()
      expireAt.setFullYear(expireAt.getFullYear() + 1)
      await prisma.user.update({ where: { id: payment.userId }, data: { memberType: 'ANNUAL', memberExpireAt: expireAt } })
    }

    res.json({ code: 0, data: { tradeNo, status: 'PAID' }, message: '模拟支付成功' })
  } catch (err) {
    logError('DemoPay', err)
    res.status(500).json({ code: 5001, message: '模拟支付失败' })
  }
})

// ==================== 数据分析 API ====================

app.get('/api/data/stats/:userId', async (req, res) => {
  try {
    const stats = await getAggregatedStats(req.params.userId)
    res.json({ code: 0, data: stats, message: 'ok' })
  } catch (err) {
    logError('StatsQuery', err)
    res.status(500).json({ code: 5002, message: '统计数据查询失败' })
  }
})

app.get('/api/data/trend/:userId', async (req, res) => {
  try {
    const trend = await analyzeTrend(req.params.userId)
    res.json({ code: 0, data: trend, message: 'ok' })
  } catch (err) {
    logError('TrendAnalysis', err)
    res.status(500).json({ code: 5003, message: '趋势分析失败' })
  }
})

app.get('/api/data/timeline/:userId', async (req, res) => {
  try {
    const timeline = await getHealthTimeline(req.params.userId, Number(req.query.limit) || 12)
    res.json({ code: 0, data: timeline, message: 'ok' })
  } catch (err) {
    logError('TimelineQuery', err)
    res.status(500).json({ code: 5004, message: '时间线查询失败' })
  }
})

app.get('/api/data/reports/:userId', async (req, res) => {
  try {
    const reports = await getEnrichedReports(
      req.params.userId, Number(req.query.limit) || 20, Number(req.query.offset) || 0
    )
    res.json({ code: 0, data: reports, message: 'ok' })
  } catch (err) {
    logError('ReportsQuery', err)
    res.status(500).json({ code: 5005, message: '报告列表查询失败' })
  }
})

app.get('/api/data/platform-stats', async (_req, res) => {
  try {
    const stats = await getPlatformStats()
    res.json({ code: 0, data: stats, message: 'ok' })
  } catch (err) {
    logError('PlatformStats', err)
    res.status(500).json({ code: 5006, message: '平台统计查询失败' })
  }
})

app.get('/api/admin/customers/export', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(Number(req.query.pageSize) || 500, 1000)
    const users = await prisma.user.findMany({
      include: {
        profiles: true,
        reports: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 50 },
        payments: { where: { status: 'PAID' }, take: 50 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const exportData = users.map(u => ({
      用户ID: u.id, 姓名: u.name || '',
      性别: u.gender || '', 年龄: u.age || '',
      健康目标: u.healthGoal || '', 会员类型: u.memberType,
      会员到期: u.memberExpireAt?.toISOString() || '',
      既往病史: u.profiles[0]?.medicalHistory || '',
      饮食偏好: u.profiles[0]?.dietaryPreference || '',
      备注: u.profiles[0]?.notes || '',
      报告数量: u.reports.length, 已支付订单数: u.payments.length,
      总支付金额: u.payments.reduce((s, p) => s + p.amount, 0),
      注册时间: u.createdAt.toISOString(),
    }))

    const format = (req.query.format as string) || 'json'
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {})
      const csv = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=customers-${new Date().toISOString().slice(0, 10)}.csv`)
      res.send('\uFEFF' + csv)
    } else {
      res.json({ code: 0, data: exportData, total: exportData.length, message: 'ok' })
    }
  } catch (err) {
    logError('CustomerExport', err)
    res.status(500).json({ code: 5001, message: '导出失败' })
  }
})

// ==================== 静态文件 ====================

const uploadsPath = path.join(__dirname, '../uploads')
app.use('/ppk/uploads', express.static(uploadsPath))
app.use('/uploads', express.static(uploadsPath))

const distPath = path.join(__dirname, '../../dist')
app.use('/ppk', express.static(distPath))
app.get('/ppk', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
app.get('/ppk/*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))

app.use(errorHandler)

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
  console.log('Features: Two-stage analysis | Quick(free) + Deep(paid) | Per-report ¥9.9 / Annual ¥59')
})

async function gracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}, gracefully shutting down...`)
  cleanupCacheInterval()
  server.close(async () => {
    await disconnectPrisma()
    console.log('[Shutdown] Done.')
    process.exit(0)
  })
  setTimeout(() => { console.log('[Shutdown] Forced exit.'); process.exit(1) }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
