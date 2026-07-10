import { create } from 'zustand'
import type { User } from '../types'
import * as authService from '../services/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isMember: boolean
  login: (phone: string, code: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isMember: false,

  login: async (phone, code) => {
    const res = await authService.login(phone, code)
    if (res.code === 0) {
      localStorage.setItem('token', res.data.token)
      set({
        token: res.data.token,
        user: res.data.user,
        isAuthenticated: true,
        isMember: res.data.user.memberType === 'ANNUAL',
      })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, isAuthenticated: false, isMember: false })
  },

  loadUser: async () => {
    try {
      const res = await authService.getMe()
      if (res.code === 0) {
        set({ user: res.data, isMember: res.data.memberType === 'ANNUAL' })
      }
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false, isMember: false })
    }
  },
}))
