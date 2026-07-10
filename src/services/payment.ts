import api from './api'
import type { ApiResponse } from '../types'

export interface PaymentResult {
  paymentId: string
  tradeNo: string
  payType: 'h5' | 'native'
  payUrl?: string
  codeUrl?: string
}

export async function createOrder(productType: string) {
  const res = await api.post<ApiResponse<PaymentResult>>('/payment/create', { productType })
  return res.data
}

export async function getPaymentStatus(paymentId: string) {
  const res = await api.get<ApiResponse<{ status: string }>>(`/payment/${paymentId}/status`)
  return res.data
}
