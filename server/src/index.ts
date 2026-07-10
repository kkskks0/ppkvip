import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import { saveFile } from './services/storage'
import { analyzeImage } from './services/ai'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import { logError, logWarn, categorizeError, getUserFriendlyMessage } from './utils/logger'
import { v4 as uuid } from 'uuid'
import { createOrder, handleWechatNotify } from './services/payment'
import {
  parseAiJsonResponse,
  validateAndNormalize,
  checkDataIntegrity,
  serializeAnalysisData,
  createHealthSnapshot,
  getEnrichedReports,
  getAggregatedStats,
  analyzeTrend,
  getHealthTimeline,
  getPlatformStats,
} from './data'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const app = express()
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
app.use(express.json())

// ==================== 基础 ====================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ==================== 上传 ====================

app.post('/api/upload-direct', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 2001, message: '请选择图片' })
  }
  let uid: string
  const user = await prisma.user.findFirst({ where: { phone: 'direct' } })
  if (!user) {
    const newUser = await prisma.user.create({ data: { phone: 'direct', name: 'Direct User' } })
    uid = newUser.id
  } else {
    uid = user.id
  }
  const { filePath, fileName, previewUrl } = saveFile(req.file.buffer, req.file.originalname, uid)
  res.json({ code: 0, data: { uploadId: fileName, previewUrl, filePath, userId: uid }, message: 'ok' })
})

// ==================== 报告生成（默认锁定，仅返回前半段） ====================

app.post('/api/report-generate-direct', async (req, res) => {
  const { imageUrl, imageKey, userName, hasCap, userId, gender, images, lang } = req.body
  if (!imageUrl || !imageKey) {
    return res.status(400).json({ code: 2001, message: '参数缺失' })
  }

  let uid = userId
  if (!uid) {
    let user = await prisma.user.findFirst({ where: { phone: 'direct' } })
    if (!user) {
      user = await prisma.user.create({ data: { phone: 'direct', name: 'Direct User' } })
    }
    uid = user.id
  }

  // 判断是否是老用户（有多份报告）
  let isReturningUser = false
  try {
    const reportCount = await prisma.report.count({ where: { userId: uid, isDeleted: false } })
    isReturningUser = reportCount >= 1
  } catch { /* ignore */ }

  try {
    // 创建报告记录（默认锁定）
    const report = await prisma.report.create({
      data: { userId: uid, imageUrl, imageKey, reportType: 'SINGLE_PAY', isUnlocked: false },
    })

    // 读取所有图片
    const uploadsDir = path.join(__dirname, '../uploads')
    const imageBuffers: { buffer: Buffer; mimeType: string }[] = []
    if (images && Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        const filePath = path.resolve(uploadsDir, path.basename(img.imageKey))
        if (!fs.existsSync(filePath)) {
          logWarn('ReportGenerate', `Image file not found: ${path.basename(img.imageKey)}`)
          return res.status(400).json({ code: 2002, message: '图片文件不存在，请重新上传' })
        }
        const buf = fs.readFileSync(filePath)
        const mime = img.imageKey.endsWith('.png') ? 'image/png' : 'image/jpeg'
        imageBuffers.push({ buffer: buf, mimeType: mime })
      }
    } else {
      const filePath = path.resolve(uploadsDir, path.basename(imageKey))
      if (!fs.existsSync(filePath)) {
        logWarn('ReportGenerate', `Image file not found: ${path.basename(imageKey)}`)
        return res.status(400).json({ code: 2002, message: '图片文件不存在，请重新上传' })
      }
      const buf = fs.readFileSync(filePath)
      const mime = imageKey.endsWith('.png') ? 'image/png' : 'image/jpeg'
      imageBuffers.push({ buffer: buf, mimeType: mime })
    }

    // AI 分析（传入老用户标志以使用积极语气）
    const analysisText = await analyzeImage(imageBuffers, userName || '用户', hasCap || false, gender || '未填写', lang || 'zh', isReturningUser)

    // 数据解析 + Schema校验 + 规范化
    const parseResult = parseAiJsonResponse(analysisText)
    if (!parseResult.data || !parseResult.repairable) {
      logError('JSONParse', new Error(`parse failed: ${parseResult.errors.join('; ')}`))
      return res.status(500).json({
        code: 5001,
        message: '图片识别失败，请确保图片清晰且包含肝胆排毒相关内容后重新上传',
      })
    }

    const validation = validateAndNormalize(parseResult.data)
    const integrity = checkDataIntegrity(validation.normalizedData)
    if (!integrity.passed) {
      logWarn('Integrity', `checks failed: ${integrity.checks.filter(c => !c.passed).map(c => c.name).join(', ')}`)
    }

    // 注入报告元数据
    validation.normalizedData.reportMeta = {
      userName: userName || '用户',
      gender: gender || '未填写',
      analysisTime: new Date().toLocaleString('zh-CN'),
      hasReference: hasCap,
      sampleImage: imageUrl,
      isReturningUser,
      validationInfo: {
        valid: validation.valid,
        warnings: validation.warnings,
        integrityChecks: integrity.checks,
      },
    }

    // 序列化并存储
    const serialized = serializeAnalysisData(validation.normalizedData)
    await prisma.report.update({
      where: { id: report.id },
      data: { analysis: serialized, analysisVersion: validation.schemaVersion, isUnlocked: false },
    })

    // 创建健康快照
    try {
      await createHealthSnapshot(report.id)
    } catch (snapErr) {
      logWarn('HealthSnapshot', 'creation failed (non-critical)')
    }

    // 返回报告ID和锁定状态
    res.json({
      code: 0,
      data: {
        reportId: report.id,
        status: 'COMPLETED',
        isUnlocked: false,
        isReturningUser,
      },
      message: 'ok',
    })
  } catch (err) {
    const category = categorizeError(err)
    const userMsg = getUserFriendlyMessage(category)
    logError('ReportGenerate', err)
    res.status(500).json({ code: 5001, message: userMsg })
  }
})

// ==================== 报告查询（返回锁定/解锁状态+完整/部分数据） ====================

app.get('/api/report-direct/:id', async (req, res) => {
  const report = await prisma.report.findFirst({ where: { id: req.params.id } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  if (report.isDeleted) return res.status(404).json({ code: 3002, message: '报告已删除' })

  // 反序列化分析数据
  let analysis: any = {}
  try {
    analysis = JSON.parse(report.analysis as string)
  } catch {
    analysis = {}
  }

  // 如果报告未解锁，只返回前半段（概览+颜色+形状+大小），后面的内容截断
  if (!report.isUnlocked) {
    const publicPart: any = {
      reportMeta: analysis.reportMeta,
      color: analysis.color,
      shape: analysis.shape,
      size: analysis.size,
      // 后半段标记为空，前端显示锁定UI
      _locked: true,
    }
    res.json({
      code: 0,
      data: {
        id: report.id,
        userId: report.userId,
        imageUrl: report.imageUrl,
        createdAt: report.createdAt,
        isUnlocked: false,
        analysis: publicPart,
        analysisVersion: report.analysisVersion,
      },
      message: 'ok',
    })
  } else {
    // 完整报告
    res.json({
      code: 0,
      data: {
        id: report.id,
        userId: report.userId,
        imageUrl: report.imageUrl,
        createdAt: report.createdAt,
        isUnlocked: true,
        unlockType: report.unlockType,
        analysis,
        analysisVersion: report.analysisVersion,
      },
      message: 'ok',
    })
  }
})

// ==================== 报告解锁 ====================

app.post('/api/report/:id/unlock', async (req, res) => {
  const { unlockType, userId } = req.body // unlockType: 'PER_REPORT' | 'ANNUAL'
  const reportId = req.params.id

  const report = await prisma.report.findFirst({ where: { id: reportId, isDeleted: false } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  if (report.isUnlocked) return res.status(400).json({ code: 3003, message: '报告已解锁' })

  try {
    if (unlockType === 'ANNUAL') {
      // 年费会员：解锁该用户所有报告
      const uid = userId || report.userId
      await prisma.report.updateMany({
        where: { userId: uid, isDeleted: false },
        data: { isUnlocked: true, unlockedAt: new Date(), unlockType: 'ANNUAL' },
      })
      // 更新用户会员状态
      const expireAt = new Date()
      expireAt.setFullYear(expireAt.getFullYear() + 1)
      await prisma.user.update({
        where: { id: uid },
        data: { memberType: 'ANNUAL', memberExpireAt: expireAt },
      })
    } else {
      // 按次付费：仅解锁当前报告
      await prisma.report.update({
        where: { id: reportId },
        data: { isUnlocked: true, unlockedAt: new Date(), unlockType: 'PER_REPORT' },
      })
    }

    res.json({ code: 0, data: { reportId, isUnlocked: true, unlockType }, message: '解锁成功' })
  } catch (err) {
    logError('ReportUnlock', err)
    res.status(500).json({ code: 5001, message: '解锁失败，请稍后重试' })
  }
})

// ==================== 报告删除 ====================

app.delete('/api/report-direct/:id', async (req, res) => {
  const report = await prisma.report.findFirst({ where: { id: req.params.id } })
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })

  try {
    // 软删除：标记 isDeleted
    await prisma.report.update({
      where: { id: req.params.id },
      data: { isDeleted: true, deletedAt: new Date() },
    })
    res.json({ code: 0, message: '报告已删除' })
  } catch (err) {
    logError('ReportDelete', err)
    res.status(500).json({ code: 5001, message: '删除失败，请稍后重试' })
  }
})

// ==================== 用户列表（按手机号查询） ====================

app.get('/api/user/list', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, phone: true, gender: true, age: true,
        memberType: true, memberExpireAt: true, createdAt: true,
        _count: { select: { reports: true } },
      },
    })
    res.json({ code: 0, data: users, message: 'ok' })
  } catch (err) {
    logError('UserList', err)
    res.status(500).json({ code: 5001, message: '查询用户列表失败' })
  }
})

// ==================== 用户报告列表 ====================

app.get('/api/user/:userId/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.params.userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, imageUrl: true, isUnlocked: true, unlockType: true,
        reportType: true, createdAt: true,
      },
    })
    res.json({ code: 0, data: reports, message: 'ok' })
  } catch (err) {
    logError('UserReports', err)
    res.status(500).json({ code: 5001, message: '查询报告列表失败' })
  }
})

// ==================== 用户档案 CRUD ====================

// 获取或创建用户档案
app.get('/api/user/:userId/profile', async (req, res) => {
  try {
    let profile = await prisma.customerProfile.findFirst({ where: { userId: req.params.userId } })
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } })
    if (!user) return res.status(404).json({ code: 3002, message: '用户不存在' })

    if (!profile) {
      profile = await prisma.customerProfile.create({
        data: { userId: req.params.userId },
      })
    }

    res.json({
      code: 0,
      data: {
        profile,
        user: {
          id: user.id, name: user.name, phone: user.phone,
          gender: user.gender, age: user.age, birthday: user.birthday,
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

// 更新用户档案
app.put('/api/user/:userId/profile', async (req, res) => {
  const userId = req.params.userId
  const { name, age, gender, birthday, healthGoal, email, address, emergencyContact, medicalHistory, dietaryPreference, notes } = req.body

  try {
    // 更新用户基本信息
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        age: age !== undefined ? age : undefined,
        gender: gender !== undefined ? gender : undefined,
        birthday: birthday !== undefined ? birthday : undefined,
        healthGoal: healthGoal !== undefined ? healthGoal : undefined,
      },
    })

    // 更新客户档案
    let profile = await prisma.customerProfile.findFirst({ where: { userId } })
    if (profile) {
      profile = await prisma.customerProfile.update({
        where: { id: profile.id },
        data: {
          email, address, emergencyContact, medicalHistory,
          dietaryPreference, notes,
        },
      })
    } else {
      profile = await prisma.customerProfile.create({
        data: {
          userId, email, address, emergencyContact,
          medicalHistory, dietaryPreference, notes,
        },
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
  // PER_REPORT: 9.9元  ANNUAL_MEMBER: 59元
  const amount = productType === 'ANNUAL_MEMBER' ? 59 : 9.9

  try {
    let uid = userId
    if (!uid) {
      const user = await prisma.user.findFirst({ where: { phone: 'direct' } })
      uid = user?.id || (await prisma.user.create({ data: { phone: 'direct', name: 'Direct User' } })).id
    }

    const tradeNo = `PPK${Date.now()}${uuid().slice(0, 8)}`
    const payment = await prisma.payment.create({
      data: {
        userId: uid, amount, productType, tradeNo,
        reportId: productType === 'PER_REPORT' ? reportId : null,
        status: 'PENDING',
      },
    })

    // Demo 模式（无微信支付配置时自动模拟支付）
    if (!config.wechat.appId || !config.wechat.privateKey) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: new Date() },
      })

      if (productType === 'ANNUAL_MEMBER') {
        const expireAt = new Date()
        expireAt.setFullYear(expireAt.getFullYear() + 1)
        await prisma.user.update({
          where: { id: uid },
          data: { memberType: 'ANNUAL', memberExpireAt: expireAt },
        })
      }

      return res.json({
        code: 0,
        data: { paymentId: payment.id, tradeNo, payType: 'demo', demoMode: true, amount, productType },
        message: '支付成功（演示模式）',
      })
    }

    // 真实微信支付下单
    try {
      const result = await createOrder(uid, productType, amount, 'native', tradeNo)
      if (result.payUrl) {
        return res.json({
          code: 0,
          data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'h5', payUrl: result.payUrl, amount, productType },
          message: 'ok',
        })
      }
      if (result.codeUrl) {
        return res.json({
          code: 0,
          data: { paymentId: payment.id, tradeNo: result.tradeNo, payType: 'native', codeUrl: result.codeUrl, amount, productType },
          message: 'ok',
        })
      }
    } catch (payErr) {
      logError('WechatPay', payErr)
    }

    // 微信支付失败，降级到演示模式
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

// 微信支付异步回调
app.post('/api/payment/notify', async (req, res) => {
  try {
    const success = await handleWechatNotify(req.headers as Record<string, string>, req.body)
    if (success) {
      res.status(200).json({ code: 'SUCCESS', message: 'ok' })
    } else {
      res.status(200).json({ code: 'FAIL', message: '处理失败' })
    }
  } catch (err) {
    logError('WechatNotify', err)
    res.status(500).json({ code: 'FAIL', message: '服务异常' })
  }
})

// 演示模式模拟支付（本地测试用）
app.post('/api/payment/demo-pay', async (req, res) => {
  const { tradeNo } = req.body
  try {
    const payment = await prisma.payment.findFirst({ where: { tradeNo } })
    if (!payment) return res.status(404).json({ code: 4001, message: '订单不存在' })

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date() },
    })

    if (payment.productType === 'ANNUAL_MEMBER') {
      const expireAt = new Date()
      expireAt.setFullYear(expireAt.getFullYear() + 1)
      await prisma.user.update({
        where: { id: payment.userId },
        data: { memberType: 'ANNUAL', memberExpireAt: expireAt },
      })
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
    res.status(500).json({ code: 5002, message: '统计数据查询失败，请稍后重试' })
  }
})

app.get('/api/data/trend/:userId', async (req, res) => {
  try {
    const trend = await analyzeTrend(req.params.userId)
    res.json({ code: 0, data: trend, message: 'ok' })
  } catch (err) {
    logError('TrendAnalysis', err)
    res.status(500).json({ code: 5003, message: '趋势分析失败，请稍后重试' })
  }
})

app.get('/api/data/timeline/:userId', async (req, res) => {
  try {
    const timeline = await getHealthTimeline(req.params.userId, Number(req.query.limit) || 12)
    res.json({ code: 0, data: timeline, message: 'ok' })
  } catch (err) {
    logError('TimelineQuery', err)
    res.status(500).json({ code: 5004, message: '时间线查询失败，请稍后重试' })
  }
})

app.get('/api/data/reports/:userId', async (req, res) => {
  try {
    const reports = await getEnrichedReports(
      req.params.userId,
      Number(req.query.limit) || 20,
      Number(req.query.offset) || 0
    )
    res.json({ code: 0, data: reports, message: 'ok' })
  } catch (err) {
    logError('ReportsQuery', err)
    res.status(500).json({ code: 5005, message: '报告列表查询失败，请稍后重试' })
  }
})

app.get('/api/data/platform-stats', async (_req, res) => {
  try {
    const stats = await getPlatformStats()
    res.json({ code: 0, data: stats, message: 'ok' })
  } catch (err) {
    logError('PlatformStats', err)
    res.status(500).json({ code: 5006, message: '平台统计查询失败，请稍后重试' })
  }
})

// ==================== 后台：客户档案导出 ====================

app.get('/api/admin/customers/export', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profiles: true,
        reports: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } },
        payments: { where: { status: 'PAID' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 构建导出数据
    const exportData = users.map(u => ({
      用户ID: u.id,
      姓名: u.name || '',
      手机号: u.phone,
      性别: u.gender || '',
      年龄: u.age || '',
      生日: u.birthday || '',
      健康目标: u.healthGoal || '',
      会员类型: u.memberType,
      会员到期: u.memberExpireAt?.toISOString() || '',
      邮箱: u.profiles[0]?.email || '',
      地址: u.profiles[0]?.address || '',
      紧急联系人: u.profiles[0]?.emergencyContact || '',
      既往病史: u.profiles[0]?.medicalHistory || '',
      饮食偏好: u.profiles[0]?.dietaryPreference || '',
      备注: u.profiles[0]?.notes || '',
      报告数量: u.reports.length,
      已支付订单数: u.payments.length,
      总支付金额: u.payments.reduce((s, p) => s + p.amount, 0),
      注册时间: u.createdAt.toISOString(),
    }))

    // 返回 CSV 或 JSON
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
app.get('/ppk', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})
app.get('/ppk/*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
  console.log('Features: Report lock/unlock | Per-report ¥9.9 / Annual ¥59 | Customer profile | Report delete | CSV export')
})
