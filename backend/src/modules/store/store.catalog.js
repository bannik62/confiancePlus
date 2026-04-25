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
      'En réserve dans ton stock : au lendemain d’un jour raté, quand un sauvetage de série est proposé, tu consommes 1 joker pour rattraper ta flamme. Achète-le ici avec tes cristaux.',
    icon:            '🃏',
    priceCristaux:   8,
  },
]
