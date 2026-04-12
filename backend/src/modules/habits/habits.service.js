import { db } from '../../core/db.js'

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
  const day =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateFromYMD(dateStr) : utcCalendarDate()
  return db.habit.findMany({
    where: { userId, isActive: true },
    orderBy: { order: 'asc' },
    include: { logs: { where: { date: day } } },
  })
}

export const createHabit = (userId, data) =>
  db.habit.create({ data: { ...data, userId } })

export const updateHabit = async (habitId, userId, data) => {
  await assertOwner(habitId, userId)
  return db.habit.update({ where: { id: habitId }, data })
}

export const deleteHabit = async (habitId, userId) => {
  await assertOwner(habitId, userId)
  return db.habit.update({ where: { id: habitId }, data: { isActive: false } })
}

export const toggleHabit = async (habitId, userId, dateStr) => {
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

const assertOwner = async (habitId, userId) => {
  const habit = await db.habit.findUnique({ where: { id: habitId } })
  if (!habit || habit.userId !== userId)
    throw { status: 403, message: 'Accès refusé' }
}
