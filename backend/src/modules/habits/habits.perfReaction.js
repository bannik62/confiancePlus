import { db } from '../../core/db.js'
import { prevCalendarYmd } from '../../core/streakService.js'
import { dateFromYmdUtcNoon } from '../../core/xpAggregate.js'
import { config } from '../../core/config.js'
import { sendMail, isMailConfigured } from '../../core/emailService.js'
import { getLocalYmd } from '../../lib/timezoneLocal.js'
import { canViewPeerHabits } from './habits.peer.js'

/**
 * @param {string} viewerId
 * @param {{ targetUserId: string, habitId: string, ymd: string, kind: 'HEART' | 'SKEPTIC' | null }} body
 */
export const setPerfReaction = async (viewerId, { targetUserId, habitId, ymd, kind }) => {
  if (viewerId === targetUserId) {
    throw { status: 400, message: 'Tu ne peux pas réagir à tes propres perfs.' }
  }
  if (!(await canViewPeerHabits(viewerId, targetUserId))) {
    throw { status: 403, message: 'Impossible de réagir pour ce joueur.' }
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
    return { ok: true }
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

  const [target, liker] = await Promise.all([
    db.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, perfReactionEmailsEnabled: true, username: true },
    }),
    db.user.findUnique({ where: { id: viewerId }, select: { username: true } }),
  ])

  if (
    shouldNotify &&
    target?.email &&
    target.perfReactionEmailsEnabled !== false &&
    isMailConfigured() &&
    liker
  ) {
    try {
      const label = kind === 'HEART' ? 'a réagi ❤️' : 'a réagi 🤔'
      await sendMail({
        to: target.email,
        subject: `${liker.username} ${label} — ${habit.name}`,
        text: `Bonjour ${target.username},\n\n${liker.username} ${label} sur ton habitude « ${habit.name} » (${ymd}).\n\nOuvre l’app : ${config.FRONTEND_URL}\n`,
      })
    } catch (e) {
      console.warn('[perf-reaction] e-mail non envoyé', e?.message)
    }
  }

  return { ok: true }
}
