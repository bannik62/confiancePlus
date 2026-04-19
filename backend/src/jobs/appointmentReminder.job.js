import { runAppointmentReminderTick } from '../modules/appointments/appointmentReminder.service.js'

const INTERVAL_MS = 60_000

/**
 * Surveillance des RDV : e-mail la veille (après l’heure locale configurée) et 1 h avant.
 * @returns {() => void}
 */
export const startAppointmentReminderJob = () => {
  const id = setInterval(() => {
    void runAppointmentReminderTick().catch((err) => {
      console.error('[appointmentReminder]', err)
    })
  }, INTERVAL_MS)
  return () => clearInterval(id)
}
