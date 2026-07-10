import { Router, Request, Response } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import { saveFile } from '../services/storage'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.use(authMiddleware)

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ code: 2001, message: '请选择图片' })
  }

  const { filePath, fileName } = saveFile(req.file.buffer, req.file.originalname, req.user!.userId)
  const previewUrl = `/uploads/${fileName}`

  res.json({
    code: 0,
    data: { uploadId: fileName, previewUrl, filePath },
    message: 'ok',
  })
})

export default router
