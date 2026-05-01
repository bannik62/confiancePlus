import { db } from '../../core/db.js'
import { ymdFromDbDate } from '../../core/xpAggregate.js'

/** Même règle d’affichage que le leaderboard : jour ancré, consentement + contenu. */
export const sharedMemorableFromDailyLogs = (dailyLogs, anchorYmd) => {
  const row = Array.isArray(dailyLogs)
    ? dailyLogs.find((x) => ymdFromDbDate(x.date) === anchorYmd)
    : null
  if (!row || row.shareMemorableInLeaderboard !== true) return null
  const text = typeof row.journal === 'string' ? row.journal.trim() : ''
  const imageUrl = typeof row.memorableImageUrl === 'string' ? row.memorableImageUrl : null
  if (!text && !imageUrl) return null
  return {
    text: text || null,
    imageUrl,
    dailyLogId: row.id,
  }
}

const memorableWouldShowInLeaderboard = (log) => {
  if (!log?.shareMemorableInLeaderboard) return false
  const text = typeof log.journal === 'string' ? log.journal.trim() : ''
  const imageUrl = typeof log.memorableImageUrl === 'string' ? log.memorableImageUrl : null
  return !!(text || imageUrl)
}

export async function attachMemorableCommentCounts(leaderboardRows) {
  const ids = [
    ...new Set(
      leaderboardRows.map((r) => r.memorable?.dailyLogId).filter(Boolean),
    ),
  ]
  if (ids.length === 0) return leaderboardRows
  const grouped = await db.memorableComment.groupBy({
    by: ['dailyLogId'],
    where: { dailyLogId: { in: ids } },
    _count: { _all: true },
  })
  const map = new Map(grouped.map((g) => [g.dailyLogId, g._count._all]))
  return leaderboardRows.map((r) => {
    if (!r.memorable?.dailyLogId) return r
    return {
      ...r,
      memorable: {
        ...r.memorable,
        commentCount: map.get(r.memorable.dailyLogId) ?? 0,
      },
    }
  })
}

/** Tout compte connecté (non suspendu, via router) peut lire / écrire tant que le moment est partagé au classement. */
async function assertMemorableCommentsPublicForDailyLog(dailyLogId) {
  const log = await db.dailyLog.findUnique({
    where: { id: dailyLogId },
    select: {
      userId: true,
      shareMemorableInLeaderboard: true,
      memorableImageUrl: true,
      journal: true,
    },
  })
  if (!log) throw { status: 404, message: 'Journal du jour introuvable' }
  if (!memorableWouldShowInLeaderboard(log))
    throw { status: 403, message: 'Moment mémorable non partagé' }
  return log
}

export async function listMemorableComments(_viewerId, dailyLogId) {
  await assertMemorableCommentsPublicForDailyLog(dailyLogId)
  return db.memorableComment.findMany({
    where: { dailyLogId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, username: true, avatar: true } },
    },
  })
}

export async function createMemorableComment(viewerId, dailyLogId, bodyRaw) {
  await assertMemorableCommentsPublicForDailyLog(dailyLogId)
  const body = String(bodyRaw ?? '').trim().slice(0, 500)
  if (!body) throw { status: 400, message: 'Commentaire vide' }
  return db.memorableComment.create({
    data: { dailyLogId, authorUserId: viewerId, body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, username: true, avatar: true } },
    },
  })
}

export async function deleteMemorableComment(viewerId, commentId) {
  const c = await db.memorableComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorUserId: true, dailyLogId: true },
  })
  if (!c) throw { status: 404, message: 'Commentaire introuvable' }
  if (c.authorUserId !== viewerId) throw { status: 403, message: 'Suppression refusée' }
  await assertMemorableCommentsPublicForDailyLog(c.dailyLogId)
  await db.memorableComment.delete({ where: { id: commentId } })
  return { ok: true }
}
