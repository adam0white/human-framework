import { createPerson, ENGINE_VERSION } from '@adam0white/human-framework';
import type { PersonaEnvelope } from '@adam0white/lab-client';
import { createPersona, initialPersonaLife, preparePersonaLife } from '@adam0white/lab-client';
import { expect, it } from 'vitest';
import { makeCastChapter, siteCastCheckpoint } from '../shared/cast-chapter.ts';
import actual from '../shared/fixtures/watch-kian-care-native.json';
import { canRestoreSeason } from './season-recovery.ts';
import { WATCHERS } from './sim/config.ts';
import { prepareWatchCast, WATCH_NORMS, watcherSpec } from './sim/people.ts';
import { WatchRun } from './sim/run.ts';
import type { PageInfo } from './store.ts';

it('offers only a local season snapshot bound to its exact accepted cast and retains file nonownership', async () => {
  const parent = actual as unknown as PersonaEnvelope;
  const { revision, ...body } = parent;
  const claim = await createPersona({ ...body, parentRevision: revision });
  const clock = (parent.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000;
  const run = new WatchRun(1, undefined, makeCastChapter([preparePersonaLife(parent, clock)], [claim]));
  run.input({ k: 'start' });
  const snap = { ...run.snapshot(), castOwnership: { [parent.castId]: claim } };
  const page: PageInfo = {
    id: 'local:1:winter',
    chronicle: 'local',
    kind: 'season',
    seed: 1,
    year: 1,
    when: 'winter',
    savedAt: 1,
  };
  expect(canRestoreSeason(page, snap)).toBe(true);
  expect(canRestoreSeason(page, { ...snap, castOwnership: {} })).toBe(false);
  expect(canRestoreSeason(page, { ...snap, castOwnership: { [parent.castId]: parent } })).toBe(false);
  expect(canRestoreSeason({ ...page, chronicle: 'different' }, snap)).toBe(false);
  const file = { ...snap, fileOrigin: true as const };
  expect(canRestoreSeason(page, file)).toBe(false);
  const resumed = WatchRun.resume(file);
  expect(resumed.snapshot().fileOrigin).toBe(true);
  expect(JSON.parse(resumed.snapshotText()).fileOrigin).toBe(true);
});

it('keeps dormant carried dues through a native checkpoint and re-admission but refuses its active household duty', async () => {
  const def = WATCHERS.find((w) => w.id === 'meryem')!;
  const p = createPerson(watcherSpec(1, def, 600));
  p.conscience.norms.push({ normId: 'dues', standing: 'obligatory', conviction: 0.8 });
  const transfer = await siteCastCheckpoint('watch', p, WATCH_NORMS);
  const castId = 'hf.cast.meryem.warren';
  const branchId = 'norm-roundtrip-control';
  const head = await createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: '1',
    branchId,
    parentRevision: null,
    source: { game: 'watch', build: 'control', engine: ENGINE_VERSION, rules: 'cast-1' },
    transfer: { ...transfer, life: initialPersonaLife(castId, branchId, 0) } as PersonaEnvelope['transfer'],
    limitations: [],
  });
  const chapter = makeCastChapter([preparePersonaLife(head, 0)]);
  expect(() => prepareWatchCast(1, chapter)).not.toThrow();
  expect(
    JSON.parse(chapter.people![castId]!.initial!).conscience.norms.some(
      (n: { normId: string }) => n.normId === 'dues',
    ),
  ).toBe(true);
  p.agenda.commitments.push({
    id: 'share',
    kind: 'duty',
    normId: 'dues',
    actions: ['work'],
    toId: 'self',
    from: 600,
    until: 900,
    importance: 0.7,
    status: 'pending',
  });
  const active = await siteCastCheckpoint('watch', p, WATCH_NORMS);
  const { revision: _revision, ...body } = head;
  const pending = await createPersona({
    ...body,
    transfer: { ...active, life: head.transfer.life } as PersonaEnvelope['transfer'],
  });
  expect(() => prepareWatchCast(1, makeCastChapter([preparePersonaLife(pending, 0)]))).toThrow(
    /household dues/,
  );
});
