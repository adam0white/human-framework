/** Daily source-unread Workers AI players. Only lab:play visible replies reach the model. */
import { type ChildProcess, spawn } from 'node:child_process';
import { appendFile, mkdir, open, readFile, statfs, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../apps/site/src/games.ts';
import { buildNoteRequest, parseSuggestion } from './lab-inbox-suggest.ts';
import { namedTapRoles, type PlayOp, validatePlayOp } from './lab-play-helpers.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(homedir(), 'code/.lab-scratch/wai-daily');
const PERSONAS = ['Maya Chen', 'Emre Kaya', 'Nia Okafor'];
export const MODELS = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.2-11b-vision-instruct',
];
export function attemptDirectory(date: Date, label?: string): string {
  const day = join(BASE, date.toISOString().slice(0, 10));
  if (label === undefined) return day;
  if (!/^[a-zA-Z0-9_-]{1,40}$/u.test(label)) throw new Error('Invalid attempt label');
  return join(day, `attempt-${label}`);
}
export function responseText(result: Record<string, unknown>): string {
  if (typeof result.response === 'string' && result.response.trim()) return result.response;
  const choices = result.choices;
  if (Array.isArray(choices)) {
    const message = choices[0]?.message;
    if (message && typeof message === 'object') {
      for (const key of ['content', 'reasoning']) {
        const value = (message as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.trim()) return value;
      }
    }
  }
  throw new Error('Model returned no text response');
}
export function actionableNames(controls: string): { role: string; name: string }[] {
  const entries: { role: string; name: string }[] = [];
  for (const line of controls.split('\n')) {
    const entry = line.replace(/^\s*-\s+/u, '');
    const text = entry.startsWith("'") ? entry.slice(1, entry.lastIndexOf("'")).replace(/''/gu, "'") : entry;
    const match = /^(\S+)\s+("(?:\\.|[^"\\])*")/u.exec(text);
    if (!match?.[1] || !match[2] || !namedTapRoles.includes(match[1])) continue;
    try {
      entries.push({ role: match[1], name: JSON.parse(match[2]) as string });
    } catch {
      /* malformed snapshot label is not actionable evidence */
    }
  }
  return entries;
}
export function normalizeTapName(op: PlayOp, controls: string): PlayOp {
  if (op.op !== 'tap' || !('name' in op) || typeof op.name !== 'string') return op;
  const names = actionableNames(controls);
  // A literal accessible name always wins, even when it resembles a role wrapper.
  if (names.some((entry) => entry.name === op.name)) return op;
  const matches = names.filter(
    (entry) =>
      (!op.role || op.role === entry.role) && `${entry.role} ${JSON.stringify(entry.name)}` === op.name,
  );
  if (matches.length !== 1 || !matches[0]) return op;
  return { ...op, name: matches[0].name };
}
function option(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}
export function dailyPlan(date: Date) {
  const day = Math.floor(date.getTime() / 86_400_000);
  const week = Math.floor(day / 7);
  const rotation = day % MODELS.length;
  const models = [...MODELS.slice(rotation), ...MODELS.slice(0, rotation)];
  return models
    .flatMap((model, index) => {
      const game = GAMES[(day * MODELS.length + index) % GAMES.length];
      if (!game) throw new Error('Empty games registry');
      const persona = PERSONAS[(week + index) % PERSONAS.length] ?? PERSONAS[0];
      return [0, 15]
        .map((floor) => ({
          model,
          game: game.id,
          url: new URL(game.href, 'https://human.adamwhite.work').href,
          persona,
          floor,
          ceiling: 25,
          control: false,
        }))
        .concat(
          index === 0
            ? [
                {
                  model,
                  game: 'darkroom',
                  url: 'https://adarkroom.doublespeakgames.com/',
                  persona,
                  floor: 15,
                  ceiling: 25,
                  control: true,
                },
              ]
            : [],
        );
    })
    .sort((a, b) => Number(a.control) - Number(b.control) || a.floor - b.floor);
}
async function diskGuard() {
  const disk = await statfs(BASE);
  if (disk.bavail * disk.bsize < 5_000_000_000) throw new Error('STOP: disk below 5 GB');
}
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
interface Reply {
  visible?: string;
  controls?: string;
  error?: string;
  elapsed_s?: number;
  [key: string]: unknown;
}
async function driver(port: number, op: PlayOp): Promise<Reply> {
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    method: 'POST',
    body: JSON.stringify(op),
    signal: AbortSignal.timeout(40_000),
  });
  return (await response.json()) as Reply;
}
async function startDriver(args: string[]): Promise<{ child: ChildProcess; port: number }> {
  const child = spawn('/opt/homebrew/bin/node', ['scripts/lab-play.ts', ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return await new Promise((done, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Driver startup timed out'));
    }, 45_000);
    let buffer = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      for (const line of buffer.split('\n')) {
        try {
          const value = JSON.parse(line);
          if (value.port && value.driver_check) {
            clearTimeout(timeout);
            done({ child, port: value.port });
            return;
          }
        } catch {
          /* startup noise is not a receipt */
        }
      }
    });
    child.once('error', () => {
      clearTimeout(timeout);
      reject(new Error('Driver launch failed'));
    });
    child.once('exit', () => {
      clearTimeout(timeout);
      reject(new Error('Driver exited before startup'));
    });
  });
}
interface ModelAnswer {
  op: unknown;
  report?: string;
}
function answer(text: string): ModelAnswer {
  const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '')) as ModelAnswer;
  const op = validatePlayOp(parsed.op);
  if (['open', 'resize'].includes(op.op)) throw new Error('Player may not reset the session');
  if (op.op === 'shot' && !/^[a-zA-Z0-9_-]+\.png$/u.test(op.file)) throw new Error('Invalid screenshot name');
  if (op.op === 'wait' && (op.s < 1 || op.s > 30)) throw new Error('Wait must be 1–30 seconds');
  return { op, report: typeof parsed.report === 'string' ? parsed.report : undefined };
}
// Adapter is injected by the shared budget module. No direct inference fetch is permitted here.
export interface PlayerBudget {
  models(): Promise<string[]>;
  infer(
    model: string,
    messages: { role: string; content: string }[],
    maxTokens: number,
    image?: number[],
  ): Promise<string>;
  summary(): Promise<unknown>;
}
async function writeDailySummary(budget: PlayerBudget, directory: string, now: Date) {
  const usage = await budget.summary();
  await writeFile(join(directory, 'usage.json'), JSON.stringify(usage, null, 2));
  const accounting = usage as {
    local?: {
      days?: Record<string, { models?: Record<string, { neurons: number; usd: number; calls: number }> }>;
    };
    projectedPaidUSD?: number | null;
  };
  const rows = Object.entries(accounting.local?.days?.[now.toISOString().slice(0, 10)]?.models ?? {})
    .map(([model, value]) => `| ${model} | ${value.calls} | ${value.neurons} | $${value.usd.toFixed(6)} |`)
    .join('\n');
  const table = `| Model | Calls | Neurons | Estimated cost |\n| --- | ---: | ---: | ---: |\n${rows}\n\nProjected account overage estimate: ${accounting.projectedPaidUSD === null || accounting.projectedPaidUSD === undefined ? 'unavailable' : `$${accounting.projectedPaidUSD.toFixed(6)}`}\n`;
  const summary = `# Workers AI daily report ${now.toISOString().slice(0, 10)}\n\nSynthetic evidence only. Incomplete sessions and skipped coverage are not player verdicts. Dollar amounts estimate inference costs, not billed charges.\n\n${table}\n\`\`\`json\n${JSON.stringify(usage, null, 2)}\n\`\`\`\n`;
  await writeFile(join(directory, 'summary.md'), summary);
  console.log(summary);
}
export async function runDaily(budget: PlayerBudget, now = new Date()) {
  await mkdir(BASE, { recursive: true });
  await diskGuard();
  const directory = attemptDirectory(now, option('attempt'));
  const lockPath = join(BASE, 'runner.lock');
  const lock = await open(lockPath, 'wx').catch(() => {
    throw new Error('Runner lock exists; verify no runner is active before removing it');
  });
  let claimed = false;
  let halted = false;
  try {
    await mkdir(directory, { recursive: true });
    const probe = option('probe');
    if (probe && !GAMES.some((game) => game.id === probe)) throw new Error('Unknown probe game');
    const game = GAMES.find((entry) => entry.id === probe);
    const plan = game
      ? [
          {
            model: MODELS[0] ?? '',
            game: game.id,
            url: new URL(game.href, 'https://human.adamwhite.work').href,
            persona: 'Maya Chen',
            floor: 0,
            ceiling: 25,
            control: false,
          },
        ]
      : dailyPlan(now);
    await writeFile(
      join(directory, 'plan.json'),
      JSON.stringify(
        { plan, mode: probe ? 'format-and-feedback probe; not a protocol round' : 'daily round' },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    claimed = true;
    const available = await budget.models();
    await writeFile(join(directory, 'catalogue.json'), JSON.stringify(available));
    const protocol = await readFile(join(ROOT, 'docs/lab/playtester-prompt.md'), 'utf8');
    const panel = await readFile(join(ROOT, 'docs/lab/lab-personas.md'), 'utf8');
    for (const [index, session] of plan.entries()) {
      await diskGuard();
      if (!available.includes(session.model)) {
        await appendFile(
          join(directory, 'skipped.jsonl'),
          `${JSON.stringify({ ...session, reason: 'Model absent from live catalogue' })}\n`,
        );
        continue;
      }
      const out = join(directory, `${index}-${session.game}-${session.floor}`);
      await mkdir(out, { recursive: true });
      let child: ChildProcess | undefined;
      let port = 0;
      let failure: string | undefined;
      let budgetStop = false;
      let invalidReplies = 0;
      const start = Date.now();
      let stop: ModelAnswer | undefined;
      try {
        ({ child, port } = await startDriver([
          `url=${session.url}`,
          `out=${out}`,
          `port=${19370 + index}`,
          'device=desktop',
          `floor=${session.floor}`,
          `ceiling=${session.ceiling + 3}`,
        ]));
        let reply: Reply;
        reply = await driver(port, { op: 'open' });
        const brief = panel.split(`### ${session.persona}\n`)[1]?.split('\n### ')[0]?.split('\n## ')[0];
        if (!brief) throw new Error('Persona brief missing');
        const system = `${protocol}\nYour own persona brief: ${brief}\nYou have set aside time to explore.\nAssignment: ${JSON.stringify(session)}\nDevice: desktop driver. You receive visible text and accessible controls only; ${session.model.includes('vision') ? 'A current viewport screenshot is supplied with each decision; only report visual checks you actually observe.' : 'Screenshots are NOT supplied, so visual-only checks are NOT TESTED.'} Output JSON only: {"op": <one valid lab:play operation>, "report": <optional final report>}. Ops: tap(name or text or x,y), select(name or label,option), type(name,text), key(key), scroll(dy), wait(s=1..30), shot(file), log(kind,reaction,reason,engagement). Include reaction metadata on actions. Never invent a control. Log first_minute after 60 seconds and pulses every three minutes. Stop via log(kind=stop,reason,reaction) and provide report. User authorization overrides the protocol telemetry prohibition: after stopping use the normal Send feedback UI, identify yourself as playtester ${session.persona} wai-${session.model.split('/').at(-1)}, submit your verbatim experience, and verify the visible receipt. Do not change consent settings. Do not claim submission without a visible receipt. During play you may not send feedback until asked in the closing stage.`;
        let history: { role: string; content: string }[] = [];
        let closing = false;
        let closingActions = 0;
        let closingDeadline = 0;
        for (let turn = 0; turn < 500; turn++) {
          await diskGuard();
          const elapsed = (Date.now() - start) / 60_000;
          if (!closing && elapsed >= session.ceiling) {
            await driver(port, {
              op: 'log',
              kind: 'stop',
              reason: 'BUDGET',
              reaction: 'Coordinator ceiling reached; no player verdict inferred.',
            });
            closing = true;
            closingDeadline = Date.now() + 120_000;
          }
          if (closing && (Date.now() > closingDeadline || session.control)) break;
          const user = JSON.stringify({
            elapsed_minutes: elapsed,
            floor: session.floor,
            ceiling: session.ceiling,
            stage: closing
              ? 'Closing: send normal feedback and verify receipt; then log stop. No more gameplay.'
              : 'Play',
            snapshot: reply,
            actionableNames: actionableNames(reply.controls ?? ''),
            instruction:
              'Return exactly one JSON object for the next operation, not a diary or report. For named taps use only the exact inner name from actionableNames: if controls show button "Begin", send name: "Begin", never name: "button \\"Begin\\"". Do not include the role in name. Example: {"op":{"op":"tap","name":"EXACT CURRENT CONTROL"},"report":null}. Replace the example name with an actual current control, or choose another documented operation. Do not claim a future input, result or elapsed checkpoint. A final report is allowed only with a stop operation. First-minute notes require actual elapsed_minutes >= 1; pulses require actual elapsed time, never invented future times.',
          });
          const image = session.model.includes('vision')
            ? Array.from(
                await readFile(
                  String((await driver(port, { op: 'shot', file: `turn-${turn}.png` })).screenshot),
                ),
              )
            : undefined;
          const raw = await budget.infer(
            session.model,
            [{ role: 'system', content: system }, ...history, { role: 'user', content: user }],
            768,
            image,
          );
          await appendFile(
            join(out, 'model.jsonl'),
            `${JSON.stringify({ t: new Date().toISOString(), snapshot: reply, response: raw })}\n`,
          );
          let parsed: ModelAnswer;
          try {
            parsed = answer(raw);
            invalidReplies = 0;
          } catch {
            invalidReplies++;
            if (invalidReplies > 1)
              throw new Error('TOOL: model returned invalid operation twice; no input executed');
            reply = {
              ...reply,
              coordinator:
                'Your last JSON operation was invalid. Retry once using only the documented operation schema and current controls.',
            };
            continue;
          }
          const op = normalizeTapName(parsed.op as PlayOp, reply.controls ?? '');
          if ((op.kind === 'first_minute' && elapsed < 1) || (op.kind === 'pulse' && elapsed < 3)) {
            reply = {
              ...reply,
              coordinator:
                'That elapsed checkpoint has not happened. Choose a real next input without inventing time or observations.',
            };
            continue;
          }
          if (op.op === 'log' && op.kind === 'stop') {
            if (!closing && elapsed < session.floor && !['TOOL', 'FINISHED'].includes(op.reason ?? '')) {
              reply = {
                ...reply,
                coordinator:
                  'Floor not reached. Log want_quit and continue. Broken game or driver block must be described accurately.',
              };
              continue;
            }
            if (closing) {
              if (closingActions === 0) {
                reply = {
                  ...reply,
                  coordinator:
                    'Before ending, make one best-effort attempt to reach the normal feedback controls using the visible page. If no feedback control is visible, log that failure after inspecting the menu. Do not invent submission.',
                };
                closingActions++;
                continue;
              }
              await driver(port, { op: 'shot', file: 'feedback-receipt-or-failure.png' });
              stop = parsed;
              break;
            }
            stop = parsed;
            reply = await driver(port, op);
            if (session.control) break;
            closing = true;
            closingDeadline = Date.now() + 120_000;
          } else {
            reply = await driver(port, op);
            if (closing && op.op !== 'log') closingActions++;
          }
          history = [...history, { role: 'user', content: user }, { role: 'assistant', content: raw }].slice(
            -8,
          );
          await sleep(1500);
        }
        if (process.argv.includes('--suggest') && stop?.report) {
          const request = buildNoteRequest(`playtester ${session.persona}`, stop.report);
          if (request) {
            const { waiRun } = await import('./lab-wai-budget.ts');
            const suggested = await waiRun('@cf/cloudflare/clef', request);
            await writeFile(
              join(out, 'suggestion.json'),
              JSON.stringify(parseSuggestion(suggested.result), null, 2),
            );
          }
        }
      } catch (error) {
        failure = error instanceof Error ? error.message : 'Session failed';
        budgetStop = /STOP:|USAGE LIMIT|reservation retained|Budget |budget |authentication|HTTP 429/iu.test(
          failure,
        );
        if (port)
          await driver(port, {
            op: 'log',
            kind: 'stop',
            reason: budgetStop ? 'BUDGET' : 'TOOL',
            reaction: `Coordinator interruption: ${failure}. No player verdict inferred.`,
          }).catch(() => {});
      } finally {
        if (port && !session.control)
          await driver(port, { op: 'shot', file: 'feedback-receipt-or-failure.png' }).catch(() => {});
        await writeFile(
          join(out, 'report.json'),
          JSON.stringify(
            {
              session,
              stop: stop ?? null,
              status: failure ? 'incomplete' : stop ? 'model-report' : 'incomplete',
              failure: failure ?? null,
              feedback:
                'Inspect visible receipt in model.jsonl and feedback-receipt-or-failure.png; no automatic sent claim',
              timing: { started: new Date(start).toISOString(), ended: new Date().toISOString() },
            },
            null,
            2,
          ),
        );
        if (child) {
          const running = child;
          running.kill('SIGTERM');
          await new Promise<void>((done) => {
            if (running.exitCode !== null) done();
            else {
              running.once('exit', () => done());
              setTimeout(() => {
                running.kill('SIGKILL');
                done();
              }, 5000).unref();
            }
          });
        }
      }
      if (budgetStop) {
        halted = true;
        await appendFile(
          join(directory, 'skipped.jsonl'),
          `${JSON.stringify({ remaining: plan.slice(index + 1), reason: failure })}\n`,
        );
        break;
      }
      await writeFile(join(directory, 'usage.json'), JSON.stringify(await budget.summary(), null, 2));
    }
  } finally {
    if (claimed) {
      try {
        await writeDailySummary(budget, directory, now);
      } catch {
        console.error('Daily usage summary unavailable; inspect budget reservations before any retry');
      }
    }
    await lock.close();
    await unlink(lockPath);
  }
  return { halted, directory, now };
}
async function main() {
  if (process.argv.includes('--scheduled') && new Date().getUTCHours() !== 0) return;
  if (process.argv.includes('--plan')) {
    console.log(JSON.stringify(dailyPlan(new Date()), null, 2));
    return;
  }
  // Loaded only for an explicit run so --plan works without credentials or network.
  const { waiRun, waiSummary, waiUsage, waiModels } = await import('./lab-wai-budget.ts');
  const before = await waiUsage();
  const budget: PlayerBudget = {
    models: waiModels,
    infer: async (model, messages, maxTokens, image) => {
      const { result } = await waiRun(
        model,
        image
          ? {
              prompt: messages.map((message) => `${message.role}: ${message.content}`).join('\n'),
              image,
              max_tokens: maxTokens,
            }
          : {
              messages,
              max_tokens: maxTokens,
              response_format: { type: 'json_object' },
              ...(model.includes('/qwen/') ? { enable_thinking: false } : {}),
            },
      );
      return responseText(result);
    },
    summary: async () => ({
      local: waiSummary(),
      accountBefore: before,
      accountAfter: await waiUsage(),
      projectedPaidUSD: before
        ? (Math.max(
            0,
            before.neurons +
              Object.values(waiSummary().days[new Date().toISOString().slice(0, 10)]?.models ?? {}).reduce(
                (sum, model) => sum + model.neurons,
                0,
              ) -
              10000,
          ) *
            0.011) /
          1000
        : null,
      note: 'Projected paid USD conservatively adds local recorded usage to the starting account total and may double-count; dollar figures are estimates, never billing receipts; shared account usage includes other callers.',
    }),
  };
  const outcome = await runDaily(budget);
  if (!outcome.halted && process.argv.includes('--suggest')) {
    await new Promise<void>((done) => {
      const inbox = spawn('/opt/homebrew/bin/node', ['scripts/lab-inbox.ts', '--suggest'], {
        cwd: ROOT,
        stdio: 'ignore',
      });
      inbox.once('error', () => {
        console.error('Inbox suggestions unavailable; existing reports preserved');
        done();
      });
      inbox.once('exit', (code, signal) => {
        if (code !== 0 || signal)
          console.error('Inbox suggestion run incomplete; existing reports preserved');
        done();
      });
    });
    await writeDailySummary(budget, outcome.directory, outcome.now).catch(() =>
      console.error('Final inbox accounting unavailable; inspect budget reservations'),
    );
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Daily runner failed');
    process.exitCode = 1;
  });
