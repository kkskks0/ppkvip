import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function saveFile(buffer: Buffer, originalName: string, _userId: string): { filePath: string; fileName: string; previewUrl: string } {
  ensureDir(UPLOAD_DIR)

  const ext = path.extname(originalName) || '.jpg'
  const fileName = `${uuid()}${ext}`
  const filePath = path.join(UPLOAD_DIR, fileName)

  fs.writeFileSync(filePath, buffer)
  return { filePath, fileName, previewUrl: `/uploads/${fileName}` }
}

export function readFile(filePath: string): Buffer {
  // Try direct path first, then find in uploads
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath)
  // Search in uploads directory
  const fileName = path.basename(filePath)
  const localPath = path.join(UPLOAD_DIR, fileName)
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath)
  throw new Error(`File not found: ${filePath}`)
}
