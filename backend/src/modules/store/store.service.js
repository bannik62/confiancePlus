import { db } from '../../core/db.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'
import { STORE_ITEMS, STORE_SKUS } from './store.catalog.js'

export const getStoreCatalog = () => ({ items: STORE_ITEMS })

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
