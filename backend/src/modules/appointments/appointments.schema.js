import { z } from 'zod'

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
/** Heure 24h HH:mm */
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const createAppointmentSchema = z.object({
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  date: ymd,
  timeHm: hm,
})

export const createForMemberSchema = z.object({
  groupId: z.string().min(1),
  memberUserId: z.string().min(1),
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  date: ymd,
  timeHm: hm,
})

export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  notes: z.string().max(2000).optional().nullable(),
  date: ymd.optional(),
  timeHm: hm.optional(),
})

/** Le client envoie son « aujourd’hui » civil local : doit coïncider avec le jour du RDV. */
export const completeAppointmentSchema = z.object({
  today: ymd,
})

/** Marquer non fait — raison optionnelle (affichée seulement dans le calendrier Stats). */
export const notDoneAppointmentSchema = z.object({
  today: ymd,
  reason: z.string().max(500).optional().nullable(),
})

export const listQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
})

export const listManagedQuerySchema = z.object({
  groupId: z.string().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
})

export const dayQuerySchema = z.object({
  date: ymd,
})
