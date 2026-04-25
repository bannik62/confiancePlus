import { writable, get } from 'svelte/store'

/** @typedef {'celebration' | 'success' | 'info' | 'warning'} AppModalVariant */

const initial = () => ({
  open: false,
  title: '',
  body: '',
  icon: '✨',
  /** @type {AppModalVariant} */
  variant: 'info',
  primaryLabel: 'OK',
  secondaryLabel: null,
  /** @type {null | (() => void)} */
  _onPrimary: null,
  /** @type {null | (() => void)} */
  _onSecondary: null,
})

export const appModal = writable(initial())

/**
 * @param {{
 *   title: string
 *   body: string
 *   icon?: string
 *   variant?: AppModalVariant
 *   primaryLabel?: string
 *   onPrimary?: () => void
 *   secondaryLabel?: string
 *   onSecondary?: () => void
 * }} opts
 */
export const openAppModal = (opts) => {
  appModal.set({
    open: true,
    title: opts.title ?? '',
    body: opts.body ?? '',
    icon: opts.icon ?? '✨',
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

export const runPrimaryAndClose = () => {
  const s = get(appModal)
  try {
    s._onPrimary?.()
  } finally {
    closeAppModal()
  }
}

export const runSecondaryAndClose = () => {
  const s = get(appModal)
  try {
    s._onSecondary?.()
  } finally {
    closeAppModal()
  }
}

export const resetAppModal = () => {
  closeAppModal()
}
