/**
 * Volumes of the chronicle (G3-3, spec §3): one generation's named question with an end that is not failure, an
 * epilogue in each living person's voice, and blank leaves printed with the conditions that fill them.
 *
 * Scope. A volume asks either "who keeps the Gate after <keeper>?" (it ends at the first thaw after the keeper has
 * left the wall: dead, gone, too old or lamed) or, when the Gate keeper is young, "will a child of the village stand
 * the wall?" (it ends at the thaw after a villager who was a child when the volume opened first stands a played
 * night). A fallen village also closes its volume, with the same epilogue. Questions are checked at the thaw only,
 * so a volume always closes on a page between winter and spring.
 */
import { spousesOf } from '@human/framework';
import { ageOf, childrenOf, living, RETIRE_AGE } from './life.ts';
import { isWatcher, nameOf, personOf } from './people.ts';
import type { Leaf, Volume, WatchState } from './state.ts';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const roman = (n: number): string => ROMAN[n - 1] ?? String(n);

export function freshLeaves(): Leaf[] {
  return [
    { id: 'born-stands', condition: 'when a child born here first stands the wall', filled: null },
    { id: 'married-in', condition: 'when an outsider is married in', filled: null },
    { id: 'grew-old', condition: 'when a watcher grows old on the wall, twenty winters on it', filled: null },
    { id: 'left', condition: 'when a household gives up and leaves', filled: null },
    { id: 'grandchild', condition: 'when someone born here has a child', filled: null },
  ];
}

/** Whether the current volume's question has resolved (checked at the thaw); sets its end text. */
export function volumeResolved(s: WatchState): boolean {
  const v = s.volume;
  if (v.end) return true;
  if (v.kind === 'gate' && v.who) {
    const p = personOf(s, v.who);
    const name = nameOf(s, v.who);
    const cast = s.cast[v.who];
    if (!p || !cast || cast.status !== 'here' || !isWatcher(s, p)) {
      const how =
        cast?.status === 'dead'
          ? `${name} is dead`
          : cast?.status === 'left'
            ? `${name} has gone down the valley`
            : cast?.limp
              ? `${name}’s leg will not take the stair`
              : `${name} is too old for the stair`;
      const next =
        s.gateKeeper && s.gateKeeper !== v.who ? `; ${nameOf(s, s.gateKeeper)} keeps the Gate` : '';
      v.end = `${how}${next}.`;
      return true;
    }
    return false;
  }
  return false;
}

/** Marks the 'child' question met when a villager who was a child at the volume's opening first stands the wall. */
export function firstStand(s: WatchState, id: string): void {
  const v = s.volume;
  const p = personOf(s, id);
  if (v.kind !== 'child' || v.end || !p) return;
  if (ageOf(p, v.openedMinute) >= 15) return;
  v.end = `${nameOf(s, id)}, a child when this volume opened, stood the wall.`;
}

function fateLine(s: WatchState, id: string): string {
  const p = personOf(s, id);
  if (!p) return '';
  const age = Math.floor(ageOf(p, s.minute));
  const mood = p.affect.mood.valence;
  const married = spousesOf(p).length > 0;
  const kids = childrenOf(s, p).length;
  const keeper = s.gateKeeper === id;
  if (age < 15) return mood >= 0 ? '“When I’m big I’ll stand the Gate.”' : '“I don’t like the dark.”';
  if (keeper)
    return mood >= 0
      ? '“The Gate is mine now. I hear the old ones on the stair.”'
      : '“I keep the Gate. Someone has to.”';
  if (age >= RETIRE_AGE)
    return mood >= 0
      ? '“I’ve seen enough winters. They were good ones, mostly.”'
      : '“My knees remember every night on that wall.”';
  if (kids > 0)
    return mood >= 0
      ? '“The children sleep. That’s what the wall is for.”'
      : '“I worry for the children, every night.”';
  if (married) return mood >= 0 ? '“We have a house and a fire. It’s enough.”' : '“We get by.”';
  return mood >= 0 ? '“I’ll stay. Where else would I go?”' : '“One more bad winter and I’ll go.”';
}

/** Closes the current volume with its epilogue (each living person of 10 and over, in their voice). */
export function closeVolume(s: WatchState, end?: string): void {
  const v = s.volume;
  if (end) v.end = end;
  v.end ??= 'The chronicle closes here.';
  v.epilogue = living(s)
    .filter((p) => ageOf(p, s.minute) >= 10)
    .map((p) => ({
      who: p.id,
      text: `${nameOf(s, p.id)}, ${Math.floor(ageOf(p, s.minute))}: ${fateLine(s, p.id)}`,
    }));
  s.volumes.push(structuredClone(v));
}

/** Opens the next volume with a question drawn from the living cast. */
export function openVolume(s: WatchState): void {
  const n = s.volume.n + 1;
  const keeper = s.gateKeeper ? personOf(s, s.gateKeeper) : undefined;
  let v: Volume;
  if (keeper && ageOf(keeper, s.minute) >= 45)
    v = {
      n,
      title: `${nameOf(s, keeper.id)}’s Gate`,
      question: `Who keeps the Gate after ${nameOf(s, keeper.id)}?`,
      kind: 'gate',
      who: keeper.id,
      openedYear: s.year,
      openedMinute: s.minute,
    };
  else
    v = {
      n,
      title: 'The children',
      question: 'Will a child of the village stand the wall?',
      kind: 'child',
      openedYear: s.year,
      openedMinute: s.minute,
    };
  s.volume = v;
  // Unfilled leaves carry over; filled ones stay in the closed volume.
  s.leaves = s.leaves.filter((l) => l.filled === null);
  for (const l of freshLeaves()) if (!s.leaves.some((x) => x.id === l.id)) s.leaves.push(l);
}
