/**
 * What the watchers say at dawn (G3-2), in their own words. Each line comes from the night's notes (what they did
 * or suffered) and the person's own state: their fear of a stretch of wall (a fear emotion aimed at it, or a learned
 * bad expectation of standing it), and their ties (who carried them, who they went home to, who they won't stand
 * with). Words go through `selfReport`, so a proud watcher says "a scratch" about a bite: the page shows what they
 * say, not what is true. Faith stays out of it.
 */
import { IMPRESSION_DEFAULTS, type Person, reserveOf, selfReport } from '@human/framework';
import { SECTION_IDS, type SectionId, type WatcherId, watcherDef } from './config.ts';
import { personOf } from './people.ts';
import type { NightNote, WatchState } from './state.ts';

function theSec(id: SectionId): string {
  return id === 'gate' ? 'the Gate' : `the ${id} wall`;
}

/** The stretch of wall a person fears most, with how strongly (fear aimed at it, or a learned bad expectation). */
export function fearedSection(p: Person): { section: SectionId; level: number } | null {
  let best: { section: SectionId; level: number } | null = null;
  for (const sec of SECTION_IDS) {
    let level = 0;
    for (const e of p.affect.emotions) if (e.id === 'fear' && e.targetId === sec) level += e.intensity;
    for (const x of p.memory.expectations)
      if (x.key === `hold-post@${sec}` && x.valence < 0) level = Math.max(level, -x.valence);
    if (level > 0.08 && (!best || level > best.level)) best = { section: sec, level };
  }
  return best;
}

function noteOf(notes: NightNote[], who: WatcherId, kinds: NightNote['kind'][]): NightNote | undefined {
  return notes.find((n) => n.who === who && kinds.includes(n.kind));
}

/** One or two lines per watcher present. */
export function dawnVoices(s: WatchState): { who: WatcherId; text: string }[] {
  const out: { who: WatcherId; text: string }[] = [];
  for (const p of s.community.people) {
    const id = p.id as WatcherId;
    const def = watcherDef(id);
    const said: string[] = [];
    const told = selfReport(p);
    const bitten = noteOf(s.notes, id, ['bitten']);
    const down = noteOf(s.notes, id, ['downed']);
    const carried = noteOf(s.notes, id, ['carried']);
    const carrier = noteOf(s.notes, id, ['carrier']);
    const left = noteOf(s.notes, id, ['fled', 'ran', 'froze']);
    const home = noteOf(s.notes, id, ['home']);
    const refused = noteOf(s.notes, id, ['refused', 'modified']);
    const shaken = noteOf(s.notes, id, ['shaken']);
    const together = s.notes.filter((n) => n.who === id && n.kind === 'together' && n.other);
    const fear = fearedSection(p);

    if (bitten?.section) {
      said.push(
        told.pain < 0.2
          ? `“It’s a scratch.” (the wolf at ${theSec(bitten.section)})`
          : `“That wolf at ${theSec(bitten.section)} had my leg. I can still feel its teeth.”`,
      );
    } else if (down?.section) {
      said.push(`“They knocked me flat at ${theSec(down.section)}. I don’t remember falling.”`);
    } else if (left?.section) {
      const verb = left.kind === 'froze' ? 'I couldn’t move' : 'I couldn’t stay';
      said.push(`“${verb} at ${theSec(left.section)}. Not with them that close.”`);
    } else if (shaken?.section) {
      said.push(
        reserveOf(p, 'fear') * IMPRESSION_DEFAULTS.wordsReserve > 0.5
          ? `“Nothing I couldn’t handle at ${theSec(shaken.section)}.”`
          : `“They came right up under me at ${theSec(shaken.section)}. I keep hearing them.”`,
      );
    } else if (fear && fear.level > 0.15) {
      said.push(`“I don’t like ${theSec(fear.section)}. Something’s out there.”`);
    }

    if (carried?.other) {
      said.push(
        `“${watcherDef(carried.other).name} got me off the wall. I owe ${watcherDef(carried.other).sex === 'female' ? 'her' : 'him'}.”`,
      );
    } else if (carrier?.other) {
      said.push(`“Somebody had to get ${watcherDef(carrier.other).name} down.”`);
    } else if (home) {
      said.push(`“I went to ${def.family ?? 'the house'}. I’d go again.”`);
    } else if (together.length > 0) {
      const t = together.map((n) => ({ n, tie: p.social.relationships.find((r) => r.otherId === n.other) }));
      t.sort((a, b) => Math.abs(b.tie?.affection ?? 0) - Math.abs(a.tie?.affection ?? 0));
      const best = t[0];
      const other = best?.n.other ? watcherDef(best.n.other).name : 'someone';
      said.push(
        (best?.tie?.affection ?? 0) > 0
          ? `“${other} was beside me when they came. That helped.”`
          : `“${other} stood my stretch. I kept one eye on ${other} all night.”`,
      );
    } else if (refused?.section) {
      said.push(`“I wasn’t going to stand ${theSec(refused.section)}.”`);
    }

    if (said.length === 0) {
      if (told.fatigue > 0.5) said.push('“Long night.”');
      else said.push(def.newcomer ? '“Quiet. They watch me more than the dark.”' : '“Quiet enough.”');
    }
    out.push({ who: id, text: said.join(' ') });
  }
  return out;
}

/** For tests and the export: the person behind a voice. */
export function voiceOf(s: WatchState, id: WatcherId): Person | undefined {
  return personOf(s, id);
}
