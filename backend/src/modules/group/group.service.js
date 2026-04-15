import { randomBytes } from 'crypto'
import { db } from '../../core/db.js'
import { normalizeEmail } from '../../core/emailUtil.js'
import { levelFromXP, titleForLevel, computeStreak } from '../../core/xpEngine.js'

// Génère un code d'activation 6 chars alphanum majuscule unique
const generateActivationCode = async () => {
  let code, exists
  do {
    code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase()
    exists = await db.user.findUnique({ where: { activationCode: code } })
  } while (exists)
  return code
}

/** Pseudo unique dérivé du local-part de l’e-mail (lettres, chiffres, _). */
const generateUniqueUsernameFromEmail = async (normalizedEmail) => {
  const local = (normalizedEmail.split('@')[0] || 'invite').toLowerCase()
  const base = local
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 24) || 'invite'

  let n = 0
  let candidate = base.slice(0, 30)
  while (n < 60) {
    const exists = await db.user.findUnique({ where: { username: candidate } })
    if (!exists) return candidate
    const suffix = randomBytes(2).toString('hex')
    candidate = `${base.slice(0, 20)}_${suffix}`.slice(0, 30)
    n++
  }
  throw { status: 500, message: 'Impossible de générer un pseudo unique' }
}

export const createGroup = async (userId, { name, type = 'FRIENDS' }) => {
  const group = await db.group.create({ data: { name, type } })
  // Le créateur devient automatiquement OWNER
  await db.groupMember.create({ data: { userId, groupId: group.id, role: 'OWNER' } })
  return group
}

export const joinGroup = async (userId, { inviteCode }) => {
  const group = await db.group.findUnique({ where: { inviteCode } })
  if (!group) throw { status: 404, message: 'Groupe introuvable' }

  const already = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  })
  if (already) throw { status: 409, message: 'Déjà membre de ce groupe' }

  await db.groupMember.create({ data: { userId, groupId: group.id } })
  return group
}

export const getLeaderboard = async (groupId) => {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { type: true },
  })
  const members = await db.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true, username: true, avatar: true,
          habitLogs: { select: { date: true, habit: { select: { xp: true } } } },
        },
      },
    },
  })

  const ranked =
    group?.type === 'ASSOCIATION'
      ? members.filter((m) => m.role !== 'OWNER')
      : members

  return ranked
    .map(({ user }) => {
      const totalXP  = user.habitLogs.reduce((sum, l) => sum + l.habit.xp, 0)
      const level    = levelFromXP(totalXP)
      const title    = titleForLevel(level)
      const dates    = [...new Set(user.habitLogs.map(l => l.date.toISOString().slice(0, 10)))]
      const streak   = computeStreak(dates)
      return { id: user.id, username: user.username, avatar: user.avatar, totalXP, level, title, streak }
    })
    .sort((a, b) => b.totalXP - a.totalXP)
}

export const getMyGroups = async (userId) => {
  const groups = await db.group.findMany({
    where:   { members: { some: { userId } } },
    include: {
      _count:  { select: { members: true } },
      members: { where: { userId }, select: { role: true } },
    },
  })
  // Aplatir : role pour le front ; inviteCode uniquement pour OWNER (pas pour MEMBER)
  return groups.map(({ members, inviteCode, ...rest }) => {
    const role = members[0]?.role ?? 'MEMBER'
    return {
      ...rest,
      role,
      ...(role === 'OWNER' ? { inviteCode } : {}),
    }
  })
}

// Éducateur (OWNER d’un groupe ASSOCIATION) crée un invité pending (e-mail + code)
export const createMember = async (groupId, requesterId, { email }) => {
  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId: requesterId, groupId } },
  })
  if (!membership || membership.role !== 'OWNER')
    throw { status: 403, message: 'Seul l\'éducateur peut créer des membres' }

  const group = await db.group.findUnique({ where: { id: groupId } })
  if (!group) throw { status: 404, message: 'Groupe introuvable' }
  if (group.type !== 'ASSOCIATION')
    throw { status: 403, message: 'L\'invitation par e-mail n\'est disponible que pour les groupes association' }

  const normalized = normalizeEmail(email)
  if (!normalized) throw { status: 400, message: 'E-mail invalide' }

  const emailTaken = await db.user.findFirst({ where: { email: normalized } })
  if (emailTaken)
    throw { status: 409, message: 'Cet e-mail est déjà utilisé (compte existant ou invitation en cours)' }

  const username = await generateUniqueUsernameFromEmail(normalized)
  const activationCode = await generateActivationCode()

  const member = await db.user.create({
    data: {
      email: normalized,
      username,
      avatar: '🦊',
      isPending: true,
      activationCode,
    },
  })

  await db.groupMember.create({
    data: { userId: member.id, groupId, role: 'MEMBER' },
  })

  // On retourne le code en clair UNE SEULE FOIS pour que l'éducateur le transmette
  return {
    id:             member.id,
    username:       member.username,
    avatar:         member.avatar,
    activationCode, // à afficher/copier par l'éducateur, jamais stocké en clair ensuite
  }
}
