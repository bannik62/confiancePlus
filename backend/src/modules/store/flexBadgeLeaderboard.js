import { db } from '../../core/db.js'
import { STORE_ITEMS } from './store.catalog.js'

const flexCatalogBySku = new Map(
  STORE_ITEMS.filter((i) => i.kind === 'FLEX_BADGE').map((i) => [i.sku, i]),
)

/**
 * Pour chaque userId : au plus une image Flex — priorité prix payé desc, puis achat le plus récent.
 * @param {string[]} userIds
 * @returns {Promise<Map<string, string | null>>}
 */
export async function flexBadgeSrcByUserIdMap(userIds) {
  const out = new Map()
  if (userIds.length === 0) return out
  const rows = await db.flexBadgePurchase.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, sku: true, pricePaidCristaux: true, purchasedAt: true },
  })
  /** @type {Map<string, { pricePaidCristaux: number, purchasedAt: Date, sku: string }>} */
  const best = new Map()
  for (const r of rows) {
    const prev = best.get(r.userId)
    if (!prev) {
      best.set(r.userId, r)
      continue
    }
    if (r.pricePaidCristaux > prev.pricePaidCristaux) best.set(r.userId, r)
    else if (r.pricePaidCristaux === prev.pricePaidCristaux && r.purchasedAt > prev.purchasedAt)
      best.set(r.userId, r)
  }
  for (const [uid, r] of best) {
    const meta = flexCatalogBySku.get(r.sku)
    out.set(uid, meta?.imageSrc ? String(meta.imageSrc) : null)
  }
  return out
}
