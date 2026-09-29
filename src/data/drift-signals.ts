import type { DriftRoute } from './drift-routes';

export type Lang = 'en' | 'de';
export type Signal = { route: DriftRoute; score: number };

/* ---------- Where did they mean to go? ---------- */
const norm = (s: string) => s.toLowerCase().replace(/\.(html?|php)$/, '').replace(/[^a-z0-9äöüß]+/g, ' ').trim();
function lev(a: string, b: string) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const similar = (a: string, b: string) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
const IGNORE = new Set(['en', 'de', 'www', 'index', 'page', 'the']);
export function rankSignals(requested: string, routes: DriftRoute[], lang: Lang, count: number): Signal[] {
  const wanted = norm(requested).split(' ').filter(t => t && !IGNORE.has(t));
  const scored = routes.map(route => {
    if (!wanted.length) return { route, score: 0 };
    const tokens = [...norm(route.path).split(' '), ...norm(route[lang]).split(' ')].filter(t => t && !IGNORE.has(t));
    const whole = similar(wanted.join(''), norm(route.path).replace(/ /g, ''));
    const per = wanted.reduce((sum, w) => sum + Math.max(0, ...tokens.map(t => t.startsWith(w) && w.length > 2 ? .92 : similar(w, t))), 0) / wanted.length;
    const fit = route.lang === 'any' || route.lang === lang ? 1 : .9;
    return { route, score: Math.max(whole, per * .97) * fit };
  }).sort((a, b) => b.score - a.score);
  const picks: Signal[] = scored.filter(s => s.score >= .55).slice(0, Math.min(1, count));
  const defaults = lang === 'de' ? ['/', '/gallery/', '/de/leistungen/', '/de/kontakt/', '/work/studio/'] : ['/', '/gallery/', '/services/', '/contact/', '/work/studio/'];
  for (const path of defaults) {
    if (picks.length >= count) break;
    if (picks.some(p => p.route.path === path)) continue;
    const route = routes.find(r => r.path === path); if (route) picks.push({ route, score: 0 });
  }
  return picks;
}

