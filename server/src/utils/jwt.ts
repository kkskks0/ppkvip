import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface JwtPayload {
  userId: string
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}
