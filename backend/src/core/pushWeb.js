import webpush from 'web-push'

let configured = false

/** Nettoie les clés copiées depuis .env (espaces, guillemets, \r). */
const trimKey = (s) => {
  if (typeof s !== 'string') return ''
  return s
    .trim()
    .replace(/\r/g, '')
    .replace(/^["']|["']$/g, '')
}

let vapidPublicTrimmed = ''
let vapidPrivateTrimmed = ''

export const initWebPush = () => {
  vapidPublicTrimmed = trimKey(process.env.VAPID_PUBLIC_KEY)
  vapidPrivateTrimmed = trimKey(process.env.VAPID_PRIVATE_KEY)
  const subject = trimKey(process.env.VAPID_SUBJECT) || 'mailto:habitracks@localhost'
  if (vapidPublicTrimmed && vapidPrivateTrimmed) {
    webpush.setVapidDetails(subject, vapidPublicTrimmed, vapidPrivateTrimmed)
    configured = true
  } else if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absents — notifications push désactivées.',
    )
  }
}

export const isPushConfigured = () => configured

export const getPublicVapidKey = () => vapidPublicTrimmed || null

export { webpush }
