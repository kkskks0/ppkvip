import { PrismaClient } from '@prisma/client'
import { v4 as uuid } from 'uuid'
import https from 'https'
import crypto from 'crypto'
import { config } from '../config'

const prisma = new PrismaClient()
const isDemoMode = !config.wechat.privateKey

// WeChat Pay APIv3 signature
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

function signMessage(message: string, privateKey: string): string {
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(message)
  return sign.sign(privateKey, 'base64')
}

function buildAuthHeader(method: string, url: string, body: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = generateNonce()
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`
  const signature = signMessage(message, config.wechat.privateKey)
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.wechat.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.wechat.certSerialNo}"`
}

async function wechatPayRequest(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bodyStr = JSON.stringify(body)
  const authorization = buildAuthHeader('POST', path, bodyStr)

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.mch.weixin.qq.com',
        port: 443,
        path,
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'PaiPaiKan/1.0',
        },
        timeout: 30000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch { reject(new Error('WeChat Pay returned non-JSON response')) }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(bodyStr)
    req.end()
  })
}

export interface PaymentResult {
  paymentId: string
  tradeNo: string
  payType: 'h5' | 'native' | 'demo'
  payUrl?: string
  codeUrl?: string
  demoMode?: boolean
}

export async function createOrder(
  userId: string,
  productType: string,
  amount: number,
  payType: 'h5' | 'native' = 'h5',
  existingTradeNo?: string
): Promise<PaymentResult> {
  const tradeNo = existingTradeNo || `PPK${Date.now()}${uuid().slice(0, 8)}`
  const payment = existingTradeNo
    ? (await prisma.payment.findFirst({ where: { tradeNo } }))!
    : await prisma.payment.create({
      data: { userId, amount, productType, tradeNo, status: 'PENDING' },
    })

  const description = productType === 'ANNUAL_MEMBER' ? '排排看年费会员' : '排排看单次分析'
  const amountInCents = Math.round(amount * 100)

  // Demo mode: no AppID configured
  if (!config.wechat.appId) {
    console.log(`[DEMO] Payment order created: ${tradeNo}, amount: ¥${amount}`)
    return { paymentId: payment.id, tradeNo, payType: 'demo' as const, demoMode: true }
  }

  // Real WeChat Pay
  try {
    if (payType === 'h5') {
      const body = {
        appid: config.wechat.appId,
        mchid: config.wechat.mchId,
        description,
        out_trade_no: tradeNo,
        notify_url: config.wechat.notifyUrl,
        amount: { total: amountInCents, currency: 'CNY' },
        scene_info: {
          payer_client_ip: '127.0.0.1',
          h5_info: { type: 'Wap' },
        },
      }
      const result = await wechatPayRequest('/v3/pay/transactions/h5', body)
      if ((result as any).h5_url) {
        return { paymentId: payment.id, tradeNo, payType: 'h5' as const, payUrl: (result as any).h5_url }
      }
      console.error('[WeChat Pay] H5 error:', result)
    } else {
      const body = {
        appid: config.wechat.appId,
        mchid: config.wechat.mchId,
        description,
        out_trade_no: tradeNo,
        notify_url: config.wechat.notifyUrl,
        amount: { total: amountInCents, currency: 'CNY' },
      }
      const result = await wechatPayRequest('/v3/pay/transactions/native', body)
      if ((result as any).code_url) {
        return { paymentId: payment.id, tradeNo, payType: 'native' as const, codeUrl: (result as any).code_url }
      }
      console.error('[WeChat Pay] Native error:', result)
    }
  } catch (err) {
    console.error('[WeChat Pay] Request failed:', err)
  }

  // Fallback to demo mode
  return { paymentId: payment.id, tradeNo, payType: 'demo' as const, demoMode: true }
}

// Demo: simulate payment success
export async function simulateDemoPayment(tradeNo: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({ where: { tradeNo } })
  if (!payment) return false

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

  return true
}

export async function getPaymentStatus(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  return payment?.status || 'PENDING'
}

export async function handleWechatNotify(_headers: Record<string, string>, body: Record<string, unknown>) {
  const resource = body.resource as Record<string, unknown>
  const tradeNo = resource.out_trade_no as string
  return simulateDemoPayment(tradeNo)
}
