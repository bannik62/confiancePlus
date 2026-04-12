import { Prisma } from '@prisma/client'

export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}`, err.message ?? err)

  // Contrainte unique Prisma (ex: double toggle le même jour)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002')
      return res.status(409).json({ error: 'Conflit — entrée déjà existante' })
    if (err.code === 'P2025')
      return res.status(404).json({ error: 'Ressource introuvable' })
  }

  // Erreur métier volontaire : throw { status: 403, message: '...' }
  if (err.status) return res.status(err.status).json({ error: err.message })

  res.status(500).json({ error: 'Erreur interne du serveur' })
}
