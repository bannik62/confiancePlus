import { db } from '../../core/db.js'

const todayDateUtc = () => new Date(new Date().toISOString().slice(0, 10))

/** YYYY-MM-DD → Date à midi UTC (aligné jour calendaire en BDD @db.Date) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/** dateStr optionnel = jour local du client (YYYY-MM-DD) */
export const getToday = (userId, dateStr) => {
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateFromYMD(dateStr)
    : todayDateUtc()
  return db.dailyLog.findUnique({ where: { userId_date: { userId, date } } })
}

export const upsertDailyLog = (userId, { date: dateStr, ...data }) => {
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateFromYMD(dateStr)
    : todayDateUtc()
  return db.dailyLog.upsert({
    where:  { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: { ...data },
  })
}
