import { writable } from 'svelte/store'

export const levelGuideModal = writable({ open: false })

export const openLevelGuideModal = () => {
  levelGuideModal.set({ open: true })
}

export const closeLevelGuideModal = () => {
  levelGuideModal.set({ open: false })
}

export const resetLevelGuideModal = () => {
  closeLevelGuideModal()
}
