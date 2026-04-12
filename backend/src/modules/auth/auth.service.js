import { db } from '../../core/db.js'
import { hashPassword, verifyPassword, signToken } from '../../core/auth.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeUser = (user) => {
  const { passwordHash, activationCode, ...rest } = user
  return rest
}

// ── Register (compte autonome) ────────────────────────────────────────────────

export const register = async ({ email, username, password, avatar, group, inviteCode }) => {
  const exists = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (exists) throw { status: 409, message: 'Email ou username déjà utilisé' }

  const user = await db.user.create({
    data: {
      email,
      username,
      passwordHash: await hashPassword(password),
      avatar,
      isPending: false,
    },
  })

  // Créer un groupe si demandé
  if (group?.name) {
    const newGroup = await db.group.create({
      data: { name: group.name, type: group.type ?? 'FRIENDS' },
    })
    await db.groupMember.create({
      data: { userId: user.id, groupId: newGroup.id, role: 'OWNER' },
    })
  }

  // Rejoindre un groupe via code
  if (inviteCode) {
    const found = await db.group.findUnique({ where: { inviteCode } })
    if (!found) throw { status: 404, message: 'Code d\'invitation invalide' }
    await db.groupMember.create({
      data: { userId: user.id, groupId: found.id, role: 'MEMBER' },
    })
  }

  return { user: safeUser(user), token: signToken({ id: user.id, username: user.username }) }
}

// ── Login (compte autonome) ───────────────────────────────────────────────────

export const login = async ({ email, password }) => {
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash)
    throw { status: 401, message: 'Identifiants invalides' }

  if (user.isPending)
    throw { status: 403, message: 'Compte non activé — utilise ton code association' }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw { status: 401, message: 'Identifiants invalides' }

  return { user: safeUser(user), token: signToken({ id: user.id, username: user.username }) }
}

// ── Check code association ────────────────────────────────────────────────────
// Vérifie le code sans créer de session — retourne juste username + avatar
// pour afficher "Bonjour Lucas 🐺" avant de choisir le mot de passe

export const checkCode = async ({ code }) => {
  const user = await db.user.findUnique({
    where: { activationCode: code.toUpperCase() },
    select: { id: true, username: true, avatar: true, isPending: true },
  })

  if (!user || !user.isPending)
    throw { status: 404, message: 'Code invalide ou déjà utilisé' }

  return { username: user.username, avatar: user.avatar }
}

// ── Activate (code asso → choisir son mot de passe) ──────────────────────────

export const activate = async ({ code, password }) => {
  const user = await db.user.findUnique({
    where: { activationCode: code.toUpperCase() },
  })

  if (!user || !user.isPending)
    throw { status: 404, message: 'Code invalide ou déjà utilisé' }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash:   await hashPassword(password),
      isPending:      false,
      activationCode: null,   // code consommé — ne peut plus être réutilisé
    },
  })

  return { user: safeUser(updated), token: signToken({ id: updated.id, username: updated.username }) }
}

// ── Me ────────────────────────────────────────────────────────────────────────

export const me = async (userId) => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, username: true, avatar: true, isPending: true, createdAt: true },
  })
  return user
}
