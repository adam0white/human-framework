/**
 * SCOPE: forward migration of a saved person (`snapshot` JSON) from an earlier engine version to `ENGINE_VERSION`.
 * `migrate` walks a chain of steps keyed by the version they upgrade from, one version at a time, and stamps each
 * step's target version on the JSON. `restore` calls it, so a host can pass an old save straight to `restore`.
 *
 * Covers saves from engine 1.4.0 onward. 1.4.0 through 1.9.0 share the person shape (1.6.0 to 1.8.0 only add
 * optional fields that are absent by default), so those steps only stamp the version; 1.9.0 to 2.0.0 renames one
 * field of the optional surroundings slice (`ambient.now` → `ambient.percept`) and changes no behaviour (the optional `social.impressions` and `social.reserve`, like `retention`, are optional and start
 * absent in a migrated save); `restore` then fills and sanitizes
 * the slices as for any save. 2.0.0 to 2.1.0 adds optional conditional method state, absent
 * until explicitly used, so existing hosts retain their previous behavior; that step stamps the version.
 * 2.1.0 to 2.2.0 preserves optional method records and stamps the version; successful alternatives now
 * retain independent support. 2.2.0 to 2.3.0 stamps the version; received consequences and temporal goals
 * remain absent unless explicitly supplied. 2.3.0 to 2.4.0 stamps the version; promptings remain absent
 * unless enabled. 2.4.0 to 2.5.0 stamps the version; the bodily forecast reads only offers that declare
 * `followedBy`. 2.5.0 to 2.6.0 stamps the version; the fatigue store stays absent unless enabled. 2.6.0 to
 * 2.7.0 stamps the version; the evening review stays absent unless enabled. 2.7.0 to 2.8.0 stamps the
 * version; fullness stays absent unless enabled, and alongside partners and reconsideration are opt-in.
 * 2.8.0 to 2.9.0 stamps the version; prompting cues and practice half-lives stay absent unless supplied,
 * review terms may carry refs, and an outcome naming several commitments now keeps each rather than only
 * the earliest-ending one. 2.14.0 to 2.14.1 only stamps the version: slices without behaviour markers
 * retain 2.14.0 crediting and an undecaying pull until the host re-enables them. 2.13.0 to 2.14.0 stamps the version (projects and persistence start absent; goals may carry `project`, received successors may carry `advances`). 2.12.0 to 2.13.0 stamps the version (suggestion reasons and firm rules start absent). 2.11.0 to 2.12.0 stamps the version (planning starts absent). 2.10.0 to 2.11.0 stamps the version (curiosity starts absent). 2.9.0 to 2.10.0 stamps the version; belief provenance, noted contradictions and
 * believed regard stay absent unless a host supplies them;
 * `regard` becomes a reserved impression cue key. A migrated save continues under the current engine's rules: it restores and runs,
 * but it does not reproduce what the old engine would have done next where the rules changed (1.4.0 to 1.5.0
 * changed how standing advice is heard; 1.8.0 to 1.9.0 changed the omission rule). Saves older than 1.4.0 and unknown versions are refused with an error.
 *
 * Does not cover community state (`communityState`) or world state (for example `createVillage`'s `state`): those
 * have not changed shape since 1.4.0, and a host owns its own world state's migration.
 */
import { isObj } from './core/index.ts';
import { ENGINE_VERSION } from './types.ts';

type Json = Record<string, unknown>;

/** One upgrade step: from the key's version to `to`. `apply` must return plain JSON and must not mutate input. */
export interface MigrationStep {
  to: string;
  note: string;
  apply: (json: Json) => Json;
}

const stamp = (json: Json): Json => ({ ...json });

/** 1.9.0 → 2.0.0: `ambient.now` becomes `ambient.percept` (a copy; the input is not changed). */
function renameAmbient(json: Json): Json {
  const a = json.ambient;
  if (!isObj(a) || !('now' in a)) return { ...json };
  const { now, ...rest } = a as Json;
  return { ...json, ambient: { ...rest, percept: now } };
}

/** The chain, keyed by the version each step upgrades from. */
export const MIGRATIONS: Readonly<Record<string, MigrationStep>> = {
  '1.4.0': {
    to: '1.5.0',
    note: 'person shape unchanged; standing advice is heard for the running activity from now on',
    apply: stamp,
  },
  '1.5.0': {
    to: '1.6.0',
    note: 'person shape unchanged; commanded control, crisis, injury depth and groups are optional and start absent',
    apply: stamp,
  },
  '1.6.0': {
    to: '1.7.0',
    note: 'person shape unchanged; last sleep, last downing and the downed lapse are optional and start absent; missed worship now owes a make-up from here on',
    apply: stamp,
  },
  '1.7.0': {
    to: '1.8.0',
    note: 'person shape unchanged; family, bonds, ambient, gists, yearbook, character and skill consolidation are optional and start absent',
    apply: stamp,
  },
  '1.8.0': {
    to: '1.9.0',
    note: 'person shape unchanged; the omission rule now protects a duty while a prayer begun in its window runs past the end, and reviews an activity that would cover a closing stretch',
    apply: stamp,
  },
  '1.9.0': {
    to: '2.0.0',
    note: 'the surroundings field `ambient.now` is renamed `ambient.percept`; per-person retention is optional and starts absent; behaviour unchanged',
    apply: renameAmbient,
  },
  '2.14.1': {
    to: '2.17.0',
    note: 'version stamp only; project protection and narration/social options require explicit opt-in, and existing enabled faculties retain exact behavior',
    apply: stamp,
  },
  '2.14.0': {
    to: '2.14.1',
    note: 'version stamp only; restored projects and persistence retain 2.14.0 behaviour until explicitly re-enabled',
    apply: stamp,
  },
  '2.13.0': {
    to: '2.14.0',
    note: 'projects (Person.projects) and persistence (Person.pursuit) are optional and start absent; Goal.project, Percept.prospect and received successor advances are optional; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.12.0': {
    to: '2.13.0',
    note: 'suggestion reasons (Person.will.suggestionReasons) and firm self-rules (Commitment.firm) are optional and start absent; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.11.0': {
    to: '2.12.0',
    note: 'the planning slice (Person.planning) is optional and starts absent; retained consequences may carry channel known only when seeded; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.10.0': {
    to: '2.11.0',
    note: 'the curiosity slice (Person.curiosity) is optional and starts absent; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.9.0': {
    to: '2.10.0',
    note: 'belief provenance (Belief.provenance), noted contradictions (memory.contradictions) and the believed-regard impression cue are optional and start absent; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.8.0': {
    to: '2.9.0',
    note: 'prompting responses may carry a cue and the slice a practice half-life (both optional, absent as before); review terms may carry a ref; an outcome naming two or more commitments in fulfills now keeps each of them, where 2.8.0 kept the earliest-ending one',
    apply: stamp,
  },
  '2.7.0': {
    to: '2.8.0',
    note: 'fullness (body.fullness) is optional and starts absent; offers may name alongside partners and decisions may reconsider; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.6.0': {
    to: '2.7.0',
    note: 'the evening review (review) is optional and starts absent; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.5.0': {
    to: '2.6.0',
    note: "the fatigue store (body.depletion) is optional and starts absent; the bodily forecast now applies an open fast's hunger damping, which changes only offers that declare followedBy",
    apply: stamp,
  },
  '2.4.0': {
    to: '2.5.0',
    note: 'person shape unchanged; offers may declare followedBy spans for a bodily forecast; offers without it are unchanged',
    apply: stamp,
  },
  '2.3.0': {
    to: '2.4.0',
    note: 'promptings are optional and start absent; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.2.0': {
    to: '2.3.0',
    note: 'received consequences and temporal goals are optional; existing hosts retain exact behavior',
    apply: stamp,
  },
  '2.1.0': {
    to: '2.2.0',
    note: 'person shape unchanged; method evidence now grades each action independently, preserving successful alternatives',
    apply: stamp,
  },
  '2.0.0': {
    to: '2.1.0',
    note: 'conditional method state and received cues are optional and start absent; existing host decisions unchanged',
    apply: stamp,
  },
};

/** The step upgrading from `v`, looked up as an own property only (a version of "__proto__" matches nothing). */
const stepFrom = (v: string): MigrationStep | undefined =>
  Object.hasOwn(MIGRATIONS, v) ? MIGRATIONS[v] : undefined;

/** Engine versions `migrate` accepts, oldest first (the current version included). */
export function migratableVersions(): string[] {
  const out: string[] = [];
  let v: string | undefined = '1.4.0';
  while (v !== undefined) {
    out.push(v);
    v = stepFrom(v)?.to;
  }
  return out;
}

/**
 * Upgrade a saved person to `ENGINE_VERSION`. Returns a new object (the input is not changed); a save already at
 * the current version is returned as a shallow copy. Throws on a missing or unsupported engine version.
 */
export function migrate(json: unknown): Json {
  if (!isObj(json)) throw new Error('migrate: not an object');
  let out = { ...(json as Json) };
  const from = out.engine;
  if (typeof from !== 'string') throw new Error('migrate: missing engine');
  let guard = 0;
  while (out.engine !== ENGINE_VERSION) {
    const v = String(out.engine);
    const step = stepFrom(v);
    if (!step || guard++ > 64)
      throw new Error(
        `migrate: save is from engine ${from}; this engine (${ENGINE_VERSION}) migrates ${migratableVersions().join(', ')}`,
      );
    out = { ...step.apply(out), engine: step.to };
  }
  return out;
}
