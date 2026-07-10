export interface User {
  id: string
  phone: string
  name?: string
  age?: number
  memberType: 'FREE' | 'ANNUAL'
  memberExpireAt?: string
  createdAt: string
  updatedAt: string
}
