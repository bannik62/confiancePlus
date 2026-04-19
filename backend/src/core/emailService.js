/**
 * Envoi SMTP via Gmail (Nodemailer) — aligné zerok-billing : GMAIL_USER + GMAIL_APP_PASSWORD.
 * Pas de logique métier ; les rappels RDV appellent sendMail().
 */
import nodemailer from 'nodemailer'
import { config } from './config.js'

let transporter = null
let warnedMissing = false

function getTransport() {
  if (transporter) return transporter
  if (!config.GMAIL_USER || !config.GMAIL_APP_PASSWORD) {
    if (!warnedMissing) {
      warnedMissing = true
      console.warn(
        '[email] GMAIL_USER ou GMAIL_APP_PASSWORD absent : rappels RDV par e-mail désactivés',
      )
    }
    return null
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.GMAIL_USER,
      pass: config.GMAIL_APP_PASSWORD,
    },
  })
  return transporter
}

export const isMailConfigured = () =>
  Boolean(config.GMAIL_USER && config.GMAIL_APP_PASSWORD)

/**
 * @param {{ to: string, subject: string, text: string, html?: string, from?: string }} options
 */
export async function sendMail({ to, subject, text, html, from }) {
  const transport = getTransport()
  if (!transport) {
    throw new Error("Envoi d'e-mail désactivé : GMAIL_USER ou GMAIL_APP_PASSWORD manquant")
  }
  await transport.sendMail({
    from: from ?? config.GMAIL_USER,
    to,
    subject,
    text,
    ...(html && { html }),
  })
}
