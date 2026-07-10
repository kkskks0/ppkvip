import fs from 'fs/promises'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// 仅启动时调用一次，同步可接受
export function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export async function saveFileAsync(buffer: Buffer, originalName: string, _userId: string): Promise<{ filePath: string; fileName: string; previewUrl: string }> {
  ensureDir(UPLOAD_DIR)

  const ext = path.extname(originalName) || '.jpg'
  const fileName = `${uuid()}${ext}`
  const filePath = path.join(UPLOAD_DIR, fileName)

  await fs.writeFile(filePath, buffer)
  return { filePath, fileName, previewUrl: `/uploads/${fileName}` }
}

// 保留同步版本兼容旧调用
export function saveFile(buffer: Buffer, originalName: string, _userId: string): { filePath: string; fileName: string; previewUrl: string } {
  ensureDir(UPLOAD_DIR)

  const ext = path.extname(originalName) || '.jpg'
  const fileName = `${uuid()}${ext}`
  const filePath = path.join(UPLOAD_DIR, fileName)

  writeFileSync(filePath, buffer)
  return { filePath, fileName, previewUrl: `/uploads/${fileName}` }
}

export async function readFileAsync(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath)
  } catch {
    const fileName = path.basename(filePath)
    const localPath = path.join(UPLOAD_DIR, fileName)
    return await fs.readFile(localPath)
  }
}

// 保留同步版本兼容旧代码
export function readFile(filePath: string): Buffer {
  if (existsSync(filePath)) return readFileSync(filePath)
  const fileName = path.basename(filePath)
  const localPath = path.join(UPLOAD_DIR, fileName)
  if (existsSync(localPath)) return readFileSync(localPath)
  throw new Error(`File not found: ${filePath}`)
}
