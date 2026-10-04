/**
 * The day between two nights (G3-2), summarised: at the dusk transition the watchers live 06:00 to 17:00 in one
 * go (sleep, eat, work, rest, mend the bell rope) and the dusk panel shows a line per watcher.
 *
 * Scope. The rope is mended by someone's day: each completed two hours of mending takes `ROPE_MEND_PER_HOUR × 2 ×
 * craft` wear off, and a snapped rope is whole again once its wear is below 1. A quick knot at dawn takes
 * `ROPE_DAWN_MEND` off whatever happens. Wounds are dressed in the village (tended once). Newcomers arrive at dusk.
 * Not covered: the fair, trade, seasons and years (G3-3).
 */
import { observeAct, skillLevel, tend } from '@human/framework';
import { DAY, DUSK_START, NIGHTFALL, ROPE_DAWN_MEND, ROPE_MEND_PER_HOUR, type WatcherId } from './config.ts';
import { presentIds, stepPeople } from './night.ts';
import { arrive, isWatcher, nameOf, personOf, villager } from './people.ts';
import type { DaySummary, WatchState } from './state.ts';

/** Lives the day and opens the next dusk. Called by the 'toDusk' input. */
export function advanceDay(s: WatchState): void {
  const day = Math.floor(s.minute / DAY);
  const dusk = day * DAY + DUSK_START;
  const ropeBefore = s.rope.snapped ? 1 : s.rope.wear;
  s.dawn = null;
  s.alerts = [];
  s.slowUntil = -1;
  s.commands = {};
  for (const [id, post] of Object.entries(s.letGo)) {
    const w = id as WatcherId;
    if (post && s.posts[w] === null && !Object.values(s.posts).includes(post)) s.posts[w] = post;
  }
  s.letGo = {};
  s.called = { west: false, gate: false, mill: false, east: false };
  s.rope.wear = Math.max(0, s.rope.wear - ROPE_DAWN_MEND);
  for (const p of s.community.people) tend(p);

  const slept: Partial<Record<WatcherId, number>> = {};
  const mended: Partial<Record<WatcherId, number>> = {};
  const worked: Partial<Record<WatcherId, number>> = {};
  // Step in hours so the world's clock follows the day.
  for (let t = Math.min(dusk, s.minute + 60); ; t = Math.min(dusk, t + 60)) {
    s.minute = t;
    for (const e of stepPeople(s, t)) {
      const id = e.personId as WatcherId;
      if (e.kind === 'begin' && e.action === 'sleep') slept[id] = (slept[id] ?? 0) + 1;
      if (e.kind === 'finish' && e.action === 'work' && e.status === 'completed')
        worked[id] = (worked[id] ?? 0) + 2;
      if (e.kind === 'finish' && e.action === 'mend' && e.status === 'completed') {
        const p = personOf(s, id);
        const craft = p ? skillLevel(p, 'craft') : 0.3;
        s.rope.wear = Math.max(0, s.rope.wear - ROPE_MEND_PER_HOUR * 2 * craft);
        mended[id] = (mended[id] ?? 0) + 2;
      }
    }
    if (t >= dusk) break;
  }
  if (s.rope.snapped && s.rope.wear < 1) s.rope.snapped = false;
  if (s.rope.wear >= 1) s.rope = { wear: 1, snapped: true };

  const lines: DaySummary['lines'] = [];
  for (const p of s.community.people) {
    if (!isWatcher(s, p)) continue;
    const id = p.id;
    const name = nameOf(s, id);
    const parts: string[] = [];
    if ((mended[id] ?? 0) > 0) parts.push(`spent ${mended[id]} hours on the bell rope`);
    else if ((worked[id] ?? 0) >= 4) parts.push('worked most of the day');
    if ((slept[id] ?? 0) === 0) parts.push('never lay down');
    lines.push({
      who: id,
      text: parts.length > 0 ? `${name} ${parts.join(' and ')}.` : `${name} slept and ate.`,
    });
  }
  s.night += 1;
  s.winterNight += 1;
  s.minute = dusk;
  s.nightStart = day * DAY + NIGHTFALL;
  s.phase = 'dusk';
  s.day = { night: s.night, lines, ropeBefore, ropeAfter: s.rope.snapped ? 1 : s.rope.wear };
  const watchers = new Set(presentIds(s));
  for (const id of arrive(s)) {
    if (!presentIds(s).includes(id) || watchers.has(id)) continue;
    const usual = villager(s, id).usual;
    const taken = Object.values(s.posts).includes(usual) || !s.openPosts.includes(usual);
    s.posts[id] = taken ? null : usual;
    s.postedAt[id] = s.minute;
    lines.push({ who: id, text: `${nameOf(s, id)} came through the gate today.` });
    // An old grudge shows the moment they meet: someone turns away, and the Keeper sees it.
    for (const p of s.community.people) {
      if (p.id === id) continue;
      const tie = p.social.relationships.find((r) => r.otherId === id);
      if (!tie || tie.affection > -0.4) continue;
      const w = p.id;
      if (!isWatcher(s, p)) continue;
      lines.push({ who: w, text: `${nameOf(s, w)} turned away when ${nameOf(s, id)} came in.` });
      observeAct(s.keeper, w, { at: s.minute, clarity: 0.8, withId: id, toward: -1 });
    }
  }
}
