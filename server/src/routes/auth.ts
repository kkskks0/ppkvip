import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { signToken } from '../utils/jwt'

const router = Router()
const prisma = new PrismaClient()

// Simple in-memory code store for dev (no SMS service)
const codeStore = new Map<string, { code: string; expires: number }>()

// For development: any phone gets code "123456" automatically
router.post('/send-code', async (req: Request, res: Response) => {
  const { phone } = req.body
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ code: 2001, message: '手机号格式错误' })
  }

  const code = '123456' // Fixed dev code, no SMS
  codeStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 })

  console.log(`[验证码] ${phone}: ${code} (开发模式，固定验证码)`)
  res.json({ code: 0, data: null, message: 'ok' })
})

router.post('/login', async (req: Request, res: Response) => {
  const { phone, code } = req.body
  if (!phone || !code) {
    return res.status(400).json({ code: 2001, message: '参数缺失' })
  }

  const stored = codeStore.get(phone)
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ code: 1003, message: '验证码错误或已过期' })
  }

  codeStore.delete(phone)

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  })

  const token = signToken(user.id)
  res.json({ code: 0, data: { token, user }, message: 'ok' })
})

router.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) return res.status(404).json({ code: 3002, message: '用户不存在' })
  res.json({ code: 0, data: user, message: 'ok' })
})

export default router
