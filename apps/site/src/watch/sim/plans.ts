/**
 * Scripted dusk plans for the headless gate (spec §10, G3-1: "against a telegraphed threat, testers post
 * differently and a bad plan visibly loses sacks"). A plan reads only what the Keeper can read at dusk: the
 * scout's warning. Used by tests; the game never calls it.
 */
import { type PostId, SECTION_IDS, type SectionId, WATCHERS, type WatcherId } from './config.ts';
import type { Input } from './night.ts';
import type { WatchState } from './state.ts';

export type PlanName = 'matched' | 'mismatched' | 'usual';

/** The section furthest along the wall from `id` (the plainly wrong place to stand). */
export function opposite(id: SectionId): SectionId {
  const i = SECTION_IDS.indexOf(id);
  return SECTION_IDS[i < 2 ? 3 : 0] ?? 'west';
}

/** Tamar and Mara on `focus`, Kian at the Gate (or the west wall when the focus is the Gate). */
function concentrate(focus: SectionId): Record<WatcherId, PostId> {
  const kian: SectionId = focus === 'gate' ? 'west' : 'gate';
  return { tamar: `${focus}-1` as PostId, mara: `${focus}-2` as PostId, kian: `${kian}-1` as PostId };
}

/**
 * The dusk inputs for a plan. `matched` concentrates on the warned approach, `mismatched` on the opposite end of
 * the wall, `usual` leaves the standing posts as they are and the lantern at the Gate. With `lantern` the lantern
 * starts the night at the plan's focus; without it every plan keeps it at the Gate, isolating posting.
 */
export function planInputs(s: WatchState, plan: PlanName, lantern: boolean): Input[] {
  if (plan === 'usual') return [{ k: 'lantern', section: 'gate' }];
  const focus = plan === 'matched' ? s.warned : opposite(s.warned);
  const posts = concentrate(focus);
  const inputs: Input[] = [];
  for (const w of WATCHERS) inputs.push({ k: 'post', watcher: w.id, post: null });
  for (const w of WATCHERS) inputs.push({ k: 'post', watcher: w.id, post: posts[w.id] ?? null });
  inputs.push({ k: 'lantern', section: lantern ? focus : 'gate' });
  return inputs;
}
