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

/** A deterministic choice among phrasings, varying by run, night and speaker (no RNG drawn). */
function pick(s: WatchState, id: WatcherId, salt: string, lines: string[]): string {
  let h = 0x811c9dc5;
  for (const c of `${s.seed}|${s.night}|${id}|${salt}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= h >>> 13;
  return lines[(h >>> 0) % lines.length] ?? lines[0] ?? '';
}

function noteOf(notes: NightNote[], who: WatcherId, kinds: NightNote['kind'][]): NightNote | undefined {
  return notes.find((n) => n.who === who && kinds.includes(n.kind));
}

/** What a watcher's own words tell the Keeper (an impression key and value), heard at dawn. */
export interface Tell {
  who: WatcherId;
  key: string;
  value: number;
}

/**
 * One or two lines per watcher present, and what those words tell the Keeper (`tells`: a spoken fear of a stretch,
 * a spoken bond). Nodding off is told by at most one watcher a night, and not by one who already speaks of a fear
 * or a bond. A watcher the bell held says how it felt, more bitterly the more they value their own say.
 */
export function dawnVoices(s: WatchState): { voices: { who: WatcherId; text: string }[]; tells: Tell[] } {
  const out: { who: WatcherId; text: string }[] = [];
  const tells: Tell[] = [];
  let dozeTold = false;
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
    const dozed = s.notes.filter((n) => n.who === id && n.kind === 'dozed');
    const together = s.notes.filter((n) => n.who === id && n.kind === 'together' && n.other);
    const commanded = noteOf(s.notes, id, ['commanded']);
    const tell = (key: string, value: number) => tells.push({ who: id, key, value });
    const fear = fearedSection(p);

    if (bitten?.section) {
      said.push(
        told.pain < 0.2
          ? `“It’s a scratch.” (the wolf at ${theSec(bitten.section)})`
          : `“That wolf at ${theSec(bitten.section)} had my leg. I can still feel its teeth.”`,
      );
      if (told.pain >= 0.2) tell(`fear@${bitten.section}`, 0.6);
    } else if (down?.section) {
      said.push(`“They knocked me flat at ${theSec(down.section)}. I don’t remember falling.”`);
      tell(`fear@${down.section}`, 0.5);
    } else if (left?.section) {
      const verb = left.kind === 'froze' ? 'I couldn’t move' : 'I couldn’t stay';
      said.push(`“${verb} at ${theSec(left.section)}. Not with them that close.”`);
      tell(`fear@${left.section}`, 0.75);
    } else if (shaken?.section) {
      const bravado = reserveOf(p, 'fear') * IMPRESSION_DEFAULTS.wordsReserve > 0.5;
      if (!bravado) tell(`fear@${shaken.section}`, 0.55);
      said.push(
        bravado
          ? `“Nothing I couldn’t handle at ${theSec(shaken.section)}.”`
          : pick(s, id, 'shaken', [
              `“They came right up under me at ${theSec(shaken.section)}. I keep hearing them.”`,
              `“I could hear them breathing under ${theSec(shaken.section)}.”`,
              `“Something came to the foot of ${theSec(shaken.section)}. I didn’t blink till dawn.”`,
            ]),
      );
    } else if (fear && fear.level > 0.15) {
      said.push(`“I don’t like ${theSec(fear.section)}. Something’s out there.”`);
      tell(`fear@${fear.section}`, Math.min(0.8, 0.3 + fear.level));
    }

    if (carried?.other) {
      said.push(
        `“${watcherDef(carried.other).name} got me off the wall. I owe ${watcherDef(carried.other).sex === 'female' ? 'her' : 'him'}.”`,
      );
      tell(`tie:${carried.other}`, 0.7);
    } else if (carrier?.other) {
      said.push(`“Somebody had to get ${watcherDef(carrier.other).name} down.”`);
    } else if (home) {
      said.push(
        `“I went to ${def.family ? def.family.replace(/^(his|her) /, 'my ') : 'the house'}. I’d go again.”`,
      );
    } else if (together.length > 0) {
      const t = together.map((n) => ({ n, tie: p.social.relationships.find((r) => r.otherId === n.other) }));
      t.sort((a, b) => Math.abs(b.tie?.affection ?? 0) - Math.abs(a.tie?.affection ?? 0));
      const best = t[0];
      const other = best?.n.other ? watcherDef(best.n.other).name : 'someone';
      if (best?.n.other) tell(`tie:${best.n.other}`, (best.tie?.affection ?? 0) > 0 ? 0.6 : -0.5);
      said.push(
        (best?.tie?.affection ?? 0) > 0
          ? pick(s, id, 'with', [
              `“${other} was beside me when they came. That helped.”`,
              `“With ${other} next to me I could stand it.”`,
              `“I stayed because ${other} stayed.”`,
            ])
          : pick(s, id, 'against', [
              `“${other} stood my stretch. I kept one eye on ${other} all night.”`,
              `“I don’t turn my back with ${other} on the wall.”`,
            ]),
      );
    } else if (refused?.section) {
      said.push(`“I wasn’t going to stand ${theSec(refused.section)}.”`);
    }

    if (commanded) {
      // The bell's cost, in their words: bitter in proportion to how much they value their own say.
      const autonomy = p.needs.autonomy ?? 0.5;
      said.push(
        autonomy < 0.45
          ? '“You rang me down like a dog.”'
          : autonomy < 0.6
            ? '“I heard the bell. I held. I didn’t like it.”'
            : '“I heard the bell. I held.”',
      );
    }

    // Nodding off: told by one watcher a night at most, only when it happened more than once, not by someone who
    // has already spoken of a fear or a bond, and a reserved person keeps it to themselves.
    const sec = dozed[0]?.section;
    if (
      !dozeTold &&
      dozed.length >= 2 &&
      sec &&
      said.length === 0 &&
      reserveOf(p, 'fatigue') * IMPRESSION_DEFAULTS.wordsReserve < 0.5
    ) {
      said.push(`“I kept nodding off at ${theSec(sec)}.”`);
      dozeTold = true;
    }

    if (said.length === 0) {
      if (told.fatigue > 0.5) said.push('“Long night.”');
      else said.push(def.newcomer ? '“Quiet. They watch me more than the dark.”' : '“Quiet enough.”');
    }
    out.push({ who: id, text: said.join(' ') });
  }
  return { voices: out, tells };
}

/** For tests and the export: the person behind a voice. */
export function voiceOf(s: WatchState, id: WatcherId): Person | undefined {
  return personOf(s, id);
}
