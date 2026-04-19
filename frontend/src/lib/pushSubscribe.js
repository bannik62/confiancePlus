/** Conversion clé VAPID base64 URL → Uint8Array (Web Push) */
export function urlBase64ToUint8Array(base64String) {
  const cleaned = String(base64String ?? '')
    .trim()
    .replace(/\r/g, '')
    .replace(/\n/g, '')
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4)
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/** Clé publique VAPID décodée = 65 octets (courbe P-256), sinon la souscription échoue côté FCM. */
const VAPID_PUBLIC_DECODED_LENGTH = 65

/**
 * @param {string} vapidPublicKey
 * @returns {Promise<object>} subscription JSON pour POST /api/push/subscribe
 */
export async function createPushSubscriptionJson(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    throw new Error('Notifications push non supportées sur ce navigateur')

  const keyBytes = urlBase64ToUint8Array(vapidPublicKey)
  if (keyBytes.length !== VAPID_PUBLIC_DECODED_LENGTH) {
    throw new Error(
      `Clé VAPID invalide (${keyBytes.length} octets après décodage, attendu ${VAPID_PUBLIC_DECODED_LENGTH}). Vérifie VAPID_PUBLIC_KEY sur le serveur (une seule ligne, sans guillemets ni espace).`,
    )
  }

  const reg = await navigator.serviceWorker.ready
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes,
    })
    return sub.toJSON()
  } catch (e) {
    const msg = e?.message || String(e)
    if (/push service|Registration failed/i.test(msg)) {
      throw new Error(
        'Échec d’enregistrement auprès du service push (souvent Brave / bloqueur ou clés VAPID). ' +
          'Essaie : Brave → icône lion → Shields réduits ou désactivés pour ce site ; ou teste avec Chrome. ' +
          'Vérifie aussi que la paire VAPID sur le serveur est celle générée par la même commande `web-push generate-vapid-keys`.',
      )
    }
    throw e
  }
}
