import { db } from '../../core/db.js'
import { isHabitDueOnYmd, ALL_WEEKDAYS_MASK } from '../../lib/habitWeekdays.js'
import { levelFromXP, xpProgress, titleForLevel, computeDayXP } from '../../core/xpEngine.js'
import { totalGameXpAndStreakDates, aggregationWindowDateWhere, ymdFromDbDate } from '../../core/xpAggregate.js'
import {
  computeEngagementStreak,
  diagnoseStreakBreakReason,
  recordDailyVisit,
  ymdMinusDays,
  STREAK_CHAIN_MAX_DAYS,
  planYesterdayStreakRecovery,
  buildHabitSkipsByYmd,
} from '../../core/streakService.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'
import { getLeaderboard } from '../group/group.service.js'
import { getPerfReactionTotalsByUserIds } from '../habits/perfReactionCounts.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/** Aligné sur les logs d’habitudes (@db.Date, midi UTC) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/**
 * 7 jours civils se terminant à anchorYmd (YYYY-MM-DD), ordre lundi → dimanche côté affichage.
 * Arithmétique en UTC sur y/m/d pour éviter les fuseaux du serveur.
 */
const last7DaysFromAnchor = (anchorYmd) => {
  const [y, m, d] = anchorYmd.split('-').map(Number)
  const out = []
  for (let i = 0; i < 7; i++) {
    const offset = 6 - i
    const dt = new Date(Date.UTC(y, m - 1, d - offset, 12, 0, 0, 0))
    out.push(dt.toISOString().slice(0, 10))
  }
  return out
}

const utcCalendarYmd = () => new Date().toISOString().slice(0, 10)

export const getMyStats = async (userId, { clientToday } = {}) => {
  const anchor =
    clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const days = last7DaysFromAnchor(anchor)

  if ((await userIsAssociationOwner(userId)) || (await userIsAppAdmin(userId))) {
    return {
      byDay:   days.map((day) => ({ date: day, rate: 0 })),
      byHabit: [],
    }
  }

  const from   = dateFromYMD(days[0])
  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
    include: { logs: { where: { date: { gte: from } } } },
  })

  // Taux par jour (uniquement habitudes « dues » ce jour-là)
  const byDay = days.map((day) => {
    const due = habits.filter((h) => isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, day))
    const total = due.length
    if (!total) return { date: day, rate: 0 }
    const done = due.filter((h) => h.logs.some((l) => l.date.toISOString().slice(0, 10) === day)).length
    return { date: day, rate: Math.round((done / total) * 100) }
  })

  // Taux par habitude : % des jours de la fenêtre où l’habitude était due et cochée
  const byHabit = habits.map((h) => {
    const mask = h.weekdaysMask ?? ALL_WEEKDAYS_MASK
    const dueDays = days.filter((d) => isHabitDueOnYmd(mask, d))
    const dueCount = dueDays.length
    const doneCount = dueDays.filter((d) =>
      h.logs.some((l) => l.date.toISOString().slice(0, 10) === d),
    ).length
    const rate = dueCount > 0 ? Math.round((doneCount / dueCount) * 100) : 0
    return { id: h.id, name: h.name, icon: h.icon, rate }
  })

  return { byDay, byHabit }
}

/** UserIds à exclure du classement global (proprio d’au moins une asso + comptes admin). */
const leaderboardExcludedUserIds = async () => {
  const [ownerRows, admins] = await Promise.all([
    db.groupMember.findMany({
      where:   { role: 'OWNER', group: { type: 'ASSOCIATION' } },
      select:  { userId: true },
      distinct: ['userId'],
    }),
    db.user.findMany({ where: { isAdmin: true }, select: { id: true } }),
  ])
  const ids = new Set([...ownerRows.map((r) => r.userId), ...admins.map((a) => a.id)])
  return [...ids]
}

export const getGlobalLeaderboard = async ({ clientToday } = {}) => {
  const anchor = clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const dateWhere = aggregationWindowDateWhere(anchor)
  const streakMinYmd = ymdMinusDays(anchor, STREAK_CHAIN_MAX_DAYS - 1)

  const excludeIds = await leaderboardExcludedUserIds()
  const users = await db.user.findMany({
    where: {
      isPending: false,
      isSuspended: false,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: {
      id: true, username: true, avatar: true, cristaux: true, jokerStreak: true,
      habits: {
        select: { id: true, weekdaysMask: true, createdAt: true, isActive: true },
      },
      habitLogs: {
        where: { date: dateWhere },
        select: {
          date: true,
          habitId: true,
          habit: { select: { xp: true } },
        },
      },
      dailyLogs: {
        where: { date: dateWhere },
        select: { date: true, mood: true, journal: true, sleepQuality: true },
      },
      dailyVisits: {
        where: { ymd: { gte: streakMinYmd, lte: anchor } },
        select: { ymd: true },
      },
      habitDaySkips: {
        where: { date: dateWhere },
        select: { habitId: true, date: true },
      },
      memberships: {
        select: { group: { select: { name: true } } },
      },
    },
  })

  const userIds = users.map((u) => u.id)
  const apptRows =
    userIds.length === 0
      ? []
      : await db.appointmentCompletion.findMany({
          where: { userId: { in: userIds }, date: dateWhere },
          select: { userId: true, date: true, xpEarned: true },
        })
  const apptByUser = {}
  for (const c of apptRows) {
    if (!apptByUser[c.userId]) apptByUser[c.userId] = []
    apptByUser[c.userId].push(c)
  }

  const reactionTotals = await getPerfReactionTotalsByUserIds(userIds)

  return users
    .map((user) => {
      const apptList = apptByUser[user.id] || []
      const habitSkipsByYmd = buildHabitSkipsByYmd(user.habitDaySkips)
      const { totalXP } = totalGameXpAndStreakDates({
        habits: user.habits,
        habitLogs: user.habitLogs,
        dailyLogs: user.dailyLogs,
        appointmentCompletions: apptList,
        anchorYmd: anchor,
        habitSkipsByYmd,
      })
      const level = levelFromXP(totalXP)
      const title = titleForLevel(level)
      const streakLogs = user.habitLogs.filter((l) => {
        const y = ymdFromDbDate(l.date)
        return y >= streakMinYmd && y <= anchor
      })
      const streak = computeEngagementStreak({
        anchorYmd:           anchor,
        visitYmds:           user.dailyVisits.map((v) => v.ymd),
        habits:              user.habits,
        habitLogsInWindow:   streakLogs,
        habitSkipsByYmd,
      })
      const groupNames = [...new Set(user.memberships.map((m) => m.group.name))].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      )
      const rx = reactionTotals.get(user.id) ?? { perfReactionHearts: 0, perfReactionSkeptics: 0 }
      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        totalXP,
        level,
        title,
        streak,
        cristaux: user.cristaux ?? 0,
        jokerStreak: user.jokerStreak ?? 0,
        groupNames,
        perfReactionHearts: rx.perfReactionHearts,
        perfReactionSkeptics: rx.perfReactionSkeptics,
      }
    })
    .sort((a, b) => b.totalXP - a.totalXP)
}

/** Stats onglet éducateur : premier groupe ASSO dont il est OWNER + classement membres (sans lui). */
export const getEducatorAssociationOverview = async (userId, { clientToday } = {}) => {
  if (!(await userIsAssociationOwner(userId)))
    throw { status: 403, message: 'Réservé aux comptes éducateur association' }

  const membership = await db.groupMember.findFirst({
    where: { userId, role: 'OWNER', group: { type: 'ASSOCIATION' } },
    include: { group: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  if (!membership) throw { status: 404, message: 'Aucune association trouvée' }

  const groupId = membership.groupId
  const [leaderboard, memberCount] = await Promise.all([
    getLeaderboard(groupId, { clientToday }),
    db.groupMember.count({ where: { groupId } }),
  ])

  return {
    group:       { id: membership.group.id, name: membership.group.name },
    memberCount,
    leaderboard,
  }
}

export const getMyProfile = async (userId, { clientToday, streakBanner = false } = {}) => {
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas de profil joueur.' }

  const anchor = clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const dateWhere = aggregationWindowDateWhere(anchor)
  const streakMinYmd = ymdMinusDays(anchor, STREAK_CHAIN_MAX_DAYS - 1)

  const streakStateRow = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      lastProfileStreakInt:       true,
      lastStreakBannerYmd:        true,
      lastStreakRecoverAnchorYmd: true,
    },
  })
  const prevStreakForBanner = streakStateRow.lastProfileStreakInt
  const lastBannerYmd       = streakStateRow.lastStreakBannerYmd

  await recordDailyVisit(userId, anchor)

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, username: true, avatar: true, createdAt: true, cristaux: true, jokerStreak: true },
  })

  const habits = await db.habit.findMany({
    where: { userId },
    select: { id: true, weekdaysMask: true, createdAt: true, isActive: true },
  })

  const logs = await db.habitLog.findMany({
    where: { userId, date: dateWhere },
    include: { habit: { select: { xp: true } } },
  })

  const dailyLogs = await db.dailyLog.findMany({ where: { userId, date: dateWhere } })

  const apptDone = await db.appointmentCompletion.findMany({
    where: { userId, date: dateWhere },
    select: { date: true, xpEarned: true },
  })

  const skipRows = await db.habitDaySkip.findMany({
    where: { userId, date: dateWhere },
    select: { habitId: true, date: true },
  })
  const habitSkipsByYmd = buildHabitSkipsByYmd(skipRows)

  const { totalXP } = totalGameXpAndStreakDates({
    habits,
    habitLogs: logs,
    dailyLogs,
    appointmentCompletions: apptDone,
    anchorYmd: anchor,
    habitSkipsByYmd,
  })

  const visitRows = await db.dailyVisit.findMany({
    where: { userId, ymd: { gte: streakMinYmd, lte: anchor } },
    select: { ymd: true },
  })
  const streakLogs = logs.filter((l) => {
    const y = ymdFromDbDate(l.date)
    return y >= streakMinYmd && y <= anchor
  })
  const streak = computeEngagementStreak({
    anchorYmd:         anchor,
    visitYmds:         visitRows.map((v) => v.ymd),
    habits,
    habitLogsInWindow: streakLogs,
    habitSkipsByYmd,
  })

  /** @type {null | { kind: string, reason?: string, previousStreak?: number, streak: number }} */
  let streakNotice = null
  if (streakBanner && lastBannerYmd !== anchor) {
    if (prevStreakForBanner > 0 && streak < prevStreakForBanner) {
      const plan = planYesterdayStreakRecovery({
        anchorYmd:         anchor,
        visitYmds:         visitRows.map((v) => v.ymd),
        habits,
        habitLogsInWindow: streakLogs,
        habitSkipsByYmd,
      })
      const recoverAvailable =
        plan != null && streakStateRow.lastStreakRecoverAnchorYmd !== anchor
      streakNotice = {
        kind:            'broken',
        reason: diagnoseStreakBreakReason({
          anchorYmd:         anchor,
          visitYmds:         visitRows.map((v) => v.ymd),
          habits,
          habitLogsInWindow: streakLogs,
          habitSkipsByYmd,
        }),
        previousStreak: prevStreakForBanner,
        streak,
        recoverAvailable,
      }
    } else if (streak === 1 && prevStreakForBanner === 0) {
      streakNotice = { kind: 'started', streak }
    } else if (
      streak >= 1 &&
      !(prevStreakForBanner > 0 && streak < prevStreakForBanner)
    ) {
      streakNotice = { kind: 'maintained', streak }
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      lastProfileStreakInt: streak,
      ...(streakBanner && streakNotice ? { lastStreakBannerYmd: anchor } : {}),
    },
  })

  const progress = xpProgress(totalXP)
  const title = titleForLevel(progress.level)

  return { ...user, totalXP, ...progress, title, streak, streakNotice }
}

/**
 * Sauvetage streak : **hier** seulement ; paiement **JOKER** uniquement (1 en stock — la boutique).
 */
export const recoverStreak = async (userId, { clientToday, payment } = {}) => {
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas de sauvetage streak.' }
  if (await userIsAssociationOwner(userId))
    throw { status: 403, message: 'Compte éducateur : pas de sauvetage streak.' }
  if (payment === 'CRISTAUX') {
    throw {
      status: 400,
      message:
        'Le sauvetage en cristaux n’est plus disponible. Achète un joker de série dans la boutique, puis réessaie.',
    }
  }
  if (payment !== 'JOKER')
    throw { status: 400, message: 'Paiement invalide : indique JOKER (1 joker de série en stock).' }

  const anchor = clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const dateWhere = aggregationWindowDateWhere(anchor)
  const streakMinYmd = ymdMinusDays(anchor, STREAK_CHAIN_MAX_DAYS - 1)

  await db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { cristaux: true, jokerStreak: true, lastStreakRecoverAnchorYmd: true },
    })
    if (!u) throw { status: 404, message: 'Utilisateur introuvable.' }
    if (u.lastStreakRecoverAnchorYmd === anchor) {
      throw { status: 409, message: 'Tu as déjà utilisé un sauvetage aujourd’hui.' }
    }
    if (u.jokerStreak < 1) {
      throw { status: 400, message: 'Tu n’as pas de joker de série. Achète-en un dans la boutique.' }
    }

    await tx.dailyVisit.upsert({
      where: { userId_ymd: { userId, ymd: anchor } },
      create: { userId, ymd: anchor },
      update: {},
    })

    const habits = await tx.habit.findMany({
      where: { userId },
      select: { id: true, weekdaysMask: true, createdAt: true, isActive: true },
    })

    const logs = await tx.habitLog.findMany({
      where: { userId, date: dateWhere },
      include: { habit: { select: { xp: true } } },
    })

    const visitRows = await tx.dailyVisit.findMany({
      where: { userId, ymd: { gte: streakMinYmd, lte: anchor } },
      select: { ymd: true },
    })
    const streakLogs = logs.filter((l) => {
      const y = ymdFromDbDate(l.date)
      return y >= streakMinYmd && y <= anchor
    })

    const skipRowsTx = await tx.habitDaySkip.findMany({
      where: { userId, date: dateWhere },
      select: { habitId: true, date: true },
    })
    const habitSkipsByYmdTx = buildHabitSkipsByYmd(skipRowsTx)

    const plan = planYesterdayStreakRecovery({
      anchorYmd:         anchor,
      visitYmds:         visitRows.map((v) => v.ymd),
      habits,
      habitLogsInWindow: streakLogs,
      habitSkipsByYmd:   habitSkipsByYmdTx,
    })
    if (!plan) {
      throw {
        status: 400,
        message:
          'Aucun sauvetage possible pour hier : la série ne peut pas être réparée ainsi, ou hier est déjà bon.',
      }
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        jokerStreak: { decrement: 1 },
        lastStreakRecoverAnchorYmd: anchor,
      },
    })

    if (plan.needVisit) {
      await tx.dailyVisit.upsert({
        where: { userId_ymd: { userId, ymd: plan.recoverYmd } },
        create: { userId, ymd: plan.recoverYmd },
        update: {},
      })
    }

    const dayDate = dateFromYMD(plan.recoverYmd)
    for (const habitId of plan.extraHabitIds) {
      await tx.habitLog.upsert({
        where: { habitId_date: { habitId, date: dayDate } },
        create: { userId, habitId, date: dayDate },
        update: {},
      })
    }
  })

  return getMyProfile(userId, { clientToday, streakBanner: false })
}

// Calendrier année : tous les jours avec data agrégée + détails émotionnels
export const getCalendarYear = async (userId, year) => {
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas de calendrier joueur.' }

  const startDate = new Date(`${year}-01-01`)
  const endDate   = new Date(`${year}-12-31`)
  
  // Récupérer tous les logs habitudes avec détails habitude
  const habitLogs = await db.habitLog.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    include: { 
      habit: { 
        select: { id: true, name: true, icon: true, xp: true, isActive: true } 
      } 
    },
  })

  // Récupérer tous les dailyLogs (mood, sommeil, journal) de l'année
  const dailyLogs = await db.dailyLog.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  })

  // Récupérer toutes les habitudes de l'user pour calculer le total actif par jour
  const allHabits = await db.habit.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      icon: true,
      xp: true,
      createdAt: true,
      isActive: true,
      weekdaysMask: true,
    },
  })

  // Indexer dailyLogs par date pour accès rapide
  const dailyLogsMap = {}
  dailyLogs.forEach((log) => {
    dailyLogsMap[log.date.toISOString().slice(0, 10)] = log
  })

  const apptNotDoneRows = await db.appointmentCompletion.findMany({
    where: {
      userId,
      outcome: 'NOT_DONE',
      date: { gte: startDate, lte: endDate },
    },
    include: {
      appointment: { select: { title: true } },
    },
  })
  const notDoneByYmd = {}
  for (const row of apptNotDoneRows) {
    const k = row.date.toISOString().slice(0, 10)
    if (!notDoneByYmd[k]) notDoneByYmd[k] = []
    notDoneByYmd[k].push({
      title: row.appointment.title,
      reason:
        row.declineReason && String(row.declineReason).trim()
          ? String(row.declineReason).trim()
          : null,
    })
  }

  // Générer tableau des 365 jours de l'année
  const days = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    
    // Logs habitudes ce jour
    const dayLogs = habitLogs.filter((l) => l.date.toISOString().slice(0, 10) === dateStr)
    
    // Habitudes actives à cette date (créées avant ou le jour même)
    const activeHabits = allHabits.filter((h) => {
      const createdDate = new Date(h.createdAt).toISOString().slice(0, 10)
      return (
        createdDate <= dateStr &&
        h.isActive &&
        isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, dateStr)
      )
    })
    
    const doneIds = new Set(dayLogs.map((l) => l.habit.id))
    const habitsDone  = doneIds.size
    const habitsTotal = activeHabits.length
    const habitRate   = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0

    // Daily log (mood, sommeil, journal)
    const dailyLog = dailyLogsMap[dateStr]

    const allDone =
      activeHabits.length > 0 && activeHabits.every((h) => doneIds.has(h.id))
    const habitsPayload = dayLogs.map((l) => ({ xp: l.habit.xp }))
    const moodN = dailyLog?.mood != null ? Number(dailyLog.mood) : NaN
    const hasCheckin = Number.isFinite(moodN) && moodN >= 1 && moodN <= 10
    const hasJournal = !!(dailyLog?.journal && String(dailyLog.journal).trim().length > 0)
    const hasSleep = dailyLog?.sleepQuality != null && Number(dailyLog.sleepQuality) > 0
    const xp = computeDayXP({
      habits: habitsPayload,
      allDone,
      hasCheckin,
      hasJournal,
      hasSleep,
    })
    
    // Liste détaillée des habitudes cochées ce jour
    const habits = dayLogs.map((l) => ({
      id: l.habit.id,
      name: l.habit.name,
      icon: l.habit.icon,
      xp: l.habit.xp,
    }))

    days.push({
      date: dateStr,
      habitRate,
      xp,
      habitsDone,
      habitsTotal,
      // Données émotionnelles (null si pas de dailyLog ce jour)
      mood: dailyLog?.mood ?? null,
      moodReason: dailyLog?.moodReason ?? null,
      sleepQuality: dailyLog?.sleepQuality ?? null,
      journal: dailyLog?.journal ?? null,
      // Liste habitudes cochées
      habits,
      /** RDV marqués « non fait » ce jour — raison visible ici / heatmap uniquement */
      rdvNotDone: notDoneByYmd[dateStr] ?? [],
    })
  }

  return { year, days }
}

// Insights : corrélations mood/sommeil/réussite sur les N derniers jours
export const getInsights = async (userId, daysCount = 30) => {
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas d’insights joueur.' }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysCount)
  
  // Récupérer logs habitudes + dailyLogs sur la période
  const habitLogs = await db.habitLog.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
    include: { habit: { select: { xp: true } } },
  })

  const dailyLogs = await db.dailyLog.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
  })

  // Récupérer habitudes actives pour calculer les taux (masque jours)
  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
    select: { id: true, weekdaysMask: true },
  })

  if (habits.length === 0 || dailyLogs.length === 0) {
    return { 
      daysAnalyzed: 0, 
      moodBySuccess: null, 
      moodBySleep: null, 
      bestDay: null, 
      worstDay: null 
    }
  }

  // Grouper logs par jour
  const dayStats = {}
  
  // Calculer % réussite par jour
  const dates = [...new Set(habitLogs.map(l => l.date.toISOString().slice(0, 10)))]
  dates.forEach((date) => {
    const dayLogs = habitLogs.filter((l) => l.date.toISOString().slice(0, 10) === date)
    const dueCount = habits.filter((h) =>
      isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, date),
    ).length
    const habitRate =
      dueCount > 0 ? Math.round((dayLogs.length / dueCount) * 100) : 0
    dayStats[date] = { habitRate, mood: null, sleep: null }
  })

  // Ajouter mood + sleep depuis dailyLogs
  dailyLogs.forEach((log) => {
    const date = log.date.toISOString().slice(0, 10)
    if (!dayStats[date]) dayStats[date] = { habitRate: 0 }
    dayStats[date].mood = log.mood
    dayStats[date].sleep = log.sleepQuality
  })

  // Filtrer jours avec données complètes
  const completeDays = Object.entries(dayStats)
    .map(([date, data]) => ({ date, ...data }))
    .filter(d => d.mood !== null)

  if (completeDays.length === 0) {
    return { daysAnalyzed: 0, moodBySuccess: null, moodBySleep: null, bestDay: null, worstDay: null }
  }

  // ── Corrélation mood × % réussite ──
  const low  = completeDays.filter(d => d.habitRate < 50)
  const mid  = completeDays.filter(d => d.habitRate >= 50 && d.habitRate < 80)
  const high = completeDays.filter(d => d.habitRate >= 80)

  const moodBySuccess = {
    low:  low.length > 0  ? (low.reduce((s, d) => s + d.mood, 0) / low.length).toFixed(1) : null,
    mid:  mid.length > 0  ? (mid.reduce((s, d) => s + d.mood, 0) / mid.length).toFixed(1) : null,
    high: high.length > 0 ? (high.reduce((s, d) => s + d.mood, 0) / high.length).toFixed(1) : null,
  }

  // ── Corrélation mood × sommeil ──
  const daysWithSleep = completeDays.filter(d => d.sleep !== null)
  const poorSleep  = daysWithSleep.filter(d => d.sleep < 5)
  const goodSleep  = daysWithSleep.filter(d => d.sleep >= 5 && d.sleep < 8)
  const greatSleep = daysWithSleep.filter(d => d.sleep >= 8)

  const moodBySleep = {
    poor:  poorSleep.length > 0  ? (poorSleep.reduce((s, d) => s + d.mood, 0) / poorSleep.length).toFixed(1) : null,
    good:  goodSleep.length > 0  ? (goodSleep.reduce((s, d) => s + d.mood, 0) / goodSleep.length).toFixed(1) : null,
    great: greatSleep.length > 0 ? (greatSleep.reduce((s, d) => s + d.mood, 0) / greatSleep.length).toFixed(1) : null,
  }

  // ── Meilleur / pire jour ──
  const sorted = [...completeDays].sort((a, b) => b.mood - a.mood)
  const bestDay = sorted[0] 
    ? { 
        date: sorted[0].date, 
        mood: sorted[0].mood, 
        habitRate: sorted[0].habitRate,
        sleep: sorted[0].sleep 
      }
    : null
  const worstDay = sorted[sorted.length - 1]
    ? { 
        date: sorted[sorted.length - 1].date, 
        mood: sorted[sorted.length - 1].mood, 
        habitRate: sorted[sorted.length - 1].habitRate,
        sleep: sorted[sorted.length - 1].sleep
      }
    : null

  return {
    daysAnalyzed: completeDays.length,
    moodBySuccess,
    moodBySleep,
    bestDay,
    worstDay,
  }
}
