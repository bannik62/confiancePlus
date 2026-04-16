import { db } from '../../core/db.js'

export const userIsAppAdmin = async (userId) => {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
  return u?.isAdmin === true
}
