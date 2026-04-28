import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import sharp from 'sharp'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate }    from '../../middlewares/validate.js'
import { dailyLogSchema } from './checkin.schema.js'
import * as service from './checkin.service.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const MEMORABLE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'memorable')
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const ensureMemorableUploadDir = () => {
  fs.mkdirSync(MEMORABLE_UPLOAD_DIR, { recursive: true })
}

const memorableUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true)
    else cb(new Error('Type image non supporté (jpeg/png/webp).'))
  },
})

const parseUploadError = (err) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
    return { status: 413, message: 'Image trop volumineuse (max 5MB).' }
  return { status: 422, message: err.message || 'Upload image invalide.' }
}

const router = Router()
router.use(requireAuth)

router.get('/today', async (req, res, next) => {
  try {
    const raw = req.query.date
    const date =
      typeof raw === 'string' && YMD_RE.test(raw) ? raw : undefined
    res.json(await service.getToday(req.user.id, date))
  }
  catch (e) { next(e) }
})

router.post('/', (req, res, next) => {
  memorableUpload.single('memorableImage')(req, res, (err) => {
    if (err) return next(parseUploadError(err))
    return next()
  })
}, validate(dailyLogSchema), async (req, res, next) => {
  try {
    let memorableImageUrl
    if (req.file?.buffer) {
      ensureMemorableUploadDir()
      const filename = `${crypto.randomUUID()}.webp`
      const destination = path.join(MEMORABLE_UPLOAD_DIR, filename)
      await sharp(req.file.buffer)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toFile(destination)
      memorableImageUrl = `/api/uploads/memorable/${filename}`
    }
    res.json(await service.upsertDailyLog(req.user.id, {
      ...req.body,
      memorableImageUrl,
    }))
  } catch (e) { next(e) }
})

export default router
