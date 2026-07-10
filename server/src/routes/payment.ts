import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { createOrder, getPaymentStatus, handleWechatNotify, simulateDemoPayment } from '../services/payment'

const router = Router()

// Create payment order
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const { productType, payType } = req.body
  const amount = productType === 'ANNUAL_MEMBER' ? 59.9 : 9.9

  try {
    const result = await createOrder(req.user!.userId, productType, amount, payType || 'h5')
    res.json({ code: 0, data: result, message: 'ok' })
  } catch (err) {
    console.error('Create order error:', err)
    res.status(500).json({ code: 4002, message: '创建订单失败' })
  }
})

// Query payment status
router.get('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const status = await getPaymentStatus(req.params.id)
  res.json({ code: 0, data: { status }, message: 'ok' })
})

// Demo: simulate payment success (for testing without WeChat)
router.post('/demo-pay', authMiddleware, async (req: Request, res: Response) => {
  const { tradeNo } = req.body
  if (!tradeNo) {
    return res.status(400).json({ code: 2001, message: '缺少tradeNo' })
  }
  const success = await simulateDemoPayment(tradeNo)
  if (success) {
    res.json({ code: 0, data: { status: 'PAID' }, message: '支付成功（模拟）' })
  } else {
    res.status(404).json({ code: 4001, message: '订单不存在' })
  }
})

// WeChat Pay callback
router.post('/notify', async (req: Request, res: Response) => {
  try {
    await handleWechatNotify(req.headers as Record<string, string>, req.body)
    res.json({ code: 'SUCCESS', message: 'ok' })
  } catch (err) {
    console.error('Payment notify error:', err)
    res.status(500).json({ code: 'FAIL', message: '处理失败' })
  }
})

export default router
