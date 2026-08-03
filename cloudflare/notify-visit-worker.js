/**
 * Cloudflare Worker — notifications Discord pour le portfolio.
 * À coller dans l’éditeur Cloudflare (Start with Hello World).
 *
 * Secret à créer dans Settings → Variables :
 *   DISCORD_WEBHOOK_URL = votre URL de webhook Discord
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: cors });
    }

    const webhook = env.DISCORD_WEBHOOK_URL;
    if (!webhook) {
      return Response.json({ ok: false, error: 'Webhook non configuré' }, { status: 500, headers: cors });
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'inconnu';
    const ua = (request.headers.get('User-Agent') || '').slice(0, 250);
    const page = String(payload.page || '(page inconnue)').slice(0, 300);
    const referrer = String(payload.referrer || '').slice(0, 300);
    const lang = String(payload.lang || '—').slice(0, 40);
    const langs = String(payload.langs || '').slice(0, 80);
    const screen = String(payload.screen || '—').slice(0, 40);
    const viewport = String(payload.viewport || '').slice(0, 40);
    const timezone = String(payload.timezone || '—').slice(0, 60);
    const platform = String(payload.platform || '—').slice(0, 60);

    const geo = request.cf
      ? [request.cf.city, request.cf.region, request.cf.country].filter(Boolean).join(', ')
        + (request.cf.asOrganization ? `\nFAI : ${request.cf.asOrganization}` : '')
      : 'Indisponible';

    const { browser, os, device } = parseUa(ua);
    const source = describeReferrer(referrer);
    const when = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    const langLine = langs && langs !== lang ? `${lang} (${langs})` : lang;
    const display = viewport ? `Écran ${screen} · Fenêtre ${viewport}` : `Écran ${screen}`;

    const body = {
      username: 'Portfolio Visites',
      content: '👀 Nouvelle visite sur le portfolio.',
      embeds: [{
        title: 'Nouvelle visite sur le portfolio',
        color: 0x2563eb,
        fields: [
          { name: 'Page', value: `\`${page}\``, inline: false },
          { name: 'Provenance', value: source, inline: false },
          { name: 'Localisation', value: geo || '—', inline: false },
          { name: 'IP', value: `\`${ip}\``, inline: true },
          { name: 'Appareil', value: device, inline: true },
          { name: 'Système', value: os, inline: true },
          { name: 'Navigateur', value: browser, inline: true },
          { name: 'Plateforme', value: platform, inline: true },
          { name: 'Langue', value: langLine, inline: true },
          { name: 'Affichage', value: display, inline: false },
          { name: 'Fuseau visiteur', value: timezone, inline: true },
        ],
        footer: { text: `jacques-website · ${when}` },
      }],
    };

    const discordRes = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!discordRes.ok) {
      return Response.json(
        { ok: false, error: 'Discord unreachable', status: discordRes.status },
        { status: 502, headers: cors }
      );
    }

    return Response.json({ ok: true }, { headers: cors });
  },
};

function parseUa(ua) {
  let browser = 'Inconnu';
  let os = 'Inconnu';
  let device = 'Ordinateur';

  if (/Edg\/([\d.]+)/i.test(ua)) browser = `Microsoft Edge ${RegExp.$1}`;
  else if (/OPR\/([\d.]+)/i.test(ua)) browser = `Opera ${RegExp.$1}`;
  else if (/Chrome\/([\d.]+)/i.test(ua)) browser = `Chrome ${RegExp.$1}`;
  else if (/Firefox\/([\d.]+)/i.test(ua)) browser = `Firefox ${RegExp.$1}`;
  else if (/Version\/([\d.]+).*Safari/i.test(ua)) browser = `Safari ${RegExp.$1}`;

  if (/Windows NT 10/i.test(ua)) os = 'Windows 10 / 11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) { os = 'Android'; device = 'Mobile'; }
  else if (/iPhone/i.test(ua)) { os = 'iOS'; device = 'Mobile'; }
  else if (/iPad/i.test(ua)) { os = 'iPadOS'; device = 'Tablette'; }
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Mobile|Android|iPhone/i.test(ua) && device === 'Ordinateur') device = 'Mobile';

  return { browser, os, device };
}

function describeReferrer(referrer) {
  if (!referrer) return 'Accès direct (URL tapée, favori, ou lien sans origine)';
  let host = referrer;
  try { host = new URL(referrer).host.toLowerCase(); } catch { /* keep raw */ }

  const map = [
    ['google.', 'Google (recherche)'],
    ['bing.', 'Bing (recherche)'],
    ['linkedin.', 'LinkedIn'],
    ['github.', 'GitHub'],
    ['facebook.', 'Facebook'],
    ['instagram.', 'Instagram'],
    ['twitter.', 'X / Twitter'],
    ['x.com', 'X / Twitter'],
  ];
  for (const [needle, label] of map) {
    if (host.includes(needle)) return `${label}\n\`${referrer}\``;
  }
  return `Lien externe (\`${host}\`)\n\`${referrer}\``;
}
