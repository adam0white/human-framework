/**
 * The winter director (G3-3, spec §3): from year 2 each winter is drawn from the village. A full granary draws
 * thieves, a thin wall draws wolves, a bad harvest sends hungry men up the valley; no two winters running share a
 * lead; a lead's second winter carries a twist (wolves learn the dark stretch, thieves come with a man inside);
 * one night is the peak; the scout can name two stretches without knowing which. Each winter asks one question from
 * the cast's life (a first winter on the wall, an old keeper on the Gate stair, or every soul to the thaw).
 *
 * Year 1 is authored (`night.ts` `planNight` keeps its G3-1/G3-2 rules for it). Not covered: weather, the dog
 * that barks, raids on the fields in summer.
 */
import {
  postSection,
  SCOUT_TRUE,
  SECTION_IDS,
  type SectionId,
  sectionDef,
  type ThreatKind,
} from './config.ts';
import { ageOf, living, RETIRE_AGE } from './life.ts';
import { presentIds } from './night.ts';
import { isWatcher, nameOf, personOf } from './people.ts';
import { nextRandom, pick, type Spawn, type WatchState, type WinterPlan, worldRng } from './state.ts';

const other = (k: ThreatKind): ThreatKind => (k === 'wolf' ? 'thief' : 'wolf');

/** Draws this winter (year ≥ 2). */
export function planWinter(s: WatchState): void {
  const r = worldRng(s, 'winter');
  const nights = 6 + Math.floor(nextRandom(r) * 3);
  const last = s.leads[s.year - 1];
  const watchers = presentIds(s).length;
  const thin = watchers / Math.max(1, s.openPosts.length) < 0.75;
  let lead: ThreatKind;
  let why: string;
  if (s.grain >= 24) {
    lead = 'thief';
    why = 'Word of a full granary has gone down the valley.';
  } else if (s.yearGrain.harvest > 0 && s.yearGrain.harvest < 12) {
    lead = 'thief';
    why = 'The harvest failed down the valley too; hungry men walk at night.';
  } else if (thin) {
    lead = 'wolf';
    why = 'Too few on the wall: the packs have found the dark stretches.';
  } else {
    lead = nextRandom(r) < 0.5 ? 'wolf' : 'thief';
    why =
      lead === 'wolf'
        ? 'A hard frost has driven the packs down early.'
        : 'Strangers were seen at the autumn fair.';
  }
  if (lead === last) {
    lead = other(lead);
    why =
      lead === 'wolf'
        ? 'The thieves have gone elsewhere; the packs are back.'
        : 'The packs have gone north; men have taken their place.';
  }
  const twist: WinterPlan['twist'] = s.leads.includes(lead) ? (lead === 'wolf' ? 'dark' : 'inside') : null;
  const peak = 3 + Math.floor(nextRandom(r) * (nights - 2));
  s.leads[s.year] = lead;
  s.winter = { nights, lead, twist, peak, why, question: winterQuestion(s, r) };
}

/**
 * The winter's question, drawn from the cast's lives (G3-4): an old Gate keeper on the stair, a first winter on the
 * wall, someone's last winter before they stand down, a parent of last year's child, a pair married last year.
 * One is picked among those that apply (seeded), else "every soul to the thaw".
 */
function winterQuestion(s: WatchState, r: { rng: number }): WinterPlan['question'] {
  const out: NonNullable<WinterPlan['question']>[] = [];
  const keeper = s.gateKeeper ? personOf(s, s.gateKeeper) : undefined;
  if (keeper && isWatcher(s, keeper) && ageOf(keeper, s.minute) >= RETIRE_AGE - 6)
    out.push({
      kind: 'gate',
      who: keeper.id,
      text: `${nameOf(s, keeper.id)} is slow on the Gate stair now. Keep the Gate whole on the worst night.`,
      met: null,
    });
  const watchers = living(s).filter((p) => isWatcher(s, p));
  const first = watchers.find((p) => {
    const a = ageOf(p, s.minute);
    return a >= 15 && a < 16;
  });
  if (first)
    out.push({
      kind: 'first',
      who: first.id,
      text: `${nameOf(s, first.id)} stands the wall for the first time. Bring ${nameOf(s, first.id)} to the thaw unhurt.`,
      met: null,
    });
  const last = watchers.find((p) => {
    const a = ageOf(p, s.minute);
    return a >= RETIRE_AGE - 1 && a < RETIRE_AGE;
  });
  if (last)
    out.push({
      kind: 'last',
      who: last.id,
      text: `This is ${nameOf(s, last.id)}’s last winter on the wall. See ${nameOf(s, last.id)} off it unhurt.`,
      met: null,
    });
  const lastYear = s.chronicle.filter((l) => l.year === s.year - 1);
  for (const l of lastYear) {
    if (l.kind !== 'birth' || !l.who) continue;
    const parent = s.cast[l.who]?.parents?.find((id) => watchers.some((p) => p.id === id));
    if (!parent) continue;
    out.push({
      kind: 'parent',
      who: parent,
      text: `${nameOf(s, parent)} has a child not a year old. Bring ${nameOf(s, parent)} home unhurt every dawn.`,
      met: null,
    });
    break;
  }
  for (const l of lastYear) {
    if (l.kind !== 'marriage' || !l.who) continue;
    const a = watchers.find((p) => p.id === l.who);
    const spouse = a?.social.relationships.find((r) => r.roles.includes('spouse'))?.otherId;
    if (!a || !spouse || !watchers.some((p) => p.id === spouse)) continue;
    out.push({
      kind: 'newlywed',
      who: a.id,
      who2: spouse,
      text: `${nameOf(s, a.id)} and ${nameOf(s, spouse)} were married last year and both stand the wall. Bring them both through unhurt.`,
      met: null,
    });
    break;
  }
  if (out.length === 0)
    return { kind: 'souls', text: 'Bring every soul and the granary to the thaw.', met: null };
  return out[Math.floor(nextRandom(r) * out.length)] ?? out[0] ?? null;
}

/** The night's plan in a directed winter (year ≥ 2); `planNight` delegates here. */
export function planDirectedNight(s: WatchState): void {
  const w = s.winter;
  const n = s.winterNight;
  const peak = n === w.peak;
  const r = worldRng(s, 'night');
  s.lead = nextRandom(r) < 0.75 ? w.lead : other(w.lead);
  const lost = s.marks.lost && s.marks.lost.year === s.year ? s.marks.lost.section : null;
  const walls = SECTION_IDS.filter((id) => id !== lost);
  s.warned = pick(r, walls);
  const rest = walls.filter((id) => id !== s.warned);
  s.warnedAlso = nextRandom(r) < 0.35 ? pick(r, rest) : null;
  const named = s.warnedAlso ? [s.warned, s.warnedAlso] : [s.warned];
  const elsewhere = walls.filter((id) => !named.includes(id));
  const def = sectionDef(s.warned);
  const tracks = s.lead === 'wolf' ? 'pack tracks' : 'strangers';
  const verb = s.lead === 'wolf' ? 'found' : 'saw';
  s.warning = s.warnedAlso
    ? `The scout ${verb} ${tracks} ${def.approach}, or ${sectionDef(s.warnedAlso).approach}; he could not tell which.`
    : `The scout ${verb} ${tracks} ${def.approach}.`;
  if (peak) s.warning += s.lead === 'wolf' ? ' A big pack, by the tracks.' : ' Many of them.';
  const watchers = presentIds(s).length;
  const crowd = Math.max(0, Math.floor((watchers - 7) / 3));
  const rich = s.grain >= 24 ? 1 : 0;
  const waveSize = (): number =>
    s.lead === 'wolf'
      ? 1 + Math.floor(n / 3) + (nextRandom(r) < 0.5 ? 1 : 0) + crowd + (peak ? 1 : 0)
      : 1 + Math.floor(n / 5) + rich + crowd + (peak ? 1 : 0);
  // A big night is a third wave of the pack; thieves come in two bands, only more of them.
  const waves: [number, number][] =
    peak && s.lead === 'wolf'
      ? [
          [80, 200],
          [240, 400],
          [420, 600],
        ]
      : [
          [80, 220],
          [300, 540],
        ];
  const spawns: Spawn[] = [];
  s.leadCame = [];
  // Wolves who learned the dark come once to the stretch with the fewest posted on it.
  const dark = darkest(s);
  waves.forEach(([lo, hi], i) => {
    const at = s.nightStart + lo + Math.floor(nextRandom(r) * (hi - lo));
    const right = nextRandom(r) < SCOUT_TRUE;
    let section: SectionId = right ? pick(r, named) : pick(r, elsewhere.length > 0 ? elsewhere : rest);
    if (w.twist === 'dark' && s.lead === 'wolf' && i === waves.length - 1) section = dark;
    if (!s.leadCame.includes(section)) s.leadCame.push(section);
    const count = waveSize();
    for (let k = 0; k < count; k++)
      spawns.push({ at: at + k * (1 + Math.floor(nextRandom(r) * 3)), section, kind: s.lead, count: 1 });
  });
  // A man inside: one thief is already at the foot of a wall when the night falls.
  if (w.twist === 'inside' && s.lead === 'thief' && nextRandom(r) < 0.6) {
    spawns.push({
      at: s.nightStart + 30 + Math.floor(nextRandom(r) * 200),
      section: pick(r, SECTION_IDS),
      kind: 'thief',
      count: 1,
      pos: 0.85,
    });
  }
  if (nextRandom(r) < 0.5) {
    spawns.push({
      at: s.nightStart + 60 + Math.floor(nextRandom(r) * 560),
      section: pick(r, SECTION_IDS),
      kind: nextRandom(r) < 0.5 ? 'wolf' : 'thief',
      count: 1,
    });
  }
  spawns.sort((a, b) => a.at - b.at);
  s.spawns = spawns;
}

/** The stretch with the fewest watchers posted on it (ties: wall order). */
function darkest(s: WatchState): SectionId {
  let best: SectionId = 'west';
  let fewest = Number.POSITIVE_INFINITY;
  for (const sec of SECTION_IDS) {
    const n = Object.values(s.posts).filter((p) => p && postSection(p) === sec).length;
    if (n < fewest) {
      fewest = n;
      best = sec;
    }
  }
  return best;
}
