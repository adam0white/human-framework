/**
 * Ledger-triage bake-off (2026-10-20): Clairic, Clef and small Workers AI LLMs against 50 hand-labelled
 * feedback-ledger rows. Each model sees only a row's quoted words and the kind of source (owner, playtester,
 * harness...), never the game column, source path or tester name, which leak the answer.
 *
 * Run: node docs/lab/experiments/clairic-triage-2026-10-20/bakeoff.ts [--arms=clef,clairic,...] [--pass=1]
 * The Cloudflare token is read in-process from `wrangler auth token` and never printed or written.
 * Hard spend stop per process: --cap (default 0.04 USD at list price), counted from each response's usage.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const CAP_USD = Number(process.argv.find((a) => a.startsWith('--cap='))?.slice(6) ?? 0.04); // per process; 12 processes stay under 0.50
const ACCOUNT = 'a20259cba74e506296745f9c67c1f3bc';

type Label = {
  id: string;
  words: string;
  kind: string;
  game: string;
  verdict: string;
  routeKinds: string[];
  category: string;
  severity: number;
  doubt: boolean;
};

export const CATEGORIES: Record<string, string> = {
  bug: 'Something is broken or behaves wrongly (a control fails, an error, an impossible situation)',
  unclear: 'The player cannot read the rules, the state, or what their action did',
  layout: 'Screen layout or phone fit: clipped, below the fold, hard to tap, hard to read on a small screen',
  pacing: 'Too little to do, empty or dragging time, the session does not hold attention, players get bored',
  difficulty: 'Too hard, unfair, too easy, or no pressure',
  repetition: 'The same line, answer or instruction repeated too often',
  agency: 'The player cannot do what they want, or their input does not seem to matter',
  delight: 'A positive moment, praise, or wanting to come back',
  direction: 'Advice, a design recommendation or a direction about what to build',
  tooling: 'About the test harness, telemetry or lab tools rather than the game',
};
export const GAMES: Record<string, string> = {
  murmur: 'a week as the voice in Dilan’s head',
  stairwell: 'the kapıcı of a seven-flat block in Istanbul; residents, stairs, papers',
  pass: 'a small kitchen with three cooks who can say no; asks, stations, portions',
  glance: 'a dam night desk; gauges read by a tired keeper',
  watch: 'the watch of a walled village; watchers such as Mara and Joss',
  hearsay: 'a tea garden; messages and rumours travel; a wedding',
  goodhands: 'a placement agency in Izmir; interviews and candidates',
  valley: 'an agha’s seal over two Ottoman hamlets; households, presses, a ledger, Turkish dates',
  voice: 'a voice in Halil’s head during Ramadan',
  well: 'a village played twice, units versus people',
  warren: 'a village cuts a refuge into stone; chalk walls, a bell, digging, shelter',
  repair: 'a repair workshop; jobs, bench, stock',
  neighbours: 'a town of HF people; Sam, Ada, Ravi; promises, the Hall',
  rope: 'a mountain climb; descent, roping',
  lab: 'the lab, its tools or all games, not one game',
};
const VERDICTS: Record<string, string> = {
  keep: 'Positive: would come back',
  quit: 'Stopped, bored or frustrated, would not come back',
  mixed: 'A complaint or mixed reaction, but not a quit',
  none: 'Not a verdict on the game (a direction, a measurement, a tooling note)',
};
const SEVERITY = [
  'None (praise or neutral)',
  'Minor',
  'Real friction',
  'Made the player quit or blocks play',
];

const PRICE: Record<string, [number, number]> = {
  '@cf/cloudflare/clef': [0.24, 0],
  '@cf/cloudflare/clairic': [0.1, 0],
  '@cf/meta/llama-3.2-3b-instruct': [0.0509, 0.335],
  '@cf/qwen/qwen3-30b-a3b-fp8': [0.0509, 0.335],
  '@cf/google/gemma-4-26b-a4b-it': [0.1, 0.3],
  '@cf/mistralai/mistral-small-3.1-24b-instruct': [0.351, 0.555],
};
const LLMS = [
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/google/gemma-4-26b-a4b-it',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
];

let token = '';
let spent = 0;
function auth() {
  if (!token) {
    const raw = execFileSync('npx', ['wrangler', 'auth', 'token', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    token = (JSON.parse(raw.slice(raw.indexOf('{'))) as { token: string }).token;
  }
  return token;
}

async function run(model: string, body: unknown) {
  if (spent >= CAP_USD) throw new Error(`spend cap reached (${spent.toFixed(4)} USD)`);
  const t0 = performance.now();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${model}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${auth()}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = performance.now() - t0;
  const json = (await res.json()) as {
    success?: boolean;
    result?: Record<string, unknown>;
    errors?: { message: string }[];
  };
  if (!res.ok || json.success === false)
    throw new Error(`${model} ${res.status}: ${json.errors?.map((e) => e.message).join('; ')}`);
  const result = json.result ?? {};
  const usage = (result.usage ?? {}) as Record<string, number>;
  const inTok = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outTok = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const [pi, po] = PRICE[model] ?? [1, 1];
  const usd = (inTok * pi + outTok * po) / 1e6;
  spent += usd;
  return { result, ms, inTok, outTok, usd };
}

const state = (r: Label) => `Source kind: ${r.kind}\nFeedback: ${r.words}`;

async function clef(r: Label, model = '@cf/cloudflare/clef') {
  const out = await run(model, {
    model: model.endsWith('flash') ? 'clef-flash' : 'clef',
    state: state(r),
    questions: {
      category: { type: 'choice', instructions: 'What kind of feedback is this?', criteria: CATEGORIES },
      game: { type: 'choice', instructions: 'Which game is this feedback about?', criteria: GAMES },
      verdict: {
        type: 'choice',
        instructions: 'What is the speaker’s verdict on the game?',
        criteria: VERDICTS,
      },
      severity: {
        type: 'score',
        instructions: 'How severe is the problem for the player?',
        criteria: SEVERITY,
      },
      fix: { type: 'noul', instructions: 'Does this call for a change to a specific game?' },
    },
  });
  return { ...out, raw: out.result };
}

function menu(obj: Record<string, string>) {
  return Object.entries(obj)
    .map(([k, v]) => `${k} (${v})`)
    .join('; ');
}

async function clairic(r: Label) {
  const s = `${state(r)}\n\nCategories: ${menu(CATEGORIES)}\nGames: ${Object.keys(GAMES).join(', ')}\nVerdicts: keep, quit, mixed, none`;
  const out = await run('@cf/cloudflare/clairic', {
    model: 'clairic',
    state: s,
    fields: {
      problem: {
        type: 'text',
        instructions: 'The shortest phrase of the feedback that names the problem or praise',
      },
      category: {
        type: 'text',
        instructions: 'Copy the one category word from the Categories line that fits best',
      },
      game: {
        type: 'text',
        instructions: 'Copy the one game name from the Games line this feedback is about',
      },
      verdict: { type: 'text', instructions: 'Copy one word from the Verdicts line' },
      severity: {
        type: 'estimate',
        min: 0,
        max: 3,
        step: 1,
        instructions: '0 praise or neutral, 1 minor, 2 real friction, 3 made the player quit or blocks play',
      },
    },
  });
  return { ...out, raw: out.result };
}

function prompt(r: Label) {
  return [
    'You triage playtest feedback for a small game lab. Answer with JSON only, no prose:',
    '{"category": <one key>, "game": <one key>, "verdict": <one key>, "severity": <0-3>, "fix": <true|false>}',
    `category keys: ${menu(CATEGORIES)}`,
    `game keys: ${menu(GAMES)}`,
    `verdict keys: ${menu(VERDICTS)}`,
    `severity: ${SEVERITY.map((s, i) => `${i} ${s}`).join('; ')}`,
    'fix: true when the feedback calls for a change to a specific game.',
    '',
    state(r),
  ].join('\n');
}

async function llm(model: string, r: Label) {
  const body: Record<string, unknown> = {
    messages: [{ role: 'user', content: prompt(r) }],
    temperature: 0,
    max_tokens: 200,
  };
  // Reasoning models: thinking off, so every arm answers in one short completion.
  if (model.includes('qwen3') || model.includes('gemma-4'))
    body.chat_template_kwargs = { enable_thinking: false };
  const out = await run(model, body);
  return { ...out, raw: out.result };
}

if (import.meta.main) {
  const labels = JSON.parse(readFileSync(join(here, 'labels.json'), 'utf8')) as Label[];
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const arms = (arg('arms') ?? `clef,clairic,${LLMS.join(',')}`).split(',');
  const pass = arg('pass') ?? '1';
  const limit = Number(arg('limit') ?? labels.length);
  for (const arm of arms) {
    const rows: unknown[] = [];
    for (const r of labels.slice(0, limit)) {
      try {
        const o =
          arm === 'clef' || arm === 'clef-flash'
            ? await clef(r, arm === 'clef' ? '@cf/cloudflare/clef' : '@cf/cloudflare/clef-flash')
            : arm === 'clairic'
              ? await clairic(r)
              : await llm(arm, r);
        rows.push({ id: r.id, ms: o.ms, inTok: o.inTok, outTok: o.outTok, usd: o.usd, raw: o.raw });
      } catch (e) {
        rows.push({ id: r.id, error: String((e as Error).message).slice(0, 300) });
        if (String(e).includes('spend cap')) break;
      }
    }
    const name = arm.replace(/^@cf\//, '').replace(/\//g, '_');
    writeFileSync(join(here, 'raw', `${name}.pass${pass}.json`), `${JSON.stringify(rows, null, 1)}\n`);
    console.log(arm, `pass ${pass}`, rows.length, 'rows; spent so far', spent.toFixed(5), 'USD');
  }
}
