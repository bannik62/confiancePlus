import { runPushReminderTick } from '../modules/push/push.service.js'

const INTERVAL_MS = 60_000

/**
 * Lance un tick chaque minute (rappel à l’heure locale configurée).
 * @returns {() => void} arrêt du timer
 */
export const startPushReminderJob = () => {
  const id = setInterval(() => {
    void runPushReminderTick().catch((err) => {
      console.error('[pushReminder]', err)
    })
  }, INTERVAL_MS)
  return () => clearInterval(id)
}
