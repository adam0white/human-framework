/**
 * What the watchers say at dawn (G3-2), in their own words. Each line comes from the night's notes (what they did
 * or suffered) and the person's own state: their fear of a stretch of wall (a fear emotion aimed at it, or a learned
 * bad expectation of standing it), and their ties (who carried them, who they went home to, who they won't stand
 * with). Words go through `selfReport`, so a proud watcher says "a scratch" about a bite: the page shows what they
 * say, not what is true. Faith stays out of it.
 */
import { IMPRESSION_DEFAULTS, type Person, reserveOf, selfReport } from '@adam0white/human-framework';
import { postSection, SECTION_IDS, type SectionId, type WatcherId } from './config.ts';
import { familyWords, isWatcher, nameOf, personOf, villager } from './people.ts';
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

/**
 * Like `pick`, but avoids a line already spoken this dawn (`used`) and the speaker's own line from the last dawn
 * (`last`) when another phrasing is free (G3-4 review: lines repeated across speakers and nights).
 */
function pickFresh(
  s: WatchState,
  id: WatcherId,
  salt: string,
  lines: string[],
  used: Set<string>,
  last: string,
): string {
  const first = pick(s, id, salt, lines);
  const start = Math.max(0, lines.indexOf(first));
  for (let k = 0; k < lines.length; k++) {
    const l = lines[(start + k) % lines.length] ?? first;
    if (!used.has(l) && !last.includes(l)) return l;
  }
  for (let k = 0; k < lines.length; k++) {
    const l = lines[(start + k) % lines.length] ?? first;
    if (!used.has(l)) return l;
  }
  return first;
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
  const used = new Set<string>();
  // Only this dawn's speakers keep a last line: a lamed, retired or absent watcher's old words do not linger.
  const lastVoices = s.lastVoices;
  s.lastVoices = {};
  for (const p of s.community.people) {
    if (!isWatcher(s, p)) continue;
    const id = p.id;
    const v = villager(s, id);
    const said: string[] = [];
    const last = lastVoices[id] ?? '';
    const say = (salt: string, lines: string[]) => {
      const l = pickFresh(s, id, salt, lines, used, last);
      used.add(l);
      said.push(l);
    };
    const post = s.posts[id];
    const stood = post ? postSection(post) : null;
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
    const drove = SECTION_IDS.find((sec) => s.tally.heroes[sec].includes(id)) ?? null;
    const slept = noteOf(s.notes, id, ['slept']);

    if (bitten?.section) {
      said.push(
        told.pain < 0.2
          ? `“It’s a scratch.” (the wolf at ${theSec(bitten.section)})`
          : `“That wolf at ${theSec(bitten.section)} had my leg. I can still feel its teeth.”`,
      );
      if (told.pain >= 0.2) tell(`fear@${bitten.section}`, 0.6);
    } else if (down?.section) {
      say('down', [
        `“They knocked me flat at ${theSec(down.section)}. I don’t remember falling.”`,
        `“I went down at ${theSec(down.section)}. Next I knew, it was grey light.”`,
        `“Something hit me at ${theSec(down.section)}. My head still rings.”`,
      ]);
      tell(`fear@${down.section}`, 0.5);
    } else if (left?.section) {
      const at = theSec(left.section);
      // The cause in their words: what they will own to (selfReport), so pride may still call it the cold.
      const why =
        told.fear >= told.fatigue && told.fear > 0.3
          ? ' Not with them that close.'
          : told.fatigue > 0.4
            ? ' I was asleep on my feet.'
            : told.pain > 0.3
              ? ' My leg wouldn’t hold me.'
              : ' The cold got into me.';
      if (left.kind === 'froze')
        say('froze', [
          `“I couldn’t move at ${at}. Not with them that close.”`,
          `“I stood like a post at ${at}. My legs wouldn’t answer.”`,
          `“At ${at} I just… stopped. I’m sorry.”`,
        ]);
      else
        say('left', [
          `“I couldn’t stay at ${at}. Not with them that close.”`,
          `“I got down off ${at}.${why}”`,
          `“They were right under ${at}. I ran. Say what you like.”`,
          `“I left ${at}.${why}”`,
        ]);
      tell(`fear@${left.section}`, 0.75);
    } else if (shaken?.section) {
      const bravado = reserveOf(p, 'fear') * IMPRESSION_DEFAULTS.wordsReserve > 0.5;
      if (!bravado) tell(`fear@${shaken.section}`, 0.55);
      said.push(
        bravado
          ? `“Nothing I couldn’t handle at ${theSec(shaken.section)}.”`
          : pickFresh(
              s,
              id,
              'shaken',
              [
                `“They came right up under me at ${theSec(shaken.section)}. I keep hearing them.”`,
                `“I could hear them breathing under ${theSec(shaken.section)}.”`,
                // Only someone still on the wall at dawn can say they watched till dawn (owner's year-4 export:
                // Mara went home to sleep and still said she "didn't blink till dawn").
                home || refused || slept
                  ? `“Something came to the foot of ${theSec(shaken.section)}. I didn’t stay to see it.”`
                  : `“Something came to the foot of ${theSec(shaken.section)}. I didn’t blink till dawn.”`,
              ],
              used,
              last,
            ),
      );
      used.add(said.at(-1) ?? '');
    } else if (drove) {
      say('drove', [
        `“They came at ${theSec(drove)}. We sent them off.”`,
        `“Something tried ${theSec(drove)}. It didn’t try twice.”`,
        `“I had a stone in the sling all night at ${theSec(drove)}. Glad I did.”`,
      ]);
    } else if (fear && fear.level > 0.15) {
      // Said from where they stood: a fear of another stretch is told as looking over at it.
      if (stood && stood !== fear.section)
        say('fear-far', [
          `“From ${theSec(stood)} I kept looking over at ${theSec(fear.section)}.”`,
          `“I was glad not to be on ${theSec(fear.section)}.”`,
          `“Every sound from ${theSec(fear.section)}, I jumped.”`,
        ]);
      else
        say('fear', [
          `“I don’t like ${theSec(fear.section)}. Something’s out there.”`,
          `“${capital(theSec(fear.section))} again. I hate that stretch.”`,
          `“There’s something about ${theSec(fear.section)}. I can’t say what.”`,
          `“Don’t put me on ${theSec(fear.section)} too often.”`,
        ]);
      tell(`fear@${fear.section}`, Math.min(0.8, 0.3 + fear.level));
    }

    if (carried?.other) {
      said.push(
        `“${nameOf(s, carried.other)} got me off the wall. I owe ${villager(s, carried.other).sex === 'female' ? 'her' : 'him'}.”`,
      );
      tell(`tie:${carried.other}`, 0.7);
    } else if (carrier?.other) {
      said.push(`“Somebody had to get ${nameOf(s, carrier.other)} down.”`);
    } else if (home) {
      const family = familyWords(s, id);
      said.push(`“I went to ${family ? family.replace(/^(his|her) /, 'my ') : 'the house'}. I’d go again.”`);
    } else if (together.length > 0) {
      const t = together.map((n) => ({ n, tie: p.social.relationships.find((r) => r.otherId === n.other) }));
      t.sort((a, b) => Math.abs(b.tie?.affection ?? 0) - Math.abs(a.tie?.affection ?? 0));
      const best = t[0];
      const other = best?.n.other ? nameOf(s, best.n.other) : 'someone';
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
      if (autonomy < 0.45)
        say('bell-bitter', [
          '“You rang me down like a dog.”',
          '“Ring at me like that again and see.”',
          '“I’m not a cow to be called with a bell.”',
        ]);
      else if (autonomy < 0.6)
        say('bell-grudge', [
          '“I heard the bell. I held. I didn’t like it.”',
          '“I held for the bell. Don’t make a habit of it.”',
          '“The bell kept me there. My own sense wouldn’t have.”',
        ]);
      else
        say('bell', ['“I heard the bell. I held.”', '“The bell rang; I stayed.”', '“I held when you rang.”']);
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
      say('doze', [
        `“I kept nodding off at ${theSec(sec)}.”`,
        `“My head kept dropping at ${theSec(sec)}. I pinched myself awake.”`,
        `“I’ll own it: I dozed at ${theSec(sec)}, more than once.”`,
      ]);
      dozeTold = true;
    }

    if (said.length === 0 && slept?.section)
      say('slept', [
        `“I went home to sleep. I’d have fallen off ${theSec(slept.section)} otherwise.”`,
        `“I couldn’t keep my eyes open. I went to my bed.”`,
      ]);
    if (said.length === 0) {
      if (told.fatigue > 0.5)
        say('long', [
          '“Long night.”',
          '“My eyes ache.”',
          '“I’d sleep standing if you let me.”',
          '“I could sleep a week.”',
          '“The last hour was the longest.”',
        ]);
      // "They watch me more than the dark" is a first winter's line (owner's year-4 export: Ruslan, in his fourth
      // winter, still said it). Someone who came between winters (night 0) has their first winter the next year.
      else if (v.newcomer && s.year <= v.comes.year + (v.comes.night > 0 ? 0 : 1))
        say('new', [
          '“Quiet. They watch me more than the dark.”',
          '“Nobody spoke to me all night. That’s all right.”',
          '“Quiet. I’m learning which shadows are trees.”',
        ]);
      else
        say('quiet', [
          '“Quiet enough.”',
          '“Cold, and nothing else.”',
          '“Nothing came my way.”',
          '“Just the wind.”',
          '“I counted the stars. Nothing to tell.”',
          '“An owl, a fox, and the cold. That’s all.”',
          '“Frost on my sleeve by midnight. Nothing else.”',
          '“I watched the mist come and go.”',
        ]);
    }
    let text = said.join(' ');
    // Two people never say the very same words on one dawn: a second speaker adds a word of their own.
    if (out.some((o) => o.text === text))
      text += ` ${pickFresh(s, id, 'tail', ['“That’s all.”', '“Cold, though.”', '“Long night.”', '“I’m tired.”', '“Ask the others.”'], used, last)}`;
    out.push({ who: id, text });
  }
  for (const o of out) s.lastVoices[o.who] = o.text;
  return { voices: out, tells };
}

function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** For tests and the export: the person behind a voice. */
export function voiceOf(s: WatchState, id: WatcherId): Person | undefined {
  return personOf(s, id);
}
