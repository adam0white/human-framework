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

/**
 * Who keeps the Gate as of now, for the volume pages: the keeper while still on the wall, else the named heir if on
 * the wall. The handover itself is written at the next winter (`refreshGateKeeper`), but a volume closes and the next
 * opens at the thaw before it (owner's year-4 export: lamed Tamar's volume closed, and Volume II asked "Who keeps
 * the Gate after Tamar?" again, with her epilogue line still the keeper's).
 */
function gateKeeperNow(s: WatchState): string | null {
  for (const id of [s.gateKeeper, s.heir]) {
    const p = id ? personOf(s, id) : undefined;
    if (p && isWatcher(s, p)) return p.id;
  }
  return null;
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
      const keeper = gateKeeperNow(s);
      const next = keeper && keeper !== v.who ? `; ${nameOf(s, keeper)} keeps the Gate` : '';
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

const FATES: Record<string, readonly [readonly string[], readonly string[]]> = {
  child: [
    [
      '“When I’m big I’ll stand the Gate.”',
      '“I counted the stars from the wall stair.”',
      '“I want a sling of my own.”',
    ],
    [
      '“I don’t like the dark.”',
      '“I hear the wolves when the fire is low.”',
      '“Why do they always come in winter?”',
    ],
  ],
  keeper: [
    ['“The Gate is mine now. I hear the old ones on the stair.”', '“The Gate holds. I see to it.”'],
    ['“I keep the Gate. Someone has to.”', '“The Gate is heavy some nights.”'],
  ],
  old: [
    [
      '“I’ve seen enough winters. They were good ones, mostly.”',
      '“I taught the young ones to throw. Now they teach me patience.”',
      '“The wall knows my hands.”',
    ],
    [
      '“My knees remember every night on that wall.”',
      '“Too many faces gone. I keep their names.”',
      '“I am tired, and the winters are not.”',
    ],
  ],
  parent: [
    [
      '“The children sleep. That’s what the wall is for.”',
      '“I watch the wall so they can watch the sky.”',
      '“My little ones will be braver than me.”',
    ],
    [
      '“I worry for the children, every night.”',
      '“I don’t want them on that wall. Not yet.”',
      '“I count the children twice before I go up.”',
    ],
  ],
  married: [
    [
      '“We have a house and a fire. It’s enough.”',
      '“We stand the same stretch when we can.”',
      '“Home is warm. The wall is not.”',
    ],
    [
      '“We get by.”',
      '“We argue about the wall, then we go up together.”',
      '“A hard year. We are still here.”',
    ],
  ],
  single: [
    [
      '“I’ll stay. Where else would I go?”',
      '“The wall is where I’m some use.”',
      '“Someone has to know every stone.”',
    ],
    ['“One more bad winter and I’ll go.”', '“I don’t know why I stay.”', '“The nights are long, alone.”'],
  ],
};

function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** One line in this person's voice, by their life and mood; never a line someone earlier in `used` said. */
function fateLine(s: WatchState, id: string, used: Set<string>): string {
  const p = personOf(s, id);
  if (!p) return '';
  const age = Math.floor(ageOf(p, s.minute));
  const married = spousesOf(p).length > 0;
  const kids = childrenOf(s, p).length;
  const kind =
    age < 15
      ? 'child'
      : gateKeeperNow(s) === id
        ? 'keeper'
        : age >= RETIRE_AGE
          ? 'old'
          : kids > 0
            ? 'parent'
            : married
              ? 'married'
              : 'single';
  const mood = p.affect.mood.valence >= 0 ? 0 : 1;
  const lines = FATES[kind]?.[mood] ?? [];
  const from = hashId(id) % Math.max(1, lines.length);
  // Their mood's lines first, then the other mood's, before any line is said twice (owner's year-4 export: six
  // parents shared three lines, so two of them were said three times in one epilogue).
  for (const row of [lines, FATES[kind]?.[1 - mood] ?? []]) {
    const n = row.length;
    for (let k = 0; k < n; k++) {
      const line = row[(from + k) % n];
      if (line && !used.has(line)) {
        used.add(line);
        return line;
      }
    }
  }
  return lines[from] ?? '';
}

/** Closes the current volume with its epilogue (each living person of 10 and over, in their voice). */
export function closeVolume(s: WatchState, end?: string): void {
  const v = s.volume;
  if (end) v.end = end;
  v.end ??= 'The chronicle closes here.';
  const used = new Set<string>();
  v.epilogue = living(s)
    .filter((p) => ageOf(p, s.minute) >= 10)
    .map((p) => ({
      who: p.id,
      text: fateLine(s, p.id, used),
    }));
  s.volumes.push(structuredClone(v));
}

/** Opens the next volume with a question drawn from the living cast. */
export function openVolume(s: WatchState): void {
  const n = s.volume.n + 1;
  const now = gateKeeperNow(s);
  const keeper = now ? personOf(s, now) : undefined;
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
