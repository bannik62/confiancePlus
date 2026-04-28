import { db } from '../../core/db.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'

const todayDateUtc = () => new Date(new Date().toISOString().slice(0, 10))

/** YYYY-MM-DD → Date à midi UTC (aligné jour calendaire en BDD @db.Date) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/** dateStr optionnel = jour local du client (YYYY-MM-DD) */
export const getToday = (userId, dateStr) => {
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateFromYMD(dateStr)
    : todayDateUtc()
  return db.dailyLog.findUnique({ where: { userId_date: { userId, date } } })
}

export const upsertDailyLog = async (userId, { date: dateStr, ...data }) => {
  if (await userIsAssociationOwner(userId))
    throw {
      status: 403,
      message: 'Compte éducateur association : pas de check-in / journal personnel sur ce profil.',
    }
  if (await userIsAppAdmin(userId))
    throw {
      status: 403,
      message: 'Compte administrateur : pas de check-in dans l’app.',
    }
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateFromYMD(dateStr)
    : todayDateUtc()
  const existing = await db.dailyLog.findUnique({
    where: { userId_date: { userId, date } },
    select: { memorableImageUrl: true },
  })
  let nextImageUrl = existing?.memorableImageUrl ?? null
  if (data.removeMemorableImage === true) nextImageUrl = null
  if (typeof data.memorableImageUrl === 'string' && data.memorableImageUrl.length > 0)
    nextImageUrl = data.memorableImageUrl

  const previousImageUrl = existing?.memorableImageUrl ?? null
  const shouldDeletePreviousImage =
    typeof previousImageUrl === 'string' &&
    previousImageUrl.length > 0 &&
    previousImageUrl !== nextImageUrl

  const payload = {
    mood: data.mood,
    moodReason: data.moodReason,
    sleepQuality: data.sleepQuality,
    journal: data.journal,
    shareMemorableInLeaderboard: data.shareMemorableInLeaderboard,
    memorableImageUrl: nextImageUrl,
  }

  const row = await db.dailyLog.upsert({
    where:  { userId_date: { userId, date } },
    create: { userId, date, ...payload },
    update: payload,
  })

  if (shouldDeletePreviousImage) {
    const relative = previousImageUrl
      .replace(/^\/+/, '')
      .replace(/^api\//, '')
    const absolutePath = path.resolve(process.cwd(), relative)
    fs.unlink(absolutePath).catch(() => {})
  }
  return row
}
