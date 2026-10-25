/**
 * In-person night asks. The Keeper can offer relief, help or rest within voice reach; HF chooses the act.
 * A reliever may approach the occupied post, then the outgoing watcher is asked to sleep. Help shares a stretch
 * or uses the existing carry affordance. Scenario 13 adds a small exertion burst for an accepted
 * helper leaving a different post; it adds no travel delay and never charges a refused ask.
 * This does not add healing, remote orders, moments or guaranteed obedience.
 */
import {
  addTiredness,
  outwardSigns,
  predictAs,
  type SimEvent,
  selfReport,
} from '@adam0white/human-framework';
import { type PostId, postSection, type SectionId, type WatcherId } from './config.ts';
import { ask, readWords } from './moments.ts';
import { alert, inVoice, ownReason, presentIds, theSection } from './night.ts';
import { isPost, KEEPER_ID, nameOf, personOf, villager, WatchWorld } from './people.ts';
import { keeperFatigue } from './reads.ts';
import type { WatchState } from './state.ts';

/** Host tuning: a brief hard crossing, on the existing zero-to-one exertion scale. */
const DEPARTURE_EXERTION = 0.08;

export type NightInput =
  | { k: 'relieve'; who: WatcherId; by: WatcherId }
  | { k: 'help'; who: WatcherId; by: WatcherId }
  | { k: 'down'; who: WatcherId };
export interface NightAct {
  input: NightInput;
  label: string;
  read: string;
  available: boolean;
}
export interface NightRequest {
  kind: NightInput['k'];
  who: WatcherId;
  affordance: string;
  section: SectionId;
  until: number;
  /** Follow-up asks are queued after this minute’s community events were already produced. */
  afterMinute?: number;
}

function awake(s: WatchState, id: WatcherId): boolean {
  const p = personOf(s, id);
  return !!p && !p.body.downed && !p.body.asleep && !['doze', 'sleep'].includes(p.activity?.action ?? '');
}

/** Outward signs and what a nearby watcher admits, not a numerical needs display. */
export function nightBodyCondition(s: WatchState, who: WatcherId): { tired: boolean; hurt: boolean } {
  const p = personOf(s, who);
  if (!p) return { tired: false, hurt: false };
  const signs = outwardSigns(p);
  const told = selfReport(p);
  const near = inVoice(s, who);
  return {
    tired: signs.fatigue > 0.5 || p.activity?.action === 'doze' || (near && told.fatigue > 0.4),
    hurt:
      !!p.body.downed ||
      s.notes.some((n) => n.who === who && n.kind === 'bitten') ||
      !!villager(s, who).limp ||
      signs.pain > 0.3 ||
      p.body.injuries.some((i) => (i.bleeding ?? 0) > 0) ||
      (near && told.pain > 0.2),
  };
}

/** Danger can justify help before an injury. It is not evidence that a watcher is hurt. */
export function nightCondition(s: WatchState, who: WatcherId): { tired: boolean; hurt: boolean } {
  const body = nightBodyCondition(s, who);
  const pl = s.place[who];
  return {
    ...body,
    hurt:
      body.hurt ||
      (isPost(pl) &&
        s.tokens.some((t) => t.kind === 'wolf' && t.state === 'foot' && t.section === postSection(pl))),
  };
}

function far(s: WatchState, who: WatcherId): string {
  const pl = s.place[who];
  const where = isPost(pl) ? theSection(postSection(pl)) : 'the Gate';
  return `You are too far away to call ${nameOf(s, who)} from here; carry the lantern to ${where}.`;
}

function destination(s: WatchState, input: NightInput): string | null {
  const p = personOf(s, input.who);
  const pl = s.place[input.who];
  if (!p || !isPost(pl)) return null;
  if (input.k === 'down') return p.body.downed ? null : nightCondition(s, input.who).hurt ? 'flee' : 'sleep';
  return p.body.downed ? (input.k === 'help' ? `carry:${input.who}` : null) : `post:${pl}`;
}

function viewFor(s: WatchState, input: NightInput, affordance: string): WatchState {
  if (!affordance.startsWith('post:')) return s;
  // A named helper can join this watcher. Nothing changes for other asks or legacy logs.
  const id = input.k === 'down' ? input.who : input.by;
  return {
    ...s,
    place: { ...s.place, [input.who]: 'village' },
    asks: {
      ...s.asks,
      [id]: {
        sug: {
          voiceId: KEEPER_ID,
          affordanceId: affordance,
          strength: 0.85,
          appeal: 'duty',
          since: s.minute,
        },
        until: s.minute + 60,
      },
    },
  };
}

function reading(s: WatchState, id: WatcherId, input: NightInput, affordance: string): string {
  const p = personOf(s, id);
  if (!p) return 'You cannot tell.';
  const view = viewFor(s, input, affordance);
  const offers = new WatchWorld(view).affordancesFor(p);
  const { resolution, confidence } = predictAs(
    s.keeper,
    p,
    offers,
    {
      voiceId: KEEPER_ID,
      affordanceId: affordance,
      strength: 0.85,
      appeal: 'duty',
    },
    { now: s.minute },
  );
  const word =
    confidence < 0.2
      ? "can't tell"
      : resolution.verdict === 'assented'
        ? 'likely'
        : resolution.verdict === 'complied'
          ? 'grudging'
          : resolution.verdict === 'refused'
            ? "won't"
            : 'unsure';
  return readWords({ word, confidence, ...(resolution.says ? { why: resolution.says } : {}) });
}

/** Shared projection for the phone, text harness and HF playtester. Unreachable acts retain their explanation. */
export function nightActs(s: WatchState, who: WatcherId): NightAct[] {
  if (s.phase !== 'night' || !presentIds(s).includes(who) || !isPost(s.place[who])) return [];
  const condition = nightCondition(s, who);
  const read = keeperFatigue(s, who);
  condition.tired ||= read.confidence >= 0.12 && read.value > 0.35;
  if (!condition.tired && !condition.hurt) return [];
  const name = nameOf(s, who);
  const inputs: { input: NightInput; label: string }[] = [];
  for (const by of presentIds(s)) {
    if (by === who || !awake(s, by) || (!isPost(s.place[by]) && s.place[by] !== 'hall')) continue;
    if (condition.tired && !personOf(s, who)?.body.downed)
      inputs.push({ input: { k: 'relieve', who, by }, label: `Send ${nameOf(s, by)} to relieve ${name}` });
    if (condition.hurt)
      inputs.push({ input: { k: 'help', who, by }, label: `Send ${nameOf(s, by)} to help ${name}` });
  }
  inputs.push({
    input: { k: 'down', who },
    label: condition.hurt ? `Send ${name} down to the hall` : `Let ${name} go down to rest`,
  });
  return inputs.map(({ input, label }) => {
    const id = input.k === 'down' ? who : input.by;
    const affordance = destination(s, input);
    const pending = Object.values(s.nightRequests ?? {}).some(
      (r) => r && r.who === who && r.until > s.minute,
    );
    const already = input.k === 'help' && s.place[id] === s.place[who];
    const blocked = !inVoice(s, who)
      ? far(s, who)
      : !inVoice(s, id)
        ? far(s, id)
        : !affordance
          ? `${name} cannot walk down; send someone to carry them.`
          : pending
            ? `Someone is already answering your call for ${name}.`
            : already
              ? `${nameOf(s, id)} is already on this post.`
              : (s.nightRequests?.[id]?.until ?? -Infinity) > s.minute
                ? `${nameOf(s, id)} is answering your earlier call.`
                : null;
    if (blocked || !affordance)
      return { input, label, read: blocked ?? 'You cannot tell.', available: false };
    const old = s.place[id];
    const leaves =
      isPost(old) && (input.k === 'down' || old !== s.place[who]) ? ` ${leavingRead(s, id)}.` : '';
    const crossing =
      s.nightDepartureEffort && input.k !== 'down' && isPost(old) && old !== s.place[who]
        ? ' I think leaving another post will also tire the relief watcher a little.'
        : '';
    const cover = input.k === 'relieve' ? ` The helper takes over before you ask ${name} to sleep.` : '';
    return {
      input,
      label,
      read: `${reading(s, id, input, affordance)}${leaves}${crossing}${cover}`,
      available: true,
    };
  });
}

/** Coverage is the people still on this stretch, including people sharing a post. */
function leavingRead(s: WatchState, id: WatcherId): string {
  const post = s.place[id];
  if (!isPost(post)) return '';
  const section = postSection(post);
  const remaining = presentIds(s)
    .filter(
      (other) => other !== id && isPost(s.place[other]) && postSection(s.place[other] as PostId) === section,
    )
    .map((other) => nameOf(s, other));
  const names =
    remaining.length < 2 ? remaining[0] : `${remaining.slice(0, -1).join(', ')} and ${remaining.at(-1)}`;
  return names
    ? `This leaves ${names} at ${theSection(section)}`
    : `This leaves ${theSection(section)} empty`;
}

/** Requests wait for HF's answer. Post changes have no travel phase in the existing rules. */
export function nightHandover(s: WatchState, who: WatcherId): string | null {
  for (const [by, r] of Object.entries(s.nightRequests ?? {})) {
    if (!r || r.who !== who || r.until <= s.minute || by === who) continue;
    return `${nameOf(s, by)} has been called ${r.kind === 'help' ? `to help ${nameOf(s, who)} at` : 'to'} ${theSection(r.section)}; waiting for an answer.`;
  }
  const old = s.letGo[who];
  if (!old) return null;
  const section = postSection(old);
  const accepted = s.alerts.findLast(
    (a) =>
      a.minute >= s.nightStart &&
      a.section === section &&
      a.who !== who &&
      a.who &&
      s.posts[a.who] === old &&
      a.text.includes('I’ll take'),
  );
  if (!accepted?.who) return null;
  if (s.place[accepted.who] !== old) return `${nameOf(s, accepted.who)} has left ${theSection(section)}.`;
  const going = s.nightRequests?.[who];
  if (!isPost(s.place[who]))
    return `${nameOf(s, accepted.who)} is guarding ${theSection(section)}; ${nameOf(s, who)} has gone down.`;
  if (going?.kind === 'down' && going.afterMinute === accepted.minute)
    return `${nameOf(s, accepted.who)} is guarding ${theSection(section)}; ${nameOf(s, who)} has been asked to go down.`;
  return `${nameOf(s, accepted.who)} is guarding ${theSection(section)}; ${nameOf(s, who)} is still on the wall.`;
}

export function applyNightAct(s: WatchState, input: NightInput): boolean {
  const act = nightActs(s, input.who).find(
    (a) => a.input.k === input.k && (input.k === 'down' || (a.input.k !== 'down' && a.input.by === input.by)),
  );
  if (!act?.available) return false;
  const affordance = destination(s, input);
  const pl = s.place[input.who];
  if (!affordance || !isPost(pl)) return false;
  const id = input.k === 'down' ? input.who : input.by;
  s.nightRequests ??= {};
  s.nightRequests[id] = {
    kind: input.k,
    who: input.who,
    affordance,
    section: postSection(pl),
    until: s.minute + 60,
  };
  ask(s, id, affordance);
  return true;
}

function release(s: WatchState, who: WatcherId): void {
  const old = s.posts[who];
  if (old) s.letGo[who] = old;
  s.posts[who] = null;
}

/** Resolve only requests introduced by scenario 11. HF decision and begin events remain the authority. */
export function resolveNightRequest(s: WatchState, e: SimEvent, before = s.place): void {
  const r = s.nightRequests?.[e.personId];
  if (!r || (r.afterMinute !== undefined && e.at <= r.afterMinute)) return;
  if (s.minute >= r.until) {
    delete s.nightRequests?.[e.personId];
    return;
  }
  if (e.kind === 'decide' && e.affordanceId !== r.affordance) {
    alert(s, {
      section: r.section,
      kind: 'person',
      who: e.personId,
      text: `${nameOf(s, e.personId)} ${r.kind === 'down' ? 'won’t go down yet' : r.kind === 'relieve' ? 'won’t take over yet' : 'won’t come to help yet'}. “${ownReason(s, e.personId, e.affordanceId ?? '', r.section)}”`,
      slowed: false,
    });
    delete s.nightRequests?.[e.personId];
    delete s.asks[e.personId];
  }
  if ((e.kind !== 'begin' && e.kind !== 'continue') || e.affordanceId !== r.affordance) return;
  const old = before[e.personId];
  if (s.nightDepartureEffort && r.kind !== 'down' && isPost(old) && r.affordance !== `post:${old}`) {
    const p = personOf(s, e.personId);
    if (p) addTiredness(p, { exertion: DEPARTURE_EXERTION });
  }
  delete s.nightRequests?.[e.personId];
  if (r.kind === 'down') release(s, e.personId);
  else if (r.affordance.startsWith('post:')) {
    s.posts[e.personId] = r.affordance.slice(5) as PostId;
    if (r.kind === 'relieve') {
      release(s, r.who);
      s.nightRequests ??= {};
      s.nightRequests[r.who] = {
        kind: 'down',
        who: r.who,
        affordance: 'sleep',
        afterMinute: s.minute,
        section: r.section,
        until: s.minute + 60,
      };
      ask(s, r.who, 'sleep');
    }
  }
  const words =
    r.kind === 'down'
      ? r.affordance === 'sleep'
        ? 'I’m going home to sleep.'
        : 'I’m going down to the hall.'
      : r.affordance.startsWith('carry:')
        ? 'I’m coming. I’ll carry the watcher down.'
        : `I’ll take ${theSection(r.section)}.`;
  alert(s, {
    section: r.section,
    kind: 'person',
    who: e.personId,
    text: `${nameOf(s, e.personId)} calls: “${words}”`,
    slowed: false,
  });
}
