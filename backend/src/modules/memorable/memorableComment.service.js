import { db } from '../../core/db.js'
import { ymdFromDbDate } from '../../core/xpAggregate.js'
import { notifyAfterMemorableComment } from './memorableComment.notify.js'

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

async function reactionSummariesForCommentIds(commentIds, viewerId) {
  const map = new Map()
  for (const id of commentIds) map.set(id, { counts: {}, myReaction: null })
  if (commentIds.length === 0) return map
  const rows = await db.memorableCommentReaction.findMany({
    where: { commentId: { in: commentIds } },
    select: { commentId: true, userId: true, kind: true },
  })
  for (const r of rows) {
    const cur = map.get(r.commentId)
    if (!cur) continue
    cur.counts[r.kind] = (cur.counts[r.kind] ?? 0) + 1
    if (r.userId === viewerId) cur.myReaction = r.kind
  }
  return map
}

async function reactionSummaryOne(commentId, viewerId) {
  const m = await reactionSummariesForCommentIds([commentId], viewerId)
  return m.get(commentId) ?? { counts: {}, myReaction: null }
}

async function reactionSummaryDailyLog(dailyLogId, viewerId) {
  const rows = await db.memorableDailyLogReaction.findMany({
    where: { dailyLogId },
    select: { userId: true, kind: true },
  })
  /** @type {Record<string, number>} */
  const counts = {}
  let myReaction = null
  for (const r of rows) {
    counts[r.kind] = (counts[r.kind] ?? 0) + 1
    if (r.userId === viewerId) myReaction = r.kind
  }
  return { counts, myReaction }
}

export async function getMemorableDailyLogReactionSummary(viewerId, dailyLogId) {
  await assertMemorableCommentsPublicForDailyLog(dailyLogId)
  return reactionSummaryDailyLog(dailyLogId, viewerId)
}

export async function setMemorableDailyLogReaction(viewerId, dailyLogId, kind) {
  await assertMemorableCommentsPublicForDailyLog(dailyLogId)
  if (kind == null) {
    await db.memorableDailyLogReaction.deleteMany({
      where: { dailyLogId, userId: viewerId },
    })
  } else {
    await db.memorableDailyLogReaction.upsert({
      where: {
        dailyLogId_userId: { dailyLogId, userId: viewerId },
      },
      create: { dailyLogId, userId: viewerId, kind },
      update: { kind },
    })
  }
  return reactionSummaryDailyLog(dailyLogId, viewerId)
}

export async function listMemorableComments(viewerId, dailyLogId) {
  await assertMemorableCommentsPublicForDailyLog(dailyLogId)
  const comments = await db.memorableComment.findMany({
    where: { dailyLogId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, username: true, avatar: true } },
    },
  })
  const summaries = await reactionSummariesForCommentIds(
    comments.map((c) => c.id),
    viewerId,
  )
  return comments.map((c) => ({
    ...c,
    reactionSummary: summaries.get(c.id) ?? { counts: {}, myReaction: null },
  }))
}

/** Autocomplétion @pseudo : sans lettres après @ → premiers comptes ; sinon filtre « contient ».
 *  Seuls les comptes suspendus sont exclus. */
export async function mentionUserSuggestions(rawQ, _viewerId) {
  const q = String(rawQ ?? '')
    .trim()
    .slice(0, 40)
  const whereBase = {
    isSuspended: false,
  }
  if (q.length < 1) {
    return db.user.findMany({
      where: whereBase,
      select: { id: true, username: true, avatar: true },
      orderBy: { username: 'asc' },
      take: 15,
    })
  }
  return db.user.findMany({
    where: {
      ...whereBase,
      username: { contains: q, mode: 'insensitive' },
    },
    select: { id: true, username: true, avatar: true },
    orderBy: { username: 'asc' },
    take: 15,
  })
}

export async function setMemorableCommentReaction(viewerId, commentId, kind) {
  const c = await db.memorableComment.findUnique({
    where: { id: commentId },
    select: { id: true, dailyLogId: true },
  })
  if (!c) throw { status: 404, message: 'Commentaire introuvable' }
  await assertMemorableCommentsPublicForDailyLog(c.dailyLogId)

  if (kind == null) {
    await db.memorableCommentReaction.deleteMany({
      where: { commentId, userId: viewerId },
    })
  } else {
    await db.memorableCommentReaction.upsert({
      where: {
        commentId_userId: { commentId, userId: viewerId },
      },
      create: { commentId, userId: viewerId, kind },
      update: { kind },
    })
  }

  return reactionSummaryOne(commentId, viewerId)
}

export async function createMemorableComment(viewerId, dailyLogId, bodyRaw) {
  await assertMemorableCommentsPublicForDailyLog(dailyLogId)
  const body = String(bodyRaw ?? '').trim().slice(0, 500)
  if (!body) throw { status: 400, message: 'Commentaire vide' }
  const row = await db.memorableComment.create({
    data: { dailyLogId, authorUserId: viewerId, body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, username: true, avatar: true } },
    },
  })

  void (async () => {
    try {
      await notifyAfterMemorableComment({
        dailyLogId,
        authorUserId: viewerId,
        authorUsername: row.author.username,
        body: row.body,
      })
    } catch (e) {
      console.warn('[memorable-comment] notification e-mail', e?.message)
    }
  })()

  return {
    ...row,
    reactionSummary: { counts: {}, myReaction: null },
  }
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
