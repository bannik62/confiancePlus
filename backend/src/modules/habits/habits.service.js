import { db } from '../../core/db.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'

const forbidEducatorHabitMutations = async (userId) => {
  if (await userIsAssociationOwner(userId))
    throw {
      status: 403,
      message: 'Compte éducateur association : pas d’habitudes personnelles sur ce profil. Utilise un autre compte pour ton suivi perso.',
    }
}

/** Jour civil UTC « serveur » (YYYY-MM-DD → midi UTC, même convention que check-in) */
const utcCalendarDate = () => {
  const ymd = new Date().toISOString().slice(0, 10)
  return dateFromYMD(ymd)
}

/** YYYY-MM-DD → Date à midi UTC (@db.Date, aligné check-in) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/** @param {string} [dateStr] — YYYY-MM-DD côté client ; sinon jour UTC serveur */
export const getHabits = async (userId, dateStr) => {
  if (await userIsAssociationOwner(userId)) return []
  const day =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateFromYMD(dateStr) : utcCalendarDate()
  return db.habit.findMany({
    where: { userId, isActive: true },
    orderBy: { order: 'asc' },
    include: { logs: { where: { date: day } } },
  })
}

export const createHabit = async (userId, data) => {
  await forbidEducatorHabitMutations(userId)
  return db.habit.create({
    data: {
      name: data.name,
      icon: data.icon,
      order: data.order ?? 0,
      xp: 10,
      origin: 'USER',
      userId,
    },
  })
}

export const updateHabit = async (habitId, userId, data) => {
  await forbidEducatorHabitMutations(userId)
  const habit = await assertOwner(habitId, userId)
  if (habit.origin !== 'USER')
    throw { status: 403, message: 'Seules les habitudes personnelles peuvent être modifiées' }
  const { name, icon, order } = data
  const patch = {}
  if (name !== undefined) patch.name = name
  if (icon !== undefined) patch.icon = icon
  if (order !== undefined) patch.order = order
  return db.habit.update({ where: { id: habitId }, data: patch })
}

export const deleteHabit = async (habitId, userId) => {
  await forbidEducatorHabitMutations(userId)
  const habit = await assertOwner(habitId, userId)
  if (habit.origin !== 'USER')
    throw { status: 403, message: 'Seules les habitudes personnelles peuvent être supprimées' }
  return db.habit.update({ where: { id: habitId }, data: { isActive: false } })
}

export const toggleHabit = async (habitId, userId, dateStr) => {
  await forbidEducatorHabitMutations(userId)
  await assertOwner(habitId, userId)
  const date =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateFromYMD(dateStr) : utcCalendarDate()

  const existing = await db.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
  })

  if (existing) {
    await db.habitLog.delete({ where: { id: existing.id } })
    return { checked: false }
  }

  await db.habitLog.create({ data: { habitId, userId, date } })
  return { checked: true }
}

/** @returns {Promise<import('@prisma/client').Habit>} */
const assertOwner = async (habitId, userId) => {
  const habit = await db.habit.findUnique({ where: { id: habitId } })
  if (!habit || habit.userId !== userId)
    throw { status: 403, message: 'Accès refusé' }
  return habit
}
