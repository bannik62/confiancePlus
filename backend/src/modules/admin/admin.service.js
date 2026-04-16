import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { db } from '../../core/db.js'

const CATEGORIES = ['encouragement', 'maintien', 'felicitation']

const logAudit = async (actorId, action, targetId = null, meta) => {
  await db.adminAuditLog.create({
    data: {
      actorId,
      action,
      ...(targetId != null ? { targetId } : {}),
      ...(meta !== undefined ? { meta } : {}),
    },
  })
}

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @param {import('@prisma/client').Prisma.TransactionClient} tx */
const replacePhrasesTx = async (tx, payload) => {
  await tx.motivationalPhrase.deleteMany({})
  let order = 0
  for (const cat of CATEGORIES) {
    const phrases = payload?.[cat]?.phrases
    if (!Array.isArray(phrases)) continue
    for (const text of phrases) {
      const t = typeof text === 'string' ? text.trim() : ''
      if (!t) continue
      await tx.motivationalPhrase.create({
        data: { category: cat, text: t, sortOrder: order++, isActive: true },
      })
    }
  }
}

/** Seed / reset : JSON monorepo (hôte) ou copie embarquée sous prisma/ (Docker : seul backend monté sur /app). */
export const seedMotivationalPhrasesFromRepoJson = async () => {
  const candidates = [
    join(__dirname, '../../../..', 'frontend', 'src', 'data', 'dayMessages.json'),
    join(__dirname, '../../..', 'prisma', 'dayMessages.seed.json'),
  ]
  let payload = null
  for (const jsonPath of candidates) {
    try {
      payload = JSON.parse(readFileSync(jsonPath, 'utf8'))
      break
    } catch {
      /* essai suivant */
    }
  }
  if (!payload) return { ok: false, message: 'Fichier dayMessages (aucun chemin valide)' }
  await db.$transaction((tx) => replacePhrasesTx(tx, payload))
  return { ok: true }
}

export const getDayMessagesAdmin = async () => getDayMessagesShape()

const getDayMessagesShape = async () => {
  const base = await db.motivationalPhrase.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  })
  const out = {}
  for (const cat of CATEGORIES) {
    out[cat] = { phrases: base.filter((r) => r.category === cat).map((r) => r.text) }
  }
  return out
}

export const replaceDayMessages = async (actorId, body) => {
  await db.$transaction((tx) => replacePhrasesTx(tx, body))
  const phraseCount = await db.motivationalPhrase.count()
  await logAudit(actorId, 'DAY_MESSAGES_REPLACE', null, { phraseCount })
  return getDayMessagesShape()
}

export const listUsers = async ({ page = 0, limit = 30 }) => {
  const p = Math.max(0, parseInt(String(page), 10) || 0)
  const l = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 30))
  const [users, total] = await Promise.all([
    db.user.findMany({
      skip: p * l,
      take: l,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        isPending: true,
        isAdmin: true,
        isSuspended: true,
        createdAt: true,
        lastLoginAt: true,
        avatar: true,
      },
    }),
    db.user.count(),
  ])
  return { users, total, page: p, limit: l }
}

export const deleteUser = async (actorId, targetId) => {
  if (actorId === targetId)
    throw { status: 403, message: 'Suppression de ton propre compte interdite depuis l’admin.' }

  const target = await db.user.findUnique({ where: { id: targetId } })
  if (!target) throw { status: 404, message: 'Utilisateur introuvable' }

  if (target.isAdmin) {
    const adminCount = await db.user.count({ where: { isAdmin: true } })
    if (adminCount <= 1) throw { status: 403, message: 'Impossible de supprimer le dernier administrateur' }
  }

  await logAudit(actorId, 'USER_DELETE', targetId, {
    username: target.username,
    email: target.email ?? null,
  })
  await db.user.delete({ where: { id: targetId } })
  return { ok: true }
}

export const setUserSuspended = async (actorId, targetId, suspended) => {
  if (actorId === targetId)
    throw { status: 403, message: 'Tu ne peux pas suspendre ou réactiver ton propre compte depuis l’admin.' }

  const target = await db.user.findUnique({ where: { id: targetId } })
  if (!target) throw { status: 404, message: 'Utilisateur introuvable' }

  if (suspended && target.isAdmin) {
    const otherActiveAdmins = await db.user.count({
      where: {
        isAdmin: true,
        isSuspended: false,
        id: { not: targetId },
      },
    })
    if (otherActiveAdmins < 1)
      throw { status: 403, message: 'Impossible de suspendre le dernier administrateur actif' }
  }

  await db.user.update({
    where: { id: targetId },
    data: { isSuspended: suspended },
  })
  await logAudit(actorId, suspended ? 'USER_SUSPEND' : 'USER_UNSUSPEND', targetId, {
    username: target.username,
  })
  return { ok: true, id: targetId, isSuspended: suspended }
}

export const listAudit = async ({ limit = 50 }) => {
  const l = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50))
  const items = await db.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: l,
  })
  return { items }
}

export const listGroups = async () => {
  const rows = await db.group.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true } } },
  })
  return {
    groups: rows.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      inviteCode: g.inviteCode,
      createdAt: g.createdAt,
      memberCount: g._count.members,
    })),
  }
}
