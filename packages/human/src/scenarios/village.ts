/**
 * SCOPE: a tiny headless reference world for tests: six places (home, field, well, kitchen, mosque,
 * forest), a shared food stock and a small set of actions (eat, drink, sleep, rest, wait, work-field,
 * forage, cook, pray, chat, help, steal-bread). Travel is not modelled; every option is offered to everyone.
 * Night foraging is risky. Outcomes use the world's own seeded RNG (never `Math.random`), so a run is
 * reproducible from the seeds. This is a fixture for exercising the framework, not a model of any village.
 */
import { prayerWindows } from '../agenda/index.ts';
import { readBody } from '../body/index.ts';
import { heldNorms } from '../conscience/index.ts';
import { chance, createRng, dayOf, minuteOfDay } from '../core/index.ts';
import type { World } from '../sim/index.ts';
import { successChance } from '../skills/index.ts';
import type {
  Activity,
  Affordance,
  Minute,
  Outcome,
  Percept,
  Person,
  PersonId,
  PersonSpec,
  RngState,
} from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../types.ts';

export const VILLAGE_DEFAULTS = {
  foodStock: 30,
  nightRisk: { chance: 0.5, severity: 0.5, kind: 'animal' },
  dayRisk: { chance: 0.05, severity: 0.3, kind: 'animal' },
  nightFrom: 20 * 60,
  nightTo: 5 * 60,
  /** Food units added by a successful field shift / forage / cook. */
  fieldYield: 6,
  forageYield: 1,
  cookYield: 1,
  /** Neighbours offered for chat and help (first n others by id). */
  neighbours: 2,
  /** Social and work options are offered only during these minutes of day. */
  dayFrom: 6 * 60,
  dayTo: 22 * 60,
  /** Everyone's job: a daily field shift window. */
  job: { from: 8 * 60, until: 16 * 60, importance: 0.8 },
  /** Coins per successful field shift. */
  wage: 5,
};

export interface VillageState {
  now: Minute;
  rng: RngState;
  food: number;
  /** Percepts queued per person, each delivered once. */
  queued: Record<PersonId, Percept[]>;
  /** Count of completed actions per person per action id (for tests). */
  completed: Record<PersonId, Record<string, number>>;
}

export interface Village extends World {
  state: VillageState;
  isNight(now: Minute): boolean;
  queue(personId: PersonId, percept: Percept): void;
}

export interface VillagerOptions {
  devout?: boolean;
  others?: PersonId[];
  now?: Minute;
  ageYears?: number;
  traits?: PersonSpec['traits'];
  values?: PersonSpec['values'];
  body?: PersonSpec['body'];
  needs?: PersonSpec['needs'];
  skills?: Record<string, number>;
  voices?: PersonSpec['voices'];
}

/** A 30-year-old villager spec with neighbour ties, farming/cooking skills and a 'player' voice. */
export function villagerSpec(
  id: PersonId,
  name: string,
  seed: number,
  opts: VillagerOptions = {},
): PersonSpec {
  const now = opts.now ?? 0;
  const devout = opts.devout ?? false;
  const practice = devout ? 0.9 : 0.05;
  const spec: PersonSpec = {
    id,
    name,
    seed,
    now,
    bornAt: now - (opts.ageYears ?? 30) * MINUTES_PER_YEAR,
    sex: seed % 2 === 0 ? 'female' : 'male',
    traits: { ...opts.traits },
    values: { tradition: devout ? 0.9 : 0.15, ...opts.values },
    norms: heldNorms({ practice }),
    skills: { farming: 0.4, cooking: 0.3, ...opts.skills },
    relationships: (opts.others ?? [])
      .filter((o) => o !== id)
      .map((o) => ({ otherId: o, roles: ['neighbor'] })),
    voices: opts.voices ?? [{ voiceId: 'player', trust: 0.5 }],
  };
  const day = dayOf(now);
  const V = VILLAGE_DEFAULTS;
  spec.commitments = [
    {
      id: 'job',
      kind: 'job',
      actions: ['work-field'],
      from: day * MINUTES_PER_DAY + V.job.from,
      until: day * MINUTES_PER_DAY + V.job.until,
      importance: V.job.importance,
      recurEvery: MINUTES_PER_DAY,
    },
  ];
  if (devout) spec.commitments.push(...prayerWindows(day).map((c, i) => ({ ...c, id: `prayer${i}` })));
  if (opts.body) spec.body = opts.body;
  if (opts.needs) spec.needs = opts.needs;
  return spec;
}

const isNightAt = (now: Minute): boolean => {
  const m = minuteOfDay(now);
  return m >= VILLAGE_DEFAULTS.nightFrom || m < VILLAGE_DEFAULTS.nightTo;
};

export function createVillage(
  people: readonly Person[],
  opts: { seed: number; foodStock?: number; state?: VillageState },
): Village {
  const ids = [...people.map((p) => p.id)].sort();
  // Resume from a saved state (plain JSON; `seed` and `foodStock` are then ignored), as `createTown` does.
  const state: VillageState = opts.state ?? {
    now: Math.min(...people.map((p) => p.now)),
    rng: createRng(opts.seed),
    food: opts.foodStock ?? VILLAGE_DEFAULTS.foodStock,
    queued: {},
    completed: {},
  };
  const V = VILLAGE_DEFAULTS;
  const neighboursOf = (id: PersonId): PersonId[] => ids.filter((o) => o !== id).slice(0, V.neighbours);
  const count = (pid: PersonId, action: string) => {
    const row = state.completed[pid] ?? {};
    state.completed[pid] = row;
    row[action] = (row[action] ?? 0) + 1;
  };
  const queue = (personId: PersonId, percept: Percept) => {
    const list = state.queued[personId] ?? [];
    state.queued[personId] = list;
    list.push(percept);
  };

  const affordancesFor = (p: Person): Affordance[] => {
    const now = p.now;
    state.now = Math.max(state.now, now);
    const night = isNightAt(now);
    const mod = minuteOfDay(now);
    const daytime = mod >= V.dayFrom && mod < V.dayTo;
    const out: Affordance[] = [
      {
        id: 'drink',
        action: 'drink',
        label: 'drink at the well',
        placeId: 'well',
        duration: 10,
        effort: 0.05,
        advertises: { water: 0.6 },
      },
      {
        id: 'sleep',
        action: 'sleep',
        label: 'sleep at home',
        placeId: 'home',
        duration: 480,
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.8, rest: 0.4 },
        tags: ['sleep'],
      },
      {
        id: 'rest',
        action: 'rest',
        label: 'rest at home',
        placeId: 'home',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.25, leisure: 0.1 },
        tags: ['rest', 'leisure'],
      },
      { id: 'wait', action: 'wait', label: 'wait', duration: 15, effort: 0, advertises: {} },
    ];
    if (daytime) {
      out.push({
        id: 'work-field',
        action: 'work-field',
        label: 'work the field',
        placeId: 'field',
        duration: 120,
        effort: 0.7,
        focus: 0.2,
        skill: { id: 'farming', difficulty: 0.3 },
        advertises: { competence: 0.1 },
        material: V.wage,
        tags: ['work', 'outdoors'],
      });
    }
    out.push(
      {
        id: 'forage',
        action: 'forage',
        label: night ? 'forage in the forest at night' : 'forage in the forest',
        placeId: 'forest',
        targetId: 'forest',
        duration: 90,
        effort: 0.5,
        advertises: { food: 0.3 },
        tags: night ? ['outdoors', 'novel', 'risky'] : ['outdoors', 'novel'],
        risk: night ? { ...V.nightRisk } : { ...V.dayRisk },
      },
      {
        id: 'pray',
        action: 'pray',
        label: 'pray at the mosque',
        placeId: 'mosque',
        duration: 15,
        effort: 0.1,
        focus: 0.3,
        advertises: { meaning: 0.1 },
        norms: [{ normId: 'salah', relation: 'fulfills' }],
        tags: ['worship'],
      },
    );
    if (state.food >= 1) {
      out.push({
        id: 'eat',
        action: 'eat',
        label: 'eat at the kitchen',
        placeId: 'kitchen',
        duration: 30,
        effort: 0.1,
        advertises: { food: 0.6 },
        tags: ['food'],
      });
    }
    if (state.food >= 1 && daytime) {
      out.push({
        id: 'cook',
        action: 'cook',
        label: 'cook in the kitchen',
        placeId: 'kitchen',
        duration: 45,
        effort: 0.3,
        focus: 0.4,
        skill: { id: 'cooking', difficulty: 0.3 },
        advertises: { competence: 0.08 },
        tags: ['work'],
      });
    }
    const neighbours = daytime ? neighboursOf(p.id) : [];
    for (const o of neighbours) {
      out.push({
        id: `chat:${o}`,
        action: 'chat',
        label: `chat with ${o}`,
        placeId: 'home',
        with: [o],
        duration: 30,
        effort: 0.1,
        advertises: { belonging: 0.3, leisure: 0.1 },
        tags: ['social', 'leisure'],
      });
    }
    const first = neighbours[0];
    if (first !== undefined) {
      out.push({
        id: `help:${first}`,
        action: 'help',
        label: `help ${first}`,
        placeId: 'field',
        targetId: first,
        duration: 45,
        effort: 0.4,
        advertises: { meaning: 0.2, esteem: 0.05 },
        norms: [{ normId: 'help-neighbor', relation: 'fulfills' }],
        tags: ['help', 'service'],
      });
      out.push({
        id: `apologize:${first}`,
        action: 'apologize',
        label: `apologize to ${first}`,
        placeId: 'home',
        targetId: first,
        duration: 15,
        effort: 0.1,
        advertises: {},
        tags: ['repair', 'apologize'],
      });
      out.push({
        id: `steal-bread:${first}`,
        action: 'steal-bread',
        label: `take bread from ${first}'s house`,
        placeId: 'home',
        targetId: first,
        duration: 20,
        effort: 0.2,
        advertises: { food: 0.5 },
        norms: [{ normId: 'theft', relation: 'violates' }],
        tags: ['risky'],
        material: 1,
      });
    }
    return out;
  };

  const resolve = (p: Person, act: Activity, reason: 'ended' | 'interrupted'): Outcome => {
    const now = p.now;
    state.now = Math.max(state.now, now);
    const aff = act.affordance;
    const base: Outcome = {
      affordanceId: act.affordanceId,
      action: act.action,
      status: 'completed',
      at: now,
    };
    if (act.targetId !== undefined) base.targetId = act.targetId;
    if (reason === 'interrupted') {
      // Partial work counts: a field shift left early yields and pays pro rata for the time put in.
      const span = Math.max(1, act.endsAt - act.startedAt);
      const progress = Math.max(0, Math.min(1, (now - act.startedAt) / span));
      const out: Outcome = { ...base, status: 'interrupted', summary: `${aff.label}: interrupted` };
      if (act.action === 'work-field' && progress > 0) {
        state.food += V.fieldYield * progress;
        out.material = V.wage * progress;
        out.needs = { competence: 0.1 * progress };
        out.summary = `${aff.label}: stopped ${Math.round(progress * 100)}% of the way through`;
      }
      return out;
    }
    const done = (o: Outcome) => {
      if (o.status === 'completed') count(p.id, act.action);
      return o;
    };
    const capacity = readBody(p).capacity;
    switch (act.action) {
      case 'eat':
        if (state.food >= 1) {
          state.food -= 1;
          return done({ ...base, needs: { food: 0.6 }, summary: 'ate at the kitchen' });
        }
        return { ...base, status: 'failed', summary: 'found the kitchen empty' };
      case 'drink':
        return done({ ...base, needs: { water: 0.6 }, summary: 'drank at the well' });
      case 'sleep':
        return done({ ...base, summary: 'slept' });
      case 'rest':
        return done({ ...base, needs: { leisure: 0.1 }, summary: 'rested' });
      case 'wait':
        return done({ ...base, summary: 'waited' });
      case 'work-field': {
        const ok = chance(state.rng, successChance(p, 'farming', 0.3, capacity));
        if (ok) {
          state.food += V.fieldYield;
          return done({
            ...base,
            needs: { competence: 0.1 },
            material: V.wage,
            summary: 'worked the field; a good shift',
          });
        }
        state.food += 1;
        return {
          ...base,
          status: 'failed',
          needs: { competence: 0.02 },
          summary: 'worked the field; a poor shift',
        };
      }
      case 'forage': {
        const risk = aff.risk ?? V.dayRisk;
        if (chance(state.rng, risk.chance)) {
          return {
            ...base,
            status: 'failed',
            injury: { part: 'leg', severity: risk.severity, healRatePerDay: 0.1 },
            summary: isNightAt(act.startedAt)
              ? 'went to the forest at night and got hurt by an animal'
              : 'got hurt by an animal in the forest',
          };
        }
        state.food += V.forageYield;
        return done({ ...base, needs: { food: 0.3 }, summary: 'foraged in the forest' });
      }
      case 'cook': {
        const ok = chance(state.rng, successChance(p, 'cooking', 0.3, capacity));
        if (ok) {
          state.food += V.cookYield;
          return done({ ...base, needs: { competence: 0.08 }, summary: 'cooked a good meal' });
        }
        return { ...base, status: 'failed', summary: 'burnt the meal' };
      }
      case 'pray':
        return done({ ...base, needs: { meaning: 0.1 }, summary: 'prayed at the mosque' });
      case 'apologize': {
        const other = act.targetId;
        if (other !== undefined) {
          queue(other, {
            at: now,
            channel: 'heard',
            kind: 'apology',
            actorId: p.id,
            targetId: other,
            valence: 0.3,
            salience: 0.6,
            summary: `${p.name} apologised`,
          });
        }
        return done({ ...base, summary: `apologised to ${other ?? 'a neighbour'}` });
      }
      case 'chat': {
        const other = aff.with?.[0];
        if (other !== undefined) {
          queue(other, {
            at: now,
            channel: 'heard',
            kind: 'chat',
            actorId: p.id,
            targetId: other,
            valence: 0.3,
            salience: 0.4,
            summary: `${p.name} stopped to chat`,
          });
        }
        return done({
          ...base,
          needs: { belonging: 0.3, leisure: 0.1 },
          summary: `chatted with ${other ?? 'a neighbour'}`,
        });
      }
      case 'help': {
        const other = act.targetId;
        if (other !== undefined) {
          queue(other, {
            at: now,
            channel: 'saw',
            kind: 'help',
            actorId: p.id,
            targetId: other,
            valence: 0.5,
            salience: 0.6,
            norms: [{ normId: 'help-neighbor', relation: 'fulfills' }],
            summary: `${p.name} helped with the work`,
          });
        }
        return done({
          ...base,
          needs: { meaning: 0.2, esteem: 0.05 },
          summary: `helped ${other ?? 'a neighbour'}`,
          percepts: other
            ? [
                {
                  at: now,
                  channel: 'heard',
                  kind: 'thanks',
                  actorId: other,
                  targetId: p.id,
                  valence: 0.3,
                  salience: 0.5,
                  summary: `${other} said thank you`,
                },
              ]
            : [],
        });
      }
      case 'steal-bread': {
        const other = act.targetId;
        if (other !== undefined) {
          queue(other, {
            at: now,
            channel: 'saw',
            kind: 'theft',
            actorId: p.id,
            targetId: other,
            valence: -0.5,
            salience: 0.8,
            norms: [{ normId: 'theft', relation: 'violates' }],
            summary: `${p.name} took bread from the house`,
          });
        }
        return done({ ...base, needs: { food: 0.5 }, material: 1, summary: 'took bread that was not mine' });
      }
      default:
        return done({ ...base, summary: `${aff.label}: done` });
    }
  };

  const perceptsFor = (p: Person, since: Minute, until: Minute): Percept[] => {
    state.now = Math.max(state.now, until);
    const list = state.queued[p.id];
    if (!list || list.length === 0) return [];
    const due = list.filter((x) => x.at <= until && x.at > since - 1);
    state.queued[p.id] = list.filter((x) => !due.includes(x));
    return due;
  };

  return {
    state,
    now: () => state.now,
    isNight: isNightAt,
    queue,
    affordancesFor,
    perceptsFor,
    resolve,
  };
}
