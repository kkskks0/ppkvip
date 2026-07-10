import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

router.get('/profile', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  res.json({ code: 0, data: user, message: 'ok' })
})

router.put('/profile', async (req: Request, res: Response) => {
  const { name, age } = req.body
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name, age },
  })
  res.json({ code: 0, data: user, message: 'ok' })
})

router.get('/membership', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  res.json({
    code: 0,
    data: { memberType: user?.memberType, memberExpireAt: user?.memberExpireAt },
    message: 'ok',
  })
})

export default router
