import { writable, get } from 'svelte/store'

/** @typedef {'celebration' | 'success' | 'info' | 'warning'} AppModalVariant */

const initial = () => ({
  open: false,
  title: '',
  body: '',
  icon: '✨',
  /** Chemin public (ex. /badges/...png) — si défini, affiché à la place du gros emoji */
  heroImage: null,
  /** @type {AppModalVariant} */
  variant: 'info',
  primaryLabel: 'OK',
  secondaryLabel: null,
  /** @type {null | (() => void | Promise<void>)} */
  _onPrimary: null,
  /** @type {null | (() => void | Promise<void>)} */
  _onSecondary: null,
  /** Cadre ext., Échap ou bouton × — pas appelé après le bouton principal (évite double logique) */
  /** @type {null | (() => void | Promise<void>)} */
  _onClose: null,
})

const clearModal = () => appModal.set(initial())

export const appModal = writable(initial())

/**
 * @param {{
 *   title: string
 *   body: string
 *   icon?: string
 *   heroImage?: string | null
 *   variant?: AppModalVariant
 *   primaryLabel?: string
 *   onPrimary?: () => void | Promise<void>
 *   secondaryLabel?: string
 *   onSecondary?: () => void | Promise<void>
 *   onClose?: () => void | Promise<void>
 * }} opts
 */
export const openAppModal = (opts) => {
  appModal.set({
    open: true,
    title: opts.title ?? '',
    body: opts.body ?? '',
    icon: opts.icon ?? '✨',
    heroImage: opts.heroImage ?? null,
    variant: opts.variant ?? 'info',
    primaryLabel: opts.primaryLabel ?? 'OK',
    secondaryLabel: opts.secondaryLabel ?? null,
    _onPrimary: opts.onPrimary ?? null,
    _onSecondary: opts.onSecondary ?? null,
    _onClose: opts.onClose ?? null,
  })
}

export const closeAppModal = () => {
  const s = get(appModal)
  if (s.open) {
    try {
      void Promise.resolve(s._onClose?.())
    } catch {
      /* ignore */
    }
  }
  clearModal()
}

export const runPrimaryAndClose = async () => {
  const s = get(appModal)
  try {
    await s._onPrimary?.()
  } finally {
    clearModal()
  }
}

export const runSecondaryAndClose = async () => {
  const s = get(appModal)
  try {
    await s._onSecondary?.()
  } finally {
    clearModal()
  }
}

/** Déconnexion / reset session — sans hooks `onClose`. */
export const resetAppModal = () => {
  clearModal()
}
