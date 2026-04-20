/**
 * Catalogue boutique (MVP) — prix en cristaux, effet côté serveur à l’achat.
 * SKU unique joker streak pour l’instant.
 */
export const STORE_SKUS = {
  JOKER_STREAK: 'JOKER_STREAK',
}

/** @type {Array<{ sku: string, name: string, description: string, icon: string, priceCristaux: number }>} */
export const STORE_ITEMS = [
  {
    sku:             STORE_SKUS.JOKER_STREAK,
    name:            'Joker de série',
    description:
      'Conserve un joker pour le jour où ta flamme chute : au sauvetage, utilise-le à la place de 5 cristaux.',
    icon:            '🃏',
    priceCristaux:   8,
  },
]
