import { db } from '../../core/db.js'
import { config } from '../../core/config.js'
import { sendMail, isMailConfigured } from '../../core/emailService.js'

const MENTION_RE = /@([^\s@]{1,80})/g

export function extractMentionedUsernames(body) {
  const names = new Set()
  let m
  const re = new RegExp(MENTION_RE.source, 'g')
  while ((m = re.exec(body)) !== null) {
    const n = m[1]?.trim()
    if (n) names.add(n)
  }
  return [...names]
}

export async function notifyAfterMemorableComment({
  dailyLogId,
  authorUserId,
  authorUsername,
  body,
}) {
  if (!isMailConfigured()) return

  const log = await db.dailyLog.findUnique({
    where: { id: dailyLogId },
    select: { userId: true },
  })
  if (!log) return

  const ownerUserId = log.userId
  const names = extractMentionedUsernames(body)

  const mentionedUsers =
    names.length === 0
      ? []
      : await db.user.findMany({
          where: {
            username: { in: names },
            id: { not: authorUserId },
            isSuspended: false,
          },
          select: {
            id: true,
            email: true,
            username: true,
            memorableCommentEmailsEnabled: true,
          },
        })

  /** @type {Map<string, { id: string, email: string, username: string, asOwner: boolean, asMentioned: boolean }>} */
  const toNotify = new Map()

  if (ownerUserId !== authorUserId) {
    const owner = await db.user.findUnique({
      where: { id: ownerUserId },
      select: {
        id: true,
        email: true,
        username: true,
        memorableCommentEmailsEnabled: true,
      },
    })
    if (owner?.email && owner.memorableCommentEmailsEnabled !== false) {
      toNotify.set(owner.id, {
        id: owner.id,
        email: owner.email,
        username: owner.username,
        asOwner: true,
        asMentioned: false,
      })
    }
  }

  for (const u of mentionedUsers) {
    if (!u.email || u.memorableCommentEmailsEnabled === false) continue
    const prev = toNotify.get(u.id)
    if (prev) {
      toNotify.set(u.id, { ...prev, asMentioned: true })
    } else {
      toNotify.set(u.id, {
        id: u.id,
        email: u.email,
        username: u.username,
        asOwner: false,
        asMentioned: true,
      })
    }
  }

  const preview = body.length > 220 ? `${body.slice(0, 220)}…` : body
  const openApp = `Ouvre l’app : ${config.FRONTEND_URL}`

  for (const u of toNotify.values()) {
    const lines = [`Bonjour ${u.username},`, '']
    if (u.asOwner) {
      lines.push(
        `${authorUsername} a laissé un commentaire sur ton moment mémorable (classement).`,
      )
    }
    if (u.asMentioned) {
      lines.push(
        `${authorUsername} t’a mentionné dans un commentaire sur un moment mémorable.`,
      )
    }
    lines.push('', `« ${preview} »`, '', openApp, '')

    let subject = `${authorUsername} — moment mémorable`
    if (u.asOwner && u.asMentioned) {
      subject = `${authorUsername} a commenté et t’a mentionné`
    } else if (u.asOwner) {
      subject = `${authorUsername} a commenté ton moment mémorable`
    } else if (u.asMentioned) {
      subject = `${authorUsername} t’a mentionné (@ commentaire)`
    }

    try {
      await sendMail({
        to: u.email,
        subject,
        text: lines.join('\n'),
      })
    } catch (e) {
      console.warn('[memorable-comment] e-mail non envoyé', u.id, e?.message)
    }
  }
}
