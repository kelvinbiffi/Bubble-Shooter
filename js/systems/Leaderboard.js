/**
 * =============================================================================
 * Leaderboard.js — Ranking global via API unificada do estúdio
 * =============================================================================
 *
 * api.k3gamesstudio.com, nick + score, sem contas. Falha em silêncio quando
 * offline ou quando o slug ainda não está no ar (o jogo nunca depende disso).
 * score enviado = score total de carreira; wave = total de estrelas.
 * =============================================================================
 */

const API = 'https://api.k3gamesstudio.com/bubble-blaster';
const NICK_KEY = 'bb-nick';
const NICK_RE = /^[a-zA-Z0-9_\-]{3,14}$/;

export function getNick() {
  return localStorage.getItem(NICK_KEY) || '';
}

export function setNick(nick) {
  if (!NICK_RE.test(nick)) return false;
  localStorage.setItem(NICK_KEY, nick);
  return true;
}

export function nickValid(nick) {
  return NICK_RE.test(nick || '');
}

/** Envia o melhor score; devolve { ok, rank } ou null em falha. */
export async function submitScore(score, stars) {
  const nick = getNick();
  if (!nick || score <= 0) return null;
  try {
    const res = await fetch(`${API}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, score, wave: Math.min(stars || 0, 500), daily: 1 }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Top N global; devolve lista [{nick, score, wave}] ou null. */
export async function fetchTop(limit = 10) {
  try {
    const res = await fetch(`${API}/leaderboard?limit=${limit}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.top || [];
  } catch {
    return null;
  }
}
