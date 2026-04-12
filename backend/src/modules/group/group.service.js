import { randomBytes } from 'crypto'
import { db } from '../../core/db.js'
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

  return members
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
  // Aplatir : exposer role + inviteCode directement pour le frontend
  return groups.map(({ members, ...g }) => ({
    ...g,
    role: members[0]?.role ?? 'MEMBER',
  }))
}

// Éducateur (OWNER) crée un profil membre pending dans son groupe
export const createMember = async (groupId, requesterId, { username, avatar }) => {
  // Vérifier que le demandeur est bien OWNER du groupe
  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId: requesterId, groupId } },
  })
  if (!membership || membership.role !== 'OWNER')
    throw { status: 403, message: 'Seul l\'éducateur peut créer des membres' }

  const exists = await db.user.findUnique({ where: { username } })
  if (exists) throw { status: 409, message: 'Ce pseudo est déjà pris' }

  const activationCode = await generateActivationCode()

  const member = await db.user.create({
    data: { username, avatar, isPending: true, activationCode },
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
