import { randomBytes } from 'crypto'
import { db } from '../../core/db.js'
import { normalizeEmail } from '../../core/emailUtil.js'
import { levelFromXP, titleForLevel, computeStreak } from '../../core/xpEngine.js'
import { totalGameXpAndStreakDates, aggregationWindowDateWhere } from '../../core/xpAggregate.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const utcCalendarYmd = () => new Date().toISOString().slice(0, 10)
import { userIsAppAdmin } from '../admin/adminScope.js'

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
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas de groupe dans l’app.' }
  const group = await db.group.create({ data: { name, type } })
  // Le créateur devient automatiquement OWNER
  await db.groupMember.create({ data: { userId, groupId: group.id, role: 'OWNER' } })
  return group
}

export const joinGroup = async (userId, { inviteCode }) => {
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas d’adhésion groupe dans l’app.' }
  const group = await db.group.findUnique({ where: { inviteCode } })
  if (!group) throw { status: 404, message: 'Groupe introuvable' }

  const already = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  })
  if (already) throw { status: 409, message: 'Déjà membre de ce groupe' }

  await db.groupMember.create({ data: { userId, groupId: group.id } })
  return group
}

export const getLeaderboard = async (groupId, { clientToday } = {}) => {
  const anchor = clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const dateWhere = aggregationWindowDateWhere(anchor)

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
          habits: {
            select: { id: true, weekdaysMask: true, createdAt: true, isActive: true },
          },
          habitLogs: {
            where: { date: dateWhere },
            select: {
              date: true,
              habitId: true,
              habit: { select: { xp: true } },
            },
          },
          dailyLogs: {
            where: { date: dateWhere },
            select: { date: true, mood: true, journal: true, sleepQuality: true },
          },
        },
      },
    },
  })

  const ranked =
    group?.type === 'ASSOCIATION'
      ? members.filter((m) => m.role !== 'OWNER')
      : members

  const userIds = ranked.map(({ user }) => user.id)
  const apptRows =
    userIds.length === 0
      ? []
      : await db.appointmentCompletion.findMany({
          where: { userId: { in: userIds }, date: dateWhere },
          select: { userId: true, date: true, xpEarned: true },
        })
  const apptByUser = {}
  for (const c of apptRows) {
    if (!apptByUser[c.userId]) apptByUser[c.userId] = []
    apptByUser[c.userId].push(c)
  }

  return ranked
    .map(({ user }) => {
      const apptList = apptByUser[user.id] || []
      const { totalXP, streakDates } = totalGameXpAndStreakDates({
        habits: user.habits,
        habitLogs: user.habitLogs,
        dailyLogs: user.dailyLogs,
        appointmentCompletions: apptList,
        anchorYmd: anchor,
      })
      const level = levelFromXP(totalXP)
      const title = titleForLevel(level)
      const streak = computeStreak(streakDates, anchor)
      return { id: user.id, username: user.username, avatar: user.avatar, totalXP, level, title, streak }
    })
    .sort((a, b) => b.totalXP - a.totalXP)
}

export const getMyGroups = async (userId) => {
  const groups = await db.group.findMany({
    where:   { members: { some: { userId } } },
    include: {
      _count:  { select: { members: true } },
      members: {
        where: { userId },
        select: { role: true, shareSensitiveCheckinWithOwner: true },
      },
    },
  })
  // Aplatir : role pour le front ; inviteCode uniquement pour OWNER (pas pour MEMBER)
  return groups.map(({ members, inviteCode, ...rest }) => {
    const role = members[0]?.role ?? 'MEMBER'
    return {
      ...rest,
      role,
      shareSensitiveCheckinWithOwner: members[0]?.shareSensitiveCheckinWithOwner ?? false,
      ...(role === 'OWNER' ? { inviteCode } : {}),
    }
  })
}

/** Membre d’une association : met à jour le consentement de partage avec l’éducateur (OWNER). */
export const updateSensitiveSharing = async (userId, groupId, shareSensitiveCheckinWithOwner) => {
  const group = await db.group.findUnique({ where: { id: groupId }, select: { type: true } })
  if (!group) throw { status: 404, message: 'Groupe introuvable' }
  if (group.type !== 'ASSOCIATION')
    throw { status: 403, message: 'Ce réglage n’existe que pour les groupes association' }

  const m = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!m || m.role !== 'MEMBER')
    throw { status: 403, message: 'Seuls les membres peuvent modifier ce consentement' }

  await db.groupMember.update({
    where: { userId_groupId: { userId, groupId } },
    data: { shareSensitiveCheckinWithOwner },
  })
  return { shareSensitiveCheckinWithOwner }
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
