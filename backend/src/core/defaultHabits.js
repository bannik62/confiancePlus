import { db } from './db.js'
import { DEFAULT_HABITS } from './defaultHabitsData.js'

export { DEFAULT_HABITS }

/** À l’inscription / activation : crée les 5 habitudes de base pour ce user. */
export const createDefaultHabitsForUser = async (userId) => {
  await db.habit.createMany({
    data: DEFAULT_HABITS.map((h) => ({
      userId,
      name: h.name,
      icon: h.icon,
      xp: h.xp,
      order: h.order,
      origin: 'DEFAULT',
    })),
  })
}
