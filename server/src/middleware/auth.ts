import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 1001, message: '未登录' })
  }

  try {
    const token = authHeader.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ code: 1002, message: 'Token已过期' })
  }
}
