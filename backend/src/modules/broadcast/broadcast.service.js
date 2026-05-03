import { db } from '../../core/db.js'

const nowUtc = () => new Date()

/**
 * Diffusion actuellement prévue au calendrier (fenêtre dates + flag actif).
 * @returns {Promise<null | import('@prisma/client').AdminBroadcast>}
 */
export const getEffectiveBroadcastRecord = async () => {
  const now = nowUtc()
  const rows = await db.adminBroadcast.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  })
  return rows[0] ?? null
}

/**
 * @returns {Promise<null | { id: string, title: string, body: string }>}
 */
export const getBroadcastForPlayer = async (userId, { excludeAdmin } = { excludeAdmin: true }) => {
  if (!userId) return null
  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      lastDismissedBroadcastId: true,
      isAdmin: true,
      isSuspended: true,
    },
  })
  if (!u || u.isSuspended || (excludeAdmin && u.isAdmin)) return null
  const row = await getEffectiveBroadcastRecord()
  if (!row) return null
  if (u.lastDismissedBroadcastId === row.id) return null
  return { id: row.id, title: row.title, body: row.body }
}

/**
 * @param {string} userId
 * @param {string} broadcastId
 */
export const dismissBroadcast = async (userId, broadcastId) => {
  const row = await getEffectiveBroadcastRecord()
  if (!row || row.id !== broadcastId) return { ok: true }
  await db.user.update({
    where: { id: userId },
    data: { lastDismissedBroadcastId: broadcastId },
  })
  return { ok: true }
}

/**
 * Lecture admin — annonce « courante » (même périmètre que joueurs).
 */
export const getBroadcastAdminPayload = async () => {
  const row = await getEffectiveBroadcastRecord()
  if (!row) return { broadcast: null }
  return {
    broadcast: {
      id: row.id,
      title: row.title,
      body: row.body,
      isActive: row.isActive,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      updatedAt: row.updatedAt,
    },
  }
}

/** @typedef {{ title: string, body: string, isActive: boolean, startsAt?: Date|null, endsAt?: Date|null }} PublishBody */

/**
 * Une publication active crée une **nouvelle** ligne ; les anciennes passent à inactives
 * (nouvel `id` → utilisateurs ont de nouveau la popup).
 *
 * @param {string} actorId
 * @param {PublishBody} body
 */
export const publishBroadcastAdmin = async (actorId, body) =>
  db.$transaction(async (tx) => {
    await tx.adminBroadcast.updateMany({ data: { isActive: false } })
    if (!body.isActive) {
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'ADMIN_BROADCAST_DEACTIVATE',
          meta: { reason: 'isActive_false' },
        },
      })
      return { broadcast: null }
    }
    const row = await tx.adminBroadcast.create({
      data: {
        title: body.title,
        body: body.body,
        isActive: true,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
      },
    })
    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: 'ADMIN_BROADCAST_PUBLISH',
        targetId: row.id,
        meta: { title: row.title, startsAt: row.startsAt, endsAt: row.endsAt },
      },
    })
    return {
      broadcast: {
        id: row.id,
        title: row.title,
        body: row.body,
        isActive: row.isActive,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        updatedAt: row.updatedAt,
      },
    }
  })
