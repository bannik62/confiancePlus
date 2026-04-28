import { config } from '../../core/config.js'

const attempts = new Map()

const nowMs = () => Date.now()

const lockKeyEmail = (email) => `email:${String(email || '').trim().toLowerCase()}`
const lockKeyEmailIp = (email, ip) =>
  `email_ip:${String(email || '').trim().toLowerCase()}:${String(ip || '').trim()}`

const pruneExpired = (key) => {
  const row = attempts.get(key)
  if (!row) return null
  if (row.expiresAtMs <= nowMs()) {
    attempts.delete(key)
    return null
  }
  return row
}

const read = (key) => pruneExpired(key) ?? { count: 0, expiresAtMs: nowMs() + config.AUTH_LOGIN_WINDOW_MS }

const write = (key, row) => {
  attempts.set(key, row)
}

export const isLocked = (email, ip) => {
  const emailKey = lockKeyEmail(email)
  const emailRow = pruneExpired(emailKey)
  if (emailRow && emailRow.count >= config.AUTH_LOGIN_MAX_PER_EMAIL) return true

  if (ip) {
    const emailIpKey = lockKeyEmailIp(email, ip)
    const emailIpRow = pruneExpired(emailIpKey)
    if (emailIpRow && emailIpRow.count >= config.AUTH_LOGIN_MAX_PER_EMAIL_IP) return true
  }

  return false
}

export const recordFailure = (email, ip) => {
  const emailKey = lockKeyEmail(email)
  const emailRow = read(emailKey)
  write(emailKey, { ...emailRow, count: emailRow.count + 1 })

  if (ip) {
    const emailIpKey = lockKeyEmailIp(email, ip)
    const emailIpRow = read(emailIpKey)
    write(emailIpKey, { ...emailIpRow, count: emailIpRow.count + 1 })
  }
}

export const clearFailures = (email, ip) => {
  attempts.delete(lockKeyEmail(email))
  if (ip) attempts.delete(lockKeyEmailIp(email, ip))
}
