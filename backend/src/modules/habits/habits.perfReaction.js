import { db } from '../../core/db.js'
import { prevCalendarYmd } from '../../core/streakService.js'
import { dateFromYmdUtcNoon } from '../../core/xpAggregate.js'
import { config } from '../../core/config.js'
import { sendMail, isMailConfigured } from '../../core/emailService.js'
import { getLocalYmd } from '../../lib/timezoneLocal.js'
import { canViewPeerHabits } from './habits.peer.js'

/**
 * Applique une réaction en base, sans envoyer d’e-mail.
 * @returns {Promise<{ shouldNotify: boolean, habitName: string, ymd: string, kind: 'HEART' | 'SKEPTIC' } | null>}
 *         `null` = suppression ou pas de changement notifiable.
 */
const applyPerfReactionRecord = async (
  viewerId,
  { targetUserId, habitId, ymd, kind },
) => {
  if (viewerId === targetUserId) {
    throw { status: 400, message: 'Tu ne peux pas réagir à tes propres perfs.' }
  }

  const profile = await db.user.findUnique({
    where: { id: targetUserId },
    select: { ianaTimezone: true },
  })
  if (!profile) throw { status: 404, message: 'Utilisateur introuvable' }

  const todayYmd = getLocalYmd(profile.ianaTimezone, new Date())
  const yesterdayYmd = prevCalendarYmd(todayYmd)
  if (ymd !== todayYmd && ymd !== yesterdayYmd) {
    throw { status: 400, message: 'Réaction possible seulement pour aujourd’hui ou hier (chez ce joueur).' }
  }

  const habit = await db.habit.findFirst({
    where: { id: habitId, userId: targetUserId, isActive: true },
    select: { id: true, name: true },
  })
  if (!habit) throw { status: 404, message: 'Habitude introuvable.' }

  const log = await db.habitLog.findFirst({
    where: {
      habitId,
      userId: targetUserId,
      date: dateFromYmdUtcNoon(ymd),
    },
  })
  if (!log) {
    throw { status: 400, message: 'Réaction possible seulement sur une habitude validée ce jour-là.' }
  }

  if (kind === null) {
    await db.habitPerfReaction.deleteMany({
      where: { fromUserId: viewerId, habitId, ymd },
    })
    return null
  }

  const before = await db.habitPerfReaction.findUnique({
    where: {
      fromUserId_habitId_ymd: { fromUserId: viewerId, habitId, ymd },
    },
    select: { kind: true },
  })

  await db.habitPerfReaction.upsert({
    where: {
      fromUserId_habitId_ymd: { fromUserId: viewerId, habitId, ymd },
    },
    create: { fromUserId: viewerId, habitId, ymd, kind },
    update: { kind },
  })

  const shouldNotify = !before || before.kind !== kind
  if (!shouldNotify) return null

  return { shouldNotify: true, habitName: habit.name, ymd, kind }
}

const sendPerfReactionMail = async (targetUserId, viewerId, line) => {
  const [target, liker] = await Promise.all([
    db.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, perfReactionEmailsEnabled: true, username: true },
    }),
    db.user.findUnique({ where: { id: viewerId }, select: { username: true } }),
  ])

  if (
    !target?.email ||
    target.perfReactionEmailsEnabled === false ||
    !isMailConfigured() ||
    !liker
  ) {
    return
  }
  const label = line.kind === 'HEART' ? 'a réagi ❤️' : 'a réagi 🤔'
  await sendMail({
    to: target.email,
    subject: `${liker.username} ${label} — ${line.habitName}`,
    text: `Bonjour ${target.username},\n\n${liker.username} ${label} sur ton habitude « ${line.habitName} » (${line.ymd}).\n\nOuvre l’app : ${config.FRONTEND_URL}\n`,
  })
}

/**
 * @param {string} viewerId
 * @param {{ targetUserId: string, habitId: string, ymd: string, kind: 'HEART' | 'SKEPTIC' | null }} body
 */
export const setPerfReaction = async (viewerId, body) => {
  if (!(await canViewPeerHabits(viewerId, body.targetUserId))) {
    throw { status: 403, message: 'Impossible de réagir pour ce joueur.' }
  }

  const line = await applyPerfReactionRecord(viewerId, body)
  if (line?.shouldNotify) {
    try {
      await sendPerfReactionMail(body.targetUserId, viewerId, line)
    } catch (e) {
      console.warn('[perf-reaction] e-mail non envoyé', e?.message)
    }
  }
  return { ok: true }
}

/**
 * Plusieurs réactions d’un coup : une seule notification e-mail regroupée à la fin.
 * @param {string} viewerId
 * @param {{ targetUserId: string, items: Array<{ habitId: string, ymd: string, kind: 'HEART' | 'SKEPTIC' | null }> }} body
 */
export const setPerfReactionsBatch = async (viewerId, { targetUserId, items }) => {
  if (viewerId === targetUserId) {
    throw { status: 400, message: 'Tu ne peux pas réagir à tes propres perfs.' }
  }
  if (!(await canViewPeerHabits(viewerId, targetUserId))) {
    throw { status: 403, message: 'Impossible de réagir pour ce joueur.' }
  }

  const dedup = new Map()
  for (const it of items) {
    const k = `${it.habitId}|${it.ymd}`
    dedup.set(k, it)
  }
  const list = [...dedup.values()]

  /** @type {Array<{ habitName: string, ymd: string, kind: 'HEART' | 'SKEPTIC' }>} */
  const notifyLines = []

  for (const it of list) {
    try {
      const line = await applyPerfReactionRecord(viewerId, { targetUserId, ...it })
      if (line?.shouldNotify) {
        notifyLines.push({ habitName: line.habitName, ymd: line.ymd, kind: line.kind })
      }
    } catch (e) {
      const status = e?.status ?? 500
      const message = typeof e?.message === 'string' ? e.message : 'Erreur'
      throw { status, message: `${message} (habitude ${it.habitId}, ${it.ymd})` }
    }
  }

  if (notifyLines.length > 0) {
    const [target, liker] = await Promise.all([
      db.user.findUnique({
        where: { id: targetUserId },
        select: { email: true, perfReactionEmailsEnabled: true, username: true },
      }),
      db.user.findUnique({ where: { id: viewerId }, select: { username: true } }),
    ])

    if (
      target?.email &&
      target.perfReactionEmailsEnabled !== false &&
      isMailConfigured() &&
      liker
    ) {
      try {
        const n = notifyLines.length
        const emoji = (k) => (k === 'HEART' ? '❤️' : '🤔')
        const linesTxt = notifyLines
          .map((l) => `- « ${l.habitName} » (${l.ymd}) : ${emoji(l.kind)}`)
          .join('\n')
        await sendMail({
          to: target.email,
          subject:
            n === 1
              ? `${liker.username} ${notifyLines[0].kind === 'HEART' ? 'a réagi ❤️' : 'a réagi 🤔'} — ${notifyLines[0].habitName}`
              : `${liker.username} — ${n} réactions sur tes perfs`,
          text: `Bonjour ${target.username},\n\n${liker.username} a réagi sur ${n === 1 ? 'ton habitude suivante' : 'tes habitudes suivantes'} :\n\n${linesTxt}\n\nOuvre l’app : ${config.FRONTEND_URL}\n`,
        })
      } catch (e) {
        console.warn('[perf-reaction-batch] e-mail non envoyé', e?.message)
      }
    }
  }

  return { ok: true, applied: list.length, notified: notifyLines.length }
}
