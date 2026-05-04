import { z } from 'zod'

const phraseList = z.object({
  phrases: z.array(z.string()),
})

export const dayMessagesReplaceSchema = z.object({
  encouragement: phraseList,
  maintien: phraseList,
  felicitation: phraseList,
})

export const userSuspensionSchema = z.object({
  suspended: z.boolean(),
})

/** Crédit manuel de cristaux (tests / récompenses) — entier positif plafonné. */
export const adminGrantCristauxSchema = z.object({
  amount: z.coerce.number().int().min(1).max(50_000),
})

export const pushSettingsSchema = z.object({
  defaultReminderHour: z.coerce.number().int().min(0).max(23),
})

/** Corps de la notification test (Web Push — taille limitée côté navigateurs) */
export const pushTestSchema = z.object({
  message: z.string().trim().min(1).max(200),
})

export const dailyHabitTemplatesReplaceSchema = z.object({
  templates: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(120),
        icon: z.string().min(1).max(16),
        xpTotal: z.number().int().min(5).max(100).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(200),
})

export const adminEmailSendSchema = z
  .object({
    mode: z.enum(['all', 'one']),
    userId: z.string().optional(),
    subject: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(50000),
  })
  .refine((d) => d.mode !== 'one' || (d.userId && d.userId.length > 0), {
    message: 'Choisis un utilisateur pour l’envoi ciblé.',
  })

export const adminEmailDefaultsSchema = z.object({
  subject: z.string().max(500),
  body: z.string().max(50000),
})

/** Config gameplay complète (même forme que `gameConfig.js`). */
export const gameplayConfigSchema = z.object({
  xp: z.object({
    habitBase: z.coerce.number().min(1).max(500),
    bonusPerTask: z.coerce.number().min(0.01).max(5),
    checkInBonus: z.coerce.number().min(0).max(500),
    journalBonus: z.coerce.number().min(0).max(500),
    sleepBonus: z.coerce.number().min(0).max(500),
    newHabitDefault: z.coerce.number().int().min(1).max(500),
  }),
  levels: z.object({
    base: z.coerce.number().min(1).max(1000000),
    exponent: z.coerce.number().min(0.5).max(5),
  }),
  habitSlots: z.object({
    baseSlots: z.coerce.number().int().min(1).max(50),
    levelAnchor: z.coerce.number().int().min(0).max(200),
    bonusPerLevel: z.coerce.number().min(0).max(20),
    absoluteMax: z.coerce.number().int().min(1).max(100),
  }),
  appointments: z.object({
    maxRewardingCompletionsPerDay: z.coerce.number().int().min(0).max(50),
    maxXpFromAppointmentsPerDay: z.coerce.number().int().min(0).max(100000),
    xpRewardOnCreate: z.coerce.number().int().min(0).max(500),
  }),
  streak: z.object({
    badgeAt: z.array(z.coerce.number().int().min(1)).min(1).max(30),
    badgeShow: z
      .array(
        z.object({
          at: z.coerce.number().int().min(1).max(100000),
          src: z.string().min(1).max(300),
        }),
      )
      .max(30)
      .optional(),
    rewards: z
      .array(
        z.object({
          at: z.coerce.number().int().min(1).max(100000),
          key: z.string().min(1).max(40),
          icon: z.string().min(1).max(16),
          title: z.string().min(1).max(80),
          body: z.string().min(1).max(500),
          /** Vide = pas d’image hero (le client peut masquer ou utiliser un défaut visuel). */
          heroImage: z.string().max(200).optional(),
        }),
      )
      .min(1)
      .max(20),
  }),
  titles: z
    .array(
      z.object({
        from: z.coerce.number().int().min(0).max(100000),
        label: z.string().min(1).max(40),
        icon: z.string().min(1).max(16),
      }),
    )
    .min(1)
    .max(30),
  ui: z
    .object({
      animations: z.object({
        countUpDefault: z.coerce.number().int().min(0).max(30000),
        homeTotalXp: z.coerce.number().int().min(0).max(30000),
        homeToday: z.coerce.number().int().min(0).max(30000),
        homeCombined: z.coerce.number().int().min(0).max(30000),
        statsCountUp: z.coerce.number().int().min(0).max(30000),
        statsBarsCss: z.coerce.number().int().min(0).max(30000),
        statsLeaderboardXp: z.coerce.number().int().min(0).max(30000),
        statsLeaderboardTag: z.coerce.number().int().min(0).max(30000),
        insightsTitle: z.coerce.number().int().min(0).max(30000),
        insightsBody: z.coerce.number().int().min(0).max(30000),
        profilTotalXp: z.coerce.number().int().min(0).max(30000),
      }),
    })
    .optional(),
})
