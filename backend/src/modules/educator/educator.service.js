import { db } from '../../core/db.js'
import * as habitsService from '../habits/habits.service.js'
import { getMyStats, getCalendarYear, getInsights } from '../stats/stats.service.js'

const utcYmd = () => new Date().toISOString().slice(0, 10)

/**
 * Vue agrégée pour l’éducateur (OWNER d’une ASSO) sur un membre.
 * Humeur / phrase / journal masqués si le membre n’a pas consenti.
 */
export const getMemberOverviewForEducator = async (
  requesterId,
  groupId,
  memberId,
  { year, habitsDate, clientToday } = {},
) => {
  const ownerRow = await db.groupMember.findFirst({
    where: { userId: requesterId, groupId, role: 'OWNER', group: { type: 'ASSOCIATION' } },
  })
  if (!ownerRow) throw { status: 403, message: 'Accès refusé' }

  const target = await db.groupMember.findUnique({
    where: { userId_groupId: { userId: memberId, groupId } },
    include: { user: { select: { username: true, avatar: true, isPending: true } } },
  })
  if (!target || target.role !== 'MEMBER') throw { status: 404, message: 'Membre introuvable' }
  if (target.user.isPending) throw { status: 404, message: 'Compte non activé' }

  const share = target.shareSensitiveCheckinWithOwner === true

  const y = year && year >= 2020 && year <= 2100 ? year : new Date().getFullYear()
  const dateStr = habitsDate && /^\d{4}-\d{2}-\d{2}$/.test(habitsDate) ? habitsDate : undefined
  const resolvedHabitsDate = dateStr ?? utcYmd()

  const [habits, stats, calendar, insights] = await Promise.all([
    habitsService.getHabits(memberId, dateStr),
    getMyStats(memberId, { clientToday }),
    getCalendarYear(memberId, y),
    share ? getInsights(memberId, 30) : Promise.resolve(null),
  ])

  let calendarOut = calendar
  if (!share) {
    calendarOut = {
      ...calendar,
      days: calendar.days.map((d) => ({
        ...d,
        mood: null,
        moodReason: null,
        journal: null,
      })),
    }
  }

  const insightsOut =
    share && insights
      ? insights
      : { daysAnalyzed: 0, moodBySuccess: null, moodBySleep: null, bestDay: null, worstDay: null }

  return {
    member: {
      id: memberId,
      username: target.user.username,
      avatar: target.user.avatar,
    },
    sensitiveMasked: !share,
    shareSensitiveCheckinWithOwner: share,
    habitsDate: resolvedHabitsDate,
    habits,
    stats,
    calendar: calendarOut,
    insights: insightsOut,
  }
}
