import { Prisma } from '@prisma/client'
import { db } from '../../core/db.js'

/**
 * Totaux de réactions reçues par joueur (toutes perfs, toutes dates).
 * @param {string[]} userIds
 * @returns {Promise<Map<string, { perfReactionHearts: number, perfReactionSkeptics: number }>>}
 */
export const getPerfReactionTotalsByUserIds = async (userIds) => {
  const map = new Map()
  for (const id of userIds) {
    map.set(id, { perfReactionHearts: 0, perfReactionSkeptics: 0 })
  }
  if (userIds.length === 0) return map

  /** @type {{ userId: string, kind: string, c: number }[]} */
  const rows = await db.$queryRaw`
    SELECT h."userId" AS "userId", r.kind::text AS kind, COUNT(*)::int AS c
    FROM "HabitPerfReaction" r
    INNER JOIN "Habit" h ON h.id = r."habitId"
    WHERE h."userId" IN (${Prisma.join(userIds)})
    GROUP BY h."userId", r.kind
  `

  for (const row of rows) {
    const prev = map.get(row.userId)
    if (!prev) continue
    if (row.kind === 'HEART') prev.perfReactionHearts = row.c
    else if (row.kind === 'SKEPTIC') prev.perfReactionSkeptics = row.c
  }
  return map
}
