import { db } from '../../core/db.js'

/**
 * Propriétaire d’au moins un groupe ASSOCIATION — compte cantonné au suivi de groupe
 * (pas d’habitudes / check-in perso sur ce userId ; compte perso = autre e-mail).
 */
export const userIsAssociationOwner = async (userId) => {
  const row = await db.groupMember.findFirst({
    where: {
      userId,
      role:  'OWNER',
      group: { type: 'ASSOCIATION' },
    },
    select: { userId: true },
  })
  return !!row
}
