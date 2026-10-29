/**
 * Text harness for Twice at the Well (/colony/). It drives the game's own sim through the worker's state machine
 * (`Playback`), without the worker, the protocol or IndexedDB, and prints what the page shows (colony-view.ts):
 * every suggestion card, pause ribbon, bubble, moment caption, order chip, goal chip, pane stat and people row,
 * and nothing the page hides.
 *
 * Usage (Node ≥ 24 runs TypeScript directly; from the repository root):
 *
 *   node apps/site/scripts/play-colony.ts --state /tmp/run.json new 20261003
 *   node apps/site/scripts/play-colony.ts --state /tmp/run.json "wait 30" look
 *   node apps/site/scripts/play-colony.ts --state /tmp/run.json "order yusuf house rush" "wait 60"
 *   node apps/site/scripts/play-colony.ts --state /tmp/run.json "export /tmp/playtest-colony.json"
 *
 * Every invocation loads the run from `--state` (a small JSON file: seed, the input log, the clock and the
 * playback settings; the run is replayed from them), runs its commands in order and writes the file back. Each
 * argument is one command; several can also be joined with ";". `help` lists the commands. Time is continuous:
 * `wait N` lets N real seconds pass at the current speed (1× = 8 game minutes per second), and the game stops
 * early on an auto-pause, as the page does. Without `--state`, the run lives only for that invocation.
 *
 * The export is the game's own playtest file (seed + input log + state hash), the same file the page's
 * "Download playtest file" gives; `load` replays one. Kept out of the typecheck (apps/site/tsconfig.json does
 * not include scripts/); biome lints it.
 */

import './package-identity.ts';

import { readFileSync, writeFileSync } from 'node:fs';
import type { PauseInfo, Speed } from '../src/colony/protocol.ts';
import { ColonyGame, DEFAULT_SEED, type LogEntry, SCENARIO_VERSION } from '../src/colony/sim/game.ts';
import { createFrameworkHumanSide } from '../src/colony/sim/human.ts';
import { rulesOf } from '../src/colony/sim/human-side.ts';
import type { PlaceId } from '../src/colony/sim/map.ts';
import { type AppealChip, inferAction, type OrderInput } from '../src/colony/sim/orders.ts';
import { Playback } from '../src/colony/sim/playback.ts';
import { VILLAGERS, type VillagerId } from '../src/colony/sim/world-types.ts';
import { harnessCommands } from '../src/shared/harness-commands.ts';
import { FRAMEWORK_PACKAGE_VERSION as ENGINE_VERSION } from '../src/shared/playtest.ts';
import {
  bubbleLine,
  composerLine,
  dayClock,
  endScreen,
  hurtText,
  inspector,
  momentLine,
  orderLine,
  PLACE_LABEL,
  screen,
  shortName,
} from './colony-view.ts';

const FACTORY = createFrameworkHumanSide;

export const HELP = `Twice at the Well — text harness. Two copies of one village hear every order you give.
Classic units obey. Human people weigh your order against their own needs, duties and trust in you.

Commands (one per argument, or joined with ";"):
  new [seed]            start a new run (paused behind the goal card)
  look                  the whole screen: clock, goals, both panes with people rows, suggestion, order log
  wait [seconds]        let real time pass at the current speed (default 10 s); stops at an auto-pause
  until <D> <HH:MM>     wait until that day and time (e.g. "until 2 09:00"); stops at an auto-pause
  pause | resume        the pause button (Space)
  speed 0.5|1|2         ½×, 1×, 2× (1× = 8 game minutes per real second)
  autopause on|off      pause on suggestions, refusals, moments and the storm
  predict <who> <place> [rush] [insist] [children|duty|safety]
                        fill the composer and read its line (the Human side's likely answer) without sending
  order <who> <place> [rush] [insist] [children|duty|safety]
                        fill the composer and Confirm: the order goes to both villages
  use [rush] [insist] [no-rush] [no-insist] [children|duty|safety]
                        Use the suggestion card (its order and toggles fill the composer), edit, and Confirm
  skip                  skip (×) the suggestion card
  cancel <order id>     cancel an open order (× on its card), e.g. "cancel o3"
  log [all]             the order log (newest first)
  inspect <who>         open the inspector: Classic unit vs Human person, needs, trust, why
  results               the end screen (after the run ends)
  continue              Another day (offered once, after Day 2)
  export <file>         download the playtest file (seed + input log + state)
  load <file>           replay a playtest file and play on from it
  help                  this text
Who: maryam yusuf tariq idris samira danyal. Places: house forest cedar field well kitchen masjid home.`;

const PLACES: Record<string, PlaceId> = {
  house: 'site',
  site: 'site',
  forest: 'forest',
  cedar: 'cedar',
  field: 'field',
  well: 'well',
  kitchen: 'kitchen',
  masjid: 'masjid',
};
const APPEALS: Record<string, AppealChip> = {
  children: 'children',
  duty: 'duty',
  safety: 'safety',
  safer: 'safety',
};

interface Saved {
  seed: number;
  scenario: string;
  minute: number;
  log: LogEntry[];
  speed: Speed;
  autoPause: boolean;
  paused: boolean;
  pause: PauseInfo | null;
  /** Bubble ids and moments already printed. */
  shown: string[];
  moments: number;
  onboarded: boolean;
}

export class Harness {
  pb = new Playback(FACTORY);
  shown = new Set<string>();
  moments = 0;
  onboarded = false;
  out: string[] = [];

  get game(): ColonyGame {
    const g = this.pb.game;
    if (!g) throw new Error('No run yet: use "new [seed]".');
    return g;
  }

  say(...lines: string[]): void {
    this.out.push(...lines);
  }

  save(): Saved {
    const g = this.game;
    return {
      seed: g.seed,
      scenario: g.scenarioVersion,
      minute: g.minute,
      log: g.log,
      speed: this.pb.speed,
      autoPause: this.pb.autoPause,
      paused: this.pb.paused,
      pause: this.pb.pause,
      shown: [...this.shown].slice(-200),
      moments: this.moments,
      onboarded: this.onboarded,
    };
  }

  restore(s: Saved): void {
    const rules = rulesOf(s.scenario);
    if (!rules) throw new Error('This save is from an older version. Start a fresh game.');
    this.pb.game = ColonyGame.replay(s.seed, FACTORY, s.log, s.minute, rules);
    this.pb.speed = s.speed;
    this.pb.autoPause = s.autoPause;
    this.pb.paused = s.paused;
    this.pb.pause = s.pause;
    this.shown = new Set(s.shown);
    this.moments = s.moments;
    this.onboarded = s.onboarded;
  }

  start(seed: number): void {
    this.pb = new Playback(FACTORY);
    this.pb.handle({ type: 'init', seed, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause: true });
    this.shown = new Set();
    this.moments = 0;
    this.onboarded = false;
    const f = this.game.frame();
    this.say(
      `Day 1 · 05:00 — Twice at the Well (seed ${seed})`,
      'Two copies of one village hear every order you give. Classic units obey. Human people weigh your order against their own needs, duties and trust in you, and may say no.',
      'A storm arrives at D2 19:00.',
      ...f.goals.map((g, i) => `  ${i + 1}. ${g.label}: ${g.target} · by ${dayClock(g.deadlineMinute)}`),
      'Both villages are scored on the same goals. Pick a villager, then a place, then Confirm. Suggestions on the clock set up the story and name their risk; following only them will not roof the Human house. Your own orders can. The game pauses for suggestions, refusals and the storm. Space pauses.',
      '(wait = Play)',
    );
  }

  /** What appeared since the last look: bubbles over the Human map, moment captions, the pause ribbon. */
  private collect(): void {
    const f = this.game.frame();
    for (const v of f.human) {
      const b = v.bubble;
      if (!b || this.shown.has(b.id)) continue;
      this.shown.add(b.id);
      const line = bubbleLine(v);
      if (line) this.say(`  ${String(f.clock).replace(/^Day /, 'D')} ${line}`);
    }
    for (const n of f.news) {
      const key = `hurt:${n.side}:${n.personId}:${n.minute}`;
      if (this.shown.has(key)) continue;
      this.shown.add(key);
      this.say(`  Hurt: ${hurtText(n)}`);
    }
    for (const m of f.moments.slice(this.moments)) this.say(`  ${momentLine(m)}`);
    this.moments = f.moments.length;
  }

  /** Real seconds at the current speed, in page-sized ticks; stops at a pause. */
  wait(seconds: number, untilMinute = Number.POSITIVE_INFINITY): void {
    const g = this.game;
    if (g.ended) {
      this.say('The run has ended. (results · continue · new)');
      return;
    }
    if (this.pb.paused) this.pb.handle({ type: 'resume' });
    if (!this.onboarded) {
      this.onboarded = true;
      this.say('Tap any bubble to see why. (inspect <who>)');
    }
    const from = g.minute;
    for (
      let ms = 0;
      ms < seconds * 1000 && !this.pb.paused && !g.ended && g.minute < untilMinute;
      ms += 125
    ) {
      this.pb.handle({ type: 'tick', dtMs: 125 });
      this.collect();
    }
    if (g.minute >= untilMinute && !this.pb.paused) this.pb.handle({ type: 'pause' });
    this.say(`(${g.minute - from} game minutes passed)`);
    this.brief();
  }

  /** The short screen after time passes. */
  brief(): void {
    const f = this.game.frame();
    this.say(...screen(f, this.pb.state(), false));
  }

  private parseOrder(args: string[]): OrderInput {
    const [who, where, ...rest] = args;
    const v = VILLAGERS.find((x) => x.id === who?.toLowerCase());
    if (!v) throw new Error(`Who? ${VILLAGERS.map((x) => x.id).join(' ')}`);
    const w = where?.toLowerCase() ?? '';
    const placeId = w === 'home' ? (v.home as PlaceId) : PLACES[w];
    if (!placeId) throw new Error('Where? house forest cedar field well kitchen masjid home');
    const input: OrderInput = { personId: v.id as VillagerId, placeId };
    for (const r of rest.map((x) => x.toLowerCase())) {
      if (r === 'rush') input.rush = true;
      else if (r === 'insist') input.insist = true;
      else if (APPEALS[r]) input.appeal = APPEALS[r];
      else throw new Error(`Unknown option ${r}: rush insist children duty safety`);
    }
    return input;
  }

  private composer(input: OrderInput): string {
    const g = this.game;
    const job = inferAction(input.placeId, {
      minute: g.minute,
      house: { stage: g.humanWorld.house.stage, shuttered: g.humanWorld.house.shuttered },
      cedarFelled: g.humanWorld.cedarFelled,
      storeroom: g.humanWorld.storeroom,
    });
    const pred = this.pb.handle({ type: 'predict', requestId: 1, input })[0];
    const p = pred?.type === 'predicted' ? pred.prediction : null;
    const toggles = [
      input.rush ? 'Rush' : '',
      input.insist ? 'Insist' : '',
      input.appeal ? `“${input.appeal}”` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    return `${composerLine(input.personId, input.placeId, job, p)}${toggles ? `   [${toggles}]` : ''}`;
  }

  private send(input: OrderInput, nudgeId?: string, reason?: string): void {
    this.say(`Composer: ${this.composer(input)}`);
    if (reason) this.say(`  ${reason}`);
    const wasPaused = this.pb.paused;
    this.pb.handle({ type: 'order', input, ...(nudgeId ? { nudgeId } : {}) });
    const card = this.game.book.cards.at(-1);
    this.say(
      `Order given: ${shortName(input.personId)} → ${PLACE_LABEL[input.placeId]}${card ? ` (${card.order.id})` : ''}`,
    );
    if (wasPaused && !this.pb.paused) this.say('(resumed: that answered the suggestion)');
  }

  run(cmd: string): void {
    const [head = '', ...args] = cmd.trim().split(/\s+/);
    switch (head.toLowerCase()) {
      case '':
        return;
      case 'help':
        this.say(HELP);
        return;
      case 'new':
        this.start(args[0] ? Number(args[0]) : DEFAULT_SEED);
        return;
      case 'look': {
        const f = this.game.frame();
        this.say(...screen(f, this.pb.state(), true));
        for (const v of f.human) {
          const line = bubbleLine(v);
          if (line) this.say(`  over the Human map: ${line}`);
        }
        return;
      }
      case 'wait':
        this.wait(args[0] ? Number(args[0]) : 10);
        return;
      case 'until': {
        const day = Number(args[0]);
        const [hh, mm] = (args[1] ?? '').split(':').map(Number);
        if (!day || hh === undefined || Number.isNaN(hh))
          throw new Error('until <day> <HH:MM>, e.g. until 2 09:00');
        const target = (day - 1) * 1440 + (((((hh - 5) * 60 + (mm ?? 0)) % 1440) + 1440) % 1440);
        if (target <= this.game.minute)
          throw new Error(`That time has passed. It is ${dayClock(this.game.minute)}.`);
        this.wait(Number.POSITIVE_INFINITY, target);
        return;
      }
      case 'pause':
        this.pb.handle({ type: 'pause' });
        this.say('Paused');
        return;
      case 'resume':
        this.pb.handle({ type: 'resume' });
        this.say('Running (wait to let time pass)');
        return;
      case 'speed': {
        const s = Number(args[0]);
        if (s !== 0.5 && s !== 1 && s !== 2) throw new Error('speed 0.5|1|2');
        this.pb.handle({ type: 'setSpeed', speed: s });
        this.say(`Speed ${s === 0.5 ? '½' : s}×`);
        return;
      }
      case 'autopause':
        this.pb.handle({ type: 'setAutoPause', on: args[0] !== 'off' });
        this.say(`Auto-pause ${args[0] !== 'off' ? 'on' : 'off'}`);
        return;
      case 'predict':
        this.say(`Composer: ${this.composer(this.parseOrder(args))}`);
        return;
      case 'order':
        this.send(this.parseOrder(args));
        return;
      case 'use': {
        const n = this.game.frame().nudges[0];
        if (!n) throw new Error('No suggestion card is showing.');
        const input: OrderInput = { ...n.order };
        if (n.prefill?.rush) input.rush = true;
        if (n.prefill?.insist) input.insist = true;
        for (const a of args.map((x) => x.toLowerCase())) {
          if (a === 'rush') input.rush = true;
          else if (a === 'insist') input.insist = true;
          else if (a === 'no-rush') delete input.rush;
          else if (a === 'no-insist') delete input.insist;
          else if (APPEALS[a]) input.appeal = APPEALS[a];
          else throw new Error(`Unknown option ${a}`);
        }
        this.send(input, n.id, n.reason);
        return;
      }
      case 'skip': {
        const n = this.game.frame().nudges[0];
        if (!n) throw new Error('No suggestion card is showing.');
        const was = this.pb.paused;
        this.pb.handle({ type: 'dismissNudge', id: n.id });
        this.say(`Skipped: ${n.text}${was && !this.pb.paused ? ' (resumed)' : ''}`);
        return;
      }
      case 'cancel': {
        const id = args[0] ?? '';
        const card = this.game.book.card(id);
        if (!card) throw new Error(`No order ${id} exists.`);
        if (card.status !== 'active')
          throw new Error(
            `Cannot cancel ${id}: ${card.status}${card.replacedBy ? ` by ${card.replacedBy}` : ''}. ${orderLine(card).trim()}`,
          );
        this.pb.handle({ type: 'cancel', orderId: id });
        this.say(`Cancelled ${id}`);
        return;
      }
      case 'log': {
        const cards = this.game.book.cards.filter((c) => c.status !== 'cancelled').reverse();
        this.say(...(args[0] === 'all' ? cards : cards.slice(0, 12)).map(orderLine));
        if (cards.length === 0) this.say('No orders yet. Pick a villager, then a place.');
        return;
      }
      case 'inspect':
      case 'why': {
        const v = VILLAGERS.find((x) => x.id === args[0]?.toLowerCase());
        if (!v) throw new Error('inspect <who>');
        // Opening pauses (unless already paused); closing resumes only that pause: no net change.
        const r = this.pb.handle({ type: 'why', personId: v.id as VillagerId })[0];
        const why = r?.type === 'why' ? r.why : null;
        this.say(...inspector(this.game.frame(), v.id as VillagerId, why));
        return;
      }
      case 'results': {
        const g = this.game;
        if (!g.ended) throw new Error('The run has not ended yet.');
        this.say(...endScreen(g.summary(), FACTORY, g.canContinue));
        return;
      }
      case 'continue': {
        const g = this.game;
        if (!g.canContinue) throw new Error('Another day is not on offer.');
        this.pb.handle({ type: 'continue' });
        this.moments = g.moments.length;
        this.say(
          'Day 3',
          'Another day: build a store-room beside the house (finish the house first if it is open) and keep 12 meals by 18:00. Keep all six alive.',
          ...g.frame().goals.map((x, i) => `  ${i + 1}. ${x.label}: ${x.target}`),
          '(wait = Play)',
        );
        return;
      }
      case 'export': {
        const file = args[0];
        if (!file) throw new Error('export <file>');
        // `playtestFile` is async only for gzip; the harness writes after it settles (see main()).
        this.pending = this.pb.playtestFile(ENGINE_VERSION).then((f) => {
          writeFileSync(file, `${JSON.stringify({ ...f, build: 'harness' })}\n`);
          this.say(
            `Saved playtest file ${file} (seed ${f.seed}, ${f.log.length} inputs, ${f.scenario}, hash ${f.hash})`,
          );
        });
        return;
      }
      case 'load': {
        const file = args[0];
        if (!file) throw new Error('load <file>');
        const pb = new Playback(FACTORY);
        const { result } = pb.load(readFileSync(file, 'utf8'), ENGINE_VERSION);
        this.pb = pb;
        this.shown = new Set();
        this.moments = this.game.moments.length;
        this.onboarded = true;
        this.say(
          `Playtest file loaded (${result.matches ? 'replays to its hash' : 'does not replay to its hash'}). Play on from here, or look around.`,
        );
        this.brief();
        return;
      }
      default:
        throw new Error(`Unknown command "${head}". Try help.`);
    }
  }

  pending: Promise<void> | null = null;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let stateFile: string | null = null;
  const cmds: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a === '--state') stateFile = argv[++i] ?? null;
    else if (a === '--seed') cmds.unshift(`new ${argv[++i] ?? DEFAULT_SEED}`);
    else cmds.push(a);
  }
  const parsed = harnessCommands(
    cmds,
    new Set(
      'help new look wait until pause resume speed autopause predict order use skip cancel log inspect why results continue export load'.split(
        ' ',
      ),
    ),
  );
  cmds.splice(0, cmds.length, ...parsed);
  if (cmds.length === 0) cmds.push('help');
  const h = new Harness();
  let loaded = false;
  if (stateFile && !cmds[0]?.trim().startsWith('new')) {
    try {
      h.restore(JSON.parse(readFileSync(stateFile, 'utf8')) as Saved);
      loaded = true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  if (!loaded && !cmds.some((c) => /^\s*(new|load|help)\b/.test(c))) h.start(DEFAULT_SEED);
  for (const c of cmds) {
    try {
      h.run(c);
      if (h.pending) {
        await h.pending;
        h.pending = null;
      }
    } catch (e) {
      h.say(`! ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(h.out.join('\n'));
  if (stateFile && h.pb.game) writeFileSync(stateFile, `${JSON.stringify(h.save())}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (error) {
    console.error(
      error instanceof Error && error.message.includes('older version')
        ? 'This save is from an older version. Start a fresh game.'
        : 'This file could not be opened. Keep the original file.',
    );
    process.exitCode = 1;
  }
}
