import { DateTime } from 'luxon'
import { db } from '../../core/db.js'
import { config } from '../../core/config.js'
import { sendMail, isMailConfigured } from '../../core/emailService.js'
import {
  buildBrandedHtml,
  emailBodyP,
  escapeHtml,
} from '../../core/emailBrandedTemplate.js'

/** YYYY-MM-DD → Date midi UTC (@db.Date) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

const ymdFromDate = (dt) => dt.toISOString().slice(0, 10)

const addDaysYmd = (ymd, delta) => {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  t.setUTCDate(t.getUTCDate() + delta)
  return t.toISOString().slice(0, 10)
}

const parseTimeHm = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim())
  if (!m) return { hour: 9, minute: 0 }
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: 9, minute: 0 }
  return { hour, minute }
}

const apptDateTimeInZone = (apptYmd, timeHm, iana) => {
  const [Y, M, D] = apptYmd.split('-').map(Number)
  const { hour, minute } = parseTimeHm(timeHm)
  return DateTime.fromObject(
    { year: Y, month: M, day: D, hour, minute },
    { zone: iana },
  )
}

/**
 * Un tick : e-mails « veille » (à heure locale fixe) et « 1 h avant » le RDV.
 * @returns {Promise<{ dayBefore: number, hourBefore: number, skipped: boolean }>}
 */
export const runAppointmentReminderTick = async () => {
  if (!isMailConfigured()) {
    return { dayBefore: 0, hourBefore: 0, skipped: true }
  }

  const utcYmd = DateTime.utc().toFormat('yyyy-MM-dd')
  const minYmd = addDaysYmd(utcYmd, -1)
  const maxYmd = addDaysYmd(utcYmd, 14)

  const rows = await db.appointment.findMany({
    where: {
      date: {
        gte: dateFromYMD(minYmd),
        lte: dateFromYMD(maxYmd),
      },
    },
    include: {
      assignee: {
        select: {
          email: true,
          ianaTimezone: true,
          username: true,
          isSuspended: true,
        },
      },
      completions: true,
    },
  })

  let dayBefore = 0
  let hourBefore = 0
  const agendaUrl = config.FRONTEND_URL.replace(/\/+$/, '')

  for (const appt of rows) {
    const u = appt.assignee
    if (!u?.email || u.isSuspended) continue

    const apptYmd = ymdFromDate(appt.date)
    const done = appt.completions.some((c) => ymdFromDate(c.date) === apptYmd)
    if (done) continue

    const iana = u.ianaTimezone || 'Europe/Paris'
    const now = DateTime.now().setZone(iana)
    const title = appt.title || 'Rendez-vous'

    // —— Veille du RDV (jour civil local = jour avant la date du RDV, après l’heure configurée)
    if (!appt.emailReminderDayBeforeSentAt) {
      const veilleYmd = addDaysYmd(apptYmd, -1)
      if (
        now.toFormat('yyyy-MM-dd') === veilleYmd &&
        now.hour >= config.APPOINTMENT_REMINDER_DAY_BEFORE_HOUR
      ) {
        const subj = `[Habitracks] Demain : ${title}`
        const text = `Bonjour ${u.username},

Rappel : tu as un rendez-vous demain (${apptYmd}) à ${appt.timeHm}.
${appt.notes ? `Notes : ${appt.notes}\n` : ''}
Agenda : ${agendaUrl}

À demain,
L’équipe Habitracks`
        const innerHtml = [
          emailBodyP(`Bonjour ${escapeHtml(u.username)},`),
          emailBodyP(
            `<strong>Rappel</strong> : rendez-vous <strong>demain</strong> le <strong>${escapeHtml(apptYmd)}</strong> à <strong>${escapeHtml(appt.timeHm)}</strong>.`,
          ),
          appt.notes ? emailBodyP(`Notes : ${escapeHtml(appt.notes)}`) : '',
        ]
          .filter(Boolean)
          .join('')
        const html = buildBrandedHtml({
          heading: `Demain : ${title}`,
          innerHtml,
          ctaUrl: agendaUrl,
          ctaLabel: 'Ouvrir l’agenda',
          preheader: `Rappel RDV demain à ${appt.timeHm}`,
        })

        try {
          await sendMail({ to: u.email, subject: subj, text, html })
          await db.appointment.update({
            where: { id: appt.id },
            data: { emailReminderDayBeforeSentAt: new Date() },
          })
          dayBefore += 1
        } catch (e) {
          console.error('[appointmentReminder] veille', appt.id, e?.message || e)
        }
      }
    }

    // —— 1 h avant le RDV (fuseau de l’assigné)
    if (!appt.emailReminderHourBeforeSentAt) {
      const rdv = apptDateTimeInZone(apptYmd, appt.timeHm, iana)
      if (rdv.isValid && now >= rdv.minus({ hours: 1 }) && now < rdv) {
        const subj = `[Habitracks] Dans 1 h : ${title}`
        const text = `Bonjour ${u.username},

Ton rendez-vous « ${title} » a lieu à ${appt.timeHm} (aujourd’hui).
${appt.notes ? `Notes : ${appt.notes}\n` : ''}
Agenda : ${agendaUrl}

À tout de suite,
L’équipe Habitracks`
        const innerHtml = [
          emailBodyP(`Bonjour ${escapeHtml(u.username)},`),
          emailBodyP(
            `Ton rendez-vous <strong>${escapeHtml(title)}</strong> commence dans <strong>environ 1 h</strong> (${escapeHtml(appt.timeHm)}).`,
          ),
          appt.notes ? emailBodyP(`Notes : ${escapeHtml(appt.notes)}`) : '',
        ]
          .filter(Boolean)
          .join('')
        const html = buildBrandedHtml({
          heading: `Dans 1 h : ${title}`,
          innerHtml,
          ctaUrl: agendaUrl,
          ctaLabel: 'Ouvrir l’agenda',
          preheader: `RDV dans environ 1 h — ${appt.timeHm}`,
        })

        try {
          await sendMail({ to: u.email, subject: subj, text, html })
          await db.appointment.update({
            where: { id: appt.id },
            data: { emailReminderHourBeforeSentAt: new Date() },
          })
          hourBefore += 1
        } catch (e) {
          console.error('[appointmentReminder] 1h', appt.id, e?.message || e)
        }
      }
    }
  }

  return { dayBefore, hourBefore, skipped: false }
}
