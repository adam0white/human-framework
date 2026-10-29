/**
 * The autumn fair (G3-3, spec §4): the drafting phase. Three offers are drawn from what the village could use; the
 * Keeper takes at most two, each paid in sacks and none undone. Admitting an outsider family brings three people
 * (and mouths); extending the wall opens a third post on a stretch (more posts than people); the bigger bell carries
 * further along the wall and halves the rope's wear; seed grain lifts next autumn's harvest; naming the Gate heir moves pride and trust on both sides.
 *
 * Not covered: trade prices, bargaining, selling grain, a choice between buyers.
 */
import { gestureVoiceTrust } from './actor-life.ts';
import { type PostId, SECTION_IDS, type SectionId } from './config.ts';
import { ageOf, chronicle, living, newcomer, RETIRE_AGE } from './life.ts';
import { presentIds } from './night.ts';
import { isWatcher, KEEPER_ID, nameOf, personOf, villager } from './people.ts';
import { type FairOffer, nextRandom, type WatchState, worldRng } from './state.ts';

/** The fair no longer caps choices by count (G3-4): the granary is the limit. */
export const FAIR_PICKS = 4;
/** Sacks to rebuild a stretch the thaw brought down, before the winter it would stand closed. */
export const REBUILD_COST = 5;

function homesBy(s: WatchState): Record<SectionId, number> {
  const out: Record<SectionId, number> = { west: 0, gate: 0, mill: 0, east: 0 };
  for (const p of living(s)) out[villager(s, p.id).home] += 1;
  return out;
}

/** Draws the fair's offers and opens the fair page. */
export function openFair(s: WatchState): void {
  const pool: FairOffer[] = [];
  // Offered every fair they apply: rebuilding a fallen stretch, and the heir (one or two names).
  const fixed: FairOffer[] = [];
  const heirOffers: FairOffer[] = [];
  if (s.marks.lost && s.marks.lost.year > s.year)
    fixed.push({
      id: 'rebuild',
      label: `Rebuild ${s.marks.lost.section === 'gate' ? 'the wall by the Gate' : `the ${s.marks.lost.section} wall`}`,
      text: 'Builders from the fair could rebuild the fallen wall before the snow, so watchers can use it this winter. It costs a great deal of grain.',
      cost: REBUILD_COST,
      target: s.marks.lost.section,
    });
  pool.push({
    id: 'outsiders',
    label: 'Let the new family stay',
    text: 'A couple and their child lost their home to fire down the valley. Two can watch the wall. All three need food. Supporting them costs a good share of grain.',
    cost: 3,
  });
  const breaches = s.yearGrain.breaches;
  const wallAt = SECTION_IDS.filter((x) => !s.marks.extended.includes(x) && s.marks.lost?.section !== x).sort(
    (a, b) => (breaches[b] ?? 0) - (breaches[a] ?? 0) || SECTION_IDS.indexOf(a) - SECTION_IDS.indexOf(b),
  )[0];
  const wallName = (sec: SectionId) => (sec === 'gate' ? 'the wall by the Gate' : `the ${sec} wall`);
  if (wallAt)
    pool.push({
      id: 'wall',
      label: `Raise ${wallName(wallAt)}`,
      text: `Raise and lengthen ${wallName(wallAt)} to add a third post. Repeated attacks can still bring it down when the snow melts. There will be more wall than people to watch it. Paying the workers costs a good share of grain.`,
      cost: 4,
      target: wallAt,
    });
  if (!s.marks.bigBell)
    pool.push({
      id: 'bell',
      label: 'Buy the bigger bell',
      text: 'A bell maker at the fair offers a heavier bell hung on a wheel. People can hear it further along the wall. It takes half the effort to pull, and its rope frays half as fast. It costs a good share of grain.',
      cost: 4,
    });
  pool.push({
    id: 'seed',
    label: 'Buy seed grain',
    text: 'Better seed gives a fuller harvest next autumn. It costs a little grain now.',
    cost: 2,
  });
  const keeper = s.gateKeeper ? personOf(s, s.gateKeeper) : undefined;
  if (keeper && !s.heir && ageOf(keeper, s.minute) >= 50) {
    // Two names, so naming is a choice: those who said at dawn they would keep the Gate first, then the surest arm.
    const rank = (p: NonNullable<ReturnType<typeof personOf>>) =>
      (s.gateWilling[p.id] === true ? 1 : s.gateWilling[p.id] === false ? -1 : 0) * 10 +
      (p.skills.sling?.level ?? 0);
    const names = presentIds(s)
      .map((id) => personOf(s, id))
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== undefined && p.id !== keeper.id && ageOf(p, s.minute) >= 17 && ageOf(p, s.minute) < 40,
      )
      .sort((a, b) => rank(b) - rank(a) || (a.id < b.id ? -1 : 1))
      .slice(0, 2);
    const [first, second] = names;
    const said = (id: string) =>
      s.gateWilling[id] === true
        ? ' The watcher said yes at dawn.'
        : s.gateWilling[id] === false
          ? ' The watcher said no.'
          : '';
    if (first)
      heirOffers.push({
        id: 'heir',
        label: `Name ${first.name} heir to the Gate`,
        text: `${first.name} will take the Gate when ${keeper.name} leaves the stair.${said(first.id)} ${first.name} will feel proud to be chosen. ${keeper.name} may not like your decision.${second ? ` You can name only one.` : ''}`,
        cost: 0,
        target: first.id,
      });
    if (second)
      heirOffers.push({
        id: 'heir2',
        label: `Name ${second.name} heir to the Gate`,
        text: `You could choose ${second.name} instead.${said(second.id)} The person you do not choose will remember it.`,
        cost: 0,
        target: second.id,
      });
  }
  // Three offers drawn from the pool in a seeded order, after the fixed ones; the heir's names come last.
  const offers: FairOffer[] = [...fixed];
  const left = [...pool];
  const drawn: FairOffer[] = [];
  const r = worldRng(s, 'fair');
  while (offers.length + drawn.length < 3 && left.length > 0) {
    const i = Math.floor(nextRandom(r) * left.length);
    const [o] = left.splice(i, 1);
    if (o) drawn.push(o);
  }
  drawn.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  offers.push(...drawn, ...heirOffers);
  s.fair = { offers, picks: [], max: FAIR_PICKS };
  s.phase = 'fair';
  chronicle(s, 'fair', 'The autumn fair came to the meadow below the Gate.');
}

/** Takes an offer. Returns false when it cannot be taken (not offered, taken, too many, too dear). */
export function takeOffer(s: WatchState, id: FairOffer['id']): boolean {
  const f = s.fair;
  if (s.phase !== 'fair' || !f) return false;
  const o = f.offers.find((x) => x.id === id);
  if (!o || f.picks.includes(id) || f.picks.length >= f.max || s.grain < o.cost) return false;
  if ((id === 'heir' || id === 'heir2') && s.heir) return false;
  s.grain -= o.cost;
  f.picks.push(id);
  const at = s.minute;
  switch (id) {
    case 'outsiders': {
      familyComes(s, at, 'fair');
      break;
    }
    case 'wall': {
      const sec = o.target as SectionId;
      s.marks.extended.push(sec);
      const post = `${sec}-3` as PostId;
      if (!s.openPosts.includes(post)) s.openPosts.push(post);
      chronicle(
        s,
        'fair',
        `${sec === 'gate' ? 'The wall by the Gate' : `The ${sec} wall`} was raised and lengthened. It now has a third post.`,
      );
      break;
    }
    case 'bell':
      s.marks.bigBell = true;
      chronicle(s, 'fair', 'A bigger bell was hung over the Gate.');
      break;
    case 'seed':
      s.marks.seed = true;
      chronicle(s, 'fair', 'Seed grain was bought for next year.');
      break;
    case 'rebuild': {
      const sec = o.target as SectionId;
      if (s.marks.lost?.section === sec) s.marks.lost = null;
      chronicle(
        s,
        'fair',
        `Masons from the fair raised ${sec === 'gate' ? 'the wall by the Gate' : `the ${sec} wall`} again before the snow.`,
      );
      break;
    }
    case 'heir':
    case 'heir2': {
      const heir = o.target ? personOf(s, o.target) : undefined;
      const keeper = s.gateKeeper ? personOf(s, s.gateKeeper) : undefined;
      if (!heir) break;
      s.heir = heir.id;
      gestureVoiceTrust(heir, KEEPER_ID, 0.1, {
        reason: 'The Keeper named me heir to the Gate.',
        at: s.minute,
      });
      if (keeper)
        gestureVoiceTrust(keeper, KEEPER_ID, -0.06, {
          reason: 'The Keeper named a Gate heir before I spoke.',
          at: s.minute,
        });
      const passed = f.offers.find((x) => (x.id === 'heir' || x.id === 'heir2') && x.target !== heir.id);
      const other = passed?.target ? personOf(s, passed.target) : undefined;
      if (other)
        gestureVoiceTrust(other, KEEPER_ID, -0.05, {
          reason: 'The Keeper chose another Gate heir.',
          at: s.minute,
        });
      chronicle(
        s,
        'fair',
        `You named ${heir.name} heir to the Gate${keeper ? `, before ${keeper.name} had said a word` : ''}.`,
        heir.id,
      );
      break;
    }
  }
  return true;
}

/** Who keeps the Gate this winter: the keeper if still on the wall, else the heir, else the surest sling. */
export function refreshGateKeeper(s: WatchState): void {
  const k = s.gateKeeper ? personOf(s, s.gateKeeper) : undefined;
  if (k && isWatcher(s, k) && ageOf(k, s.minute) < RETIRE_AGE && !s.cast[k.id]?.limp) return;
  const heir = s.heir ? personOf(s, s.heir) : undefined;
  const next =
    heir && isWatcher(s, heir)
      ? heir
      : presentIds(s)
          .map((id) => personOf(s, id))
          .filter((p) => p !== undefined && ageOf(p, s.minute) >= 18)
          .sort(
            (a, b) =>
              (b?.skills.sling?.level ?? 0) - (a?.skills.sling?.level ?? 0) ||
              ((a?.id ?? '') < (b?.id ?? '') ? -1 : 1),
          )[0];
  const was = s.gateKeeper;
  s.gateKeeper = next?.id ?? null;
  if (s.heir === s.gateKeeper) s.heir = null;
  if (next) {
    villager(s, next.id).usual = 'gate-1';
    chronicle(
      s,
      'age',
      `${nameOf(s, next.id)} keeps the Gate now${was ? ` after ${nameOf(s, was)}` : ''}.`,
      next.id,
    );
  }
}

/**
 * A couple and their child come to live here (married by HF `marry`, the child tied to both as parent): let in at the
 * fair, or refugees at the thaw of a small village (the director's newcomers, spec §3).
 */
export function familyComes(s: WatchState, at: number, how: 'fair' | 'refugees'): void {
  const homes = homesBy(s);
  const home = SECTION_IDS.reduce((a, b) => (homes[b] < homes[a] ? b : a), 'west' as SectionId);
  const note =
    how === 'fair'
      ? 'Came with the fair after losing their home to fire'
      : 'Came up the valley to escape a raid';
  const manId = `n${s.nextBorn}`,
    wifeId = `n${s.nextBorn + 1}`,
    childId = `n${s.nextBorn + 2}`;
  const man = newcomer(s, 'male', 28 + Math.floor(nextRandom(s) * 8), at, {
    home,
    note,
    spouseId: wifeId,
    ties: [{ otherId: childId, roles: ['child'] }],
  });
  const wife = newcomer(s, 'female', 25 + Math.floor(nextRandom(s) * 8), at, {
    home,
    note,
    spouseId: manId,
    ties: [{ otherId: childId, roles: ['child'] }],
  });
  // The arriving couple were married before this chapter. Both authored openings retain that bond.
  const child = newcomer(s, nextRandom(s) < 0.5 ? 'female' : 'male', 4 + Math.floor(nextRandom(s) * 6), at, {
    home,
    note,
    ties: [
      { otherId: man.id, roles: ['parent'] },
      { otherId: wife.id, roles: ['parent'] },
    ],
  });
  villager(s, child.id).gen = villager(s, man.id).gen + 1;
  const where = home === 'gate' ? 'the Gate' : `the ${home} wall`;
  chronicle(
    s,
    'arrive',
    how === 'fair'
      ? `${man.name} and ${wife.name} and their child ${child.name} were let in at the fair. They live behind ${where}.`
      : `${man.name} and ${wife.name} came up the valley with their child ${child.name}, fleeing a raid, and asked to stay. They live behind ${where}.`,
    man.id,
  );
}
