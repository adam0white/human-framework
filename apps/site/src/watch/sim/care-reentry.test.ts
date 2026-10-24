import {
  canonicalPersona,
  createPersona,
  initialPersonaLife,
  type PersonaEnvelope,
  preparePersonaLife,
} from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { makeCastChapter } from '../../shared/cast-chapter.ts';
import actualDanyal from '../../shared/fixtures/valley-danyal-native.json';
import actualMeryem from '../../shared/fixtures/valley-meryem-native.json';
import warrenControl from '../../shared/fixtures/warren-native-return-control.json';
import actualHead from '../../shared/fixtures/watch-kian-care-native.json';
import currentWellDanyal from '../../shared/fixtures/well-danyal-native.json';
import { clockRuns, stepMinute } from './night.ts';
import { endState, replay, WatchRun } from './run.ts';

// Actual published Watch source, captured at a natural idle boundary after ordinary care.
// The fixture is its bounded shelf passport; the raw source stays in the source archive.
function chapter(head = actualHead) {
  const parent = head as unknown as PersonaEnvelope;
  const clock = (parent.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000;
  return makeCastChapter([preparePersonaLife(parent, clock)]);
}
describe('finite own-Watch care re-entry', () => {
  it('retains actual Kian and Ada state, keeps the meal and permits an explicit stay without completed travel', () => {
    const c = makeCastChapter(
      [actualHead, actualDanyal, actualMeryem].map((head) => {
        const parent = head as unknown as PersonaEnvelope;
        const clock = (parent.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000;
        return preparePersonaLife(parent, clock);
      }),
    );
    const run = new WatchRun(1, undefined, c);
    const s = run.state;
    const k = s.community.people.find((p) => p.id === 'kian')!;
    const ada = s.community.people.find((p) => p.id === 'ada')!;
    const source = actualHead.transfer.watchCare;
    const offset = k.now - actualHead.transfer.person.person.source.now;
    expect(canonicalPersona(k.rng)).toBe(canonicalPersona(actualHead.transfer.person.person.rng));
    expect(k.body.fitness).toBe(actualHead.transfer.person.person.health.fitness);
    expect(s.refugeVisit?.returnBy).toBe(source.agreement.returnBy + offset);
    expect(s.refugeVisit?.careCompletedAt).toBe(source.care.completedAt + offset);
    expect(ada.now).toBe(source.dependent.sourceMinute + offset);
    expect(ada.now - ada.life.bornAt).toBe(source.dependent.ageMinutes);
    expect([ada.body.satiety, ada.body.hydration, ada.body.sleepPressure]).toEqual([
      source.dependent.satiety,
      source.dependent.hydration,
      source.dependent.sleepPressure,
    ]);
    expect(ada.social.relationships.some((r) => r.otherId === 'kian' && r.roles.includes('guardian'))).toBe(
      true,
    );
    const meal = k.agenda.commitments.find((v) => v.id === source.agreement.commitmentId)!;
    const returning = k.agenda.commitments.find((v) => v.id === source.agreement.returnCommitmentId)!;
    expect(meal.status).toBe('kept');
    expect(returning.status).toBe('pending');
    expect(returning.toId).toBe('ada');
    expect(returning.until - k.now).toBe(
      source.agreement.returnBy - actualHead.transfer.person.person.source.now,
    );
    run.input({ k: 'start' });
    expect(run.input({ k: 'begin' })).toBe(false);
    const heldAt = s.minute;
    expect(clockRuns(s)).toBe(false);
    for (let i = 0; i < 100; i++) {
      run.step();
      stepMinute(s);
    }
    expect(s.minute).toBe(heldAt);
    expect(s.phase).toBe('dusk');
    expect(run.input({ k: 'refugeVisit', choice: 'stay' })).toBe(true);
    expect(meal.status).toBe('kept');
    expect(returning.status).toBe('released');
    expect(s.refugeVisit?.status).toBe('staying');
    expect(ada.body.satiety).toBe(source.dependent.satiety);
    expect(ada.body.alive).toBe(true);
    expect(clockRuns(s)).toBe(true);
    run.step();
    expect(s.minute).toBe(heldAt + 1);
    expect(endState(replay(run.export()))).toEqual(run.export().end);
  });
  it('refuses an altered guardian or an unrelated home duty before an actor is pinned', () => {
    const wrongGuardian = structuredClone(actualHead);
    wrongGuardian.transfer.watchCare.dependent.guardian = 'tamar';
    expect(() => new WatchRun(1, undefined, chapter(wrongGuardian))).toThrow(/care|Ada|guardian/i);
    const future = structuredClone(actualHead);
    future.transfer.watchCare.dependent.sourceMinute = actualHead.transfer.person.person.source.now + 1;
    expect(() => new WatchRun(1, undefined, chapter(future))).toThrow(/Ada|reservoir/i);
    const home = structuredClone(actualHead);
    home.transfer.person.calendar.commitments.push({
      ...home.transfer.person.calendar.commitments[0]!,
      id: 'unrelated-home-duty',
      kind: 'duty',
      actions: ['go-home'],
      toId: 'ada',
      targetId: 'ada',
    });
    expect(() => new WatchRun(1, undefined, chapter(home))).toThrow(/care|duty|action/i);
  });
});

// Bounded passports from actual native UI Warren692/794; source raw snapshots stay archived.
// These are mechanism controls, not published/native UI head evidence.
async function warrenChapter(change?: (transfer: typeof warrenControl.sources.kian) => void) {
  const inputs = [];
  for (const role of ['kian', 'meryem'] as const) {
    const transfer = structuredClone(warrenControl.sources[role]);
    if (role === 'kian' && change) change(transfer as typeof warrenControl.sources.kian);
    const castId = role === 'kian' ? 'hf.cast.kian.watch' : 'hf.cast.meryem.warren';
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: `control-${role}`,
      parentRevision: null,
      source: { game: 'warren', build: 'actual-export-control', engine: '2.17.0', rules: 'warren-0.6.0' },
      transfer: {
        ...transfer,
        life: initialPersonaLife(castId, `control-${role}`, 0),
      } as unknown as PersonaEnvelope['transfer'],
      limitations: [],
    });
    inputs.push(preparePersonaLife(parent, 0));
  }
  const well = currentWellDanyal as unknown as PersonaEnvelope;
  inputs.push(
    preparePersonaLife(
      well,
      (well.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000,
    ),
  );
  return makeCastChapter(inputs);
}
describe('finite native Warren return', () => {
  it('retains the actual additional care, old dependent stamp, exact pending promise and complete provenance through replay', async () => {
    const c = await warrenChapter();
    const run = new WatchRun(1, undefined, c),
      s = run.state;
    const ownClaims: ReturnType<typeof preparePersonaLife>[] = [];
    for (const entry of Object.values(c.people!)) {
      if (entry.input.parent.source.game !== 'warren') {
        ownClaims.push(entry.input);
        continue;
      }
      const native = entry.input.parent,
        { revision, ...body } = native;
      ownClaims.push(
        preparePersonaLife(
          await createPersona({
            ...body,
            parentRevision: revision,
            source: { game: 'watch', engine: '2.17.0', rules: 'cast-1', build: 'control' },
            transfer: {
              ...body.transfer,
              siteNativeClaim: { version: 'site-native-claim/1', source: native.source, revision },
            },
          }),
          0,
        ),
      );
    }
    expect(() => new WatchRun(1, undefined, makeCastChapter(ownClaims))).not.toThrow();

    const k = s.community.people.find((p) => p.id === 'kian')!,
      ada = s.community.people.find((p) => p.id === 'ada')!;
    const source = warrenControl.sources.kian,
      v = source.warrenCare.visit;
    const offset = k.now - source.person.person.source.now;
    expect(canonicalPersona(k.rng)).toBe(canonicalPersona(source.person.person.rng));
    expect(k.body.fitness).toBe(source.person.person.health.fitness);
    expect(s.warrenCareReturn).toEqual({ source: source.warrenCare, onwardOffset: offset });
    expect(ada.now).toBe(v.dependent.sourceMinute + offset);
    expect(ada.now - ada.life.bornAt).toBe(v.dependent.ageMinutes);
    expect(ada.body.sleepPressure).toBe(v.dependent.sleepPressure);
    expect([ada.body.satiety, ada.body.hydration, ada.body.alive]).toEqual([1, 1, true]);
    const meal = k.agenda.commitments.find((x) => x.id === v.agreement.commitmentId)!;
    const pending = k.agenda.commitments.find((x) => x.id === v.agreement.returnCommitmentId)!;
    expect(meal.status).toBe('kept');
    expect(pending.status).toBe('pending');
    expect(pending.toId).toBe('ada');
    expect(pending.until - k.now).toBe(v.returnBy - source.person.person.source.now);
    expect(k.agenda.commitments.filter((x) => x.id === meal.id)).toHaveLength(1);
    run.input({ k: 'start' });
    expect(run.input({ k: 'begin' })).toBe(false);
    expect(run.input({ k: 'refugeVisit', choice: 'stay' })).toBe(true);
    expect(meal.status).toBe('kept');
    expect(pending.status).toBe('released');
    expect(ada.body.sleepPressure).toBe(v.dependent.sleepPressure);
    const finishNight = () => {
      while (run.state.phase === 'night') run.step();
    };
    run.input({ k: 'begin' });
    finishNight();
    run.input({ k: 'toDusk' });
    run.input({ k: 'begin' });
    finishNight();
    // Fault injection only: a late failure must leave the prior state/log intact.
    const id = 'hf.cast.meryem.warren';
    const valid = s.castChapter!.people![id]!.initial!;
    const broken = JSON.parse(valid);
    broken.conscience.norms.push({ normId: 'unsupported-fault', standing: 'recommended', conviction: 0.4 });
    s.castChapter!.people![id]!.initial = JSON.stringify(broken);
    const before = run.snapshot();
    expect(() => run.input({ k: 'toDusk' })).toThrow(/unmapped.*norm/);
    expect(run.snapshot()).toEqual(before);
    s.castChapter!.people![id]!.initial = valid;
    expect(run.input({ k: 'toDusk' })).toBe(true);
    expect(s.community.people.some((p) => p.id === 'meryem')).toBe(true);
    expect(
      s.community.people.find((p) => p.id === 'meryem')!.conscience.norms.some((n) => n.normId === 'dues'),
    ).toBe(true);
    expect(endState(replay(run.export()))).toEqual(run.export().end);
    expect(replay(run.export()).warrenCareReturn).toEqual(s.warrenCareReturn);
  });
  it('refuses changed care arithmetic, guardian, pending deadline and receipt, without accepting forwarded claims', async () => {
    for (const change of [
      (t: typeof warrenControl.sources.kian) => {
        t.warrenCare.visit.dependent.sleepPressure = 0;
      },
      (t: typeof warrenControl.sources.kian) => {
        t.warrenCare.visit.dependent.guardian = 'tamar';
      },
      (t: typeof warrenControl.sources.kian) => {
        t.person.calendar.commitments[0]!.until++;
      },
      (t: typeof warrenControl.sources.kian) => {
        t.checkpoint.sourceMinute++;
      },
      (t: typeof warrenControl.sources.kian) => {
        t.castPassport = 'site-cast/1';
      },
    ]) {
      const c = await warrenChapter(change);
      expect(() => new WatchRun(1, undefined, c)).toThrow();
    }
  });
});
