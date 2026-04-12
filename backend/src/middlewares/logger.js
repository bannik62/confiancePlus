const COLOR = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
}

const statusColor = (code) => {
  if (code >= 500) return COLOR.red
  if (code >= 400) return COLOR.yellow
  return COLOR.green
}

export const logger = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms  = Date.now() - start
    const c   = statusColor(res.statusCode)
    console.log(
      `${COLOR.cyan}${req.method.padEnd(7)}${COLOR.reset}` +
      `${c}${res.statusCode}${COLOR.reset} ` +
      `${req.path.padEnd(40)} ` +
      `${ms}ms`
    )
  })
  next()
}
