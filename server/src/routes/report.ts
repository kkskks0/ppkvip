import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { generateReport, getReport, listReports } from '../services/report'
import { logError } from '../utils/logger'

const router = Router()
router.use(authMiddleware)

router.post('/generate', async (req: Request, res: Response) => {
  const { imageUrl, imageKey, userName, userAge } = req.body
  if (!imageUrl || !imageKey) {
    return res.status(400).json({ code: 2001, message: '参数缺失' })
  }

  try {
    const result = await generateReport(req.user!.userId, imageUrl, imageKey, { name: userName, age: userAge })
    res.json({ code: 0, data: result, message: 'ok' })
  } catch (err) {
    logError('AuthReportGenerate', err)
    res.status(500).json({ code: 5001, message: '图片分析失败，请稍后重试' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const report = await getReport(req.params.id, req.user!.userId)
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  res.json({ code: 0, data: report, message: 'ok' })
})

router.get('/', async (req: Request, res: Response) => {
  const reports = await listReports(req.user!.userId)
  res.json({ code: 0, data: reports, message: 'ok' })
})

export default router
