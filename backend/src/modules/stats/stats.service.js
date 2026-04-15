import { db } from '../../core/db.js'
import { levelFromXP, xpProgress, titleForLevel, computeStreak, computeDayXP } from '../../core/xpEngine.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { getLeaderboard } from '../group/group.service.js'

// 7 derniers jours au format YYYY-MM-DD
const last7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

export const getMyStats = async (userId) => {
  if (await userIsAssociationOwner(userId)) {
    const days = last7Days()
    return {
      byDay:   days.map((day) => ({ date: day, rate: 0 })),
      byHabit: [],
    }
  }

  const days   = last7Days()
  const from   = new Date(days[0])
  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
    include: { logs: { where: { date: { gte: from } } } },
  })

  // Taux par jour
  const byDay = days.map((day) => {
    const total = habits.length
    if (!total) return { date: day, rate: 0 }
    const done = habits.filter((h) => h.logs.some((l) => l.date.toISOString().slice(0, 10) === day)).length
    return { date: day, rate: Math.round((done / total) * 100) }
  })

  // Taux par habitude
  const byHabit = habits.map((h) => ({
    id:   h.id,
    name: h.name,
    icon: h.icon,
    rate: Math.round((h.logs.length / 7) * 100),
  }))

  return { byDay, byHabit }
}

/** UserIds à exclure du classement global (proprio d’au moins une asso). */
const associationOwnerUserIds = async () => {
  const rows = await db.groupMember.findMany({
    where:   { role: 'OWNER', group: { type: 'ASSOCIATION' } },
    select:  { userId: true },
    distinct: ['userId'],
  })
  return rows.map((r) => r.userId)
}

export const getGlobalLeaderboard = async () => {
  const excludeIds = await associationOwnerUserIds()
  const users = await db.user.findMany({
    where: {
      isPending: false,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: {
      id: true, username: true, avatar: true,
      habitLogs: { select: { date: true, habit: { select: { xp: true } } } },
      memberships: {
        select: { group: { select: { name: true } } },
      },
    },
  })

  return users
    .map((user) => {
      const totalXP = user.habitLogs.reduce((sum, l) => sum + l.habit.xp, 0)
      const level   = levelFromXP(totalXP)
      const title   = titleForLevel(level)
      const dates   = [...new Set(user.habitLogs.map(l => l.date.toISOString().slice(0, 10)))]
      const streak  = computeStreak(dates)
      const groupNames = [...new Set(user.memberships.map((m) => m.group.name))].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      )
      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        totalXP,
        level,
        title,
        streak,
        groupNames,
      }
    })
    .sort((a, b) => b.totalXP - a.totalXP)
}

/** Stats onglet éducateur : premier groupe ASSO dont il est OWNER + classement membres (sans lui). */
export const getEducatorAssociationOverview = async (userId) => {
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
    getLeaderboard(groupId),
    db.groupMember.count({ where: { groupId } }),
  ])

  return {
    group:       { id: membership.group.id, name: membership.group.name },
    memberCount,
    leaderboard,
  }
}

export const getMyProfile = async (userId) => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, username: true, avatar: true, createdAt: true },
  })

  const logs = await db.habitLog.findMany({
    where: { userId },
    include: { habit: { select: { xp: true } } },
  })

  const dailyLogs = await db.dailyLog.findMany({ where: { userId } })

  const totalXP  = logs.reduce((sum, l) => sum + l.habit.xp, 0)
  const progress = xpProgress(totalXP)
  const title    = titleForLevel(progress.level)
  const dates    = [...new Set(logs.map((l) => l.date.toISOString().slice(0, 10)))]
  const streak   = computeStreak(dates)

  return { ...user, totalXP, ...progress, title, streak }
}

// Calendrier année : tous les jours avec data agrégée + détails émotionnels
export const getCalendarYear = async (userId, year) => {
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
    select: { id: true, name: true, icon: true, xp: true, createdAt: true, isActive: true },
  })

  // Indexer dailyLogs par date pour accès rapide
  const dailyLogsMap = {}
  dailyLogs.forEach((log) => {
    dailyLogsMap[log.date.toISOString().slice(0, 10)] = log
  })

  // Générer tableau des 365 jours de l'année
  const days = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    
    // Logs habitudes ce jour
    const dayLogs = habitLogs.filter((l) => l.date.toISOString().slice(0, 10) === dateStr)
    
    // Habitudes actives à cette date (créées avant ou le jour même)
    const activeHabits = allHabits.filter((h) => {
      const createdDate = new Date(h.createdAt).toISOString().slice(0, 10)
      return createdDate <= dateStr && h.isActive
    })
    
    const habitsDone  = dayLogs.length
    const habitsTotal = activeHabits.length
    const habitRate   = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0
    const xp          = dayLogs.reduce((sum, l) => sum + l.habit.xp, 0)
    
    // Daily log (mood, sommeil, journal)
    const dailyLog = dailyLogsMap[dateStr]
    
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
    })
  }

  return { year, days }
}

// Insights : corrélations mood/sommeil/réussite sur les N derniers jours
export const getInsights = async (userId, daysCount = 30) => {
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

  // Récupérer habitudes actives pour calculer les taux
  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
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
    const dayLogs = habitLogs.filter(l => l.date.toISOString().slice(0, 10) === date)
    const habitRate = Math.round((dayLogs.length / habits.length) * 100)
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
