/**
 * Gabarit HTML pour e-mails transactionnels — couleurs alignées sur frontend/src/styles/theme.css
 * (styles inline : compatibilité Gmail, Apple Mail, Outlook partiel).
 */
import { config } from './config.js'

/** Couleurs fixes (équivalents CSS du thème Habitracks) */
const C = {
  bgOuter: '#030712',
  bgCard: '#0e0e2a',
  border: '#1e1b4b',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#7c3aed',
  gold: '#f59e0b',
  cyan: '#06b6d4',
  headerGradStart: '#0d0030',
  headerGradEnd: '#001835',
}

export const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Texte brut → paragraphes HTML (échappement + sauts de ligne).
 * @param {string} text
 */
const P_STYLE = `margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};font-family:system-ui,-apple-system,Segoe UI,sans-serif;`

/** Fragment HTML déjà sûr (échappement fait par l’appelant sur les données utilisateur). */
export const emailBodyP = (innerHtml) =>
  `<p style="${P_STYLE}">${innerHtml}</p>`

export const textToParagraphsHtml = (text) => {
  const normalized = String(text).replace(/\r\n/g, '\n')
  const esc = escapeHtml(normalized)
  const blocks = esc.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)
  if (!blocks.length) {
    return `<p style="margin:0;font-size:15px;line-height:1.6;color:${C.text};">&nbsp;</p>`
  }
  return blocks
    .map((block) => emailBodyP(block.replace(/\n/g, '<br/>')))
    .join('')
}

/**
 * @param {{
 *   heading: string,
 *   innerHtml: string,
 *   ctaUrl?: string,
 *   ctaLabel?: string,
 *   preheader?: string
 * }} opts
 */
export const buildBrandedHtml = ({
  heading,
  innerHtml,
  ctaUrl,
  ctaLabel = "Ouvrir l'application",
  preheader,
}) => {
  const safeHeading = escapeHtml(heading)
  const base = config.FRONTEND_URL.replace(/\/+$/, '')
  const ph = preheader
    ? escapeHtml(preheader.slice(0, 140))
    : escapeHtml(String(heading).slice(0, 100))

  const ctaBlock =
    ctaUrl && /^https?:\/\//i.test(ctaUrl)
      ? `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;">
  <tr>
    <td style="border-radius:12px;background:${C.accent};box-shadow:0 4px 14px rgba(124,58,237,0.35);">
      <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
        ${escapeHtml(ctaLabel)}
      </a>
    </td>
  </tr>
</table>`
      : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${safeHeading}</title>
  <!--[if mso]><style type="text/css">table { border-collapse: collapse; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.bgOuter};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${ph}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.bgOuter};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background:linear-gradient(90deg,${C.headerGradStart},${C.headerGradEnd});border-radius:14px 14px 0 0;padding:18px 22px;border:1px solid ${C.border};border-bottom:none;">
              <div style="font-size:10px;letter-spacing:3px;color:${C.gold};font-family:'Segoe UI',system-ui,sans-serif;font-weight:800;">HABITRACKS</div>
              <div style="font-size:11px;color:${C.muted};margin-top:6px;font-family:system-ui,sans-serif;">Suivi d’habitudes</div>
            </td>
          </tr>
          <tr>
            <td style="background:${C.bgCard};border:1px solid ${C.border};border-top:none;border-radius:0 0 14px 14px;padding:26px 24px 28px;">
              <h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;font-weight:800;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.text};border-left:4px solid ${C.accent};padding-left:14px;">
                ${safeHeading}
              </h1>
              <div style="margin-bottom:8px;">
                ${innerHtml}
              </div>
              ${ctaBlock}
              <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:${C.muted};font-family:system-ui,sans-serif;border-top:1px solid ${C.border};padding-top:18px;">
                Ce message concerne ton compte Habitracks.<br/>
                <a href="${escapeHtml(base)}" style="color:${C.cyan};text-decoration:underline;">${escapeHtml(base)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
