import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { db } from '../../core/db.js'
import {
  getPushSettingsAdmin,
  setDefaultReminderHour as setDefaultReminderHourSvc,
  sendTestGiftNotification,
} from '../push/push.service.js'
import { sendMail, isMailConfigured } from '../../core/emailService.js'

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
  const [rows, total] = await Promise.all([
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
        _count: { select: { pushSubscriptions: true } },
      },
    }),
    db.user.count(),
  ])
  const users = rows.map(({ _count, ...u }) => ({
    ...u,
    pushSubscriptionCount: _count.pushSubscriptions,
  }))
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

export const getDailyHabitTemplatesAdmin = async () => {
  const templates = await db.dailyHabitTemplate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  return { templates }
}

/** Remplace ou met à jour les modèles (sync par id ; entrées absentes → désactivées). */
export const replaceDailyHabitTemplates = async (actorId, body) => {
  const templates = body.templates.filter((t) => String(t.title ?? '').trim())
  if (!templates.length) throw { status: 400, message: 'Au moins une habitude avec un titre est requise.' }

  const incomingIds = templates.map((t) => t.id).filter(Boolean)

  await db.$transaction(async (tx) => {
    if (incomingIds.length) {
      await tx.dailyHabitTemplate.updateMany({
        where: { id: { notIn: incomingIds } },
        data: { isActive: false },
      })
    }

    for (const [i, row] of templates.entries()) {
      const data = {
        title: row.title.trim(),
        icon: row.icon.trim(),
        xpTotal: row.xpTotal ?? 15,
        sortOrder: row.sortOrder ?? i,
        isActive: row.isActive !== false,
      }
      if (row.id) {
        await tx.dailyHabitTemplate.update({
          where: { id: row.id },
          data,
        })
      } else {
        await tx.dailyHabitTemplate.create({ data })
      }
    }
  })

  const count = await db.dailyHabitTemplate.count({ where: { isActive: true } })
  await logAudit(actorId, 'DAILY_HABIT_TEMPLATES_REPLACE', null, { activeCount: count })
  return getDailyHabitTemplatesAdmin()
}

export const seedDailyHabitTemplatesFromDefaults = async () => {
  const defaults = [
    { title: '15 minutes de marche', icon: '🚶', xpTotal: 15, sortOrder: 0 },
    { title: 'Boire un grand verre d’eau', icon: '💧', xpTotal: 15, sortOrder: 1 },
    { title: '1 h sans réseaux sociaux', icon: '📵', xpTotal: 15, sortOrder: 2 },
    { title: '5 minutes de respiration', icon: '🧘', xpTotal: 15, sortOrder: 3 },
    { title: 'Noter 3 gratitudes', icon: '📝', xpTotal: 15, sortOrder: 4 },
    { title: 'Un repas équilibré', icon: '🥗', xpTotal: 15, sortOrder: 5 },
    { title: 'Se coucher à l’heure prévue', icon: '😴', xpTotal: 15, sortOrder: 6 },
    { title: '10 minutes de rangement', icon: '🧹', xpTotal: 15, sortOrder: 7 },
    { title: '10 minutes de lumière naturelle', icon: '☀️', xpTotal: 15, sortOrder: 8 },
    { title: 'Lire 20 pages', icon: '📖', xpTotal: 15, sortOrder: 9 },
  ]

  const active = await db.dailyHabitTemplate.count({ where: { isActive: true } })
  if (active > 0) return { ok: true, skipped: true, message: 'Templates déjà présents' }

  const total = await db.dailyHabitTemplate.count()
  if (total === 0) {
    await db.dailyHabitTemplate.createMany({ data: defaults })
    return { ok: true, seeded: defaults.length }
  }

  /* Lignes en base mais toutes inactives → l’API daily-offer renvoie no_templates */
  await db.dailyHabitTemplate.updateMany({ data: { isActive: true } })
  const n = await db.dailyHabitTemplate.count({ where: { isActive: true } })
  return { ok: true, seeded: n, reactivated: true }
}

export const getPushSettings = () => getPushSettingsAdmin()

export const putPushSettings = async (actorId, body) => {
  const r = await setDefaultReminderHourSvc(body.defaultReminderHour)
  await logAudit(actorId, 'PUSH_SETTINGS_UPDATE', null, r)
  return getPushSettingsAdmin()
}

export const sendPushTestGift = async (actorId, { message }) => {
  const out = await sendTestGiftNotification(null, { body: message })
  await logAudit(actorId, 'PUSH_TEST_GIFT', actorId, {
    messagePreview: String(message).slice(0, 120),
  })
  return out
}

const EMAIL_DEFAULT_SUBJECT_KEY = 'admin_email_default_subject'
const EMAIL_DEFAULT_BODY_KEY = 'admin_email_default_body'

const applyTemplate = (template, user) =>
  String(template)
    .replace(/\{\{username\}\}/g, user.username ?? '')
    .replace(/\{\{email\}\}/g, user.email ?? '')

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const bodyToHtml = (text) => escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>')

export const getAdminEmailDefaults = async () => {
  const [subRow, bodyRow] = await Promise.all([
    db.appSetting.findUnique({ where: { key: EMAIL_DEFAULT_SUBJECT_KEY } }),
    db.appSetting.findUnique({ where: { key: EMAIL_DEFAULT_BODY_KEY } }),
  ])
  return {
    subject: subRow?.value ?? '',
    body: bodyRow?.value ?? '',
  }
}

export const putAdminEmailDefaults = async (actorId, { subject, body }) => {
  await db.$transaction([
    db.appSetting.upsert({
      where: { key: EMAIL_DEFAULT_SUBJECT_KEY },
      create: { key: EMAIL_DEFAULT_SUBJECT_KEY, value: subject ?? '' },
      update: { value: subject ?? '' },
    }),
    db.appSetting.upsert({
      where: { key: EMAIL_DEFAULT_BODY_KEY },
      create: { key: EMAIL_DEFAULT_BODY_KEY, value: body ?? '' },
      update: { value: body ?? '' },
    }),
  ])
  await logAudit(actorId, 'ADMIN_EMAIL_DEFAULTS_SAVE', null, {
    subjectLen: String(subject ?? '').length,
    bodyLen: String(body ?? '').length,
  })
  return getAdminEmailDefaults()
}

/** Liste pour le sélecteur « un utilisateur » (e-mail renseigné, non suspendu). */
export const listEmailRecipientOptions = async () => {
  const users = await db.user.findMany({
    where: {
      email: { not: null },
      isSuspended: false,
    },
    select: { id: true, username: true, email: true },
    orderBy: { username: 'asc' },
    take: 2000,
  })
  return {
    users: users.filter((u) => u.email && String(u.email).trim().length > 0),
  }
}

export const sendAdminEmail = async (actorId, { mode, userId, subject, body }) => {
  if (!isMailConfigured()) {
    throw {
      status: 503,
      message:
        "Envoi d'e-mail impossible : configure GMAIL_USER et GMAIL_APP_PASSWORD sur le serveur.",
    }
  }

  let recipients = []
  if (mode === 'one') {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, isSuspended: true },
    })
    if (!u) throw { status: 404, message: 'Utilisateur introuvable' }
    if (u.isSuspended) throw { status: 400, message: 'Compte suspendu : envoi annulé.' }
    if (!u.email?.trim()) throw { status: 400, message: 'Cet utilisateur n’a pas d’adresse e-mail.' }
    recipients = [u]
  } else {
    const rows = await db.user.findMany({
      where: {
        email: { not: null },
        isSuspended: false,
      },
      select: { id: true, username: true, email: true },
    })
    recipients = rows.filter((r) => r.email && String(r.email).trim().length > 0)
  }

  if (!recipients.length) {
    throw { status: 400, message: 'Aucun destinataire avec une adresse e-mail.' }
  }

  let sent = 0
  const failed = []
  for (const u of recipients) {
    const subj = applyTemplate(subject, u)
    const txt = applyTemplate(body, u)
    try {
      await sendMail({
        to: u.email,
        subject: subj,
        text: txt,
        html: bodyToHtml(txt),
      })
      sent += 1
    } catch (e) {
      failed.push({ userId: u.id, username: u.username, message: String(e?.message ?? e) })
    }
  }

  await logAudit(actorId, 'ADMIN_EMAIL_SEND', null, {
    mode,
    sent,
    total: recipients.length,
    failed: failed.length,
    subjectPreview: String(subject).slice(0, 120),
  })

  return {
    ok: true,
    sent,
    total: recipients.length,
    failed,
  }
}
