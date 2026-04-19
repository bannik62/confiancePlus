import { db } from '../../core/db.js'
import {
  ALL_WEEKDAYS_MASK,
  isHabitDueOnYmd,
  normalizeWeekdaysMask,
} from '../../lib/habitWeekdays.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'
import * as cristaux from '../cristaux/cristaux.service.js'

const forbidEducatorHabitMutations = async (userId) => {
  if (await userIsAssociationOwner(userId))
    throw {
      status: 403,
      message: 'Compte éducateur association : pas d’habitudes personnelles sur ce profil. Utilise un autre compte pour ton suivi perso.',
    }
  if (await userIsAppAdmin(userId))
    throw {
      status: 403,
      message: 'Compte administrateur : pas d’habitudes dans l’app.',
    }
}

/** YYYY-MM-DD → Date à midi UTC (@db.Date, aligné check-in) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/** @param {string} [dateStr] — YYYY-MM-DD côté client ; sinon jour UTC serveur */
export const getHabits = async (userId, dateStr) => {
  if (await userIsAssociationOwner(userId) || (await userIsAppAdmin(userId))) return []
  const ymd =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : new Date().toISOString().slice(0, 10)
  const day = dateFromYMD(ymd)
  const rows = await db.habit.findMany({
    where: { userId, isActive: true },
    orderBy: { order: 'asc' },
    include: { logs: { where: { date: day } } },
  })
  return rows.map((h) => {
    const weekdaysMask = h.weekdaysMask ?? ALL_WEEKDAYS_MASK
    return {
      ...h,
      weekdaysMask,
      isDue: isHabitDueOnYmd(weekdaysMask, ymd),
    }
  })
}

export const createHabit = async (userId, data) => {
  await forbidEducatorHabitMutations(userId)
  const weekdaysMask = normalizeWeekdaysMask(data.weekdaysMask)
  return db.habit.create({
    data: {
      name: data.name,
      icon: data.icon,
      order: data.order ?? 0,
      xp: 10,
      origin: 'USER',
      weekdaysMask,
      userId,
    },
  })
}

export const updateHabit = async (habitId, userId, data) => {
  await forbidEducatorHabitMutations(userId)
  const habit = await assertOwner(habitId, userId)
  const { name, icon, order, weekdaysMask } = data

  if (habit.origin === 'DAILY_OFFER') {
    if (name !== undefined || icon !== undefined || order !== undefined)
      throw {
        status: 400,
        message:
          'Cette habitude « du jour » ne peut pas être renommée ni modifiée sur l’icône. Choisis uniquement les jours de la semaine.',
      }
    if (weekdaysMask === undefined)
      throw { status: 400, message: 'Indique au moins les jours (weekdaysMask).' }
    return db.habit.update({
      where: { id: habitId },
      data: { weekdaysMask: normalizeWeekdaysMask(weekdaysMask) },
    })
  }

  const patch = {}
  if (name !== undefined) patch.name = name
  if (icon !== undefined) patch.icon = icon
  if (order !== undefined) patch.order = order
  if (weekdaysMask !== undefined) patch.weekdaysMask = normalizeWeekdaysMask(weekdaysMask)
  return db.habit.update({ where: { id: habitId }, data: patch })
}

export const deleteHabit = async (habitId, userId) => {
  await forbidEducatorHabitMutations(userId)
  const habit = await assertOwner(habitId, userId)
  if (habit.origin === 'DAILY_OFFER')
    throw {
      status: 403,
      message: 'Les habitudes « du jour » ne peuvent pas être supprimées.',
    }
  return db.habit.update({ where: { id: habitId }, data: { isActive: false } })
}

export const toggleHabit = async (habitId, userId, dateStr) => {
  await forbidEducatorHabitMutations(userId)
  const habit = await assertOwner(habitId, userId)
  const ymd =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : new Date().toISOString().slice(0, 10)
  if (!isHabitDueOnYmd(habit.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd))
    throw {
      status: 400,
      message: "Cette habitude n'est pas prévue ce jour-là.",
    }
  const date = dateFromYMD(ymd)

  const existing = await db.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
  })

  if (existing) {
    await db.habitLog.delete({ where: { id: existing.id } })
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { cristaux: true },
    })
    return {
      checked: false,
      cristaux: u?.cristaux ?? 0,
      grantedJourneeParfaite: false,
    }
  }

  await db.habitLog.create({ data: { habitId, userId, date } })
  const jp = await cristaux.tryGrantJourneeParfaite(userId, ymd)
  return {
    checked: true,
    cristaux: jp.cristaux,
    grantedJourneeParfaite: jp.grantedJourneeParfaite,
  }
}

/** @returns {Promise<import('@prisma/client').Habit>} */
const assertOwner = async (habitId, userId) => {
  const habit = await db.habit.findUnique({ where: { id: habitId } })
  if (!habit || habit.userId !== userId)
    throw { status: 403, message: 'Accès refusé' }
  return habit
}
