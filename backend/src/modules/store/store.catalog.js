/**
 * Catalogue boutique — prix en cristaux, effet côté serveur à l’achat.
 */
export const STORE_SKUS = {
  JOKER_STREAK: 'JOKER_STREAK',
  /** Badge décor classements (groupe + global) */
  FLEX_BADGE_V1: 'FLEX_BADGE_V1',
}

/**
 * @type {Array<{
 *   sku: string,
 *   name: string,
 *   description: string,
 *   icon: string,
 *   priceCristaux: number,
 *   kind?: 'FLEX_BADGE',
 *   minLevel?: number,
 *   imageSrc?: string,
 * }>}
 */
export const STORE_ITEMS = [
  {
    sku:             STORE_SKUS.JOKER_STREAK,
    name:            'Joker de série',
    description:
      'En réserve dans ton stock : au lendemain d’un jour raté, quand un sauvetage de série est proposé, tu consommes 1 joker pour rattraper ta flamme. Achète-le ici avec tes cristaux.',
    icon:            '🃏',
    priceCristaux:   8,
  },
  {
    kind:            'FLEX_BADGE',
    sku:             STORE_SKUS.FLEX_BADGE_V1,
    name:            'Badge Flex — Cultivateur',
    description:
      'S’affiche à côté de ton palier de série sur les classements groupe et global. Débloqué à partir du titre « Cultivateur de constance » (niveau 5).',
    icon:            '✨',
    priceCristaux:   50,
    minLevel:        5,
    imageSrc:        '/badges/FlexBadge/flexbadgeOne.png',
  },
]
