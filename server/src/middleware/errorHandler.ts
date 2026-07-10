import { Request, Response, NextFunction } from 'express'
import { logError } from '../utils/logger'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logError('GlobalHandler', err)
  res.status(500).json({ code: 5000, message: '服务异常，请稍后重试' })
}
