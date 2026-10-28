import { createPerson } from '@adam0white/hf-legacy';
import { expect, it } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import { createPersona } from '../src/persona.ts';
import { admitPortablePerson, projectPortablePerson } from '../src/persona-portable.ts';

// Synthetic bodies isolate binding from biography. No second cast table or actor matrix.
function actor(castId: string, id: string) {
  const cast = canonicalCast(castId);
  return createPerson({
    id,
    name: cast.name,
    bornAt: -cast.age * 525960,
    sex: 'male',
    seed: 9,
    traits: cast.traits,
    values: cast.values,
  });
}
async function departure(game: string, castId: string, id: string) {
  const person = actor(castId, id);
  person.body.satiety = 0.41;
  return createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: canonicalCast(castId).revision,
    branchId: `bridge-${game}-${id}`,
    parentRevision: null,
    source: { game, engine: '2.23.0', build: 'control', rules: 'portable-1' },
    transfer: projectPortablePerson({ castId, game, engine: '2.23.0', person, history: [] }),
    limitations: [],
  });
}

it('continues Master Yusuf from Warren in Valley under its different authored role', async () => {
  const castId = 'hf.cast.yusuf.warren';
  const parent = await departure('warren', castId, 'yusuf');
  const opening = actor(castId, 'yusuf-usta');
  expect(admitPortablePerson(parent, 'valley', opening).body.satiety).toBe(0.41);
  expect(opening.body.satiety).toBe(0.8);
});

it('continues Bilal from Rope in Glance', async () => {
  const castId = 'hf.cast.bilal.rope';
  const parent = await departure('rope', castId, 'bilal');
  expect(admitPortablePerson(parent, 'glance', actor(castId, 'bilal')).body.satiety).toBe(0.41);
});

it('continues Wren from Glance in Rope', async () => {
  const castId = 'hf.cast.wren.rope';
  const parent = await departure('glance', castId, 'wren');
  expect(admitPortablePerson(parent, 'rope', actor(castId, 'wren')).body.satiety).toBe(0.41);
});

it('continues Tariq from Well in Warren', async () => {
  const castId = 'hf.cast.tariq.well';
  const parent = await departure('well', castId, 'tariq');
  expect(admitPortablePerson(parent, 'warren', actor(castId, 'tariq')).body.satiety).toBe(0.41);
});

it('continues Nermin from Good Hands in Hearsay', async () => {
  const castId = 'hf.cast.nermin.goodhands';
  const parent = await departure('goodhands', castId, 'nermin');
  expect(admitPortablePerson(parent, 'hearsay', actor(castId, 'nermin')).body.satiety).toBe(0.41);
});

it('continues Rafi from Pass in Small Works', async () => {
  const castId = 'hf.cast.rafi.pass';
  const parent = await departure('pass', castId, 'rafi');
  expect(admitPortablePerson(parent, 'repair', actor(castId, 'rafi')).body.satiety).toBe(0.41);
});

it('continues Maryam from Valley in Well', async () => {
  const castId = 'hf.cast.maryam.well';
  const parent = await departure('valley', castId, 'maryam');
  expect(admitPortablePerson(parent, 'well', actor(castId, 'maryam')).body.satiety).toBe(0.41);
});

it('continues Samira from Well in Watch', async () => {
  const castId = 'hf.cast.samira.well';
  const parent = await departure('well', castId, 'samira');
  expect(admitPortablePerson(parent, 'watch', actor(castId, 'samira')).body.satiety).toBe(0.41);
});

it('continues Zeynep from Pass under the Good Hands role', async () => {
  const castId = 'hf.cast.zeynep.pass';
  const parent = await departure('pass', castId, 'zeynep');
  expect(admitPortablePerson(parent, 'goodhands', actor(castId, 'zeynep-pass')).body.satiety).toBe(0.41);
});

it('continues Sam from Small Works in Pass', async () => {
  const castId = 'hf.cast.sam.smallworks';
  const parent = await departure('repair', castId, 'sam');
  expect(admitPortablePerson(parent, 'pass', actor(castId, 'sam')).body.satiety).toBe(0.41);
});

it('continues Dilan from Hearsay in Murmur', async () => {
  const castId = 'hf.cast.dilan.murmur';
  const parent = await departure('hearsay', castId, 'dilan');
  expect(admitPortablePerson(parent, 'murmur', actor(castId, 'dilan')).body.satiety).toBe(0.41);
});

it('continues Burak from Commonstead in Stairwell', async () => {
  const castId = 'hf.cast.burak.stairwell';
  const parent = await departure('commonstead', castId, castId);
  expect(admitPortablePerson(parent, 'stairwell', actor(castId, 'burak')).body.satiety).toBe(0.41);
});
