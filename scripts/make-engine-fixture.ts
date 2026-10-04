/**
 * Write a save fixture from the current engine, for packages/human/test/migrate.test.ts:
 *
 *   node scripts/make-engine-fixture.ts packages/human/test/fixtures/engine-1.9.0.json
 *
 * Run it once per engine version that should stay restorable, on the commit that shipped it (engine-1.9.0.json was
 * written at ff95cb5, the last 1.9.0 commit). It lives a three-person village (seed 3) for 200 days with every
 * optional long-run slice in use (gists, yearbook, character change, skill consolidation, surroundings, impressions,
 * courtship, a family slice), saves at day 200.25 and records a sha256 of one more day lived by the same engine, in
 * the shape of the older fixtures (`village.saved`, `village.continued`).
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as H from '../packages/human/src/index.ts';

const out = process.argv[2];
if (!out) throw new Error('usage: make-engine-fixture.ts <fixture.json>');

const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const strip = (people: H.Person[]) =>
  rt(people.map((p) => H.snapshot(p))).map((j) => {
    const { engine: _engine, ...rest } = j as unknown as Record<string, unknown>;
    return rest;
  });

const DAY = H.MINUTES_PER_DAY;
const ids = ['ada', 'bram', 'cora'];
const people = ids.map((id, i) =>
  H.createPerson(H.villagerSpec(id, id, 100 + i, { devout: id === 'bram', others: ids, now: 0 })),
);
for (const p of people) {
  H.enableGists(p);
  H.enableYearbook(p);
  H.enableCharacterChange(p);
  H.enableSkillConsolidation(p);
  H.setAmbient(p, { cold: 0.3, dark: 0.2, dayLength: 10 }, 0);
}
const [ada, bram, cora] = people as [H.Person, H.Person, H.Person];
H.acquaintWith(ada, bram, 0.6, 0);
H.acquaintWith(bram, cora, 0.4, 0);
H.setReserve(cora, { pain: 0.8 });
cora.family = { aptitudes: { farming: 1.3 }, attachment: 0.7 };

const world = H.createVillage(people, { seed: 3 });
const c = H.createCommunity(people);
const start = 0;
const saveAt = 200.25;
const endAt = 201.25;
for (let d = 0; d < 200; d++) {
  H.stepCommunity(c, world, start + (d + 0.5) * DAY, {});
  if (d % 5 === 0) H.court(ada, bram, start + (d + 0.5) * DAY);
  H.glimpseOf(ada, cora, { at: start + (d + 0.5) * DAY });
  H.stepCommunity(c, world, start + (d + 1) * DAY, {});
}
H.stepCommunity(c, world, start + saveAt * DAY, {});
const saved = rt({ people: people.map((p) => H.snapshot(p)), c: H.communityState(c), state: world.state });

// One more day from the save, restored the way migrate.test.ts restores it.
const again = rt(saved).people.map((j) => H.restore(j));
const world2 = H.createVillage(again, { seed: 0, state: rt(saved).state as H.VillageState });
const c2 = H.createCommunity(again, rt(saved).c);
H.stepCommunity(c2, world2, start + endAt * DAY, {});
const continued = hash({ people: strip(c2.people), state: rt(world2.state) });

writeFileSync(
  resolve(out),
  `${JSON.stringify({ engine: H.ENGINE_VERSION, village: { start, saveAt, endAt, saved, continued } })}\n`,
);
console.log(`${out}: engine ${H.ENGINE_VERSION}, continued ${continued}`);
