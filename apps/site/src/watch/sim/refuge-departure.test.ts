import { expect, it } from 'vitest';
import { actorRuntime, readActor } from './actor.ts';
import { captureWatchPerson } from './cast.ts';
import { postSection } from './config.ts';
import { WatchWorld } from './people.ts';
import { endState, replay, WatchRun } from './run.ts';

it('captures Kian and Ada after ordinary dawn preparation and replays the complete chapter', async () => {
  const run = new WatchRun(42);
  expect(run.input({ k: 'start' })).toBe(true);
  run.input({ k: 'post', watcher: 'tamar', post: `${run.state.warned}-1` });
  run.input({ k: 'lantern', section: run.state.warned });
  const kianPost = run.state.openPosts.find((post) => post !== `${run.state.warned}-1`)!;
  expect(run.input({ k: 'post', watcher: 'kian', post: kianPost })).toBe(true);
  expect(run.state.posts.kian).toBe(kianPost);
  run.input({ k: 'lantern', section: postSection(kianPost) });
  expect(run.input({ k: 'dusk-rest', who: 'kian', until: 'dawn' })).toBe(true);
  run.input({ k: 'lantern', section: run.state.warned });
  expect(run.input({ k: 'begin' })).toBe(true);
  for (let guard = 0; guard < 1000 && run.state.phase === 'night'; guard++) run.step();
  expect(run.state.phase).toBe('dawn');
  const dawnSleep = new WatchWorld(run.state)
    .affordancesFor(readActor(run.state, 'kian')!)
    .find((offer) => offer.action === 'sleep');
  expect(dawnSleep?.norms ?? []).not.toContainEqual({ normId: 'keep-watch', relation: 'violates' });
  expect(run.input({ k: 'refugeVisit', choice: 'ask' })).toBe(true);
  expect(run.state.refugeVisit?.status).toBe('agreed');
  expect(run.input({ k: 'refugeVisit', choice: 'prepare' })).toBe(true);
  expect(run.state.refugeDeparture).toBeDefined();
  const transfer = await captureWatchPerson(run.state, 'hf.cast.kian.watch', []);
  expect(transfer.watchCare).toEqual(run.state.refugeDeparture?.watchCare);
  const portable = transfer.portable as import('@adam0white/human-framework').PortablePerson;
  expect(transfer.sourceSnapshot).toEqual(run.state.refugeDeparture?.archive);
  expect(portable.version).toBe(2);
  if (portable.version !== 2) throw Error('Expected retained departure');
  expect(portable.retained.at).toBe(run.state.refugeDeparture?.archive.current.at);
  expect(
    portable.retained.agenda.commitments.some(
      (c) => c.actions.includes('return-with-ada') && c.status === 'pending',
    ),
  ).toBe(true);
  const file = JSON.parse(JSON.stringify(run.export()));
  // The downloaded chapter includes its verified custody archive and must reopen
  // through the public 5 MiB file boundary. Avoid another copy in the end summary.
  expect(file.end.refugeDeparture).not.toHaveProperty('archive');
  expect(file.end.refugeDeparture.sourceHash).toBe(run.state.refugeDeparture?.archive.hashes.full);
  expect(
    new TextEncoder().encode(JSON.stringify({ ...file, castSources: { kian: transfer.sourceSnapshot } }))
      .length,
  ).toBeLessThan(5 * 1024 * 1024);
  expect(endState(replay(file)).fullHash).toBe(file.end.fullHash);
  actorRuntime(run.state).verify();
}, 180000);

it('joins travel obligations with a final and and no Oxford comma', async () => {
  const run = new WatchRun(42);
  const watch = 'the current watch';
  const preparation = 'preparations for a visit with Ada';
  await expect(captureWatchPerson(run.state, 'hf.cast.kian.watch', [watch])).rejects.toThrow(
    'Finish the current watch in this chapter before continuing elsewhere.',
  );
  await expect(captureWatchPerson(run.state, 'hf.cast.kian.watch', [watch, preparation])).rejects.toThrow(
    'Finish the current watch and preparations for a visit with Ada in this chapter before continuing elsewhere.',
  );
  await expect(
    captureWatchPerson(run.state, 'hf.cast.kian.watch', [watch, preparation, 'the return journey']),
  ).rejects.toThrow(
    'Finish the current watch, preparations for a visit with Ada and the return journey in this chapter before continuing elsewhere.',
  );
});
