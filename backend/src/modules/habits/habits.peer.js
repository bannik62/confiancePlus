import { db } from '../../core/db.js'
import { prevCalendarYmd } from '../../core/streakService.js'
import { dateFromYmdUtcNoon, ymdFromDbDate } from '../../core/xpAggregate.js'
import { ALL_WEEKDAYS_MASK, isHabitDueOnYmd } from '../../lib/habitWeekdays.js'
import { getLocalYmd } from '../../lib/timezoneLocal.js'

const usersShareGroup = async (a, b) => {
  if (a === b) return true
  const aGroups = await db.groupMember.findMany({ where: { userId: a }, select: { groupId: true } })
  const ids = aGroups.map((g) => g.groupId)
  if (ids.length === 0) return false
  const common = await db.groupMember.findFirst({ where: { userId: b, groupId: { in: ids } } })
  return !!common
}

/** Même périmètre « joueur » que le classement global (hors admin / asso owner / pending). */
const userEligibleForPublicPeerView = async (userId) => {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { isPending: true, isSuspended: true, isAdmin: true },
  })
  if (!u || u.isPending || u.isSuspended || u.isAdmin) return false
  const assoOwner = await db.groupMember.findFirst({
    where: { userId, role: 'OWNER', group: { type: 'ASSOCIATION' } },
  })
  return !assoOwner
}

/** Exporté pour les réactions « perf » (même périmètre que la liste publique). */
export const canViewPeerHabits = async (viewerId, targetId) => {
  if (viewerId === targetId) return true
  if (await usersShareGroup(viewerId, targetId)) return true
  if (await userEligibleForPublicPeerView(targetId)) return true
  return false
}

const attachReactionFields = (viewerId, rows, ymd, reactionRows) => {
  const key = (habitId, day) => `${habitId}\t${day}`
  const byKey = new Map()
  for (const r of reactionRows) {
    const k = key(r.habitId, r.ymd)
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(r)
  }
  return rows.map((row) => {
    const list = byKey.get(key(row.id, ymd)) || []
    let reactionHeartCount = 0
    let reactionSkepticCount = 0
    /** @type {'HEART' | 'SKEPTIC' | null} */
    let myReaction = null
    for (const x of list) {
      if (x.kind === 'HEART') reactionHeartCount++
      else reactionSkepticCount++
      if (x.fromUserId === viewerId) myReaction = x.kind
    }
    return { ...row, reactionHeartCount, reactionSkepticCount, myReaction }
  })
}

const habitPublicSelect = {
  id: true,
  name: true,
  icon: true,
  xp: true,
  weekdaysMask: true,
  createdAt: true,
}

const mapHabit = (h) => ({
  id: h.id,
  name: h.name,
  icon: h.icon,
  xp: h.xp,
  weekdaysMask: h.weekdaysMask ?? ALL_WEEKDAYS_MASK,
})

/**
 * Habitudes d’un autre joueur (classement) : liste active + hier / aujourd’hui avec statut fait (fuseau du joueur cible).
 */
export const getPublicHabitsForPeer = async (viewerId, targetUserId) => {
  if (!(await canViewPeerHabits(viewerId, targetUserId))) {
    throw { status: 403, message: 'Impossible d’afficher les habitudes de ce joueur.' }
  }
  const profile = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true, avatar: true, ianaTimezone: true },
  })
  if (!profile) throw { status: 404, message: 'Utilisateur introuvable' }

  const todayYmd = getLocalYmd(profile.ianaTimezone, new Date())
  const yesterdayYmd = prevCalendarYmd(todayYmd)

  const habits = await db.habit.findMany({
    where: { userId: targetUserId, isActive: true },
    orderBy: { order: 'asc' },
    select: habitPublicSelect,
  })

  const dateNoon = [dateFromYmdUtcNoon(yesterdayYmd), dateFromYmdUtcNoon(todayYmd)]
  const logs = await db.habitLog.findMany({
    where: {
      userId: targetUserId,
      date: { in: dateNoon },
    },
    select: { habitId: true, date: true },
  })

  const logIdsForYmd = (ymd) => {
    const ids = new Set()
    for (const l of logs) {
      if (ymdFromDbDate(l.date) === ymd) ids.add(l.habitId)
    }
    return ids
  }

  const yesterdayIds = logIdsForYmd(yesterdayYmd)
  const todayIds = logIdsForYmd(todayYmd)

  const createdYmd = (createdAt) => ymdFromDbDate(createdAt)

  const yesterdayHabits = habits
    .filter((h) => {
      if (createdYmd(h.createdAt) > yesterdayYmd) return false
      return isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, yesterdayYmd)
    })
    .map((h) => ({
      ...mapHabit(h),
      done: yesterdayIds.has(h.id),
    }))

  const todayHabits = habits
    .filter((h) => {
      if (createdYmd(h.createdAt) > todayYmd) return false
      return isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, todayYmd)
    })
    .map((h) => ({
      ...mapHabit(h),
      done: todayIds.has(h.id),
    }))

  const habitIds = [...new Set([...yesterdayHabits, ...todayHabits].map((h) => h.id))]
  let reactionRows = []
  if (habitIds.length > 0) {
    reactionRows = await db.habitPerfReaction.findMany({
      where: { habitId: { in: habitIds }, ymd: { in: [yesterdayYmd, todayYmd] } },
      select: { fromUserId: true, habitId: true, ymd: true, kind: true },
    })
  }

  const yesterdayHabitsOut = attachReactionFields(viewerId, yesterdayHabits, yesterdayYmd, reactionRows)
  const todayHabitsOut = attachReactionFields(viewerId, todayHabits, todayYmd, reactionRows)

  return {
    userId: targetUserId,
    username: profile.username,
    avatar: profile.avatar,
    peerTodayYmd: todayYmd,
    peerYesterdayYmd: yesterdayYmd,
    habits: habits.map(mapHabit),
    yesterdayHabits: yesterdayHabitsOut,
    todayHabits: todayHabitsOut,
  }
}
