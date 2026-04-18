/**
 * Lance le CLI Prisma avec les variables d’environnement chargées depuis :
 *   1. `habit-tracker/.env` (à la racine du dépôt, si présent)
 *   2. `backend/.env` (optionnel, surcharge pour dev local)
 *
 * Dans Docker, `DATABASE_URL` est déjà injectée par Compose : si aucun fichier
 * n’existe, on ne fait rien et Prisma utilise l’environnement du processus.
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
const repoRoot = resolve(backendRoot, '..')

const rootEnv = resolve(repoRoot, '.env')
const localEnv = resolve(backendRoot, '.env')
if (existsSync(rootEnv)) config({ path: rootEnv })
if (existsSync(localEnv)) config({ path: localEnv, override: true })

const args = process.argv.slice(2)
const r = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  cwd: backendRoot,
  env: process.env,
  shell: true,
})

process.exit(r.status ?? (r.error ? 1 : 0))
