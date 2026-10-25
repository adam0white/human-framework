/**
 * SCOPE: explicitly invoked host starter for two people repairing one shared bench. Owns clock,
 * input log, provisioning and task settlement; saves people, world and community together.
 * Uses existing HF decisions and activities. No renderer, storage service, physics, network,
 * telemetry, autonomous project adoption or new engine behaviour. Saves are trusted local JSON.
 */
import {
  type Community,
  communityState,
  consume,
  createCommunity,
  createPerson,
  restore,
  snapshot,
  stepCommunity,
  type World,
} from '../../src/index.ts';

export interface Input {
  until: number;
  workAvailable: boolean;
}
export interface Save {
  format: 'h3-starter/1';
  seed: number;
  now: number;
  repairs: number;
  inputs: Input[];
  people: ReturnType<typeof snapshot>[];
  community: ReturnType<typeof communityState>;
}

export class Starter {
  private community: Community;
  private now = 0;
  private repairs = 0;
  private inputs: Input[] = [];
  private seed: number;
  constructor(seed: number, saved?: Save) {
    this.seed = seed;
    if (saved && (saved.format !== 'h3-starter/1' || saved.seed !== seed))
      throw new Error('Unsupported starter save or seed.');
    this.community = saved
      ? createCommunity(saved.people.map(restore), saved.community)
      : createCommunity(
          ['Ari', 'Jo'].map((name, i) =>
            createPerson({
              id: name.toLowerCase(),
              name,
              seed: seed + i,
              bornAt: -30 * 365 * 1440,
              sex: i === 0 ? 'female' : 'male',
              norms: [],
            }),
          ),
        );
    if (saved) {
      this.now = saved.now;
      this.repairs = saved.repairs;
      this.inputs = structuredClone(saved.inputs);
    }
  }
  /** One input boundary is at most an hour; the host explicitly supplies reserves here. */
  apply(input: Input) {
    if (!Number.isSafeInteger(input.until) || input.until <= this.now || input.until - this.now > 60)
      throw new Error('Advance by one to sixty whole minutes.');
    for (const p of this.community.people) consume(p, { food: 0.3, water: 0.3 });
    const world: World = {
      now: () => this.now,
      perceptsFor: () => [],
      affordancesFor: () =>
        input.workAvailable && this.repairs < 4
          ? [
              {
                id: 'repair',
                action: 'repair',
                label: 'repair the bench',
                duration: 15,
                effort: 0.1,
                advertises: { competence: 0.4 },
              },
            ]
          : [],
      resolve: (p, activity, reason) => {
        const completed =
          reason === 'ended' &&
          activity.action === 'repair' &&
          activity.affordanceId === 'repair' &&
          this.repairs < 4;
        if (completed) this.repairs++;
        return {
          at: p.now,
          affordanceId: activity.affordanceId,
          action: activity.action,
          status: completed ? 'completed' : 'failed',
          needs: {},
        };
      },
    };
    stepCommunity(this.community, world, input.until);
    this.now = input.until;
    this.inputs.push(structuredClone(input));
  }
  save(): Save {
    return {
      format: 'h3-starter/1',
      seed: this.seed,
      now: this.now,
      repairs: this.repairs,
      inputs: structuredClone(this.inputs),
      people: this.community.people.map(snapshot),
      community: communityState(this.community),
    };
  }
}
export function replay(seed: number, inputs: Input[]): Starter {
  const host = new Starter(seed);
  for (const input of inputs) host.apply(input);
  return host;
}
