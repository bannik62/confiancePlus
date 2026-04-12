import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const db   = new PrismaClient()
const SALT = 12

const hash = (p) => bcrypt.hash(p, SALT)

const DEFAULT_HABITS = [
  { name: '10 000 pas',    icon: '👟', xp: 20, order: 0 },
  { name: 'Pas de sucre',  icon: '🚫', xp: 25, order: 1 },
  { name: 'Dormir tôt',    icon: '🌙', xp: 20, order: 2 },
  { name: 'Méditation',    icon: '🧘', xp: 15, order: 3 },
  { name: 'Lecture 20min', icon: '📖', xp: 15, order: 4 },
]

const seedHabits = (userId, prefix) =>
  Promise.all(DEFAULT_HABITS.map((h) =>
    db.habit.upsert({
      where:  { id: `${prefix}-habit-${h.order}` },
      update: {},
      create: { id: `${prefix}-habit-${h.order}`, userId, ...h },
    })
  ))

async function main() {
  console.log('🌱 Seed en cours...')

  // ── 1. User solo ──────────────────────────────────────────────────────────
  // upsert sur username (toujours présent) pour éviter les problèmes liés
  // au champ email nullable
  const solo = await db.user.upsert({
    where:  { username: 'SoloDemo' },
    update: {},
    create: {
      email:        'solo@demo.dev',
      username:     'SoloDemo',
      passwordHash: await hash('demo1234'),
      avatar:       '🦊',
      isPending:    false,
    },
  })
  await seedHabits(solo.id, 'solo')
  console.log('  ✅ User solo       → solo@demo.dev / demo1234')

  // ── 2. Éducateur ──────────────────────────────────────────────────────────
  const educator = await db.user.upsert({
    where:  { username: 'EducateurDemo' },
    update: {},
    create: {
      email:        'educateur@demo.dev',
      username:     'EducateurDemo',
      passwordHash: await hash('demo1234'),
      avatar:       '🦁',
      isPending:    false,
    },
  })
  await seedHabits(educator.id, 'edu')
  console.log('  ✅ Éducateur       → educateur@demo.dev / demo1234  (OWNER)')

  // ── 3. Membre de l'asso (compte déjà activé pour la démo) ─────────────────
  const member = await db.user.upsert({
    where:  { username: 'MembreDemo' },
    update: {},
    create: {
      email:        'membre@demo.dev',
      username:     'MembreDemo',
      passwordHash: await hash('demo1234'),
      avatar:       '🐺',
      isPending:    false,
    },
  })
  await seedHabits(member.id, 'member')
  console.log('  ✅ Membre          → membre@demo.dev / demo1234      (MEMBER)')

  // ── 4. Groupe association ─────────────────────────────────────────────────
  const group = await db.group.upsert({
    where:  { inviteCode: 'DEMO-ASSO-2024' },
    update: {},
    create: {
      name:       'Association Démo',
      type:       'ASSOCIATION',
      inviteCode: 'DEMO-ASSO-2024',
    },
  })

  await db.groupMember.upsert({
    where:  { userId_groupId: { userId: educator.id, groupId: group.id } },
    update: {},
    create: { userId: educator.id, groupId: group.id, role: 'OWNER' },
  })

  await db.groupMember.upsert({
    where:  { userId_groupId: { userId: member.id, groupId: group.id } },
    update: {},
    create: { userId: member.id, groupId: group.id, role: 'MEMBER' },
  })

  console.log('  ✅ Groupe          → "Association Démo" (code: DEMO-ASSO-2024)')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Comptes de démo disponibles :')
  console.log('  solo@demo.dev        → user seul')
  console.log('  educateur@demo.dev   → éducateur (gère l\'asso)')
  console.log('  membre@demo.dev      → membre de l\'asso')
  console.log('  Mot de passe commun : demo1234')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
