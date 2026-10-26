/** Explicit recovery of an existing local season page; never infer ownership from a seed or shelf head. */
import { canonicalPersona } from '@adam0white/lab-client';
import { chapterPeople } from '../shared/cast-chapter.ts';
import type { Snapshot } from './sim/run.ts';
import { scenarioForState } from './sim/run.ts';
import type { PageInfo } from './store.ts';

export function canRestoreSeason(page: PageInfo, snap: Snapshot | null): boolean {
  try {
    if (
      page.kind !== 'season' ||
      !page.id.startsWith(`${page.chronicle}:`) ||
      !snap ||
      snap.fileOrigin ||
      snap.scenario !== scenarioForState(snap.state) ||
      snap.seed !== page.seed ||
      snap.state.seed !== snap.seed ||
      !snap.state.castChapter
    )
      return false;
    const people = chapterPeople(snap.state.castChapter);
    const owned = snap.castOwnership ?? {};
    if (!people.length || Object.keys(owned).length !== people.length) return false;
    return people.every(({ input, claim }) => {
      const head = owned[input.parent.castId];
      return (
        !!claim &&
        !!head &&
        claim.castId === input.parent.castId &&
        claim.parentRevision === input.parent.revision &&
        claim.branchId === input.parent.branchId &&
        claim.source.game === 'watch' &&
        claim.source.rules === 'cast-1' &&
        canonicalPersona(head) === canonicalPersona(claim)
      );
    });
  } catch {
    return false;
  }
}
