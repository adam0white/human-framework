import assert from 'node:assert/strict';
import * as old from '../../games/commons.js';
import * as camp from '../../games/camp.js';
import * as story from '../../games/camp-story.js';
import * as rain from '../../games/commons-next.js';
import { chooseCommand, applyCommand } from '../../games/commons-policy.js';
import { runTwoCacheProbe } from '../../../artifacts/commons-next/two-cache-ferry-probe.mjs';

function legacy(policy = 'build-first', caches = 0) {
  let world = old.createGame(), previous;
  for (let n = 0; n < 1500 && (world.milestoneAt === null || world.caches < caches); n++) { previous = world; world = applyCommand(world, chooseCommand(old.getGameView(world), policy)); }
  assert.notEqual(world.milestoneAt, null); assert.ok(world.caches >= caches);
  return { world, previous };
}
const save = game => story.exportGame(game);
const mutate = (source, fn) => { const changed = structuredClone(source); fn(changed.game); return changed; };
export function fixtures() {
  const oldBuild = legacy(), oldStock = legacy('stock-first');
  const introduction = story.migrateLegacyGame(old.exportGame(oldBuild.world));
  const base = story.continueStory(introduction), idle = story.advanceGame(base, 5);
  const gathering = story.advanceGame(story.startJob(base, 'gather-timber'), 5);
  const beforeMilestone = story.migrateLegacyGame(old.exportGame(oldStock.previous));
  const earned = story.advanceGame(beforeMilestone, 1440);
  const mealFerry = story.advanceGame(story.startJob(story.advanceGame(base, 86), 'eat'), 4);
  const mealAfter = story.advanceGame(story.dispatchFerry(mealFerry), 4);
  const ended = story.finishStory(story.advanceGame(story.dispatchFerry(story.advanceGame(base, 90)), 90));
  const returned = story.advanceGame(story.returnToCamp(ended), 6);
  const rainFerry = rain.restoreGame(runTwoCacheProbe().ferrySave);
  const rainAllocated = rain.allocateCache(rainFerry, 'households');
  const rainEnded = rain.finishDay(rain.advanceGame(rain.dispatchFerry(rainAllocated), 90));
  let rich = story.continueStory(story.migrateLegacyGame(old.exportGame(legacy('build-first', 4).world)));
  rich = story.advanceGame(rich, 90); rich = story.allocateCache(rich, 'households'); rich = story.dispatchFerry(rich);
  let produced = story.continueStory(story.migrateLegacyGame(old.exportGame(oldStock.world)));
  produced = story.advanceGame(produced, produced.world.jobs.player.endsAt - produced.world.clock.now);
  produced = story.startJob(produced, 'build-cache');
  for (let n = 0; !produced.world.caches && n < 40; n++) produced = story.advanceToNextEvent(produced);
  assert.equal(produced.world.caches, 1);
  let stress = base;
  while (stress.record.commands.length < 500) {
    const view = story.getGameView(stress), n = stress.record.commands.length;
    if (view.phase === 'ferry') stress = story.dispatchFerry(stress);
    else if (n % 10 === 9) stress = story.advanceGame(stress, 2);
    else stress = story.requestProject(stress, 'cache');
  }
  const originals = [
    ['new-pre-entry', story.createGame()], ['new-pre-entry-gather', story.advanceGame(story.startJob(story.createGame(), 'gather-timber'), 3)],
    ['earned-entry', earned], ['legacy-introduction', introduction], ['paid-idle', idle], ['partial-gather', gathering],
    ['partial-meal-ferry', mealFerry], ['partial-meal-after-ferry', mealAfter], ['rain-ended', ended], ['returned-six', returned],
    ['legacy-rain-ferry', story.migrateLegacyRainGame(rain.exportGame(rainFerry))],
    ['legacy-rain-allocated', story.migrateLegacyRainGame(rain.exportGame(rainAllocated))],
    ['legacy-rain-ended', story.migrateLegacyRainGame(rain.exportGame(rainEnded))],
    ['carried-allocated-dispatched', rich], ['new-cache-completed', produced], ['journal-500', stress]
  ].map(([name, game]) => ({ name, kind: 'legal-api-fixture', snapshot: save(game) }));
  const changed = [
    ['changed-idle-body', mutate(save(idle), g => { g.world.people.player.body.fatigue += .05; }), 'Changed bounded body; no paid receipts or journal edited.'],
    ['different-legal-paid-work', mutate(save(idle), g => { g.world = camp.advanceGame(camp.startJob(camp.restoreGame(g.record.root), 'gather-timber'), 5); }), 'Replace idle world with a separately legal same-root five-minute work world, leaving journal unchanged.'],
    ['changed-new-cache-time', mutate(save(produced), g => { g.window.production[0].at--; g.world.lastAssemblies.cache.completedAt--; }), 'Move matching world/window latest completion timestamp one minute earlier without changing work totals.'],
    ['dispatch-before-allocation-history', mutate(save(rich), g => { const a = g.record.commands; [a[a.length - 1], a[a.length - 2]] = [a[a.length - 2], a[a.length - 1]]; }), 'Reverse same-minute dispatch/allocation commands while retaining original valid window and world.'],
    ['shifted-deadline', mutate(save(idle), g => { g.window.ferryAt++; }), 'Obvious pinned-deadline corruption that the rival should catch.'],
    ['duplicate-cache-allocation', mutate(save(rich), g => { g.window.allocations.push(structuredClone(g.window.allocations[0])); }), 'Obvious duplicate ownership corruption that the rival should catch.'],
    ['changed-Rain-prefix', mutate(save(story.migrateLegacyRainGame(rain.exportGame(rainAllocated))), g => { g.window.allocations[0].destination = 'camp'; }), 'Alter already settled original Rain allocation; root prefix must remain authoritative.'],
    ['pre-entry-body-snapshot-limit', mutate(save(story.createGame()), g => { g.world.people.player.body.fatigue += .05; }), 'Pre-entry has no recorded command-history claim in either validator.'],
    ['post-return-body-snapshot-limit', mutate(save(returned), g => { g.world.people.player.body.fatigue += .05; }), 'After Return, public source checks extension rather than replaying later body history.']
  ].map(([name, snapshot, purpose]) => ({ name, kind: 'prescribed-changed-snapshot', snapshot, purpose }));
  return [...originals, ...changed];
}
