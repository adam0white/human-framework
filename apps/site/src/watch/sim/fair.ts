/**
 * The autumn fair (G3-3, spec §4): the drafting phase. Three offers are drawn from what the village could use; the
 * Keeper takes at most two, each paid in sacks and none undone. Admitting an outsider family brings three people
 * (and mouths); extending the wall opens a third post on a stretch (more posts than people); the bigger bell carries
 * further along the wall and halves the rope's wear; seed grain lifts next autumn's harvest; naming the Gate heir moves pride and trust on both sides.
 *
 * Not covered: trade prices, bargaining, selling grain, a choice between buyers.
 */
import { marry } from '@adam0white/human-framework';
import { DAY, type PostId, SECTION_IDS, type SectionId } from './config.ts';
import { ageOf, chronicle, living, newcomer, RETIRE_AGE, WATCH_CUSTOM } from './life.ts';
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
      text: 'Masons from the fair could raise the fallen stretch again before the snow, so it can be stood this winter. It costs a great deal of grain.',
      cost: REBUILD_COST,
      target: s.marks.lost.section,
    });
  pool.push({
    id: 'outsiders',
    label: 'Admit the outsider family',
    text: 'A couple and their child, burned out down the valley. Two more on the wall, three more mouths. It costs a good share of grain to see them through.',
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
      text: `Raise and lengthen ${wallName(wallAt)}: a third post there, for good. More wall than people to stand it. It costs a good share of grain in labour.`,
      cost: 4,
      target: wallAt,
    });
  if (!s.marks.bigBell)
    pool.push({
      id: 'bell',
      label: 'Buy the bigger bell',
      text: 'A heavier bell from the founder at the fair, hung on a wheel: it carries further along the wall, takes half the pull, and its rope frays half as fast. It costs a good share of grain.',
      cost: 4,
    });
  pool.push({
    id: 'seed',
    label: 'Buy seed grain',
    text: 'Better seed for next year: a fuller harvest next autumn. It costs a little grain now.',
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
        ? ' They told you at dawn they would.'
        : s.gateWilling[id] === false
          ? ' They told you they did not want it.'
          : '';
    if (first)
      heirOffers.push({
        id: 'heir',
        label: `Name ${first.name} heir to the Gate`,
        text: `${first.name} will take the Gate when ${keeper.name} leaves the stair.${said(first.id)} ${first.name} will stand taller for it; ${keeper.name} may not like being told.${second ? ` You can name only one.` : ''}`,
        cost: 0,
        target: first.id,
      });
    if (second)
      heirOffers.push({
        id: 'heir2',
        label: `Name ${second.name} heir to the Gate`,
        text: `Or ${second.name}.${said(second.id)} The one you pass over will remember it.`,
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
        `${sec === 'gate' ? 'The wall by the Gate' : `The ${sec} wall`} was raised and lengthened: a third post there now.`,
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
      const lift = (p: typeof heir, d: number) => {
        p.will.voices = p.will.voices.map((v) =>
          v.voiceId === KEEPER_ID ? { ...v, trust: Math.max(0, Math.min(1, v.trust + d)) } : v,
        );
      };
      lift(heir, 0.1);
      if (keeper) lift(keeper, -0.06);
      const passed = f.offers.find((x) => (x.id === 'heir' || x.id === 'heir2') && x.target !== heir.id);
      const other = passed?.target ? personOf(s, passed.target) : undefined;
      if (other) lift(other, -0.05);
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

export const FAIR_WINDOW = DAY;

/**
 * A couple and their child come to live here (married by HF `marry`, the child tied to both as parent): let in at the
 * fair, or refugees at the thaw of a small village (the director's newcomers, spec §3).
 */
export function familyComes(s: WatchState, at: number, how: 'fair' | 'refugees'): void {
  const homes = homesBy(s);
  const home = SECTION_IDS.reduce((a, b) => (homes[b] < homes[a] ? b : a), 'west' as SectionId);
  const note = how === 'fair' ? 'Came with the fair, burned out' : 'Came up the valley, fleeing a raid';
  const man = newcomer(s, 'male', 28 + Math.floor(nextRandom(s) * 8), at, { home, note });
  const wife = newcomer(s, 'female', 25 + Math.floor(nextRandom(s) * 8), at, { home, note });
  marry(man, wife, at, WATCH_CUSTOM);
  const child = newcomer(s, nextRandom(s) < 0.5 ? 'female' : 'male', 4 + Math.floor(nextRandom(s) * 6), at, {
    home,
    note,
    ties: [
      { otherId: man.id, roles: ['parent'] },
      { otherId: wife.id, roles: ['parent'] },
    ],
  });
  for (const parent of [man, wife]) {
    const r = parent.social.relationships.find((x) => x.otherId === child.id);
    if (r) {
      r.roles = [...new Set([...r.roles, 'child'])];
      r.affection = 0.8;
      r.trust = 0.75;
      r.familiarity = 0.9;
    }
  }
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
