/**
 * Minimal host: one person, a hand-written World, one simulated day.
 *
 * Shows the host contract end to end: the host offers affordances, the person decides, the host resolves
 * what actually happened (an Outcome), and `stepCommunity` sequences decide / begin / tick / finish.
 * Run: `npm run build -w packages/human && node packages/human/examples/minimal.ts`.
 */
import {
  type Activity,
  type Affordance,
  createCommunity,
  createPerson,
  describePerson,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  minuteOfDay,
  type Outcome,
  type Percept,
  type Person,
  predict,
  stepCommunity,
  type World,
} from '@adam0white/human-framework';

const START = 7 * 60; // 07:00 on day 0

/** A one-room cottage. Every offer is the host's honest advertisement of typical effects. */
function cottage(): World & { log: string[] } {
  let clock = START;
  let pantry = 4;
  const log: string[] = [];
  const offers = (p: Person): Affordance[] => {
    clock = Math.max(clock, p.now);
    const list: Affordance[] = [
      // Zero-prerequisite floor offers: the framework expects hosts to always provide these.
      { id: 'wait', action: 'wait', label: 'wait', duration: 15, effort: 0, advertises: {} },
      {
        id: 'rest',
        action: 'rest',
        label: 'sit by the fire',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.3 },
      },
      {
        id: 'sleep',
        action: 'sleep',
        label: 'sleep',
        duration: 480,
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.8, rest: 0.4 },
      },
      {
        id: 'drink',
        action: 'drink',
        label: 'drink water',
        duration: 5,
        effort: 0,
        advertises: { water: 0.6 },
      },
      {
        id: 'mend',
        action: 'mend',
        label: 'mend nets for the harbour',
        duration: 120,
        effort: 0.3,
        focus: 0.4,
        skill: { id: 'craft', difficulty: 0.3 },
        advertises: { competence: 0.2 },
        tags: ['work'],
        material: 3,
      },
      {
        id: 'read',
        action: 'read',
        label: 'read a book',
        duration: 60,
        effort: 0,
        focus: 0.3,
        advertises: { leisure: 0.4 },
        tags: ['leisure'],
      },
    ];
    if (pantry > 0)
      list.push({
        id: 'eat',
        action: 'eat',
        label: 'eat bread',
        duration: 20,
        effort: 0,
        advertises: { food: 0.6 },
      });
    return list;
  };
  return {
    log,
    now: () => clock,
    affordancesFor: offers,
    perceptsFor: (p: Person, since: number, until: number): Percept[] => {
      // One event the person may notice: a neighbour drops off a gift mid-morning.
      const at = START + 150;
      if (!(since < at && at <= until)) return [];
      return [
        {
          at,
          channel: 'saw',
          kind: 'gift',
          actorId: 'neighbour',
          targetId: p.id,
          valence: 0.6,
          salience: 0.6,
          summary: 'the neighbour left a loaf at the door',
        },
      ];
    },
    resolve: (p: Person, act: Activity, reason: 'ended' | 'interrupted'): Outcome => {
      // World truth. Partial activities yield partial effects; body exertion and sleep are the framework's job.
      const done = Math.min(1, (p.now - act.startedAt) / Math.max(1, act.endsAt - act.startedAt));
      const out: Outcome = {
        affordanceId: act.affordanceId,
        action: act.action,
        status: reason === 'ended' ? 'completed' : 'interrupted',
        at: p.now,
      };
      if (act.action === 'eat') {
        pantry -= 1;
        out.needs = { food: 0.6 * done };
      }
      if (act.action === 'drink') out.needs = { water: 0.6 * done };
      if (act.action === 'mend' && reason === 'ended') out.material = 3;
      log.push(`${hhmm(p.now)} ${p.name} finished "${act.affordance.label}" (${out.status})`);
      return out;
    },
  };
}

const hhmm = (t: number): string => {
  const m = minuteOfDay(t);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function main(): string[] {
  const lines: string[] = [];
  const mira = createPerson({
    id: 'mira',
    name: 'Mira',
    seed: 7,
    now: START,
    bornAt: START - 34 * MINUTES_PER_YEAR,
    sex: 'female',
    skills: { craft: 0.5 },
    body: { satiety: 0.45, sleepPressure: 0.1 },
    voices: [{ voiceId: 'player', trust: 0.6 }],
  });
  lines.push(describePerson(mira));

  const world = cottage();
  // Telegraph before acting: `predict` is pure and consumes no randomness.
  const ask = { voiceId: 'player', action: 'mend', strength: 0.6 };
  const hint = predict(mira, world.affordancesFor(mira), ask);
  lines.push(`If told to mend nets now: ${hint.verdict} (${hint.reason}) - "${hint.says}"`);

  const c = createCommunity([mira]);
  // No voice this time: she runs her own day.
  const events = stepCommunity(c, world, START + MINUTES_PER_DAY);
  const begins = events.filter((e) => e.kind === 'begin');
  lines.push(`${begins.length} activities begun in one day; the first eight:`);
  for (const e of begins.slice(0, 8)) {
    const rec = mira.trace.find((r) => r.id === e.decisionId);
    lines.push(`  ${hhmm(e.at)} ${e.action}: ${rec?.narration ?? e.detail}`);
  }
  lines.push(...world.log.slice(0, 4).map((l) => `  ${l}`));
  lines.push(
    `End of day: ${mira.chronicle?.length ?? 0} closed day record(s), health ${mira.body.health.toFixed(2)}`,
  );
  return lines;
}

if (import.meta.main) for (const line of main()) console.log(line);
