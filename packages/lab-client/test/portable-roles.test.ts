import { createPerson } from '@adam0white/hf-legacy';
import { expect, it } from 'vitest';
import { canonicalCast } from '../src/cast.ts';
import { createPersona } from '../src/persona.ts';
import { admitPortablePerson, claimPortablePerson, projectPortablePerson } from '../src/persona-portable.ts';

// Authored actor IDs, independently pinned from each host's cast entry.
const families: Record<string, Record<string, string>> = {
  valley: {
    'hf.cast.yusuf.warren': 'yusuf-usta',
    'hf.cast.meryem.warren': 'meryem-visitor',
    'hf.cast.yusuf.well': 'yusuf',
    'hf.cast.samira.well': 'samira',
    'hf.cast.maryam.well': 'maryam',
    'hf.cast.danyal.well': 'danyal',
  },
  glance: {
    'hf.cast.dai.glance': 'dai',
    'hf.cast.callum.glance': 'callum',
    'hf.cast.nerys.glance': 'nerys',
    'hf.cast.bilal.rope': 'bilal',
    'hf.cast.wren.rope': 'wren',
  },
  rope: {
    'hf.cast.tamar.rope': 'tamar',
    'hf.cast.oskar.rope': 'oskar',
    'hf.cast.nell.rope': 'nell',
    'hf.cast.bilal.rope': 'bilal',
    'hf.cast.wren.rope': 'wren',
  },
  warren: {
    'hf.cast.yusuf.warren': 'yusuf',
    'hf.cast.meryem.warren': 'meryem',
    'hf.cast.maryam.well': 'maryam',
    'hf.cast.tariq.well': 'tariq',
    'hf.cast.kian.watch': 'kian',
    'hf.cast.tamar.watch': 'tamar',
  },
  hearsay: {
    'hf.cast.hatice.hearsay': 'hatice',
    'hf.cast.derya.stairwell': 'derya',
    'hf.cast.dilan.murmur': 'dilan',
    'hf.cast.nermin.goodhands': 'nermin',
    'hf.cast.aylin.murmur': 'aylin',
    'hf.cast.ece.murmur': 'ece',
    'hf.cast.riza.voice': 'riza',
    'hf.cast.osman.voice': 'osman',
  },
  repair: {
    'hf.cast.sam.smallworks': 'sam',
    'hf.cast.nora.smallworks': 'nora',
    'hf.cast.halil.voice': 'halil',
    'hf.cast.rafi.pass': 'rafi',
  },
  well: {
    'hf.cast.maryam.well': 'maryam',
    'hf.cast.yusuf.well': 'yusuf',
    'hf.cast.tariq.well': 'tariq',
    'hf.cast.idris.well': 'idris',
    'hf.cast.samira.well': 'samira',
    'hf.cast.danyal.well': 'danyal',
  },
  watch: {
    'hf.cast.tamar.watch': 'tamar',
    'hf.cast.kian.watch': 'kian',
    'hf.cast.idris.well': 'idris',
    'hf.cast.samira.well': 'samira',
    'hf.cast.danyal.well': 'danyal',
    'hf.cast.meryem.warren': 'meryem',
  },
  goodhands: {
    'hf.cast.nermin.goodhands': 'nermin',
    'hf.cast.hatice.hearsay': 'hatice',
    'hf.cast.hulya.pass': 'hulya',
    'hf.cast.aylin.murmur': 'aylin',
    'hf.cast.derya.stairwell': 'derya',
    'hf.cast.zeynep.pass': 'zeynep-pass',
    'hf.cast.selin.voice': 'selin-voice',
  },
  pass: {
    'hf.cast.selim.pass': 'selim',
    'hf.cast.dilek.pass': 'dilek',
    'hf.cast.rafi.pass': 'rafi',
    'hf.cast.zeynep.pass': 'zeynep',
    'hf.cast.hulya.pass': 'hulya',
    'hf.cast.murat.murmur': 'murat',
    'hf.cast.sam.smallworks': 'sam',
  },
  murmur: {
    'hf.cast.dilan.murmur': 'dilan',
    'hf.cast.aylin.murmur': 'aylin',
    'hf.cast.ece.murmur': 'ece',
    'hf.cast.murat.murmur': 'murat',
  },
  stairwell: {
    'hf.cast.hacer.voice': 'hacer',
    'hf.cast.sevim.stairwell': 'sevim',
    'hf.cast.burak.stairwell': 'burak',
    'hf.cast.derya.stairwell': 'derya',
    'hf.cast.tarik.stairwell': 'tarik',
  },
};

for (const [game, roles] of Object.entries(families)) {
  it(`continues ${game} roles without replacing the authored opening or accepting another actor`, async () => {
    for (const [castId, id] of Object.entries(roles)) {
      const cast = canonicalCast(castId);
      const actor = () =>
        createPerson({
          id,
          name: cast.name,
          bornAt: -cast.age * 525960,
          sex: 'male', // Synthetic body fixture; these controls test role binding, not biographies.
          seed: 9,
          traits: cast.traits,
          values: cast.values,
        });
      const source = actor();
      source.body.satiety = 0.41;
      const parent = await createPersona({
        format: 'hf-persona/1',
        castId,
        castRevision: cast.revision,
        branchId: `roles-${game}-${id}`,
        parentRevision: null,
        source: { game, engine: '2.23.0', build: 'control', rules: 'portable-1' },
        transfer: projectPortablePerson({
          castId,
          game,
          engine: '2.23.0',
          person: source,
          history: ['Completed an authored chapter.'],
        }),
        limitations: [],
      });
      const before = structuredClone(parent);
      const opening = actor();
      expect(admitPortablePerson(parent, game, opening).body.satiety).toBe(0.41);
      expect(opening.body.satiety).toBe(0.8);
      expect(() => admitPortablePerson(parent, game, { ...opening, id: 'wrong-actor' })).toThrow(
        /authored role/,
      );
      expect(() =>
        projectPortablePerson({
          castId,
          game,
          engine: '2.23.0',
          person: { ...source, id: 'wrong-actor' },
          history: [],
        }),
      ).toThrow(/authored chapter/);
      const held = { ...parent, transfer: claimPortablePerson(parent, game) };
      expect(() => admitPortablePerson(held, game, opening)).toThrow(/receiving chapter/);
      expect(parent).toEqual(before);
    }
  });
}
