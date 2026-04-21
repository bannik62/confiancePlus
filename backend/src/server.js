import './loadEnv.js'
import { initWebPush } from './core/pushWeb.js'
import { startPushReminderJob } from './jobs/pushReminder.job.js'
import { startAppointmentReminderJob } from './jobs/appointmentReminder.job.js'
import { refreshGameConfigCache } from './core/gameConfigRuntime.js'
import app from './app.js'

initWebPush()
startPushReminderJob()
startAppointmentReminderJob()

const PORT = process.env.PORT ?? 3000
const HOST = process.env.HOST ?? '0.0.0.0'

app.listen(PORT, HOST, async () => {
  await refreshGameConfigCache()
  console.log(`🚀 Backend démarré sur http://${HOST}:${PORT}`)
})
