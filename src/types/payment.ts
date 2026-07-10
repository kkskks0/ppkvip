export interface Payment {
  id: string
  userId: string
  amount: number
  productType: 'SINGLE_ANALYSIS' | 'ANNUAL_MEMBER'
  tradeNo: string
  prepayId?: string
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'CLOSED'
  createdAt: string
  paidAt?: string
}
