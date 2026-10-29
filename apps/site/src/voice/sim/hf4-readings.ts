/** Detached, immutable Voice display data. Every actor reading comes from inspect or admitted public events. */
import type { DeepReadonly, Inspection, PersonAuthoring, StepResult } from '@adam0white/human-framework';
import { MINUTE_MS, type VoiceActiveWork, type VoiceRun } from './hf4-run.ts';

type HostView = Extract<Inspection['people'][number], { kind: 'host' }>;
type Parts = DeepReadonly<HostView>['parts'][number];
type Part<K extends Parts['select']> = Extract<Parts, { select: K }>['value'];
export type VoiceEvent = DeepReadonly<StepResult>['events'][number];
export type VoiceDecision = Extract<VoiceEvent['data'], { kind: 'decision' }>['decision'];
export type VoiceDay = Extract<VoiceEvent['data'], { kind: 'day-closed' }>['record'];
export type VoiceEpisode = DeepReadonly<PersonAuthoring['biography'][number]>;

export interface VoicePersonReading {
  id: string;
  name: string;
  alive: boolean;
  at: number;
  minute: number;
  identity: DeepReadonly<PersonAuthoring['identity']>;
  body: DeepReadonly<Part<'body'>['state']>;
  bodyReadout: DeepReadonly<Part<'body'>['readout']>;
  affect: DeepReadonly<Part<'affect'>>;
  expectations: DeepReadonly<Part<'expectations'>>;
  traits: DeepReadonly<Part<'traits'>>;
  heldNorms: DeepReadonly<Part<'heldNorms'>>;
  relationships: DeepReadonly<Part<'relationships'>['ties']>;
  voices: DeepReadonly<Part<'relationships'>['voices']>;
  advice: DeepReadonly<Part<'advice'>>;
  agenda: DeepReadonly<Part<'agenda'>>;
  needs: DeepReadonly<Part<'needs'>>;
  beliefs: DeepReadonly<Part<'beliefs'>>;
  sourceTrust: DeepReadonly<Part<'sourceTrust'>>;
  skills: DeepReadonly<Part<'skills'>>;
  active: VoiceActiveWork | undefined;
  days: readonly VoiceDay[];
  trace: readonly VoiceDecision[];
  episodeText: ReadonlyMap<string, { id: string; summary: string }>;
  narration: readonly VoiceEvent[];
}

/** Known authored text and actually attended summary events, never private memory snapshots. */
export function episodeText(
  opening: DeepReadonly<PersonAuthoring>,
  events: readonly VoiceEvent[],
): ReadonlyMap<string, { id: string; summary: string }> {
  const text = new Map(
    opening.biography.map((episode) => [episode.id, { id: episode.id, summary: episode.summary }]),
  );
  for (const event of events) {
    if (event.person !== opening.id || event.data.kind !== 'observation-attended') continue;
    const { episodeId, summary } = event.data;
    if (episodeId && summary) text.set(episodeId, { id: episodeId, summary });
  }
  return text;
}
function selected<K extends Parts['select']>(parts: readonly Parts[], key: K): DeepReadonly<Part<K>> {
  const part = parts.find((item) => item.select === key);
  if (!part) throw new Error(`Voice requested ${key} but HF did not return it.`);
  return part.value as DeepReadonly<Part<K>>;
}
export function voiceReadings(
  runtime: VoiceRun,
  opening: DeepReadonly<PersonAuthoring>,
  supplied?: ReturnType<VoiceRun['inspect']>,
): VoicePersonReading {
  const result =
    supplied ??
    runtime.inspect({
      perspective: { kind: 'host' },
      people: [opening.id],
      select: [
        'summary',
        'body',
        'affect',
        'expectations',
        'traits',
        'heldNorms',
        'relationships',
        'advice',
        'agenda',
        'needs',
        'beliefs',
        'sourceTrust',
        'skills',
      ],
    });
  const person = result.people.find((person) => person.id === opening.id);
  if (person?.kind !== 'host') throw new Error('Voice requires its explicit host reading.');
  const body = selected(person.parts, 'body');
  const relations = selected(person.parts, 'relationships');
  const { trace, days } = runtime.history(opening.id);
  const texts = episodeText(opening, runtime.events.slice(-2048));
  const active = runtime.active.get(opening.id);
  return {
    id: opening.id,
    name: selected(person.parts, 'summary').name,
    alive: selected(person.parts, 'summary').alive,
    at: result.at,
    minute: result.at / MINUTE_MS,
    identity: opening.identity,
    body: body.state,
    bodyReadout: body.readout,
    affect: selected(person.parts, 'affect'),
    expectations: selected(person.parts, 'expectations'),
    traits: selected(person.parts, 'traits'),
    heldNorms: selected(person.parts, 'heldNorms'),
    relationships: relations.ties,
    voices: relations.voices,
    advice: selected(person.parts, 'advice'),
    agenda: selected(person.parts, 'agenda'),
    needs: selected(person.parts, 'needs'),
    beliefs: selected(person.parts, 'beliefs'),
    sourceTrust: selected(person.parts, 'sourceTrust'),
    skills: selected(person.parts, 'skills'),
    active,
    days,
    trace,
    episodeText: texts,
    narration: runtime.events.slice(-256).filter((event) => event.person === opening.id),
  } as const;
}
