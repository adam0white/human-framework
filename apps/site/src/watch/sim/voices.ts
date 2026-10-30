/**
 * What the watchers say at dawn (G3-2), in their own words. Each line comes from the night's notes (what they did
 * or suffered) and the person's own state: their fear of a stretch of wall (a fear emotion aimed at it, or a learned
 * bad expectation of standing it), and their ties (who carried them, who they went home to, who they won't stand
 * with). Words go through `selfReport`, so a proud watcher says "a scratch" about a bite: the page shows what they
 * say, not what is true. Faith stays out of it.
 */
import { type WatchPerson as Person, actorReport as selfReport } from './actor.ts';
import { DAY, postSection, SECTION_IDS, type SectionId, type WatcherId } from './config.ts';
import { familyWords, isWatcher, nameOf, villager } from './people.ts';
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
  let cryTold = false;
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
    const woken = noteOf(s.notes, id, ['woken']);

    if (bitten?.section) {
      said.push(
        told.pain < 0.2
          ? `“The wolf at ${theSec(bitten.section)} only scratched me.”`
          : `“That wolf at ${theSec(bitten.section)} had my leg. I can still feel its teeth.”`,
      );
      if (told.pain >= 0.2) tell(`fear@${bitten.section}`, 0.6);
    } else if (down?.section) {
      say('down', [
        `“They knocked me flat at ${theSec(down.section)}. I don’t remember falling.”`,
        `“I went down at ${theSec(down.section)}. When I became aware again, dawn had come.”`,
        `“Something hit me at ${theSec(down.section)}. I can still hear ringing in my head.”`,
      ]);
      tell(`fear@${down.section}`, 0.5);
    } else if (left?.section) {
      const at = theSec(left.section);
      // The cause in their words: what they will own to (selfReport), so pride may still call it the cold.
      const why =
        told.fear >= told.fatigue && told.fear > 0.3
          ? ' I could not stay with them that close.'
          : told.fatigue > 0.4
            ? ' I could barely stay awake.'
            : told.pain > 0.3
              ? ' My leg could not support my weight.'
              : ' I was very cold.';
      if (left.kind === 'froze')
        say('froze', [
          `“I couldn’t move at ${at}. They were too close.”`,
          `“I stood still at ${at}. I could not move my legs.”`,
          `“At ${at} I just… stopped. I’m sorry.”`,
        ]);
      else
        say('left', [
          `“I couldn’t stay at ${at}. They were too close.”`,
          `“I got down off ${at}.${why}”`,
          `“They were right under ${at}. I ran. Say what you like.”`,
          `“I left ${at}.${why}”`,
        ]);
      tell(`fear@${left.section}`, 0.75);
    } else if (shaken?.section) {
      const bravado = told.fear < 0.2;
      if (!bravado) tell(`fear@${shaken.section}`, 0.55);
      said.push(
        bravado
          ? `“Nothing happened at ${theSec(shaken.section)} that I could not handle.”`
          : pickFresh(
              s,
              id,
              'shaken',
              [
                `“They came right up under me at ${theSec(shaken.section)}. I keep hearing them.”`,
                `“I could hear them breathing under ${theSec(shaken.section)}.”`,
                // Only someone still on the wall at dawn can say they watched till dawn (owner's year-4 export:
                // Samira went home to sleep and still said she "didn't blink till dawn").
                home || refused || slept
                  ? `“Something came to the foot of ${theSec(shaken.section)}. I didn’t stay to see it.”`
                  : `“Something came to the foot of ${theSec(shaken.section)}. I watched closely until dawn.”`,
              ],
              used,
              last,
            ),
      );
      used.add(said.at(-1) ?? '');
    } else if (drove) {
      say('drove', [
        `“They came at ${theSec(drove)}. We sent them off.”`,
        `“Something tried to cross ${theSec(drove)}. It did not try again.”`,
        `“I had a stone in the sling all night at ${theSec(drove)}. I was glad I did.”`,
      ]);
    } else if (fear && fear.level > 0.15) {
      // Said from where they stood: a fear of another stretch is told as looking over at it.
      if (stood && stood !== fear.section)
        say('fear-far', [
          `“From ${theSec(stood)} I kept looking over at ${theSec(fear.section)}.”`,
          `“I was glad not to be on ${theSec(fear.section)}.”`,
          `“Every sound from ${theSec(fear.section)} startled me.”`,
        ]);
      else
        say('fear', [
          `“I don’t like ${theSec(fear.section)}. Something’s out there.”`,
          `“I was at ${theSec(fear.section)} again. I hate that stretch.”`,
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
    } else if (together.length > 0 && !left && !slept && !refused) {
      const t = together.map((n) => ({ n, tie: p.social.relationships.find((r) => r.otherId === n.other) }));
      t.sort((a, b) => Math.abs(b.tie?.affection ?? 0) - Math.abs(a.tie?.affection ?? 0));
      const best = t[0];
      const other = best?.n.other ? nameOf(s, best.n.other) : 'someone';
      if (best?.n.other) tell(`tie:${best.n.other}`, (best.tie?.affection ?? 0) > 0 ? 0.6 : -0.5);
      said.push(
        (best?.tie?.affection ?? 0) > 0
          ? pick(s, id, 'with', [
              `“${other} was beside me when they came. That helped.”`,
              `“Having ${other} next to me made the watch easier.”`,
              `“I stayed because ${other} stayed.”`,
            ])
          : pick(s, id, 'against', [
              `“${other} stood my stretch. I kept watching ${other} all night.”`,
              `“I do not trust ${other} enough to look away when we are on the wall together.”`,
            ]),
      );
    } else if (refused?.section) {
      said.push(`“I was not going to guard ${theSec(refused.section)}.”`);
    }

    if (commanded) {
      // The bell's cost, in their words: bitter in proportion to how much they value their own say.
      const autonomy = p.needs.autonomy ?? 0.5;
      if (autonomy < 0.45)
        say('bell-bitter', [
          '“You called me down like a dog.”',
          '“Shout my name over the bell like that again and see.”',
          '“I’m not a cow to be called with a bell.”',
        ]);
      else if (autonomy < 0.6)
        say('bell-grudge', [
          '“I heard my name over the bell. I stayed at my post. I didn’t like it.”',
          '“I stayed at my post when you called me. Do not keep doing it.”',
          '“Your call kept me there. My own judgment would not have kept me there.”',
        ]);
      else
        say('bell', [
          '“I heard you call. I stayed at my post.”',
          '“You called my name; I stayed.”',
          '“I stayed at my post when you called.”',
        ]);
    }

    // Nodding off: told by one watcher a night at most, only when it happened more than once, not by someone who
    // has already spoken of a fear or a bond, and a reserved person keeps it to themselves.
    const sec = dozed[0]?.section;
    if (!dozeTold && dozed.length >= 2 && sec && said.length === 0 && told.fatigue > 0.35) {
      say('doze', [
        `“I kept falling asleep briefly at ${theSec(sec)}.”`,
        `“My head kept dropping at ${theSec(sec)}. I pinched myself awake.”`,
        `“I admit I fell asleep briefly at ${theSec(sec)}, more than once.”`,
      ]);
      dozeTold = true;
    }

    // Pulls with nothing out there: one voice a dawn says so.
    if (said.length === 0 && !cryTold && s.bell.cry >= 1 && s.tally.bellRung > 0) {
      say('cry', [
        '“You rang the bell when there was nothing there.”',
        '“If you ring at nothing, we stop listening.”',
        '“The bell rang and there was nothing out there.”',
        '“Ring it for nothing again and nobody will run next time.”',
      ]);
      cryTold = true;
    }
    // Broken sleep: the bell pulled them out of a doze or out of bed (more than once, it was a long night).
    if (said.length === 0 && woken)
      say(
        'woken',
        s.place[id] === 'home' || slept
          ? [
              '“The bell woke me and made me get out of bed.”',
              '“I was asleep when the bell went. My heart is still beating fast.”',
            ]
          : woken.section
            ? [
                `“The bell jolted me awake at ${theSec(woken.section)}.”`,
                '“I had fallen asleep briefly. The bell woke me.”',
              ]
            : ['“The bell woke me.”'],
      );

    if (said.length === 0 && slept?.section)
      say('slept', [
        `“I went home to sleep. I’d have fallen off ${theSec(slept.section)} otherwise.”`,
        `“I couldn’t keep my eyes open. I went to my bed.”`,
      ]);
    if (said.length === 0) {
      if (told.fatigue > 0.5)
        say('long', [
          '“It was a long night.”',
          '“My eyes ache.”',
          '“I’d sleep standing if you let me.”',
          '“I could sleep a week.”',
          '“The last hour was the longest.”',
        ]);
      // "They watch me more than the dark" is a first winter's line (owner's year-4 export: Meryem, in his fourth
      // winter, still said it). Someone who came between winters (night 0) has their first winter the next year.
      else if (v.newcomer && s.year <= v.comes.year + (v.comes.night > 0 ? 0 : 1))
        say('new', [
          '“I marked the path I checked. The rest still needs walking.”',
          '“I am learning the route to the grain store before I mark it as certain on my map.”',
          '“It was quiet. I’m learning which shadows are trees.”',
        ]);
      else
        say('quiet', [
          '“It was quiet enough.”',
          '“It was cold. Nothing else happened.”',
          '“Nothing approached my post.”',
          '“I only heard the wind.”',
          '“I counted the stars. I have nothing to report.”',
          '“I saw an owl and a fox, and I felt cold. That is all.”',
          '“There was frost on my sleeve by midnight. Nothing else happened.”',
          '“I watched the mist come and go.”',
        ]);
    }
    // A posting pressed for tonight (urge or insist) is answered at dawn: whether they held it (2026-10-19
    // level-up, delayed feedback on pressing). Said after every other line, so it changes none of them.
    const press = s.press[id];
    const set = s.postedAt[id];
    const hurt = bitten || down || carried;
    if (
      post &&
      !hurt &&
      (press === 'urge' || press === 'insist') &&
      set !== undefined &&
      s.minute - set < DAY
    ) {
      const at = theSec(postSection(post));
      if (left || home || refused || slept)
        say('pressed-left', ['“I know you pressed me.”', '“You asked firmly. I still left.”']);
      else if (press === 'urge')
        say('pressed-held', [
          `“You urged me to watch ${at}. I stayed there.”`,
          `“I guarded ${at} because you asked me twice.”`,
        ]);
      else if ((p.needs.autonomy ?? 0.5) < 0.45)
        say('insisted-bitter', [
          `“You insisted on ${at}. I guarded it, and I will not forget your order.”`,
          `“I guarded ${at} because you gave me no choice.”`,
        ]);
      else
        say('insisted-held', [
          `“You insisted. I guarded ${at}.”`,
          `“I watched ${at}, as you insisted. I stayed at my post there.”`,
        ]);
    }
    let text = said.join(' ');
    // Two people never say the very same words on one dawn: a second speaker adds a word of their own.
    if (out.some((o) => o.text === text))
      text += ` ${pickFresh(s, id, 'tail', ['“That’s all.”', '“It was cold, though.”', '“It was a long night.”', '“I’m tired.”', '“Ask the others.”'], used, last)}`;
    out.push({ who: id, text });
  }
  for (const o of out) s.lastVoices[o.who] = o.text;
  return { voices: out, tells };
}
