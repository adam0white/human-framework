/** Voice definitions are authored once. HF uses its complete public calendar and always-on faculties. */
import { DEFAULT_NORMS, type RunSpec } from '@adam0white/human-framework';
import type { PrayerCalendar } from './hf4-model.ts';
import { milliseconds, VOICE_HF4_EDITION } from './hf4-run.ts';

const ACTIONS = [
  'funeral',
  'condolences',
  'sleep',
  'rest',
  'eat',
  'drink',
  'wait',
  'pray',
  'pray-qada',
  'pray-eid',
  'visit-grave',
  'walk',
  'local-help',
  'housework',
  'smoke',
  'work-repair',
  'work',
  'work-market',
  'see-doctor',
  'shop',
  'pay-rent',
  'collect-rent',
  'call',
  'tea',
  'talk',
];
export function voiceSpec(seed: number, start: number, calendar: PrayerCalendar): RunSpec {
  return {
    id: `voice:${seed}`,
    seed,
    start: milliseconds(start),
    host: { id: 'voice', edition: VOICE_HF4_EDITION, schema: 'voice-world/1' },
    definitions: {
      actions: ACTIONS.map((id) => ({
        id,
        label: id,
        demands: { effort: 0, focus: 0, mode: id === 'sleep' ? 'sleep' : 'awake', requires: {} },
        tags: [],
        norms: [],
      })),
      norms: DEFAULT_NORMS,
      marriageCustoms: [],
      skills: ['repair', 'office', 'trade'].map((id) => ({ id, label: id, domain: 'motor' })),
      skillTransfers: [],
      methods: [],
      routines: [],
      sources: [
        ...[
          'halil',
          'selin',
          'riza',
          'hacer',
          'osman',
          'nuran',
          'doctor',
          'cemetery',
          'clinic',
          'mosque',
          'teahouse',
          'market',
          'city',
          'halil-home',
          'selin-home',
          'riza-home',
          'hacer-home',
          'osman-home',
          'public-garden',
        ].map((id) => ({ type: 'person' as const, id })),
        { type: 'host', id: 'voice' },
        ...['you', 'halil', 'selin', 'riza', 'hacer', 'osman', 'doctor'].map((id) => ({
          type: 'voice' as const,
          id,
        })),
      ],
      lexicon: {
        names: {
          halil: 'Halil',
          selin: 'Selin',
          riza: 'Rıza',
          hacer: 'Hacer',
          osman: 'Osman',
          you: 'you',
          nuran: 'Nuran',
          doctor: 'the doctor',
        },
        roles: {
          child: 'daughter',
          parent: 'father',
          friend: 'friend',
          neighbor: 'neighbour',
          landlord: 'landlord',
        },
        prefer: 'name',
        actions: {},
      },
      calendar: {
        id: 'voice-spring',
        epoch: { id: 'voice-epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: Array.from({ length: 45 }, (_, dayIndex) => {
          return {
            dayIndex,
            start: milliseconds(dayIndex * 1440),
            windows: [],
            nextFajrMs: milliseconds(calendar(dayIndex + 1).fajr),
          };
        }),
      },
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: {} },
  };
}
