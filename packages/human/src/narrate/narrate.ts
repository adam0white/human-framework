/**
 * SCOPE: templated first-person language for decisions and suggestion verdicts, plus a short summary of a
 * person for UI. Sentences are selected from keyed template sets (`EN_LINES`, overridable per key by a host
 * `Lexicon`, N6) by a hash of the decision id, so the same record always narrates the same way without
 * consuming the person's RNG. When memory shaped an option (the record's `recalled` episodes), the narration
 * cites the episode summary. People are named through `nameOf` (lexicon name, role phrase, or id). This is
 * presentation only: nothing here reads back into the simulation, and no claim is made that the templates
 * reflect how people actually explain themselves. `Lexicon.plainEnglish` opts into sentence intentions
 * and summaries; arbitrary host prose is not translated or grammatically inferred.
 */

import { NORM_SCOPE } from '../conscience/index.ts';
import { labelLine } from '../presentation.ts';
import type { Considered, DecisionRecord, Episode, Lexicon, Person, SuggestionResolution } from '../types.ts';
import { capitalize, linesFor, lowerFirst, nameOf, phraseLine, pickLine } from './lexicon.ts';

/**
 * Devotional intention: 'for Allah' for norms the built-in catalog scopes as religious, else 'for God'. The phrase
 * follows the norm, not the person (review 2026-10-03): a host whose people differ in faith overrides
 * `devotion.allah` / `devotion.god` per person through `Person.lexicon` (from `PersonSpec.lexicon`).
 */
function devotion(p: Person, normId: string | undefined, lex: Lexicon | undefined, say = phraseLine): string {
  if (p.values.tradition < 0.6)
    return normId === undefined ? say('devotion.keep', {}, lex) : say('intention.right', {}, lex);
  if (normId !== undefined && NORM_SCOPE[normId] === 'religious') return say('devotion.allah', {}, lex);
  return say('devotion.god', {}, lex);
}

const topTerm = (c: Considered | undefined): { source: string; value: number } | undefined => {
  let best: { source: string; value: number } | undefined;
  for (const t of c?.terms ?? []) if (t.value > 0 && (!best || t.value > best.value)) best = t;
  return best;
};

/** Voices the narration addresses as "you" (the host's own voice); other voices are named when a lexicon names them. */
const PLAYER_VOICES = new Set(['player', 'you']);

/** Intention string for a decision: 'for Allah', 'to feed myself', 'to keep my promise to X', ... */
function intentionPhrase(
  p: Person,
  record: DecisionRecord,
  lexicon?: Lexicon,
  selected?: { key?: string },
): string {
  const lex = lexicon ?? p.lexicon;
  const say = (key: string, vars: Readonly<Record<string, string | number>> = {}, lex?: Lexicon) => {
    if (selected) selected.key = key;
    return phraseLine(key, vars, lex);
  };
  const chosen = record.considered.find((c) => c.affordanceId === record.chosenAffordanceId);
  if (!chosen) return say('intention.none', {}, lex);
  if (record.suggestion?.verdict === 'complied') return say('intention.complied', {}, lex);
  if (record.suggestion?.verdict === 'commanded') return say('intention.commanded', {}, lex);
  const top = topTerm(chosen);
  if (!top) return say('intention.default', {}, lex);
  const [kind, rest] = [top.source.split(':')[0] ?? '', top.source.slice(top.source.indexOf(':') + 1)];
  switch (kind) {
    case 'need':
      return linesFor(`intention:${rest}`, lex).length > 0
        ? say(`intention:${rest}`, {}, lex)
        : say('intention.need', { need: rest }, lex);
    case 'norm': {
      const tracked = p.agenda.commitments.some((c) => c.normId === rest && c.kind === 'worship');
      if (NORM_SCOPE[rest] === 'religious' || tracked) return devotion(p, rest, lex, say);
      return say('intention.right', {}, lex);
    }
    case 'conscience':
      return say(rest === 'repair' ? 'intention.repair' : 'intention.repent', {}, lex);
    case 'commitment': {
      const c = p.agenda.commitments.find((x) => x.id === rest);
      if (c?.kind === 'worship')
        return c.normId === undefined || p.values.tradition < 0.6
          ? devotion(p, undefined, lex, say)
          : devotion(p, c.normId, lex, say);
      if (c?.toId && c.toId !== 'self')
        return say('intention.promiseTo', { who: nameOf(p, c.toId, lex) }, lex);
      // A host may phrase a labelled commitment its own way ('intention.label:suhoor' → "for suhoor").
      if (c?.label !== undefined && linesFor(`intention.label:${c.label}`, lex).length > 0)
        return say(`intention.label:${c.label}`, {}, lex);
      return say('intention.word', {}, lex);
    }
    case 'goal': {
      const g = p.agenda.goals.find((x) => x.id === rest);
      return g
        ? say(
            'intention.goal',
            { goal: lex?.plainEnglish ? labelLine(g.label, lex) : g.label.replace(/-/g, ' ') },
            lex,
          )
        : say('intention.goalFallback', {}, lex);
    }
    case 'social':
      return rest === 'group'
        ? say('intention.group', {}, lex)
        : say('intention.for', { who: nameOf(p, rest, lex) }, lex);
    case 'suggestion': {
      const voice = rest.startsWith('remembered:') ? rest.slice('remembered:'.length) : rest;
      if (lex?.names?.[voice] !== undefined && !PLAYER_VOICES.has(voice))
        return say('intention.suggestionBy', { who: nameOf(p, voice, lex) }, lex);
      return say('intention.suggestion', {}, lex);
    }
    case 'habit':
      return say('intention.habit', {}, lex);
    case 'emotion':
      return say('intention.emotion', {}, lex);
    case 'material':
      return lex?.materialMeaning !== undefined
        ? say('intention.material.named', { material: lex.materialMeaning }, lex)
        : say('intention.material', {}, lex);
    case 'precommit':
      return say('intention.precommit', {}, lex);
    case 'expectation':
      return say('intention.expectation', {}, lex);
    default:
      return say('intention.default', {}, lex);
  }
}

/**
 * A plain intention is a sentence; legacy intentions remain phrases for existing hosts.
 * Host-authored sentences pass through. This renderer never changes the record or RNG.
 */
export function intentionFor(p: Person, record: DecisionRecord, lexicon?: Lexicon): string {
  const lex = lexicon ?? p.lexicon;
  const selected: { key?: string } = {};
  const phrase = intentionPhrase(p, record, lex, selected);
  if (selected.key !== undefined && lex?.lines?.[selected.key] !== undefined) return phrase;
  if (!lex?.plainEnglish || /[.!?]$/.test(phrase)) return phrase;
  if (phrase === 'nothing to do') return 'There is nothing for me to do.';
  if (phrase === 'to earn') return 'I want to earn money.';
  if (phrase.startsWith('to ')) return `I want ${phrase}.`;
  if (phrase.startsWith('because ')) return `I am doing this ${phrase}.`;
  if (phrase.startsWith('for ')) return `I am doing this ${phrase}.`;
  if (phrase === 'out of habit') return 'I am doing this out of habit.';
  return `My reason is ${phrase}.`;
}

function citeEpisode(
  p: Person,
  ids: readonly string[] | undefined,
  key: string,
  lex: Lexicon | undefined,
): string | undefined {
  if (!ids || ids.length === 0) return undefined;
  const ep: Episode | undefined =
    p.memory.episodes.find((e) => e.id === ids[0]) ?? p.memory.gists?.find((g) => g.id === ids[0]);
  if (!ep) return undefined;
  const summary = ep.summary.endsWith('.') ? ep.summary : `${ep.summary}.`;
  return pickLine(
    ep.valence < 0 ? 'cite.bad' : 'cite.good',
    key,
    { summary: lex?.plainEnglish ? summary : lowerFirst(summary) },
    lex,
  );
}

/** A rival within this fraction of the chosen utility makes the choice "a close call". */
const CLOSE_CALL_FRACTION = 0.2;
/** Smallest expectation term that counts as memory having moved the choice. */
const CITE_MIN_EXPECTATION = 0.02;

/** First-person narration of a decision record. Deterministic by the decision id. */
export function narrateDecision(p: Person, record: DecisionRecord, lexicon?: Lexicon): string {
  const lex = lexicon ?? p.lexicon;
  const id = record.id;
  const chosen = record.considered.find((c) => c.affordanceId === record.chosenAffordanceId);
  if (!chosen) {
    const vetoed = record.considered.find((c) => c.vetoed);
    if (vetoed?.vetoed?.reason === 'dead') return '';
    return pickLine('decision.nothing', id, {}, lex);
  }
  const parts: string[] = [];
  const top = topTerm(chosen);
  const source = top?.source ?? 'preference';
  const kind = source.split(':')[0] ?? '';
  const rest = source.slice(source.indexOf(':') + 1);
  // Under insistence the reason is the voice, not the top term (which belongs to what they wanted).
  if (record.suggestion?.verdict === 'complied') parts.push(pickLine('decision.complied', id, {}, lex));
  else if (record.suggestion?.verdict === 'commanded')
    parts.push(pickLine('decision.commanded', id, {}, lex));
  else if (kind === 'need')
    parts.push(
      pickLine(source, id, { need: rest }, lex, 0, phraseLine('need:fallback', { need: rest }, lex)),
    );
  else if (kind === 'norm')
    parts.push(
      linesFor(`normFulfil:${rest}`, lex).length > 0
        ? pickLine(`normFulfil:${rest}`, id, {}, lex)
        : pickLine('normFulfil:default', id, {}, lex),
    );
  else if (kind === 'commitment') parts.push(pickLine('decision.commitment', id, {}, lex));
  else if (kind === 'goal') parts.push(pickLine('decision.goal', id, {}, lex));
  else if (kind === 'social') parts.push(pickLine('decision.social', id, { who: nameOf(p, rest, lex) }, lex));
  else if (kind === 'suggestion') parts.push(pickLine('decision.suggestion', id, {}, lex));
  else if (kind === 'emotion') {
    // 'emotion:<id>:<tag>' (or legacy 'emotion:<tag>'): the lines are keyed by the tag.
    const tag = source.slice(source.lastIndexOf(':') + 1);
    parts.push(
      linesFor(`emotion:${tag}`, lex).length > 0
        ? pickLine(`emotion:${tag}`, id, {}, lex)
        : pickLine('emotion:default', id, {}, lex),
    );
  } else if (kind === 'material' && lex?.materialMeaning !== undefined)
    parts.push(pickLine('source:material.named', id, { material: lex.materialMeaning }, lex));
  else
    parts.push(
      linesFor(`source:${source}`, lex).length > 0
        ? pickLine(`source:${source}`, id, {}, lex)
        : pickLine('source:preference', id, {}, lex),
    );

  // Mention what was weighed against, if a rival came within a fifth of the chosen utility (not on reviews).
  const rival = record.considered.find((c) => c.affordanceId !== chosen.affordanceId && !c.vetoed);
  if (
    !record.review &&
    rival &&
    rival.utility > 0 &&
    chosen.utility - rival.utility < CLOSE_CALL_FRACTION * chosen.utility
  ) {
    parts.push(pickLine('decision.closeCall', id, {}, lex, 1));
  }
  // Memory is cited only when it moved this choice (a non-zero expectation term).
  if (chosen.terms.some((t) => t.source === 'expectation' && Math.abs(t.value) >= CITE_MIN_EXPECTATION)) {
    const cite = citeEpisode(p, chosen.recalled, id, lex);
    if (cite) parts.push(cite);
  }
  // A strong avoided option with memory behind it is also worth citing.
  for (const c of record.considered) {
    if (c === chosen || !c.recalled || c.recalled.length === 0) continue;
    const neg = c.terms.find((t) => t.source === 'expectation' && t.value < 0);
    if (!neg) continue;
    const other = citeEpisode(p, c.recalled, id, lex);
    if (other) parts.push(other);
    break;
  }
  return parts.join(' ');
}

/** The person's spoken reply to a suggestion. */
export function voiceLine(p: Person, res: SuggestionResolution, key = res.reason, lexicon?: Lexicon): string {
  const lex = lexicon ?? p.lexicon;
  if (lex?.variety && (res.verdict === 'assented' || res.verdict === 'deferred'))
    key = `${p.id}:${p.now}:${p.traits.extraversion}:${p.traits.honesty}:${key}`;
  const trust = p.will.voices.find((v) => v.voiceId === res.voiceId)?.trust ?? 0.5;
  switch (res.verdict) {
    case 'assented':
      return pickLine(trust >= 0.6 ? 'voice.assented.trusted' : 'voice.assented', key, {}, lex);
    case 'complied':
      return pickLine('voice.complied', key, {}, lex);
    case 'commanded':
      return pickLine(
        (res.margin ?? 0) > 0.3 ? 'voice.commanded.reluctant' : 'voice.commanded',
        key,
        {},
        lex,
      );
    case 'deferred': {
      const after = res.counterOffer?.label ?? phraseLine('voice.deferred.default', {}, lex);
      return pickLine('voice.deferred', key, { After: capitalize(after), after }, lex);
    }
    case 'modified': {
      const alt = res.counterOffer?.label ?? phraseLine('voice.modified.default', {}, lex);
      return pickLine('voice.modified', key, { alt: lex?.plainEnglish ? alt : lowerFirst(alt) }, lex);
    }
    case 'refused': {
      if (res.reason === 'distrust') {
        const ep = res.episodeId ? p.memory.episodes.find((e) => e.id === res.episodeId) : undefined;
        if (ep)
          return pickLine(
            'voice.distrust.episode',
            key,
            {
              what: lex?.plainEnglish
                ? ep.summary.replace(/[.!?]$/, '')
                : lowerFirst(ep.summary.replace(/\.$/, '')),
            },
            lex,
          );
        return pickLine('voice.distrust', key, {}, lex);
      }
      if (res.kind === 'willNot' && res.commitmentId !== undefined) {
        const duty = p.agenda.commitments.find((c) => c.id === res.commitmentId);
        const what =
          duty?.kind === 'worship'
            ? (duty.label ?? phraseLine('voice.omission.prayer', {}, lex))
            : duty?.label
              ? duty.label
              : phraseLine('voice.omission.default', {}, lex);
        return pickLine('voice.omission', key, { what: labelLine(what, lex) }, lex);
      }
      if (res.kind === 'willNot' && res.reason.startsWith('duty:')) {
        // An abstention held as a duty (the fast): the veto names what is being kept, not a forbidden act.
        const normId = res.reason.slice(5);
        const what =
          linesFor(`normLabel:${normId}`, lex).length > 0
            ? phraseLine(`normLabel:${normId}`, {}, lex)
            : phraseLine('normLabel:default', {}, lex);
        return pickLine('voice.duty', key, { what }, lex);
      }
      if (res.kind === 'willNot') {
        const normId = res.reason.startsWith('norm:') ? res.reason.slice(5) : '';
        const verb =
          linesFor(`normVerb:${normId}`, lex).length > 0
            ? phraseLine(`normVerb:${normId}`, {}, lex)
            : phraseLine('normVerb:default', {}, lex);
        return pickLine('voice.willNot', key, { verb }, lex);
      }
      if (res.reason === 'asleep') return phraseLine('voice.asleep', {}, lex);
      if (res.reason === 'commanded') return pickLine('voice.underOrders', key, {}, lex);
      if (res.reason === 'break') return pickLine('voice.break', key, {}, lex);
      if (res.reason === 'downed') return pickLine('voice.downed', key, {}, lex);
      if (linesFor(`needFirst:${res.reason}`, lex).length > 0)
        return phraseLine(`needFirst:${res.reason}`, {}, lex);
      if (res.reason === 'need:survival') return phraseLine('voice.survival', {}, lex);
      if (res.reason === 'not-sleepy') return phraseLine('voice.notSleepy', {}, lex);
      if (res.reason === 'unavailable') return pickLine('voice.unavailable', key, {}, lex);
      if (res.reason === 'invalid') return phraseLine('voice.invalid', {}, lex);
      if (res.reason === 'capacity') return pickLine('voice.capacity', key, {}, lex);
      if (res.reason.startsWith('skill:')) return phraseLine('voice.skill', {}, lex);
      if (res.reason === 'dead') return '';
      return pickLine('voice.cannot', key, {}, lex);
    }
  }
}

/** Short UI summary of a person's state. */
export function describePerson(p: Person, lexicon?: Lexicon): string {
  const lex = lexicon ?? p.lexicon;
  const b = p.body;
  const bits: string[] = [];
  if (!b.alive) return phraseLine('describe.dead', { name: p.name }, lex);
  if (b.asleep) bits.push(phraseLine('describe.asleep', {}, lex));
  if (b.satiety < 0.3) bits.push(phraseLine('describe.hungry', {}, lex));
  if (b.hydration < 0.3) bits.push(phraseLine('describe.thirsty', {}, lex));
  if (b.sleepPressure > 0.7) bits.push(phraseLine('describe.tired', {}, lex));
  if (b.pain > 0.3) bits.push(phraseLine('describe.pain', {}, lex));
  const top = [...p.affect.emotions].sort((a, c) => c.intensity - a.intensity)[0];
  if (top && top.intensity > 0.2) bits.push(phraseLine('describe.feeling', { emotion: top.id }, lex));
  const act = p.activity
    ? `${p.activity.action}${p.activity.targetId ? ` (${p.activity.targetId})` : ''}`
    : phraseLine('describe.idle', {}, lex);
  if (lex?.plainEnglish) {
    const state = bits.length > 0 ? bits.join(', ') : phraseLine('describe.well', {}, lex);
    const activity = p.activity
      ? `${p.name} is doing this: ${p.activity.affordance.label}${p.activity.targetId ? ` (${nameOf(p, p.activity.targetId, lex)})` : ''}.`
      : `${p.name} is ${phraseLine('describe.idle', {}, lex)}.`;
    return phraseLine(
      'describe.line',
      { name: p.name, act: lex.lines?.['describe.line'] ? act : activity, state },
      lex,
    );
  }
  const state = bits.length > 0 ? bits.join(', ') : phraseLine('describe.well', {}, lex);
  return phraseLine('describe.line', { name: p.name, act, state }, lex);
}

/**
 * SCOPE: a host-authored addressee form of an episode, selected only for its named actor.
 * Free text cannot safely be inflected. With no authored form, return the original summary.
 * This read-only helper neither recalls an episode nor changes its salience or RNG.
 */
export function recallLine(episode: Episode, toActor: string): string {
  return episode.actorId === toActor && episode.addressedSummary !== undefined
    ? episode.addressedSummary
    : episode.summary;
}
