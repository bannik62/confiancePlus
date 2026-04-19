import webpush from 'web-push'

let configured = false

export const initWebPush = () => {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:habitracks@localhost'
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv)
    configured = true
  } else if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absents — notifications push désactivées.',
    )
  }
}

export const isPushConfigured = () => configured

export const getPublicVapidKey = () => process.env.VAPID_PUBLIC_KEY || null

export { webpush }
