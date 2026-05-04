import { db } from '../../core/db.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'
import { STORE_ITEMS, STORE_SKUS } from './store.catalog.js'
import { getUserLevelForAnchor } from './store.userLevel.js'

export const getStoreCatalog = () => ({ items: STORE_ITEMS })

/**
 * Catalogue enrichi pour l’UI (Flex : possédé / niveau / lock).
 * @param {string} userId
 */
export const getStoreCatalogForUser = async (userId) => {
  const level = await getUserLevelForAnchor(userId)
  const ownedRows = await db.flexBadgePurchase.findMany({
    where: { userId },
    select: { sku: true },
  })
  const ownedSet = new Set(ownedRows.map((r) => r.sku))
  const items = STORE_ITEMS.map((item) => {
    if (item.kind === 'FLEX_BADGE') {
      const owned = ownedSet.has(item.sku)
      const levelLocked = item.minLevel != null && level < item.minLevel
      return {
        ...item,
        owned,
        userLevel: level,
        levelLocked,
      }
    }
    return item
  })
  return { items, userLevel: level }
}

/**
 * Achat boutique : débit cristaux + crédit inventaire selon le SKU.
 */
export const purchaseStoreItem = async (userId, sku) => {
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas de boutique joueur.' }
  if (await userIsAssociationOwner(userId))
    throw { status: 403, message: 'Compte éducateur : pas de boutique sur ce profil.' }

  const item = STORE_ITEMS.find((i) => i.sku === sku)
  if (!item) throw { status: 400, message: 'Article inconnu.' }

  if (item.kind === 'FLEX_BADGE') {
    const level = await getUserLevelForAnchor(userId)
    if (item.minLevel != null && level < item.minLevel) {
      throw {
        status: 400,
        message: `Disponible à partir du niveau ${item.minLevel} (Cultivateur de constance).`,
      }
    }
    const out = await db.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { cristaux: true, jokerStreak: true },
      })
      if (!u) throw { status: 404, message: 'Utilisateur introuvable.' }
      if (u.cristaux < item.priceCristaux)
        throw { status: 400, message: 'Pas assez de cristaux.' }

      const existing = await tx.flexBadgePurchase.findUnique({
        where: { userId_sku: { userId, sku } },
      })
      if (existing) throw { status: 400, message: 'Tu possèdes déjà ce badge.' }

      await tx.flexBadgePurchase.create({
        data: {
          userId,
          sku,
          pricePaidCristaux: item.priceCristaux,
        },
      })

      return tx.user.update({
        where: { id: userId },
        data: { cristaux: { decrement: item.priceCristaux } },
        select: { cristaux: true, jokerStreak: true },
      })
    })
    return { sku, ...out }
  }

  const out = await db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { cristaux: true, jokerStreak: true },
    })
    if (!u) throw { status: 404, message: 'Utilisateur introuvable.' }
    if (u.cristaux < item.priceCristaux)
      throw { status: 400, message: 'Pas assez de cristaux.' }

    let data = { cristaux: { decrement: item.priceCristaux } }
    if (sku === STORE_SKUS.JOKER_STREAK) {
      data = { ...data, jokerStreak: { increment: 1 } }
    } else {
      throw { status: 400, message: 'Cet article n’est pas encore activé.' }
    }

    return tx.user.update({
      where: { id: userId },
      data,
      select: { cristaux: true, jokerStreak: true },
    })
  })

  return { sku, ...out }
}
