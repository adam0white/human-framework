/**
 * SCOPE: templated first-person language for decisions and suggestion verdicts, plus a short summary of a
 * person for UI. Sentences are selected from small template sets by a hash of the decision id, so the
 * same record always narrates the same way without consuming the person's RNG. When memory shaped an
 * option (the record's `recalled` episodes), the narration cites the episode summary. This is presentation
 * only: nothing here reads back into the simulation, and no claim is made that the templates reflect how
 * people actually explain themselves.
 */
import type { Considered, DecisionRecord, Episode, Person, SuggestionResolution } from '../types.ts';

/** FNV-1a 32-bit hash for deterministic template selection. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const pickBy = <T>(key: string, items: readonly T[], salt = 0): T =>
  items[(hashString(key) + salt) % items.length] as T;

const NEED_LINES: Record<string, readonly string[]> = {
  'need:food': ["I'm starving — eating first.", 'My stomach is growling. Food first.', 'I need to eat.'],
  'need:water': ["I'm parched. Water first.", 'I need a drink of water.', 'Thirsty — the well, then.'],
  'need:sleep': [
    "I can't keep my eyes open. Bed.",
    "I'm exhausted; I need to sleep.",
    'Sleep, before anything else.',
  ],
  'need:rest': ['I need to sit down for a while.', 'A rest first, then the rest.'],
  'need:relief': ['This pain needs seeing to.', "I can't think past the pain."],
  'need:belonging': ["I've been alone too long. I want company.", 'Let me find someone to talk to.'],
  'need:leisure': ['I need a break from all this.', 'Time for something easier.'],
  'need:meaning': ['I want to do something that matters.', 'Something worthwhile, for once.'],
  'need:competence': ['I want to get better at this.', 'Practice makes the hand steady.'],
  'need:esteem': ['I want to be seen doing well.', 'Let me show what I can do.'],
  'need:autonomy': ['My choice, this time.', "I'll do what I decide to do."],
  'need:safety': ['I want to feel safe first.', 'Caution, for now.'],
};

const SOURCE_LINES: Record<string, readonly string[]> = {
  habit: ['Same as always.', 'Out of habit, really.', "It's what I do at this hour."],
  effort: ['The easy thing, for now.', 'Nothing strenuous.'],
  material: ['There is money in it.', 'It pays.'],
  expectation: ['It went well last time.', 'I know how this goes.'],
  'conscience:repair': ['I owe them that much.', 'I have to make this right.'],
  'conscience:repent': ['I need to set things right with God.', 'I have wrongs to turn from.'],
  preference: ['Why not.', 'This will do.', 'Might as well.'],
};

const NORM_VERBS: Record<string, string> = {
  theft: 'steal',
  lying: 'lie',
  'harm-others': 'hurt anyone',
  intoxicants: 'drink that',
  backbiting: 'talk behind their back',
  'forbidden-food': 'eat that',
};

const NORM_FULFIL: Record<string, readonly string[]> = {
  salah: ['Time to pray.', 'Prayer first; the rest can wait.', 'I will pray, then see.'],
  charity: ['I can spare some for others.', 'Charity, while I can.'],
  'help-neighbor': ['They need a hand.', 'A neighbour should help.'],
  'keep-promise': ['I gave my word.', 'I said I would.'],
  'kindness-to-parents': ['For my parents.'],
  gratitude: ['I should say thank you.'],
  default: ['It is the right thing.', 'Because I should.'],
};

function nameOf(p: Person, id: string | undefined): string {
  if (!id) return 'them';
  const rel = p.social.relationships.find((r) => r.otherId === id);
  if (rel?.roles.includes('spouse')) return 'my spouse';
  if (rel?.roles.includes('parent')) return 'my parent';
  if (rel?.roles.includes('child')) return 'my child';
  return id;
}

const topTerm = (c: Considered | undefined): { source: string; value: number } | undefined => {
  let best: { source: string; value: number } | undefined;
  for (const t of c?.terms ?? []) if (t.value > 0 && (!best || t.value > best.value)) best = t;
  return best;
};

/** Intention string for a decision: 'for Allah', 'to feed myself', 'to keep my promise to X', ... */
export function intentionFor(p: Person, record: DecisionRecord): string {
  const chosen = record.considered.find((c) => c.affordanceId === record.chosenAffordanceId);
  if (!chosen) return 'nothing to do';
  if (record.suggestion?.verdict === 'complied') return 'because you insisted';
  const top = topTerm(chosen);
  if (!top) return 'because it suits me';
  const [kind, rest] = [top.source.split(':')[0] ?? '', top.source.slice(top.source.indexOf(':') + 1)];
  switch (kind) {
    case 'need':
      return (
        {
          food: 'to feed myself',
          water: 'to drink',
          sleep: 'to sleep',
          rest: 'to rest',
          relief: 'to ease the pain',
          belonging: 'to be with people',
          leisure: 'to enjoy myself',
          meaning: 'to do something that matters',
          competence: 'to get better',
          esteem: 'to be respected',
          autonomy: 'to choose for myself',
          safety: 'to be safe',
        }[rest] ?? `to meet my need for ${rest}`
      );
    case 'norm':
      return p.values.tradition >= 0.6 ? 'for Allah' : 'because it is right';
    case 'conscience':
      return rest === 'repair' ? 'to make amends' : 'to turn back from wrong';
    case 'commitment': {
      const c = p.agenda.commitments.find((x) => x.id === rest);
      if (c?.kind === 'worship') return p.values.tradition >= 0.6 ? 'for Allah' : 'to keep my devotion';
      if (c?.toId && c.toId !== 'self') return `to keep my promise to ${nameOf(p, c.toId)}`;
      return 'to keep my word';
    }
    case 'goal': {
      const g = p.agenda.goals.find((x) => x.id === rest);
      return g ? `to ${g.label.replace(/-/g, ' ')}` : 'for my goal';
    }
    case 'social':
      return rest === 'group' ? 'to be among people' : `for ${nameOf(p, rest)}`;
    case 'suggestion':
      return 'because you asked';
    case 'habit':
      return 'out of habit';
    case 'emotion':
      return `because I feel like it`;
    case 'material':
      return 'to earn';
    case 'precommit':
      return 'because I resolved to';
    case 'expectation':
      return 'because it worked before';
    default:
      return 'because it suits me';
  }
}

function citeEpisode(p: Person, ids: readonly string[] | undefined): string | undefined {
  if (!ids || ids.length === 0) return undefined;
  const ep: Episode | undefined = p.memory.episodes.find((e) => e.id === ids[0]);
  if (!ep) return undefined;
  const lead = ep.valence < 0 ? 'Last time, ' : 'I remember: ';
  const summary = ep.summary.endsWith('.') ? ep.summary : `${ep.summary}.`;
  return `${lead}${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
}

/** A rival within this fraction of the chosen utility makes the choice "a close call". */
const CLOSE_CALL_FRACTION = 0.2;
/** Smallest expectation term that counts as memory having moved the choice. */
const CITE_MIN_EXPECTATION = 0.02;

const EMOTION_LINES: Record<string, string[]> = {
  social: ['I want company.', "I'd like someone to talk to."],
  worship: ['My heart turns to prayer.', 'I want to be near God.'],
  novel: ['I want something different.', "I'm restless."],
  rest: ['I need a break.', "I've had enough for now."],
  comfort: ['I need some comfort.', 'I want to feel safe.'],
  repair: ['I have to put this right.', "It's weighing on me."],
  risky: ["I'm in the mood for it.", 'Why not.'],
};

const NEED_FIRST: Record<string, string> = {
  'need:food': 'I have to eat first.',
  'need:water': 'I have to drink first.',
  'need:sleep': 'I have to sleep first.',
  'need:rest': 'I have to rest first.',
};

/** First-person narration of a decision record. Deterministic by the decision id. */
export function narrateDecision(p: Person, record: DecisionRecord): string {
  const chosen = record.considered.find((c) => c.affordanceId === record.chosenAffordanceId);
  if (!chosen) {
    const vetoed = record.considered.find((c) => c.vetoed);
    if (vetoed?.vetoed?.reason === 'dead') return '';
    return pickBy(record.id, ["There's nothing I can do right now.", 'Nothing for it but to wait.']);
  }
  const parts: string[] = [];
  const top = topTerm(chosen);
  const source = top?.source ?? 'preference';
  const kind = source.split(':')[0] ?? '';
  const rest = source.slice(source.indexOf(':') + 1);
  // Under insistence the reason is the voice, not the top term (which belongs to what they wanted).
  if (record.suggestion?.verdict === 'complied')
    parts.push(pickBy(record.id, ['You insisted, so I will.', "I'd rather not, but you insist."]));
  else if (kind === 'need') parts.push(pickBy(record.id, NEED_LINES[source] ?? [`I need ${rest}.`]));
  else if (kind === 'norm') parts.push(pickBy(record.id, NORM_FULFIL[rest] ?? NORM_FULFIL.default ?? ['']));
  else if (kind === 'commitment')
    parts.push(pickBy(record.id, ['I said I would, so I will.', 'I have to keep to it.']));
  else if (kind === 'goal')
    parts.push(pickBy(record.id, ['Another step toward what I want.', 'Keeping at it.']));
  else if (kind === 'social')
    parts.push(pickBy(record.id, [`I'd like to see ${nameOf(p, rest)}.`, `Time with ${nameOf(p, rest)}.`]));
  else if (kind === 'suggestion')
    parts.push(pickBy(record.id, ['You asked, so I will.', 'Fine, since you suggest it.']));
  else if (kind === 'emotion')
    parts.push(pickBy(record.id, EMOTION_LINES[rest] ?? ['I feel like it.', 'My mood says so.']));
  else parts.push(pickBy(record.id, SOURCE_LINES[source] ?? SOURCE_LINES.preference ?? ['']));

  // Mention what was weighed against, if a rival came within a fifth of the chosen utility (not on reviews).
  const rival = record.considered.find((c) => c.affordanceId !== chosen.affordanceId && !c.vetoed);
  if (
    !record.review &&
    rival &&
    rival.utility > 0 &&
    chosen.utility - rival.utility < CLOSE_CALL_FRACTION * chosen.utility
  ) {
    parts.push(pickBy(record.id, ['It was a close call.', 'Nearly did otherwise.'], 1));
  }
  // Memory is cited only when it moved this choice (a non-zero expectation term).
  if (chosen.terms.some((t) => t.source === 'expectation' && Math.abs(t.value) >= CITE_MIN_EXPECTATION)) {
    const cite = citeEpisode(p, chosen.recalled);
    if (cite) parts.push(cite);
  }
  // A strong avoided option with memory behind it is also worth citing.
  for (const c of record.considered) {
    if (c === chosen || !c.recalled || c.recalled.length === 0) continue;
    const neg = c.terms.find((t) => t.source === 'expectation' && t.value < 0);
    if (!neg) continue;
    const other = citeEpisode(p, c.recalled);
    if (other) parts.push(other);
    break;
  }
  return parts.join(' ');
}

/** The person's spoken reply to a suggestion. */
export function voiceLine(p: Person, res: SuggestionResolution, key = res.reason): string {
  const trust = p.will.voices.find((v) => v.voiceId === res.voiceId)?.trust ?? 0.5;
  switch (res.verdict) {
    case 'assented':
      return pickBy(
        key,
        trust >= 0.6
          ? ["I trust you — fine, I'll go.", 'Good idea. On it.']
          : ["Alright, I'll do it.", 'Fine.'],
      );
    case 'complied':
      return pickBy(key, ['Fine. Since you insist.', "If you insist. I'd rather not."]);
    case 'deferred': {
      const after = res.counterOffer?.label ?? 'later';
      return pickBy(key, [`Not now. ${cap(after)}.`, `${cap(after)}, then I will.`]);
    }
    case 'modified': {
      const alt = res.counterOffer?.label ?? 'something like it';
      return pickBy(key, [`I'll ${lower(alt)} instead.`, `Not that — I'll ${lower(alt)}.`]);
    }
    case 'refused': {
      if (res.reason === 'distrust')
        return pickBy(key, ['Why would I listen to you?', "You've pushed me enough."]);
      if (res.kind === 'willNot') {
        const normId = res.reason.startsWith('norm:') ? res.reason.slice(5) : '';
        const verb = NORM_VERBS[normId] ?? 'do that';
        return pickBy(key, [`I won't ${verb}, whatever you say.`, `No. I don't ${verb}.`]);
      }
      if (res.reason === 'asleep') return "I'm asleep.";
      if (NEED_FIRST[res.reason]) return NEED_FIRST[res.reason] as string;
      if (res.reason === 'need:survival') return "I can't, not in this state.";
      if (res.reason === 'not-sleepy') return "I'm not tired.";
      if (res.reason === 'unavailable')
        return pickBy(key, ["That isn't on offer here now.", 'Not now, not here.']);
      if (res.reason === 'invalid') return "That doesn't make sense.";
      if (res.reason === 'capacity') return pickBy(key, ["I can't. I'm spent.", "I haven't the strength."]);
      if (res.reason.startsWith('skill:')) return "I don't know how.";
      if (res.reason === 'dead') return '';
      return pickBy(key, ["I can't right now.", "That isn't possible."]);
    }
  }
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** Short UI summary of a person's state. */
export function describePerson(p: Person): string {
  const b = p.body;
  const bits: string[] = [];
  if (!b.alive) return `${p.name} has died.`;
  if (b.asleep) bits.push('asleep');
  if (b.satiety < 0.3) bits.push('hungry');
  if (b.hydration < 0.3) bits.push('thirsty');
  if (b.sleepPressure > 0.7) bits.push('tired');
  if (b.pain > 0.3) bits.push('in pain');
  const top = [...p.affect.emotions].sort((a, c) => c.intensity - a.intensity)[0];
  if (top && top.intensity > 0.2) bits.push(`feeling ${top.id}`);
  const act = p.activity
    ? `${p.activity.action}${p.activity.targetId ? ` (${p.activity.targetId})` : ''}`
    : 'idle';
  const state = bits.length > 0 ? bits.join(', ') : 'well';
  return `${p.name}: ${act}; ${state}.`;
}
