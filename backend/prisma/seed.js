import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { DEFAULT_HABITS } from '../src/core/defaultHabitsData.js'
import {
  seedMotivationalPhrasesFromRepoJson,
  seedDailyHabitTemplatesFromDefaults,
} from '../src/modules/admin/admin.service.js'

const db   = new PrismaClient()
const SALT = 12

const hash = (p) => bcrypt.hash(p, SALT)

const seedHabits = (userId, prefix) =>
  Promise.all(DEFAULT_HABITS.map((h) =>
    db.habit.upsert({
      where:  { id: `${prefix}-habit-${h.order}` },
      update: {},
      create: { id: `${prefix}-habit-${h.order}`, userId, ...h, origin: 'DEFAULT' },
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

  // ── 1b. Admin (hors parcours app) ───────────────────────────────────────
  const adminPass = process.env.ADMIN_SEED_PASSWORD || 'demo1234'
  await db.user.upsert({
    where:  { username: 'AdminDemo' },
    update: { isAdmin: true },
    create: {
      email:        'admin@demo.dev',
      username:     'AdminDemo',
      passwordHash: await hash(adminPass),
      avatar:       '⚙️',
      isPending:    false,
      isAdmin:      true,
    },
  })
  console.log('  ✅ Admin           → admin@demo.dev / (ADMIN_SEED_PASSWORD ou demo1234)')

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
  // Pas d’habitudes pour l’éducateur asso — compte dédié admin / suivi groupe uniquement
  console.log('  ✅ Éducateur       → educateur@demo.dev / demo1234  (OWNER, sans habitudes)')

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

  const phrasesRes = await seedMotivationalPhrasesFromRepoJson()
  if (phrasesRes.ok) console.log('  ✅ Phrases du jour → import JSON → BDD')
  else console.log('  ⚠️  Phrases du jour —', phrasesRes.message)

  const dailyRes = await seedDailyHabitTemplatesFromDefaults()
  if (dailyRes.ok && !dailyRes.skipped) console.log(`  ✅ Habitudes du jour (pool) → ${dailyRes.seeded} modèles`)
  else if (dailyRes.skipped) console.log('  ⏭️  Habitudes du jour — pool déjà présent')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Comptes de démo disponibles :')
  console.log('  solo@demo.dev        → user seul')
  console.log('  admin@demo.dev       → administration (hors app)')
  console.log('  educateur@demo.dev   → éducateur (gère l\'asso)')
  console.log('  membre@demo.dev      → membre de l\'asso')
  console.log('  Mot de passe commun : demo1234')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
