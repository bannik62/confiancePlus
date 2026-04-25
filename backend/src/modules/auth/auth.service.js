import { db } from '../../core/db.js'
import { config } from '../../core/config.js'
import { hashPassword, verifyPassword, signToken } from '../../core/auth.js'
import { createDefaultHabitsForUser } from '../../core/defaultHabits.js'
import { normalizeEmail, maskEmailHint } from '../../core/emailUtil.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import * as cristaux from '../cristaux/cristaux.service.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeUser = (user) => {
  const { passwordHash, activationCode, ...rest } = user
  return rest
}

const tokenPayload = (user) => ({
  id: user.id,
  username: user.username,
  isAdmin: user.isAdmin === true,
})

// ── Register (compte autonome) ────────────────────────────────────────────────

export const getRegisterStatus = () => ({ registerOpen: config.REGISTER_OPEN })

export const register = async ({ email, username, password, avatar, group, inviteCode }) => {
  if (!config.REGISTER_OPEN)
    throw {
      status: 403,
      code:   'REGISTER_CLOSED',
      message:
        'Les inscriptions publiques sont fermées. Utilise l’onglet « Code asso » si tu as reçu un code, ou connecte-toi.',
    }

  const normEmail = normalizeEmail(email)
  const exists = await db.user.findFirst({
    where: { OR: [{ email: normEmail }, { username }] },
  })
  if (exists) throw { status: 409, message: 'Email ou username déjà utilisé' }

  const user = await db.user.create({
    data: {
      email: normEmail,
      username,
      passwordHash: await hashPassword(password),
      avatar,
      isPending: false,
    },
  })

  const skipDefaultHabits =
    Boolean(group?.name) && (group.type ?? 'FRIENDS') === 'ASSOCIATION'
  if (!skipDefaultHabits) await createDefaultHabitsForUser(user.id)

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

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })
  await cristaux.tryGrantConnexionQuotidienne(user.id)
  await cristaux.tryGrantClosedDayJourneeParfaite(user.id)
  const out = await db.user.findUnique({ where: { id: user.id } })
  return { user: safeUser(out), token: signToken(tokenPayload(out)) }
}

// ── Login (compte autonome) ───────────────────────────────────────────────────

const assertLoginMode = async (userId, loginMode, inviteCode) => {
  const isOwner = await userIsAssociationOwner(userId)

  if (loginMode === 'SOLO') {
    if (isOwner)
      throw {
        status: 403,
        message:
          'Ce compte est celui d’un responsable associatif : le suivi perso (habitudes / check-in) n’est pas disponible ici. Utilise un autre e-mail pour ton suivi perso, ou connecte-toi en mode « Éducateur association ».',
      }
    return { matchedGroupId: undefined }
  }

  if (loginMode === 'EDUCATOR') {
    if (!isOwner)
      throw {
        status: 403,
        message:
          'Ce compte n’est pas celui d’un responsable associatif. Choisis « Suivi perso » ou « Groupe avec code » selon ton cas.',
      }
    return { matchedGroupId: undefined }
  }

  // FRIENDS — inviteCode déjà validé non vide par le schéma
  const group = await db.group.findUnique({
    where:   { inviteCode },
    select:  { id: true },
  })
  if (!group)
    throw {
      status: 403,
      message: 'Aucun groupe ne correspond à ce code d’invitation.',
    }

  const member = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
    select: { userId: true },
  })
  if (!member)
    throw {
      status: 403,
      message:
        'Ce compte n’est pas membre du groupe lié à ce code. Vérifie le code ou choisis un autre mode de connexion.',
    }

  return { matchedGroupId: group.id }
}

export const login = async ({ email, password, loginMode, inviteCode }) => {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } })
  if (!user || !user.passwordHash)
    throw { status: 401, message: 'Identifiants invalides' }

  if (user.isPending)
    throw { status: 403, message: 'Compte non activé — utilise ton code association' }

  if (user.isSuspended)
    throw { status: 403, message: 'Compte suspendu — contacte le support.', code: 'SUSPENDED' }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw { status: 401, message: 'Identifiants invalides' }

  const { matchedGroupId } = await assertLoginMode(user.id, loginMode, inviteCode)

  const refreshed = await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  // Comptes sans habitudes → pack par défaut, sauf éducateur association / admin (hors parcours perso)
  const habitCount = await db.habit.count({ where: { userId: refreshed.id, isActive: true } })
  if (
    habitCount === 0 &&
    !(await userIsAssociationOwner(refreshed.id)) &&
    !refreshed.isAdmin
  )
    await createDefaultHabitsForUser(refreshed.id)

  await cristaux.tryGrantConnexionQuotidienne(refreshed.id)
  await cristaux.tryGrantClosedDayJourneeParfaite(refreshed.id)
  const out = await db.user.findUnique({ where: { id: refreshed.id } })

  return {
    user:             safeUser(out),
    token:            signToken(tokenPayload(out)),
    ...(matchedGroupId ? { matchedGroupId } : {}),
  }
}

// ── Check code association ────────────────────────────────────────────────────
// Vérifie le code sans créer de session — retourne juste username + avatar
// pour afficher "Bonjour Lucas 🐺" avant de choisir le mot de passe

export const checkCode = async ({ code }) => {
  const user = await db.user.findUnique({
    where: { activationCode: code.toUpperCase() },
    select: { id: true, username: true, avatar: true, isPending: true, email: true },
  })

  if (!user || !user.isPending)
    throw { status: 404, message: 'Code invalide ou déjà utilisé' }

  return {
    ok:        true,
    username:  user.username,
    avatar:    user.avatar,
    /** Indice e-mail masqué — pas l’adresse complète */
    emailHint: user.email ? maskEmailHint(user.email) : null,
  }
}

// ── Activate (code asso → choisir son mot de passe) ──────────────────────────

export const activate = async ({ code, email, password, username, avatar }) => {
  const user = await db.user.findUnique({
    where: { activationCode: code.toUpperCase() },
  })

  if (!user || !user.isPending)
    throw { status: 404, message: 'Code invalide ou déjà utilisé' }

  const norm = normalizeEmail(email)
  if (!user.email)
    throw { status: 400, message: 'Invitation incomplète — demande un nouvel envoi à ton éducateur' }
  if (user.email !== norm)
    throw { status: 403, message: 'Cet e-mail ne correspond pas à l\'invitation' }

  const taken = await db.user.findFirst({
    where: { username, id: { not: user.id } },
  })
  if (taken) throw { status: 409, message: 'Ce pseudo est déjà pris' }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash:   await hashPassword(password),
      isPending:      false,
      activationCode: null,
      username,
      avatar:         avatar ?? '🦊',
      lastLoginAt:    new Date(),
    },
  })

  const habitCount = await db.habit.count({ where: { userId: updated.id, isActive: true } })
  if (habitCount === 0) await createDefaultHabitsForUser(updated.id)

  await cristaux.tryGrantConnexionQuotidienne(updated.id)
  await cristaux.tryGrantClosedDayJourneeParfaite(updated.id)
  const out = await db.user.findUnique({ where: { id: updated.id } })

  return { user: safeUser(out), token: signToken(tokenPayload(out)) }
}

// ── Me ────────────────────────────────────────────────────────────────────────

export const me = async (userId) => {
  await cristaux.tryGrantConnexionQuotidienne(userId)
  await cristaux.tryGrantClosedDayJourneeParfaite(userId)
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      isPending: true,
      isAdmin: true,
      isSuspended: true,
      createdAt: true,
      lastLoginAt: true,
      cristaux: true,
      jokerStreak: true,
      streak7TrophyCount: true,
    },
  })
  return user
}

const assertCurrentPassword = async (userId, currentPassword) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user?.passwordHash)
    throw {
      status: 400,
      message:
        'Aucun mot de passe défini pour ce compte — impossible de le modifier ici.',
    }
  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid)
    throw { status: 403, message: 'Mot de passe actuel incorrect' }
}

/** @param {{ currentPassword: string, email: string, confirmEmail: string }} body */
export const changeEmail = async (userId, body) => {
  const norm = body.email
  await assertCurrentPassword(userId, body.currentPassword)

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (existing?.email === norm) return me(userId)

  const taken = await db.user.findFirst({
    where: { email: norm, id: { not: userId } },
    select: { id: true },
  })
  if (taken) throw { status: 409, message: 'Cette adresse e-mail est déjà utilisée' }

  await db.user.update({ where: { id: userId }, data: { email: norm } })
  return me(userId)
}

/** @param {{ currentPassword: string, newPassword: string, confirmNewPassword: string }} body */
export const changePassword = async (userId, body) => {
  const { newPassword } = body
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user?.passwordHash)
    throw {
      status: 400,
      message:
        'Aucun mot de passe défini pour ce compte — impossible de le modifier ici.',
    }
  const valid = await verifyPassword(body.currentPassword, user.passwordHash)
  if (!valid) throw { status: 403, message: 'Mot de passe actuel incorrect' }

  if (await verifyPassword(newPassword, user.passwordHash))
    throw {
      status: 400,
      message: 'Le nouveau mot de passe doit être différent de l’actuel.',
    }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  })
  return { ok: true }
}
