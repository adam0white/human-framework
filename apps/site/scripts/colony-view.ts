/**
 * Twice at the Well as text: what the page (apps/site/src/colony/ui) shows, rendered from the worker's frame and
 * playback state, for the text harness (play-colony.ts) and the HF playtester adapter (hf-colony-adapter.ts).
 *
 * It prints what a sighted player can read on screen and nothing the page hides: the top bar, the goal strip, each
 * pane's header stats and people rows (bars drawn as ten-step bars, as the page draws them), the suggestion card,
 * the pause ribbon, the composer's prediction line, the order log, bubbles over the Human map, moment captions,
 * the inspector and the end screen. The few label tables the UI keeps in .tsx files are copied here (Node's type
 * stripping does not read JSX); keep them in step with ui/parts.tsx and ui/Inspector.tsx.
 */

import type { PauseInfo, PlaybackState } from '../src/colony/protocol.ts';
import type { EndSummary, Frame, HurtNews, Nudge } from '../src/colony/sim/game.ts';
import { hindsight } from '../src/colony/sim/hindsight.ts';
import type {
  HumanSideFactory,
  Prediction,
  VillagerView,
  WhyBreakdown,
} from '../src/colony/sim/human-side.ts';
import type { PlaceId } from '../src/colony/sim/map.ts';
import type { ChipState, OrderCard } from '../src/colony/sim/orders.ts';
import {
  clockOf,
  formatClock,
  type Minute,
  VILLAGERS,
  type VillagerId,
} from '../src/colony/sim/world-types.ts';
import {
  moodDescription,
  namedDescription,
  needDescription,
  progressDescription,
  trustDescription,
} from '../src/colony/ui/descriptions.ts';
import {
  cardEnd,
  classicOutcome,
  goalValue,
  hindsightLine,
  humanOutcome,
  humanQuotes,
  nearMisses,
  ordersChanged,
} from '../src/colony/ui/end-report.ts';

export const NO_CONCEPT = 'Classic has no such concept';

export const PLACE_LABEL: Record<PlaceId, string> = {
  forest: 'Forest',
  cedar: 'Cedar',
  field: 'Field',
  well: 'Well',
  wellhouse: 'Well',
  kitchen: 'Kitchen',
  site: 'House',
  masjid: 'Masjid',
  'home-maryam': 'Home',
  'home-yusuf': 'Home',
  'home-idris': 'Home',
};

const JOB_PHRASE: Record<string, string> = {
  'gather-grain': 'gather grain',
  'gather-timber': 'gather timber',
  'fell-cedar': 'fell the big cedar',
  'draw-water': 'draw water',
  cook: 'cook a pot',
  build: 'build the house',
  'raise-beam': 'raise the roof beam',
  'shutter-house': 'shutter the house',
  eat: 'eat',
  pray: 'pray',
  shelter: 'shelter',
  sleep: 'sleep',
  rest: 'rest',
};
export const jobPhrase = (a: string): string => JOB_PHRASE[a] ?? a;

const CHIP_TEXT: Record<ChipState, string> = {
  pending: '…',
  ok: '✓',
  done: '✓',
  noop: 'could not',
  assent: 'yes',
  notNow: 'not now',
  complied: 'under protest',
  cannot: 'cannot',
  willNot: 'will not',
};

const PAUSE_TITLE: Record<string, string> = {
  suggestion: 'A suggestion',
  refusal: 'An answer',
  moment: 'A moment',
  storm: 'The storm',
};

const MOMENT_TITLE: Record<number, string> = {
  1: 'Carried home before eating',
  2: 'Same job, different answer',
  3: 'A refusal on principle',
  4: 'Done together',
  5: 'Trust remembered',
};

const BUBBLE_TAG: Record<string, string> = {
  assent: 'yes',
  notNow: 'not now',
  willNot: 'will not',
  cannot: 'cannot',
  complied: 'under protest',
  thought: 'thinks',
};

const FAMILY_LABEL: Record<string, string> = {
  need: 'needs',
  norm: 'norms',
  commitment: 'commitments',
  emotion: 'emotion',
  social: 'social',
  effort: 'effort / risk',
  suggestion: 'your voice',
  habit: 'habit',
  goal: 'goals',
  other: 'other',
};

const VERDICT_LABEL: Record<string, string> = {
  assent: 'Assented',
  notNow: 'Not now',
  complied: 'Complied under protest',
  cannot: 'Cannot',
  willNot: 'Will not',
};

const ROLE_LABEL: Record<string, string> = {
  cook: 'Cook',
  builder: 'Builder',
  apprentice: 'Apprentice',
  forester: 'Forester',
  gatherer: 'Gatherer',
  'well-keeper': 'Well-keeper',
};

export const shortName = (id: string): string =>
  (VILLAGERS.find((v) => v.id === id)?.name ?? id).replace('Hajja ', '');

export const hhmm = (m: Minute): string => {
  const c = clockOf(m);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
};
export const dayClock = (m: Minute): string => `D${clockOf(m).day} ${hhmm(m)}`;

/** A bar as the page draws it: length only (the page's numbers are tooltips and screen-reader text). */
export const bar = (v: number): string => {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 10);
  return `${'█'.repeat(n)}${'·'.repeat(10 - n)}`;
};

/** The header line: "Day 1 of 2 · storm in 13 h" (ui/parts.tsx statusLine). */
export function statusLine(f: Frame): string {
  const day = `Day ${Math.min(f.day.current, f.day.total)} of ${f.day.total}`;
  const storm = f.timeline.markers.find((m) => m.kind === 'storm');
  if (f.ended) return `Day ${clockOf(f.minute).day} · dawn`;
  if (storm && f.minute < storm.minute) {
    const left = storm.minute - f.minute;
    return `${day} · storm in ${left >= 60 ? `${Math.round(left / 60)} h` : `${left} min`}`;
  }
  if (storm?.until !== undefined && f.minute < storm.until) return `Storm · ends ${hhmm(storm.until)}`;
  return day;
}

export function topBar(f: Frame, pb: PlaybackState): string {
  const speed = pb.speed === 0.5 ? '½×' : `${pb.speed}×`;
  const sky = f.weather.kind === 'clear' ? '' : ` · sky: ${f.weather.kind}`;
  return `${hhmm(f.minute)}  ${statusLine(f)}${sky}  [${pb.paused ? 'paused' : 'running'} · ${speed} · auto-pause ${pb.autoPause ? 'on' : 'off'}]`;
}

const MARK = { open: '…', met: '✓', failed: '✗' } as const;

export function goalStrip(f: Frame): string[] {
  return f.goals.map(
    (g) =>
      `  ${g.label} by ${dayClock(g.deadlineMinute)}: C ${MARK[g.classic.status]} ${goalValue(g, g.classic)}  H ${MARK[g.human.status]} ${goalValue(g, g.human)}`,
  );
}

export function paneStats(f: Frame, side: 'classic' | 'human'): string {
  const w = side === 'classic' ? f.classicWorld : f.humanWorld;
  const s = side === 'classic' ? f.scoreboard.classic : f.scoreboard.human;
  const p = w.project;
  const fill = Math.min(1, (p.stage + (p.stage < p.stages ? w.houseProgress : 0)) / p.stages);
  const proj = `${p.kind === 'storeroom' ? 'Store-room' : 'House'} ${p.stage}/${p.stages} ${bar(fill)}`;
  const base = `Meals ${s.meals} · ${proj} · Injuries ${s.injuries} · Alive ${s.alive}`;
  if (side === 'classic') return `Classic (they obey): ${base} · Morale · trust: ${NO_CONCEPT}`;
  const h = f.scoreboard.human;
  return `Human (they decide): ${base} · Morale: ${moodDescription(h.morale)} Trust: ${trustDescription(h.trust)}`;
}

export function peopleRows(f: Frame, side: 'classic' | 'human'): string[] {
  if (side === 'classic')
    return f.classic.map(
      (u) =>
        `  ${shortName(u.id).padEnd(7)} ${u.label.padEnd(34)} ${needDescription('food', 1 - u.hunger / 100)} · ${needDescription('injury', u.hp / 100)}`,
    );
  return f.human.map((v) => {
    const need = (id: string) => v.needs.find((n) => n.id === id);
    const food = need('food');
    const sleep = need('sleep');
    const label = v.protest ? `${v.label} (under protest)` : v.label;
    const mark = (n: typeof food) => (n?.urgent ? '!' : ' ');
    return `  ${shortName(v.id).padEnd(7)} ${label.padEnd(34)} ${needDescription('food', food?.value ?? 1)}${mark(food)} · ${needDescription('sleep', sleep?.value ?? 1)}${mark(sleep)}`;
  });
}

export function suggestionCard(f: Frame): string[] {
  const n: Nudge | undefined = f.nudges[0];
  if (!n) return [];
  const left = Math.max(0, n.until - f.minute);
  const more = f.nudges.length > 1 ? ` (+${f.nudges.length - 1})` : '';
  const pre = [n.prefill?.rush ? 'Rush' : '', n.prefill?.insist ? 'Insist' : ''].filter(Boolean).join(', ');
  return [
    `Suggestion${more} [${shortName(n.order.personId)} → ${PLACE_LABEL[n.order.placeId]}${pre ? `, ${pre}` : ''}]: ${n.text}`,
    `  ${n.reason}`,
    `  lapses ${hhmm(n.until)} · in ${left} min   (use · skip)`,
  ];
}

export function pauseRibbon(p: PauseInfo | null): string[] {
  if (!p || p.kind === 'start') return [];
  const title =
    p.kind === 'auto'
      ? `Paused · ${PAUSE_TITLE[p.reason ?? ''] ?? 'Auto-pause'}`
      : p.kind === 'inspector'
        ? 'Paused while you inspect'
        : 'Paused';
  return [p.kind === 'auto' && p.text ? `${title}: ${p.text}` : title];
}

export function orderLine(c: OrderCard): string {
  const o = c.order;
  const flags = [o.rush ? 'rush' : '', o.insist ? 'insist' : '', o.appeal ? `“${o.appeal}”` : '']
    .filter(Boolean)
    .join(' ');
  let sub = jobPhrase(o.action);
  if (c.status === 'lapsed') sub += ' · lapsed';
  if (c.status === 'replaced') sub += ` · replaced by ${c.replacedBy ?? 'a newer order'}`;
  if (
    c.human.label &&
    c.human.state !== 'pending' &&
    (c.status === 'active' || c.human.state === 'willNot' || c.human.state === 'cannot')
  )
    sub += ` · ${humanQuotes(c)}`;
  if (c.classic.state === 'noop' && c.classic.label) sub += ` · Classic: ${c.classic.label}`;
  const x = c.status === 'active' ? '  (cancel)' : '';
  return `  ${o.id} ${hhmm(o.issuedAt)} ${shortName(o.personId)} → ${PLACE_LABEL[o.placeId]}${flags ? ` [${flags}]` : ''}: ${sub}  C ${CHIP_TEXT[c.classic.state]} · H ${CHIP_TEXT[c.human.state]}${x}`;
}

export function orderLog(f: Frame, max = 8): string[] {
  const list = f.cards.filter((c) => c.status !== 'cancelled').reverse();
  if (list.length === 0) return ['  No orders yet. Pick a villager, then a place.'];
  const out = list.slice(0, max).map(orderLine);
  if (list.length > max) out.push(`  … ${list.length - max} older (log all)`);
  return out;
}

/** The composer's line once who and where are picked (ui/parts.tsx Composer). */
export function composerLine(who: VillagerId, place: PlaceId, job: string, pred: Prediction | null): string {
  const head = `${shortName(who)} → ${PLACE_LABEL[place]} · ${jobPhrase(job)}`;
  if (!pred) return head;
  return `${head}   ${shortName(who)}: ${pred.text.charAt(0).toLowerCase()}${pred.text.slice(1)}`;
}

export function bubbleLine(v: VillagerView): string | null {
  const b = v.bubble;
  if (!b) return null;
  const tag = BUBBLE_TAG[b.kind] ?? b.kind;
  const said =
    b.kind === 'complied'
      ? `~${b.orderText ?? ''}~ …fine.`
      : b.kind === 'thought'
        ? `(${b.text})`
        : `“${b.text}”`;
  const counter =
    b.counterOffer && !b.text.toLowerCase().includes(b.counterOffer.toLowerCase())
      ? ` ${b.counterOffer}`
      : '';
  return `${shortName(v.id)} [${tag}] ${said}${counter}`;
}

/** The page's hurt line entry (ui/parts.tsx `hurtText`). */
export function hurtText(n: HurtNews): string {
  return `${dayClock(n.minute)} ${shortName(n.personId)} (${n.side === 'classic' ? 'Classic' : 'Human'}), ${n.how}`;
}

export function momentLine(m: { id: number; line: string }): string {
  return `Moment ${m.id} · ${MOMENT_TITLE[m.id] ?? ''}: ${m.line}`;
}

/** The whole screen, top to bottom. */
export function screen(f: Frame, pb: PlaybackState, full = true): string[] {
  const out = [topBar(f, pb), 'Goals:', ...goalStrip(f)];
  out.push(...pauseRibbon(pb.pause));
  if (f.news.length > 0) out.push(`Hurt: ${[...f.news].reverse().map(hurtText).join(' · ')}`);
  out.push(...suggestionCard(f));
  out.push(paneStats(f, 'classic'));
  if (full) out.push(...peopleRows(f, 'classic'));
  out.push(paneStats(f, 'human'));
  if (full) out.push(...peopleRows(f, 'human'));
  out.push(
    `Orders (${f.cards.filter((c) => c.status !== 'cancelled').length}):`,
    ...orderLog(f, full ? 8 : 3),
  );
  if (f.ended)
    out.push(f.canContinue ? 'The run has ended. (results · continue)' : 'The run has ended. (results)');
  return out;
}

/** The inspector for one villager (ui/Inspector.tsx). */
export function inspector(f: Frame, id: VillagerId, why: WhyBreakdown | null): string[] {
  const v = VILLAGERS.find((x) => x.id === id);
  const hv = f.human.find((h) => h.id === id);
  const cu = f.classic.find((u) => u.id === id);
  const out = [`${v?.name} — ${ROLE_LABEL[v?.role ?? 'cook']}, ${v?.age}. ${v?.line}`];
  out.push(
    `Classic unit: ${cu?.label ?? '–'}${cu?.rush ? ' (rush)' : ''} · Hunger ${cu?.hunger ?? '–'} · HP ${cu?.hp ?? '–'}. That is all a Classic unit has. Needs, Emotion, Trust in you, Why, Memories: ${NO_CONCEPT}.`,
  );
  if (!hv) return out;
  out.push(`Human person: ${hv.label}`);
  out.push(
    `  ${hv.needs.map((n) => `${n.label}: ${namedDescription(needDescription(n.id, n.value), shortName(id))}`).join(' · ')}`,
  );
  out.push(
    `  Feels ${hv.emotion?.label ?? 'calm'}${hv.emotion?.target ? ` about ${hv.emotion.target}` : ''}`,
  );
  out.push(
    `  ${shortName(id)}’s trust in you: ${namedDescription(trustDescription(hv.trust.value), shortName(id))}`,
  );
  if (hv.trust.history.length === 0) out.push('    Nothing has moved it today.');
  for (const e of hv.trust.history.slice(0, 3))
    out.push(`    ${e.delta >= 0 ? 'Reassured' : 'Less sure'}: ${e.label}`);
  out.push('  Why:');
  if (!why || why.personId !== id) {
    out.push('    Reading the decision…');
    return out;
  }
  if (why.verdict) {
    const c =
      why.verdict.counterOffer &&
      !why.verdict.says.toLowerCase().includes(why.verdict.counterOffer.toLowerCase())
        ? ` ${why.verdict.counterOffer}`
        : '';
    out.push(`    ${VERDICT_LABEL[why.verdict.kind]} “${why.verdict.says}”${c}`);
  }
  out.push(`    ${why.narration}`);
  const fams = new Set<string>();
  for (const o of why.options.slice(0, 3)) {
    out.push(`    ${o.chosen ? '● ' : '  '}${o.label}`);
    if (o.vetoed)
      out.push(`        ${o.vetoed.kind === 'willNot' ? 'Will not' : 'Cannot'}: ${o.vetoed.reason}`);
    const terms = o.terms.filter((t) => Math.abs(t.value) >= 0.005);
    for (const t of terms) fams.add(t.family);
    if (terms.length > 0)
      out.push(
        `        ${terms.map((t) => `${t.label} ${t.value > 0 ? 'draws them toward this' : 'holds them back'}`).join(' · ')}`,
      );
  }
  if (fams.size > 0) out.push(`    legend: ${[...fams].map((x) => FAMILY_LABEL[x] ?? x).join(', ')}`);
  if (why.deltas.length > 0)
    out.push(
      `    need advertised/believed: ${why.deltas.map((d) => `${d.need} ${d.advertised > 0 ? 'May help' : d.advertised < 0 ? 'May strain' : 'No change'}/${d.believed > 0 ? 'Expects relief' : d.believed < 0 ? 'Expects strain' : 'Expects no change'}`).join(' · ')}`,
    );
  out.push('    Memories:');
  if (why.recalled.length === 0) out.push('      Nothing recalled for this decision.');
  for (const r of why.recalled) out.push(`      remembers: ${r}`);
  return out;
}

/** The end screen for one report (ui/EndScreen.tsx), with the hindsight line computed in place of its worker. */
export function endScreen(summary: EndSummary, factory: HumanSideFactory, canContinue: boolean): string[] {
  const { scoreboard: sb, solo, character: ch } = summary;
  const out = [`Day ${summary.day + 1} · 05:00 · dawn — Same orders. Same seed.`, ordersChanged(summary)];
  out.push('Goal | Classic | Human | Solo (Human, no orders)');
  summary.goals.forEach((g, i) => {
    const s = summary.soloGoals[i];
    out.push(
      `  ${g.label} (judged ${dayClock(g.deadlineMinute)}) | ${MARK[g.classic.status]} ${goalValue(g, g.classic)} | ${MARK[g.human.status]} ${goalValue(g, g.human)} | ${s ? `${MARK[s.status]} ${goalValue(g, s)}` : '–'}`,
    );
  });
  const end = summary.day === 3 ? 'Day 4 dawn' : 'Day 3 dawn';
  out.push(`  Meals stored (${end}) | ${sb.classic.meals} | ${sb.human.meals} | ${solo.meals}`);
  out.push(
    `  House built (${end}, after the storm) | ${progressDescription(sb.classic.housePct / 100)} | ${progressDescription(sb.human.housePct / 100)} | ${progressDescription(solo.housePct / 100)}`,
  );
  out.push(`  Injuries (over the run) | ${sb.classic.injuries} | ${sb.human.injuries} | ${solo.injuries}`);
  for (const m of nearMisses(summary)) out.push(`  ${m.side}: ${m.text}`);
  if (summary.day === 2 && summary.goals.some((g) => g.human.status !== 'met')) {
    const h = hindsight(summary.seed, factory, summary.log);
    out.push(
      `What would have won (Human): ${h ? hindsightLine(h) : 'the simple plan (everyone but Maryam rushed to the house) did not win from any point we tried.'}`,
    );
  }
  if (summary.cards.length > 0) {
    out.push(summary.day === 3 ? 'Orders given on this day:' : 'Your orders:');
    for (const c of summary.cards) {
      const q = humanQuotes(c);
      const e = cardEnd(c);
      out.push(
        `  ${formatClock(c.order.issuedAt)} ${shortName(c.order.personId)} → ${PLACE_LABEL[c.order.placeId]}, ${jobPhrase(c.order.action)} · Classic ${classicOutcome(c)} · Human ${humanOutcome(c)}${q ? ` (${q})` : ''}${e ? ` · ${e}` : ''}`,
      );
    }
  }
  out.push(`Character outcomes (Classic: ${NO_CONCEPT}) | Human | Solo`);
  out.push(`  Morale | ${moodDescription(ch.morale)} | ${moodDescription(solo.morale)}`);
  out.push(`  Trust in you | ${trustDescription(ch.trust)} | ${trustDescription(solo.trust)}`);
  out.push('Moments you saw:');
  if (summary.moments.length === 0)
    out.push('  None of the five moments happened. The suggestions on the clock set them up.');
  for (const m of summary.moments)
    out.push(`  #${m.id} ${shortName(m.personId)} · ${formatClock(m.minute)}: ${m.line}`);
  out.push(
    canContinue && summary.day === 2
      ? '(continue = Another day · new = Play again · export = Download playtest file)'
      : '(new = Play again · export = Download playtest file)',
  );
  return out;
}
