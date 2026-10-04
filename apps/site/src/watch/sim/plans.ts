/**
 * Scripted dusk plans for the headless gates (spec §10, G3-1: "against a telegraphed threat, testers post
 * differently and a bad plan visibly loses sacks"). A plan reads only what the Keeper can read at dusk: the
 * scout's warning and who has come to the wall. Used by tests; the game never calls it.
 */
import { type PostId, SECTION_IDS, type SectionId, watcherDef } from './config.ts';
import { type Input, presentIds } from './night.ts';
import type { Press, WatchState } from './state.ts';

export type PlanName = 'matched' | 'mismatched' | 'usual';

/** The section furthest along the wall from `id` (the plainly wrong place to stand). */
export function opposite(id: SectionId): SectionId {
  const i = SECTION_IDS.indexOf(id);
  return SECTION_IDS[i < 2 ? 3 : 0] ?? 'west';
}

/**
 * Posts around `focus`: the two best slings on it, the next on the neighbouring stretches (nearest first), and
 * anyone left on the remaining posts in wall order.
 */
function concentrate(s: WatchState, focus: SectionId): Map<string, PostId> {
  const people = presentIds(s).sort((a, b) => watcherDef(b).sling - watcherDef(a).sling);
  const fi = SECTION_IDS.indexOf(focus);
  const order = [...SECTION_IDS].sort(
    (a, b) => Math.abs(SECTION_IDS.indexOf(a) - fi) - Math.abs(SECTION_IDS.indexOf(b) - fi),
  );
  const slots: PostId[] = [`${focus}-1` as PostId, `${focus}-2` as PostId];
  for (const sec of order.slice(1)) slots.push(`${sec}-1` as PostId);
  for (const sec of order.slice(1)) slots.push(`${sec}-2` as PostId);
  const out = new Map<string, PostId>();
  people.forEach((id, i) => {
    const post = slots[i];
    if (post) out.set(id, post);
  });
  return out;
}

/**
 * The dusk inputs for a plan. `matched` concentrates on the warned approach, `mismatched` on the opposite end of
 * the wall, `usual` leaves the standing posts as they are and the lantern at the Gate. With `lantern` the lantern
 * starts the night at the plan's focus; without it every plan keeps it at the Gate, isolating posting.
 */
export function planInputs(s: WatchState, plan: PlanName, lantern: boolean, press: Press = 'ask'): Input[] {
  if (plan === 'usual') return [{ k: 'lantern', section: 'gate' }];
  const focus = plan === 'matched' ? s.warned : opposite(s.warned);
  const posts = concentrate(s, focus);
  const inputs: Input[] = [];
  for (const id of presentIds(s)) inputs.push({ k: 'post', watcher: id, post: null });
  for (const id of presentIds(s)) inputs.push({ k: 'post', watcher: id, post: posts.get(id) ?? null, press });
  inputs.push({ k: 'lantern', section: lantern ? focus : 'gate' });
  return inputs;
}
