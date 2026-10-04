/**
 * A small settlement lived by routine for decades (L5 control scenario), shared by longrun.test.ts (correctness) and
 * longrun.timing.ts (run time). Ages are spread so natural death happens at the real hazard; the host keeps the
 * population up with births; routines vary by season and age, with occasional help and quarrels.
 */
import {
  birth,
  type Community,
  createCommunity,
  createPerson,
  enableCharacterChange,
  enableGists,
  enableSkillConsolidation,
  enableYearbook,
  lifeStage,
  type Person,
  type Routine,
  type RoutineActivity,
} from '../src/index.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

export const START = 0;

/** Living people sorted by id, without `p`. */
const living = (c: Community, p: Person) => c.people.filter((q) => q.body.alive && q.id !== p.id);

/** A symmetric friend circle: the two living neighbours on each side in id order. */
function circle(c: Community, p: Person): string[] {
  const alive = c.people.filter((q) => q.body.alive);
  const i = alive.findIndex((q) => q.id === p.id);
  const n = alive.length;
  if (n < 2) return [];
  const out = new Set<string>();
  for (const k of [-2, -1, 1, 2]) {
    const q = alive[(((i + k) % n) + n) % n];
    if (q && q.id !== p.id) out.add(q.id);
  }
  return [...out];
}

/** A routine for one day, by season (day of year) and life stage. */
export function routineFor(p: Person, day: number, c: Community): Routine {
  const winter = day % 365 >= 300 || day % 365 < 30;
  const stage = lifeStage(p);
  const friends = circle(c, p);
  const others = living(c, p);
  const one = others[day % Math.max(1, others.length)]?.id;
  const acts: RoutineActivity[] = [];
  if (stage === 'infant') {
    acts.push({ action: 'play', minutes: 60, with: friends.slice(0, 1), valence: 0.2 });
  } else if (stage === 'child' || stage === 'adolescent') {
    acts.push({ action: 'play', minutes: 180, with: friends.slice(0, 2), valence: 0.2, tags: ['play'] });
    acts.push({
      action: 'lessons',
      minutes: 120,
      skill: {
        id: 'letters',
        difficulty: Math.min(0.95, (p.skills.letters?.level ?? 0.05) + 0.1),
        domain: 'knowledge',
      },
      practice: { quality: 0.8 },
      keeps: true,
    });
  } else {
    const elder = stage === 'elder';
    acts.push({
      action: 'farm',
      minutes: winter ? 120 : elder ? 180 : 420,
      skill: { id: 'farming', difficulty: Math.min(0.95, (p.skills.farming?.level ?? 0.05) + 0.1) },
      with: friends.slice(0, 1),
      tags: ['work'],
      valence: winter ? -0.05 : 0.05,
      keeps: true,
    });
    if (winter)
      acts.push({
        action: 'carve',
        minutes: 180,
        skill: {
          id: 'carving',
          difficulty: Math.min(0.95, (p.skills.carving?.level ?? 0.05) + 0.1),
          domain: 'motor',
        },
      });
    acts.push({ action: 'supper', minutes: 90, with: friends.slice(1, 3), valence: 0.1 });
  }
  acts.push({ action: 'pray', minutes: 30, valence: 0.05 });
  if (one) {
    acts.push({
      action: 'help',
      minutes: 60,
      chance: 0.04,
      with: [one],
      social: 'help',
      valence: 0.4,
      summary: 'helped a neighbour',
    });
    acts.push({
      action: 'quarrel',
      minutes: 20,
      chance: 0.02,
      with: [one],
      social: 'conflict',
      valence: -0.5,
      summary: 'a quarrel',
    });
  }
  acts.push({ action: 'skip work', minutes: 0, chance: 0.03, keeps: false });
  acts.push({
    action: 'bad harvest news',
    minutes: 0,
    chance: winter ? 0.01 : 0,
    valence: -0.6,
    summary: 'the stores ran low',
  });
  return { activities: acts };
}

const enableLongLife = (p: Person): void => {
  enableGists(p);
  enableYearbook(p);
  enableCharacterChange(p);
  enableSkillConsolidation(p);
};

/** A deterministic spread of 0.25..0.75 for founder `i`, trait slot `k`. */
const spread = (i: number, k: number): number => 0.25 + (((i + 1) * (k + 3) * 7919) % 101) / 200;

/** `n` founders aged `minAge..maxAge` with varied traits, gists, yearbook, character change and consolidation on. */
export function settlement(n = 25, seed = 1, minAge = 0, maxAge = 70): Community {
  const people: Person[] = [];
  const span = maxAge - minAge + 1;
  for (let i = 0; i < n; i++) {
    const ageYears = minAge + ((i * 37 + seed * 11) % span);
    const p = createPerson({
      id: `f${String(i).padStart(2, '0')}`,
      name: `F${i}`,
      seed: seed * 1000 + i,
      now: START,
      bornAt: START - ageYears * MINUTES_PER_YEAR - i * 977,
      sex: i % 2 === 0 ? 'female' : 'male',
      traits: {
        honesty: spread(i, 0),
        emotionality: spread(i, 1),
        extraversion: spread(i, 2),
        agreeableness: spread(i, 3),
        conscientiousness: spread(i, 4),
        openness: spread(i, 5),
      },
    });
    enableLongLife(p);
    people.push(p);
  }
  return createCommunity(people);
}

const ageOf = (p: Person, at: number) => (at - p.life.bornAt) / MINUTES_PER_YEAR;

/**
 * Dawn hook: on the first day of each year, while fewer than `target` live, up to three couples aged 20..40 have a
 * child. Ids and seeds come from the number of children already in the community, so a resumed run continues them.
 */
export function births(target = 25) {
  return (c: Community, day: number, at: number) => {
    if (day % 365 !== 0) return;
    const alive = c.people.filter((q) => q.body.alive);
    let room = Math.min(3, target - alive.length);
    const fertile = alive.filter((q) => ageOf(q, at) >= 20 && ageOf(q, at) <= 40);
    const mothers = fertile.filter((q) => q.life.sex === 'female');
    const fathers = fertile.filter((q) => q.life.sex === 'male');
    for (let k = 0; room > 0 && k < Math.min(mothers.length, fathers.length); k++, room--) {
      const a = mothers[(k + day) % mothers.length];
      const b = fathers[(k + day) % fathers.length];
      if (!a || !b) break;
      const n = c.people.filter((q) => q.id.startsWith('k')).length + 1;
      const child = birth(c, a, b, {
        id: `k${String(n).padStart(3, '0')}`,
        name: `K${n}`,
        seed: 50_000 + n,
        bornAt: at,
        now: at,
      });
      enableLongLife(child);
    }
  };
}

export const YEAR = MINUTES_PER_YEAR;
export const DAY = MINUTES_PER_DAY;
