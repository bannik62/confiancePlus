import { db } from '../../core/db.js'
import { webpush, isPushConfigured } from '../../core/pushWeb.js'
import { getLocalHour, getLocalMinute, getLocalYmd } from '../../lib/timezoneLocal.js'
import { userHasPendingDueHabits } from './habitReminder.js'

const SETTING_KEY = 'push.defaultReminderHour'

export const getDefaultReminderHour = async () => {
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEY } })
  const n = parseInt(row?.value ?? '14', 10)
  if (!Number.isFinite(n) || n < 0 || n > 23) return 14
  return n
}

export const setDefaultReminderHour = async (hour) => {
  const h = Math.min(23, Math.max(0, parseInt(String(hour), 10)))
  if (!Number.isFinite(h)) throw { status: 400, message: 'Heure invalide' }
  await db.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: String(h) },
    update: { value: String(h) },
  })
  return { defaultReminderHour: h }
}

export const getPushSettingsAdmin = async () => ({
  defaultReminderHour: await getDefaultReminderHour(),
})

/**
 * @param {string} userId
 * @param {{ endpoint: string, keys?: { p256dh: string, auth: string } }} body
 */
export const subscribe = async (userId, body) => {
  if (!isPushConfigured()) throw { status: 503, message: 'Notifications push non configurées (VAPID)' }
  const endpoint = body?.endpoint
  const k = body?.keys
  if (!endpoint || typeof endpoint !== 'string' || !k?.p256dh || !k?.auth)
    throw { status: 400, message: 'Subscription invalide' }

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh: String(k.p256dh),
      auth: String(k.auth),
    },
    update: {
      userId,
      p256dh: String(k.p256dh),
      auth: String(k.auth),
    },
  })
  await db.user.update({
    where: { id: userId },
    data: { pushNotificationsEnabled: true },
  })
  return { ok: true }
}

/** @param {string} userId @param {string} [endpoint] */
export const unsubscribe = async (userId, endpoint) => {
  if (endpoint) {
    const row = await db.pushSubscription.findFirst({
      where: { userId, endpoint },
    })
    if (row) await db.pushSubscription.delete({ where: { id: row.id } })
  } else {
    await db.pushSubscription.deleteMany({ where: { userId } })
  }
  const remaining = await db.pushSubscription.count({ where: { userId } })
  if (remaining === 0) {
    await db.user.update({
      where: { id: userId },
      data: { pushNotificationsEnabled: false },
    })
  }
  return { ok: true }
}

/**
 * @param {{ endpoint: string, p256dh: string, auth: string }} row
 * @param {Record<string, unknown>} payload
 */
export const sendPayloadToSubscription = async (row, payload) => {
  const subscription = {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  }
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 86_400,
  })
}

/**
 * Notif test (admin) — message fixe pour valider Web Push.
 * @param {string | null} [userId] Si défini : uniquement les appareils de cet utilisateur. Sinon : tous les abonnements en base (pour tester même si le tel est sur un autre compte que l’admin).
 */
export const sendTestGiftNotification = async (userId = null) => {
  if (!isPushConfigured()) throw { status: 503, message: 'Notifications push non configurées (VAPID)' }
  const subs = userId
    ? await db.pushSubscription.findMany({ where: { userId } })
    : await db.pushSubscription.findMany()
  if (subs.length === 0) {
    throw {
      status: 400,
      message: userId
        ? 'Aucun abonnement push pour ce compte — active les notifications sur un appareil connecté avec ce même utilisateur.'
        : 'Aucun abonnement push en base — un utilisateur doit activer les rappels depuis au moins un appareil.',
    }
  }

  const payload = {
    title: 'HabiTracks',
    body: 'Vous aviez un cadeau',
    url: '/',
    tag: 'test-gift',
  }
  const errors = []
  for (const s of subs) {
    try {
      await sendPayloadToSubscription(s, payload)
    } catch (e) {
      const code = e?.statusCode
      if (code === 404 || code === 410)
        await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
      errors.push(code ?? e?.message ?? 'erreur')
    }
  }
  if (errors.length === subs.length)
    throw { status: 502, message: `Échec envoi push (${errors.join(', ')})` }
  return { ok: true, sent: subs.length - errors.length, total: subs.length }
}

/** Boucle planifiée : rappel habitudes (1× / jour local, créneau horaire admin + fuseau user) */
export const runPushReminderTick = async () => {
  if (!isPushConfigured()) return

  const users = await db.user.findMany({
    where: {
      pushNotificationsEnabled: true,
      isSuspended: false,
      isPending: false,
      isAdmin: false,
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      ianaTimezone: true,
      pushReminderHour: true,
      lastPushReminderSentYmd: true,
    },
  })

  const defaultHour = await getDefaultReminderHour()
  const now = new Date()

  for (const u of users) {
    const tz = u.ianaTimezone || 'Europe/Paris'
    const ymd = getLocalYmd(tz, now)
    const hour = getLocalHour(tz, now)
    const minute = getLocalMinute(tz, now)
    const reminderHour = u.pushReminderHour ?? defaultHour

    if (hour !== reminderHour || minute > 4) continue
    if (u.lastPushReminderSentYmd === ymd) continue
    if (!(await userHasPendingDueHabits(u.id, ymd))) continue

    const subs = await db.pushSubscription.findMany({ where: { userId: u.id } })
    if (subs.length === 0) continue

    const payload = {
      title: 'HabiTracks',
      body: 'Pense à cocher tes habitudes du jour.',
      url: '/',
      tag: 'habit-reminder',
    }

    let anyOk = false
    for (const s of subs) {
      try {
        await sendPayloadToSubscription(s, payload)
        anyOk = true
      } catch (e) {
        const code = e?.statusCode
        if (code === 404 || code === 410)
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
      }
    }

    if (anyOk) {
      await db.user.update({
        where: { id: u.id },
        data: { lastPushReminderSentYmd: ymd },
      })
    }
  }
}
