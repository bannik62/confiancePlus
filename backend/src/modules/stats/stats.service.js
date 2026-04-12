import { db } from '../../core/db.js'
import { levelFromXP, xpProgress, titleForLevel, computeStreak, computeDayXP } from '../../core/xpEngine.js'

// 7 derniers jours au format YYYY-MM-DD
const last7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

export const getMyStats = async (userId) => {
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

export const getGlobalLeaderboard = async () => {
  const users = await db.user.findMany({
    where:  { isPending: false },
    select: {
      id: true, username: true, avatar: true,
      habitLogs: { select: { date: true, habit: { select: { xp: true } } } },
    },
  })

  return users
    .map((user) => {
      const totalXP = user.habitLogs.reduce((sum, l) => sum + l.habit.xp, 0)
      const level   = levelFromXP(totalXP)
      const title   = titleForLevel(level)
      const dates   = [...new Set(user.habitLogs.map(l => l.date.toISOString().slice(0, 10)))]
      const streak  = computeStreak(dates)
      return { id: user.id, username: user.username, avatar: user.avatar, totalXP, level, title, streak }
    })
    .sort((a, b) => b.totalXP - a.totalXP)
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
