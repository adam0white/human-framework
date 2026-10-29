import type { PersonAuthoring } from '@adam0white/human-framework';
/** Focused tests author a world opening; they never patch a live actor. */
import { actorState, type Person, readActor } from './actor.ts';
import { FOUNDER_KIN, WATCHERS } from './config.ts';
import { minuteMs, WatchActors } from './hf4.ts';
import { authoredKin, authoredWatcher, watchPerson, watchSpec } from './hf4-authoring.ts';
import { newGame } from './night.ts';
export function publicFixture(minute = 1800, author?: (people: PersonAuthoring[]) => void) {
  const s = newGame(7),
    at = minuteMs(minute),
    game = { actions: [], care: null };
  const people = [
    watchPerson('keeper', 'Keeper', 'male', 40, at),
    ...WATCHERS.map((def) => authoredWatcher(def, at)),
    ...FOUNDER_KIN.map((kin, i) => authoredKin(kin, i, at)),
  ];
  author?.(people);
  const runtime = WatchActors.create({ ...watchSpec(7, game), start: at }, people, game);
  s.actors = actorState(runtime, people);
  s.actorEvents = [];
  s.minute = minute;
  s.phase = 'dawn';
  for (const v of Object.values(s.cast)) {
    v.status = 'here';
    s.place[v.id] = 'village';
  }
  return s;
}
export function requirePerson(s: ReturnType<typeof publicFixture>, id: string): Person {
  const p = readActor(s, id);
  if (!p) throw new Error(`Missing ${id}`);
  return p;
}
