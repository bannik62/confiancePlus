import { z } from 'zod'

export const broadcastDismissSchema = z.object({
  broadcastId: z.string().min(1).max(128),
})

const optionalIsoLike = z.union([z.string(), z.null()]).optional()

export const adminBroadcastPublishSchema = z
  .object({
    title: z.string().trim().max(160),
    body: z.string().trim().max(12000),
    isActive: z.boolean(),
    startsAt: optionalIsoLike,
    endsAt: optionalIsoLike,
  })
  .refine((d) => {
    const chk = (/** @type {string | null | undefined} */ v) => {
      if (v == null) return true
      const s = String(v).trim()
      if (!s) return true
      return !Number.isNaN(Date.parse(s))
    }
    return chk(d.startsAt) && chk(d.endsAt)
  }, {})
  .refine((d) => d.isActive === false || (d.title.length >= 1 && d.body.length >= 1), {
    message: 'Titre et message obligatoires lorsque l’annonce est active.',
    path: ['title'],
  })
