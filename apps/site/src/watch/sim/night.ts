/**
 * The Night Watch rules for phase G3-1 (spec §10): an abstract lane night without HF.
 *
 * Scope. Each wall section is a lane; threats are tokens that walk from the treeline to the foot of the wall,
 * wait there while they climb, and take grain if nobody drives them off. Each sim minute resolves as seeded
 * rolls: every posted watcher throws at the nearest token they can see, with a chance from their fixed aim,
 * the light and the bell. The lantern is the Keeper's position: walking it costs minutes, and only the section
 * it stands at is lit (watchers there see far and hit more; the Keeper sees what is there). Dark sections are
 * seen late and show the Keeper only motion. The scout's warning at dusk names the lead threat's approach and
 * is right about each wave three times in four (every wave on the first night). The bell (a placeholder until HF `command` in G3-2) rouses the
 * whole wall for a while: threats slow and throws land more often. Each pull wears the rope; a worn rope snaps
 * and stays snapped until dawn, when it is partly mended.
 *
 * Not covered. Watchers are placeholders: fixed stats, they always obey, never tire, flee, bond or get hurt.
 * No moments with cards, no talks, no seasons, no fair. A volume ends when the granary is empty at dawn.
 */
import {
  BELL_ROUSE_MIN,
  BELL_WEAR_BASE,
  BELL_WEAR_SPREAD,
  DARK_AIM,
  DARK_REACH,
  DARK_SIGHT_BONUS,
  DAY,
  DUSK_START,
  FOOT_AIM,
  LANTERN_STEP_MIN,
  LIT_REACH,
  MOTION_REACH,
  NIGHT_LENGTH,
  NIGHTFALL,
  POST_IDS,
  type PostId,
  postSection,
  ROPE_DAWN_MEND,
  ROUSED_AIM,
  ROUSED_SPEED,
  SCOUT_TRUE,
  SECTION_IDS,
  type SectionId,
  SLOW_WINDOW,
  sectionDef,
  THREATS,
  type ThreatKind,
  WATCHER_IDS,
  WATCHERS,
  type WatcherId,
  watcherDef,
} from './config.ts';
import {
  type Alert,
  createState,
  type DawnPage,
  emptyTally,
  nextRandom,
  pick,
  type Token,
  type WatchState,
} from './state.ts';

export type Input =
  | { k: 'start' }
  | { k: 'post'; watcher: WatcherId; post: PostId | null }
  | { k: 'begin' }
  | { k: 'lantern'; section: SectionId }
  | { k: 'bell' }
  | { k: 'toDusk' };

const ALERT_KEEP = 14;
/** Fled and breached tokens stay drawn this many minutes. */
const TOKEN_LINGER = 10;

export function newGame(seed: number): WatchState {
  const s = createState(seed);
  planNight(s);
  return s;
}

/** True while the clock runs (dusk and night). */
export function clockRuns(s: WatchState): boolean {
  return s.phase === 'dusk' || s.phase === 'night';
}

export function litSection(s: WatchState): SectionId | null {
  if (s.lantern.x !== s.lantern.target) return null;
  return SECTION_IDS[s.lantern.x] ?? null;
}

export function nightEnd(s: WatchState): number {
  return s.nightStart + NIGHT_LENGTH;
}

function plural(kind: ThreatKind, n: number): string {
  if (kind === 'wolf') return n === 1 ? 'a wolf' : 'wolves';
  return n === 1 ? 'a thief' : 'thieves';
}

function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Draws the night at dusk: the lead threat, the scout's line and the waves. */
export function planNight(s: WatchState): void {
  const n = s.night;
  const previous = s.history.at(-1)?.lead;
  s.lead =
    n === 1 ? 'wolf' : nextRandom(s) < 0.65 ? (previous === 'wolf' ? 'thief' : 'wolf') : (previous ?? 'wolf');
  s.warned = pick(s, SECTION_IDS);
  const others = SECTION_IDS.filter((id) => id !== s.warned);
  const def = sectionDef(s.warned);
  s.warning =
    s.lead === 'wolf'
      ? `The scout found pack tracks ${def.approach}.`
      : `The scout saw strangers ${def.approach}.`;
  const spawns: WatchState['spawns'] = [];
  const waveSize = (): number =>
    s.lead === 'wolf' ? 3 + Math.floor(n / 3) + (nextRandom(s) < 0.5 ? 1 : 0) : 2 + Math.floor(n / 4);
  const waves: [number, number][] = [
    [80, 220],
    [300, 540],
  ];
  for (const [lo, hi] of waves) {
    const at = s.nightStart + lo + Math.floor(nextRandom(s) * (hi - lo));
    // The first night is gentle (spec §3, year 1 authored): the scout is right about every wave.
    const right = nextRandom(s) < (n === 1 ? 1 : SCOUT_TRUE);
    const section = right ? s.warned : pick(s, others);
    const count = waveSize();
    for (let i = 0; i < count; i++) {
      spawns.push({ at: at + i * (1 + Math.floor(nextRandom(s) * 3)), section, kind: s.lead, count: 1 });
    }
  }
  // A stray, anywhere: the warning is never the whole night.
  if (nextRandom(s) < 0.5) {
    const kind: ThreatKind = nextRandom(s) < 0.5 ? 'wolf' : 'thief';
    spawns.push({
      at: s.nightStart + 60 + Math.floor(nextRandom(s) * 560),
      section: pick(s, SECTION_IDS),
      kind,
      count: 1,
    });
  }
  spawns.sort((a, b) => a.at - b.at);
  s.spawns = spawns;
}

function alert(s: WatchState, a: Omit<Alert, 'minute'>): void {
  s.alerts.push({ ...a, minute: s.minute });
  if (s.alerts.length > ALERT_KEEP) s.alerts.splice(0, s.alerts.length - ALERT_KEEP);
  if (a.slowed) s.slowUntil = Math.max(s.slowUntil, s.minute + SLOW_WINDOW);
}

function postedIn(s: WatchState, section: SectionId): WatcherId[] {
  return WATCHER_IDS.filter((w) => {
    const p = s.posts[w];
    return p !== null && postSection(p) === section;
  });
}

function reachFor(lit: boolean, sight: number, kind: ThreatKind): number {
  if (lit) return LIT_REACH;
  return DARK_REACH - sight * DARK_SIGHT_BONUS + THREATS[kind].stealth;
}

function enterNight(s: WatchState): void {
  s.phase = 'night';
  s.minute = s.nightStart;
  s.tally = emptyTally(s.grain);
}

function enterDawn(s: WatchState): void {
  const t = s.tally;
  const lines: DawnPage['lines'] = [];
  for (const id of SECTION_IDS) {
    const name = sectionDef(id).name;
    const where = id === 'gate' ? 'at the Gate' : `at the ${name.toLowerCase()}`;
    const got = t.got[id];
    const driven = t.driven[id];
    const heroes = [...new Set(t.heroes[id])].map((w) => watcherDef(w).name);
    const posted = postedIn(s, id).map((w) => watcherDef(w).name);
    const parts: string[] = [];
    for (const kind of ['wolf', 'thief'] as const) {
      const g = got[kind] ?? 0;
      if (g > 0)
        parts.push(
          kind === 'wolf'
            ? `${capital(plural(kind, g))} got over the wall ${where} and tore into the store.`
            : `${capital(plural(kind, g))} got over ${where} and carried sacks off.`,
        );
    }
    for (const kind of ['wolf', 'thief'] as const) {
      const d = driven[kind] ?? 0;
      if (d > 0 && heroes.length > 0)
        parts.push(`${heroes.join(' and ')} drove off ${plural(kind, d)} ${where}.`);
    }
    if (parts.length === 0) {
      parts.push(
        posted.length === 0 ? `Nobody stood ${where.replace('at ', '')}. Nothing came.` : `Quiet ${where}.`,
      );
    }
    lines.push({ section: id, text: parts.join(' ') });
  }
  s.dawn = {
    night: s.night,
    lines,
    grainBefore: t.grainAtDusk,
    grainAfter: s.grain,
    ropeSnapped: s.rope.snapped,
  };
  s.history.push({ night: s.night, warned: s.warned, lead: s.lead, lost: t.grainAtDusk - s.grain });
  s.tokens = [];
  s.throws = [];
  s.phase = s.grain <= 0 ? 'fallen' : 'dawn';
}

/** Applies one Keeper input. Returns false (and changes nothing) when it does not apply in this phase. */
export function applyInput(s: WatchState, input: Input): boolean {
  switch (input.k) {
    case 'start':
      if (s.phase !== 'goal') return false;
      s.phase = 'dusk';
      return true;
    case 'post': {
      if (s.phase !== 'dusk' && s.phase !== 'goal') return false;
      if (!WATCHER_IDS.includes(input.watcher)) return false;
      if (input.post !== null) {
        if (!POST_IDS.includes(input.post)) return false;
        // A post holds one watcher: whoever stood there steps down.
        for (const w of WATCHER_IDS) if (s.posts[w] === input.post) s.posts[w] = null;
      }
      s.posts[input.watcher] = input.post;
      return true;
    }
    case 'begin':
      if (s.phase !== 'dusk') return false;
      enterNight(s);
      return true;
    case 'lantern': {
      const target = SECTION_IDS.indexOf(input.section);
      if (target < 0) return false;
      if (s.phase === 'dusk' || s.phase === 'goal') {
        s.lantern = { x: target, target };
        return true;
      }
      if (s.phase !== 'night' || s.lantern.target === target) return false;
      s.lantern = { x: s.lantern.x, target };
      return true;
    }
    case 'bell': {
      if (s.phase !== 'night' || s.rope.snapped) return false;
      s.rousedUntil = s.minute + BELL_ROUSE_MIN;
      s.tally.bellRung += 1;
      s.rope.wear += BELL_WEAR_BASE + BELL_WEAR_SPREAD * nextRandom(s);
      const at = litSection(s) ?? 'gate';
      if (s.rope.wear >= 1) {
        s.rope = { wear: 1, snapped: true };
        alert(s, {
          section: at,
          kind: 'rope',
          text: 'The bell rope snapped. No more bell tonight.',
          slowed: true,
        });
      } else {
        alert(s, { section: at, kind: 'bell', text: 'The bell rings. The whole wall is up.', slowed: false });
      }
      return true;
    }
    case 'toDusk': {
      if (s.phase !== 'dawn') return false;
      const day = Math.floor(s.minute / DAY);
      s.minute = day * DAY + DUSK_START;
      s.nightStart = day * DAY + NIGHTFALL;
      s.night += 1;
      s.phase = 'dusk';
      s.dawn = null;
      s.alerts = [];
      s.slowUntil = -1;
      s.rousedUntil = -1;
      s.called = { west: false, gate: false, mill: false, east: false };
      s.rope = s.rope.snapped
        ? { wear: 1 - ROPE_DAWN_MEND, snapped: false }
        : { wear: Math.max(0, s.rope.wear - ROPE_DAWN_MEND), snapped: false };
      planNight(s);
      return true;
    }
  }
}

/** Advances the clock one sim minute. Does nothing unless the clock runs. */
export function stepMinute(s: WatchState): void {
  if (s.phase === 'dusk') {
    s.minute += 1;
    if (s.minute >= s.nightStart) enterNight(s);
    return;
  }
  if (s.phase !== 'night') return;
  const m = s.minute;
  s.throws = [];

  // The Keeper walks.
  if (s.lantern.x !== s.lantern.target) {
    const step = 1 / LANTERN_STEP_MIN;
    const dx = s.lantern.target - s.lantern.x;
    s.lantern.x = Math.abs(dx) <= step + 1e-9 ? s.lantern.target : s.lantern.x + Math.sign(dx) * step;
  }
  const lit = litSection(s);
  const roused = m < s.rousedUntil;

  // Threats leave the treeline.
  while (s.spawns.length > 0 && (s.spawns[0]?.at ?? Infinity) <= m) {
    const sp = s.spawns.shift();
    if (!sp) break;
    const def = THREATS[sp.kind];
    s.tokens.push({
      id: s.nextTokenId++,
      kind: sp.kind,
      section: sp.section,
      pos: 0,
      hp: def.hp,
      climb: 0,
      state: 'coming',
      since: m,
    });
  }

  // Tokens advance, wait at the foot, get in.
  for (const t of s.tokens) {
    const def = THREATS[t.kind];
    if (t.state === 'coming') {
      const before = t.pos;
      t.pos = Math.min(1, t.pos + def.speed * (roused ? ROUSED_SPEED : 1) * (0.8 + 0.4 * nextRandom(s)));
      if (before < MOTION_REACH && t.pos >= MOTION_REACH && !s.called[t.section]) {
        s.called[t.section] = true;
        const where = sectionDef(t.section).approach;
        alert(
          s,
          t.section === lit
            ? {
                section: t.section,
                kind: 'sighted',
                text: `${capital(plural(t.kind, 2))} ${where}.`,
                slowed: true,
              }
            : { section: t.section, kind: 'motion', text: `Movement in the dark ${where}.`, slowed: true },
        );
      }
      if (t.pos >= 1) {
        t.state = 'foot';
        t.since = m;
        const recent = s.alerts.some(
          (a) => a.kind === 'foot' && a.section === t.section && m - a.minute < 10,
        );
        if (!recent) {
          const name = sectionDef(t.section).name.toLowerCase();
          alert(s, {
            section: t.section,
            kind: 'foot',
            text:
              t.section === lit
                ? `${capital(plural(t.kind, 1))} at the foot of the ${name}.`
                : `Something at the foot of the ${name}.`,
            slowed: true,
          });
        }
      }
    } else if (t.state === 'foot') {
      t.climb += 1;
      if (t.climb >= def.climb) {
        t.state = 'in';
        t.since = m;
        const took = Math.min(s.grain, def.takes);
        s.grain -= took;
        const got = s.tally.got[t.section];
        got[t.kind] = (got[t.kind] ?? 0) + 1;
        const name = sectionDef(t.section).name.toLowerCase();
        const told = s.alerts.some((a) => a.kind === 'in' && a.section === t.section && m - a.minute < 15);
        if (!told)
          alert(s, {
            section: t.section,
            kind: 'in',
            text:
              t.section === lit
                ? `${capital(plural(t.kind, 1))} got over the ${name}. Grain is gone.`
                : `Grain is gone: something got over the ${name}.`,
            slowed: true,
          });
      }
    }
  }

  // Watchers throw.
  for (const w of WATCHERS) {
    const post = s.posts[w.id];
    if (post === null) continue;
    const section = postSection(post);
    const isLit = section === lit;
    let target: Token | null = null;
    for (const t of s.tokens) {
      if (t.section !== section || (t.state !== 'coming' && t.state !== 'foot')) continue;
      if (t.pos < reachFor(isLit, w.sight, t.kind)) continue;
      if (!target || t.pos > target.pos || (t.pos === target.pos && t.climb > target.climb)) target = t;
    }
    if (!target) continue;
    const p =
      w.aim * (isLit ? 1 : DARK_AIM) * (target.state === 'foot' ? FOOT_AIM : 1) * (roused ? ROUSED_AIM : 1);
    const hit = nextRandom(s) < p;
    s.throws.push({ watcher: w.id, token: target.id, hit });
    if (!hit) continue;
    target.hp -= 1;
    if (target.hp <= 0) {
      target.state = 'fled';
      target.since = m;
      const d = s.tally.driven[section];
      d[target.kind] = (d[target.kind] ?? 0) + 1;
      s.tally.heroes[section].push(w.id);
      if (isLit)
        alert(s, {
          section,
          kind: 'driven',
          text: `${w.name} drove ${plural(target.kind, 1)} off ${section === 'gate' ? 'the gate road' : `the ${sectionDef(section).name.toLowerCase()}`}.`,
          slowed: false,
        });
    }
  }

  s.tokens = s.tokens.filter((t) => t.state === 'coming' || t.state === 'foot' || m - t.since < TOKEN_LINGER);
  s.minute += 1;
  if (s.minute >= nightEnd(s)) enterDawn(s);
}
