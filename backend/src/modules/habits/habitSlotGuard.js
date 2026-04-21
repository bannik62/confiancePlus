import { db } from '../../core/db.js'
import { getUserTotalGameXp } from '../../core/userGameXp.js'
import { levelFromXP, maxActiveHabitsForLevel } from '../../core/xpEngine.js'

/**
 * @param {string} userId
 * @param {string} clientYmd — YYYY-MM-DD (jour civil client, aligné profil / classement)
 */
export const getHabitSlotInfo = async (userId, clientYmd) => {
  const [activeHabitCount, totalXP] = await Promise.all([
    db.habit.count({ where: { userId, isActive: true } }),
    getUserTotalGameXp(userId, clientYmd),
  ])
  const level = levelFromXP(totalXP)
  const maxActiveHabits = maxActiveHabitsForLevel(level)
  return { activeHabitCount, level, maxActiveHabits }
}

export const assertActiveHabitSlotAvailable = async (userId, clientYmd) => {
  const { activeHabitCount, level, maxActiveHabits } = await getHabitSlotInfo(
    userId,
    clientYmd,
  )
  if (activeHabitCount >= maxActiveHabits) {
    throw {
      status: 400,
      message: `Nombre maximum d’habitudes actives atteint (${maxActiveHabits} au niveau ${level}). Désactive une habitude ou gagne de l’XP pour monter de niveau.`,
    }
  }
}
