// Visitor stars for the Observatory sky.
// A star holds a sky position, the visitor's city (from Vercel's geo headers) and a date.
// No free text, so there is nothing to moderate. One star per visitor per day.
// Storage: Upstash Redis over REST, connected in Vercel (Storage > Upstash for Redis),
// which provides KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_* variables.

type Star = { u: number; v: number; city: string; country: string; t: number };
declare const process: { env: Record<string, string | undefined> };

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'observatory:stars';
const LIMIT = 800;

async function redis(commands: (string | number)[][]) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  return (await response.json()) as { result: unknown }[];
}

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

export async function GET() {
  if (!url || !token) return json({ stars: [], count: 0, store: false });
  try {
    const [list, length] = await redis([['LRANGE', KEY, 0, 499], ['LLEN', KEY]]);
    const stars = (list.result as string[]).map((raw) => { try { return JSON.parse(raw) as Star; } catch { return null; } }).filter(Boolean);
    return json({ stars, count: Number(length.result) || stars.length, store: true }, 200, 'public, s-maxage=30, stale-while-revalidate=120');
  } catch {
    return json({ stars: [], count: 0, store: false }, 200);
  }
}

export async function POST(request: Request) {
  if (!url || !token) return json({ error: 'no-store' }, 503);
  let body: { u?: unknown; v?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const u = Number(body.u), v = Number(body.v);
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) return json({ error: 'bad-position' }, 400);
  const decode = (value: string | null) => { try { return value ? decodeURIComponent(value).slice(0, 40) : ''; } catch { return ''; } };
  const city = decode(request.headers.get('x-vercel-ip-city'));
  const country = (request.headers.get('x-vercel-ip-country') ?? '').slice(0, 2);
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const star: Star = { u: Math.round(u * 1e4) / 1e4, v: Math.round(v * 1e4) / 1e4, city, country, t: Date.now() };
  try {
    const [gate] = await redis([['SET', `observatory:star-ip:${ip}`, '1', 'NX', 'EX', 86400]]);
    if (gate.result !== 'OK') return json({ error: 'already' }, 429);
    const [, length] = await redis([['LPUSH', KEY, JSON.stringify(star)], ['LLEN', KEY], ['LTRIM', KEY, 0, LIMIT - 1]]);
    return json({ star, count: Number(length.result) || 1 }, 201);
  } catch {
    return json({ error: 'store' }, 502);
  }
}
