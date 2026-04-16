/**
 * Charge les variables d’environnement avant `config.js`.
 * Le `.env` à la racine du dépôt (`habit-tracker/.env`) est celui utilisé par Prisma (`dotenv -e ../.env`) ;
 * sans ce chargement, `node src/server.js` depuis `backend/` ne le voyait pas.
 *
 * Implémentation sans paquet `dotenv` : en Docker, le volume anonyme sur `node_modules`
 * peut rester figé à une ancienne image ; évite `ERR_MODULE_NOT_FOUND: dotenv`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** En dev hors Docker : `habit-tracker/.env`. */
const repoRootEnv = path.resolve(__dirname, '../../.env')
/** Optionnel : `backend/.env` (écrase les clés du premier fichier). */
const backendEnv = path.resolve(__dirname, '../.env')

/**
 * @param {string} filePath
 * @param {boolean} override - si false, n’écrit que les clés absentes de `process.env` (ex. déjà injectées par Docker).
 */
const applyEnvFile = (filePath, override) => {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const exportPref = line.match(/^export\s+/i)
    if (exportPref) line = line.slice(exportPref[0].length).trim()
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1).replace(/\\n/g, '\n')
    else {
      const sp = val.indexOf(' #')
      if (sp >= 0) val = val.slice(0, sp).trim()
    }
    if (override || process.env[key] === undefined) process.env[key] = val
  }
}

applyEnvFile(repoRootEnv, false)
applyEnvFile(backendEnv, true)
