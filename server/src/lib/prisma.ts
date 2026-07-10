import { PrismaClient } from '@prisma/client'

// 单例 PrismaClient — 解决 6 个独立实例的连接泄漏
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 优雅关闭
export async function disconnectPrisma() {
  await prisma.$disconnect()
}
