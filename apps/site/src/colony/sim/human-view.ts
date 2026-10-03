/**
 * Pure mappings from framework state to the Human side's view model: verdict kinds, readable term labels and
 * families for the why panel, need bars, the strongest emotion and the trust meter.
 */
import {
  type Considered,
  type DecisionRecord,
  type Person,
  readAffect,
  readPerson,
  type SuggestionResolution,
  type Term,
  voiceOf,
} from '@human/framework';
import { gm, NORM_LABELS } from './human-cast.ts';
import type {
  BubbleKind,
  EmotionView,
  NeedBar,
  TermFamily,
  TrustView,
  WhyBreakdown,
  WhyOption,
  WhyTerm,
} from './human-side.ts';
import { VILLAGERS, type VillagerId } from './world-types.ts';

export type VerdictKind = Exclude<BubbleKind, 'thought'>;

/**
 * Verdict colour of a resolution (spec §5): deferred and modified are both amber "not now". A refusal on a bodily
 * need (an insisted order overridden by thirst, hunger or sleep) is also "not now": the need passes and the order
 * stands. Grey "cannot" is kept for capacity, skill, sleep and a job that is not there.
 */
export function verdictKind(r: SuggestionResolution): VerdictKind {
  if (r.verdict === 'refused' && r.kind !== 'willNot' && r.reason.startsWith('need:')) return 'notNow';
  switch (r.verdict) {
    case 'assented':
      return 'assent';
    case 'complied':
      return 'complied';
    case 'deferred':
    case 'modified':
      return 'notNow';
    case 'refused':
      return r.kind === 'willNot' ? 'willNot' : 'cannot';
  }
}

/** Lines for refusals on this host's own norms (the framework's verb table does not know them). */
const HOST_REFUSALS: Record<string, string> = {
  'norm:abandon-dependents': 'And leave the pot cold at noon? No. They eat from my hands.',
};

/** The person's line, with this host's wording where the framework has none. */
export function sayLine(r: SuggestionResolution): string {
  if (r.verdict === 'refused' && r.kind === 'willNot') {
    const own = HOST_REFUSALS[r.reason];
    if (own) return own;
  }
  return r.says;
}

const NAMES: Record<string, string> = Object.fromEntries(
  VILLAGERS.map((v) => [v.id, v.name.replace(/^Hajja /, '')]),
);
const nameOf = (id: string): string => NAMES[id] ?? id;

const NEED_LABELS: Record<string, string> = {
  food: 'hunger',
  water: 'thirst',
  sleep: 'sleepiness',
  rest: 'tiredness',
  relief: 'relief',
  safety: 'safety',
  belonging: 'belonging',
  esteem: 'standing',
  autonomy: 'autonomy',
  competence: 'doing it well',
  leisure: 'leisure',
  meaning: 'meaning',
};

const POSITIVE_EMOTIONS = new Set([
  'joy',
  'gratitude',
  'pride',
  'hope',
  'relief',
  'love',
  'contentment',
  'admiration',
  'satisfaction',
  'gratification',
  'happy-for',
]);

/** Readable label and colour family of one utility term. */
export function labelTerm(t: Term, commitmentLabel: (id: string) => string | undefined): WhyTerm {
  const s = t.source;
  const [head, rest = ''] = [s.split(':')[0] ?? s, s.slice(s.indexOf(':') + 1)];
  let label = s;
  let family: TermFamily = 'other';
  switch (head) {
    case 'need':
      label = NEED_LABELS[rest] ?? rest;
      family = 'need';
      break;
    case 'norm':
      label = NORM_LABELS[rest] ?? rest;
      family = 'norm';
      break;
    case 'conscience':
      label = rest === 'repair' ? 'make it right' : 'repent';
      family = 'norm';
      break;
    case 'commitment':
      if (s === 'commitment') label = 'keep my word';
      else {
        const c = commitmentLabel(rest);
        label = c ? `${c} is due` : 'a commitment';
      }
      family = 'commitment';
      break;
    case 'emotion': {
      const [emotion, tag] = rest.split(':');
      label = tag ? `${emotion} (${tag})` : (emotion ?? 'feeling');
      family = 'emotion';
      break;
    }
    case 'social':
      label = rest === 'group' ? 'company' : nameOf(rest);
      family = 'social';
      break;
    case 'joint':
      label = `working with ${nameOf(rest)}`;
      family = 'social';
      break;
    case 'effort':
      label = 'effort';
      family = 'effort';
      break;
    case 'risk':
      label = 'danger';
      family = 'effort';
      break;
    case 'suggestion':
      label = rest === 'player' ? 'your order' : `${nameOf(rest)}’s word`;
      family = 'suggestion';
      break;
    case 'autonomy':
      label = 'being pushed';
      family = 'suggestion';
      break;
    case 'habit':
      label = 'habit';
      family = 'habit';
      break;
    case 'precommit':
      label = 'resolution';
      family = 'habit';
      break;
    case 'goal':
      label = 'my work';
      family = 'goal';
      break;
    case 'expectation':
      label = 'how it went before';
      family = 'other';
      break;
    case 'material':
      label = 'gain';
      family = 'other';
      break;
  }
  return { source: s, label, value: Math.round(t.value * 100) / 100, family };
}

export function commitmentLabeler(p: Person): (id: string) => string | undefined {
  return (id) => {
    const c = p.agenda.commitments.find((x) => x.id === id);
    if (!c) return undefined;
    if (c.kind === 'worship') return c.label ?? 'prayer';
    return c.label;
  };
}

function option(c: Considered, chosen: boolean, label: (id: string) => string | undefined): WhyOption {
  const out: WhyOption = {
    affordanceId: c.affordanceId,
    action: c.action,
    label: capital(c.label ?? c.action),
    utility: Math.round(c.utility * 100) / 100,
    chosen,
    terms: c.terms.map((t) => labelTerm(t, label)).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  };
  if (c.vetoed) out.vetoed = { kind: c.vetoed.kind, reason: c.vetoed.reason };
  return out;
}

export const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Thought lines for a choice led by a bodily need (the framework's lines vary; these stay short over a map). */
const NEED_THOUGHTS: Record<string, string> = {
  food: 'Hungry. Time to eat.',
  water: 'Thirsty. Water first.',
  sleep: 'Tired. Time to sleep.',
  rest: 'Worn out. A short rest.',
  safety: 'Better get under a roof.',
};

/** Framework filler lines that say nothing on a map; the job's own label replaces them. */
const FILLER = new Set([
  'Because I should.',
  'It is the right thing.',
  'Might as well.',
  'Why not.',
  'This will do.',
  'Out of habit, really.',
  'Same as always.',
  "It's what I do at this hour.",
]);

/**
 * Thought-cloud text, built from the chosen option's leading term. The framework's narration is written for a
 * reader of one decision: it appends "It was a close call." and cites remembered episodes of *rival* options,
 * which over a running map repeat on every unrelated thought ("Thirsty… Last time, out for timber…"). The why
 * panel still lists the recalled episodes; the thought names the job, its goal, the prayer or the need.
 */
export function thoughtText(p: Person, record: DecisionRecord): string {
  const chosen = record.considered.find((c) => c.affordanceId === record.chosenAffordanceId);
  if (!chosen) return record.narration;
  const job = capital(chosen.label ?? chosen.action);
  const top = chosen.terms.reduce<Term | undefined>((m, t) => (!m || t.value > m.value ? t : m), undefined);
  const src = top && top.value > 0 ? top.source : '';
  if (record.suggestion === undefined) {
    if (src.startsWith('goal:')) {
      const goal = p.agenda.goals.find((g) => g.id === src.slice(5));
      // Name the goal only for the job it is mainly about ("Draw water: fill the granary." reads as a mistake).
      if (goal && goal.advancedBy[0]?.action === chosen.action) return `${job}: ${goal.label}.`;
      return `${job}.`;
    }
    if (src.startsWith('commitment:')) {
      const c = p.agenda.commitments.find((x) => x.id === src.slice(11));
      if (c?.kind === 'worship' && c.label) return `Time for ${c.label}.`;
    }
    if (src.startsWith('need:')) {
      const line = NEED_THOUGHTS[src.slice(5)];
      if (line) return line;
    }
    if (src === 'norm:aid-injured') return `${job}. Someone is hurt.`;
    if (src === 'habit') return `${job}, as usual.`;
  }
  // Otherwise the framework's line, without the close-call aside and the episode citations.
  let text = record.narration;
  for (const marker of ['Last time, ', 'I remember: ']) {
    const k = text.indexOf(marker);
    if (k >= 0) text = text.slice(0, k);
  }
  text = text.replace(/\s*(It was a close call\.|Nearly did otherwise\.)/g, '').trim();
  if (!text || FILLER.has(text)) return `${job}.`;
  return text;
}

/** The why panel for one decision. */
export function whyOf(p: Person, record: DecisionRecord, trust: TrustView): WhyBreakdown {
  const label = commitmentLabeler(p);
  const chosen = record.considered.find((c) => c.affordanceId === record.chosenAffordanceId);
  const others = record.considered.filter((c) => c !== chosen);
  const options = [
    ...(chosen ? [option(chosen, true, label)] : []),
    ...others.slice(0, chosen ? 2 : 3).map((c) => option(c, false, label)),
  ];
  const deltas: WhyBreakdown['deltas'] = [];
  if (chosen) {
    const keys = new Set([...Object.keys(chosen.advertised ?? {}), ...Object.keys(chosen.believed ?? {})]);
    for (const k of keys) {
      const a = (chosen.advertised as Record<string, number> | undefined)?.[k] ?? 0;
      const b = (chosen.believed as Record<string, number> | undefined)?.[k] ?? 0;
      deltas.push({ need: NEED_LABELS[k] ?? k, advertised: round2(a), believed: round2(b) });
    }
  }
  const recalledIds = new Set<string>();
  for (const c of record.considered) for (const id of c.recalled ?? []) recalledIds.add(id);
  if (record.suggestion?.episodeId) recalledIds.add(record.suggestion.episodeId);
  const recalled = p.memory.episodes
    .filter((e) => recalledIds.has(e.id))
    .slice(-3)
    .map((e) => `“${e.summary}”`);
  const out: WhyBreakdown = {
    personId: p.id as VillagerId,
    decisionId: record.id,
    minute: gm(record.at),
    narration: thoughtText(p, record),
    intention: record.intention,
    options,
    deltas,
    recalled,
    trust,
  };
  const r = record.suggestion;
  if (r) {
    out.verdict = {
      kind: verdictKind(r),
      says: sayLine(r),
      reason: r.reason,
      ...(r.counterOffer ? { counterOffer: r.counterOffer.label } : {}),
    };
  }
  return out;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

const TRUST_LABELS: Record<string, (action: string) => string> = {
  'went-well': (a) => `Good call: ${a}`,
  'went-badly': (a) => `Went badly: ${a}`,
  harm: (a) => `Hurt by your order: ${a}`,
  'harm-under-protest': (a) => `Made to ${a} against his word`,
};

const ACTION_WORDS: Record<string, string> = {
  'gather-timber': 'timber run',
  'gather-grain': 'grain',
  'fell-cedar': 'the cedar',
  'draw-water': 'water',
  cook: 'cooking',
  build: 'building',
  'raise-beam': 'the beam',
  'shutter-house': 'shutters',
};

export function trustOf(p: Person): TrustView {
  const v = voiceOf(p, 'player');
  if (!v) return { value: 0.5, history: [] };
  const history = [...(v.history ?? [])]
    .reverse()
    .slice(0, 3)
    .map((h) => {
      const a = ACTION_WORDS[h.action ?? ''] ?? h.action ?? 'an order';
      const fmt = TRUST_LABELS[h.reason] ?? ((x: string) => x);
      return { minute: gm(h.at), delta: round2(h.delta), label: fmt(a) };
    });
  return { value: v.trust, history };
}

export function needsOf(p: Person): NeedBar[] {
  const r = readPerson(p);
  const per = r.body.perceived;
  return [
    { id: 'food', label: 'Food', value: round2(1 - per.hunger), urgent: per.hunger >= 0.7 },
    { id: 'water', label: 'Water', value: round2(1 - per.thirst), urgent: per.thirst >= 0.7 },
    { id: 'sleep', label: 'Sleep', value: round2(1 - per.sleepiness), urgent: per.sleepiness >= 0.85 },
    { id: 'health', label: 'Health', value: round2(p.body.health), urgent: p.body.health < 0.4 },
  ];
}

export function emotionOf(p: Person): EmotionView | null {
  const a = readAffect(p);
  const top = a.dominant[0];
  if (!top || top.intensity < 0.15) {
    return { label: a.valence >= 0 ? 'calm' : 'low', valence: round2(a.valence), intensity: 0 };
  }
  const out: EmotionView = {
    label: top.id,
    valence: POSITIVE_EMOTIONS.has(top.id) ? 1 : -1,
    intensity: round2(top.intensity),
  };
  if (top.targetId) out.target = nameOf(top.targetId);
  return out;
}
