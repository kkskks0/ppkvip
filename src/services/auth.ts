import api from './api'
import type { ApiResponse, User } from '../types'

export async function sendCode(phone: string) {
  const res = await api.post<ApiResponse<null>>('/auth/send-code', { phone })
  return res.data
}

export async function login(phone: string, code: string) {
  const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { phone, code })
  return res.data
}

export async function getMe() {
  const res = await api.get<ApiResponse<User>>('/auth/me')
  return res.data
}
