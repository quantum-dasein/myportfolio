import type { DriftRoute } from './drift-routes';

/**
 * Where did a lost visitor mean to go? Reads the address the way a person would:
 * typos and swapped letters, a keyboard left on the Cyrillic layout, words typed in
 * Cyrillic, other words for the same page (EN / DE / RU), the query string, and a
 * few addresses that deserve a joke instead of a correction.
 */
export type Lang = 'en' | 'de';
export type Reason = 'typo' | 'layout' | 'cyrillic' | 'word' | 'admin' | 'newton' | 'meta' | 'none';
export type Guess = { route: DriftRoute; score: number; reason: Reason };

const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const ruToEn = (s: string) => [...s].map(c => { const i = RU.indexOf(c); return i < 0 ? c : EN[i]; }).join('');
const enToRu = (s: string) => [...s].map(c => { const i = EN.indexOf(c); return i < 0 ? c : RU[i]; }).join('');
const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const translit = (s: string) => [...s].map(c => TR[c] ?? c).join('');
const CYR = /[а-яё]/;
const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
const tokens = (s: string) => fold(s).replace(/\.(html?|php|aspx?|jsp)$/g, '').split(/[^a-z0-9а-яё]+/).filter(t => t && !IGNORE.has(t));
const IGNORE = new Set(['en', 'de', 'ru', 'www', 'index', 'page', 'pages', 'the', 'a', 'and', 'und', 'der', 'die', 'das', 'utm', 'source', 'medium', 'campaign', 'ref', 'id', 'p', 'q', 'lang', 'vienna', 'wien', 'html', 'php', 'project']);

/** Damerau-Levenshtein (optimal string alignment): a swap of two letters costs one. */
function distance(a: string, b: string) {
  if (a === b) return 0;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const similar = (a: string, b: string) => 1 - distance(a, b) / Math.max(a.length, b.length, 1);
const near = (t: string, w: string) => t === w ? 1 : t.length >= 4 && (w.startsWith(t) || t.startsWith(w)) ? .92 : similar(t, w);

// Other words for the same page: [words, English path, German path, weight]. Broad topics weigh a
// little less, so "zahnarzt-website" lands on the page for doctors rather than websites in general.
const INTENTS: [string[], string, string, number?][] = [
  [['contact', 'contacts', 'kontakt', 'kontakte', 'kontakty', 'email', 'mail', 'write', 'hire', 'anfrage', 'inquiry', 'enquiry', 'impressum', 'imprint', 'svyaz', 'napisat', 'call', 'phone', 'telefon'], '/contact/', '/de/kontakt/'],
  [['services', 'service', 'leistungen', 'leistung', 'preise', 'preis', 'prices', 'price', 'pricing', 'offer', 'angebot', 'uslugi', 'usluga', 'ceny', 'tseny', 'packages', 'pakete', 'kosten', 'cost', 'rates'], '/services/', '/de/leistungen/'],
  [['gallery', 'galerie', 'galereya', 'archive', 'archiv', 'portfolio', 'portfolyo', 'works', 'projects', 'projekte', 'arbeiten', 'cases', 'observatory', 'raboty', 'showcase', 'showreel'], '/gallery/', '/gallery/'],
  [['about', 'ueber', 'uber', 'aboutme', 'cv', 'resume', 'lebenslauf', 'bio', 'profile', 'profil', 'rodion', 'belousov', 'team', 'who', 'omne', 'rezyume', 'person'], '/en/rodion-belousov-vienna/', '/de/rodion-belousov-wien/'],
  [['home', 'start', 'main', 'startseite', 'glavnaya', 'root', 'studio', 'default'], '/', '/', .92],
  [['notes', 'blog', 'articles', 'article', 'news', 'notizen', 'journal', 'changelog', 'zametki', 'stati', 'posts', 'insights'], '/notes/', '/notes/'],
  [['seo', 'ranking', 'google', 'suchmaschine', 'suchmaschinenoptimierung', 'technical', 'audit', 'indexing', 'sitemap', 'pagespeed'], '/en/technical-seo-vienna/', '/de/technical-seo-wien/'],
  [['website', 'websites', 'webseite', 'webseiten', 'homepage', 'web', 'landing', 'landingpage', 'sait', 'webdesign', 'development', 'entwicklung', 'erstellen', 'razrabotka', 'shop', 'onlineshop'], '/en/website-development-vienna/', '/de/website-erstellen-wien/', .92],
  [['marketing', 'ads', 'werbung', 'social', 'smm', 'reklama', 'instagram', 'linkedin', 'content'], '/en/digital-marketing-vienna/', '/de/digital-marketing-wien/', .92],
  [['video', 'videos', 'film', 'reel', 'reels', 'shorts', 'youtube', 'tiktok', 'animation', '3d', 'motion', 'render', 'blender', 'kino'], '/en/3d-animation-video-vienna/', '/de/3d-animation-video-wien/'],
  [['creative', 'threejs', 'three', 'webgl', 'interactive', 'kreativ', 'gsap', 'shader', 'glsl'], '/en/creative-development-vienna/', '/de/creative-development-wien/'],
  [['doctor', 'doctors', 'arzt', 'aerzte', 'praxis', 'arztpraxis', 'clinic', 'klinik', 'medical', 'zahnarzt', 'dentist', 'vrach', 'ordination'], '/en/website-for-doctors-vienna/', '/de/website-arztpraxis-wien/'],
  [['restaurant', 'restaurants', 'cafe', 'gastro', 'gastronomie', 'bar', 'bistro', 'restoran'], '/en/website-for-restaurants-vienna/', '/de/website-restaurant-wien/'],
  [['handwerker', 'tradespeople', 'handwerk', 'plumber', 'installateur', 'elektriker', 'electrician', 'tischler', 'maler', 'builder', 'baufirma'], '/en/website-for-tradespeople-vienna/', '/de/website-handwerker-wien/'],
  [['fidic', 'contract', 'contracts', 'vertrag', 'vertraege', 'kontrakt'], '/work/fidic/', '/work/fidic/'],
  [['bridge', 'consult', 'bruecke', 'most', 'bridgeconsult'], '/work/bridge-consult/', '/work/bridge-consult/'],
  [['academy', 'akademie', 'course', 'courses', 'kurs', 'training', 'akademiya'], '/work/academy/', '/work/academy/'],
  [['colophon', 'built', 'engine', 'stack', 'tech', 'source', 'code', 'making', 'howto'], '/work/studio/', '/work/studio/'],
  [['ai', 'ki', 'gpt', 'chatgpt', 'llm', 'claude', 'neural', 'neuro'], '/en/insights/ai-assisted-creative-development/', '/de/insights/ai-assisted-creative-development/'],
];
const ADMIN = /(^|\/)(wp-?admin|wp-?login|wp-content|wp-includes|wordpress|administrator|admin|phpmyadmin|xmlrpc|\.env|\.git|cgi-bin|login|signin|dashboard|cpanel)(\/|\.|$)/;
const NEWTON = /(^|\/)(newton|isaac|apple|apples|apfel|gravity|gravitation|schwerkraft|nyuton|yabloko|principia)(\/|$)/;

const looksGerman = (s: string) => /ä|ö|ü|ß|\/de\/|leistung|kontakt|preise|ueber|startseite|arbeiten|projekte|webseite|erstellen|notizen/.test(s);

export function special(requested: string): 'newton' | 'admin' | 'meta' | null {
  const s = fold(requested);
  if (NEWTON.test(s)) return 'newton';
  if (ADMIN.test(s)) return 'admin';
  if (/(^|\/)404(\.html)?(\/|$)/.test(s)) return 'meta';
  return null;
}

export function guess(requested: string, routes: DriftRoute[], lang: Lang, count = 3): Guess[] {
  const raw = (() => { try { return decodeURIComponent(requested); } catch { return requested; } })().toLowerCase();
  const wantDe = lang === 'de' || looksGerman(raw);
  const byPath = new Map(routes.map(r => [r.path, r]));
  const home = byPath.get('/')!;
  const egg = special(raw);
  if (egg === 'admin' || egg === 'meta') return [{ route: home, score: 1, reason: egg }];
  if (egg === 'newton') return [{ route: home, score: 1, reason: 'newton' }];

  // Readings of the address, each with the reason we would give for it. The path speaks
  // louder than the query string.
  const [path, query = ''] = raw.split('?');
  const readingsOf = (text: string, weight: number) => {
    const out: { text: string; reason: Reason; weight: number }[] = [{ text, reason: 'typo', weight }];
    if (CYR.test(text)) {
      out.push({ text: ruToEn(text), reason: 'layout', weight });
      out.push({ text: translit(text), reason: 'cyrillic', weight });
    } else {
      // Russian words typed with the keyboard on the Latin layout: "rjynfrn" → "контакт".
      const ru = enToRu(text.replace(/[^a-z;'\[\],.`]/g, ' '));
      if (CYR.test(ru)) out.push({ text: translit(ru), reason: 'layout', weight: weight * .98 });
    }
    return out;
  };
  const readings = [...readingsOf(path, 1), ...(query ? readingsOf(query.replace(/[=&+]/g, ' '), .72) : [])];

  const best = new Map<string, Guess>();
  const offer = (path: string, score: number, reason: Reason) => {
    const route = byPath.get(path); if (!route) return;
    const fit = route.lang === 'any' || (route.lang === 'de') === wantDe ? 1 : .9;
    const s = score * fit;
    const had = best.get(path);
    if (!had || s > had.score) best.set(path, { route, score: s, reason });
  };
  for (const { text, reason, weight } of readings) {
    const want = tokens(text);
    if (!want.length) continue;
    // 1. Other words for a page.
    for (const [words, en, de, w8 = 1] of INTENTS) {
      let top = 0, exactSlug = false;
      for (const t of want) for (const w of words) {
        const s = near(t, w);
        if (s > top) { top = s; exactSlug = (en + de).includes(w); }
      }
      if (top >= .74) offer(wantDe ? de : en, top * .96 * weight * w8, reason === 'typo' ? (exactSlug || top < 1 ? 'typo' : 'word') : reason);
    }
    // 2. The addresses themselves, whole and word by word, including every archive work.
    for (const route of routes) {
      const slug = fold(route.path).replace(/[^a-z0-9]+/g, '');
      const words = [...tokens(route.path), ...tokens(route[wantDe ? 'de' : 'en'])];
      const whole = similar(want.join(''), slug);
      const per = want.reduce((sum, w) => sum + Math.max(0, ...words.map(t => near(w, t))), 0) / want.length;
      offer(route.path, Math.max(whole, per * .97) * weight, reason);
    }
  }
  const ranked = [...best.values()].filter(g => g.score >= .6).sort((a, b) => b.score - a.score);
  // The same page in two languages counts once.
  const seen = new Set<string>(), out: Guess[] = [];
  for (const g of ranked) {
    const key = g.route[wantDe ? 'de' : 'en'].split(' — ')[0].replace(/ \((German|Englisch)\)$/, '');
    if (seen.has(key)) continue; seen.add(key); out.push(g);
    if (out.length >= count) break;
  }
  return out.length ? out : [{ route: home, score: 0, reason: 'none' }];
}

export const REASONS: Record<Lang, Record<Reason, string>> = {
  en: {
    typo: 'Looks like a small typo.',
    layout: 'Your keyboard was on the Cyrillic layout — the vault switched it back.',
    cyrillic: 'Written in Cyrillic — the vault reads that too.',
    word: 'Different word, same page.',
    admin: 'No WordPress here — every line of this site is handwritten.',
    newton: 'Sir Isaac isn’t in. He left you something — watch the light.',
    meta: 'You found the page for pages that aren’t here. Well done.',
    none: 'Even the vault doesn’t know that one.',
  },
  de: {
    typo: 'Sieht nach einem kleinen Tippfehler aus.',
    layout: 'Deine Tastatur stand auf Kyrillisch — das Gewölbe hat zurückgeschaltet.',
    cyrillic: 'Auf Kyrillisch geschrieben — das Gewölbe liest auch das.',
    word: 'Anderes Wort, gleiche Seite.',
    admin: 'Hier gibt es kein WordPress — jede Zeile dieser Seite ist handgeschrieben.',
    newton: 'Sir Isaac ist nicht da. Er hat dir etwas dagelassen — achte auf das Licht.',
    meta: 'Du hast die Seite für Seiten gefunden, die es nicht gibt. Respekt.',
    none: 'Selbst das Gewölbe kennt diese nicht.',
  },
};
