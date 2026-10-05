/**
 * The Classic side (spec §4): an honest, competent generic colony AI. Units obey every order instantly,
 * walk one tile per sim minute, work a job timer, deliver. Between orders they work their role's job by
 * priority (the usual colony-sim work tab). They auto-eat, collapse at hunger 100, auto-rescue downed
 * units, sleep 22:00–05:00 after finishing an ordered task, and feel no fear. No memory, relationships or
 * norms. Pure TS: deterministic given the seed, the order log and the scenario rolls.
 */

import type { VillagerState } from './human-side.ts';
import { findPath, MAP, type PlaceId, placeAt, placeById, spotFor, type Tile } from './map.ts';
import type { ClassicCommand } from './orders.ts';
import {
  type ActionId,
  addResources,
  BEAM_STAGE,
  canAfford,
  DAWN_MEAL,
  HOUSE_STAGES,
  homeOf,
  isSleepTime,
  JOBS,
  type Minute,
  type Role,
  SHUTTER_AVAILABLE,
  type SideWorld,
  STAGE_COST,
  STOREROOM_STAGES,
  STORM_END,
  STORM_SUPPER,
  scenarioRoll,
  siteOpen,
  stageKind,
  startTile,
  stormNoCook,
  type VillagerId,
  type VillagerSpec,
  WARNING_AT,
  weatherAt,
} from './world-types.ts';

/** Classic tuning (spec §4). Exported so tests and the inspector read the same numbers. */
export const CLASSIC = {
  hungerPerMinute: 0.1,
  autoEatHunger: 80,
  idleEatHunger: 60,
  eatBeforeSleepHunger: 40,
  mealRelief: 40,
  rawRelief: 25,
  collapseHpPerMinute: 0.2,
  rushSpeed: 1.25,
  skillSpeed: 2,
  sleepDeprivedAfter: 18 * 60,
  sleepDeprivedSpeed: 0.7,
  stormInjuryChance: 0.3,
  stormInjuryHp: 5,
  beamSuccess: 0.35,
  beamFailMinutes: 30,
  beamInjuryChance: 0.2,
  cedarInjuryChance: 0.5,
  injuryHp: 30,
  downedBelowHp: 25,
  restAfterCollapse: 60,
  restAfterInjury: 120,
} as const;

export type TaskSource = 'order' | 'role' | 'need' | 'rescue' | 'night';
export type Downed = 'collapsed' | 'injured';

export interface ClassicTask {
  action: ActionId;
  placeId: PlaceId;
  source: TaskSource;
  orderId?: string;
  rush: boolean;
  target: Tile;
  phase: 'walk' | 'work' | 'recover';
  /** Work minutes left at base speed. */
  remaining: number;
  /** Inputs consumed and work begun. */
  started: boolean;
  /** Minute keying the scenario roll: the order's issue minute, else the minute work began. */
  rollKey: Minute;
  victimId?: VillagerId;
  haul?: boolean;
  /** Build and beam: the stage this task is building (claimed when work begins). */
  stage?: number;
}

export interface ClassicUnit {
  id: VillagerId;
  index: number;
  name: string;
  role: Role;
  skillTag: VillagerSpec['skillTag'];
  home: PlaceId;
  x: number;
  y: number;
  path: Tile[];
  task: ClassicTask | null;
  /** An ordered task set aside by an auto-eat interrupt; resumed afterwards. */
  suspended: ClassicTask | null;
  hunger: number;
  hp: number;
  asleep: boolean;
  down: Downed | null;
  dead: boolean;
  /** Minutes of recovery rest left at home. */
  rest: number;
  /** Minutes since last sleep. */
  awake: number;
  carriedBy: VillagerId | null;
  carrying: VillagerId | null;
  indoors: boolean;
  /** Carrying moves at half speed: alternate minutes. */
  stride: number;
  /** Last job completed, for narration ("finished gathering timber"). */
  lastDone: ActionId | null;
}

export interface ClassicEvents {
  completed: { orderId: string; personId: VillagerId; action: ActionId }[];
  noop: { orderId: string; personId: VillagerId; reason: string }[];
  /** An order was suspended by an auto-eat interrupt (the generic AI's version of "after I eat"). */
  suspended: { orderId: string; personId: VillagerId }[];
  injuries: { personId: VillagerId; kind: 'collapse' | 'injury' | 'weather'; minute: Minute }[];
  deaths: VillagerId[];
  jobsDone: { personId: VillagerId; action: ActionId; source: TaskSource }[];
}

export function emptyClassicEvents(): ClassicEvents {
  return { completed: [], noop: [], suspended: [], injuries: [], deaths: [], jobsDone: [] };
}

export interface ClassicSnapshot {
  schema: 'colony-classic@1';
  seed: number;
  units: ClassicUnit[];
  world: SideWorld;
}

/** Stockpile caps for role work (orders ignore them). */
export const STOCK_CAP = { grain: 12, water: 8, timber: 10, meals: 6, stormMeals: 12 } as const;

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class ClassicSim {
  readonly seed: number;
  readonly world: SideWorld;
  units: ClassicUnit[];
  private events: ClassicEvents = emptyClassicEvents();

  constructor(seed: number, villagers: readonly VillagerSpec[], world: SideWorld) {
    this.seed = seed;
    this.world = world;
    this.units = villagers.map((v) => {
      const t = startTile(v);
      return {
        id: v.id,
        index: v.index,
        name: v.name,
        role: v.role,
        skillTag: v.skillTag,
        home: v.home,
        x: t.x,
        y: t.y,
        path: [],
        task: null,
        suspended: null,
        hunger: Math.round(100 * (1 - v.satiety)),
        hp: 100,
        asleep: false,
        down: null,
        dead: false,
        rest: 0,
        awake: 0,
        carriedBy: null,
        carrying: null,
        indoors: false,
        stride: 0,
        lastDone: null,
      };
    });
  }

  unit(id: VillagerId): ClassicUnit {
    const u = this.units.find((q) => q.id === id);
    if (!u) throw new Error(`unknown unit ${id}`);
    return u;
  }

  /** Why an order would be a no-op right now (collapsed or dead target), else null. */
  noopReason(id: VillagerId): string | null {
    const u = this.unit(id);
    if (u.dead) return 'dead';
    if (u.down) return u.down;
    return null;
  }

  /** Apply an order at the current minute boundary. Classic obeys instantly. */
  apply(cmd: ClassicCommand): void {
    const u = this.unit(cmd.personId);
    const reason = this.noopReason(u.id);
    if (reason) {
      this.events.noop.push({ orderId: cmd.orderId, personId: u.id, reason });
      return;
    }
    u.asleep = false;
    u.rest = 0;
    u.suspended = null;
    const t = u.task;
    if (t && t.action === cmd.action && t.placeId === cmd.placeId && t.source !== 'rescue') {
      // Already doing exactly this: adopt the running task as the order, keeping progress and inputs.
      t.source = 'order';
      t.orderId = cmd.orderId;
      t.rush = cmd.rush;
      t.rollKey = cmd.rollKey;
      return;
    }
    this.dropCarried(u);
    this.releaseWell(u);
    u.task = this.makeTask(u, cmd.action, cmd.placeId, 'order', cmd.rush, cmd.rollKey, cmd.orderId);
    this.routeTo(u, u.task.target);
  }

  /** Withdraw a cancelled order: the unit idles (and picks role work next minute). */
  cancel(orderId: string): void {
    for (const u of this.units) {
      if (u.task?.orderId === orderId) {
        this.releaseWell(u);
        u.task = null;
        u.path = [];
      }
      if (u.suspended?.orderId === orderId) u.suspended = null;
    }
  }

  /** Advance one sim minute. The engine has already applied world weather for minute `m`. */
  step(m: Minute): ClassicEvents {
    if (m === STORM_SUPPER || m === DAWN_MEAL) this.stormMeal();
    for (const u of this.units) this.body(u, m);
    this.assignRescues();
    for (const u of this.units) this.behave(u, m);
    for (const u of this.units) {
      if (u.carriedBy) {
        const c = this.unit(u.carriedBy);
        u.x = c.x;
        u.y = c.y;
      }
    }
    // Events from apply() at this boundary are included, then the buffer resets.
    const out = this.events;
    this.events = emptyClassicEvents();
    return out;
  }

  snapshot(): ClassicSnapshot {
    return structuredClone({
      schema: 'colony-classic@1' as const,
      seed: this.seed,
      units: this.units,
      world: this.world,
    });
  }

  restore(s: ClassicSnapshot): void {
    if (s.schema !== 'colony-classic@1') throw new Error(`unexpected schema ${String(s.schema)}`);
    this.units = structuredClone(s.units);
    Object.assign(this.world, structuredClone(s.world));
  }

  // -------------------------------------------------------------------------------------------
  // Body: hunger, collapse, weather injuries, death
  // -------------------------------------------------------------------------------------------

  private body(u: ClassicUnit, m: Minute): void {
    if (u.dead) return;
    const rushing = u.task?.rush === true && u.task.phase !== 'recover';
    u.hunger = clampN(u.hunger + CLASSIC.hungerPerMinute * (rushing ? 2 : 1) * (u.asleep ? 0.5 : 1), 0, 100);
    u.awake = u.asleep ? 0 : u.awake + 1;
    if (u.asleep) u.hp = Math.min(100, u.hp + 0.05);

    if (u.down === 'collapsed' || u.hunger >= 100) u.hp -= CLASSIC.collapseHpPerMinute * (rushing ? 2 : 1);

    if (m % 10 === 0 && this.exposed(u, m)) {
      if (scenarioRoll(this.seed, 'weather', m, u.index) < CLASSIC.stormInjuryChance) {
        u.hp -= CLASSIC.stormInjuryHp;
        this.world.injuries += 1;
        this.events.injuries.push({ personId: u.id, kind: 'weather', minute: m });
      }
    }

    if (u.hp <= 0) {
      u.hp = 0;
      u.dead = true;
      u.down = null;
      this.dropCarried(u);
      this.releaseWell(u);
      u.task = null;
      u.suspended = null;
      u.path = [];
      this.world.deaths += 1;
      this.events.deaths.push(u.id);
      return;
    }
    if (u.hunger >= 100 && !u.down) {
      this.knockDown(u, 'collapsed');
      this.world.injuries += 1;
      this.events.injuries.push({ personId: u.id, kind: 'collapse', minute: m });
    } else if (u.hp < CLASSIC.downedBelowHp && !u.down) {
      this.knockDown(u, 'injured');
    }
  }

  /** Outdoors under risky weather: the squall threatens forest and field; the storm, anywhere outdoors. */
  private exposed(u: ClassicUnit, m: Minute): boolean {
    if (u.indoors || u.asleep) return false;
    const w = weatherAt(m);
    if (!w.risky) return false;
    if (w.kind === 'storm') return true;
    const here = placeAt(MAP, u.x, u.y);
    return here === 'forest' || here === 'field' || here === 'cedar';
  }

  private knockDown(u: ClassicUnit, kind: Downed): void {
    u.down = kind;
    u.asleep = false;
    u.rest = 0;
    this.dropCarried(u);
    this.releaseWell(u);
    u.task = null;
    u.suspended = null;
    u.path = [];
    u.indoors = false;
  }

  // -------------------------------------------------------------------------------------------
  // Rescue: generic sims haul downed colonists home
  // -------------------------------------------------------------------------------------------

  private needsRescue(v: ClassicUnit): boolean {
    return v.down !== null && !v.dead && v.carriedBy === null;
  }

  private assignRescues(): void {
    for (const v of this.units) {
      if (!this.needsRescue(v)) continue;
      if (this.units.some((h) => h.task?.action === 'carry-injured' && h.task.victimId === v.id)) continue;
      let best: ClassicUnit | null = null;
      let bestD = Number.POSITIVE_INFINITY;
      for (const h of this.units) {
        if (h.id === v.id || h.dead || h.down || h.asleep || h.rest > 0 || h.carrying) continue;
        if (h.task && (h.task.source === 'order' || h.task.source === 'rescue')) continue;
        if (h.hunger >= CLASSIC.autoEatHunger) continue;
        const p = findPath(MAP, h, v);
        const d = p ? p.length : Number.POSITIVE_INFINITY;
        if (d < bestD) {
          bestD = d;
          best = h;
        }
      }
      if (!best) continue;
      this.releaseWell(best);
      best.task = {
        action: 'carry-injured',
        placeId: homeOf(v.id, this.world, this.world.minute),
        source: 'rescue',
        rush: false,
        target: { x: v.x, y: v.y },
        phase: 'walk',
        remaining: 0,
        started: false,
        rollKey: 0,
        victimId: v.id,
        haul: false,
      };
      this.routeTo(best, best.task.target);
    }
  }

  private dropCarried(u: ClassicUnit): void {
    if (!u.carrying) return;
    const v = this.unit(u.carrying);
    v.carriedBy = null;
    v.x = u.x;
    v.y = u.y;
    u.carrying = null;
    if (u.task?.action === 'carry-injured') {
      u.task = null;
      u.path = [];
    }
  }

  // -------------------------------------------------------------------------------------------
  // Behaviour
  // -------------------------------------------------------------------------------------------

  private hasFood(): boolean {
    return this.world.resources.meals > 0 || this.world.resources.grain > 0;
  }

  private behave(u: ClassicUnit, m: Minute): void {
    if (u.dead || u.down || u.carriedBy) return;
    if (u.asleep) {
      if (isSleepTime(m)) return;
      u.asleep = false;
      u.indoors = false;
    }
    if (u.rest > 0) {
      u.rest -= 1;
      u.hp = Math.min(100, u.hp + 0.1);
      if (u.rest > 0) return;
      u.indoors = false;
    }

    // Night: role work stops; an ordered task is finished first.
    if (isSleepTime(m) && u.task && u.task.source === 'role') {
      this.releaseWell(u);
      u.task = null;
    }

    // Auto-eat interrupt at hunger 80, regardless of task (a hauler drops the injured on the path).
    if (u.hunger >= CLASSIC.autoEatHunger && u.task?.action !== 'eat' && this.hasFood()) {
      if (u.carrying) this.dropCarried(u);
      if (u.task?.source === 'order') {
        u.suspended = u.task;
        u.suspended.phase = 'walk';
        if (u.task.orderId) this.events.suspended.push({ orderId: u.task.orderId, personId: u.id });
      }
      this.releaseWell(u);
      u.task = this.makeTask(u, 'eat', 'kitchen', 'need', false, m);
      this.routeTo(u, u.task.target);
    }

    if (!u.task) {
      if (u.suspended) {
        u.task = u.suspended;
        u.suspended = null;
        this.routeTo(u, u.task.target);
      } else if (isSleepTime(m) && u.hunger >= CLASSIC.eatBeforeSleepHunger && this.hasFood()) {
        u.task = this.makeTask(u, 'eat', 'kitchen', 'need', false, m);
        this.routeTo(u, u.task.target);
      } else if (isSleepTime(m)) {
        u.task = this.makeTask(u, 'sleep', u.home, 'night', false, m);
        this.routeTo(u, u.task.target);
      } else if (u.hunger >= CLASSIC.idleEatHunger && this.hasFood()) {
        u.task = this.makeTask(u, 'eat', 'kitchen', 'need', false, m);
        this.routeTo(u, u.task.target);
      } else {
        const job = this.roleJob(u) ?? 'rest';
        u.task = this.makeTask(u, job, JOBS[job].place, 'role', false, m);
        this.routeTo(u, u.task.target);
      }
    }
    if (u.task) this.execute(u, u.task, m);
  }

  /**
   * Work priorities by role, the generic colony-sim work tab, with stockpile caps so nobody hoards.
   * Returns null when every useful job is capped: the unit idles where it stands.
   */
  roleJob(u: ClassicUnit): ActionId | null {
    const r = this.world.resources;
    const canCook = canAfford(r, JOBS.cook.consumes) && !stormNoCook(this.world.minute);
    const claim = this.claimableStage();
    const canBuild = claim !== null && r.timber >= this.stageCost(claim).timber;
    const buildJob: ActionId = this.world.storeroom === null && claim === BEAM_STAGE ? 'raise-beam' : 'build';
    const grain = r.grain < STOCK_CAP.grain ? 'gather-grain' : null;
    const water = r.water < STOCK_CAP.water ? 'draw-water' : null;
    const timber = r.timber < STOCK_CAP.timber ? 'gather-timber' : null;
    switch (u.role) {
      case 'cook':
        if (r.meals < (this.world.minute >= WARNING_AT ? STOCK_CAP.stormMeals : STOCK_CAP.meals) && canCook)
          return 'cook';
        if (r.water < 2) return 'draw-water';
        return grain ?? water;
      case 'builder':
        return canBuild ? buildJob : timber;
      case 'apprentice':
        return canBuild && r.timber >= 4 ? buildJob : (timber ?? (canBuild ? buildJob : null));
      case 'forester':
        return timber ?? grain;
      case 'gatherer':
        return grain ?? water ?? timber;
      case 'well-keeper':
        return water ?? grain;
    }
  }

  /**
   * The next stage a builder may claim at the open project, or null: stages already claimed by a started builder
   * are skipped, and the beam and roof stages wait for the stage below them (no parallel work across the beam).
   */
  claimableStage(): number | null {
    const w = this.world;
    if (!siteOpen(w)) return null;
    const house = w.storeroom === null;
    const cur = w.storeroom ?? w.house.stage;
    const max = house ? HOUSE_STAGES : STOREROOM_STAGES;
    const taken = new Set<number>();
    for (const x of this.units) {
      const t = x.task;
      if (t?.started && t.stage !== undefined && (t.action === 'build' || t.action === 'raise-beam'))
        taken.add(t.stage);
    }
    for (let s = cur + 1; s <= max; s++) {
      if (house && s >= BEAM_STAGE && cur < BEAM_STAGE && s > cur + 1) return null;
      if (!taken.has(s)) return s;
    }
    return null;
  }

  /** Price of one stage of the open project (the store-room is all walls). */
  stageCost(stage: number): { timber: number; work: number } {
    if (this.world.storeroom !== null) return STAGE_COST.wall;
    const kind = stageKind(stage);
    return kind === 'beam'
      ? { timber: STAGE_COST.beam.timber, work: JOBS['raise-beam'].work }
      : STAGE_COST[kind];
  }

  private makeTask(
    u: ClassicUnit,
    action: ActionId,
    placeId: PlaceId,
    source: TaskSource,
    rush: boolean,
    rollKey: Minute,
    orderId?: string,
  ): ClassicTask {
    let place = placeId;
    if (action === 'sleep' || action === 'rest') place = homeOf(u.id, this.world, this.world.minute);
    const target = spotFor(place, u.index);
    return {
      action,
      placeId: place,
      source,
      ...(orderId ? { orderId } : {}),
      rush,
      target,
      phase: 'walk',
      remaining: JOBS[action].work,
      started: false,
      rollKey,
    };
  }

  private routeTo(u: ClassicUnit, t: Tile): void {
    u.indoors = false;
    u.path = findPath(MAP, u, t) ?? [];
  }

  private releaseWell(u: ClassicUnit): void {
    if (this.world.wellUser === u.id) this.world.wellUser = null;
  }

  private speed(u: ClassicUnit, t: ClassicTask): number {
    let s = 1;
    if (u.skillTag && JOBS[t.action].skillTag === u.skillTag) s *= CLASSIC.skillSpeed;
    if (t.rush) s *= CLASSIC.rushSpeed;
    if (u.awake > CLASSIC.sleepDeprivedAfter) s *= CLASSIC.sleepDeprivedSpeed;
    return s;
  }

  private finishTask(u: ClassicUnit, t: ClassicTask, ok: boolean, reason?: string): void {
    this.releaseWell(u);
    u.task = null;
    u.path = [];
    if (t.source === 'order' && t.orderId) {
      if (ok) this.events.completed.push({ orderId: t.orderId, personId: u.id, action: t.action });
      else this.events.noop.push({ orderId: t.orderId, personId: u.id, reason: reason ?? 'failed' });
    }
    if (ok) {
      u.lastDone = t.action;
      this.events.jobsDone.push({ personId: u.id, action: t.action, source: t.source });
    }
  }

  private execute(u: ClassicUnit, t: ClassicTask, m: Minute): void {
    if (t.phase === 'walk') {
      if (u.path.length > 0) {
        if (u.carrying) {
          u.stride = (u.stride + 1) % 2;
          if (u.stride === 1) return;
        }
        const next = u.path.shift();
        if (next) {
          u.x = next.x;
          u.y = next.y;
        }
        if (u.path.length > 0) return;
      }
      this.arrive(u, t);
      return;
    }
    if (t.phase === 'recover') {
      t.remaining -= 1;
      if (t.remaining <= 0) {
        if (scenarioRoll(this.seed, 'beam-injury', t.rollKey, 0) < CLASSIC.beamInjuryChance) {
          this.injure(u, m);
          if (t.source === 'order' && t.orderId) {
            this.events.noop.push({ orderId: t.orderId, personId: u.id, reason: 'beam failed' });
          }
          return;
        }
        this.finishTask(u, t, false, 'beam failed');
      }
      return;
    }
    // work phase
    if (t.action === 'draw-water') {
      if (this.world.wellUser && this.world.wellUser !== u.id) return; // queue
      this.world.wellUser = u.id;
    }
    if (!t.started) {
      if (!this.start(u, t, m)) return;
    }
    t.remaining -= this.speed(u, t);
    if (t.remaining <= 0) this.complete(u, t, m);
  }

  private arrive(u: ClassicUnit, t: ClassicTask): void {
    if (t.action === 'carry-injured') {
      const v = t.victimId ? this.unit(t.victimId) : null;
      if (!t.haul) {
        if (!v || !this.needsRescue(v) || v.x !== u.x || v.y !== u.y) {
          // Victim moved or was taken; re-route if still down and free, else give up.
          if (v && this.needsRescue(v)) {
            t.target = { x: v.x, y: v.y };
            this.routeTo(u, t.target);
            if (u.path.length > 0) return;
          }
          if (!v || !this.needsRescue(v) || v.x !== u.x || v.y !== u.y) {
            this.finishTask(u, t, false);
            return;
          }
        }
        u.carrying = v.id;
        v.carriedBy = u.id;
        t.haul = true;
        t.target = spotFor(homeOf(v.id, this.world, this.world.minute), v.index);
        this.routeTo(u, t.target);
        if (u.path.length > 0) return;
      }
      if (v) {
        v.carriedBy = null;
        v.x = u.x;
        v.y = u.y;
        const collapsed = v.down === 'collapsed';
        v.down = null;
        v.indoors = true;
        v.rest = collapsed ? CLASSIC.restAfterCollapse : CLASSIC.restAfterInjury;
        if (collapsed) this.feed(v);
      }
      u.carrying = null;
      this.finishTask(u, t, true);
      return;
    }
    if (t.action === 'sleep') {
      u.asleep = true;
      u.indoors = true;
      this.finishTask(u, t, true);
      return;
    }
    t.phase = 'work';
    u.indoors = !JOBS[t.action].outdoors && placeById(t.placeId).indoors;
  }

  /** Begin work: check prerequisites and consume inputs. Returns false when the task ended. */
  private start(u: ClassicUnit, t: ClassicTask, m: Minute): boolean {
    const r = this.world.resources;
    const h = this.world.house;
    if (t.source !== 'order') t.rollKey = m;
    switch (t.action) {
      case 'fell-cedar':
        if (this.world.cedarFelled) {
          this.finishTask(u, t, false, 'cedar already felled');
          return false;
        }
        break;
      case 'build':
      case 'raise-beam': {
        // Each stage has its own price (colony.md §10): walls 2 timber / 120 work, roof 5 / 600, beam 2. A builder
        // claims one stage and pays for it; a second builder takes the next free stage, never the beam or the roof
        // before the stage below it is up, and waits when none is free.
        if (!siteOpen(this.world)) {
          this.finishTask(
            u,
            t,
            false,
            this.world.storeroom === null ? 'house finished' : 'store-room finished',
          );
          return false;
        }
        const stage = this.claimableStage();
        if (stage === null) {
          // No free stage: an ordered builder helps the builder whose stage is nearest done (their work counts
          // toward that stage); a role builder goes and does something else.
          if (t.source !== 'order') {
            this.finishTask(u, t, false, 'no free stage');
            return false;
          }
          const lead = this.units
            .map((x) => x.task)
            .filter((x): x is ClassicTask => !!x?.started && x.stage !== undefined && x.phase === 'work')
            .sort((a, b) => a.remaining - b.remaining)[0];
          if (lead) lead.remaining -= this.speed(u, t);
          return false;
        }
        const cost = this.stageCost(stage);
        if (r.timber < cost.timber) {
          this.finishTask(u, t, false, 'no timber');
          return false;
        }
        t.action = this.world.storeroom === null && stage === BEAM_STAGE ? 'raise-beam' : 'build';
        t.stage = stage;
        t.remaining = cost.work;
        r.timber -= cost.timber;
        t.started = true;
        return true;
      }
      case 'shutter-house':
        if (m < SHUTTER_AVAILABLE || h.shuttered) {
          this.finishTask(u, t, false, h.shuttered ? 'already shuttered' : 'nothing to shutter yet');
          return false;
        }
        break;
      case 'cook':
        if (stormNoCook(m)) {
          this.finishTask(u, t, false, 'no fire in the storm');
          return false;
        }
        if (!canAfford(r, JOBS.cook.consumes)) {
          this.finishTask(u, t, false, 'no grain or water');
          return false;
        }
        break;
      case 'shelter':
        t.remaining = weatherAt(m).risky ? Math.max(1, STORM_END - m) : JOBS.shelter.work;
        break;
      default:
        break;
    }
    addResources(r, JOBS[t.action].consumes, -1);
    t.started = true;
    return true;
  }

  private complete(u: ClassicUnit, t: ClassicTask, m: Minute): void {
    const w = this.world;
    switch (t.action) {
      case 'eat':
        this.feed(u);
        break;
      case 'fell-cedar': {
        w.cedarFelled = true;
        addResources(w.resources, JOBS['fell-cedar'].yields);
        if (scenarioRoll(this.seed, 'cedar', t.rollKey, 0) < CLASSIC.cedarInjuryChance) {
          this.finishTask(u, t, true);
          this.injure(u, m);
          return;
        }
        break;
      }
      case 'build':
        // Claims are distinct stages that never cross the beam, so a completion is one stage up (clamped; a wall
        // finished after storm decay never stands in for the beam).
        if (w.storeroom !== null) w.storeroom = Math.min(STOREROOM_STAGES, w.storeroom + 1);
        else if (w.house.stage + 1 !== BEAM_STAGE) w.house.stage = Math.min(HOUSE_STAGES, w.house.stage + 1);
        break;
      case 'raise-beam':
        if (scenarioRoll(this.seed, 'beam', t.rollKey, 0) < CLASSIC.beamSuccess) {
          w.house.stage = Math.max(w.house.stage, BEAM_STAGE);
        } else {
          t.phase = 'recover';
          t.remaining = CLASSIC.beamFailMinutes;
          return;
        }
        break;
      case 'shutter-house':
        w.house.shuttered = true;
        break;
      default:
        addResources(w.resources, JOBS[t.action].yields);
    }
    this.finishTask(u, t, true);
  }

  private feed(u: ClassicUnit): void {
    const r = this.world.resources;
    if (r.meals > 0) {
      r.meals -= 1;
      this.world.eaten += 1;
      u.hunger = Math.max(0, u.hunger - CLASSIC.mealRelief);
    } else if (r.grain > 0) {
      r.grain -= 1;
      u.hunger = Math.max(0, u.hunger - CLASSIC.rawRelief);
    }
  }

  /** Scripted storm meal (colony.md §2): each living unit takes one meal from the store, if one is left. */
  private stormMeal(): void {
    const r = this.world.resources;
    for (const u of this.units) {
      if (u.dead || r.meals <= 0) continue;
      r.meals -= 1;
      this.world.eaten += 1;
      u.hunger = Math.max(0, u.hunger - CLASSIC.mealRelief);
    }
  }

  private injure(u: ClassicUnit, m: Minute): void {
    u.hp = Math.max(1, u.hp - CLASSIC.injuryHp);
    this.knockDown(u, 'injured');
    this.world.injuries += 1;
    this.events.injuries.push({ personId: u.id, kind: 'injury', minute: m });
  }
}

/** One-line label of what a Classic unit is doing, for the canvas and inspector. */
export function classicLabel(sim: ClassicSim, u: ClassicUnit): string {
  if (u.dead) return 'Dead';
  if (u.carriedBy) return `Carried by ${sim.unit(u.carriedBy).name}`;
  if (u.down === 'collapsed') return 'Collapsed from hunger';
  if (u.down === 'injured') return 'Injured, waiting for help';
  if (u.asleep) return 'Asleep';
  if (u.rest > 0) return 'Recovering at home';
  const t = u.task;
  if (!t) return 'Idle';
  const job = JOBS[t.action];
  if (t.action === 'carry-injured') {
    const v = t.victimId ? sim.unit(t.victimId).name : 'someone';
    return t.haul ? `Carrying ${v} home` : `Going to ${v}`;
  }
  if (t.phase === 'walk') return `Walking to ${placeById(t.placeId).label.split(' ·')[0]}`;
  if (t.phase === 'recover') return 'Beam fell: recovering';
  if (t.action === 'draw-water' && sim.world.wellUser !== u.id) return 'Waiting at the well';
  return job.doing.charAt(0).toUpperCase() + job.doing.slice(1);
}

/** Coarse state shared by both panes' views. */
export function unitState(u: ClassicUnit): VillagerState {
  if (u.dead) return 'dead';
  if (u.carriedBy) return 'carried';
  if (u.down) return 'down';
  if (u.asleep) return 'asleep';
  if (u.rest > 0) return 'resting';
  if (u.carrying) return 'carrying';
  const t = u.task;
  if (!t) return 'idle';
  if (t.phase === 'walk') return 'walking';
  if (t.action === 'eat') return 'eating';
  if (t.action === 'pray') return 'praying';
  if (t.action === 'shelter') return 'sheltering';
  return 'working';
}
