/** Retain explanations during one account visit, using only the public Keeper frame. No rules or state writes. */
import type { NightAct } from '../sim/night-actions.ts';
import type { Frame, FrameWatcher } from '../sim/view.ts';

export const nightActKey = (act: NightAct) => JSON.stringify(act.input);

export function retainedNightActs(frame: Frame, who: FrameWatcher, seen: NightAct[]): NightAct[] {
  // A completed withdrawal ends the request context, even while its account remains open.
  if (who.post === null) return [];
  const current = new Map(who.acts.map((act) => [nightActKey(act), act]));
  return [...new Map([...seen, ...who.acts].map((act) => [nightActKey(act), act])).values()].map((act) => {
    const now = current.get(nightActKey(act));
    if (now) return now;
    let reason = who.acts.length === 0 ? who.actsUnavailable : null;
    if (reason?.startsWith('No rest or help request'))
      reason = 'The latest account and look no longer show tiredness or hurt; no wolf is at this post.';
    if (!reason && who.account && !who.account.spoken) reason = who.account.text;
    if (!reason && act.input.k !== 'down') {
      const helper = frame.watchers.find((w) => w.id === (act.input.k === 'down' ? '' : act.input.by));
      reason = !helper
        ? 'No longer on this watch.'
        : helper.post === null && helper.place !== 'hall'
          ? 'Away from the wall and hall.'
          : helper.account && !helper.account.spoken
            ? helper.account.text
            : null;
    }
    reason ??=
      act.input.k === 'help'
        ? 'No current sign of hurt or a wolf at this post.'
        : 'The latest look no longer shows tiredness.';
    return { ...act, available: false, read: reason };
  });
}

/** Each reason is printed once, followed by all helpers with that reason. */
export function groupedUnavailable(acts: NightAct[], frame: Frame): string[] {
  const groups = new Map<string, string[]>();
  for (const act of acts) {
    const reason = act.read.replace(/^Too far to call .*?; /, 'Out of your voice; ');
    const names = groups.get(reason) ?? [];
    const id = act.input.k === 'down' ? act.input.who : act.input.by;
    names.push(frame.watchers.find((w) => w.id === id)?.name ?? id);
    groups.set(reason, names);
  }
  return [...groups].map(([reason, names]) => `${names.join(', ')}: ${reason}`);
}
