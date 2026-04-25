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
})

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
  })
}

export const closeAppModal = () => {
  appModal.set(initial())
}

export const runPrimaryAndClose = async () => {
  const s = get(appModal)
  try {
    await s._onPrimary?.()
  } finally {
    closeAppModal()
  }
}

export const runSecondaryAndClose = async () => {
  const s = get(appModal)
  try {
    await s._onSecondary?.()
  } finally {
    closeAppModal()
  }
}

export const resetAppModal = () => {
  closeAppModal()
}
