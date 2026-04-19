/** Conversion clé VAPID base64 URL → Uint8Array (Web Push) */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/**
 * @param {string} vapidPublicKey
 * @returns {Promise<object>} subscription JSON pour POST /api/push/subscribe
 */
export async function createPushSubscriptionJson(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    throw new Error('Notifications push non supportées sur ce navigateur')

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  return sub.toJSON()
}
