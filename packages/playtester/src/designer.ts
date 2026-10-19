/**
 * SCOPE: an experiment, not a faculty. An HF person with a designer's traits and an agenda reads a cohort summary
 * and ranks tuning proposals, in plain text. HF cannot read text, so the split is explicit:
 * - The proposals come from code (`candidates`): each boredom hotspot, quit point, frustration cause, edge and
 *   return rate in the summary becomes a templated proposal with its evidence (share of sessions).
 * - The HF designer ranks them with HF's own scorer (`scoreAll`, no writes): each proposal is an offer whose action
 *   is `design:<kind>`, advertising competence and meaning in proportion to its evidence, costing effort by how much
 *   work it is (new content costs more than a tweak), tagged `novel` when it keeps an edge as play. The agenda is
 *   HF goals advanced by some kinds of proposal ("players come back", "edges stay fun", "a fair game"), so two
 *   designers with different agendas rank the same evidence differently. The players' boredom and frustration in
 *   the summary reach the designer as percepts (a fraction of the players' own feeling), so HF's emotion
 *   tendencies (boredom favours `novel`) also weigh in.
 * What it adds over a sorted list is exactly those terms: agenda, effort, emotion. Verdict (docs/findings.md,
 * 2026-10-19): not worth having. On The Pass the agenda set the rank, evidence barely moved it, and a plain LLM
 * reviewer given the same summary did more. Kept as the record of the experiment, with the CLI's `design` command;
 * no other tool uses it. `scoreAll` makes no writes; `perceive` and `feel` write only to the designer's own Person.
 * Every number is an engineering premise.
 */
import {
  type Affordance,
  actionTendencies,
  adoptGoal,
  createPerson,
  type DecideContext,
  dominantTerm,
  feel,
  lifeModifiers,
  MINUTES_PER_YEAR,
  type NeedId,
  type Person,
  type PersonSpec,
  perceive,
  readPerson,
  scoreAll,
  tendencyEmotions,
  type ValueId,
} from '@adam0white/human-framework';
import type { CohortSummary } from './cohort.ts';

export type ProposalKind =
  | 'fill-lull'
  | 'ease-quit'
  | 'soften-frustration'
  | 'answer-mischief'
  | 'keep-edge'
  | 'close-edge'
  | 'leave-loop'
  | 'reward';

export interface Proposal {
  id: string;
  kind: ProposalKind;
  text: string;
  /** Share of the cohort's sessions behind it, 0..1. */
  evidence: number;
}

export interface Designer {
  id: string;
  label: string;
  traits: PersonSpec['traits'];
  /** Goals advanced by proposal kinds. */
  agenda: {
    id: string;
    label: string;
    serves: (NeedId | ValueId)[];
    kinds: ProposalKind[];
    importance: number;
  }[];
}

export const DESIGNERS = {
  keeper: {
    id: 'keeper',
    label: 'wants players back tomorrow and the edges they find kept as play',
    traits: {
      openness: 0.85,
      conscientiousness: 0.55,
      agreeableness: 0.6,
      emotionality: 0.5,
      extraversion: 0.6,
    },
    agenda: [
      {
        id: 'come-back',
        label: 'players come back',
        serves: ['meaning'],
        kinds: ['leave-loop', 'fill-lull', 'ease-quit'],
        importance: 0.6,
      },
      {
        id: 'edges-fun',
        label: 'edges stay fun',
        serves: ['competence'],
        kinds: ['answer-mischief', 'keep-edge'],
        importance: 0.5,
      },
    ],
  },
  tightener: {
    id: 'tightener',
    label: 'wants a fair, tight game where every tap is answered and no trick wins',
    traits: {
      openness: 0.45,
      conscientiousness: 0.9,
      agreeableness: 0.4,
      emotionality: 0.4,
      extraversion: 0.4,
    },
    agenda: [
      {
        id: 'fair',
        label: 'a fair game',
        serves: ['competence'],
        kinds: ['close-edge', 'soften-frustration'],
        importance: 0.6,
      },
      {
        id: 'no-dead-time',
        label: 'no dead time',
        serves: ['meaning'],
        kinds: ['fill-lull'],
        importance: 0.3,
      },
    ],
  },
} satisfies Record<string, Designer>;

export const DESIGNER_DEFAULTS = {
  /** What a proposal advertises per unit of evidence. */
  competence: 0.3,
  meaning: 0.2,
  /** Work, as HF effort (0..1): new content costs more than a number. */
  effort: {
    'fill-lull': 0.5,
    'ease-quit': 0.3,
    'soften-frustration': 0.2,
    'answer-mischief': 0.35,
    'keep-edge': 0.25,
    'close-edge': 0.15,
    'leave-loop': 0.4,
    reward: 0.2,
  } satisfies Record<ProposalKind, number>,
  /** Share of the players' boredom and frustration the designer feels on reading them. */
  empathy: 0.5,
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Templated proposals from a summary, with their evidence (see SCOPE). */
export function candidates(s: CohortSummary): Proposal[] {
  const total = s.personas.reduce((n, p) => n + p.sessions, 0) || 1;
  const out: Proposal[] = [];
  const bored = Object.entries(s.boredAt);
  for (const [chapter, n] of bored.slice(0, 2))
    out.push({
      id: `fill-lull:${chapter}`,
      kind: 'fill-lull',
      text: `Put something to notice in ${chapter}: players were bored there ${n} times.`,
      evidence: Math.min(1, n / total),
    });
  const lulls = s.personas.filter((p) => p.lull.max >= 60);
  if (lulls.length && bored.length === 0) {
    const worst = [...lulls].sort((a, b) => b.lull.max - a.lull.max)[0];
    if (worst)
      out.push({
        id: `fill-lull:${worst.lull.where}`,
        kind: 'fill-lull',
        text: `Shorten the quiet stretch in ${worst.lull.where}: the longest lull was ${worst.lull.max} s (${worst.persona}).`,
        evidence: lulls.length / Math.max(1, s.personas.length),
      });
  }
  const quits: Record<string, number> = {};
  for (const p of s.personas) for (const [c, n] of Object.entries(p.quitAt)) quits[c] = (quits[c] ?? 0) + n;
  for (const [chapter, n] of Object.entries(quits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2))
    out.push({
      id: `ease-quit:${chapter}`,
      kind: 'ease-quit',
      text: `Look at ${chapter}: ${n} sessions were put down there by choice. Find what it asks of a tired player.`,
      evidence: Math.min(1, n / total),
    });
  const frus = Object.entries(s.frustratedBy)[0];
  if (frus)
    out.push({
      id: 'soften-frustration',
      kind: 'soften-frustration',
      text: `Telegraph or soften "${frus[0]}": it frustrated players ${frus[1]} times.`,
      evidence: Math.min(1, frus[1] / total),
    });
  for (const e of s.edges) {
    const ev = Math.min(1, e.sessions / total);
    if (e.kind === 'mischief-ignored' && e.label === 'fun to keep')
      out.push({
        id: `answer:${e.subject}`,
        kind: 'answer-mischief',
        text: `Answer "${e.subject}" on screen (a line, a small cost or a small reward): ${e.detail}.`,
        evidence: ev,
      });
    else if (e.label === 'fun to keep' && e.kind !== 'mischief-answered')
      out.push({
        id: `keep:${e.kind}:${e.subject}`,
        kind: 'keep-edge',
        text: `Keep the ${e.kind} "${e.subject}" and count it in the game: ${e.reason} (${e.detail}).`,
        evidence: ev,
      });
    else if (e.label === 'close')
      out.push({
        id: `close:${e.kind}:${e.subject}`,
        kind: 'close-edge',
        text: `Close the ${e.kind} "${e.subject}": ${e.reason} (${e.detail}).`,
        evidence: ev,
      });
  }
  for (const p of s.personas)
    if (p.returned && p.returned.possible > 0 && p.returned.evenings / p.returned.possible < 0.5)
      out.push({
        id: 'leave-loop',
        kind: 'leave-loop',
        text: `Leave something visibly unfinished at a natural stop: the returner came back ${p.returned.evenings} of ${p.returned.possible} evenings.`,
        evidence: 1 - p.returned.evenings / p.returned.possible,
      });
  const rewards = s.personas.reduce((n, p) => n + p.rewardsPerSession * p.sessions, 0) / total;
  if (rewards < 1)
    out.push({
      id: 'reward',
      kind: 'reward',
      text: `Make success visible: ${rewards.toFixed(1)} rewards a session reach the reward line.`,
      evidence: 1 - rewards,
    });
  // One proposal per id: the first (strongest evidence source) wins.
  return out.filter((x, i) => out.findIndex((y) => y.id === x.id) === i);
}

export interface RankedProposal {
  proposal: Proposal;
  utility: number;
  why: string;
}

export interface DesignReview {
  designer: string;
  ranked: RankedProposal[];
  text: string;
}

/** The designer reads the summary and ranks the candidates (see SCOPE). Deterministic. */
export function designReview(s: CohortSummary, d: Designer, seed = 1): DesignReview {
  const D = DESIGNER_DEFAULTS;
  const p = makeDesigner(d, seed);
  const total = s.personas.reduce((n, x) => n + x.sessions, 0) || 1;
  const bored = s.personas.reduce((n, x) => n + x.boredSessions, 0) / total;
  const frustrated = s.personas.reduce((n, x) => n + x.frustratedSessions, 0) / total;
  const percepts = [
    { kind: 'players-bored', share: bored, emotion: 'bored' },
    { kind: 'players-frustrated', share: frustrated, emotion: 'frustrated' },
  ]
    .filter((x) => x.share > 0)
    .map((x) => ({
      at: p.now,
      channel: 'saw' as const,
      kind: x.kind,
      targetId: p.id,
      salience: Math.min(1, 0.4 + x.share),
      valence: -D.empathy * x.share,
      summary: `${pct(x.share)} of sessions ${x.emotion}`,
    }));
  if (percepts.length) perceive(p, percepts);
  if (bored > 0) {
    // Reading bored players is itself a little boring to a designer: the empathy share of their boredom.
    feel(p, 'boredom', D.empathy * bored, 'cohort:bored', p.now);
  }
  const props = candidates(s);
  const offers: Affordance[] = props.map((x) => {
    const aff: Affordance = {
      id: x.id,
      action: `design:${x.kind}`,
      label: x.text,
      duration: 60,
      effort: D.effort[x.kind],
      advertises: { competence: D.competence * x.evidence, meaning: D.meaning * x.evidence },
    };
    if (x.kind === 'keep-edge' || x.kind === 'answer-mischief') aff.tags = ['novel'];
    return aff;
  });
  const { body, needs, desperation } = readPerson(p);
  const ctx: DecideContext = {
    id: 'design',
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit: { now: p.now },
    necessity: true,
    tendencyEmotions: tendencyEmotions(p),
  };
  const considered = scoreAll(p, offers, ctx).considered;
  // HF names goal terms by id; the text names the agenda goal.
  const named = (why: string) =>
    why.replace(/^goal:(\S+)/, (_, id) => `goal:${p.agenda.goals.find((g) => g.id === id)?.label ?? id}`);
  const ranked = props
    .map((proposal) => {
      const c = considered.find((x) => x.affordanceId === proposal.id);
      return { proposal, utility: Math.round((c?.utility ?? 0) * 1000) / 1000, why: named(dominantTerm(c)) };
    })
    .sort((a, b) => b.utility - a.utility || (a.proposal.id < b.proposal.id ? -1 : 1));
  const text = [
    `${d.id} (${d.label}) on ${s.game} ${s.build}:`,
    ...ranked.map(
      (r, i) => `${i + 1}. ${r.proposal.text} [evidence ${pct(r.proposal.evidence)}; weighed by ${r.why}]`,
    ),
  ].join('\n');
  return { designer: d.id, ranked, text };
}

function makeDesigner(d: Designer, seed: number): Person {
  const now = 10 * 60;
  const p = createPerson({
    id: `designer:${d.id}`,
    name: d.label,
    seed,
    now,
    sex: 'female',
    bornAt: now - 34 * MINUTES_PER_YEAR,
    traits: d.traits,
  });
  for (const g of d.agenda)
    adoptGoal(
      p,
      {
        label: g.label,
        serves: g.serves,
        advancedBy: g.kinds.map((k) => ({ action: `design:${k}`, amount: 0.2 })),
        importance: g.importance,
      },
      now,
    );
  return p;
}
