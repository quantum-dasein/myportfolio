// The lost-and-found counter behind the 404: every visitor who lands on a page that
// does not exist gets the next item number for their tag. Only a number is stored;
// the address itself never leaves the browser, so there is nothing to moderate.
// A visitor keeps the same number for a day. Storage: the same Upstash Redis as the stars.

declare const process: { env: Record<string, string | undefined> };

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'fundbuero:count';
// The office opened with a few hundred items already on the shelves.
const OPENING = 2047;

async function redis(commands: (string | number)[][]) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  return (await response.json()) as { result: unknown }[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET() {
  if (!url || !token) return json({ count: null });
  try {
    const [count] = await redis([['GET', KEY]]);
    return json({ count: OPENING + (Number(count.result) || 0) });
  } catch {
    return json({ count: null });
  }
}

export async function POST(request: Request) {
  if (!url || !token) return json({ number: null }, 503);
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const mine = `fundbuero:ip:${ip}`;
  try {
    const [kept] = await redis([['GET', mine]]);
    if (kept.result) return json({ number: Number(kept.result), again: true });
    const [next] = await redis([['INCR', KEY]]);
    const number = OPENING + (Number(next.result) || 1);
    await redis([['SET', mine, number, 'EX', 86400]]);
    return json({ number });
  } catch {
    return json({ number: null }, 502);
  }
}
