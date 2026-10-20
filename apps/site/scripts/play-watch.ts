/**
 * The Night Watch as text: a harness that drives the game's own sim (no worker, no IndexedDB) and prints what the
 * page shows, and nothing it hides. Sacks, rope strands and the talk pips are drawn on the page, so they print as
 * glyphs you could count there too; people's needs, trust, fear and the dice never print.
 *
 * Run from the repository root (Node 24+ with type stripping):
 *   node apps/site/scripts/play-watch.ts --state run.json new 7
 *   node apps/site/scripts/play-watch.ts --state run.json start
 *   node apps/site/scripts/play-watch.ts --state run.json "select kian" "post kian east urge" begin "wait 30"
 *   node apps/site/scripts/play-watch.ts --state run.json export out.json
 *   node apps/site/scripts/play-watch.ts help
 * Each argument is one command (or several split by ';'). The run lives in the state file between calls, so a
 * stateless caller can play one command at a time. The screen prints after the last command (`quiet` stops that).
 *
 * Time is continuous, as on the page: `wait <seconds>` lets real seconds pass at the current speed. It stops early
 * when something asks for you (a card on the wall, a matter in the seasons, a page that waits) or a death or a
 * leaving slows the seasons; `wait! <seconds>` does not stop early. The page itself would also not stop: an unanswered card runs out and the person decides
 * alone.
 *
 * Commands (the `help` command prints this list):
 *   new <seed>                begin a new village from a seed (the chronicle's goal page)
 *   show                      print the screen
 *   start                     "Go up to the wall" (goal page)
 *   speed <slow|watch|fast|days|seasons>
 *   wait <seconds> / wait! <seconds>
 *   select <name>             dusk: tap a watcher (shows how you read them, by press)
 *   press <ask|urge|insist>   dusk: how hard you press the selected watcher
 *   post <name> <west|gate|mill|east|off> [ask|urge|insist]   dusk: post a watcher (as tapping a stretch)
 *   lantern <west|gate|mill|east>   dusk: where the lantern starts; night: walk it there
 *   begin                     dusk: "Begin the watch"
 *   bell                      night: ring the bell
 *   answer <n>                night: answer the open card with option n; "letbe" says nothing
 *   talk <name> <n>           dawn: raise topic n with someone
 *   dusk                      dawn: "On to dusk" / "Into the thaw"
 *   card <n>                  seasons: answer the open matter with option n
 *   people                    seasons: open the fold "The village"
 *   take <n>                  fair: take offer n; leave: leave the fair
 *   continue                  thaw, a closed volume: turn the page
 *   chronicle                 open the chronicle (the menu; the clock stands while it is shown)
 *   export [file]             the playtest export (seed, input log, end state), as the page's "Save it as a file"
 *   quiet                     do not print the screen at the end
 * A tester who has not read the source should read only this help and the screens. Do not read the state file or
 * the export: they hold the true numbers the page never shows.
 *
 * Limits: the map is described in words, not drawn; motion between minutes is not shown. Two small pieces of page
 * memory are not kept between calls: a card you let be is shown again on the next call until it runs out (use
 * `letbe` again), and an empty post's one word can fall back from "afraid" to "gone" once its ticker line is old.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// The sim imports HF by package name; point it at the framework's source, so no build is needed.
const hfSource = new URL('../../../packages/human/src/index.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@adam0white/human-framework') return { url: hfSource, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

type Run = import('../src/watch/sim/run.ts').WatchRun;
type Frame = import('../src/watch/sim/view.ts').Frame;
type Speed = import('../src/watch/sim/pace.ts').Speed;
type Pacer = import('../src/watch/sim/pace.ts').Pacer;
type Press = import('../src/watch/sim/state.ts').Press;

const { WatchRun } = await import('../src/watch/sim/run.ts');
const { Pacer: PacerClass, RATE, DAY_RATE } = await import('../src/watch/sim/pace.ts');
const { buildFrame } = await import('../src/watch/sim/view.ts');
const { isSeason } = await import('../src/watch/sim/season.ts');
const { clockRuns } = await import('../src/watch/sim/night.ts');
const { DAY, SECTIONS, postSection } = await import('../src/watch/sim/config.ts');
const { TALKS_PER_DAY } = await import('../src/watch/sim/talk.ts');
const W = await import('../src/watch/ui/words.ts');

export const HELP = readFileSync(new URL(import.meta.url), 'utf8')
  .split('\n')
  .filter((_l, i, all) => {
    const a = all.indexOf(' * Commands (the `help` command prints this list):');
    const b = all.findIndex((x) => x.startsWith(' * A tester who has not read'));
    return i > a && i < b;
  })
  .map((l) => l.replace(/^ \* {0,2}/, ''))
  .join('\n');

/** What the page keeps outside the sim: the selected watcher and press at dusk, a card let be, the menu. */
interface Ui {
  selected: string | null;
  press: Press | null;
  letBe: number | null;
  people: boolean;
  menu: boolean;
}
interface Saved {
  harness: 'play-watch';
  snap: ReturnType<Run['snapshot']>;
  pacer: Record<string, unknown>;
  ui: Ui;
}

const SPEEDS: { id: Speed; label: string }[] = [
  { id: 'tactical', label: 'Slow' },
  { id: 'watch', label: 'Watch' },
  { id: 'fast', label: 'Fast' },
  { id: 'days', label: 'Days' },
  { id: 'seasons', label: 'Seasons' },
];
const SEASON_PHASES = new Set(['spring', 'summer', 'autumn']);
/** What the map's sprite shows a lit watcher doing, in words. */
const POSTURE_WORDS: Record<string, string> = {
  sit: 'sitting',
  doze: 'dozing',
  eat: 'eating',
  pray: 'head bowed',
  down: 'down',
  frozen: 'frozen still',
  carry: 'carrying someone',
};
const RUNNING = new Set(['dusk', 'night', 'spring', 'summer', 'autumn']);
const WINTER_PHASES = new Set(['dusk', 'night', 'dawn']);

export class Harness {
  run: Run;
  pacer: Pacer;
  ui: Ui = { selected: null, press: null, letBe: null, people: false, menu: false };
  out: string[] = [];

  constructor(run: Run, pacer?: Pacer) {
    this.run = run;
    this.pacer = pacer ?? new PacerClass();
    if (!pacer) this.pacer.adopt(run);
  }

  static fresh(seed: number): Harness {
    return new Harness(new WatchRun(seed));
  }

  static fromText(text: string): Harness {
    const saved = JSON.parse(text) as Saved;
    const run = WatchRun.resume(saved.snap);
    const pacer = Object.assign(new PacerClass(), saved.pacer);
    const h = new Harness(run, pacer);
    h.ui = { ...h.ui, ...saved.ui };
    return h;
  }

  toText(): string {
    const saved: Saved = {
      harness: 'play-watch',
      snap: JSON.parse(this.run.snapshotText()),
      pacer: { ...this.pacer } as unknown as Record<string, unknown>,
      ui: this.ui,
    };
    return JSON.stringify(saved);
  }

  frame(): Frame {
    const s = this.run.state;
    const rate = this.ui.menu || !clockRuns(s) ? 0 : this.pacer.paced(this.run);
    return buildFrame(s, this.pacer.progress, this.pacer.slowed(this.run), isSeason(s) ? rate * DAY : rate);
  }

  say(line: string): void {
    this.out.push(line);
  }

  input(i: import('../src/watch/sim/night.ts').Input): boolean {
    const ok = this.run.input(i);
    if (ok) this.pacer.follow(this.run);
    else this.say(`(nothing happens: that cannot be done now)`);
    return ok;
  }

  /** A watcher by name (case-insensitive, a unique prefix will do). */
  who(name: string | undefined): string | null {
    if (!name) return null;
    const f = this.frame();
    const n = name.toLowerCase();
    const hit = f.watchers.filter((w) => w.name.toLowerCase().startsWith(n) || w.id === n);
    if (hit.length === 1) return hit[0]?.id ?? null;
    this.say(hit.length ? `(which one? ${hit.map((w) => w.name).join(', ')})` : `(nobody called ${name})`);
    return null;
  }

  /** Lets `seconds` of real time pass in page-sized ticks. Stops early when something waits on the Keeper. */
  wait(seconds: number, stopEarly: boolean): void {
    const s = this.run.state;
    this.ui.menu = false;
    const tick = 100;
    const before = this.marker();
    let ms = 0;
    for (; ms < seconds * 1000; ms += tick) {
      if (!clockRuns(s)) break;
      this.pacer.tick(this.run, tick);
      if (stopEarly && this.marker() !== before && this.asks()) break;
    }
    if (!clockRuns(s) && ms < seconds * 1000) this.say(`(the clock stands: this page waits for you)`);
    this.say(`(${(ms / 1000).toFixed(1)} s passed)`);
  }

  /** What changes when something asks for the Keeper: a card, a matter, the phase. */
  private marker(): string {
    const s = this.run.state;
    const grave = s.chronicle.filter((l) => l.kind === 'death' || l.kind === 'leave').length;
    return `${s.phase}|${s.moment?.id ?? ''}|${s.card?.id ?? ''}|${grave}`;
  }

  /** Something waits on the Keeper, or (in the seasons) grave news is easing the days. */
  private asks(): boolean {
    const s = this.run.state;
    return (
      s.moment !== null ||
      s.card !== null ||
      !clockRuns(s) ||
      s.phase === 'dusk' ||
      (isSeason(s) && this.pacer.slowed(this.run))
    );
  }

  exec(line: string): void {
    this.command(line);
    // As the page: leaving dusk drops the selection.
    const phase = this.run.state.phase;
    if (phase !== 'dusk' && phase !== 'goal') {
      this.ui.selected = null;
      this.ui.press = null;
    }
  }

  private command(line: string): void {
    const [cmd = '', ...a] = line.trim().split(/\s+/);
    // Reading the screen preserves the open chronicle; a game command closes it.
    if (!['chronicle', 'show', ''].includes(cmd.toLowerCase())) this.ui.menu = false;
    const f = this.frame();
    switch (cmd.toLowerCase()) {
      case '':
      case 'show':
        return;
      case 'help':
        this.say(HELP);
        return;
      case 'quiet':
        return;
      case 'start':
        this.input({ k: 'start' });
        return;
      case 'speed': {
        const want = (a[0] ?? '').toLowerCase();
        const sp = SPEEDS.find((x) => x.label.toLowerCase() === want || x.id === want);
        if (!sp) this.say('(speeds: slow, watch, fast, days, seasons)');
        else this.pacer.speed = sp.id;
        return;
      }
      case 'wait':
      case 'wait!':
        this.wait(Math.max(0, Math.min(3600, Number(a[0] ?? 10) || 10)), cmd === 'wait');
        return;
      case 'select': {
        const id = this.who(a[0]);
        if (id) {
          this.ui.selected = id;
          this.ui.press = null;
        }
        return;
      }
      case 'press': {
        const p = a[0] as Press;
        if (!['ask', 'urge', 'insist'].includes(p) || !this.ui.selected) {
          this.say('(select a watcher first; presses: ask, urge, insist)');
          return;
        }
        this.ui.press = p;
        const w = f.watchers.find((x) => x.id === this.ui.selected);
        if (w?.posted) this.input({ k: 'post', watcher: w.id, post: w.posted, press: p });
        return;
      }
      case 'post': {
        const id = this.who(a[0]);
        if (!id) return;
        const where = (a[1] ?? '').toLowerCase();
        const press = (a[2] as Press | undefined) ?? this.pressFor(f, id);
        if (where === 'off') {
          this.input({ k: 'post', watcher: id, post: null, press });
        } else {
          const sec = SECTIONS.find((x) => x.id === where || x.name.toLowerCase().startsWith(where));
          const at = sec ? freePost(f, sec.id, id) : null;
          if (!at) {
            this.say('(no free post there)');
            return;
          }
          this.input({ k: 'post', watcher: id, post: at, press });
        }
        this.ui.selected = null;
        this.ui.press = null;
        return;
      }
      case 'lantern': {
        const sec = SECTIONS.find((x) => x.id === a[0] || x.name.toLowerCase().startsWith(a[0] ?? '?'));
        if (sec) this.input({ k: 'lantern', section: sec.id });
        else this.say('(stretches: west, gate, mill, east)');
        return;
      }
      case 'begin':
        this.input({ k: 'begin' });
        return;
      case 'bell':
        this.input({ k: 'bell' });
        return;
      case 'answer': {
        const m = f.moment;
        const o = m?.options[Number(a[0]) - 1];
        if (m && o) this.input({ k: 'answer', id: m.id, choice: o.id });
        else this.say('(no such answer)');
        return;
      }
      case 'letbe':
        if (f.moment) this.ui.letBe = f.moment.id;
        return;
      case 'talk': {
        const id = this.who(a[0]);
        const topic = id
          ? (f.talks?.topics[id] ?? ['night', 'body']).slice(0, 2)[Number(a[1]) - 1]
          : undefined;
        if (id && topic) this.input({ k: 'talk', who: id, topic });
        else this.say('(talk <name> <1|2>)');
        return;
      }
      case 'dusk':
        this.input({ k: 'toDusk' });
        return;
      case 'card': {
        const c = f.card;
        const o = c?.options[Number(a[0]) - 1];
        if (c && o) this.input({ k: 'card', id: c.id, choice: o.id });
        else this.say('(no such answer)');
        return;
      }
      case 'people':
        this.ui.people = !this.ui.people;
        return;
      case 'take': {
        const o = f.fair?.offers[Number(a[0]) - 1];
        if (o) this.input({ k: 'fair', pick: o.id });
        else this.say('(no such offer)');
        return;
      }
      case 'leave':
      case 'continue':
        this.input({ k: 'continue' });
        return;
      case 'chronicle':
        this.ui.menu = true;
        return;
      case 'export': {
        const data = { ...this.run.export(), build: 'harness' };
        const json = JSON.stringify(data);
        const file = a[0] ?? `night-watch-seed${data.seed}-year${data.end.year}.json`;
        writeFileSync(file, json);
        this.say(`Saved as ${file} (${Math.ceil(json.length / 1024)} KB). Send that file to the team.`);
        return;
      }
      default:
        this.say(`(unknown command "${cmd}"; try help)`);
    }
  }

  pressFor(f: Frame, id: string): Press {
    return (
      (this.ui.selected === id ? this.ui.press : null) ?? f.watchers.find((w) => w.id === id)?.press ?? 'ask'
    );
  }

  /** The screen, as text. */
  screen(): string[] {
    const f = this.frame();
    const L: string[] = [];
    const slowed = f.slowed ? ` · ${slowedWords(f)}` : '';
    L.push(`== The Night Watch · ${headerLine(f)}${slowed}`);
    if (f.phase !== 'goal') {
      const eased = easedTo(f, this.pacer.speed);
      const bar = SPEEDS.map((s) => {
        const mark = this.pacer.speed === s.id ? `[${s.label}]` : s.label;
        return eased === s.id ? `${mark}<now` : mark;
      }).join(' ');
      L.push(`speed: ${bar}${RUNNING.has(f.phase) ? '' : ' (the clock stands while you read this page)'}`);
    }
    if (this.ui.menu) return [...L, ...menu(f)];
    L.push(...mapLines(f));
    if (SEASON_PHASES.has(f.phase) || f.phase === 'fair') {
      const lines = f.chronicle
        .filter((l) => l.year === f.year && l.season === f.season)
        .slice(-5)
        .reverse();
      if (lines.length) L.push('chronicle strip (newest first):', ...lines.map((l) => `  ~ ${l.text}`));
    } else L.push(...ticker(f));
    L.push('');
    L.push(...this.panel(f));
    return L;
  }

  private panel(f: Frame): string[] {
    switch (f.phase) {
      case 'goal':
        return goalPage(f);
      case 'dusk':
        return this.duskPanel(f);
      case 'night':
        return this.nightPanel(f);
      case 'dawn':
        return dawnPanel(f);
      case 'fair':
        return fairPage(f);
      case 'thaw':
        return thawPage(f);
      case 'closed':
        return closedPage(f);
      case 'fallen':
        return fallenPage(f);
      default:
        return seasonPanel(f, this.ui.people);
    }
  }

  private duskPanel(f: Frame): string[] {
    const L: string[] = [`[warning] ${f.warning}`];
    L.push(...winterNote(f));
    if (f.day && f.day.lines.length > 0) {
      const open = f.day.lines.some((l) => l.came);
      L.push(`Today${open ? ':' : ' (folded; shown here)'}`);
      for (const l of f.day.lines) L.push(`  - ${l.text}`);
    }
    const sel = this.ui.selected ? f.watchers.find((w) => w.id === this.ui.selected) : undefined;
    const posts = f.sections.reduce((n, s) => n + s.posts.length, 0);
    L.push(
      sel
        ? `Where should ${sel.name} stand? Tap a post on the wall or a stretch below.`
        : `Tap a watcher, then a post. ${f.watchers.length < posts ? 'There are more posts than watchers: some wall stands empty.' : 'Every post can be held.'}`,
    );
    if (sel) {
      const reads = f.postingReads?.[sel.id];
      const press = this.pressFor(f, sel.id);
      L.push(`  How hard do you press ${sel.name}?${reads ? '' : ' Pick a post to read them.'}`);
      for (const p of ['ask', 'urge', 'insist'] as Press[])
        L.push(`   ${press === p ? '(*)' : '( )'} ${W.PRESS_WORDS[p].verb}${reads ? ` — ${reads[p]}` : ''}`);
      L.push(
        `  Stretches: ${SECTIONS.map((s) => {
          const at = freePost(f, s.id, sel.id);
          const here = sel.posted !== null && postSection(sel.posted) === s.id;
          return `${here ? '*' : ''}${s.name}${s.id === f.warned ? ' · tracks' : ''}${at ? '' : ' (full)'}`;
        }).join(' | ')} | Off the wall`,
      );
    }
    L.push('Roster:');
    for (const w of f.watchers) {
      L.push(`  ${this.ui.selected === w.id ? '>' : '-'} ${w.name} — ${w.note}`);
      L.push(`      ${whereWords(f, w)}`);
      if (w.impressions.length) L.push(`      ${impressions(w.impressions)}`);
    }
    L.push(
      `Start the lantern at: ${SECTIONS.map((s, i) => `${f.lantern.target === i ? '*' : ''}${s.name}${f.sections[i]?.fallen ? ' · fallen' : ''}`).join(' | ')}`,
    );
    L.push('[Begin the watch]  The sun is going down; the watch begins at nightfall on its own.');
    return L;
  }

  private nightPanel(f: Frame): string[] {
    const L: string[] = [];
    const m = f.moment;
    if (m && m.id !== this.ui.letBe) {
      L.push('*** A moment on the wall ***', m.text);
      m.options.forEach((o, i) => {
        L.push(`  ${i + 1}. ${o.label}${o.read ? ` — ${o.read}` : ''}`);
      });
      L.push('  (letbe) …or say nothing: they decide alone');
    }
    L.push(
      `${f.lit === null ? 'The lantern is on its way' : 'The lantern'} · choose a stretch, or tap the wall: ${SECTIONS.map((s, i) => `${f.lantern.target === i ? '*' : ''}${s.name}${f.sections[i]?.fallen ? ' · fallen' : ''}`).join(' | ')}`,
    );
    const canRing = !(f.rope.snapped || f.bellSwinging);
    L.push(
      `[${f.bellSwinging ? 'The bell is still swinging' : 'Ring the bell'}${canRing ? '' : ' (disabled)'}] ${f.bellRead ?? ''}`,
    );
    L.push(`  rope ${rope(f.rope.wear, f.rope.snapped)} ${W.ropeWords(f.rope.wear, f.rope.snapped)}`);
    const off = f.watchers.filter((w) => w.post === null);
    L.push(
      off.length > 0
        ? `Off the wall: ${off.map((w) => `${w.name} (${W.awayWords(w.place, f.phase)})`).join(', ')}. Posts are set at dusk. Tonight you have the lantern, the bell, and what comes to you.`
        : 'Everyone is on the wall.',
    );
    L.push(
      `The granary ${sacks(f.grain, Math.max(0, f.grainAtDusk - f.grain), f.need)} (${f.grain < f.grainAtDusk ? 'Sacks have been taken tonight' : 'No sacks taken tonight'}; the mark is what the village eats until the harvest)`,
    );
    return L;
  }
}

function freePost(f: Frame, section: string, who: string): string | null {
  const sec = f.sections.find((s) => s.id === section);
  if (!sec) return null;
  const mine = sec.posts.find((p) => p.posted === who);
  if (mine) return mine.id;
  return sec.posts.find((p) => p.posted === null)?.id ?? null;
}

function headerLine(f: Frame): string {
  if (f.phase === 'goal') return 'Before the first night';
  if (WINTER_PHASES.has(f.phase)) return `${f.date} · ${W.hourWords(f.clock, f.phase)}`;
  return f.date;
}

const slowedWords = W.slowedWords;

function easedTo(f: Frame, chosen: Speed): Speed | null {
  if (!f.slowed || f.rate <= 0) return null;
  const season = SEASON_PHASES.has(f.phase);
  const table = season ? DAY_RATE : RATE;
  const pace = season ? f.rate / 1440 : f.rate;
  const at = SPEEDS.find((s) => table[s.id] >= pace - 1e-9)?.id ?? 'tactical';
  return at === chosen ? null : at;
}

/** Sacks as drawn: ● a sack, ○ a sack taken (faded), | the mark of what the village eats; rows of ten. */
function sacks(have: number, lost: number, need?: number): string {
  const total = Math.max(0, have) + Math.max(0, lost, (need ?? 0) - Math.max(0, have));
  let out = '';
  for (let n = 0; n < total; n++) {
    if (n > 0 && n % 10 === 0) out += ' ';
    out += n < have ? '●' : '○';
    if (need && n === need - 1) out += '|';
  }
  return out || '(empty)';
}

function rope(wear: number, snapped: boolean): string {
  const left = snapped ? 0 : Math.max(1, Math.round(6 * (1 - wear)));
  return `${'≡'.repeat(left)}${'~'.repeat(6 - left)}`;
}

function pips(left: number, of: number): string {
  return `${'◆'.repeat(Math.max(0, left))}${'◇'.repeat(Math.max(0, of - left))}`;
}

/**
 * Impressions are drawn as solid as the Keeper is sure: (faint) and (unsure) mark the weaker ones. A greyed note
 * with no sureness ("from last winter") says how old the reads are; it prints in brackets.
 */
function impressions(list: { text: string; sure: number }[]): string {
  return list
    .map((im) =>
      im.sure <= 0
        ? `[${im.text}]`
        : im.sure < 0.35
          ? `${im.text} (faint)`
          : im.sure < 0.65
            ? `${im.text} (unsure)`
            : im.text,
    )
    .join('; ');
}

function whereWords(f: Frame, w: Frame['watchers'][number]): string {
  const name = (id: string) => SECTIONS.find((s) => s.id === id)?.name ?? '';
  const posted = w.posted
    ? `${name(postSection(w.posted))}, ${W.PRESS_WORDS[w.press].done}`
    : f.phase === 'dusk'
      ? 'not posted · will find a spot on the wall'
      : 'not posted';
  if (!w.posted && f.phase === 'dusk' && !w.post) return posted;
  const stands = w.post ? `on the ${name(postSection(w.post))}` : W.awayWords(w.place, f.phase);
  if (w.post && w.post === w.posted) return `${posted} · there now`;
  return `${posted} · ${stands}`;
}

const band = (pos: number) => (pos < 0.4 ? 'far out' : pos < 0.75 ? 'midway' : 'close to the wall');

/** The map, in words: the wall's stretches, who stands where, and what the light shows. */
function mapLines(f: Frame): string[] {
  const L: string[] = [];
  const winter = WINTER_PHASES.has(f.phase) || f.phase === 'goal';
  if (!winter) {
    const v = f.villagers;
    L.push(
      `map: daylight; the wall stands empty; ${f.homes} hut${f.homes === 1 ? '' : 's'}${f.ruins ? `, ${f.ruins} burned out` : ''}; ${v.length} figures about the village${f.seed ? '; the fields have fuller rows' : ''}${f.bigBell ? '; the big bell hangs at the Gate' : ''}`,
    );
    return L;
  }
  for (const sec of f.sections) {
    const lit = f.phase === 'night' && sec.id === f.lit;
    const tags = [
      lit ? 'LIT' : f.phase === 'night' ? 'dark' : '',
      sec.fallen ? 'fallen, a gap' : '',
      sec.raised ? 'raised, timber walk' : '',
    ]
      .filter(Boolean)
      .join(', ');
    const posts = sec.posts.map((p) => {
      if (!p.watcher) {
        if (!p.posted) return '( )';
        const nm = f.watchers.find((x) => x.id === p.posted)?.name ?? '';
        return `(${nm}, faint${p.empty ? `: ${p.empty.why}` : ''})`;
      }
      return p.watchers
        .map((id) => {
          const w = f.watchers.find((x) => x.id === id);
          if (!w) return '?';
          const seen = f.phase !== 'night' || w.lit;
          if (!seen) return `${w.name}: a figure${w.commanded ? ', ringed by the bell' : ''}`;
          const bits: string[] = [];
          if (f.phase === 'night' && w.posture !== 'stand' && w.posture !== 'figure')
            bits.push(POSTURE_WORDS[w.posture] ?? w.posture);
          if (w.signs?.tired) bits.push('slumped');
          if (w.signs?.afraid) bits.push('hunched, looking to the steps');
          if (w.signs?.hurt) bits.push('bandaged');
          if (w.limp) bits.push('a stick');
          if (w.age === 'old') bits.push('stooped');
          if (w.throwing) bits.push(w.throwing === 'hit' ? 'throws, hits' : 'throws, misses');
          if (w.commanded) bits.push('ringed by the bell');
          return `${w.name}${bits.length ? ` (${bits.join(', ')})` : ''}`;
        })
        .join(' + ');
    });
    const things: string[] = [];
    for (const t of f.seen.filter((x) => x.section === sec.id)) {
      const k = t.kind === 'wolf' ? 'a wolf' : 'a thief';
      if (t.state === 'coming') things.push(`${k} coming, ${band(t.pos)}${t.hurt ? ', hurt' : ''}`);
      else if (t.state === 'foot')
        things.push(
          `${k} at the foot, ${t.climb < 0.34 ? 'starting up' : t.climb < 0.67 ? 'halfway up' : 'near the top'}`,
        );
      else if (t.state === 'fled' && t.age < 8) things.push(`${k} running off`);
      else if (t.state === 'in' && t.age < 6)
        things.push(
          `${k} over the wall${t.kind === 'thief' ? (t.took ? ', with a sack' : ', empty-handed') : ''}`,
        );
    }
    for (const m of f.motion.filter((x) => x.section === sec.id))
      things.push(m.foot ? 'a sound at the foot of the wall' : `grass moving, ${band(m.pos)}`);
    const tracks = f.phase === 'dusk' && sec.id === f.warned ? ' [tracks]' : '';
    L.push(
      `  ${sec.name}${tracks}${tags ? ` [${tags}]` : ''}: ${posts.join(' · ') || '(no posts)'}${things.length ? ` — ${things.join('; ')}` : ''}`,
    );
  }
  if (f.phase === 'night') {
    const hall = f.watchers.filter((w) => w.post === null && w.place === 'hall').length;
    const home = f.watchers.filter((w) => w.post === null && w.place === 'home').length;
    if (hall || home)
      L.push(
        `  below the wall: ${hall ? `${hall} dim figure(s) by the hall` : ''}${hall && home ? ', ' : ''}${home ? `${home} by their homes` : ''}`,
      );
    L.push(
      `  the Keeper's lantern: by the ${SECTIONS[Math.round(f.lantern.x)]?.name ?? ''}${f.lit === null ? ', walking' : ''}`,
    );
  }
  return ['map:', ...L];
}

function ticker(f: Frame): string[] {
  if (f.phase === 'dusk') return [`ticker: ${f.warning}`];
  if (f.phase !== 'night') return [];
  const recent = f.alerts.slice(-3);
  if (recent.length === 0) return f.nightProgress < 0.1 ? ['ticker: The wall settles in for the night.'] : [];
  return ['ticker (what the Keeper hears):', ...recent.map((a) => `  ${a.slowed ? '!' : '·'} ${a.text}`)];
}

function goalPage(f: Frame): string[] {
  return [
    'The chronicle opens',
    '## Bring every soul and the granary to the thaw.',
    'You are the Keeper. At dusk the scout tells you what is coming; you post the watchers. At night you carry the lantern to one stretch of wall, and only there can you see what comes. The bell hangs over the Gate and its rope runs the length of the wall-walk, so you can pull it from anywhere: it wakes and calls back everyone who hears it, loudest near the Gate. Your own voice carries only from your lantern to the next stretch. Every pull wears the rope, and a snapped rope leaves the bell silent.',
    'The watchers are people. Tired, frightened or worried for home, they may not stand where you put them. Ask leaves it to them; urge leans on them; insist can get them there under protest, and wins you no goodwill when it goes well.',
    `The granary is full ${sacks(f.grain, 0)}`,
    '[Go up to the wall] (start)',
  ];
}

function winterNote(f: Frame): string[] {
  const w = f.winter;
  if (!w) return [];
  const L: string[] = [];
  if (f.grainWarning) L.push(`! ${f.grainWarning}`);
  if (w.night <= 1 && w.why) L.push(w.why);
  if (f.year === 1 && w.night === 1) L.push('More hands will come up to the wall over the first nights.');
  if (w.night <= 2) {
    L.push(
      `The granary must feed ${f.souls.charAt(0).toLowerCase() + f.souls.slice(1)} from the thaw to the harvest. Short of the mark, the spring is hungry and households leave; sacks past it are spare for the fair.`,
    );
    L.push(`  ${sacks(f.grain, 0, f.need)}`);
  }
  if (w.question) L.push(`This winter: ${w.question.text}`);
  return L;
}

function dawnPanel(f: Frame): string[] {
  const d = f.dawn;
  if (!d) return [];
  const last = f.winter !== null && f.winter.night >= f.winter.nights;
  const L = [
    `Dawn · ${f.date}`,
    `## ${d.grainAfter === d.grainBefore && !d.crossed ? 'The wall held.' : 'The wall was crossed.'}`,
  ];
  if (d.scout) L.push(d.scout);
  if (f.grainWarning) L.push(`! ${f.grainWarning}`);
  for (const l of d.lines) L.push(`  - ${l.text}`);
  for (const v of d.voices) L.push(`  ${v.text} — ${f.watchers.find((w) => w.id === v.who)?.name ?? ''}`);
  L.push(
    `  ${sacks(d.grainAfter, d.grainBefore - d.grainAfter, f.need)} (${d.grainAfter === d.grainBefore ? 'No sacks lost' : 'Sacks lost in the night, drawn faded'}; the mark is what the village eats until the harvest)`,
  );
  if (d.ropeSnapped) L.push('Someone will have to splice the bell rope today; it will not be new.');
  const t = f.talks;
  if (t) {
    L.push(`Before they sleep ${pips(t.left, Math.max(TALKS_PER_DAY, t.left))}`);
    L.push(`  ${W.daylightWords(t.left)} Each talk costs them a little sleep.`);
    for (const x of t.said) L.push(`  ${x.text} — ${x.name}`);
    if (t.left > 0)
      for (const id of t.can) {
        const w = f.watchers.find((x) => x.id === id);
        const topics = (t.topics[id] ?? ['night', 'body']).slice(0, 2);
        L.push(`  ${w?.name ?? id}: ${topics.map((tp, i) => `${i + 1}. ${askWords(tp, w)}`).join('  ')}`);
      }
  }
  L.push(`[${last ? 'Into the thaw' : 'On to dusk'}] (dusk)`);
  if (last) L.push('That was the last night watched this winter; the rest goes by routine.');
  return L;
}

function askWords(topic: string, w: Frame['watchers'][number] | undefined): string {
  if (topic === 'body')
    return w?.limp ? 'How is the leg?' : w?.age === 'old' ? 'How are the knees?' : 'How are you holding up?';
  if (topic === 'home') return 'How are things at home?';
  if (topic === 'gate') return 'Would you keep the Gate one day?';
  return 'Tell me about last night';
}

function seasonPanel(f: Frame, people: boolean): string[] {
  const L: string[] = [];
  if (f.card) {
    L.push('*** A matter for the Keeper ***', f.card.text, `  ${f.card.read}`);
    f.card.options.forEach((o, i) => {
      L.push(`  ${i + 1}. ${o.label}`);
    });
    L.push(
      f.card.kind === 'proposal'
        ? '  …or say nothing; they will decide alone. The days slow while you think.'
        : f.card.kind === 'practise'
          ? '  Without an answer, no lessons are arranged this summer. The days slow while you think.'
          : '  You can leave the family to themselves. The days slow while you think.',
    );
  }
  L.push(`Volume ${f.volume.numeral} · ${f.volume.title}`, `## ${f.date}`, f.volume.question);
  if (f.year <= 2)
    L.push(
      'The days run on their own at Seasons pace, slowing for news and for a matter for you. Choose a slower speed in the top bar to watch the village go about its days.',
    );
  L.push(`${f.souls}.`);
  L.push(
    `The granary · up to the mark, what the next thaw takes to feed everyone ${sacks(f.grain, 0, f.need)}`,
  );
  const watchers = f.villagers.filter((v) => v.watcher).length;
  L.push(
    `The village · ${f.villagers.length === 1 ? 'one soul' : 'its people'}, ${watchers === 0 ? 'none at the wall' : watchers === 1 ? 'one at the wall' : 'some at the wall'}${people ? '' : ' (folded: "people" opens it)'}`,
  );
  if (people)
    for (const v of f.villagers) {
      const facts = [
        v.ageWords,
        v.spouse ? `married to ${v.spouse}` : null,
        v.family,
        W.rootsWords(v.bornHere, v.gen),
        v.limp ? 'walks with a stick' : null,
      ].filter(Boolean);
      L.push(`  - ${v.name}${v.watcher ? ' [stands the wall]' : ''} — ${facts.join(' · ')}`);
      if (v.impressions.length) L.push(`      ${impressions(v.impressions)}`);
    }
  return L;
}

function fairPage(f: Frame): string[] {
  const fair = f.fair;
  if (!fair) return [];
  const L = [
    f.date,
    '## The fair',
    'Traders and families come up the valley. What you take here is paid from the granary and cannot be undone.',
    fair.picksLeft <= 0
      ? W.picksWords(0)
      : 'Take as many as the granary can spare: the winter still has to be eaten through.',
    `The granary ${sacks(f.grain, 0)}`,
  ];
  fair.offers.forEach((o, i) => {
    L.push(`  ${i + 1}. ${o.label} — ${o.text}`);
    if (!o.taken && o.affordable && o.after < f.grain)
      L.push(`     The granary after it ${sacks(o.after, f.grain - o.after)}`);
    if (o.taken) L.push('     Taken. It stands.');
    else if (!o.affordable)
      L.push(
        `     (cannot take) ${o.named ? 'You have named an heir.' : fair.picksLeft <= 0 ? 'No more choices this year.' : 'The granary cannot spare it.'}`,
      );
    else L.push('     [Take it, for good]');
  });
  L.push('[Leave the fair] (leave)');
  return L;
}

function thawPage(f: Frame): string[] {
  const t = f.thaw;
  if (!t) return [];
  const q = f.winter?.question ?? null;
  const lines = t.lines.filter((l) => !/^(Not done|Done): /.test(l));
  const L = [f.date, '## The thaw', t.winter, `  ${sacks(f.grain, 0)} (what the granary holds into spring)`];
  if (q) L.push(`This winter's question: ${q.text} — ${W.metWords(q.met)}`);
  if (lines.length) L.push('Written this winter:', ...lines.slice(-12).map((l) => `  - ${l}`));
  else L.push('The wall and the houses stand as they did.');
  if (f.leaves.length) {
    L.push('Leaves at the back of the volume:');
    for (const l of f.leaves) L.push(`  ${l.filled ? `"${l.filled}"` : '(blank)'} — ${l.condition}`);
  }
  L.push(`[${f.volume.epilogue !== null ? 'Turn to the volume’s last page' : 'Into the spring'}] (continue)`);
  return L;
}

function epilogue(f: Frame): string[] {
  return (f.volume.epilogue ?? []).map((e) => `  ${e.name}: ${W.epilogueText(e.text)}`);
}

function closedPage(f: Frame): string[] {
  const v = f.volume;
  return [
    `Here ends volume ${v.numeral}`,
    `## ${v.title}`,
    v.question,
    v.end ?? '',
    '❦',
    ...epilogue(f),
    'The village goes on. The next volume asks its own question of the living.',
    '[Open the next volume] (continue)',
    'Playtesting? Send the team this volume as it closed: it replays your whole chronicle. (export)',
  ];
}

function fallenPage(f: Frame): string[] {
  return [
    `The chronicle closes · ${f.date}`,
    `## ${f.volume.end ?? 'The granary is empty.'}`,
    `  ${sacks(f.grain, 0)}`,
    '❦',
    ...epilogue(f),
    'The village cannot stay. The chronicle closes this volume.',
    'Playtesting? Send the team the chronicle before you begin anew: it replays the whole run. (export)',
    '[Begin a new village] (new <seed>)',
  ];
}

function menu(f: Frame): string[] {
  const L = [
    '## The chronicle',
    'The clock stands still while the chronicle is open. (show keeps it open; a game command closes it)',
  ];
  L.push('The shelf:');
  const seen = new Set<number>();
  for (const v of [...f.shelf, f.volume]) {
    if (seen.has(v.n)) continue;
    seen.add(v.n);
    L.push(`  ${v.numeral}. ${v.title} — ${v.question} — ${v.end ?? 'Still being written.'}`);
  }
  L.push('Lately written:');
  const lines = f.chronicle.slice().reverse();
  if (lines.length === 0) L.push('  Nothing is written yet.');
  for (const l of lines) L.push(`  ${l.season}, the ${W.ordinalWord(l.year)} year: ${l.text}`);
  L.push('Playtest: [Copy the playtest] [Save it as a file] (export)   [Begin a new village…] (new <seed>)');
  return L;
}

// ---- command line ----

const COMMAND_WORDS = new Set(
  'new show help quiet start speed wait wait! select press post lantern begin bell answer letbe talk dusk card people take leave continue chronicle export'.split(
    ' ',
  ),
);

if (import.meta.url === new URL(process.argv[1] ?? '', 'file://').href) {
  const args = process.argv.slice(2);
  let file: string | null = null;
  const cmds: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? '';
    if (a === '--state') file = args[++i] ?? null;
    else
      for (const part of a.split(';')) {
        // An unquoted argument (`new 11`, `post kian east`) is not a command word: it joins the command before it.
        const word = part.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
        if (cmds.length && word && !COMMAND_WORDS.has(word)) cmds[cmds.length - 1] += ` ${part.trim()}`;
        else cmds.push(part);
      }
  }
  let h: Harness | null = null;
  const firstNew = cmds.findIndex((c) => c.trim().startsWith('new'));
  if (file && firstNew !== 0) {
    try {
      h = Harness.fromText(readFileSync(file, 'utf8'));
    } catch {
      h = null;
    }
  }
  let quiet = false;
  const log: string[] = [];
  for (const c of cmds) {
    const t = c.trim();
    if (t === 'quiet') quiet = true;
    if (t.startsWith('new')) {
      const seed = Number(t.split(/\s+/)[1] ?? 1) || 1;
      h = Harness.fresh(seed);
      log.push(`(a new village, seed ${seed})`);
      continue;
    }
    if (t === 'help' && !h) {
      log.push(HELP);
      quiet = true;
      continue;
    }
    if (!h) {
      log.push('(no village yet: start with "new <seed>", and pass --state <file> to keep it between calls)');
      quiet = true;
      break;
    }
    h.exec(t);
    log.push(...h.out.splice(0));
  }
  if (log.length) console.log(log.join('\n'));
  if (h && !quiet) console.log(h.screen().join('\n'));
  if (h && file) writeFileSync(file, h.toText());
}
