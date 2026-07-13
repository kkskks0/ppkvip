import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import { gzipMiddleware, rateLimiter, strictRateLimiter, requireAdmin } from './middleware/security'
import { optionalAuth } from './middleware/optionalAuth'
import { signToken } from './utils/jwt'
import {
  QUICK_TIMEOUT_MS, MAX_IMAGES, JSON_BODY_LIMIT, UPLOAD_MAX_BYTES,
  CALIBRATION_CACHE_MAX, CALIBRATION_CACHE_TTL_MS,
  REPORT_CACHE_MAX, REPORT_CACHE_TTL_MS,
  PRODUCT_TYPES, UNLOCK_TYPES,
} from './constants'
import { saveFile, readFileAsync } from './services/storage'
import { quickAnalyze, prepareImages } from './services/ai'
import { ensureDeepJob, subscribeJob, MODULES, type DeepCtx } from './services/deepJob'
import { prisma, disconnectPrisma } from './lib/prisma'
import multer from 'multer'
import { logError, logWarn, logInfo, categorizeError, getUserFriendlyMessage } from './utils/logger'
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: UPLOAD_MAX_BYTES } })

const app = express()
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: (origin, cb) => {
    // 允许同源（非浏览器/无 origin）与白名单内的来源
    if (!origin) return cb(null, true)
    if (config.corsOrigins.includes(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
}))
app.use(gzipMiddleware)
app.use(express.json({ limit: JSON_BODY_LIMIT }))
app.use(rateLimiter()) // 全局按 IP 限流
app.use(optionalAuth)  // 可选鉴权：有 token 用 token，无则匿名 direct

// 内部类型别名（替换 any）
type JsonObj = Record<string, any>
interface SSEMsg { type: string; key?: string; [k: string]: unknown }

// Color calibration cache with TTL to prevent memory leaks
// imageFingerprint → { color, shape, size, expiresAt }
const calibrationCache = new Map<string, { color: any; shape: any; size: any; expiresAt: number }>()

/** Set calibration cache entry with automatic eviction */
function setCalibrationCache(key: string, entry: { color: any; shape: any; size: any }) {
  // Evict oldest entries if cache is full
  while (calibrationCache.size >= CALIBRATION_CACHE_MAX) {
    const oldest = calibrationCache.keys().next().value
    if (oldest !== undefined) calibrationCache.delete(oldest)
  }
  calibrationCache.set(key, { ...entry, expiresAt: Date.now() + CALIBRATION_CACHE_TTL_MS })
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

// ==================== 报告分析缓存 ====================
// 减少 JSON.parse 和 validateTextureComposition 的重复开销
// reportId → { parsed, response, expiresAt }
const reportCache = new Map<string, { response: JsonObj; expiresAt: number }>()

function getReportCache(key: string): JsonObj | undefined {
  const entry = reportCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    reportCache.delete(key)
    return undefined
  }
  return entry.response
}

function setReportCache(key: string, response: JsonObj) {
  while (reportCache.size >= REPORT_CACHE_MAX) {
    const oldest = reportCache.keys().next().value
    if (oldest !== undefined) reportCache.delete(oldest)
  }
  reportCache.set(key, { response, expiresAt: Date.now() + REPORT_CACHE_TTL_MS })
}

// Periodic cleanup of report cache
const reportCacheCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of reportCache) {
    if (now > entry.expiresAt) reportCache.delete(key)
  }
}, 30 * 1000)

const cleanupReportCache = () => clearInterval(reportCacheCleanup)
process.on('exit', cleanupReportCache)

// ==================== 通用辅助 ====================

/** 获取或创建 direct 用户 */
async function getOrCreateDirectUser() {
  let user = await prisma.user.findFirst({ where: { phone: 'direct' } })
  if (!user) {
    user = await prisma.user.create({ data: { phone: 'direct', name: 'Direct User' } })
  }
  return user
}

/**
 * 解析当前请求的有效用户：
 * - 已登录（req.user 存在）→ 返回其账户
 * - 未登录 → 回退共享 direct 用户（保持匿名流程向后兼容）
 */
async function resolveUser(req: import('express').Request) {
  if (req.user?.userId) {
    const u = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (u) return u
  }
  return getOrCreateDirectUser()
}

/**
 * 报告归属校验：仅当请求已登录且报告不属于该用户时拒绝。
 * 匿名请求（无 token）维持既有行为，返回 true 放行。
 * @returns true 允许访问；false 应返回 403
 */
function canAccessReport(req: import('express').Request, report: { userId: string }): boolean {
  if (!req.user?.userId) return true // 匿名：兼容既有 direct 流程
  return report.userId === req.user.userId
}

/**
 * 用户资源归属校验：已登录时只能访问自己的 userId；匿名维持既有行为。
 */
function canAccessUser(req: import('express').Request, userId: string): boolean {
  if (!req.user?.userId) return true
  return userId === req.user.userId
}

/** 检查用户是否为有效的年费会员 */
async function checkAnnualMember(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return false
  return user.memberType === 'ANNUAL' && !!user.memberExpireAt && user.memberExpireAt > new Date()
}

/**
 * 防作弊：重置用户所有单次解锁的报告为未解锁状态
 * 仅重置 unlockType != 'ANNUAL' 的报告，年费会员的报告不受影响
 * 确保每次上传新图片后，之前单次解锁的报告自动失效
 */
async function resetSingleUnlocks(userId: string): Promise<number> {
  const result = await prisma.report.updateMany({
    where: {
      userId,
      isDeleted: false,
      isUnlocked: true,
      OR: [
        { unlockType: { not: 'ANNUAL' } },
        { unlockType: null },
      ],
    },
    data: {
      isUnlocked: false,
      unlockType: null,
      unlockedAt: null,
    },
  })
  if (result.count > 0) {
    logInfo('AntiFraud', `Reset ${result.count} single-unlocked reports for user ${userId}`)
  }
  return result.count
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

// ==================== 认证（手机验证码，开发模式固定码 123456） ====================
// 与已部署的 optionalAuth 形成闭环：登录签发 JWT，前端携带后启用账户归属隔离
const authCodeStore = new Map<string, { code: string; expires: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of authCodeStore) if (now > v.expires) authCodeStore.delete(k)
}, 5 * 60 * 1000).unref?.()

app.post('/api/auth/send-code', strictRateLimiter(), async (req, res) => {
  const { phone } = req.body ?? {}
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ code: 2001, message: '手机号格式错误' })
  }
  const code = '123456' // 开发模式固定验证码（无短信服务）
  authCodeStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 })
  logInfo('Auth', `[验证码] ${phone}: ${code} (开发模式)`)
  res.json({ code: 0, data: null, message: 'ok' })
})

app.post('/api/auth/login', strictRateLimiter(), async (req, res) => {
  const { phone, code } = req.body ?? {}
  if (!phone || !code) {
    return res.status(400).json({ code: 2001, message: '参数缺失' })
  }
  const stored = authCodeStore.get(phone)
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ code: 1003, message: '验证码错误或已过期' })
  }
  authCodeStore.delete(phone)
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  })
  const token = signToken(user.id)
  res.json({ code: 0, data: { token, user }, message: 'ok' })
})

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ code: 1001, message: '未登录' })
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
  if (!user) return res.status(404).json({ code: 3002, message: '用户不存在' })
  res.json({ code: 0, data: user, message: 'ok' })
})

// ==================== 基础 ====================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 获取或创建默认 direct 用户（供前端无 userId 时使用）
app.get('/api/user/direct', async (_req, res) => {
  try {
    const user = await getOrCreateDirectUser()
    res.json({ code: 0, data: { id: user.id, name: user.name, memberType: user.memberType }, message: 'ok' })
  } catch (err) {
    logError('DirectUser', err)
    res.status(500).json({ code: 5001, message: '获取用户失败' })
  }
})

// ==================== 上传 ====================

app.post('/api/upload-direct', strictRateLimiter(), upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 2001, message: '请选择图片' })
  }
  const user = await resolveUser(req)
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
    const { imageUrl, imageKey, userName, hasCap, gender, age, medicalHistory, images, lang } = req.body
    if (!imageUrl || !imageKey) {
      clearTimeout(timeoutId)
      return res.status(400).json({ code: 2001, message: '参数缺失' })
    }

    const user = await resolveUser(req)

    // 防作弊：上传新图片时，重置该用户所有单次解锁的报告为未解锁
    const isAnnual = await checkAnnualMember(user.id)
    if (!isAnnual) {
      await resetSingleUnlocks(user.id)
    }

    // 读取图片
    const imageBuffers = await loadImageBuffers(images, imageKey)
    if (res.headersSent) return

    // 计算图片指纹（采样前1KB + 尺寸信息）
    const primaryBuf = imageBuffers[0]?.buffer
    const colorFingerprint = primaryBuf
      ? crypto.createHash('sha256').update(primaryBuf.slice(0, 1024)).update(String(primaryBuf.length)).digest('hex').slice(0, 16)
      : ''

    // 防重复：检查同一用户是否已上传过相同指纹的图片
    if (colorFingerprint) {
      const existing = await prisma.report.findFirst({
        where: { userId: user.id, fingerprint: colorFingerprint, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) {
        clearTimeout(timeoutId)
        logInfo('Quick', `Duplicate image detected, returning existing report ${existing.id}`)
        return res.json({
          code: 0,
          data: {
            reportId: existing.id,
            status: existing.analysisType === 'DEEP' ? 'DEEP_COMPLETED' : 'QUICK_COMPLETED',
            isUnlocked: existing.isUnlocked,
            fingerprintMatched: true,
            message: '该图片已分析过，返回已有报告',
          },
          message: 'ok',
        })
      }
    }

    // Check calibration cache with TTL validation
    const cached = colorFingerprint ? getCalibrationCache(colorFingerprint) : undefined
    if (cached) {
      logInfo('Quick', 'Hit calibration cache, reusing result')
    }

    // 创建报告记录（年费会员自动解锁，非年费强制未解锁）
    const report = await prisma.report.create({
      data: {
        userId: user.id, imageUrl, imageKey,
        fingerprint: colorFingerprint || undefined,
        reportType: isAnnual ? 'ANNUAL_MEMBER' : 'SINGLE_PAY',
        isUnlocked: isAnnual,
        unlockType: isAnnual ? 'ANNUAL' : null,
        analysisType: 'PENDING',
      },
    })

    // 调用轻量AI（仅颜色/形态/尺寸）— 低算力，快速响应
    logInfo('Quick', 'Starting quick analysis...')
    const quickResult = await quickAnalyze(
      imageBuffers,
      userName || '用户', hasCap || false, gender || '未填写',
      age ? String(age) : undefined,
      medicalHistory || undefined,
      lang || 'zh'
    )
    if (res.headersSent) return

    // 解析快速分析结果
    const parseResult = parseAiJsonResponse(quickResult)
    if (!parseResult.data || !parseResult.repairable) {
      clearTimeout(timeoutId)
      logError('QuickParse', new Error(`parse failed: ${parseResult.errors.join('; ')}`))
      // 删除已创建的待处理报告
      await prisma.report.delete({ where: { id: report.id } }).catch(() => {})
      return res.status(500).json({ code: 5001, message: '图片识别失败，请确保图片清晰后重新上传' })
    }

    // 图片分类检查：判断是否为排出物
    if (parseResult.data.isDischarge === false) {
      clearTimeout(timeoutId)
      const detectedObj = parseResult.data.detectedObject || '未知物品'
      logInfo('Quick', `Image rejected: not discharge, detected as "${detectedObj}"`)
      // 删除已创建的待处理报告
      await prisma.report.delete({ where: { id: report.id } }).catch(() => {})
      return res.json({
        code: 4001,
        message: `图片识别结果为「${detectedObj}」，该内容不属于排出物。请上传肝胆排毒排出物的照片后重试。`,
        data: { detectedObject: detectedObj, isDischarge: false },
      })
    }

    // 移除分类标记字段，不存入分析数据
    delete parseResult.data.isDischarge
    delete parseResult.data.detectedObject

    const validation = validateAndNormalize(parseResult.data)

    // 注入元数据
    validation.normalizedData.reportMeta = {
      userName: userName || '用户',
      gender: gender || '未填写',
      age: age ? parseInt(String(age), 10) : undefined,
      medicalHistory: medicalHistory || undefined,
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

// ==================== 阶段2：付费深度分析（并行模块 + 流式渲染） ====================

/**
 * 构造并行深度分析所需的上下文（图片/快速分析上下文/元数据）
 */
async function buildDeepContext(report: { id: string; quickAnalysis: string | null; imageUrl: string; imageKey: string; userId: string; [key: string]: unknown }): Promise<DeepCtx> {
  // 提取快速分析上下文
  let quickContext = ''
  try {
    const quick = JSON.parse(report.quickAnalysis as string || '{}')
    if (quick.color?.name && quick.shape?.type && quick.size?.category) {
      quickContext = `初步判定：颜色${quick.color.name}（${quick.color.interpretation || ''}），形态${quick.shape.type}（${quick.shape.significance || ''}），尺寸${quick.size.category}（${quick.size.estimatedRangeMm || ''}）`
    }
  } catch { /* ignore */ }

  let meta: JsonObj = {}
  try { meta = JSON.parse(report.quickAnalysis as string || '{}')?.reportMeta || {} } catch { /* */ }

  const rawBuffers = await loadImageBuffers(undefined, report.imageKey)
  const images = await prepareImages(rawBuffers)
  const user = await prisma.user.findUnique({ where: { id: report.userId } })

  return {
    quickContext,
    meta: {
      userName: meta.userName || user?.name || '用户',
      gender: meta.gender || user?.gender || '未填写',
      lang: 'zh',
      hasReference: meta.hasReference || false,
    },
    images,
  }
}

/**
 * 所有模块完成后合并校验并落库（由 deepJob 的 onComplete 回调调用）
 * 返回规范化后的完整分析结果，供流式「done」事件直接下发给前端
 */
async function finalizeDeepAnalysis(reportId: string, merged: JsonObj): Promise<JsonObj> {
  const validation = validateAndNormalize(merged)
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
  if (tcValidation.texture.data) validation.normalizedData.texture = tcValidation.texture.data
  if (tcValidation.composition.data) validation.normalizedData.composition = tcValidation.composition.data

  // 注入元数据
  validation.normalizedData.reportMeta = {
    ...(merged.reportMeta || {}),
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

  const serialized = serializeAnalysisData(validation.normalizedData)
  // await 落库，保证 SSE done 下发前数据已持久化（避免进程崩溃丢失付费分析结果）
  try {
    await prisma.report.update({
      where: { id: reportId },
      data: { analysis: serialized, analysisVersion: validation.schemaVersion, analysisType: 'DEEP' },
    })
    await createHealthSnapshot(reportId).catch(() => {})
  } catch (e) {
    logError('DeepSave', e)
  }

  // 清除报告缓存，确保后续查询拿到最新 DEEP 数据
  reportCache.delete(reportId)

  return validation.normalizedData
}

/**
 * 触发并行深度分析（幂等）：立即返回，生成在后台进行。
 * 真正的逐模块结果通过 /deep-analysis/stream (SSE) 实时推送。
 */
app.post('/api/report/:id/deep-analysis', async (req, res) => {
  try {
    const reportId = req.params.id
    const report = await prisma.report.findFirst({ where: { id: reportId, isDeleted: false } })
    if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
    if (!canAccessReport(req, report)) return res.status(403).json({ code: 403, message: '无权操作该报告' })
    if (report.analysisType === 'DEEP') {
      return res.json({ code: 0, data: { reportId, status: 'ALREADY_DEEP', isUnlocked: true }, message: '已存在深度分析' })
    }
    const ctx = await buildDeepContext(report)
    ensureDeepJob(reportId, ctx, (merged, rid) => finalizeDeepAnalysis(rid, merged))
    res.json({ code: 0, data: { reportId, status: 'GENERATING', isUnlocked: true }, message: '深度分析生成中' })
  } catch (err) {
    logError('DeepAnalysis', err)
    res.status(500).json({ code: 5001, message: '深度分析启动失败，请稍后重试' })
  }
})

/**
 * 流式推送并行深度分析进度（SSE）：
 * - 模块完成即下发 {type:'module'}，前端立即渲染该模块
 * - 全部完成下发 {type:'done', analysis}（规范化完整数据）
 * - 已存在 DEEP 结果或正在生成均可安全重连
 */
app.get('/api/report/:id/deep-analysis/stream', async (req, res) => {
  const reportId = req.params.id
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const send = (e: SSEMsg) => { try { res.write(`data: ${JSON.stringify(e)}\n\n`) } catch { /* */ } }

  const report = await prisma.report.findFirst({ where: { id: reportId, isDeleted: false } })
  if (!report) { send({ type: 'error', key: '_', error: 'not found' }); return res.end() }
  if (!canAccessReport(req, report)) { send({ type: 'error', key: '_', error: 'forbidden' }); return res.end() }

  // 已完成：直接下发最终结果
  if (report.analysisType === 'DEEP') {
    let analysis: JsonObj = {}
    try { analysis = JSON.parse(report.analysis as string || '{}') } catch { /* */ }
    send({ type: 'init', modules: MODULES.map(m => ({ key: m.key })) })
    send({ type: 'done', analysis })
    return res.end()
  }

  // 否则构建上下文并（懒）启动 / 接入并行任务
  let ctx: DeepCtx
  try {
    ctx = await buildDeepContext(report)
  } catch (err) {
    logError('DeepStreamCtx', err)
    send({ type: 'error', key: '_', error: 'context failed' })
    return res.end()
  }
  ensureDeepJob(reportId, ctx, (merged, rid) => finalizeDeepAnalysis(rid, merged))
  const unsub = subscribeJob(reportId, send)
  const hb = setInterval(() => { try { res.write(': ping\n\n') } catch { /* */ } }, 15000)
  req.on('close', () => { clearInterval(hb); unsub() })
})
// ==================== 报告查询 ====================

app.get('/api/report-direct/:id', async (req, res) => {
  // 尝试从缓存获取（减少重复 JSON.parse + validateTextureComposition 开销）
  // 带 t 参数跳过缓存（用于轮询获取最新数据）
  const skipCache = req.query._t !== undefined
  if (!skipCache) {
    const cached = getReportCache(req.params.id)
    if (cached) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached)
    }
  }

  const report = await prisma.report.findFirst({ where: { id: req.params.id } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  if (report.isDeleted) return res.status(404).json({ code: 3002, message: '报告已删除' })
  if (!canAccessReport(req, report)) return res.status(403).json({ code: 403, message: '无权访问该报告' })

  // 获取数据源：深度分析 > 快速分析
  let analysis: JsonObj = {}
  let analysisType = report.analysisType

  try {
    if (report.analysisType === 'DEEP') {
      analysis = JSON.parse(report.analysis as string || '{}')
    } else if (report.analysisType === 'QUICK') {
      analysis = JSON.parse(report.quickAnalysis as string || '{}')
    }
  } catch { analysis = {} }

  // 如果有 reportMeta 数据（快速分析），补充元数据
  let quickMeta: JsonObj = {}
  try { quickMeta = JSON.parse(report.quickAnalysis as string || '{}')?.reportMeta || {} } catch { /* */ }

  if (!analysis.reportMeta) {
    analysis.reportMeta = quickMeta
  }

  let responseData: JsonObj

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
      responseData = {
        code: 0,
        data: {
          ...baseResponse,
          isDeepAnalysisPending: true,
        },
        message: 'ok',
      }
    } else {
      responseData = {
        code: 0,
        data: baseResponse,
        message: 'ok',
      }
    }
  } else {
    // 深度分析完成：返回全部
    // 对质地/成分进行知识库验证（已有 _textureValid 标记可跳过）
    const needTCValidate = (analysis.texture?.type || analysis.composition?.type) &&
      (analysis._textureValid === undefined || analysis._compositionValid === undefined)
    const tcValid = needTCValidate
      ? validateTextureComposition(analysis)
      : { texture: { valid: analysis._textureValid ?? false, data: null, dbEntry: null }, composition: { valid: analysis._compositionValid ?? false, data: null, dbEntry: null } }

    // 用验证后的数据增强（如果已有 _textureValid 标记，以存储时的验证为准）
    const finalAnalysis = { ...analysis }
    if (needTCValidate) {
      if (tcValid.texture.valid && tcValid.texture.data && !analysis._textureValid) {
        finalAnalysis.texture = tcValid.texture.data
      }
      if (tcValid.composition.valid && tcValid.composition.data && !analysis._compositionValid) {
        finalAnalysis.composition = tcValid.composition.data
      }
    }
    finalAnalysis._textureValid = analysis._textureValid ?? tcValid.texture.valid
    finalAnalysis._compositionValid = analysis._compositionValid ?? tcValid.composition.valid

    // Ensure sampleImage fallback
    if (!finalAnalysis.reportMeta?.sampleImage) {
      if (!finalAnalysis.reportMeta) finalAnalysis.reportMeta = {}
      finalAnalysis.reportMeta.sampleImage = report.imageUrl
    }

    responseData = {
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
        // pollInterval: 告诉前端数据已稳定，无需继续轮询
        pollInterval: 0,
      },
      message: 'ok',
    }
  }

  // 如果数据稳定（不是 PENDING），加入缓存
  if (analysisType !== 'PENDING') {
    setReportCache(req.params.id, responseData)
  }
  res.setHeader('X-Cache', 'MISS')
  res.json(responseData)
})

// ==================== 报告解锁（触发深度分析） ====================

app.post('/api/report/:id/unlock', async (req, res) => {
  const { unlockType, userId } = req.body
  const reportId = req.params.id
  if (!UNLOCK_TYPES.includes(unlockType)) {
    return res.status(400).json({ code: 2001, message: '无效的解锁类型' })
  }

  const report = await prisma.report.findFirst({ where: { id: reportId, isDeleted: false } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  if (!canAccessReport(req, report)) return res.status(403).json({ code: 403, message: '无权操作该报告' })
  if (report.isUnlocked) return res.status(400).json({ code: 3003, message: '报告已解锁' })

  try {
    const uid = userId || report.userId

    // 机构码解锁：免付费
    if (unlockType === 'INSTITUTION') {
      await prisma.report.update({
        where: { id: reportId },
        data: { isUnlocked: true, unlockedAt: new Date(), unlockType: 'INSTITUTION' },
      })
      const needsDeepAnalysis = report.analysisType !== 'DEEP'
      return res.json({
        code: 0,
        data: { reportId, isUnlocked: true, unlockType: 'INSTITUTION', needsDeepAnalysis },
        message: needsDeepAnalysis ? '机构码解锁成功，深度分析进行中' : '机构码解锁成功',
      })
    }

    // 年费会员自动解锁，无需付费
    const isAnnual = await checkAnnualMember(uid)
    if (isAnnual) {
      await prisma.report.update({
        where: { id: reportId },
        data: { isUnlocked: true, unlockedAt: new Date(), unlockType: 'ANNUAL' },
      })
      const needsDeepAnalysis = report.analysisType !== 'DEEP'
      return res.json({
        code: 0,
        data: { reportId, isUnlocked: true, unlockType: 'ANNUAL', needsDeepAnalysis },
        message: needsDeepAnalysis ? '年费会员已解锁，深度分析进行中' : '年费会员已解锁',
      })
    }
    // 先标记解锁
    await prisma.report.update({
      where: { id: reportId },
      data: { isUnlocked: true, unlockedAt: new Date(), unlockType },
    })

    if (unlockType === 'ANNUAL') {
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
  if (!canAccessReport(req, report)) return res.status(403).json({ code: 403, message: '无权删除该报告' })

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
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
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
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
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
  if (!canAccessUser(req, userId)) return res.status(403).json({ code: 403, message: '无权修改' })
  // Only accept non-sensitive fields — birthday/email/address/emergencyContact removed
  const { name, age, gender, healthGoal, medicalHistory, dietaryPreference, notes } = req.body

  // Input validation & sanitization
  const sanitizedName = typeof name === 'string' ? name.trim().slice(0, 50) : undefined
  const sanitizedAge = age !== undefined ? (typeof age === 'number' ? Math.min(Math.max(Math.floor(age), 1), 150) : undefined) : undefined
  const sanitizedGender = gender === 'male' || gender === 'female' ? gender : undefined
  const sanitizedHealthGoal = typeof healthGoal === 'string' ? healthGoal.trim().slice(0, 100) : undefined
  const sanitizedMedical = typeof medicalHistory === 'string' ? medicalHistory.trim().slice(0, 500) : undefined
  const sanitizedDiet = typeof dietaryPreference === 'string' ? dietaryPreference.trim().slice(0, 200) : undefined
  const sanitizedNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : undefined

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: sanitizedName,
        age: sanitizedAge,
        gender: sanitizedGender,
        healthGoal: sanitizedHealthGoal,
      },
    })

    let profile = await prisma.customerProfile.findFirst({ where: { userId } })
    if (profile) {
      profile = await prisma.customerProfile.update({
        where: { id: profile.id },
        data: { medicalHistory: sanitizedMedical, dietaryPreference: sanitizedDiet, notes: sanitizedNotes },
      })
    } else {
      profile = await prisma.customerProfile.create({
        data: { userId, medicalHistory: sanitizedMedical, dietaryPreference: sanitizedDiet, notes: sanitizedNotes },
      })
    }

    res.json({ code: 0, data: { profile }, message: '档案更新成功' })
  } catch (err) {
    logError('ProfileUpdate', err)
    res.status(500).json({ code: 5001, message: '档案更新失败' })
  }
})

// ==================== 会员状态查询 ====================

app.get('/api/user/:userId/membership', async (req, res) => {
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } })
    if (!user) return res.status(404).json({ code: 3002, message: '用户不存在' })

    const isAnnual = user.memberType === 'ANNUAL' && !!user.memberExpireAt && user.memberExpireAt > new Date()
    const daysUntilExpiry = user.memberExpireAt
      ? Math.ceil((user.memberExpireAt.getTime() - Date.now()) / 86400000)
      : null

    res.json({
      code: 0,
      data: {
        memberType: isAnnual ? 'ANNUAL' : 'FREE',
        memberExpireAt: user.memberExpireAt,
        daysUntilExpiry,
        isExpired: !isAnnual && user.memberType === 'ANNUAL',
        needsRenewal: isAnnual && daysUntilExpiry !== null && daysUntilExpiry <= 30,
      },
      message: 'ok',
    })
  } catch (err) {
    logError('MembershipStatus', err)
    res.status(500).json({ code: 5001, message: '查询会员状态失败' })
  }
})

// ==================== 支付 ====================

app.post('/api/payment/create', strictRateLimiter(), async (req, res) => {
  const { productType, userId, reportId } = req.body
  if (!PRODUCT_TYPES.includes(productType)) {
    return res.status(400).json({ code: 2001, message: '无效的产品类型' })
  }
  const amount = productType === 'ANNUAL_MEMBER' ? 59 : 9.9

  try {
    // 已登录优先用 token 中的用户；否则用请求体 userId；再否则回退 direct
    let uid = req.user?.userId || userId
    if (!uid) uid = (await getOrCreateDirectUser()).id

    const tradeNo = `PPK${Date.now()}${uuid().slice(0, 8)}`
    const payment = await prisma.payment.create({
      data: { userId: uid, amount, productType, tradeNo, reportId: productType === 'PER_REPORT' ? reportId : null, status: 'PENDING' },
    })

    try {
      const result = await createOrder(uid, productType, amount, 'native', tradeNo)
      if (result.payUrl) {
        return res.json({ code: 0, data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'h5', payUrl: result.payUrl, amount, productType }, message: 'ok' })
      }
      if (result.codeUrl) {
        return res.json({ code: 0, data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'native', codeUrl: result.codeUrl, amount, productType }, message: 'ok' })
      }
      // 开发环境未配置微信支付时的演示回退
      return res.json({
        code: 0,
        data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'demo', demoMode: true, amount, productType },
        message: '微信支付暂不可用，已切换演示模式',
      })
    } catch (payErr) {
      logError('WechatPay', payErr)
      if (config.isProduction) {
        return res.status(503).json({ code: 4002, message: '支付服务暂不可用，请稍后重试' })
      }
    }

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

  // 如果数据库状态还是 PENDING，主动查询微信支付
  if (payment.status === 'PENDING' && payment.tradeNo) {
    try {
      const { queryWechatPayStatus } = await import('./services/payment')
      const wechatStatus = await queryWechatPayStatus(payment.tradeNo)
      if (wechatStatus === 'PAID') {
        // 重新查询数据库（simulateDemoPayment 已更新）
        const updated = await prisma.payment.findUnique({ where: { id: payment.id } })
        return res.json({ code: 0, data: { status: updated?.status || 'PAID', tradeNo: payment.tradeNo }, message: 'ok' })
      }
    } catch (err) {
      logError('PaymentQuery', err)
    }
  }

  res.json({ code: 0, data: { status: payment.status, tradeNo: payment.tradeNo }, message: 'ok' })
})

app.post('/api/payment/notify', async (req, res) => {
  try {
    const success = await handleWechatNotify(req.headers as Record<string, string>, req.body)
    // 微信要求：成功返回 200 + {"code":"SUCCESS"}，失败返回 200 + {"code":"FAIL"}（非 200 会重试）
    res.status(200).json({ code: success ? 'SUCCESS' : 'FAIL', message: success ? 'OK' : '处理失败' })
  } catch (err) {
    logError('WechatNotify', err)
    res.status(200).json({ code: 'FAIL', message: '服务异常' })
  }
})

app.post('/api/payment/demo-pay', strictRateLimiter(), async (req, res) => {
  // 演示支付仅在开发环境可用，防止生产环境被刷成免费会员
  if (config.isProduction) {
    return res.status(403).json({ code: 403, message: '演示支付仅开发环境可用' })
  }
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

// ==================== 七天巩固饮食办法 API ====================

app.get('/api/recovery-guide', async (_req, res) => {
  try {
    const guides = await prisma.recoveryGuide.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    const result = guides.map(g => ({
      id: g.id,
      sectionId: g.sectionId,
      title: g.title,
      content: JSON.parse(g.content),
      summary: g.summary,
      sortOrder: g.sortOrder,
    }))
    res.json({ code: 0, data: result, message: 'ok' })
  } catch (err) {
    logError('RecoveryGuide', err)
    res.status(500).json({ code: 5001, message: '获取巩固饮食办法失败' })
  }
})

app.get('/api/recovery-guide/:sectionId', async (req, res) => {
  try {
    const guide = await prisma.recoveryGuide.findFirst({
      where: { sectionId: req.params.sectionId },
    })
    if (!guide) return res.status(404).json({ code: 3002, message: '章节不存在' })
    res.json({
      code: 0,
      data: {
        id: guide.id,
        sectionId: guide.sectionId,
        title: guide.title,
        content: JSON.parse(guide.content),
        summary: guide.summary,
      },
      message: 'ok',
    })
  } catch (err) {
    logError('RecoveryGuide', err)
    res.status(500).json({ code: 5001, message: '获取巩固饮食办法失败' })
  }
})

// ==================== 数据分析 API ====================

app.get('/api/data/stats/:userId', async (req, res) => {
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
  try {
    const stats = await getAggregatedStats(req.params.userId)
    res.json({ code: 0, data: stats, message: 'ok' })
  } catch (err) {
    logError('StatsQuery', err)
    res.status(500).json({ code: 5002, message: '统计数据查询失败' })
  }
})

app.get('/api/data/trend/:userId', async (req, res) => {
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
  try {
    const trend = await analyzeTrend(req.params.userId)
    res.json({ code: 0, data: trend, message: 'ok' })
  } catch (err) {
    logError('TrendAnalysis', err)
    res.status(500).json({ code: 5003, message: '趋势分析失败' })
  }
})

app.get('/api/data/timeline/:userId', async (req, res) => {
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
  try {
    const timeline = await getHealthTimeline(req.params.userId, Number(req.query.limit) || 12)
    res.json({ code: 0, data: timeline, message: 'ok' })
  } catch (err) {
    logError('TimelineQuery', err)
    res.status(500).json({ code: 5004, message: '时间线查询失败' })
  }
})

app.get('/api/data/reports/:userId', async (req, res) => {
  if (!canAccessUser(req, req.params.userId)) return res.status(403).json({ code: 403, message: '无权访问' })
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

app.get('/api/admin/customers/export', requireAdmin, async (req, res) => {
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
        ...exportData.map(row => headers.map(h => `"${String((row as JsonObj)[h] || '').replace(/"/g, '""')}"`).join(',')),
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
  logInfo('Server', `Server running on port ${config.port}`)
  logInfo('Server', 'Features: Two-stage analysis | Quick(free) + Deep(paid) | Per-report ¥9.9 / Annual ¥59')
})

async function gracefulShutdown(signal: string) {
  logInfo('Shutdown', `Received ${signal}, gracefully shutting down...`)
  cleanupCacheInterval()
  cleanupReportCache()
  server.close(async () => {
    await disconnectPrisma()
    logInfo('Shutdown', 'Done.')
    process.exit(0)
  })
  setTimeout(() => { logInfo('Shutdown', 'Forced exit.'); process.exit(1) }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
