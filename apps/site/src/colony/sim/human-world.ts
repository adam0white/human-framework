/**
 * The host world for the Human side (spec §5): affordances with travel folded into duration, percepts
 * (adhan, injury, help/thanks, meals, weather) and outcomes with host-owned truth. The framework decides;
 * this file only says what is on offer, what people perceive and what actually happened.
 *
 * Purity: `affordancesFor` reads state only (no rolls, no writes), so `preview` stays a pure telegraph.
 * All randomness here is `scenarioRoll` keyed by tag, minute and subject, so replays are identical.
 */
import {
  type Activity,
  type Affordance,
  type BeginOptions,
  type Community,
  consume,
  type DecisionRecord,
  interruptPerson,
  type JointProposal,
  jointSuccessChance,
  mirrorAffordance,
  type Outcome,
  type Percept,
  type Person,
  readPerson,
  skillLevel,
  type World,
} from '@human/framework';
import { fw, gm, STRENGTH } from './human-cast.ts';
import { findPath, type GameMap, type PlaceId, spotFor, type Tile } from './map.ts';
import {
  type ActionId,
  BEAM_STAGE,
  DAWN_MEAL,
  HOUSE_FAMILY,
  HOUSE_STAGES,
  homeDoor,
  homeOf,
  isNight,
  JOBS,
  type Minute,
  nextStageCost,
  type SideWorld,
  SQUALL_END,
  SQUALL_START,
  START_CLOCK,
  STOREROOM_STAGES,
  STORM_END,
  STORM_START,
  STORM_SUPPER,
  scenarioRoll,
  siteOpen,
  stageKind,
  stormNoCook,
  VILLAGERS,
  type VillagerId,
  type VillagerSpec,
  villagerId,
  WARNING_AT,
  weatherAt,
} from './world-types.ts';

// ---------------------------------------------------------------------------------------------
// Host numbers (engineering choices, spec §5 table where it gives them)
// ---------------------------------------------------------------------------------------------

export const HOST = {
  /** Work minutes per job (spec §5; travel is added per person). */
  work: {
    'gather-grain': 60,
    'gather-timber': 60,
    'fell-cedar': 90,
    'draw-water': 20,
    cook: 40,
    build: 60,
    'raise-beam': 45,
    'shutter-house': 40,
    eat: 20,
    drink: 10,
    pray: 15,
    'tend-injured': 30,
    'take-grain': 15,
    rest: 15,
  } as Record<string, number>,
  /** Cooking one pot (shared with Classic, v2 plan §2): 2 grain + 1 water → 4 meals. */
  cookGrain: JOBS.cook.consumes?.grain ?? 2,
  cookWater: JOBS.cook.consumes?.water ?? 1,
  cookMeals: JOBS.cook.yields?.meals ?? 4,
  /** Cooking is on offer while the store holds fewer meals than this; from the warning, she cooks for the storm. */
  cookBelow: 6,
  cookBelowStorm: 12,
  /**
   * Satiety a meal and a handful of raw grain restore. The spec's 0.6 / 0.25 assumed a slower body; the
   * framework burns ~0.17 satiety per hour of heavy work, so a 0.6 meal lasted ~2.5 h of felling.
   */
  mealFood: 0.8,
  rawFood: 0.3,
  /**
   * Stages of progress per 60-minute build session: base + gain × building skill (× quality), by stage kind
   * (v2 plan §2). These are `STAGE_COST` work at 0.6 + 0.8 × skill work-minutes per minute: 36/W and 48/W.
   */
  buildRate: { wall: { base: 0.3, gain: 0.4 }, roof: { base: 0.06, gain: 0.08 } },
  /** Timber the beam takes (stage timber comes from `nextStageCost`). */
  beamTimber: 2,
  /** Sleep in the crowded masjid restores less (v2 plan §11, assumed). */
  crowdedSleep: 0.5,
  /** Carrying a grown man home takes this much strength (host physical fact). */
  carryStrength: 0.6,
  carryMin: 45,
  /** Minutes of felling left within which an interrupted feller still brings the cedar down. */
  cedarLastStrokes: 5,
  /** Cedar and beam rolls (shared with Classic for the cedar). */
  cedarInjuryChance: 0.5,
  cedarInjury: 0.6,
  beamInjuryChance: 0.2,
  /** Exposure rolls during risky weather, every 10 minutes outdoors (as Classic), ×1.5 under protest. */
  exposureChance: 0.3,
  exposureSeverity: 0.05,
  protestRisk: 1.5,
  protestQuality: 0.7,
  /** Minutes a carried casualty recovers at home before working again. */
  recoverMinutes: 120,
  /** Pray is offered from this many minutes before a worship window opens. */
  prayLead: 10,
  /** Sleep is offered from this minute of day (and before 05:00). */
  sleepFrom: 21 * 60 + 45,
  /** Within this many tiles an injury is seen (else heard). */
  seeTiles: 6,
};

// ---------------------------------------------------------------------------------------------
// Host state (plain JSON)
// ---------------------------------------------------------------------------------------------

export interface Trip {
  from: Tile;
  to: Tile;
  /** Framework minute the activity began. */
  startedAt: number;
  travel: number;
  placeId: PlaceId | null;
  affordanceId: string;
  action: string;
  label: string;
  outdoors: boolean;
  protest: boolean;
  /** Scenario roll key (game minute): the order's issue minute for ordered risky work, else the start. */
  rollKey: Minute;
  /** carry-injured: the victim and the second leg home. */
  carry?: { victim: VillagerId; at: Tile; home: Tile };
}

export interface Casualty {
  kind: 'injury' | 'collapse';
  /** Framework minute. */
  since: number;
  tile: Tile;
  carriedBy: VillagerId | null;
}

export interface QueuedPercept {
  to: VillagerId[];
  /** Recipients already handed it (a person can have two events in one minute). */
  got: VillagerId[];
  pc: Percept;
}

export interface HostEvents {
  injuries: { personId: VillagerId; kind: 'collapse' | 'injury' | 'weather'; minute: Minute }[];
  /** carry-injured completions (moment 1 is judged by the side). */
  carried: { carrier: VillagerId; victim: VillagerId; minute: Minute; hunger: number }[];
  beams: { lead: VillagerId; partners: VillagerId[]; ok: boolean; minute: Minute }[];
  /** Outcomes of activities a player order led to (to settle cards). */
  finished: { personId: VillagerId; action: string; status: Outcome['status']; startedAt: number }[];
}

export interface HostState {
  loc: Record<string, Tile>;
  trip: Record<string, Trip | null>;
  down: Record<string, Casualty | null>;
  /** Framework minute until which a carried casualty recovers at home. */
  recovering: Record<string, number>;
  /** Fraction of the next house stage. */
  build: number;
  /** Whether the timber for the stage under way is already on site. */
  buildPaid: boolean;
  beamAttempts: number;
  /** Exposure hits during the current activity (folded into its outcome as a weather injury). */
  exposure: Record<string, number>;
  percepts: QueuedPercept[];
  /** Order issue minutes keyed by person, set by the side so risky ordered work shares Classic's roll. */
  orderKey: Record<string, Minute | null>;
  /** Minutes already cut into the cedar (the notch stays when a feller stops). */
  cedarWork: number;
  /** Roll key of the first ordered cedar session; later sessions on the same notch keep it (Classic fells in one go). */
  cedarKey?: Minute;
  /** Set once build progress counts toward the Day-3 store-room (the house's leftover fraction is dropped). */
  storeroom?: boolean;
  /** House stage when build progress was last written (storm decay can drop the stage under it). */
  buildStage?: number;
}

export function createHostState(villagers: readonly VillagerSpec[]): HostState {
  const s: HostState = {
    loc: {},
    trip: {},
    down: {},
    recovering: {},
    build: 0,
    buildPaid: false,
    beamAttempts: 0,
    exposure: {},
    percepts: [],
    orderKey: {},
    cedarWork: 0,
  };
  for (const v of villagers) {
    s.loc[v.id] = homeDoor(v);
    s.trip[v.id] = null;
    s.down[v.id] = null;
    s.recovering[v.id] = 0;
    s.exposure[v.id] = 0;
    s.orderKey[v.id] = null;
  }
  return s;
}

const NAMES: Record<string, string> = Object.fromEntries(VILLAGERS.map((v) => [v.id, v.name]));
const firstName = (id: string): string => (NAMES[id] ?? id).replace(/^Hajja /, '');
const specOf = (id: string): VillagerSpec => {
  const v = VILLAGERS.find((x) => x.id === id);
  if (!v) throw new Error(`unknown villager ${id}`);
  return v;
};
/** What a gathering session brings in: the shared yield, one less under protest. */
const gathered = (what: 'grain' | 'timber', protest: boolean): number => {
  const y =
    (what === 'grain' ? JOBS['gather-grain'].yields?.grain : JOBS['gather-timber'].yields?.timber) ?? 0;
  return protest ? y - 1 : y;
};
const tileKey = (t: Tile): string => `${t.x},${t.y}`;
const sameTile = (a: Tile, b: Tile): boolean => a.x === b.x && a.y === b.y;
const dist = (a: Tile, b: Tile): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Need deltas the host realizes on completion (sleep and rest are measured by the framework). */
function realizedNeeds(aff: Affordance): Outcome['needs'] {
  const out: NonNullable<Outcome['needs']> = {};
  for (const [k, v] of Object.entries(aff.advertises)) {
    if (k === 'sleep' || k === 'rest' || v === undefined) continue;
    out[k as keyof typeof out] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The World adapter
// ---------------------------------------------------------------------------------------------

export class ColonyHostWorld implements World {
  /** Path cache (derived from the static map; never snapshotted). */
  private paths = new Map<string, Tile[] | null>();
  events: HostEvents = { injuries: [], carried: [], beams: [], finished: [] };
  /** Framework clock the side last stepped to. */
  clock = fw(0);
  /** Set by the side: an ordered job just ended, so its standing suggestion stops at once. */
  onOrderDone: ((personId: VillagerId, action: string, startedAt: number) => void) | null = null;

  readonly seed: number;
  readonly map: GameMap;
  readonly world: SideWorld;
  s: HostState;
  community: Community;

  constructor(seed: number, map: GameMap, world: SideWorld, s: HostState, community: Community) {
    this.seed = seed;
    this.map = map;
    this.world = world;
    this.s = s;
    this.community = community;
  }

  now(): number {
    return this.clock;
  }

  person(id: string): Person | undefined {
    return this.community.people.find((p) => p.id === id);
  }

  // --- geometry -------------------------------------------------------------------------------

  path(from: Tile, to: Tile): Tile[] | null {
    const key = `${tileKey(from)}>${tileKey(to)}`;
    let p = this.paths.get(key);
    if (p === undefined) {
      p = sameTile(from, to) ? [] : findPath(this.map, from, to);
      this.paths.set(key, p);
    }
    return p;
  }

  travel(from: Tile, to: Tile): number {
    const p = this.path(from, to);
    return p ? p.length : Number.POSITIVE_INFINITY;
  }

  /** Where a person is at framework minute `t` (walking the first leg(s) of their current trip). */
  posAt(id: string, t: number): Tile {
    const loc = this.s.loc[id] ?? { x: 0, y: 0 };
    const trip = this.s.trip[id];
    if (!trip) {
      const carrier = this.s.down[id]?.carriedBy;
      return carrier ? this.posAt(carrier, t) : loc;
    }
    const e = Math.max(0, t - trip.startedAt);
    const legs: Tile[] = [];
    if (trip.carry) {
      legs.push(...(this.path(trip.from, trip.carry.at) ?? []));
      legs.push(...(this.path(trip.carry.at, trip.carry.home) ?? []));
    } else legs.push(...(this.path(trip.from, trip.to) ?? []));
    if (e <= 0 || legs.length === 0) return e <= 0 ? trip.from : trip.to;
    return legs[Math.min(e, legs.length) - 1] ?? trip.to;
  }

  /** Whether `id` is walking (not yet at the place) at `t`. */
  walking(id: string, t: number): boolean {
    const trip = this.s.trip[id];
    if (!trip) return false;
    return t - trip.startedAt < trip.travel;
  }

  // --- affordances ------------------------------------------------------------------------------

  affordancesFor(p: Person): Affordance[] {
    const id = villagerId(p.id);
    const v = specOf(id);
    const t = p.now;
    const m = gm(t);
    const here = this.posAt(id, t);
    const out: Affordance[] = [];
    const w = this.world;
    const weather = weatherAt(m);

    if (this.s.down[id]) {
      out.push({
        id: 'lie-still',
        action: 'wait',
        label: 'lie still and wait for help',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.05 },
        tags: ['floor'],
      });
      return out;
    }

    const at = (place: PlaceId): { tile: Tile; travel: number } => {
      const tile = spotFor(place, v.index);
      return { tile, travel: this.travel(here, tile) };
    };
    const job = (
      affId: string,
      action: ActionId | 'drink' | 'tend-injured' | 'take-grain' | 'wait',
      label: string,
      place: PlaceId,
      extra: Omit<Affordance, 'id' | 'action' | 'label' | 'duration' | 'placeId'> & { work?: number },
    ): void => {
      const { travel } = at(place);
      if (!Number.isFinite(travel)) return;
      const { work, ...rest } = extra;
      // The walk itself is outdoors: in the storm every 10 minutes outside rolls exposure (see minute), so a trip
      // that crosses the storm advertises that risk honestly. Sheltering and carrying the hurt are exempt.
      if (
        travel > 0 &&
        !rest.risk &&
        action !== 'shelter' &&
        action !== 'carry-injured' &&
        m < STORM_END &&
        m + travel > STORM_START
      ) {
        rest.risk = {
          chance: Math.min(0.9, HOST.exposureChance * Math.ceil(travel / 10)),
          severity: 0.3,
          kind: 'storm',
        };
      }
      out.push({
        id: affId,
        action,
        label,
        placeId: place,
        duration: travel + (work ?? HOST.work[action] ?? 15),
        ...rest,
      });
    };

    const recovering = (this.s.recovering[id] ?? 0) > t;
    const night = isNight(m);
    const mod = ((t % 1440) + 1440) % 1440;
    const risky = weather.risky;

    // Maryam's meal duty: work elsewhere that would run into a pending meal leaves it undone (spec §7 M3).
    const mealDuty = (dur: number): boolean => {
      if (id !== 'maryam') return false;
      const cooksOtherwise = VILLAGERS.some(
        (o) =>
          o.id !== id && (o.skills.cooking ?? 0) > 0.3 && !this.s.down[o.id] && this.person(o.id)?.body.alive,
      );
      if (cooksOtherwise) return false;
      return p.agenda.commitments.some(
        (c) => c.status === 'pending' && c.actions.includes('cook') && t <= c.until && t + dur > c.from,
      );
    };
    const workNorms = (dur: number): Pick<Affordance, 'norms'> =>
      mealDuty(dur) ? { norms: [{ normId: 'abandon-dependents', relation: 'violates' }] } : {};

    // Body.
    if (w.resources.meals > 0 || w.resources.grain > 0) {
      const meal = w.resources.meals > 0;
      job('eat', 'eat', meal ? 'eat a meal' : 'eat raw grain', 'kitchen', {
        effort: 0.1,
        advertises: { food: meal ? HOST.mealFood : HOST.rawFood },
      });
    } else if (id !== 'danyal') {
      job('take-grain', 'take-grain', 'take grain from Danyal’s jar', 'wellhouse', {
        effort: 0.2,
        advertises: { food: HOST.rawFood },
        norms: [{ normId: 'theft', relation: 'violates' }],
        targetId: 'danyal',
      });
    }
    job('drink', 'drink', 'drink at the well', 'well', { effort: 0.1, advertises: { water: 0.5 } });
    out.push({
      id: 'rest',
      action: 'rest',
      label: 'rest a while',
      duration: HOST.work.rest ?? 15,
      effort: 0,
      advertises: { rest: 0.1 },
      tags: ['rest'],
    });
    const homePlace = homeOf(id, w, m);
    if (mod >= HOST.sleepFrom || mod < START_CLOCK) {
      const home = at(homePlace);
      const wake = Math.ceil((t - START_CLOCK) / 1440) * 1440 + START_CLOCK;
      const crowded = homePlace === 'masjid';
      if (Number.isFinite(home.travel)) {
        out.push({
          id: 'sleep',
          action: 'sleep',
          label: crowded
            ? 'sleep in the crowded masjid'
            : homePlace === 'site'
              ? 'sleep in the new house'
              : 'sleep at home',
          placeId: homePlace,
          duration: Math.max(30, wake - t),
          effort: 0,
          mode: 'sleep',
          advertises: { sleep: crowded ? HOST.crowdedSleep : 0.8 },
          tags: ['rest'],
        });
      }
    }

    // Worship: a pending worship window that is open or about to open.
    const due = p.agenda.commitments
      .filter(
        (c) => c.status === 'pending' && c.kind === 'worship' && t >= c.from - HOST.prayLead && t <= c.until,
      )
      .sort((a, b) => a.until - b.until)[0];
    if (due) {
      const place: PlaceId = id === 'danyal' ? 'wellhouse' : 'masjid';
      const { travel } = at(place);
      const wait = Math.max(0, due.from - (t + travel));
      job('pray', 'pray', `pray ${due.label ?? ''}`.trim(), place, {
        work: (HOST.work.pray ?? 15) + wait,
        effort: 0.1,
        advertises: { meaning: 0.2, belonging: place === 'masjid' ? 0.1 : 0 },
        tags: ['worship'],
        fulfills: [due.id],
      });
    }

    // Weather shelter.
    if (risky || (m >= WARNING_AT && m < STORM_END)) {
      const end = m < SQUALL_END && m >= SQUALL_START ? SQUALL_END : STORM_END;
      const inHouse = homePlace === 'site';
      job(
        'shelter',
        'shelter',
        inHouse ? 'shelter in the new house' : 'shelter in the masjid',
        inHouse ? 'site' : 'masjid',
        {
          work: Math.max(30, fw(end) - t),
          effort: 0,
          advertises: { safety: 0.4 },
          tags: ['indoors'],
        },
      );
    }

    // Casualties: carry the one lying out there, tend the one recovering at home.
    for (const o of VILLAGERS) {
      if (o.id === id) continue;
      const cas = this.s.down[o.id];
      if (cas && !cas.carriedBy && (STRENGTH[id] ?? 0) >= HOST.carryStrength && !recovering) {
        const toVictim = this.travel(here, cas.tile);
        const home = homeDoor(o);
        const haul = this.travel(cas.tile, home);
        if (Number.isFinite(toVictim) && Number.isFinite(haul)) {
          out.push({
            id: `carry:${o.id}`,
            action: 'carry-injured',
            label: `carry ${firstName(o.id)} home`,
            targetId: o.id,
            placeId: o.home,
            duration: Math.max(HOST.carryMin, toVictim + 2 * haul),
            effort: 0.8,
            advertises: { meaning: 0.2, belonging: 0.1 },
            tags: ['social', 'help', 'outdoors'],
            norms: [{ normId: 'aid-injured', relation: 'fulfills' }],
          });
        }
      }
      if ((this.s.recovering[o.id] ?? 0) > t && !this.s.down[o.id]) {
        job(`tend:${o.id}`, 'tend-injured', `tend ${firstName(o.id)}`, o.home, {
          effort: 0.2,
          advertises: { belonging: 0.1 },
          tags: ['social', 'help'],
          norms: [{ normId: 'aid-injured', relation: 'fulfills' }],
          targetId: o.id,
        });
      }
    }

    if (recovering) return out;

    // Work.
    const timberRisk = night || risky ? { chance: 0.3, severity: 0.5 } : { chance: 0.05, severity: 0.3 };
    const workJob = (
      affId: string,
      action: ActionId,
      label: string,
      place: PlaceId,
      extra: Omit<Affordance, 'id' | 'action' | 'label' | 'duration' | 'placeId'> & { work?: number },
    ): void => {
      const before = out.length;
      job(affId, action, label, place, extra);
      const a = out[before];
      if (a) Object.assign(a, workNorms(a.duration));
    };
    workJob('gather-grain', 'gather-grain', 'gather grain', 'field', {
      effort: 0.5,
      skill: { id: 'farming', difficulty: 0.3 },
      advertises: { competence: 0.1 },
      tags: ['work', 'outdoors'],
      ...(risky ? { risk: { chance: 0.3, severity: 0.4, kind: 'storm' } } : {}),
    });
    workJob('gather-timber', 'gather-timber', 'gather timber', 'forest', {
      effort: 0.7,
      skill: { id: 'forestry', difficulty: 0.4 },
      advertises: { competence: 0.1 },
      tags: ['work', 'outdoors'],
      risk: { ...timberRisk, kind: 'injury' },
    });
    if (!w.cedarFelled) {
      const cut = this.s.cedarWork;
      workJob(
        'fell-cedar',
        'fell-cedar',
        cut > 0 ? 'finish felling the cedar' : 'fell the big cedar',
        'cedar',
        {
          work: (HOST.work['fell-cedar'] ?? 90) - cut,
          effort: 0.8,
          skill: { id: 'forestry', difficulty: 0.8 },
          advertises: { competence: 0.2, esteem: 0.1 },
          tags: ['work', 'outdoors', 'risky'],
          risk: { chance: 0.5, severity: 0.6, kind: 'injury' },
        },
      );
    }
    workJob('draw-water', 'draw-water', 'draw water', 'well', {
      effort: 0.4,
      advertises: { competence: 0.05 },
      tags: ['work'],
    });
    const meal = p.agenda.commitments.find(
      (c) => c.status === 'pending' && c.actions.includes('cook') && t >= c.from - 30 && t <= c.until,
    );
    // A full store needs no cook, unless a meal is due on the cook's own duty. From the warning she cooks for the
    // storm; in the storm the fire is out.
    const potLow =
      w.resources.meals < (m >= WARNING_AT ? HOST.cookBelowStorm : HOST.cookBelow) || meal !== undefined;
    if (
      !stormNoCook(m) &&
      potLow &&
      w.resources.grain >= HOST.cookGrain &&
      w.resources.water >= HOST.cookWater
    ) {
      job('cook', 'cook', meal?.label ?? 'cook a pot', 'kitchen', {
        effort: 0.3,
        skill: { id: 'cooking', difficulty: 0.4 },
        advertises: { competence: 0.1, belonging: 0.1 },
        tags: ['work', 'indoors'],
        norms: [{ normId: 'feed-village', relation: 'fulfills' }],
        ...(meal ? { fulfills: [meal.id] } : {}),
      });
    }
    const stage = w.house.stage;
    const beamDue = w.storeroom === null && stage === BEAM_STAGE - 1;
    if (!beamDue && siteOpen(w) && (this.s.buildPaid || w.resources.timber >= nextStageCost(w).timber)) {
      workJob('build', 'build', w.storeroom === null ? 'build the house' : 'build the store-room', 'site', {
        effort: 0.7,
        skill: { id: 'building', difficulty: 0.5 },
        advertises: { competence: 0.15 },
        tags: ['work', 'outdoors'],
        risk: { chance: 0.05, severity: 0.3, kind: 'injury' },
      });
    }
    if (beamDue && w.resources.timber >= HOST.beamTimber) {
      if (skillLevel(p, 'building') >= 0.5) {
        workJob('raise-beam', 'raise-beam', 'raise the beam alone', 'site', {
          effort: 0.9,
          skill: { id: 'building', difficulty: 0.8 },
          advertises: { competence: 0.2 },
          tags: ['work', 'outdoors', 'risky'],
          risk: { chance: 0.3, severity: 0.5, kind: 'injury' },
        });
        for (const partner of this.beamPartners(id, t)) {
          workJob(
            `raise-beam-with:${partner}`,
            'raise-beam',
            `raise the beam with ${firstName(partner)}`,
            'site',
            {
              effort: 0.7,
              skill: { id: 'building', difficulty: 0.4 },
              advertises: { competence: 0.2, belonging: 0.15 },
              tags: ['work', 'outdoors', 'social', 'joint'],
              with: [partner],
              risk: { chance: 0.1, severity: 0.4, kind: 'injury' },
            },
          );
        }
      }
    }
    if (m >= WARNING_AT && !w.house.shuttered) {
      workJob('shutter-house', 'shutter-house', 'shutter the house', 'site', {
        effort: 0.6,
        skill: { id: 'building', difficulty: 0.3 },
        advertises: { safety: 0.2 },
        tags: ['work', 'outdoors'],
      });
    }
    this.weatherRisk(out, m);
    // In the storm the store is eaten where people shelter (v2 plan §2): no walk, no fire.
    if (m >= STORM_START && m < STORM_END && w.resources.meals > 0) {
      out.push({
        id: 'eat-shelter',
        action: 'eat',
        label: 'eat from the store',
        duration: HOST.work.eat ?? 20,
        effort: 0.1,
        advertises: { food: HOST.mealFood },
      });
    }
    return out;
  }

  /**
   * Honest weather risk on outdoor work. The squall fails all forest and field work (see resolve) and the storm
   * rolls exposure every 10 minutes outside (see minute), so either is close to certain harm for an hour's job.
   */
  private weatherRisk(out: Affordance[], m: number): Affordance[] {
    for (const a of out) {
      if (!a.tags?.includes('outdoors') || a.action === 'carry-injured') continue;
      // Judged over the whole job, so work started just before the weather turns is judged by it too.
      const end = m + a.duration;
      const squall = m < SQUALL_END && end > SQUALL_START;
      const storm = m < STORM_END && end > STORM_START;
      if (!squall && !storm) continue;
      if (!storm && a.placeId !== 'forest' && a.placeId !== 'field' && a.placeId !== 'cedar') continue;
      a.risk = { chance: 0.9, severity: 0.5, kind: 'storm' };
    }
    return out;
  }

  /** Who a lead builder may ask to help with the beam: the apprentice, if he is up and about. */
  private beamPartners(lead: VillagerId, t: number): VillagerId[] {
    const out: VillagerId[] = [];
    for (const id of ['tariq'] as VillagerId[]) {
      if (id === lead) continue;
      const q = this.person(id);
      if (!q?.body.alive || q.body.asleep || this.s.down[id] || (this.s.recovering[id] ?? 0) > t) continue;
      out.push(id);
    }
    return out;
  }

  /** The partner's mirror keeps the builder's skill and role pull (`mirrorAffordance` drops goals). */
  mirror(partner: Person, offer: Affordance, proposal: JointProposal): Affordance {
    const m = mirrorAffordance(offer, proposal, partner.id);
    const v = specOf(partner.id);
    const tile = spotFor('site', v.index);
    const travel = this.travel(this.posAt(partner.id, partner.now), tile);
    if (Number.isFinite(travel))
      m.duration = Math.max(offer.duration, travel + (HOST.work['raise-beam'] ?? 45));
    m.label = `raise the beam with ${firstName(proposal.proposerId)}`;
    return m;
  }

  // --- begin hook -------------------------------------------------------------------------------

  beginOptions(p: Person, offer: Affordance, record: DecisionRecord): BeginOptions | undefined {
    const id = villagerId(p.id);
    const t = p.now;
    const from = this.posAt(id, t);
    const v = specOf(id);
    const place = (offer.placeId as PlaceId | undefined) ?? null;
    const to = place ? spotFor(place, v.index) : from;
    const suggested = record.suggestion?.verdict === 'assented' || record.suggestion?.verdict === 'complied';
    const orderKey = this.s.orderKey[id];
    const trip: Trip = {
      from,
      to,
      startedAt: t,
      travel: place ? this.travel(from, to) : 0,
      placeId: place,
      affordanceId: offer.id,
      action: offer.action,
      label: offer.label,
      outdoors: offer.tags?.includes('outdoors') ?? false,
      protest: record.suggestion?.verdict === 'complied',
      rollKey: suggested && orderKey !== null && orderKey !== undefined ? orderKey : gm(t),
    };
    if (!Number.isFinite(trip.travel)) trip.travel = 0;
    if (offer.action === 'fell-cedar' && suggested && orderKey != null && this.s.cedarKey === undefined)
      this.s.cedarKey = orderKey;
    this.s.exposure[id] = 0;
    if (offer.action === 'carry-injured' && offer.targetId) {
      const victim = offer.targetId as VillagerId;
      const cas = this.s.down[victim];
      if (cas) {
        cas.carriedBy = id;
        trip.carry = { victim, at: cas.tile, home: homeDoor(specOf(victim)) };
        trip.to = trip.carry.home;
        trip.travel = this.travel(from, cas.tile) + this.travel(cas.tile, trip.carry.home);
      }
      this.s.trip[id] = trip;
      return {
        promise: {
          importance: 0.9,
          toId: victim,
          normId: 'aid-injured',
          label: `carry ${firstName(victim)} home`,
        },
      };
    }
    this.s.trip[id] = trip;
    return undefined;
  }

  // --- percepts ---------------------------------------------------------------------------------

  queue(to: readonly VillagerId[] | 'all', pc: Percept): void {
    const ids = to === 'all' ? VILLAGERS.map((v) => v.id) : [...to];
    this.s.percepts.push({ to: ids, got: [], pc });
  }

  perceptsFor(p: Person, since: number, until: number): Percept[] {
    const out: Percept[] = [];
    const id = villagerId(p.id);
    for (const q of this.s.percepts) {
      if (q.pc.at > until || q.pc.at < since || !q.to.includes(id) || q.got.includes(id)) continue;
      q.got.push(id);
      out.push(q.pc);
    }
    return out;
  }

  /** Drop percepts every person has been handed. */
  prune(): void {
    let oldest = Number.POSITIVE_INFINITY;
    for (const p of this.community.people)
      oldest = Math.min(oldest, this.community.perceivedUntil[p.id] ?? 0);
    this.s.percepts = this.s.percepts.filter((q) => q.pc.at >= oldest && q.got.length < q.to.length);
  }

  /** An injury: seen within `seeTiles`, heard village-wide; everyone awake re-decides now. */
  private announceInjury(victim: VillagerId, tile: Tile, t: number, what: string): void {
    for (const o of this.community.people) {
      if (o.id === victim || !o.body.alive) continue;
      const near = dist(this.posAt(o.id, t), tile) <= HOST.seeTiles;
      this.queue([villagerId(o.id)], {
        at: t,
        channel: near ? 'saw' : 'heard',
        kind: 'injury',
        actorId: victim,
        targetId: victim,
        valence: -0.6,
        salience: near ? 0.9 : 0.6,
        summary: near ? `${firstName(victim)} ${what}` : `a cry: ${firstName(victim)} is hurt`,
        near,
      });
      if (!o.body.asleep) interruptPerson(this.community, o, t, 'percept:injury');
    }
  }

  // --- outcomes ---------------------------------------------------------------------------------

  resolve(p: Person, act: Activity, reason: 'ended' | 'interrupted'): Outcome {
    const id = villagerId(p.id);
    const t = reason === 'ended' ? act.endsAt : p.now;
    const m = gm(t);
    const trip = this.s.trip[id];
    const aff = act.affordance;
    const w = this.world;
    const arrived = !trip || t - trip.startedAt >= trip.travel;
    // Where they end up.
    this.s.loc[id] = trip ? (arrived ? trip.to : this.posAt(id, t)) : (this.s.loc[id] ?? { x: 0, y: 0 });
    this.s.trip[id] = null;
    const hits = this.s.exposure[id] ?? 0;
    this.s.exposure[id] = 0;
    const protest = act.protest === true;
    const base: Outcome = { affordanceId: act.affordanceId, action: act.action, status: 'completed', at: t };
    if (act.targetId !== undefined) base.targetId = act.targetId;
    if (protest) base.quality = HOST.protestQuality;
    if (hits > 0)
      base.injury = {
        part: 'cold and cuts',
        severity: Math.min(0.5, HOST.exposureSeverity * hits),
        healRatePerDay: 0.3,
      };

    const done = (o: Partial<Outcome>): Outcome => {
      const out: Outcome = { ...base, ...o };
      if (act.suggestion?.voiceId === 'player') {
        this.events.finished.push({
          personId: id,
          action: act.action,
          status: out.status,
          startedAt: act.startedAt,
        });
        if (out.status !== 'interrupted') this.onOrderDone?.(id, act.action, act.startedAt);
      }
      return out;
    };

    // Forest and field work in the squall fails: the wind drives you back (host rule).
    // It applies whether they finish or give up: anyone who worked out there during the squall comes back hurt.
    const action = act.action;
    const workFrom = trip ? trip.startedAt + trip.travel : act.startedAt;
    const squall =
      (action === 'gather-timber' || action === 'gather-grain' || action === 'fell-cedar') &&
      t > workFrom &&
      gm(workFrom) < SQUALL_END &&
      m > SQUALL_START;
    if (squall) {
      // Counted once: exposure rolls during the trip already counted their own hits.
      if (hits === 0) {
        this.events.injuries.push({ personId: id, kind: 'weather', minute: m });
        w.injuries += 1;
      }
      return done({
        status: 'failed',
        needs: { rest: -0.3, safety: -0.3 },
        injury: { part: 'hands and face', severity: 0.3 + (base.injury?.severity ?? 0), healRatePerDay: 0.3 },
        summary:
          action === 'gather-timber'
            ? 'Out for timber in the squall, came back cut and empty-handed'
            : `Out to ${aff.label} in the squall, came back cut and empty-handed`,
        percepts: [
          {
            at: t,
            channel: 'felt',
            kind: 'weather',
            valence: -0.6,
            salience: 0.8,
            summary: 'cold to the bone',
          },
        ],
      });
    }

    // A felling stopped within its last few minutes still brings the cedar down: the framework's need interrupts do
    // not weigh how little is left, and a tree one stroke from falling does not stand until tomorrow.
    const cedarDone =
      action === 'fell-cedar' &&
      arrived &&
      trip !== null &&
      trip !== undefined &&
      this.s.cedarWork + (t - trip.startedAt - trip.travel) >=
        (HOST.work['fell-cedar'] ?? 90) - HOST.cedarLastStrokes;
    if ((reason === 'interrupted' && !cedarDone) || !arrived) {
      if (trip?.carry) {
        // Set down where they stand: the casualty waits again.
        const cas = this.s.down[trip.carry.victim];
        if (cas) {
          cas.carriedBy = null;
          cas.tile = this.s.loc[id] ?? cas.tile;
          this.s.loc[trip.carry.victim] = cas.tile;
        }
      }
      // Work done before stopping still counts: pro-rata build progress and half-finished gathering.
      const work = HOST.work[act.action] ?? 0;
      const worked = trip ? Math.max(0, t - trip.startedAt - trip.travel) : 0;
      const frac = work > 0 && arrived ? Math.min(1, worked / work) : 0;
      const q = protest ? HOST.protestQuality : 1;
      if (frac > 0 && act.action === 'build' && this.payStage()) this.addBuild(this.buildRate(p) * q * frac);
      if (act.action === 'fell-cedar' && arrived) this.s.cedarWork = Math.min(89, this.s.cedarWork + worked);
      // Gathering pays for the time spent (spec: timber 1 unit per 30 min, to the nearest unit), so a cut-short trip still brings some.
      if (act.action === 'gather-timber')
        w.resources.timber += Math.round(frac * gathered('timber', protest));
      if (act.action === 'gather-grain') w.resources.grain += Math.round(frac * gathered('grain', protest));
      return done({ status: 'interrupted', summary: `${aff.label}: stopped` });
    }

    const needs = realizedNeeds(aff);
    switch (action) {
      case 'gather-grain':
        w.resources.grain += gathered('grain', protest);
        return done({ needs, summary: 'Gathered grain' });
      case 'gather-timber':
        w.resources.timber += gathered('timber', protest);
        return done({ needs, summary: 'Brought timber' });
      case 'fell-cedar': {
        w.cedarFelled = true;
        w.resources.timber += JOBS['fell-cedar'].yields?.timber ?? 3;
        const key = this.s.cedarKey ?? trip?.rollKey ?? gm(act.startedAt);
        const chance = HOST.cedarInjuryChance * (protest ? HOST.protestRisk : 1);
        if (scenarioRoll(this.seed, 'cedar', key, 0) < chance) {
          const tile = this.s.loc[id] ?? spotFor('cedar', specOf(id).index);
          this.s.down[id] = { kind: 'injury', since: t, tile, carriedBy: null };
          w.injuries += 1;
          this.events.injuries.push({ personId: id, kind: 'injury', minute: m });
          this.announceInjury(id, tile, t, 'is pinned under the cedar');
          return done({
            needs,
            injury: { part: 'leg', severity: HOST.cedarInjury, healRatePerDay: 0.1 },
            summary: 'Felled the cedar; it came down on my leg',
          });
        }
        return done({ needs, summary: 'Felled the big cedar' });
      }
      case 'draw-water':
        w.resources.water += JOBS['draw-water'].yields?.water ?? 2;
        return done({ needs, summary: 'Drew water' });
      case 'cook': {
        if (w.resources.grain < HOST.cookGrain || w.resources.water < HOST.cookWater)
          return done({ status: 'failed', summary: 'Nothing to cook with' });
        w.resources.grain -= HOST.cookGrain;
        w.resources.water -= HOST.cookWater;
        w.resources.meals += HOST.cookMeals;
        this.queue('all', {
          at: t,
          channel: 'heard',
          kind: 'meal-ready',
          actorId: id,
          valence: 0.4,
          salience: 0.5,
          summary: `${firstName(id)}’s pot is ready`,
        });
        return done({ needs, summary: aff.label === 'cook a pot' ? 'Cooked a pot' : `Cooked: ${aff.label}` });
      }
      case 'build': {
        if (!this.payStage()) return done({ status: 'failed', summary: 'No timber to build with' });
        const q = protest ? HOST.protestQuality : 1;
        this.addBuild(this.buildRate(p) * q);
        return done({ needs, summary: 'Laid another course' });
      }
      case 'raise-beam':
        return this.resolveBeam(p, act, done, needs, t);
      case 'shutter-house':
        w.house.shuttered = true;
        return done({ needs, summary: 'Shuttered the house' });
      case 'eat': {
        if (w.resources.meals > 0) {
          w.resources.meals -= 1;
          w.eaten += 1;
          return done({ needs: { food: HOST.mealFood }, summary: 'Ate a meal' });
        }
        if (w.resources.grain > 0) {
          w.resources.grain -= 1;
          return done({ needs: { food: HOST.rawFood }, summary: 'Ate raw grain' });
        }
        return done({ status: 'failed', summary: 'Nothing to eat' });
      }
      case 'take-grain':
        this.queue(['danyal'], {
          at: t,
          channel: 'saw',
          kind: 'theft',
          actorId: id,
          targetId: 'danyal',
          valence: -0.5,
          salience: 0.7,
          norms: [{ normId: 'theft', relation: 'violates' }],
          summary: `${firstName(id)} took from the jar`,
        });
        return done({ needs, summary: 'Took grain from Danyal’s jar' });
      case 'carry-injured':
        return this.resolveCarry(p, trip ?? null, done, needs, t);
      case 'tend-injured': {
        const victim = act.targetId as VillagerId | undefined;
        if (victim) {
          this.queue([victim], {
            at: t,
            channel: 'social',
            kind: 'help',
            actorId: id,
            targetId: victim,
            valence: 0.5,
            salience: 0.6,
            summary: `${firstName(id)} tended me`,
          });
        }
        return done({ needs, summary: `Tended ${victim ? firstName(victim) : 'the injured'}` });
      }
      default:
        return done({ needs, summary: aff.label });
    }
  }

  /** Progress one full build session adds at the stage under way (walls fast, roof slow; v2 plan §2). */
  private buildRate(p: Person): number {
    const w = this.world;
    const kind = w.storeroom !== null ? 'wall' : stageKind(w.house.stage + 1) === 'roof' ? 'roof' : 'wall';
    const r = HOST.buildRate[kind];
    return r.base + r.gain * skillLevel(p, 'building');
  }

  /** Put the stage's timber on site if it is not there yet; false when there is none. */
  private payStage(): boolean {
    this.syncProject();
    if (this.s.buildPaid) return true;
    const timber = nextStageCost(this.world).timber;
    if (this.world.resources.timber < timber) return false;
    this.world.resources.timber -= timber;
    this.s.buildPaid = true;
    return true;
  }

  /** When the Day-3 store-room opens, the house's leftover progress and paid timber do not carry over. */
  private syncProject(): void {
    // The storm took a stage: the fraction and the timber on site belonged to the stage that is gone.
    if (this.s.buildStage !== undefined && this.world.house.stage < this.s.buildStage) {
      this.s.build = 0;
      this.s.buildPaid = false;
    }
    this.s.buildStage = this.world.house.stage;
    if (this.world.storeroom === null || this.s.storeroom) return;
    this.s.storeroom = true;
    this.s.build = 0;
    this.s.buildPaid = false;
  }

  /** Add build progress; house stages stop below the beam until it is raised. */
  private addBuild(amount: number): void {
    const w = this.world;
    this.s.build += amount;
    if (w.storeroom !== null) {
      while (this.s.build >= 1 && w.storeroom < STOREROOM_STAGES) {
        this.s.build -= 1;
        w.storeroom += 1;
        this.s.buildPaid = false;
      }
      if (w.storeroom >= STOREROOM_STAGES) this.s.build = 0;
      w.house.progress = this.s.build;
      return;
    }
    const cap = w.house.stage < BEAM_STAGE ? BEAM_STAGE - 1 : HOUSE_STAGES;
    while (this.s.build >= 1 && w.house.stage < cap) {
      this.s.build -= 1;
      w.house.stage += 1;
      this.s.buildPaid = false;
    }
    if (w.house.stage >= cap) this.s.build = Math.min(this.s.build, 0.99);
    this.s.buildStage = w.house.stage;
    w.house.progress = w.house.stage >= HOUSE_STAGES ? 0 : this.s.build;
  }

  private resolveBeam(
    p: Person,
    act: Activity,
    done: (o: Partial<Outcome>) => Outcome,
    needs: Outcome['needs'],
    t: number,
  ): Outcome {
    const id = villagerId(p.id);
    const w = this.world;
    const m = gm(t);
    // The partner's mirror reports through the proposer's roll: only the lead (non-mirror) rolls.
    if (act.affordance.jointId !== undefined) {
      const lead = act.affordance.with?.[0];
      const leadBeam = this.events.beams.find((b) => b.lead === lead && b.minute === m);
      if (leadBeam)
        return done({
          needs,
          status: leadBeam.ok ? 'completed' : 'failed',
          summary: leadBeam.ok ? 'Raised the beam together' : 'The beam slipped',
        });
      if (w.house.stage >= BEAM_STAGE) return done({ needs, summary: 'Raised the beam together' });
    }
    if (w.house.stage !== BEAM_STAGE - 1 || w.resources.timber < HOST.beamTimber)
      return done({ status: 'failed', summary: 'The beam was not ready' });
    const partners = (act.affordance.with ?? []).map((x) => this.person(x)).filter((q): q is Person => !!q);
    const difficulty = act.affordance.skill?.difficulty ?? 0.8;
    const chance = jointSuccessChance(p, partners, 'building', difficulty);
    this.s.beamAttempts += 1;
    const ok = scenarioRoll(this.seed, 'beam-human', this.s.beamAttempts, 0) < chance;
    this.events.beams.push({ lead: id, partners: partners.map((q) => villagerId(q.id)), ok, minute: m });
    if (ok) {
      w.resources.timber -= HOST.beamTimber;
      w.house.stage = BEAM_STAGE;
      for (const q of partners) {
        this.queue([villagerId(q.id)], {
          at: t,
          channel: 'social',
          kind: 'shared-work',
          actorId: id,
          targetId: q.id,
          valence: 0.5,
          salience: 0.6,
          summary: `raised the beam with ${firstName(id)}`,
        });
      }
      return done({ needs, summary: partners.length > 0 ? 'Raised the beam together' : 'Raised the beam' });
    }
    w.resources.timber -= 1;
    const hurt = scenarioRoll(this.seed, 'beam-human-injury', this.s.beamAttempts, 0) < HOST.beamInjuryChance;
    if (hurt) {
      w.injuries += 1;
      this.events.injuries.push({ personId: id, kind: 'injury', minute: m });
    }
    return done({
      status: 'failed',
      summary: 'The beam slipped',
      ...(hurt ? { injury: { part: 'shoulder', severity: 0.3, healRatePerDay: 0.2 } } : {}),
    });
  }

  private resolveCarry(
    p: Person,
    trip: Trip | null,
    done: (o: Partial<Outcome>) => Outcome,
    needs: Outcome['needs'],
    t: number,
  ): Outcome {
    const id = villagerId(p.id);
    const victim = trip?.carry?.victim;
    if (!victim || !this.s.down[victim]) return done({ status: 'failed', summary: 'No one to carry' });
    this.s.down[victim] = null;
    this.s.loc[victim] = trip?.carry?.home ?? this.s.loc[victim] ?? { x: 0, y: 0 };
    this.s.recovering[victim] = t + HOST.recoverMinutes;
    const v = this.person(victim);
    if (v) interruptPerson(this.community, v, t, 'carried-home');
    this.queue([victim], {
      at: t,
      channel: 'social',
      kind: 'help',
      actorId: id,
      targetId: victim,
      valence: 0.8,
      salience: 0.8,
      summary: `${firstName(id)} carried me home`,
    });
    for (const o of this.community.people) {
      if (o.id === id || o.id === victim || !o.body.alive) continue;
      if (dist(this.posAt(o.id, t), this.s.loc[victim] ?? { x: 0, y: 0 }) > HOST.seeTiles) continue;
      this.queue([villagerId(o.id)], {
        at: t,
        channel: 'saw',
        kind: 'help',
        actorId: id,
        targetId: victim,
        valence: 0.3,
        salience: 0.5,
        norms: [{ normId: 'aid-injured', relation: 'fulfills' }],
        summary: `${firstName(id)} carried ${firstName(victim)} home`,
      });
    }
    const hunger = readPerson(p).body.perceived.hunger;
    this.events.carried.push({ carrier: id, victim, minute: gm(t), hunger });
    return done({
      needs,
      summary: `Carried ${firstName(victim)} home`,
      percepts: [
        {
          at: t,
          channel: 'social',
          kind: 'thanks',
          actorId: victim,
          targetId: id,
          valence: 0.6,
          salience: 0.7,
          summary: `${firstName(victim)} thanked me`,
        },
      ],
    });
  }

  // --- per-minute world effects -----------------------------------------------------------------

  /**
   * Weather exposure and percepts at game minute `m` (called before people step to it): adhan, no-meal,
   * warning, wind; exposure rolls every 10 minutes for people outdoors in risky weather.
   */
  minute(m: Minute, adhan: string | null): void {
    const t = fw(m);
    const w = this.world;
    if (adhan) {
      this.queue('all', {
        at: t,
        channel: 'heard',
        kind: 'adhan',
        salience: 0.5,
        summary: `the call to ${adhan}`,
      });
    }
    const mod = ((t % 1440) + 1440) % 1440;
    if ((mod === 13 * 60 || mod === 19 * 60) && w.resources.meals === 0) {
      this.queue('all', {
        at: t,
        channel: 'felt',
        kind: 'no-meal',
        valence: -0.4,
        salience: 0.6,
        summary: 'no meal in the pot',
      });
    }
    if (m === STORM_SUPPER || m === DAWN_MEAL) this.stormMeal(t);
    if (m === STORM_START && w.house.stage < HOUSE_STAGES) {
      // No roof of their own: Idris and Samira shelter and sleep in the crowded masjid (v2 plan §11).
      const family = HOUSE_FAMILY.filter((id) => this.person(id)?.body.alive);
      this.queue(family, {
        at: t,
        channel: 'felt',
        kind: 'crowded',
        valence: -0.4,
        salience: 0.7,
        summary: 'No roof of our own tonight.',
      });
    }
    if (m === WARNING_AT) {
      for (const o of this.community.people) {
        if (!o.body.alive) continue;
        this.queue([villagerId(o.id)], {
          at: t,
          channel: 'saw',
          kind: 'weather-warning',
          valence: -0.5,
          salience: 0.9,
          near: true,
          claims: [{ prop: 'storm:tonight', value: true, confidence: 0.8 }],
          summary: 'the sky darkening in the west',
        });
        if (!o.body.asleep) interruptPerson(this.community, o, t, 'percept:weather-warning');
      }
    }
    const weather = weatherAt(m);
    if (!weather.risky) return;
    const squall = m < SQUALL_END;
    const start = squall ? SQUALL_START : STORM_START;
    for (const o of this.community.people) {
      if (!o.body.alive) continue;
      const id = villagerId(o.id);
      if (!this.exposed(id, t, squall)) continue;
      if ((m - start) % 30 === 0) {
        this.queue([id], {
          at: t,
          channel: 'felt',
          kind: 'weather',
          valence: -0.4,
          salience: 0.6,
          summary: 'the wind cuts through',
        });
      }
      if (m % 10 !== 0) continue;
      const trip = this.s.trip[id];
      const chance = HOST.exposureChance * (trip?.protest ? HOST.protestRisk : 1);
      if (scenarioRoll(this.seed, 'weather', m, specOf(id).index) < chance) {
        this.s.exposure[id] = (this.s.exposure[id] ?? 0) + 1;
        w.injuries += 1;
        this.events.injuries.push({ personId: id, kind: 'weather', minute: m });
      }
    }
  }

  /** Scripted storm meal (v2 plan §2): each living villager takes one meal from the store, if one is left. */
  private stormMeal(t: number): void {
    const w = this.world;
    for (const o of this.community.people) {
      if (!o.body.alive || w.resources.meals <= 0) continue;
      w.resources.meals -= 1;
      w.eaten += 1;
      consume(o, { food: HOST.mealFood });
      this.queue([villagerId(o.id)], {
        at: t,
        channel: 'felt',
        kind: 'meal',
        valence: 0.3,
        salience: 0.4,
        summary: 'a meal from the store, shared in the dark',
      });
    }
  }

  /** Outdoors in risky weather: the squall only bites in forest and field; the storm everywhere outside. */
  exposed(id: VillagerId, t: number, squall: boolean): boolean {
    const trip = this.s.trip[id];
    if (this.s.down[id] && !this.s.down[id]?.carriedBy) return !squall;
    if (!trip) return false;
    if (squall)
      return (
        trip.outdoors && (trip.placeId === 'forest' || trip.placeId === 'field' || trip.placeId === 'cedar')
      );
    return trip.outdoors || this.walking(id, t);
  }
}
