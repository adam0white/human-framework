/** SCOPE: generated closed structural data validators from run-schema.ts.
 * Generated through C0, then edited by hand with run-schema.ts for 4.0; keep the two in step. No actor
 * handler dispatch. Runtime semantic/owner validation is separate.
 */
import type { DataShape } from './run-validation.ts';
export const DATA_SHAPES: Readonly<Record<string, DataShape>> = {
  PortableRetainedState: {
    kind: 'object',
    fields: {
      sex: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'female' },
            { kind: 'literal', value: 'male' },
          ],
        },
      },
      bornAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      memory: { optional: false, shape: { kind: 'ref', name: 'MemoryState' } },
      heldNorms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'HeldNorm' } } },
      agenda: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            exemptions: { optional: false, shape: { kind: 'ref', name: 'ExemptionPremises' } },
            commitments: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'Commitment' } },
            },
            owed: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'OwedMakeUp' } } },
            lapse: {
              optional: true,
              shape: {
                kind: 'object',
                fields: {
                  since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  missed: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            nextId: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      calendar: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            definition: { optional: false, shape: { kind: 'ref', name: 'CalendarDefinition' } },
            norms: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'SourcedNorm' } },
            },
          },
        },
      },
    },
  },
  PortableAdmission: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'scalar', name: 'Json' } },
      mapping: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            offsetMs: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            references: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    kind: {
                      optional: false,
                      shape: {
                        kind: 'union',
                        options: [
                          { kind: 'literal', value: 'action' },
                          { kind: 'literal', value: 'entity' },
                          { kind: 'literal', value: 'source' },
                          { kind: 'literal', value: 'norm' },
                          { kind: 'literal', value: 'proposition' },
                        ],
                      },
                    },
                    source: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                    target: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  Capacity: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'moving' },
      { kind: 'literal', value: 'manipulation' },
      { kind: 'literal', value: 'sight' },
    ],
  },
  LearningDomain: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'general' },
      { kind: 'literal', value: 'language' },
      { kind: 'literal', value: 'motor' },
      { kind: 'literal', value: 'knowledge' },
    ],
  },
  ActionDemands: {
    kind: 'object',
    fields: {
      effort: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      focus: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      mode: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'awake' },
            { kind: 'literal', value: 'sleep' },
          ],
        },
      },
      requires: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            moving: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            manipulation: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            sight: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      skill: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            difficulty: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            domain: { optional: false, shape: { kind: 'ref', name: 'LearningDomain' } },
          },
        },
      },
    },
  },
  NormTag: {
    kind: 'object',
    fields: {
      normId: { optional: false, shape: { kind: 'string' } },
      relation: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'fulfills' },
            { kind: 'literal', value: 'violates' },
          ],
        },
      },
    },
  },
  ActionDefinition: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: false, shape: { kind: 'string' } },
      demands: { optional: false, shape: { kind: 'ref', name: 'ActionDemands' } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      norms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'NormTag' } } },
    },
  },
  NormStanding: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'obligatory' },
      { kind: 'literal', value: 'recommended' },
      { kind: 'literal', value: 'permitted' },
      { kind: 'literal', value: 'disliked' },
      { kind: 'literal', value: 'forbidden' },
    ],
  },
  SourceCitation: {
    kind: 'object',
    fields: {
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'revelation' },
            { kind: 'literal', value: 'hadith' },
            { kind: 'literal', value: 'interpretation' },
            { kind: 'literal', value: 'empirical' },
            { kind: 'literal', value: 'assumption' },
          ],
        },
      },
      ref: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  NormProvenance: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'religious' } },
          researchRef: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          interpretationRef: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'authored-world' } },
          author: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          ruleId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          edition: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
    ],
  },
  NormExemption: {
    kind: 'object',
    fields: {
      when: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'illness' },
            { kind: 'literal', value: 'travel' },
          ],
        },
      },
      makeUp: { optional: false, shape: { kind: 'boolean' } },
      sources: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SourceCitation' } },
      },
      provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
    },
  },
  NormDefinition: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: false, shape: { kind: 'string' } },
      standing: { optional: false, shape: { kind: 'ref', name: 'NormStanding' } },
      sources: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SourceCitation' } },
      },
      provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
      exemptions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'NormExemption' } },
      },
    },
  },
  SourcedNorm: { kind: 'ref', name: 'NormDefinition' },
  Kin: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'spouse' },
      { kind: 'literal', value: 'parent' },
      { kind: 'literal', value: 'child' },
      { kind: 'literal', value: 'sibling' },
      { kind: 'literal', value: 'grandparent' },
      { kind: 'literal', value: 'grandchild' },
      { kind: 'literal', value: 'aunt-uncle' },
      { kind: 'literal', value: 'niece-nephew' },
      { kind: 'literal', value: 'step-parent' },
      { kind: 'literal', value: 'step-child' },
      { kind: 'literal', value: 'parent-in-law' },
      { kind: 'literal', value: 'child-in-law' },
    ],
  },
  MarriageCustomData: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      minAgeYears: { optional: false, shape: { kind: 'number' } },
      forbiddenKin: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Kin' } } },
      guardianForBride: { optional: false, shape: { kind: 'boolean' } },
      mourningDays: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            widow: { optional: false, shape: { kind: 'number' } },
            widower: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      maxSpouses: { optional: false, shape: { kind: 'number' } },
      pairing: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'opposite-sex' },
            { kind: 'literal', value: 'any' },
          ],
        },
      },
      provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
      engineeringPremises: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SourceCitation' } },
      },
    },
  },
  SkillDefinition: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: false, shape: { kind: 'string' } },
      domain: { optional: false, shape: { kind: 'ref', name: 'LearningDomain' } },
    },
  },
  Cue: {
    kind: 'object',
    fields: {
      cue: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      value: { optional: false, shape: { kind: 'string' } },
    },
  },
  MethodDefinition: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      conditions: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Cue' } } },
    },
  },
  CalendarDay: {
    kind: 'object',
    fields: {
      dayIndex: { optional: false, shape: { kind: 'number' } },
      start: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      prayers: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            fajrMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            sunriseMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            dhuhrMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            asrMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            maghribMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            ishaMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
          },
        },
      },
      nextFajrMs: { optional: true, shape: { kind: 'scalar', name: 'DurationMs' } },
      fasting: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            normId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            violatingActions: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
            },
            provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
          },
        },
      },
      eid: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            normId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
          },
        },
      },
      windows: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              commitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
    },
  },
  CalendarDefinition: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      epoch: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            simulationAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            dayIndex: { optional: false, shape: { kind: 'number' } },
            msOfDay: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
          },
        },
      },
      dayMs: { optional: false, shape: { kind: 'literal', value: 86400000 } },
      days: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'CalendarDay' } } },
    },
  },
  PhysiologicalNeed: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'food' },
      { kind: 'literal', value: 'water' },
      { kind: 'literal', value: 'sleep' },
      { kind: 'literal', value: 'rest' },
      { kind: 'literal', value: 'relief' },
    ],
  },
  PsychologicalNeed: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'safety' },
      { kind: 'literal', value: 'belonging' },
      { kind: 'literal', value: 'esteem' },
      { kind: 'literal', value: 'autonomy' },
      { kind: 'literal', value: 'competence' },
      { kind: 'literal', value: 'leisure' },
      { kind: 'literal', value: 'meaning' },
    ],
  },
  NeedId: {
    kind: 'union',
    options: [
      { kind: 'ref', name: 'PhysiologicalNeed' },
      { kind: 'ref', name: 'PsychologicalNeed' },
    ],
  },
  FollowOn: {
    kind: 'object',
    fields: {
      label: { optional: true, shape: { kind: 'string' } },
      durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      effort: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      focus: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  ExpectedConsequences: {
    kind: 'object',
    fields: {
      needs: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            food: { optional: true, shape: { kind: 'number' } },
            water: { optional: true, shape: { kind: 'number' } },
            sleep: { optional: true, shape: { kind: 'number' } },
            rest: { optional: true, shape: { kind: 'number' } },
            relief: { optional: true, shape: { kind: 'number' } },
            safety: { optional: true, shape: { kind: 'number' } },
            belonging: { optional: true, shape: { kind: 'number' } },
            esteem: { optional: true, shape: { kind: 'number' } },
            autonomy: { optional: true, shape: { kind: 'number' } },
            competence: { optional: true, shape: { kind: 'number' } },
            leisure: { optional: true, shape: { kind: 'number' } },
            meaning: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
      material: { optional: true, shape: { kind: 'number' } },
      risk: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            chance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      voidsBladder: { optional: true, shape: { kind: 'boolean' } },
      followedBy: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'FollowOn' } } },
      forecastAt: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            comfortAt: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            spentAt: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      provenance: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  EntityId: { kind: 'string' },
  MissedExcuse: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'sleep' },
      { kind: 'literal', value: 'unconscious' },
    ],
  },
  Commitment: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'promise' },
            { kind: 'literal', value: 'duty' },
            { kind: 'literal', value: 'appointment' },
            { kind: 'literal', value: 'worship' },
            { kind: 'literal', value: 'job' },
            { kind: 'literal', value: 'abstain' },
          ],
        },
      },
      toId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      actions: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      completion: { optional: true, shape: { kind: 'literal', value: 'end' } },
      normId: { optional: true, shape: { kind: 'string' } },
      importance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'pending' },
            { kind: 'literal', value: 'kept' },
            { kind: 'literal', value: 'broken' },
            { kind: 'literal', value: 'released' },
          ],
        },
      },
      recurEveryMs: { optional: true, shape: { kind: 'scalar', name: 'DurationMs' } },
      label: { optional: true, shape: { kind: 'string' } },
      violatedBy: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
      firm: { optional: true, shape: { kind: 'literal', value: true } },
      exemptWhen: {
        optional: true,
        shape: {
          kind: 'array',
          element: {
            kind: 'union',
            options: [
              { kind: 'literal', value: 'illness' },
              { kind: 'literal', value: 'travel' },
            ],
          },
        },
      },
      exempt: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            reason: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'illness' },
                  { kind: 'literal', value: 'travel' },
                  { kind: 'literal', value: 'necessity' },
                  { kind: 'ref', name: 'MissedExcuse' },
                ],
              },
            },
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
      makeUpOf: { optional: true, shape: { kind: 'string' } },
      chain: { optional: true, shape: { kind: 'string' } },
      recurUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  CommitmentData: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'promise' },
            { kind: 'literal', value: 'duty' },
            { kind: 'literal', value: 'appointment' },
            { kind: 'literal', value: 'worship' },
            { kind: 'literal', value: 'job' },
            { kind: 'literal', value: 'abstain' },
          ],
        },
      },
      toId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      actions: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      completion: { optional: true, shape: { kind: 'literal', value: 'end' } },
      normId: { optional: true, shape: { kind: 'string' } },
      importance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      recurEveryMs: { optional: true, shape: { kind: 'scalar', name: 'DurationMs' } },
      label: { optional: true, shape: { kind: 'string' } },
      violatedBy: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
      firm: { optional: true, shape: { kind: 'literal', value: true } },
      exemptWhen: {
        optional: true,
        shape: {
          kind: 'array',
          element: {
            kind: 'union',
            options: [
              { kind: 'literal', value: 'illness' },
              { kind: 'literal', value: 'travel' },
            ],
          },
        },
      },
      makeUpOf: { optional: true, shape: { kind: 'string' } },
      chain: { optional: true, shape: { kind: 'string' } },
      recurUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Offer: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      actionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: false, shape: { kind: 'string' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      target: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      place: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      participants: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'scalar', name: 'PersonId' } },
      },
      alongside: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'PersonId' } } },
      demands: { optional: false, shape: { kind: 'ref', name: 'ActionDemands' } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      norms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'NormTag' } } },
      expected: { optional: false, shape: { kind: 'ref', name: 'ExpectedConsequences' } },
      methodContext: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      promise: { optional: true, shape: { kind: 'ref', name: 'CommitmentData' } },
      fulfills: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      advances: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      diminishes: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      jointId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  PerceptClaim: {
    kind: 'object',
    fields: {
      prop: { optional: false, shape: { kind: 'string' } },
      value: { optional: false, shape: { kind: 'boolean' } },
      confidence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      origin: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      lineage: { optional: true, shape: { kind: 'string' } },
    },
  },
  ConsequenceAction: {
    kind: 'object',
    fields: {
      action: { optional: false, shape: { kind: 'string' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
    },
  },
  ReceivedConsequence: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      revision: { optional: false, shape: { kind: 'number' } },
      trigger: { optional: false, shape: { kind: 'ref', name: 'ConsequenceAction' } },
      successor: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            action: { optional: false, shape: { kind: 'string' } },
            targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
            placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
            durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            effort: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            focus: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            materialCost: { optional: true, shape: { kind: 'number' } },
            diminishes: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
            advances: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
          },
        },
      },
      availableFrom: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      availableUntil: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      expiresAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      chance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      confidence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  ReportedAccount: {
    kind: 'object',
    fields: {
      sourceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      prop: { optional: false, shape: { kind: 'string' } },
      value: { optional: false, shape: { kind: 'boolean' } },
    },
  },
  Prospect: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      label: { optional: false, shape: { kind: 'string' } },
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'make' },
            { kind: 'literal', value: 'arrange' },
            { kind: 'literal', value: 'gather' },
            { kind: 'literal', value: 'finish' },
          ],
        },
      },
      placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      materialIds: { optional: true, shape: { kind: 'array', element: { kind: 'ref', name: 'EntityId' } } },
      progress: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  PerceptData: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      occurredAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      channel: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'saw' },
            { kind: 'literal', value: 'heard' },
            { kind: 'literal', value: 'told' },
            { kind: 'literal', value: 'felt' },
            { kind: 'literal', value: 'outcome' },
            { kind: 'literal', value: 'social' },
          ],
        },
      },
      kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      actorId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      targetId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      placeId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      valence: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      summary: { optional: false, shape: { kind: 'string' } },
      addressedSummary: { optional: true, shape: { kind: 'string' } },
      near: { optional: true, shape: { kind: 'boolean' } },
      claims: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'PerceptClaim' } } },
      norms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'NormTag' } } },
      threat: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            chance: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            sourceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
            aboutId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      advice: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              affordanceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              strength: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            },
          },
        },
      },
      demonstrates: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            skill: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            domain: { optional: false, shape: { kind: 'ref', name: 'LearningDomain' } },
          },
        },
      },
      consequences: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ReceivedConsequence' } },
      },
      withdrawConsequences: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              revision: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      witnesses: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'PersonId' } } },
      reports: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ReportedAccount' } },
      },
      prospect: { optional: true, shape: { kind: 'ref', name: 'Prospect' } },
      provenance: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  RoutineEntry: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      offer: { optional: false, shape: { kind: 'ref', name: 'Offer' } },
      chance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      received: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            percepts: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'PerceptData' } },
            },
          },
        },
      },
    },
  },
  RoutineDefinition: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      entries: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'RoutineEntry' } } },
    },
  },
  WordingSequence: {
    kind: 'object',
    fields: {
      rng: { optional: false, shape: { kind: 'ref', name: 'RngState' } },
      occurrence: { optional: false, shape: { kind: 'number' } },
      last: { optional: false, shape: { kind: 'number' } },
    },
  },
  Lexicon: {
    kind: 'object',
    fields: {
      voices: {
        optional: true,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'dict',
            key: { kind: 'string' },
            value: { kind: 'array', element: { kind: 'string' } },
          },
        },
      },
      wordings: {
        optional: true,
        shape: {
          kind: 'dict',
          key: { kind: 'string' },
          value: { kind: 'array', element: { kind: 'string' } },
        },
      },
      locale: { optional: true, shape: { kind: 'string' } },
      materialMeaning: { optional: true, shape: { kind: 'string' } },
      names: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'string' } },
      },
      roles: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'string' } },
      },
      prefer: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'name' },
            { kind: 'literal', value: 'role' },
          ],
        },
      },
      actions: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'object',
            fields: {
              base: { optional: true, shape: { kind: 'string' } },
              past: { optional: true, shape: { kind: 'string' } },
              gerund: { optional: true, shape: { kind: 'string' } },
            },
          },
        },
      },
    },
  },
  Source: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'host' } },
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'voice' } },
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'person' } },
          id: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'shelf' } },
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
    ],
  },
  Definitions: {
    kind: 'object',
    fields: {
      reputationTraits: {
        optional: true,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              affection: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
              trust: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
              respect: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            },
          },
        },
      },
      actions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActionDefinition' } },
      },
      norms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'SourcedNorm' } } },
      marriageCustoms: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'MarriageCustomData' } },
      },
      skills: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SkillDefinition' } },
      },
      skillTransfers: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              from: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              to: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              fraction: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            },
          },
        },
      },
      methods: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'MethodDefinition' } },
      },
      calendar: { optional: false, shape: { kind: 'ref', name: 'CalendarDefinition' } },
      routines: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'RoutineDefinition' } },
      },
      lexicon: { optional: false, shape: { kind: 'ref', name: 'Lexicon' } },
      sources: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Source' } } },
    },
  },
  RunTuning: {
    kind: 'object',
    fields: {
      planning: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            depth: {
              optional: true,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 2 },
                  { kind: 'literal', value: 3 },
                  { kind: 'literal', value: 4 },
                  { kind: 'literal', value: 5 },
                ],
              },
            },
            presentBias: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      assent: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            minStrength: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            pressure: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      doze: {
        optional: true,
        shape: { kind: 'object', fields: { hazardScale: { optional: true, shape: { kind: 'number' } } } },
      },
      crisis: {
        optional: true,
        shape: { kind: 'object', fields: { hazardScale: { optional: true, shape: { kind: 'number' } } } },
      },
      promptings: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            practiceHalfLifeDays: { optional: true, shape: { kind: 'number' } },
            echoRate: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
    },
  },
  EntityRef: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'entity' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  KinRole: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'parent' },
      { kind: 'literal', value: 'child' },
      { kind: 'literal', value: 'sibling' },
      { kind: 'literal', value: 'grandparent' },
      { kind: 'literal', value: 'grandchild' },
      { kind: 'literal', value: 'spouse' },
    ],
  },
  EvidenceRef: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'evidence' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  KinPremise: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      from: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
      to: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
      role: { optional: false, shape: { kind: 'ref', name: 'KinRole' } },
      basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
    },
  },
  KinScope: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      people: {
        optional: false,
        shape: {
          kind: 'tuple',
          elements: [
            { kind: 'ref', name: 'EntityRef' },
            { kind: 'ref', name: 'EntityRef' },
          ],
        },
      },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      kinRevision: { optional: false, shape: { kind: 'number' } },
      premiseIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      degrees: { optional: false, shape: { kind: 'literal', value: 'source-two-step' } },
      completeness: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'complete-for-source-degrees' },
            { kind: 'literal', value: 'partial' },
          ],
        },
      },
      basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
    },
  },
  InitialLifecycle: {
    kind: 'object',
    fields: {
      kinPremises: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'KinPremise' } },
      },
      kinScopes: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'KinScope' } } },
    },
  },
  WorldFact: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      subject: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      predicate: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      value: { optional: false, shape: { kind: 'scalar', name: 'Json' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      provenance: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            source: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
    },
  },
  WorldSnapshot: {
    kind: 'object',
    fields: {
      revision: { optional: false, shape: { kind: 'number' } },
      facts: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'WorldFact' } } },
      hostState: { optional: false, shape: { kind: 'scalar', name: 'Json' } },
    },
  },
  RunSpec: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      seed: { optional: false, shape: { kind: 'number' } },
      start: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      host: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            edition: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            schema: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      definitions: { optional: false, shape: { kind: 'ref', name: 'Definitions' } },
      tuning: { optional: true, shape: { kind: 'ref', name: 'RunTuning' } },
      lifecycle: { optional: false, shape: { kind: 'ref', name: 'InitialLifecycle' } },
      world: { optional: false, shape: { kind: 'ref', name: 'WorldSnapshot' } },
    },
  },
  LifeCourse: {
    kind: 'object',
    fields: {
      bornAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      sex: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'female' },
            { kind: 'literal', value: 'male' },
          ],
        },
      },
    },
  },
  Episode: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      kind: { optional: false, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      actorId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      summary: { optional: false, shape: { kind: 'string' } },
      addressedSummary: { optional: true, shape: { kind: 'string' } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      voiceId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      recalledAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  AuthoredEpisode: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      kind: { optional: false, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      actorId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      summary: { optional: false, shape: { kind: 'string' } },
      addressedSummary: { optional: true, shape: { kind: 'string' } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      voiceId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      recalledAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      basis: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
            author: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      provenance: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  TraitBasis: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'explicit-authoring' } },
          evidence: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'unknown-genetics-prior' } },
          prior: { optional: false, shape: { kind: 'literal', value: 'source-population-midpoint' } },
        },
      },
    ],
  },
  Traits: {
    kind: 'object',
    fields: {
      honesty: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      emotionality: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      extraversion: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      agreeableness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      conscientiousness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      openness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  DozeContext: {
    kind: 'object',
    fields: {
      posture: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'upright' },
            { kind: 'literal', value: 'seated' },
            { kind: 'literal', value: 'reclined' },
          ],
        },
      },
      stimulation: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  BladderState: {
    kind: 'object',
    fields: {
      fill: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      pending: { optional: false, shape: { kind: 'number' } },
    },
  },
  InjuryEvidence: {
    kind: 'object',
    fields: {
      part: { optional: false, shape: { kind: 'string' } },
      severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      healRatePerDay: { optional: false, shape: { kind: 'number' } },
      affects: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            moving: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            manipulation: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            sight: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      bleeding: { optional: true, shape: { kind: 'number' } },
    },
  },
  IllnessEvidence: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      trendPerDay: { optional: false, shape: { kind: 'number' } },
      contagious: { optional: false, shape: { kind: 'boolean' } },
      chronic: { optional: true, shape: { kind: 'boolean' } },
      baseline: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      aggravatedBy: { optional: true, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  InitialBody: {
    kind: 'object',
    fields: {
      satiety: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      hydration: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      sleepPressure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      exertion: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      fitness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      health: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      pain: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      sleepDebtHours: { optional: false, shape: { kind: 'number' } },
      depletion: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      circadianPeakMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      asleep: { optional: false, shape: { kind: 'boolean' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      doze: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            context: { optional: false, shape: { kind: 'ref', name: 'DozeContext' } },
            basis: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
                  author: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                  at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  validUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
                },
              },
            },
          },
        },
      },
      bladder: { optional: false, shape: { kind: 'ref', name: 'BladderState' } },
      injuries: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              part: { optional: false, shape: { kind: 'string' } },
              severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              healRatePerDay: { optional: false, shape: { kind: 'number' } },
              affects: {
                optional: true,
                shape: {
                  kind: 'object',
                  fields: {
                    moving: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
                    manipulation: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
                    sight: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
                  },
                },
              },
              bleeding: { optional: true, shape: { kind: 'number' } },
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              tendedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      illnesses: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              trendPerDay: { optional: false, shape: { kind: 'number' } },
              contagious: { optional: false, shape: { kind: 'boolean' } },
              chronic: { optional: true, shape: { kind: 'boolean' } },
              baseline: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
              aggravatedBy: {
                optional: true,
                shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
              },
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      exposures: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              agent: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              recent: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              cumulative: { optional: false, shape: { kind: 'number' } },
              lastAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      downed: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            reason: { optional: false, shape: { kind: 'string' } },
            until: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
    },
  },
  NeedReservoirs: {
    kind: 'object',
    fields: {
      safety: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      belonging: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      esteem: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      autonomy: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      competence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      leisure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      meaning: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  InitialNeeds: { kind: 'ref', name: 'NeedReservoirs' },
  InitialSkill: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      practicedMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      lastPracticed: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  HeldNorm: {
    kind: 'object',
    fields: {
      normId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      standing: { optional: false, shape: { kind: 'ref', name: 'NormStanding' } },
      conviction: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
    },
  },
  BeliefProvenance: {
    kind: 'object',
    fields: {
      origin: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      firstFrom: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      lineage: { optional: true, shape: { kind: 'string' } },
    },
  },
  Belief: {
    kind: 'object',
    fields: {
      prop: { optional: false, shape: { kind: 'string' } },
      logOdds: { optional: false, shape: { kind: 'number' } },
      updatedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      sources: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
              value: { optional: false, shape: { kind: 'boolean' } },
            },
          },
        },
      },
      provenance: { optional: true, shape: { kind: 'ref', name: 'BeliefProvenance' } },
    },
  },
  InitialBelief: { kind: 'ref', name: 'Belief' },
  AuthoredConsequences: {
    kind: 'object',
    fields: {
      sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      claims: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ReceivedConsequence' } },
      },
      withdrawals: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              revision: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      basis: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
            author: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            evidence: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
          },
        },
      },
    },
  },
  InitialSourceTrust: {
    kind: 'object',
    fields: {
      sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      trust: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  Knowledge$70: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'known' } },
          value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          evidenceIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'prior' } },
          value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          basis: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: { kind: { optional: false, shape: { kind: 'literal', value: 'unobserved' } } },
      },
    ],
  },
  Relationship: {
    kind: 'object',
    fields: {
      otherId: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      affection: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      trust: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      respect: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      familiarity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      roles: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      ledger: { optional: false, shape: { kind: 'number' } },
      lastInteraction: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      deceasedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      groups: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  InitialRelationship: { kind: 'ref', name: 'Relationship' },
  InitialVoice: {
    kind: 'object',
    fields: {
      voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      trust: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  Knowledge$76: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'known' } },
          value: { optional: false, shape: { kind: 'boolean' } },
          evidenceIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'prior' } },
          value: { optional: false, shape: { kind: 'boolean' } },
          basis: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: { kind: { optional: false, shape: { kind: 'literal', value: 'unobserved' } } },
      },
    ],
  },
  ExemptionPremises: {
    kind: 'object',
    fields: {
      traveling: { optional: false, shape: { kind: 'ref', name: 'Knowledge$76' } },
      illnessSeverity: { optional: false, shape: { kind: 'ref', name: 'Knowledge$70' } },
      validUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Values: {
    kind: 'object',
    fields: {
      benevolence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      universalism: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      tradition: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      conformity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      security: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      achievement: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      power: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      hedonism: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      stimulation: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      selfDirection: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  ValueId: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'benevolence' },
      { kind: 'literal', value: 'universalism' },
      { kind: 'literal', value: 'tradition' },
      { kind: 'literal', value: 'conformity' },
      { kind: 'literal', value: 'security' },
      { kind: 'literal', value: 'achievement' },
      { kind: 'literal', value: 'power' },
      { kind: 'literal', value: 'hedonism' },
      { kind: 'literal', value: 'stimulation' },
      { kind: 'literal', value: 'selfDirection' },
    ],
  },
  Goal: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: false, shape: { kind: 'string' } },
      serves: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'union',
            options: [
              { kind: 'ref', name: 'NeedId' },
              { kind: 'ref', name: 'ValueId' },
            ],
          },
        },
      },
      progress: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      advancedBy: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              amount: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      importance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'active' },
            { kind: 'literal', value: 'achieved' },
            { kind: 'literal', value: 'abandoned' },
          ],
        },
      },
      adoptedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      deadline: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      completionHalfLifeMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      lastAdvancedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      baseImportance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      project: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            peak: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
    },
  },
  GoalData: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: false, shape: { kind: 'string' } },
      serves: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'union',
            options: [
              { kind: 'ref', name: 'NeedId' },
              { kind: 'ref', name: 'ValueId' },
            ],
          },
        },
      },
      progress: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      advancedBy: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              amount: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      importance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      deadline: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      completionHalfLifeMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      baseImportance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      project: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            peak: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
    },
  },
  PrecommitmentData: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      bias: { optional: false, shape: { kind: 'number' } },
      fromMsOfDay: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      toMsOfDay: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
    },
  },
  OwedMakeUp: {
    kind: 'object',
    fields: {
      ofId: { optional: false, shape: { kind: 'string' } },
      normId: { optional: true, shape: { kind: 'string' } },
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'promise' },
            { kind: 'literal', value: 'duty' },
            { kind: 'literal', value: 'appointment' },
            { kind: 'literal', value: 'worship' },
            { kind: 'literal', value: 'job' },
            { kind: 'literal', value: 'abstain' },
          ],
        },
      },
      violatedBy: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
      actions: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      reason: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'illness' },
            { kind: 'literal', value: 'travel' },
            { kind: 'literal', value: 'necessity' },
            { kind: 'ref', name: 'MissedExcuse' },
            { kind: 'literal', value: 'missed' },
            { kind: 'literal', value: 'broken' },
          ],
        },
      },
      lapseSince: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      label: { optional: true, shape: { kind: 'string' } },
      scheduledAs: { optional: true, shape: { kind: 'string' } },
    },
  },
  InitialAgenda: {
    kind: 'object',
    fields: {
      exemptions: { optional: false, shape: { kind: 'ref', name: 'ExemptionPremises' } },
      commitments: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'CommitmentData' } },
      },
      goals: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'GoalData' } } },
      precommitments: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PrecommitmentData' } },
      },
      owed: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'OwedMakeUp' } } },
    },
  },
  TimeSpan: {
    kind: 'object',
    fields: {
      from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      to: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ActorRef: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'actor' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
    },
  },
  KnownFather: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'identified' } },
      entity: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
    },
  },
  Father: {
    kind: 'union',
    options: [
      { kind: 'ref', name: 'KnownFather' },
      { kind: 'object', fields: { kind: { optional: false, shape: { kind: 'literal', value: 'unknown' } } } },
    ],
  },
  Pregnancy: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      mother: { optional: false, shape: { kind: 'ref', name: 'ActorRef' } },
      father: { optional: false, shape: { kind: 'ref', name: 'Father' } },
      offspring: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
      conceivedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      dueAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      basis: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
                evidence: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'derived-gestation' } },
                conceptionInput: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
                stream: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          ],
        },
      },
    },
  },
  InitialFamily: {
    kind: 'object',
    fields: {
      contactCovered: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'TimeSpan' } },
      },
      aptitudes: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'number' } },
      },
      attachment: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      pregnancy: { optional: true, shape: { kind: 'ref', name: 'Pregnancy' } },
      raisedMs: { optional: true, shape: { kind: 'scalar', name: 'DurationMs' } },
    },
  },
  StateCue: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'fatigue' },
      { kind: 'literal', value: 'pain' },
      { kind: 'literal', value: 'fear' },
      { kind: 'literal', value: 'mood' },
    ],
  },
  Reserve: {
    kind: 'object',
    fields: {
      fatigue: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      pain: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      fear: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      mood: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  Retention: {
    kind: 'object',
    fields: {
      trace: { optional: false, shape: { kind: 'number' } },
      chronicleDays: { optional: false, shape: { kind: 'number' } },
    },
  },
  Habit: {
    kind: 'object',
    fields: {
      cue: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            hour: { optional: true, shape: { kind: 'number' } },
            placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
            after: { optional: true, shape: { kind: 'string' } },
          },
        },
      },
      action: { optional: false, shape: { kind: 'string' } },
      strength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      repetitions: { optional: false, shape: { kind: 'number' } },
      lastAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      withheld: { optional: true, shape: { kind: 'number' } },
      lastWithheldAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      craving: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  ActionExpectation: {
    kind: 'object',
    fields: {
      key: { optional: false, shape: { kind: 'string' } },
      needs: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            food: { optional: true, shape: { kind: 'number' } },
            water: { optional: true, shape: { kind: 'number' } },
            sleep: { optional: true, shape: { kind: 'number' } },
            rest: { optional: true, shape: { kind: 'number' } },
            relief: { optional: true, shape: { kind: 'number' } },
            safety: { optional: true, shape: { kind: 'number' } },
            belonging: { optional: true, shape: { kind: 'number' } },
            esteem: { optional: true, shape: { kind: 'number' } },
            autonomy: { optional: true, shape: { kind: 'number' } },
            competence: { optional: true, shape: { kind: 'number' } },
            leisure: { optional: true, shape: { kind: 'number' } },
            meaning: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
      successRate: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      samples: { optional: false, shape: { kind: 'number' } },
      valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
    },
  },
  EmotionId: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'joy' },
      { kind: 'literal', value: 'distress' },
      { kind: 'literal', value: 'hope' },
      { kind: 'literal', value: 'fear' },
      { kind: 'literal', value: 'relief' },
      { kind: 'literal', value: 'disappointment' },
      { kind: 'literal', value: 'pride' },
      { kind: 'literal', value: 'shame' },
      { kind: 'literal', value: 'gratitude' },
      { kind: 'literal', value: 'anger' },
      { kind: 'literal', value: 'guilt' },
      { kind: 'literal', value: 'love' },
      { kind: 'literal', value: 'grief' },
      { kind: 'literal', value: 'awe' },
      { kind: 'literal', value: 'boredom' },
      { kind: 'literal', value: 'loneliness' },
    ],
  },
  Emotion: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'ref', name: 'EmotionId' } },
      intensity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      cause: { optional: false, shape: { kind: 'string' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      halfLifeMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
    },
  },
  InitialAffect: {
    kind: 'object',
    fields: {
      mood: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            arousal: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      regulation: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      emotions: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Emotion' } } },
    },
  },
  PromptingReading: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'whisper' },
      { kind: 'literal', value: 'inclination' },
      { kind: 'literal', value: 'intrusion' },
      { kind: 'literal', value: 'fault' },
      { kind: 'literal', value: 'none' },
    ],
  },
  PromptingResponseKind: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'refuge' },
      { kind: 'literal', value: 'redirect' },
      { kind: 'literal', value: 'leave' },
    ],
  },
  PromptingResponse: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      kind: { optional: false, shape: { kind: 'ref', name: 'PromptingResponseKind' } },
      practice: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      lastUsedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      cue: { optional: true, shape: { kind: 'string' } },
    },
  },
  InitialPromptings: {
    kind: 'object',
    fields: {
      reading: { optional: false, shape: { kind: 'ref', name: 'PromptingReading' } },
      readingSource: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      responses: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PromptingResponse' } },
      },
    },
  },
  ReviewStyle: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'accounting' },
      { kind: 'literal', value: 'ruminating' },
      { kind: 'literal', value: 'none' },
    ],
  },
  InitialReview: {
    kind: 'object',
    fields: {
      style: { optional: false, shape: { kind: 'ref', name: 'ReviewStyle' } },
      styleSource: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      atMsOfDay: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
    },
  },
  Courtship: {
    kind: 'object',
    fields: {
      withId: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      warmth: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      appeal: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      meetings: { optional: false, shape: { kind: 'number' } },
      lastAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      engagedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Marriage: {
    kind: 'object',
    fields: {
      spouseId: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      endedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      end: { optional: true, shape: { kind: 'literal', value: 'widowed' } },
      mourningDays: { optional: true, shape: { kind: 'number' } },
    },
  },
  InitialBonds: {
    kind: 'object',
    fields: {
      courtships: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Courtship' } } },
      marriages: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Marriage' } } },
      mourning: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            forId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
    },
  },
  AuthoredPersonState: {
    kind: 'object',
    fields: {
      traits: { optional: false, shape: { kind: 'ref', name: 'Traits' } },
      body: { optional: false, shape: { kind: 'ref', name: 'InitialBody' } },
      needs: { optional: false, shape: { kind: 'ref', name: 'InitialNeeds' } },
      skills: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'InitialSkill' } } },
      heldNorms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'HeldNorm' } } },
      beliefs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'InitialBelief' } } },
      consequences: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'AuthoredConsequences' } },
      },
      sourceTrust: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'InitialSourceTrust' } },
      },
      context: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            scarcity: { optional: false, shape: { kind: 'ref', name: 'Knowledge$70' } },
            smoking: { optional: false, shape: { kind: 'ref', name: 'Knowledge$70' } },
          },
        },
      },
      relationships: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'InitialRelationship' } },
      },
      voices: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'InitialVoice' } } },
      agenda: { optional: false, shape: { kind: 'ref', name: 'InitialAgenda' } },
      family: { optional: false, shape: { kind: 'ref', name: 'InitialFamily' } },
      groups: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      values: { optional: false, shape: { kind: 'ref', name: 'Values' } },
      reserve: { optional: false, shape: { kind: 'ref', name: 'Reserve' } },
      retention: { optional: false, shape: { kind: 'ref', name: 'Retention' } },
      habits: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Habit' } } },
      expectations: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActionExpectation' } },
      },
      affect: { optional: false, shape: { kind: 'ref', name: 'InitialAffect' } },
      promptings: { optional: false, shape: { kind: 'ref', name: 'InitialPromptings' } },
      review: { optional: false, shape: { kind: 'ref', name: 'InitialReview' } },
      bonds: { optional: false, shape: { kind: 'ref', name: 'InitialBonds' } },
    },
  },
  ReferenceKind: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'person' },
      { kind: 'literal', value: 'entity' },
      { kind: 'literal', value: 'action' },
      { kind: 'literal', value: 'skill' },
      { kind: 'literal', value: 'norm' },
      { kind: 'literal', value: 'voice' },
      { kind: 'literal', value: 'place' },
      { kind: 'literal', value: 'commitment' },
      { kind: 'literal', value: 'chain' },
      { kind: 'literal', value: 'goal' },
      { kind: 'literal', value: 'prospect' },
      { kind: 'literal', value: 'episode' },
      { kind: 'literal', value: 'gist' },
      { kind: 'literal', value: 'method' },
      { kind: 'literal', value: 'evidence' },
      { kind: 'literal', value: 'pregnancy' },
      { kind: 'literal', value: 'construction-stream' },
      { kind: 'literal', value: 'kin-premise' },
      { kind: 'literal', value: 'kin-scope' },
      { kind: 'literal', value: 'proposal' },
      { kind: 'literal', value: 'tag' },
      { kind: 'literal', value: 'input' },
      { kind: 'literal', value: 'request' },
      { kind: 'literal', value: 'effect' },
      { kind: 'literal', value: 'breach' },
      { kind: 'literal', value: 'response' },
      { kind: 'literal', value: 'resolve' },
      { kind: 'literal', value: 'context' },
      { kind: 'literal', value: 'marriage-custom' },
      { kind: 'literal', value: 'proposition' },
      { kind: 'literal', value: 'advice' },
      { kind: 'literal', value: 'deed' },
      { kind: 'literal', value: 'receipt' },
    ],
  },
  Reference: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'ref', name: 'ReferenceKind' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  ReferenceBinding: {
    kind: 'object',
    fields: {
      source: { optional: false, shape: { kind: 'ref', name: 'Reference' } },
      target: { optional: false, shape: { kind: 'ref', name: 'Reference' } },
    },
  },
  ProjectionExclusion: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          reference: { optional: false, shape: { kind: 'ref', name: 'Reference' } },
          reason: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'host-local' },
                { kind: 'literal', value: 'runtime-derived' },
                { kind: 'literal', value: 'not-selected' },
                { kind: 'literal', value: 'unsupported-health' },
                { kind: 'literal', value: 'unsupported-temporal-bond' },
                { kind: 'literal', value: 'unresolved-action' },
              ],
            },
          },
          requiredForAdmission: { optional: false, shape: { kind: 'boolean' } },
        },
      },
      {
        kind: 'object',
        fields: {
          slice: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'body-arrival' },
                { kind: 'literal', value: 'needs' },
                { kind: 'literal', value: 'affect' },
                { kind: 'literal', value: 'ambient' },
                { kind: 'literal', value: 'context' },
                { kind: 'literal', value: 'history' },
                { kind: 'literal', value: 'continuation' },
              ],
            },
          },
          reason: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'host-local' },
                { kind: 'literal', value: 'runtime-derived' },
                { kind: 'literal', value: 'not-selected' },
              ],
            },
          },
          requiredForAdmission: { optional: false, shape: { kind: 'boolean' } },
        },
      },
    ],
  },
  PersonaMapping: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      sourceHost: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      targetHost: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      references: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ReferenceBinding' } },
      },
      episodes: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              sourceEpisodeId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              targetEpisodeId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              action: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              actorId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              targetId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              placeId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              voiceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              tags: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
            },
          },
        },
      },
      commitments: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              sourceCommitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              targetCommitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              actions: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
              toId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              targetId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              normId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              chain: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      exclusions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ProjectionExclusion' } },
      },
    },
  },
  CalendarMapping: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      source: { optional: false, shape: { kind: 'ref', name: 'CalendarDefinition' } },
      target: { optional: false, shape: { kind: 'ref', name: 'CalendarDefinition' } },
      offsetMs: { optional: false, shape: { kind: 'number' } },
      references: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ReferenceBinding' } },
      },
      windows: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              sourceCommitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              targetCommitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              source: { optional: false, shape: { kind: 'ref', name: 'TimeSpan' } },
              target: { optional: false, shape: { kind: 'ref', name: 'TimeSpan' } },
            },
          },
        },
      },
      sourceNorms: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SourcedNorm' } },
      },
      targetNorms: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SourcedNorm' } },
      },
    },
  },
  RngState: {
    kind: 'object',
    fields: {
      a: { optional: false, shape: { kind: 'number' } },
      b: { optional: false, shape: { kind: 'number' } },
      c: { optional: false, shape: { kind: 'number' } },
      d: { optional: false, shape: { kind: 'number' } },
    },
  },
  ActorRandomIdentity: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      seed: { optional: false, shape: { kind: 'number' } },
      uniformDraws: { optional: false, shape: { kind: 'number' } },
      initializationDraws: { optional: false, shape: { kind: 'literal', value: 12 } },
      origin: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            runSeed: { optional: false, shape: { kind: 'number' } },
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          },
        },
      },
    },
  },
  FamilyState: {
    kind: 'object',
    fields: {
      contactCovered: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'TimeSpan' } },
      },
      aptitudes: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'number' } },
      },
      pregnancy: { optional: true, shape: { kind: 'ref', name: 'Pregnancy' } },
      attachment: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      raisedMs: { optional: true, shape: { kind: 'scalar', name: 'DurationMs' } },
    },
  },
  BondsState: {
    kind: 'object',
    fields: {
      courtships: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Courtship' } } },
      marriages: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Marriage' } } },
      mourning: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            forId: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
    },
  },
  GeneticOrigin: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'two-parent-derived' } },
          parents: {
            optional: false,
            shape: {
              kind: 'tuple',
              elements: [
                { kind: 'ref', name: 'EntityRef' },
                { kind: 'ref', name: 'EntityRef' },
              ],
            },
          },
          parentSnapshotHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
          inheritanceStream: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
    ],
  },
  StreamIdentity: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'actor' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'gestation' } },
          mother: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          pregnancyId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'inheritance' } },
          child: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
    ],
  },
  RandomContinuation: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      identity: { optional: false, shape: { kind: 'ref', name: 'StreamIdentity' } },
      origin: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            runSeed: { optional: false, shape: { kind: 'number' } },
            identity: { optional: false, shape: { kind: 'ref', name: 'StreamIdentity' } },
          },
        },
      },
      seed: { optional: false, shape: { kind: 'number' } },
      state: { optional: false, shape: { kind: 'ref', name: 'RngState' } },
      uniformDraws: { optional: false, shape: { kind: 'number' } },
      initializationDraws: { optional: false, shape: { kind: 'literal', value: 12 } },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'active' },
            { kind: 'literal', value: 'completed' },
          ],
        },
      },
    },
  },
  ConstructionContinuation: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      seed: { optional: false, shape: { kind: 'number' } },
      state: { optional: false, shape: { kind: 'ref', name: 'RngState' } },
      uniformDraws: { optional: false, shape: { kind: 'number' } },
      initializationDraws: { optional: false, shape: { kind: 'literal', value: 12 } },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'active' },
            { kind: 'literal', value: 'completed' },
          ],
        },
      },
      identity: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'gestation' } },
                mother: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                pregnancyId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'inheritance' } },
                child: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
              },
            },
          ],
        },
      },
      origin: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            runSeed: { optional: false, shape: { kind: 'number' } },
            identity: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  {
                    kind: 'object',
                    fields: {
                      kind: { optional: false, shape: { kind: 'literal', value: 'gestation' } },
                      mother: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                      pregnancyId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                    },
                  },
                  {
                    kind: 'object',
                    fields: {
                      kind: { optional: false, shape: { kind: 'literal', value: 'inheritance' } },
                      child: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  LifecycleArchive: {
    kind: 'object',
    fields: {
      kinRevision: { optional: false, shape: { kind: 'number' } },
      entities: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'EntityRef' } } },
      origins: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
              origin: { optional: false, shape: { kind: 'ref', name: 'GeneticOrigin' } },
            },
          },
        },
      },
      kinPremises: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'KinPremise' } },
      },
      kinScopes: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'KinScope' } } },
      streams: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ConstructionContinuation' } },
      },
      appliedEffects: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  PortableLifecycle: {
    kind: 'object',
    fields: {
      entities: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'EntityRef' } } },
      origins: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
              origin: { optional: false, shape: { kind: 'ref', name: 'GeneticOrigin' } },
            },
          },
        },
      },
      kinPremises: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'KinPremise' } },
      },
      kinScopes: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'KinScope' } } },
      streams: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ConstructionContinuation' } },
      },
      sourceKinRevision: { optional: false, shape: { kind: 'number' } },
    },
  },
  Skill: {
    kind: 'object',
    fields: {
      level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      practicedMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      lastPracticed: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ConscienceState: {
    kind: 'object',
    fields: {
      norms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'HeldNorm' } } },
      breaches: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              normId: { optional: false, shape: { kind: 'string' } },
              at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              victimId: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
              weight: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              repaired: { optional: false, shape: { kind: 'boolean' } },
            },
          },
        },
      },
      nextBreach: { optional: false, shape: { kind: 'number' } },
      intentions: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              action: { optional: false, shape: { kind: 'string' } },
              intention: { optional: false, shape: { kind: 'string' } },
            },
          },
        },
      },
    },
  },
  PortableObligation: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'commitment' } },
          commitment: { optional: false, shape: { kind: 'ref', name: 'Commitment' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'owed' } },
          owed: { optional: false, shape: { kind: 'ref', name: 'OwedMakeUp' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'lapse' } },
          since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          missed: { optional: false, shape: { kind: 'number' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'breach' } },
          breach: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                id: { optional: false, shape: { kind: 'string' } },
                normId: { optional: false, shape: { kind: 'string' } },
                at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                victimId: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
                weight: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                repaired: { optional: false, shape: { kind: 'boolean' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'goal' } },
          goalId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
    ],
  },
  CharacterState: {
    kind: 'object',
    fields: {
      baseTraits: { optional: false, shape: { kind: 'ref', name: 'Traits' } },
      baseValues: { optional: false, shape: { kind: 'ref', name: 'Values' } },
      year: { optional: false, shape: { kind: 'number' } },
      acc: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            days: { optional: false, shape: { kind: 'number' } },
            mood: { optional: false, shape: { kind: 'number' } },
            kept: { optional: false, shape: { kind: 'number' } },
            broken: { optional: false, shape: { kind: 'number' } },
            socialMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            variety: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      agedTo: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      experience: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            honesty: { optional: true, shape: { kind: 'number' } },
            emotionality: { optional: true, shape: { kind: 'number' } },
            extraversion: { optional: true, shape: { kind: 'number' } },
            agreeableness: { optional: true, shape: { kind: 'number' } },
            conscientiousness: { optional: true, shape: { kind: 'number' } },
            openness: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
    },
  },
  VoiceTrustEvent: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      delta: { optional: false, shape: { kind: 'number' } },
      reason: { optional: false, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      from: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      count: { optional: true, shape: { kind: 'number' } },
    },
  },
  VoiceRelation: {
    kind: 'object',
    fields: {
      voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      trust: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      pressure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      accepted: { optional: false, shape: { kind: 'number' } },
      refused: { optional: false, shape: { kind: 'number' } },
      history: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'VoiceTrustEvent' } },
      },
      seeded: { optional: true, shape: { kind: 'boolean' } },
      credited: {
        optional: true,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              action: { optional: false, shape: { kind: 'string' } },
              n: { optional: false, shape: { kind: 'number' } },
              at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      lastWornAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Gist: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      kind: { optional: false, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      actorId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      summary: { optional: false, shape: { kind: 'string' } },
      addressedSummary: { optional: true, shape: { kind: 'string' } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      voiceId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      recalledAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      count: { optional: false, shape: { kind: 'number' } },
      firstAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      lastAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      weight: { optional: false, shape: { kind: 'number' } },
      peak: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  NotedContradiction: {
    kind: 'object',
    fields: {
      sourceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      prop: { optional: false, shape: { kind: 'string' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      weight: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  MethodCue: {
    kind: 'object',
    fields: {
      cue: { optional: false, shape: { kind: 'string' } },
      value: { optional: false, shape: { kind: 'string' } },
    },
  },
  MethodRule: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      action: { optional: false, shape: { kind: 'string' } },
      conditions: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'MethodCue' } } },
      evidence: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              sourceId: { optional: false, shape: { kind: 'string' } },
              at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              attention: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              outcome: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'success' },
                    { kind: 'literal', value: 'failure' },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  MethodsState: {
    kind: 'object',
    fields: {
      rules: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'MethodRule' } } },
      recentDemonstrations: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      context: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'string' } },
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            cues: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'MethodCue' } } },
          },
        },
      },
    },
  },
  RetainedConsequence: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      revision: { optional: false, shape: { kind: 'number' } },
      trigger: { optional: false, shape: { kind: 'ref', name: 'ConsequenceAction' } },
      successor: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            action: { optional: false, shape: { kind: 'string' } },
            targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
            placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
            durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
            effort: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            focus: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            materialCost: { optional: true, shape: { kind: 'number' } },
            diminishes: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
            advances: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
          },
        },
      },
      availableFrom: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      availableUntil: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      expiresAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      chance: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      confidence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      sourceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      channel: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'told' },
            { kind: 'literal', value: 'known' },
          ],
        },
      },
      receivedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      triggeredAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ConsequenceRevision: {
    kind: 'object',
    fields: {
      sourceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      id: { optional: false, shape: { kind: 'string' } },
      revision: { optional: false, shape: { kind: 'number' } },
      receivedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ProspectionState: {
    kind: 'object',
    fields: {
      entries: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'RetainedConsequence' } },
      },
      revisions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ConsequenceRevision' } },
      },
    },
  },
  ProjectContributionReceipt: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      goalId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      amount: { optional: false, shape: { kind: 'number' } },
      basis: { optional: false, shape: { kind: 'literal', value: 'completed-action' } },
    },
  },
  ProjectHistory: {
    kind: 'object',
    fields: {
      prospectId: { optional: false, shape: { kind: 'string' } },
      goalId: { optional: false, shape: { kind: 'string' } },
      adoptedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      outcome: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'achieved' },
            { kind: 'literal', value: 'abandoned' },
          ],
        },
      },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ProjectsState: {
    kind: 'object',
    fields: {
      contributions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ProjectContributionReceipt' } },
      },
      setbacks: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              targetId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              placeId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
            },
          },
        },
      },
      pendingAct: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            targetId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
            placeId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            completedReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            readings: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                    progress: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                    evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                  },
                },
              },
            },
          },
        },
      },
      prospects: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              label: { optional: false, shape: { kind: 'string' } },
              kind: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'make' },
                    { kind: 'literal', value: 'arrange' },
                    { kind: 'literal', value: 'gather' },
                    { kind: 'literal', value: 'finish' },
                  ],
                },
              },
              placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
              materialIds: {
                optional: true,
                shape: { kind: 'array', element: { kind: 'ref', name: 'EntityId' } },
              },
              progress: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
              lastSeenAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      history: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ProjectHistory' } },
      },
      lastAdoptedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      lastAbandonedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      currentGoalId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  Pursuit: {
    kind: 'object',
    fields: {
      goalId: { optional: false, shape: { kind: 'string' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      lastServedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      strength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  PursuitState: {
    kind: 'object',
    fields: {
      current: { optional: true, shape: { kind: 'ref', name: 'Pursuit' } },
      rested: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            goalId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
    },
  },
  PortableMotivation: {
    kind: 'object',
    fields: {
      exemptions: { optional: false, shape: { kind: 'ref', name: 'ExemptionPremises' } },
      goals: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Goal' } } },
      projects: { optional: false, shape: { kind: 'ref', name: 'ProjectsState' } },
      pursuit: { optional: false, shape: { kind: 'ref', name: 'PursuitState' } },
      agendaAllocation: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            nextId: { optional: false, shape: { kind: 'number' } },
            lastProposalDay: { optional: false, shape: { kind: 'number' } },
            allocated: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'Reference' } },
            },
          },
        },
      },
    },
  },
  ChronicleCommitmentNote: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      kind: { optional: false, shape: { kind: 'string' } },
      label: { optional: true, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      toId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      prompted: { optional: true, shape: { kind: 'boolean' } },
      voiceId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
    },
  },
  ChronicleActionTally: {
    kind: 'object',
    fields: {
      action: { optional: false, shape: { kind: 'string' } },
      done: { optional: false, shape: { kind: 'number' } },
      prompted: { optional: false, shape: { kind: 'number' } },
      by: { optional: false, shape: { kind: 'dict', key: { kind: 'string' }, value: { kind: 'number' } } },
    },
  },
  SuggestionVerdict: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'assented' },
      { kind: 'literal', value: 'complied' },
      { kind: 'literal', value: 'deferred' },
      { kind: 'literal', value: 'modified' },
      { kind: 'literal', value: 'refused' },
      { kind: 'literal', value: 'commanded' },
    ],
  },
  RefusalKind: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'cannot' },
      { kind: 'literal', value: 'notNow' },
      { kind: 'literal', value: 'willNot' },
    ],
  },
  ChronicleVerdictTally: {
    kind: 'object',
    fields: {
      voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      verdict: { optional: false, shape: { kind: 'ref', name: 'SuggestionVerdict' } },
      kind: { optional: true, shape: { kind: 'ref', name: 'RefusalKind' } },
      reason: { optional: false, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      count: { optional: false, shape: { kind: 'number' } },
    },
  },
  ChronicleState: {
    kind: 'object',
    fields: {
      habits: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'scalar', name: 'Unit' } },
      },
      trust: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'string' }, value: { kind: 'scalar', name: 'Unit' } },
      },
      illnesses: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'object',
            fields: {
              kind: { optional: false, shape: { kind: 'string' } },
              severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            },
          },
        },
      },
      openBreaches: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  DayRecord: {
    kind: 'object',
    fields: {
      day: { optional: false, shape: { kind: 'number' } },
      kept: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleCommitmentNote' } },
      },
      broken: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleCommitmentNote' } },
      },
      released: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleCommitmentNote' } },
      },
      keptByKind: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            promise: { optional: true, shape: { kind: 'number' } },
            duty: { optional: true, shape: { kind: 'number' } },
            appointment: { optional: true, shape: { kind: 'number' } },
            worship: { optional: true, shape: { kind: 'number' } },
            job: { optional: true, shape: { kind: 'number' } },
            abstain: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
      brokenByKind: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            promise: { optional: true, shape: { kind: 'number' } },
            duty: { optional: true, shape: { kind: 'number' } },
            appointment: { optional: true, shape: { kind: 'number' } },
            worship: { optional: true, shape: { kind: 'number' } },
            job: { optional: true, shape: { kind: 'number' } },
            abstain: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
      prayers: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            kept: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
            missed: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
            prompted: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
          },
        },
      },
      actions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleActionTally' } },
      },
      habits: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              key: { optional: false, shape: { kind: 'string' } },
              action: { optional: false, shape: { kind: 'string' } },
              from: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              to: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              direction: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'up' },
                    { kind: 'literal', value: 'down' },
                  ],
                },
              },
            },
          },
        },
      },
      trust: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
              from: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              to: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              delta: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      episodes: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              summary: { optional: false, shape: { kind: 'string' } },
              valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
              salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              action: { optional: true, shape: { kind: 'string' } },
              targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
            },
          },
        },
      },
      breaches: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              normId: { optional: false, shape: { kind: 'string' } },
              victimId: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
            },
          },
        },
      },
      repairs: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              normId: { optional: false, shape: { kind: 'string' } },
              victimId: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
            },
          },
        },
      },
      material: { optional: false, shape: { kind: 'number' } },
      illness: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            onset: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
            recovered: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
            worse: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
            better: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
          },
        },
      },
      mood: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      verdicts: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleVerdictTally' } },
      },
      decisions: { optional: false, shape: { kind: 'number' } },
      alive: { optional: false, shape: { kind: 'boolean' } },
      state: { optional: true, shape: { kind: 'ref', name: 'ChronicleState' } },
    },
  },
  ChronicleDay: {
    kind: 'object',
    fields: {
      day: { optional: false, shape: { kind: 'number' } },
      baseline: { optional: false, shape: { kind: 'ref', name: 'ChronicleState' } },
      kept: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleCommitmentNote' } },
      },
      broken: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleCommitmentNote' } },
      },
      released: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleCommitmentNote' } },
      },
      actions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleActionTally' } },
      },
      verdicts: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicleVerdictTally' } },
      },
      material: { optional: false, shape: { kind: 'number' } },
      moodSum: { optional: false, shape: { kind: 'number' } },
      moodSamples: { optional: false, shape: { kind: 'number' } },
      socialMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      decisions: { optional: false, shape: { kind: 'number' } },
    },
  },
  StandingAdvice: {
    kind: 'object',
    fields: {
      adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      sourceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      action: { optional: false, shape: { kind: 'string' } },
      affordanceId: { optional: true, shape: { kind: 'string' } },
      strength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Command: {
    kind: 'object',
    fields: {
      voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      affordanceId: { optional: true, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      repeat: { optional: true, shape: { kind: 'boolean' } },
    },
  },
  WillState: {
    kind: 'object',
    fields: {
      voices: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'VoiceRelation' } } },
      precommitments: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PrecommitmentData' } },
      },
      switchMargin: { optional: false, shape: { kind: 'number' } },
      temperature: { optional: false, shape: { kind: 'number' } },
      advice: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'StandingAdvice' } } },
      command: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
            affordanceId: { optional: true, shape: { kind: 'string' } },
            action: { optional: true, shape: { kind: 'string' } },
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            repeat: { optional: true, shape: { kind: 'boolean' } },
            startedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            chargedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            margin: { optional: false, shape: { kind: 'number' } },
            obeyed: { optional: true, shape: { kind: 'boolean' } },
            remembered: { optional: true, shape: { kind: 'boolean' } },
          },
        },
      },
      lastCommand: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            endedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            reason: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
    },
  },
  PromptingRecord: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      action: { optional: false, shape: { kind: 'string' } },
      affordanceId: { optional: false, shape: { kind: 'string' } },
      source: { optional: false, shape: { kind: 'string' } },
      opposedBy: { optional: false, shape: { kind: 'string' } },
      outcome: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'passed' },
            { kind: 'literal', value: 'turned' },
            { kind: 'literal', value: 'assented' },
          ],
        },
      },
      responseId: { optional: true, shape: { kind: 'string' } },
    },
  },
  PromptingsState: {
    kind: 'object',
    fields: {
      reading: { optional: false, shape: { kind: 'ref', name: 'PromptingReading' } },
      readingSource: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      responses: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PromptingResponse' } },
      },
      recent: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PromptingRecord' } },
      },
      echo: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'object',
            fields: {
              level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
    },
  },
  Resolve: {
    kind: 'object',
    fields: {
      key: { optional: false, shape: { kind: 'string' } },
      label: { optional: true, shape: { kind: 'string' } },
      kind: { optional: false, shape: { kind: 'string' } },
      strength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      day: { optional: false, shape: { kind: 'number' } },
    },
  },
  ReviewRecord: {
    kind: 'object',
    fields: {
      day: { optional: false, shape: { kind: 'number' } },
      missed: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      kept: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      resolved: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  ReviewState: {
    kind: 'object',
    fields: {
      style: { optional: false, shape: { kind: 'ref', name: 'ReviewStyle' } },
      styleSource: { optional: true, shape: { kind: 'string' } },
      atMsOfDay: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      lastDay: { optional: true, shape: { kind: 'number' } },
      resolves: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Resolve' } } },
      last: { optional: true, shape: { kind: 'ref', name: 'ReviewRecord' } },
      seen: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  PortableDependencies: {
    kind: 'object',
    fields: {
      lastAction: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      chronicle: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'DayRecord' } } },
      chronicleDay: { optional: false, shape: { kind: 'ref', name: 'ChronicleDay' } },
      conscience: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            breaches: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    id: { optional: false, shape: { kind: 'string' } },
                    normId: { optional: false, shape: { kind: 'string' } },
                    at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                    victimId: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
                    weight: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                    repaired: { optional: false, shape: { kind: 'boolean' } },
                  },
                },
              },
            },
            nextBreach: { optional: false, shape: { kind: 'number' } },
            intentions: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                    action: { optional: false, shape: { kind: 'string' } },
                    intention: { optional: false, shape: { kind: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      will: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            precommitments: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'PrecommitmentData' } },
            },
            switchMargin: { optional: false, shape: { kind: 'number' } },
            temperature: { optional: false, shape: { kind: 'number' } },
            advice: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'StandingAdvice' } },
            },
            command: {
              optional: true,
              shape: {
                kind: 'object',
                fields: {
                  voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
                  affordanceId: { optional: true, shape: { kind: 'string' } },
                  action: { optional: true, shape: { kind: 'string' } },
                  since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  repeat: { optional: true, shape: { kind: 'boolean' } },
                  startedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  chargedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  margin: { optional: false, shape: { kind: 'number' } },
                  obeyed: { optional: true, shape: { kind: 'boolean' } },
                  remembered: { optional: true, shape: { kind: 'boolean' } },
                },
              },
            },
            lastCommand: {
              optional: true,
              shape: {
                kind: 'object',
                fields: {
                  voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                  since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  endedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  reason: { optional: false, shape: { kind: 'string' } },
                },
              },
            },
          },
        },
      },
      promptings: { optional: false, shape: { kind: 'ref', name: 'PromptingsState' } },
      review: { optional: false, shape: { kind: 'ref', name: 'ReviewState' } },
    },
  },
  ImpressionCue: {
    kind: 'object',
    fields: {
      key: { optional: false, shape: { kind: 'string' } },
      mean: { optional: false, shape: { kind: 'number' } },
      weight: { optional: false, shape: { kind: 'number' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Impression: {
    kind: 'object',
    fields: {
      targetId: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      cues: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'ImpressionCue' } } },
      seenAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  PortableEvidence: {
    kind: 'object',
    fields: {
      character: { optional: false, shape: { kind: 'ref', name: 'CharacterState' } },
      heldNorms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'HeldNorm' } } },
      beliefs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Belief' } } },
      sourceTrust: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'InitialSourceTrust' } },
      },
      relationships: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'Relationship' } },
      },
      voices: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'VoiceRelation' } } },
      gists: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Gist' } } },
      expectations: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActionExpectation' } },
      },
      contradictions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'NotedContradiction' } },
      },
      methods: { optional: false, shape: { kind: 'ref', name: 'MethodsState' } },
      prospection: { optional: false, shape: { kind: 'ref', name: 'ProspectionState' } },
      habits: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Habit' } } },
      motivation: { optional: false, shape: { kind: 'ref', name: 'PortableMotivation' } },
      dependencies: { optional: false, shape: { kind: 'ref', name: 'PortableDependencies' } },
      impressions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'Impression' } },
      },
      counters: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            nextEpisode: { optional: false, shape: { kind: 'number' } },
            nextGist: { optional: false, shape: { kind: 'number' } },
            allocated: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'Reference' } },
            },
          },
        },
      },
    },
  },
  PortableProvenance: {
    kind: 'object',
    fields: {
      reference: { optional: false, shape: { kind: 'ref', name: 'Reference' } },
      sourceHost: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      sourceEdition: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      sourceAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      basis: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'authored' },
            { kind: 'literal', value: 'received' },
            { kind: 'literal', value: 'derived' },
          ],
        },
      },
      sourceIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      evidence: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Reference' } } },
      research: { optional: true, shape: { kind: 'ref', name: 'NormProvenance' } },
    },
  },
  PortableUnknown: {
    kind: 'object',
    fields: {
      reference: { optional: false, shape: { kind: 'ref', name: 'Reference' } },
      reason: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'not-observed' },
            { kind: 'literal', value: 'not-retained' },
            { kind: 'literal', value: 'unmapped' },
            { kind: 'literal', value: 'outside-projection' },
          ],
        },
      },
      lastKnownAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  PersonaProjection: {
    kind: 'object',
    fields: {
      coordinates: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            offsetMs: { optional: false, shape: { kind: 'number' } },
            calendarId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      mappingId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      source: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            host: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
      name: { optional: false, shape: { kind: 'string' } },
      life: { optional: false, shape: { kind: 'ref', name: 'LifeCourse' } },
      rng: { optional: false, shape: { kind: 'ref', name: 'RngState' } },
      randomIdentity: { optional: false, shape: { kind: 'ref', name: 'ActorRandomIdentity' } },
      traits: { optional: false, shape: { kind: 'ref', name: 'Traits' } },
      values: { optional: false, shape: { kind: 'ref', name: 'Values' } },
      health: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            health: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            fitness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            circadianPeakMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
          },
        },
      },
      family: { optional: false, shape: { kind: 'ref', name: 'FamilyState' } },
      bonds: { optional: false, shape: { kind: 'ref', name: 'BondsState' } },
      lifecycle: { optional: false, shape: { kind: 'ref', name: 'PortableLifecycle' } },
      skills: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'ref', name: 'Skill' } },
      },
      skillRetention: {
        optional: false,
        shape: {
          kind: 'object',
          fields: { consolidationHours: { optional: false, shape: { kind: 'number' } } },
        },
      },
      episodes: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Episode' } } },
      commitments: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'Commitment' } },
      },
      obligations: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PortableObligation' } },
      },
      evidence: { optional: false, shape: { kind: 'ref', name: 'PortableEvidence' } },
      references: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ReferenceBinding' } },
      },
      provenance: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PortableProvenance' } },
      },
      unknowns: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'PortableUnknown' } },
      },
      exclusions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ProjectionExclusion' } },
      },
    },
  },
  ChapterClock: {
    kind: 'object',
    fields: {
      seed: { optional: false, shape: { kind: 'number' } },
      wallAtMs: { optional: false, shape: { kind: 'number' } },
      slot: { optional: false, shape: { kind: 'number' } },
      remainderMs: { optional: false, shape: { kind: 'number' } },
    },
  },
  ChapterSlot: {
    kind: 'object',
    fields: {
      slot: { optional: false, shape: { kind: 'number' } },
      atWallMs: { optional: false, shape: { kind: 'number' } },
      draw: { optional: false, shape: { kind: 'number' } },
    },
  },
  ChapterProjection: {
    kind: 'object',
    fields: {
      clock: { optional: false, shape: { kind: 'ref', name: 'ChapterClock' } },
      slots: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'ChapterSlot' } } },
      skipped: { optional: false, shape: { kind: 'number' } },
    },
  },
  PortablePersonEnvelope: {
    kind: 'object',
    fields: {
      format: { optional: false, shape: { kind: 'literal', value: 'hf-person' } },
      version: { optional: false, shape: { kind: 'literal', value: 4 } },
      engine: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            package: { optional: false, shape: { kind: 'string' } },
            schema: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
          },
        },
      },
      identity: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            castId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            revision: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            parentRevision: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'scalar', name: 'Id' },
                  { kind: 'literal', value: null },
                ],
              },
            },
          },
        },
      },
      origin: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            host: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            edition: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            epoch: { optional: false, shape: { kind: 'ref', name: 'CalendarDefinition' } },
          },
        },
      },
      mapping: { optional: false, shape: { kind: 'ref', name: 'PersonaMapping' } },
      calendar: { optional: false, shape: { kind: 'ref', name: 'CalendarMapping' } },
      person: { optional: false, shape: { kind: 'ref', name: 'PersonaProjection' } },
      chapter: { optional: false, shape: { kind: 'ref', name: 'ChapterProjection' } },
      hash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
    },
  },
  PersonaAdmission: {
    kind: 'object',
    fields: {
      envelope: { optional: false, shape: { kind: 'ref', name: 'PortablePersonEnvelope' } },
      preparation: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            chapter: { optional: false, shape: { kind: 'ref', name: 'ChapterProjection' } },
          },
        },
      },
    },
  },
  PersonAuthoring: {
    kind: 'object',
    fields: {
      portable: { optional: true, shape: { kind: 'ref', name: 'PortableAdmission' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      identity: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            name: { optional: false, shape: { kind: 'string' } },
            birthAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            sex: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'female' },
                  { kind: 'literal', value: 'male' },
                ],
              },
            },
            castId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      biography: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'AuthoredEpisode' } },
      },
      origin: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
            basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
            traits: { optional: false, shape: { kind: 'ref', name: 'TraitBasis' } },
          },
        },
      },
      state: { optional: false, shape: { kind: 'ref', name: 'AuthoredPersonState' } },
      admission: { optional: true, shape: { kind: 'ref', name: 'PersonaAdmission' } },
    },
  },
  Fidelity: {
    kind: 'union',
    options: [
      { kind: 'object', fields: { mode: { optional: false, shape: { kind: 'literal', value: 'fine' } } } },
      {
        kind: 'object',
        fields: {
          mode: { optional: false, shape: { kind: 'literal', value: 'daily' } },
          dayMs: { optional: false, shape: { kind: 'literal', value: 86400000 } },
          anchor: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
    ],
  },
  WorldChange: {
    kind: 'object',
    fields: {
      expectedRevision: { optional: false, shape: { kind: 'number' } },
      revision: { optional: false, shape: { kind: 'number' } },
      put: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'WorldFact' } } },
      remove: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      hostState: { optional: false, shape: { kind: 'scalar', name: 'Json' } },
    },
  },
  PersonEvidence: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  AmbientPercept: {
    kind: 'object',
    fields: {
      cold: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      dark: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      crowding: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      beauty: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      weather: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      dayLengthHours: { optional: true, shape: { kind: 'number' } },
      outdoors: { optional: true, shape: { kind: 'boolean' } },
    },
  },
  AmbientEvidence: {
    kind: 'object',
    fields: {
      contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      readings: { optional: false, shape: { kind: 'ref', name: 'AmbientPercept' } },
      dozeContext: { optional: true, shape: { kind: 'ref', name: 'DozeContext' } },
      basis: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            kind: { optional: false, shape: { kind: 'literal', value: 'received' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            validUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
    },
  },
  NeedReading: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'ref', name: 'NeedId' } },
      level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      urgency: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  AgendaEvidence: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'exemption' } },
          traveling: { optional: false, shape: { kind: 'ref', name: 'Knowledge$76' } },
          illnessSeverity: { optional: false, shape: { kind: 'ref', name: 'Knowledge$70' } },
          validUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'dependent-needs' } },
          dependent: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          needs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'NeedReading' } } },
          action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
    ],
  },
  Suggestion: {
    kind: 'object',
    fields: {
      voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      affordanceId: { optional: true, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      strength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      insist: { optional: true, shape: { kind: 'boolean' } },
      appeal: {
        optional: true,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'NeedId' },
            { kind: 'ref', name: 'ValueId' },
            { kind: 'literal', value: 'duty' },
          ],
        },
      },
      since: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  SuggestionData: {
    kind: 'object',
    fields: {
      voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      affordanceId: { optional: true, shape: { kind: 'string' } },
      action: { optional: true, shape: { kind: 'string' } },
      strength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      insist: { optional: true, shape: { kind: 'boolean' } },
      appeal: {
        optional: true,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'NeedId' },
            { kind: 'ref', name: 'ValueId' },
            { kind: 'literal', value: 'duty' },
          ],
        },
      },
      since: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  FamilyApproval: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'family-approval' } },
      voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      approval: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      acceptOfferId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      declineOfferId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  ReceivedSuggestion: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'ordinary' } },
          suggestion: { optional: false, shape: { kind: 'ref', name: 'SuggestionData' } },
        },
      },
      { kind: 'ref', name: 'FamilyApproval' },
    ],
  },
  ActionRequest: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'action' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'RequestId' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      offerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      offerRevision: { optional: false, shape: { kind: 'number' } },
      issuedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      boundaryAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      stage: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'start' },
            { kind: 'literal', value: 'finish' },
            { kind: 'literal', value: 'interrupt' },
          ],
        },
      },
      worldRevision: { optional: false, shape: { kind: 'number' } },
      requestHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
      participants: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'scalar', name: 'PersonId' } },
      },
    },
  },
  ConsumedAmounts: {
    kind: 'object',
    fields: {
      food: { optional: true, shape: { kind: 'number' } },
      water: { optional: true, shape: { kind: 'number' } },
      relief: { optional: true, shape: { kind: 'number' } },
    },
  },
  ExertionAmounts: {
    kind: 'object',
    fields: {
      sleepPressure: { optional: true, shape: { kind: 'number' } },
      exertion: { optional: true, shape: { kind: 'number' } },
    },
  },
  PracticeConditions: {
    kind: 'object',
    fields: {
      quality: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      instruction: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            level: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            engagement: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            teacherId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
          },
        },
      },
    },
  },
  ActualConsequences: {
    kind: 'object',
    fields: {
      psychological: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            safety: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
            belonging: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
            esteem: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
            autonomy: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
            competence: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
            leisure: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
            meaning: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
          },
        },
      },
      consumed: { optional: true, shape: { kind: 'ref', name: 'ConsumedAmounts' } },
      exerted: { optional: true, shape: { kind: 'ref', name: 'ExertionAmounts' } },
      injury: { optional: true, shape: { kind: 'ref', name: 'InjuryEvidence' } },
      illness: { optional: true, shape: { kind: 'ref', name: 'IllnessEvidence' } },
      exposures: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              agent: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              amount: { optional: false, shape: { kind: 'number' } },
              exposureId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            },
          },
        },
      },
      voidedBladder: { optional: true, shape: { kind: 'boolean' } },
      material: { optional: true, shape: { kind: 'number' } },
      practice: { optional: true, shape: { kind: 'ref', name: 'PracticeConditions' } },
      observedProgress: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              progress: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            },
          },
        },
      },
    },
  },
  ObservedOutcome: {
    kind: 'object',
    fields: {
      activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      offerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      actionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      target: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      start: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      end: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'completed' },
            { kind: 'literal', value: 'failed' },
            { kind: 'literal', value: 'interrupted' },
          ],
        },
      },
      evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      actual: { optional: false, shape: { kind: 'ref', name: 'ActualConsequences' } },
      quality: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      summary: { optional: true, shape: { kind: 'string' } },
      fulfills: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      advances: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  ActionResolution: {
    kind: 'object',
    fields: {
      requestId: { optional: false, shape: { kind: 'scalar', name: 'RequestId' } },
      requestHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      stage: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'start' },
            { kind: 'literal', value: 'finish' },
            { kind: 'literal', value: 'interrupt' },
          ],
        },
      },
      worldRevision: { optional: false, shape: { kind: 'number' } },
      disposition: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'accepted' },
            { kind: 'literal', value: 'rejected' },
            { kind: 'literal', value: 'completed' },
            { kind: 'literal', value: 'failed' },
            { kind: 'literal', value: 'interrupted' },
          ],
        },
      },
      worldChange: { optional: true, shape: { kind: 'ref', name: 'WorldChange' } },
      outcome: { optional: true, shape: { kind: 'ref', name: 'ObservedOutcome' } },
      observations: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
              percepts: {
                optional: false,
                shape: { kind: 'array', element: { kind: 'ref', name: 'PerceptData' } },
              },
            },
          },
        },
      },
    },
  },
  CommunicationReception: {
    kind: 'object',
    fields: {
      recipient: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      attention: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      itemIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  CommunicationResolution: {
    kind: 'object',
    fields: {
      requestId: { optional: false, shape: { kind: 'scalar', name: 'RequestId' } },
      requestHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
      worldRevision: { optional: false, shape: { kind: 'number' } },
      speaker: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      emittedItemIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      received: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'CommunicationReception' } },
      },
      worldChange: { optional: true, shape: { kind: 'ref', name: 'WorldChange' } },
    },
  },
  Claim: {
    kind: 'object',
    fields: {
      prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      value: { optional: false, shape: { kind: 'boolean' } },
      confidence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      provenance: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      origin: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      lineage: { optional: true, shape: { kind: 'string' } },
    },
  },
  SocialEventKind: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'help' },
      { kind: 'literal', value: 'harm' },
      { kind: 'literal', value: 'gift' },
      { kind: 'literal', value: 'insult' },
      { kind: 'literal', value: 'thanks' },
      { kind: 'literal', value: 'apology' },
      { kind: 'literal', value: 'forgive' },
      { kind: 'literal', value: 'promise-kept' },
      { kind: 'literal', value: 'promise-broken' },
      { kind: 'literal', value: 'chat' },
      { kind: 'literal', value: 'conflict' },
      { kind: 'literal', value: 'praise' },
      { kind: 'literal', value: 'deceit-discovered' },
      { kind: 'literal', value: 'shared-work' },
    ],
  },
  SocialEventData: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'ref', name: 'SocialEventKind' } },
      byMe: { optional: false, shape: { kind: 'boolean' } },
      magnitude: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  OutwardSigns: {
    kind: 'object',
    fields: {
      fatigue: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      pain: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      fear: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      mood: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      fearOf: {
        optional: true,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'scalar', name: 'Unit' } },
      },
    },
  },
  ImpressionKey: {
    kind: 'union',
    options: [
      { kind: 'ref', name: 'StateCue' },
      { kind: 'literal', value: 'regard' },
      { kind: 'pattern', pattern: '^fear@.*$' },
      {
        kind: 'pattern',
        pattern: '^trait:(?:honesty|emotionality|extraversion|agreeableness|conscientiousness|openness)$',
      },
      { kind: 'pattern', pattern: '^tie:.*$' },
      { kind: 'pattern', pattern: '^trust:.*$' },
      { kind: 'pattern', pattern: '^skill:.*$' },
    ],
  },
  ObservedActData: {
    kind: 'object',
    fields: {
      clarity: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      placeId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      avoided: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      withId: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
      toward: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      voiceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      heeded: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  KnownPersonFact: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'trait' } },
          trait: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'honesty' },
                { kind: 'literal', value: 'emotionality' },
                { kind: 'literal', value: 'extraversion' },
                { kind: 'literal', value: 'agreeableness' },
                { kind: 'literal', value: 'conscientiousness' },
                { kind: 'literal', value: 'openness' },
              ],
            },
          },
          value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'tie' } },
          other: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          closeness: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
        },
      },
    ],
  },
  PhysicalContactReceipt: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'physical-contact' } },
      contactId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      carrier: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            contagious: { optional: false, shape: { kind: 'boolean' } },
            severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
    },
  },
  BodyReceipt: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'consumed' } },
          actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          received: { optional: false, shape: { kind: 'ref', name: 'ConsumedAmounts' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'exerted' } },
          actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          costs: { optional: false, shape: { kind: 'ref', name: 'ExertionAmounts' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'injured' } },
          injury: { optional: false, shape: { kind: 'ref', name: 'InjuryEvidence' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'illness' } },
          illness: { optional: false, shape: { kind: 'ref', name: 'IllnessEvidence' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'exposed' } },
          agent: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          amount: { optional: false, shape: { kind: 'number' } },
          exposureId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'treated' } },
          injuryId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          quality: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'fallen' } },
          cause: { optional: false, shape: { kind: 'string' } },
          observedUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'stood' } },
          actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'voided' } },
          actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      { kind: 'ref', name: 'PhysicalContactReceipt' },
    ],
  },
  FamilyContactReceipt: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      caregiver: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      from: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      to: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      activities: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      observationIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  ActualBasis: {
    kind: 'object',
    fields: {
      evidence: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
      worldRevision: { optional: false, shape: { kind: 'number' } },
    },
  },
  NewbornContext: {
    kind: 'object',
    fields: {
      body: { optional: false, shape: { kind: 'ref', name: 'InitialBody' } },
      needs: { optional: false, shape: { kind: 'ref', name: 'InitialNeeds' } },
      reserve: { optional: false, shape: { kind: 'ref', name: 'Reserve' } },
      retention: { optional: false, shape: { kind: 'ref', name: 'Retention' } },
      affect: { optional: false, shape: { kind: 'ref', name: 'InitialAffect' } },
      promptings: { optional: false, shape: { kind: 'ref', name: 'InitialPromptings' } },
      review: { optional: false, shape: { kind: 'ref', name: 'InitialReview' } },
    },
  },
  InheritedNewborn: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'two-parent-derived' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      identity: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            name: { optional: false, shape: { kind: 'string' } },
            castId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      sex: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
                value: {
                  optional: false,
                  shape: {
                    kind: 'union',
                    options: [
                      { kind: 'literal', value: 'female' },
                      { kind: 'literal', value: 'male' },
                    ],
                  },
                },
                basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
              },
            },
            {
              kind: 'object',
              fields: { kind: { optional: false, shape: { kind: 'literal', value: 'draw' } } },
            },
          ],
        },
      },
      parents: {
        optional: false,
        shape: {
          kind: 'tuple',
          elements: [
            { kind: 'ref', name: 'ActorRef' },
            { kind: 'ref', name: 'ActorRef' },
          ],
        },
      },
      context: { optional: false, shape: { kind: 'ref', name: 'NewbornContext' } },
    },
  },
  AuthoredNewborn: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
      person: { optional: false, shape: { kind: 'ref', name: 'PersonAuthoring' } },
    },
  },
  Newborn: {
    kind: 'union',
    options: [
      { kind: 'ref', name: 'InheritedNewborn' },
      { kind: 'ref', name: 'AuthoredNewborn' },
    ],
  },
  BirthChild: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'create' } },
          newborn: { optional: false, shape: { kind: 'ref', name: 'Newborn' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'reference' } },
          child: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
          name: { optional: true, shape: { kind: 'string' } },
        },
      },
    ],
  },
  Delivery: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'open-pregnancy' } },
          mother: { optional: false, shape: { kind: 'ref', name: 'ActorRef' } },
          pregnancyId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: { kind: { optional: false, shape: { kind: 'literal', value: 'not-recorded' } } },
      },
    ],
  },
  Guardian: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'known' } },
          stance: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'consented' },
                { kind: 'literal', value: 'refused' },
                { kind: 'literal', value: 'refused-unjustly' },
                { kind: 'literal', value: 'none' },
              ],
            },
          },
          basis: { optional: false, shape: { kind: 'ref', name: 'EvidenceRef' } },
        },
      },
      { kind: 'object', fields: { kind: { optional: false, shape: { kind: 'literal', value: 'unknown' } } } },
    ],
  },
  Lifecycle: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'conception' } },
          mother: { optional: false, shape: { kind: 'ref', name: 'ActorRef' } },
          father: { optional: false, shape: { kind: 'ref', name: 'KnownFather' } },
          offspring: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
          pregnancyId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'birth' } },
          child: { optional: false, shape: { kind: 'ref', name: 'BirthChild' } },
          delivery: { optional: false, shape: { kind: 'ref', name: 'Delivery' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'courtship-meeting' } },
          partners: {
            optional: false,
            shape: {
              kind: 'tuple',
              elements: [
                { kind: 'ref', name: 'ActorRef' },
                { kind: 'ref', name: 'ActorRef' },
              ],
            },
          },
          quality: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'betrothal' } },
          partners: {
            optional: false,
            shape: {
              kind: 'tuple',
              elements: [
                { kind: 'ref', name: 'ActorRef' },
                { kind: 'ref', name: 'ActorRef' },
              ],
            },
          },
          acceptedProposal: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'marriage' } },
          partners: {
            optional: false,
            shape: {
              kind: 'tuple',
              elements: [
                { kind: 'ref', name: 'ActorRef' },
                { kind: 'ref', name: 'ActorRef' },
              ],
            },
          },
          customId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          guardian: { optional: false, shape: { kind: 'ref', name: 'Guardian' } },
          kinScopeId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          acceptedProposal: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'kin-premise' } },
          premises: {
            optional: false,
            shape: { kind: 'array', element: { kind: 'ref', name: 'KinPremise' } },
          },
          scope: { optional: false, shape: { kind: 'ref', name: 'KinScope' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'death' } },
          person: { optional: false, shape: { kind: 'ref', name: 'ActorRef' } },
          basis: { optional: false, shape: { kind: 'ref', name: 'ActualBasis' } },
        },
      },
    ],
  },
  LifecycleReceipt: { kind: 'ref', name: 'Lifecycle' },
  AgendaRequest: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'commit' } },
          commitment: { optional: false, shape: { kind: 'ref', name: 'CommitmentData' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'release' } },
          commitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          authority: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'goal' } },
          goal: { optional: false, shape: { kind: 'ref', name: 'GoalData' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'abandon-goal' } },
          goalId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'adopt-task' } },
          prospectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          task: { optional: false, shape: { kind: 'ref', name: 'GoalData' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'precommit' } },
          precommitment: { optional: false, shape: { kind: 'ref', name: 'PrecommitmentData' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'release-precommitment' } },
          precommitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'make-up' } },
          commitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          window: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                start: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                end: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          type: { optional: false, shape: { kind: 'literal', value: 'retime' } },
          mappings: {
            optional: false,
            shape: {
              kind: 'array',
              element: {
                kind: 'object',
                fields: {
                  commitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                  start: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                  end: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: { type: { optional: false, shape: { kind: 'literal', value: 'retire-paid-make-ups' } } },
      },
    ],
  },
  PracticeKind: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'reflection' },
      { kind: 'literal', value: 'worship' },
      { kind: 'literal', value: 'rest' },
    ],
  },
  VoicePromiseData: {
    kind: 'object',
    fields: {
      kept: { optional: false, shape: { kind: 'boolean' } },
      action: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  Payloads: {
    kind: 'object',
    fields: {
      'world.changed': { optional: false, shape: { kind: 'ref', name: 'WorldChange' } },
      'offers.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            revision: { optional: false, shape: { kind: 'number' } },
            offers: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Offer' } } },
          },
        },
      },
      'observation.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            percepts: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'PerceptData' } },
            },
          },
        },
      },
      'ambient.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            environment: { optional: false, shape: { kind: 'ref', name: 'AmbientEvidence' } },
          },
        },
      },
      'ambient.left': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'context.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            context: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  {
                    kind: 'object',
                    fields: {
                      kind: { optional: false, shape: { kind: 'literal', value: 'scarcity' } },
                      value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                    },
                  },
                  {
                    kind: 'object',
                    fields: {
                      kind: { optional: false, shape: { kind: 'literal', value: 'smoking-exposure' } },
                      value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      'agenda.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            evidence: { optional: false, shape: { kind: 'ref', name: 'AgendaEvidence' } },
          },
        },
      },
      'suggestion.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            received: { optional: false, shape: { kind: 'ref', name: 'ReceivedSuggestion' } },
          },
        },
      },
      'advice.withdrawn': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'coercion.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            orderId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            offerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            repeat: { optional: false, shape: { kind: 'boolean' } },
          },
        },
      },
      'coercion.withdrawn': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            orderId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            reason: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
      'decision.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            reason: { optional: false, shape: { kind: 'string' } },
            treatment: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'ordinary' },
                  { kind: 'literal', value: 'reconsider' },
                ],
              },
            },
            offerRevision: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      'activity.interrupted': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            reason: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
      'action.resolved': { optional: false, shape: { kind: 'ref', name: 'ActionResolution' } },
      'communication.resolved': { optional: false, shape: { kind: 'ref', name: 'CommunicationResolution' } },
      'testimony.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            teller: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            claims: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Claim' } } },
          },
        },
      },
      'conversation.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            speaker: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            listener: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            topicIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
            maxClaims: { optional: false, shape: { kind: 'number' } },
            temptations: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                    value: { optional: false, shape: { kind: 'boolean' } },
                    gain: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                  },
                },
              },
            },
            loyalWarning: { optional: false, shape: { kind: 'boolean' } },
          },
        },
      },
      'retelling.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            teller: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            listener: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            gistIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
            placeIds: { optional: true, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
          },
        },
      },
      'contradiction.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            value: { optional: false, shape: { kind: 'boolean' } },
            reporterId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'fact.confirmed': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            value: { optional: false, shape: { kind: 'boolean' } },
            observationId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'social.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            other: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            event: { optional: false, shape: { kind: 'ref', name: 'SocialEventData' } },
          },
        },
      },
      'person.glimpsed': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            target: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            signs: { optional: false, shape: { kind: 'ref', name: 'OutwardSigns' } },
            clarity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      'person.reported': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            target: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            key: { optional: false, shape: { kind: 'ref', name: 'ImpressionKey' } },
            value: { optional: false, shape: { kind: 'number' } },
            weight: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            teller: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'act.witnessed': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            actor: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            act: { optional: false, shape: { kind: 'ref', name: 'ObservedActData' } },
          },
        },
      },
      'acquaintance.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            target: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            familiarity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            known: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'KnownPersonFact' } },
            },
          },
        },
      },
      'groups.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            self: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
            others: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                    groups: {
                      optional: false,
                      shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      'method.cues': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            cues: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Cue' } } },
          },
        },
      },
      'method.context-left': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'method.demonstrated': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            demonstrationId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            methodId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            conditions: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Cue' } } },
            action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            teacher: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            outcome: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'success' },
                  { kind: 'literal', value: 'failure' },
                ],
              },
            },
            receivedAttention: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      'skill.witnessed': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            teacher: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            skill: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            durationMs: { optional: false, shape: { kind: 'number' } },
            modelLevel: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            domain: { optional: false, shape: { kind: 'ref', name: 'LearningDomain' } },
          },
        },
      },
      'body.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            receipt: { optional: false, shape: { kind: 'ref', name: 'BodyReceipt' } },
          },
        },
      },
      'family.contact': { optional: false, shape: { kind: 'ref', name: 'FamilyContactReceipt' } },
      'lifecycle.received': { optional: false, shape: { kind: 'ref', name: 'LifecycleReceipt' } },
      'death.heard': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            deceased: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            reporter: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'agenda.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            request: { optional: false, shape: { kind: 'ref', name: 'AgendaRequest' } },
          },
        },
      },
      'norm.interpretation-received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            normId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            standing: { optional: false, shape: { kind: 'ref', name: 'NormStanding' } },
            conviction: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
          },
        },
      },
      'practice.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            practice: { optional: false, shape: { kind: 'ref', name: 'PracticeKind' } },
            durationMs: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      'repair.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            victim: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'repentance.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            deedId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'consequences.received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            claims: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'ReceivedConsequence' } },
            },
            withdrawals: {
              optional: false,
              shape: {
                kind: 'array',
                element: {
                  kind: 'object',
                  fields: {
                    id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                    revision: { optional: false, shape: { kind: 'number' } },
                  },
                },
              },
            },
          },
        },
      },
      'review.requested': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            reason: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
      'voice.promise-received': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            promise: { optional: false, shape: { kind: 'ref', name: 'VoicePromiseData' } },
          },
        },
      },
      'routine.authored': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            scheduleId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            entries: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'RoutineEntry' } },
            },
          },
        },
      },
      'routine.withdrawn': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            scheduleId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      'chapter.elapsed': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            chapterId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            fromWallMs: { optional: false, shape: { kind: 'number' } },
            untilWallMs: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      'person.arrived': {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            authored: { optional: false, shape: { kind: 'ref', name: 'PersonAuthoring' } },
            arrivalEvidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
    },
  },
  SourceFor$216: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$217: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$218: { kind: 'ref', name: 'Source' },
  SourceFor$219: { kind: 'ref', name: 'Source' },
  SourceFor$220: { kind: 'ref', name: 'Source' },
  SourceFor$221: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$222: { kind: 'ref', name: 'Source' },
  SourceFor$223: { kind: 'ref', name: 'Source' },
  SourceFor$224: { kind: 'ref', name: 'Source' },
  SourceFor$225: { kind: 'ref', name: 'Source' },
  SourceFor$226: { kind: 'ref', name: 'Source' },
  SourceFor$227: { kind: 'ref', name: 'Source' },
  SourceFor$228: { kind: 'ref', name: 'Source' },
  SourceFor$229: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$230: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$231: { kind: 'ref', name: 'Source' },
  SourceFor$232: { kind: 'ref', name: 'Source' },
  SourceFor$233: { kind: 'ref', name: 'Source' },
  SourceFor$234: { kind: 'ref', name: 'Source' },
  SourceFor$235: { kind: 'ref', name: 'Source' },
  SourceFor$236: { kind: 'ref', name: 'Source' },
  SourceFor$237: { kind: 'ref', name: 'Source' },
  SourceFor$238: { kind: 'ref', name: 'Source' },
  SourceFor$239: { kind: 'ref', name: 'Source' },
  SourceFor$240: { kind: 'ref', name: 'Source' },
  SourceFor$241: { kind: 'ref', name: 'Source' },
  SourceFor$242: { kind: 'ref', name: 'Source' },
  SourceFor$243: { kind: 'ref', name: 'Source' },
  SourceFor$244: { kind: 'ref', name: 'Source' },
  SourceFor$245: { kind: 'ref', name: 'Source' },
  SourceFor$246: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$247: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$248: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$249: { kind: 'ref', name: 'Source' },
  SourceFor$250: { kind: 'ref', name: 'Source' },
  SourceFor$251: { kind: 'ref', name: 'Source' },
  SourceFor$252: { kind: 'ref', name: 'Source' },
  SourceFor$253: { kind: 'ref', name: 'Source' },
  SourceFor$254: { kind: 'ref', name: 'Source' },
  SourceFor$255: { kind: 'ref', name: 'Source' },
  SourceFor$256: { kind: 'ref', name: 'Source' },
  SourceFor$257: { kind: 'ref', name: 'Source' },
  SourceFor$258: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$259: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$260: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  SourceFor$261: {
    kind: 'object',
    fields: {
      type: { optional: false, shape: { kind: 'literal', value: 'host' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  Input: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$216' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'world.changed' } },
          payload: { optional: false, shape: { kind: 'ref', name: 'WorldChange' } },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$217' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'offers.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                revision: { optional: false, shape: { kind: 'number' } },
                offers: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'Offer' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$218' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'observation.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                percepts: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'PerceptData' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$219' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'ambient.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                environment: { optional: false, shape: { kind: 'ref', name: 'AmbientEvidence' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$220' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'ambient.left' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$221' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'context.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                context: {
                  optional: false,
                  shape: {
                    kind: 'union',
                    options: [
                      {
                        kind: 'object',
                        fields: {
                          kind: { optional: false, shape: { kind: 'literal', value: 'scarcity' } },
                          value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                        },
                      },
                      {
                        kind: 'object',
                        fields: {
                          kind: { optional: false, shape: { kind: 'literal', value: 'smoking-exposure' } },
                          value: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$222' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'agenda.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                evidence: { optional: false, shape: { kind: 'ref', name: 'AgendaEvidence' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$223' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'suggestion.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                received: { optional: false, shape: { kind: 'ref', name: 'ReceivedSuggestion' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$224' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'advice.withdrawn' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$225' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'coercion.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                orderId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                offerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                repeat: { optional: false, shape: { kind: 'boolean' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$226' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'coercion.withdrawn' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                orderId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                reason: { optional: false, shape: { kind: 'string' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$227' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'decision.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                reason: { optional: false, shape: { kind: 'string' } },
                treatment: {
                  optional: false,
                  shape: {
                    kind: 'union',
                    options: [
                      { kind: 'literal', value: 'ordinary' },
                      { kind: 'literal', value: 'reconsider' },
                    ],
                  },
                },
                offerRevision: { optional: false, shape: { kind: 'number' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$228' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'activity.interrupted' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                reason: { optional: false, shape: { kind: 'string' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$229' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'action.resolved' } },
          payload: { optional: false, shape: { kind: 'ref', name: 'ActionResolution' } },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$230' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'communication.resolved' } },
          payload: { optional: false, shape: { kind: 'ref', name: 'CommunicationResolution' } },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$231' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'testimony.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                teller: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                claims: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'Claim' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$232' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'conversation.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                speaker: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                listener: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                topicIds: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
                },
                maxClaims: { optional: false, shape: { kind: 'number' } },
                temptations: {
                  optional: false,
                  shape: {
                    kind: 'array',
                    element: {
                      kind: 'object',
                      fields: {
                        prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                        value: { optional: false, shape: { kind: 'boolean' } },
                        gain: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                      },
                    },
                  },
                },
                loyalWarning: { optional: false, shape: { kind: 'boolean' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$233' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'retelling.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                teller: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                listener: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                gistIds: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
                },
                placeIds: {
                  optional: true,
                  shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$234' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'contradiction.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                value: { optional: false, shape: { kind: 'boolean' } },
                reporterId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$235' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'fact.confirmed' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                value: { optional: false, shape: { kind: 'boolean' } },
                observationId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$236' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'social.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                other: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                event: { optional: false, shape: { kind: 'ref', name: 'SocialEventData' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$237' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'person.glimpsed' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                target: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                signs: { optional: false, shape: { kind: 'ref', name: 'OutwardSigns' } },
                clarity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$238' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'person.reported' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                target: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                key: { optional: false, shape: { kind: 'ref', name: 'ImpressionKey' } },
                value: { optional: false, shape: { kind: 'number' } },
                weight: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                teller: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$239' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'act.witnessed' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                actor: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                act: { optional: false, shape: { kind: 'ref', name: 'ObservedActData' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$240' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'acquaintance.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                target: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                familiarity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                known: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'KnownPersonFact' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$241' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'groups.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                self: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
                others: {
                  optional: false,
                  shape: {
                    kind: 'array',
                    element: {
                      kind: 'object',
                      fields: {
                        person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                        groups: {
                          optional: false,
                          shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$242' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'method.cues' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                cues: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Cue' } } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$243' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'method.context-left' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$244' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'method.demonstrated' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                demonstrationId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                methodId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                conditions: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'Cue' } },
                },
                action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                teacher: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                outcome: {
                  optional: false,
                  shape: {
                    kind: 'union',
                    options: [
                      { kind: 'literal', value: 'success' },
                      { kind: 'literal', value: 'failure' },
                    ],
                  },
                },
                receivedAttention: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$245' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'skill.witnessed' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                teacher: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                skill: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                durationMs: { optional: false, shape: { kind: 'number' } },
                modelLevel: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                domain: { optional: false, shape: { kind: 'ref', name: 'LearningDomain' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$246' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'body.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                receipt: { optional: false, shape: { kind: 'ref', name: 'BodyReceipt' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$247' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'family.contact' } },
          payload: { optional: false, shape: { kind: 'ref', name: 'FamilyContactReceipt' } },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$248' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'lifecycle.received' } },
          payload: { optional: false, shape: { kind: 'ref', name: 'LifecycleReceipt' } },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$249' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'death.heard' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                deceased: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                reporter: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$250' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'agenda.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                request: { optional: false, shape: { kind: 'ref', name: 'AgendaRequest' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$251' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'norm.interpretation-received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                normId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                standing: { optional: false, shape: { kind: 'ref', name: 'NormStanding' } },
                conviction: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                provenance: { optional: false, shape: { kind: 'ref', name: 'NormProvenance' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$252' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'practice.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                practice: { optional: false, shape: { kind: 'ref', name: 'PracticeKind' } },
                durationMs: { optional: false, shape: { kind: 'number' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$253' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'repair.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                victim: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                actionReceipt: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$254' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'repentance.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                deedId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$255' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'consequences.received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                claims: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'ReceivedConsequence' } },
                },
                withdrawals: {
                  optional: false,
                  shape: {
                    kind: 'array',
                    element: {
                      kind: 'object',
                      fields: {
                        id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                        revision: { optional: false, shape: { kind: 'number' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$256' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'review.requested' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                reason: { optional: false, shape: { kind: 'string' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$257' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'voice.promise-received' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                promise: { optional: false, shape: { kind: 'ref', name: 'VoicePromiseData' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$258' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'routine.authored' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                scheduleId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                entries: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'RoutineEntry' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$259' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'routine.withdrawn' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
                scheduleId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$260' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'chapter.elapsed' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                chapterId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                fromWallMs: { optional: false, shape: { kind: 'number' } },
                untilWallMs: { optional: false, shape: { kind: 'number' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          source: { optional: false, shape: { kind: 'ref', name: 'SourceFor$261' } },
          kind: { optional: false, shape: { kind: 'literal', value: 'person.arrived' } },
          payload: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                authored: { optional: false, shape: { kind: 'ref', name: 'PersonAuthoring' } },
                arrivalEvidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
    ],
  },
  StepBatch: {
    kind: 'object',
    fields: {
      until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      fidelity: { optional: true, shape: { kind: 'ref', name: 'Fidelity' } },
      inputs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Input' } } },
    },
  },
  Exposures: {
    kind: 'object',
    fields: {
      smoking: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      sleepDebtHours: { optional: true, shape: { kind: 'number' } },
      fitness: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  LifecycleTruthQuery: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'aptitude' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          skill: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'attachment' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'female-fecundity' },
                { kind: 'literal', value: 'male-fertility' },
                { kind: 'literal', value: 'value-plasticity' },
                { kind: 'literal', value: 'attachment-plasticity' },
              ],
            },
          },
          ageYears: { optional: false, shape: { kind: 'number' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'conception-chance' } },
          mother: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          father: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'pregnancy' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'pregnancy-modifiers' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'spouses' },
                { kind: 'literal', value: 'mourning' },
                { kind: 'literal', value: 'widowhood-mortality' },
              ],
            },
          },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'values-similarity' },
                { kind: 'literal', value: 'age-fit' },
                { kind: 'literal', value: 'attraction' },
                { kind: 'literal', value: 'compatibility' },
              ],
            },
          },
          a: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          b: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'courtship-stage' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          other: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'kinship' } },
          a: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          b: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          kinScopeId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'can-marry' } },
          a: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          b: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          customId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          guardian: { optional: false, shape: { kind: 'ref', name: 'Guardian' } },
          kinScopeId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'age' },
                { kind: 'literal', value: 'life-stage' },
                { kind: 'literal', value: 'life-modifiers' },
                { kind: 'literal', value: 'development' },
              ],
            },
          },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'stage-for-age' },
                { kind: 'literal', value: 'modifiers-for-age' },
                { kind: 'literal', value: 'development-for-age' },
              ],
            },
          },
          ageYears: { optional: false, shape: { kind: 'number' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'learning-multiplier' } },
          ageYears: { optional: false, shape: { kind: 'number' } },
          domain: { optional: false, shape: { kind: 'ref', name: 'LearningDomain' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'chronic-hazard' } },
          ageYears: { optional: false, shape: { kind: 'number' } },
          conditionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          exposures: { optional: false, shape: { kind: 'ref', name: 'Exposures' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'chronic-risk' } },
          ageYears: { optional: false, shape: { kind: 'number' } },
          exposures: { optional: false, shape: { kind: 'ref', name: 'Exposures' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'mortality-hazard' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'partnering-terms' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          offer: { optional: false, shape: { kind: 'ref', name: 'Offer' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
    ],
  },
  LifecyclePersonQuery: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'held-family' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'held-partnering' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          other: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'held-kin' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          other: { optional: false, shape: { kind: 'ref', name: 'EntityRef' } },
        },
      },
    ],
  },
  LifecycleQuery: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'host' } },
          query: { optional: false, shape: { kind: 'ref', name: 'LifecycleTruthQuery' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'person' } },
          query: { optional: false, shape: { kind: 'ref', name: 'LifecyclePersonQuery' } },
        },
      },
    ],
  },
  Perspective: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'person' } },
          observer: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      { kind: 'object', fields: { kind: { optional: false, shape: { kind: 'literal', value: 'host' } } } },
    ],
  },
  InspectQuery: {
    kind: 'object',
    fields: {
      portable: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            castId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            castRevision: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      lifecycle: { optional: true, shape: { kind: 'ref', name: 'LifecycleQuery' } },
      perspective: { optional: false, shape: { kind: 'ref', name: 'Perspective' } },
      people: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'PersonId' } } },
      select: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'union',
            options: [
              { kind: 'literal', value: 'summary' },
              { kind: 'literal', value: 'skills' },
              { kind: 'literal', value: 'body' },
              { kind: 'literal', value: 'beliefs' },
              { kind: 'literal', value: 'sourceTrust' },
              { kind: 'literal', value: 'relationships' },
              { kind: 'literal', value: 'methods' },
              { kind: 'literal', value: 'agenda' },
              { kind: 'literal', value: 'events' },
              { kind: 'literal', value: 'persona' },
              { kind: 'literal', value: 'calendar' },
              { kind: 'literal', value: 'chapter' },
            ],
          },
        },
      },
      method: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      skill: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
            skill: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            difficulty: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            support: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      afterEvent: { optional: true, shape: { kind: 'scalar', name: 'EventId' } },
      diagnostic: { optional: true, shape: { kind: 'literal', value: 'full-hash' } },
    },
  },
  PreviewQuery: {
    kind: 'object',
    fields: {
      bodyForecast: {
        optional: true,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              label: { optional: false, shape: { kind: 'string' } },
              durationMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
              load: { optional: false, shape: { kind: 'ref', name: 'BodyLoad' } },
            },
          },
        },
      },
      perspective: { optional: false, shape: { kind: 'ref', name: 'Perspective' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      fidelity: { optional: true, shape: { kind: 'ref', name: 'Fidelity' } },
      inputs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Input' } } },
    },
  },
  Effective_RETELL_DEFAULTS: {
    kind: 'object',
    fields: {
      share: { optional: false, shape: { kind: 'literal', value: 0.6 } },
      limit: { optional: false, shape: { kind: 'literal', value: 3 } },
      minSalience: { optional: false, shape: { kind: 'literal', value: 0.1 } },
    },
  },
  RetellEffectiveRecord: {
    kind: 'object',
    fields: {
      RETELL_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_RETELL_DEFAULTS' } },
    },
  },
  Effective_AFFECT_DEFAULTS: {
    kind: 'object',
    fields: {
      maxEmotions: { optional: false, shape: { kind: 'number' } },
      dropBelow: { optional: false, shape: { kind: 'number' } },
      halfLife: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            joy: { optional: false, shape: { kind: 'number' } },
            distress: { optional: false, shape: { kind: 'number' } },
            hope: { optional: false, shape: { kind: 'number' } },
            fear: { optional: false, shape: { kind: 'number' } },
            relief: { optional: false, shape: { kind: 'number' } },
            disappointment: { optional: false, shape: { kind: 'number' } },
            pride: { optional: false, shape: { kind: 'number' } },
            shame: { optional: false, shape: { kind: 'number' } },
            gratitude: { optional: false, shape: { kind: 'number' } },
            anger: { optional: false, shape: { kind: 'number' } },
            guilt: { optional: false, shape: { kind: 'number' } },
            love: { optional: false, shape: { kind: 'number' } },
            grief: { optional: false, shape: { kind: 'number' } },
            awe: { optional: false, shape: { kind: 'number' } },
            boredom: { optional: false, shape: { kind: 'number' } },
            loneliness: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      valence: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            joy: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            distress: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            hope: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            fear: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            relief: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            disappointment: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            pride: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            shame: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            gratitude: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            anger: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            guilt: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            love: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            grief: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            awe: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            boredom: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            loneliness: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
          },
        },
      },
      arousal: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            joy: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            distress: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            hope: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            fear: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            relief: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            disappointment: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            pride: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            shame: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            gratitude: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            anger: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            guilt: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            love: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            grief: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            awe: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            boredom: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            loneliness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      negative: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      regulationExempt: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      regulationShortening: { optional: false, shape: { kind: 'number' } },
      gainBase: { optional: false, shape: { kind: 'number' } },
      gainSlope: { optional: false, shape: { kind: 'number' } },
      fearGainBase: { optional: false, shape: { kind: 'number' } },
      fearGainSlope: { optional: false, shape: { kind: 'number' } },
      mergeBlend: { optional: false, shape: { kind: 'number' } },
      griefFloor: { optional: false, shape: { kind: 'number' } },
      loveAffection: { optional: false, shape: { kind: 'number' } },
      moodNeedGain: { optional: false, shape: { kind: 'number' } },
      moodEmotionGain: { optional: false, shape: { kind: 'number' } },
      moodValenceHalfLife: { optional: false, shape: { kind: 'number' } },
      moodArousalHalfLife: { optional: false, shape: { kind: 'number' } },
      baselineArousal: { optional: false, shape: { kind: 'number' } },
      baselineArousalWeight: { optional: false, shape: { kind: 'number' } },
      feltEmotionWeight: { optional: false, shape: { kind: 'number' } },
      regulationRate: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            reflection: { optional: false, shape: { kind: 'number' } },
            worship: { optional: false, shape: { kind: 'number' } },
            rest: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      regulationCeiling: { optional: false, shape: { kind: 'number' } },
      soothe: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            reflection: { optional: false, shape: { kind: 'number' } },
            worship: { optional: false, shape: { kind: 'number' } },
            rest: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      sootheMinutes: { optional: false, shape: { kind: 'number' } },
      initialRegulation: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CRISIS_DEFAULTS: {
    kind: 'object',
    fields: {
      breakMood: { optional: false, shape: { kind: 'number' } },
      breakStress: { optional: false, shape: { kind: 'number' } },
      baseHazard: { optional: false, shape: { kind: 'number' } },
      stressHalfLife: { optional: false, shape: { kind: 'number' } },
      stressMoodRate: { optional: false, shape: { kind: 'number' } },
      minutes: { optional: false, shape: { kind: 'array', element: { kind: 'number' } } },
      refractory: { optional: false, shape: { kind: 'number' } },
      afterBreakStress: { optional: false, shape: { kind: 'number' } },
      maxBehaviours: { optional: false, shape: { kind: 'number' } },
      commandStrainPerHour: { optional: false, shape: { kind: 'number' } },
      injuryStrain: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_AGENDA_DEFAULTS: {
    kind: 'object',
    fields: {
      leadMinutes: { optional: false, shape: { kind: 'number' } },
      leadPressure: { optional: false, shape: { kind: 'number' } },
      openPressure: { optional: false, shape: { kind: 'number' } },
      peakFraction: { optional: false, shape: { kind: 'number' } },
      commitmentScale: { optional: false, shape: { kind: 'number' } },
      goalAmountGain: { optional: false, shape: { kind: 'number' } },
      defaultAdvanceAmount: { optional: false, shape: { kind: 'number' } },
      goalDeadlineBoost: { optional: false, shape: { kind: 'number' } },
      maxClosedCommitments: { optional: false, shape: { kind: 'number' } },
      maxClosedGoals: { optional: false, shape: { kind: 'number' } },
      maxActiveGoals: { optional: false, shape: { kind: 'number' } },
      maxCatchUp: { optional: false, shape: { kind: 'number' } },
      abstainScale: { optional: false, shape: { kind: 'number' } },
      maxOwed: { optional: false, shape: { kind: 'number' } },
      wakeGrace: { optional: false, shape: { kind: 'number' } },
      lapseWaiver: { optional: false, shape: { kind: 'number' } },
      proposeUrgency: { optional: false, shape: { kind: 'number' } },
      goalTemplates: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            belonging: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  label: { optional: false, shape: { kind: 'literal', value: 'make-friend' } },
                  completionHalfLifeMs: { optional: false, shape: { kind: 'literal', value: 7200000 } },
                  provenance: {
                    optional: false,
                    shape: {
                      kind: 'object',
                      fields: {
                        kind: { optional: false, shape: { kind: 'literal', value: 'assumption' } },
                        ref: {
                          optional: false,
                          shape: { kind: 'literal', value: 'engineering:hf4-proposeGoals-ruling23-unfitted' },
                        },
                      },
                    },
                  },
                  advancedBy: {
                    optional: false,
                    shape: {
                      kind: 'array',
                      element: {
                        kind: 'object',
                        fields: {
                          action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                          amount: { optional: false, shape: { kind: 'number' } },
                        },
                      },
                    },
                  },
                },
              },
            },
            competence: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  label: { optional: false, shape: { kind: 'literal', value: 'master-skill' } },
                  completionHalfLifeMs: { optional: false, shape: { kind: 'literal', value: 7200000 } },
                  provenance: {
                    optional: false,
                    shape: {
                      kind: 'object',
                      fields: {
                        kind: { optional: false, shape: { kind: 'literal', value: 'assumption' } },
                        ref: {
                          optional: false,
                          shape: { kind: 'literal', value: 'engineering:hf4-proposeGoals-ruling23-unfitted' },
                        },
                      },
                    },
                  },
                  advancedBy: {
                    optional: false,
                    shape: {
                      kind: 'array',
                      element: {
                        kind: 'object',
                        fields: {
                          action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                          amount: { optional: false, shape: { kind: 'number' } },
                        },
                      },
                    },
                  },
                },
              },
            },
            meaning: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  label: { optional: false, shape: { kind: 'literal', value: 'serve' } },
                  completionHalfLifeMs: { optional: false, shape: { kind: 'literal', value: 7200000 } },
                  provenance: {
                    optional: false,
                    shape: {
                      kind: 'object',
                      fields: {
                        kind: { optional: false, shape: { kind: 'literal', value: 'assumption' } },
                        ref: {
                          optional: false,
                          shape: { kind: 'literal', value: 'engineering:hf4-proposeGoals-ruling23-unfitted' },
                        },
                      },
                    },
                  },
                  advancedBy: {
                    optional: false,
                    shape: {
                      kind: 'array',
                      element: {
                        kind: 'object',
                        fields: {
                          action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                          amount: { optional: false, shape: { kind: 'number' } },
                        },
                      },
                    },
                  },
                },
              },
            },
            esteem: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  label: { optional: false, shape: { kind: 'literal', value: 'earn-respect' } },
                  completionHalfLifeMs: { optional: false, shape: { kind: 'literal', value: 7200000 } },
                  provenance: {
                    optional: false,
                    shape: {
                      kind: 'object',
                      fields: {
                        kind: { optional: false, shape: { kind: 'literal', value: 'assumption' } },
                        ref: {
                          optional: false,
                          shape: { kind: 'literal', value: 'engineering:hf4-proposeGoals-ruling23-unfitted' },
                        },
                      },
                    },
                  },
                  advancedBy: {
                    optional: false,
                    shape: {
                      kind: 'array',
                      element: {
                        kind: 'object',
                        fields: {
                          action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                          amount: { optional: false, shape: { kind: 'number' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  Effective_EXEMPTION_DEFAULTS: {
    kind: 'object',
    fields: {
      illnessSeverity: { optional: false, shape: { kind: 'number' } },
      lookahead: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_PURPOSE_DEFAULTS: {
    kind: 'object',
    fields: {
      graceDays: { optional: false, shape: { kind: 'number' } },
      decayPerDay: { optional: false, shape: { kind: 'number' } },
      abandonBelow: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CARE_DEFAULTS: {
    kind: 'object',
    fields: {
      urgency: { optional: false, shape: { kind: 'number' } },
      horizon: { optional: false, shape: { kind: 'number' } },
      importanceFloor: { optional: false, shape: { kind: 'number' } },
      action: { optional: false, shape: { kind: 'string' } },
      needs: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  Effective_BELIEF_DEFAULTS: {
    kind: 'object',
    fields: {
      maxBeliefs: { optional: false, shape: { kind: 'number' } },
      maxSources: { optional: false, shape: { kind: 'number' } },
      maxLogOdds: { optional: false, shape: { kind: 'number' } },
      defaultTrust: { optional: false, shape: { kind: 'number' } },
      selfTrust: { optional: false, shape: { kind: 'number' } },
      trustFloor: { optional: false, shape: { kind: 'number' } },
      trustExponent: { optional: false, shape: { kind: 'number' } },
      repeatDiscount: { optional: false, shape: { kind: 'number' } },
      observedDiscount: { optional: false, shape: { kind: 'number' } },
      confirmLogOdds: { optional: false, shape: { kind: 'number' } },
      trustGain: { optional: false, shape: { kind: 'number' } },
      trustLoss: { optional: false, shape: { kind: 'number' } },
      contradictionLoss: { optional: false, shape: { kind: 'number' } },
      maxContradictions: { optional: false, shape: { kind: 'number' } },
      driftHalfLife: { optional: false, shape: { kind: 'number' } },
      attentionBase: { optional: false, shape: { kind: 'number' } },
      attentionRange: { optional: false, shape: { kind: 'number' } },
      selfRelevance: { optional: false, shape: { kind: 'number' } },
      selfValenceRelevance: { optional: false, shape: { kind: 'number' } },
      affectionThreshold: { optional: false, shape: { kind: 'number' } },
      socialRelevance: { optional: false, shape: { kind: 'number' } },
      threatRelevance: { optional: false, shape: { kind: 'number' } },
      interestRelevance: { optional: false, shape: { kind: 'number' } },
      alwaysSalience: { optional: false, shape: { kind: 'number' } },
      alwaysSelfValence: { optional: false, shape: { kind: 'number' } },
      threatKinds: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  Effective_BLADDER_DEFAULTS: {
    kind: 'object',
    fields: {
      intakeScale: { optional: false, shape: { kind: 'number' } },
      maxPending: { optional: false, shape: { kind: 'number' } },
      halfLife: { optional: false, shape: { kind: 'number' } },
      basePerMinute: { optional: false, shape: { kind: 'number' } },
      choiceThreshold: { optional: false, shape: { kind: 'number' } },
      choiceScale: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_BODY_DEFAULTS: {
    kind: 'object',
    fields: {
      satietyPerMinute: { optional: false, shape: { kind: 'number' } },
      satietyEffortPerMinute: { optional: false, shape: { kind: 'number' } },
      hydrationPerMinute: { optional: false, shape: { kind: 'number' } },
      hydrationEffortPerMinute: { optional: false, shape: { kind: 'number' } },
      sleepMetabolism: { optional: false, shape: { kind: 'number' } },
      wakeTau: { optional: false, shape: { kind: 'number' } },
      sleepTau: { optional: false, shape: { kind: 'number' } },
      debtPerHourAbove: { optional: false, shape: { kind: 'number' } },
      debtThreshold: { optional: false, shape: { kind: 'number' } },
      debtRepayPerHour: { optional: false, shape: { kind: 'number' } },
      repayThreshold: { optional: false, shape: { kind: 'number' } },
      maxSleepDebt: { optional: false, shape: { kind: 'number' } },
      exertionGain: { optional: false, shape: { kind: 'number' } },
      exertionRiseHalfLife: { optional: false, shape: { kind: 'number' } },
      exertionRecoverHalfLife: { optional: false, shape: { kind: 'number' } },
      exertionRecoverHalfLifeAsleep: { optional: false, shape: { kind: 'number' } },
      depletionPerHour: { optional: false, shape: { kind: 'number' } },
      depletionFloor: { optional: false, shape: { kind: 'number' } },
      depletionRestHalfLife: { optional: false, shape: { kind: 'number' } },
      depletionSleepHalfLife: { optional: false, shape: { kind: 'number' } },
      depletionFatigueWeight: { optional: false, shape: { kind: 'number' } },
      trainingEffort: { optional: false, shape: { kind: 'number' } },
      detrainHalfLife: { optional: false, shape: { kind: 'number' } },
      fitnessFloor: { optional: false, shape: { kind: 'number' } },
      trainingRatio: { optional: false, shape: { kind: 'number' } },
      starvationPerDay: { optional: false, shape: { kind: 'number' } },
      dehydrationPerDay: { optional: false, shape: { kind: 'number' } },
      illnessHealthPerDay: { optional: false, shape: { kind: 'number' } },
      healthRecoveryPerDay: { optional: false, shape: { kind: 'number' } },
      immuneResponsePerDay: { optional: false, shape: { kind: 'number' } },
      minIllnessTrend: { optional: false, shape: { kind: 'number' } },
      illnessStressPerDay: { optional: false, shape: { kind: 'number' } },
      painHalfLife: { optional: false, shape: { kind: 'number' } },
      maxInjuries: { optional: false, shape: { kind: 'number' } },
      maxIllnesses: { optional: false, shape: { kind: 'number' } },
      sleepinessPressureWeight: { optional: false, shape: { kind: 'number' } },
      sleepinessCircadianWeight: { optional: false, shape: { kind: 'number' } },
      sleepinessDebtWeight: { optional: false, shape: { kind: 'number' } },
      debtUnderperception: { optional: false, shape: { kind: 'number' } },
      painAdaptation: { optional: false, shape: { kind: 'number' } },
      fastingHungerDamp: { optional: false, shape: { kind: 'number' } },
      fastingThirstDamp: { optional: false, shape: { kind: 'number' } },
      fastingOnsetShare: { optional: false, shape: { kind: 'number' } },
      fastingAdaptDays: { optional: false, shape: { kind: 'number' } },
      fastingBreakthrough: { optional: false, shape: { kind: 'array', element: { kind: 'number' } } },
      underfedFrom: { optional: false, shape: { kind: 'number' } },
      underfedFull: { optional: false, shape: { kind: 'number' } },
      underfedDriftLoss: { optional: false, shape: { kind: 'number' } },
      underfedWorsenPerDay: { optional: false, shape: { kind: 'number' } },
      restEffort: { optional: false, shape: { kind: 'number' } },
      restDriftBonus: { optional: false, shape: { kind: 'number' } },
      heavyEffort: { optional: false, shape: { kind: 'number' } },
      heavyEffortDriftLoss: { optional: false, shape: { kind: 'number' } },
      debtDriftRange: { optional: false, shape: { kind: 'array', element: { kind: 'number' } } },
      debtDriftLoss: { optional: false, shape: { kind: 'number' } },
      chronicHalfLife: { optional: false, shape: { kind: 'number' } },
      chronicDebtGain: { optional: false, shape: { kind: 'number' } },
      chronicExposureGain: { optional: false, shape: { kind: 'number' } },
      chronicHealthPerDay: { optional: false, shape: { kind: 'number' } },
      chronicPainWeight: { optional: false, shape: { kind: 'number' } },
      maxExposures: { optional: false, shape: { kind: 'number' } },
      exposureRecentGain: { optional: false, shape: { kind: 'number' } },
      exposureRecentHalfLife: { optional: false, shape: { kind: 'number' } },
      exposureCumulativeHalfLife: { optional: false, shape: { kind: 'number' } },
      transmissionPerMinute: { optional: false, shape: { kind: 'number' } },
      contractedSeverity: { optional: false, shape: { kind: 'number' } },
      contractedTrendPerDay: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_DOZE_DEFAULTS: {
    kind: 'object',
    fields: {
      sleepiness: { optional: false, shape: { kind: 'number' } },
      stimulation: { optional: false, shape: { kind: 'number' } },
      hazard: { optional: false, shape: { kind: 'number' } },
      seatedWeight: { optional: false, shape: { kind: 'number' } },
      wakeSalience: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_INJURY_DEFAULTS: {
    kind: 'object',
    fields: {
      clotHalfLife: { optional: false, shape: { kind: 'number' } },
      tendedClotHalfLife: { optional: false, shape: { kind: 'number' } },
      tendBleedCut: { optional: false, shape: { kind: 'number' } },
      tendedHeal: { optional: false, shape: { kind: 'number' } },
      bleedStops: { optional: false, shape: { kind: 'number' } },
      standMargin: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CHARACTER_DEFAULTS: {
    kind: 'object',
    fields: {
      maxDrift: { optional: false, shape: { kind: 'number' } },
      maturationFrom: { optional: false, shape: { kind: 'number' } },
      maturationTo: { optional: false, shape: { kind: 'number' } },
      conscientiousnessUntil: { optional: false, shape: { kind: 'number' } },
      traitPerYear: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            honesty: { optional: false, shape: { kind: 'number' } },
            emotionality: { optional: false, shape: { kind: 'number' } },
            extraversion: { optional: false, shape: { kind: 'number' } },
            agreeableness: { optional: false, shape: { kind: 'number' } },
            conscientiousness: { optional: false, shape: { kind: 'number' } },
            openness: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      valuePerYear: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            benevolence: { optional: false, shape: { kind: 'number' } },
            universalism: { optional: false, shape: { kind: 'number' } },
            tradition: { optional: false, shape: { kind: 'number' } },
            conformity: { optional: false, shape: { kind: 'number' } },
            security: { optional: false, shape: { kind: 'number' } },
            achievement: { optional: false, shape: { kind: 'number' } },
            power: { optional: false, shape: { kind: 'number' } },
            hedonism: { optional: false, shape: { kind: 'number' } },
            stimulation: { optional: false, shape: { kind: 'number' } },
            selfDirection: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      maxExperiencePerYear: { optional: false, shape: { kind: 'number' } },
      experienceReversion: { optional: false, shape: { kind: 'number' } },
      minDays: { optional: false, shape: { kind: 'number' } },
      moodGain: { optional: false, shape: { kind: 'number' } },
      dutyGain: { optional: false, shape: { kind: 'number' } },
      minCommitments: { optional: false, shape: { kind: 'number' } },
      socialGain: { optional: false, shape: { kind: 'number' } },
      socialBaseline: { optional: false, shape: { kind: 'number' } },
      wakingMinutes: { optional: false, shape: { kind: 'number' } },
      varietyGain: { optional: false, shape: { kind: 'number' } },
      varietyBaseline: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CHRONICLE_DEFAULTS: {
    kind: 'object',
    fields: {
      maxDays: { optional: false, shape: { kind: 'number' } },
      maxNotes: { optional: false, shape: { kind: 'number' } },
      maxActions: { optional: false, shape: { kind: 'number' } },
      maxVerdicts: { optional: false, shape: { kind: 'number' } },
      topEpisodes: { optional: false, shape: { kind: 'number' } },
      habitThresholds: { optional: false, shape: { kind: 'array', element: { kind: 'number' } } },
      trustEpsilon: { optional: false, shape: { kind: 'number' } },
      illnessEpsilon: { optional: false, shape: { kind: 'number' } },
      maxYears: { optional: false, shape: { kind: 'number' } },
      yearActions: { optional: false, shape: { kind: 'number' } },
      yearEpisodes: { optional: false, shape: { kind: 'number' } },
      yearIllnesses: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_COGNITION_DEFAULTS: {
    kind: 'object',
    fields: {
      needScale: { optional: false, shape: { kind: 'number' } },
      dischargedNormFactor: { optional: false, shape: { kind: 'number' } },
      expectationScale: { optional: false, shape: { kind: 'number' } },
      normRefractoryMinutes: { optional: false, shape: { kind: 'number' } },
      normRefractoryFloor: { optional: false, shape: { kind: 'number' } },
      habitScale: { optional: false, shape: { kind: 'number' } },
      emotionScale: { optional: false, shape: { kind: 'number' } },
      socialScale: { optional: false, shape: { kind: 'number' } },
      socialSatiationFloor: { optional: false, shape: { kind: 'number' } },
      effortScale: { optional: false, shape: { kind: 'number' } },
      effortBase: { optional: false, shape: { kind: 'number' } },
      riskScale: { optional: false, shape: { kind: 'number' } },
      companionScale: { optional: false, shape: { kind: 'number' } },
      materialScale: { optional: false, shape: { kind: 'number' } },
      materialWeight: { optional: false, shape: { kind: 'number' } },
      suggestionScale: { optional: false, shape: { kind: 'number' } },
      appealBonus: { optional: false, shape: { kind: 'number' } },
      maxConsidered: { optional: false, shape: { kind: 'number' } },
      reactanceScale: { optional: false, shape: { kind: 'number' } },
      reactanceFrom: { optional: false, shape: { kind: 'number' } },
      reactanceInsist: { optional: false, shape: { kind: 'number' } },
      commitmentInertia: { optional: false, shape: { kind: 'number' } },
      commitmentInertiaFrom: { optional: false, shape: { kind: 'number' } },
      commitmentInertiaFade: { optional: false, shape: { kind: 'number' } },
      jointTrust: { optional: false, shape: { kind: 'number' } },
      togetherScale: { optional: false, shape: { kind: 'number' } },
      fullnessScale: { optional: false, shape: { kind: 'number' } },
      rememberedScale: { optional: false, shape: { kind: 'number' } },
      scarcityMaterialGain: { optional: false, shape: { kind: 'number' } },
      scarcityScaleShrink: { optional: false, shape: { kind: 'number' } },
      scarcitySafetyGain: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CONSCIENCE_DEFAULTS: {
    kind: 'object',
    fields: {
      termScale: { optional: false, shape: { kind: 'number' } },
      fulfilWeight: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            obligatory: { optional: false, shape: { kind: 'number' } },
            recommended: { optional: false, shape: { kind: 'number' } },
            permitted: { optional: false, shape: { kind: 'number' } },
            disliked: { optional: false, shape: { kind: 'number' } },
            forbidden: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      violateWeight: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            obligatory: { optional: false, shape: { kind: 'number' } },
            recommended: { optional: false, shape: { kind: 'number' } },
            permitted: { optional: false, shape: { kind: 'number' } },
            disliked: { optional: false, shape: { kind: 'number' } },
            forbidden: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      breachStandings: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      honestyNorms: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      victimNorms: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      necessityEligible: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      necessityThreshold: { optional: false, shape: { kind: 'number' } },
      abstainVetoConviction: { optional: false, shape: { kind: 'number' } },
      vetoConviction: { optional: false, shape: { kind: 'number' } },
      desperationSoftening: { optional: false, shape: { kind: 'number' } },
      incompleteBreachFactor: { optional: false, shape: { kind: 'number' } },
      repairScale: { optional: false, shape: { kind: 'number' } },
      repentScale: { optional: false, shape: { kind: 'number' } },
      maxBreaches: { optional: false, shape: { kind: 'number' } },
      maxIntentions: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CONVERSATION_DEFAULTS: {
    kind: 'object',
    fields: {
      confidentMin: { optional: false, shape: { kind: 'number' } },
      claimsBase: { optional: false, shape: { kind: 'number' } },
      claimsRange: { optional: false, shape: { kind: 'number' } },
      maxAdvice: { optional: false, shape: { kind: 'number' } },
      relevance: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            confidence: { optional: false, shape: { kind: 'number' } },
            recency: { optional: false, shape: { kind: 'number' } },
            topic: { optional: false, shape: { kind: 'number' } },
            feeling: { optional: false, shape: { kind: 'number' } },
            temptation: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      recencyScale: { optional: false, shape: { kind: 'number' } },
      backbitingScale: { optional: false, shape: { kind: 'number' } },
      lieScale: { optional: false, shape: { kind: 'number' } },
      honestyCost: { optional: false, shape: { kind: 'number' } },
      lyingScale: { optional: false, shape: { kind: 'number' } },
      lieConfidence: { optional: false, shape: { kind: 'number' } },
      standingWeight: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            forbidden: { optional: false, shape: { kind: 'number' } },
            disliked: { optional: false, shape: { kind: 'number' } },
            permitted: { optional: false, shape: { kind: 'number' } },
            recommended: { optional: false, shape: { kind: 'number' } },
            obligatory: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      adviceMin: { optional: false, shape: { kind: 'number' } },
      benevolentAppeal: { optional: false, shape: { kind: 'number' } },
      chatMagnitude: { optional: false, shape: { kind: 'number' } },
      chatPerClaim: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CURIOSITY_DEFAULTS: {
    kind: 'object',
    fields: {
      unknownScale: { optional: false, shape: { kind: 'number' } },
      progressScale: { optional: false, shape: { kind: 'number' } },
      varyScale: { optional: false, shape: { kind: 'number' } },
      recentMinutes: { optional: false, shape: { kind: 'number' } },
      rewardMax: { optional: false, shape: { kind: 'number' } },
      fastAlpha: { optional: false, shape: { kind: 'number' } },
      slowAlpha: { optional: false, shape: { kind: 'number' } },
      maxKeys: { optional: false, shape: { kind: 'number' } },
      maxRecent: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_ENVIRONMENT_DEFAULTS: {
    kind: 'object',
    fields: {
      coldMood: { optional: false, shape: { kind: 'number' } },
      darkMood: { optional: false, shape: { kind: 'number' } },
      shortDayMood: { optional: false, shape: { kind: 'number' } },
      longDayHours: { optional: false, shape: { kind: 'number' } },
      shortDayHours: { optional: false, shape: { kind: 'number' } },
      weatherMood: { optional: false, shape: { kind: 'number' } },
      indoorWeather: { optional: false, shape: { kind: 'number' } },
      beautyMood: { optional: false, shape: { kind: 'number' } },
      crowdingMood: { optional: false, shape: { kind: 'number' } },
      crowdingTolerance: { optional: false, shape: { kind: 'number' } },
      crowdingToleranceExtraversion: { optional: false, shape: { kind: 'number' } },
      coldMetabolism: { optional: false, shape: { kind: 'number' } },
      coldRecovery: { optional: false, shape: { kind: 'number' } },
      coldSleep: { optional: false, shape: { kind: 'number' } },
      darkWake: { optional: false, shape: { kind: 'number' } },
      crowdingAutonomyPerHour: { optional: false, shape: { kind: 'number' } },
      squalorSafetyPerHour: { optional: false, shape: { kind: 'number' } },
      beautyLeisurePerHour: { optional: false, shape: { kind: 'number' } },
      aweBeauty: { optional: false, shape: { kind: 'number' } },
      aweIntensity: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_FAMILY_DEFAULTS: {
    kind: 'object',
    fields: {
      peakCycleChance: { optional: false, shape: { kind: 'number' } },
      cycleDays: { optional: false, shape: { kind: 'number' } },
      gestationDays: { optional: false, shape: { kind: 'number' } },
      gestationSdDays: { optional: false, shape: { kind: 'number' } },
      pregnancyMetabolism: { optional: false, shape: { kind: 'number' } },
      valueRatePerYear: { optional: false, shape: { kind: 'number' } },
      normRatePerYear: { optional: false, shape: { kind: 'number' } },
      breachSaturation: { optional: false, shape: { kind: 'number' } },
      attachmentStart: { optional: false, shape: { kind: 'number' } },
      attachmentRatePerYear: { optional: false, shape: { kind: 'number' } },
      voiceRatePerYear: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_HABIT_DEFAULTS: {
    kind: 'object',
    fields: {
      maxHabits: { optional: false, shape: { kind: 'number' } },
      gain: { optional: false, shape: { kind: 'number' } },
      decayHalfLife: { optional: false, shape: { kind: 'number' } },
      fullSpacing: { optional: false, shape: { kind: 'number' } },
      hourCore: { optional: false, shape: { kind: 'number' } },
      hourFalloff: { optional: false, shape: { kind: 'number' } },
      sameContext: { optional: false, shape: { kind: 'number' } },
      extinction: { optional: false, shape: { kind: 'number' } },
      urgeInterval: { optional: false, shape: { kind: 'number' } },
      urgePeakDays: { optional: false, shape: { kind: 'number' } },
      urgeGain: { optional: false, shape: { kind: 'number' } },
      urgeMax: { optional: false, shape: { kind: 'number' } },
      easeMax: { optional: false, shape: { kind: 'number' } },
      refractory: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_HEALTH_DEFAULTS: {
    kind: 'object',
    fields: {
      smokingRisk: { optional: false, shape: { kind: 'number' } },
      sleepDebtRiskPerHour: { optional: false, shape: { kind: 'number' } },
      maxSleepDebtHours: { optional: false, shape: { kind: 'number' } },
      fitnessRisk: { optional: false, shape: { kind: 'number' } },
      healthMortality: { optional: false, shape: { kind: 'number' } },
      illnessMortality: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_LIFE_DEFAULTS: {
    kind: 'object',
    fields: {
      gompertzBase: { optional: false, shape: { kind: 'number' } },
      gompertzRefAge: { optional: false, shape: { kind: 'number' } },
      gompertzDoublingYears: { optional: false, shape: { kind: 'number' } },
      fitnessDeclinePerYear: { optional: false, shape: { kind: 'number' } },
      fitnessPlateauEnd: { optional: false, shape: { kind: 'number' } },
      recoveryDeclinePerYear: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_MEMORY_DEFAULTS: {
    kind: 'object',
    fields: {
      maxEpisodes: { optional: false, shape: { kind: 'number' } },
      maxProtectedLoss: { optional: false, shape: { kind: 'number' } },
      maxExpectations: { optional: false, shape: { kind: 'number' } },
      halfLifeNeutral: { optional: false, shape: { kind: 'number' } },
      halfLifeEmotional: { optional: false, shape: { kind: 'number' } },
      recencyScale: { optional: false, shape: { kind: 'number' } },
      kindSalience: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            outcome: { optional: false, shape: { kind: 'number' } },
            social: { optional: false, shape: { kind: 'number' } },
            witnessed: { optional: false, shape: { kind: 'number' } },
            told: { optional: false, shape: { kind: 'number' } },
            suggestion: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      defaultKindSalience: { optional: false, shape: { kind: 'number' } },
      valenceSalience: { optional: false, shape: { kind: 'number' } },
      recallBoost: { optional: false, shape: { kind: 'number' } },
      defaultRecallLimit: { optional: false, shape: { kind: 'number' } },
      confidenceK: { optional: false, shape: { kind: 'number' } },
      maxStep: { optional: false, shape: { kind: 'number' } },
      minLearningRate: { optional: false, shape: { kind: 'number' } },
      priorSuccess: { optional: false, shape: { kind: 'number' } },
      citeValence: { optional: false, shape: { kind: 'number' } },
      maxCited: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_GIST_DEFAULTS: {
    kind: 'object',
    fields: {
      maxGists: { optional: false, shape: { kind: 'number' } },
      maxProtectedLoss: { optional: false, shape: { kind: 'number' } },
      horizon: { optional: false, shape: { kind: 'number' } },
      minValence: { optional: false, shape: { kind: 'number' } },
      halfLifeNeutral: { optional: false, shape: { kind: 'number' } },
      halfLifeEmotional: { optional: false, shape: { kind: 'number' } },
      foldGain: { optional: false, shape: { kind: 'number' } },
      maxTags: { optional: false, shape: { kind: 'number' } },
      placeWeight: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_CUE_RECALL_DEFAULTS: {
    kind: 'object',
    fields: {
      weights: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            place: { optional: false, shape: { kind: 'number' } },
            person: { optional: false, shape: { kind: 'number' } },
            action: { optional: false, shape: { kind: 'number' } },
            tags: { optional: false, shape: { kind: 'number' } },
            hour: { optional: false, shape: { kind: 'number' } },
            anniversary: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      deceasedBoost: { optional: false, shape: { kind: 'number' } },
      threshold: { optional: false, shape: { kind: 'number' } },
      minValence: { optional: false, shape: { kind: 'number' } },
      minLossValence: { optional: false, shape: { kind: 'number' } },
      refractory: { optional: false, shape: { kind: 'number' } },
      reappraisal: { optional: false, shape: { kind: 'number' } },
      limit: { optional: false, shape: { kind: 'number' } },
      griefGainBase: { optional: false, shape: { kind: 'number' } },
      griefGainSlope: { optional: false, shape: { kind: 'number' } },
      hourTolerance: { optional: false, shape: { kind: 'number' } },
      lossTags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  Effective_METHOD_DEFAULTS: {
    kind: 'object',
    fields: {
      maxRules: { optional: false, shape: { kind: 'number' } },
      maxConditions: { optional: false, shape: { kind: 'number' } },
      maxCues: { optional: false, shape: { kind: 'number' } },
      maxEvidence: { optional: false, shape: { kind: 'number' } },
      maxRecentDemonstrations: { optional: false, shape: { kind: 'number' } },
      maxIdentifierLength: { optional: false, shape: { kind: 'number' } },
      maxValueLength: { optional: false, shape: { kind: 'number' } },
      contextMinutes: { optional: false, shape: { kind: 'number' } },
      evidenceHalfLife: { optional: false, shape: { kind: 'number' } },
      evidencePrior: { optional: false, shape: { kind: 'number' } },
      utilityScale: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_NEEDS_DEFAULTS: {
    kind: 'object',
    fields: {
      urgencySteepness: { optional: false, shape: { kind: 'number' } },
      urgencyTail: { optional: false, shape: { kind: 'number' } },
      thresholds: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            food: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            water: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            sleep: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            rest: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            relief: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            safety: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            belonging: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            esteem: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            autonomy: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            competence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            leisure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            meaning: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      traitCoefficient: { optional: false, shape: { kind: 'number' } },
      thresholdRange: { optional: false, shape: { kind: 'array', element: { kind: 'number' } } },
      restSleepinessOverlap: { optional: false, shape: { kind: 'number' } },
      asleepRate: { optional: false, shape: { kind: 'number' } },
      belongingAloneHalfLife: { optional: false, shape: { kind: 'number' } },
      belongingAloneTarget: { optional: false, shape: { kind: 'number' } },
      belongingTogetherHalfLife: { optional: false, shape: { kind: 'number' } },
      belongingSocialHalfLife: { optional: false, shape: { kind: 'number' } },
      belongingTogetherTarget: { optional: false, shape: { kind: 'number' } },
      leisureWorkHalfLife: { optional: false, shape: { kind: 'number' } },
      leisureWorkTarget: { optional: false, shape: { kind: 'number' } },
      leisureRecoverHalfLife: { optional: false, shape: { kind: 'number' } },
      leisureRecoverTarget: { optional: false, shape: { kind: 'number' } },
      leisureIdleHalfLife: { optional: false, shape: { kind: 'number' } },
      leisureIdleTarget: { optional: false, shape: { kind: 'number' } },
      autonomyHalfLife: { optional: false, shape: { kind: 'number' } },
      autonomyTarget: { optional: false, shape: { kind: 'number' } },
      competenceHalfLife: { optional: false, shape: { kind: 'number' } },
      competenceTarget: { optional: false, shape: { kind: 'number' } },
      esteemHalfLife: { optional: false, shape: { kind: 'number' } },
      esteemTarget: { optional: false, shape: { kind: 'number' } },
      meaningDecayHalfLife: { optional: false, shape: { kind: 'number' } },
      meaningDecayTarget: { optional: false, shape: { kind: 'number' } },
      meaningRecoverHalfLife: { optional: false, shape: { kind: 'number' } },
      meaningRecoverTarget: { optional: false, shape: { kind: 'number' } },
      safetyHalfLife: { optional: false, shape: { kind: 'number' } },
      safetyTarget: { optional: false, shape: { kind: 'number' } },
      socialTags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      workTags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      leisureTags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      meaningTags: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      minHalfLife: { optional: false, shape: { kind: 'number' } },
      meanFloorWeight: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_PARTNERING_DEFAULTS: {
    kind: 'object',
    fields: {
      warmthGain: { optional: false, shape: { kind: 'number' } },
      warmthHalfLifeDays: { optional: false, shape: { kind: 'number' } },
      readyWarmth: { optional: false, shape: { kind: 'number' } },
      readyMeetings: { optional: false, shape: { kind: 'number' } },
      readyDays: { optional: false, shape: { kind: 'number' } },
      maxCourtships: { optional: false, shape: { kind: 'number' } },
      courtScale: { optional: false, shape: { kind: 'number' } },
      courtFloor: { optional: false, shape: { kind: 'number' } },
      proposalScale: { optional: false, shape: { kind: 'number' } },
      proposalFloor: { optional: false, shape: { kind: 'number' } },
      statusQuo: { optional: false, shape: { kind: 'number' } },
      familyWeight: { optional: false, shape: { kind: 'number' } },
      unavailable: { optional: false, shape: { kind: 'number' } },
      widowhoodEarly: { optional: false, shape: { kind: 'number' } },
      widowhoodEarlyDays: { optional: false, shape: { kind: 'number' } },
      widowhoodMen: { optional: false, shape: { kind: 'number' } },
      widowhoodWomen: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_PERSISTENCE_DEFAULTS: {
    kind: 'object',
    fields: {
      continueScale: { optional: false, shape: { kind: 'number' } },
      switchScale: { optional: false, shape: { kind: 'number' } },
      cap: { optional: false, shape: { kind: 'number' } },
      switchMargin: { optional: false, shape: { kind: 'number' } },
      slackMinutes: { optional: false, shape: { kind: 'number' } },
      maxMinutes: { optional: false, shape: { kind: 'number' } },
      restMinutes: { optional: false, shape: { kind: 'number' } },
      stallHalfLifeMinutes: { optional: false, shape: { kind: 'number' } },
    },
  },
  BodyLoad: {
    kind: 'object',
    fields: {
      effort: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      focus: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      mode: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'awake' },
            { kind: 'literal', value: 'sleep' },
          ],
        },
      },
    },
  },
  Effective_PERSON_DEFAULTS: {
    kind: 'object',
    fields: {
      idleLoad: { optional: false, shape: { kind: 'ref', name: 'BodyLoad' } },
      reviewInterval: { optional: false, shape: { kind: 'number' } },
      sleepReviewInterval: { optional: false, shape: { kind: 'number' } },
      maxTrace: { optional: false, shape: { kind: 'number' } },
      feltBase: { optional: false, shape: { kind: 'number' } },
      feltGain: { optional: false, shape: { kind: 'number' } },
      failedPenalty: { optional: false, shape: { kind: 'number' } },
      missedDistress: { optional: false, shape: { kind: 'number' } },
      missedEsteemCost: { optional: false, shape: { kind: 'number' } },
      participationMagnitude: { optional: false, shape: { kind: 'number' } },
      qualityPenalty: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_PROJECTS_DEFAULTS: {
    kind: 'object',
    fields: {
      maxProspects: { optional: false, shape: { kind: 'number' } },
      maxHistory: { optional: false, shape: { kind: 'number' } },
      forgetMinutes: { optional: false, shape: { kind: 'number' } },
      calmUrgency: { optional: false, shape: { kind: 'number' } },
      fearBelow: { optional: false, shape: { kind: 'number' } },
      adoptEveryMinutes: { optional: false, shape: { kind: 'number' } },
      cooldownMinutes: { optional: false, shape: { kind: 'number' } },
      adoptAppeal: { optional: false, shape: { kind: 'number' } },
      halfLifeMinutes: { optional: false, shape: { kind: 'number' } },
      staleMinutes: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_PROMPTINGS_DEFAULTS: {
    kind: 'object',
    fields: {
      noticeAt: { optional: false, shape: { kind: 'number' } },
      turnMax: { optional: false, shape: { kind: 'number' } },
      survivalDesperation: { optional: false, shape: { kind: 'number' } },
      gainTurned: { optional: false, shape: { kind: 'number' } },
      gainAttempt: { optional: false, shape: { kind: 'number' } },
      practiceHalfLifeDays: { optional: false, shape: { kind: 'number' } },
      faultGuilt: { optional: false, shape: { kind: 'number' } },
      echoScale: { optional: false, shape: { kind: 'number' } },
      echoHalfLifeDays: { optional: false, shape: { kind: 'number' } },
      maxRecent: { optional: false, shape: { kind: 'number' } },
      maxResponses: { optional: false, shape: { kind: 'number' } },
      maxEcho: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_FORECAST_DEFAULTS: {
    kind: 'object',
    fields: {
      comfortAt: { optional: false, shape: { kind: 'number' } },
      spentAt: { optional: false, shape: { kind: 'number' } },
      forecastScale: { optional: false, shape: { kind: 'number' } },
      maxSpans: { optional: false, shape: { kind: 'number' } },
      maxMinutes: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_PROSPECTION_DEFAULTS: {
    kind: 'object',
    fields: {
      maxEntries: { optional: false, shape: { kind: 'number' } },
      maxRevisions: { optional: false, shape: { kind: 'number' } },
      maxBatch: { optional: false, shape: { kind: 'number' } },
      maxIdentifierLength: { optional: false, shape: { kind: 'number' } },
      horizon: { optional: false, shape: { kind: 'number' } },
      maxMaterialCost: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_REVIEW_DEFAULTS: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'number' } },
      resolveScale: { optional: false, shape: { kind: 'number' } },
      gain: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            accounting: { optional: false, shape: { kind: 'number' } },
            ruminating: { optional: false, shape: { kind: 'number' } },
            none: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      keptKeep: { optional: false, shape: { kind: 'number' } },
      halfLifeDays: { optional: false, shape: { kind: 'number' } },
      dropBelow: { optional: false, shape: { kind: 'number' } },
      maxResolves: { optional: false, shape: { kind: 'number' } },
      maxSeen: { optional: false, shape: { kind: 'number' } },
      ruminatePer: { optional: false, shape: { kind: 'number' } },
      ruminateMax: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_SKILL_DEFAULTS: {
    kind: 'object',
    fields: {
      base: { optional: false, shape: { kind: 'number' } },
      retentionFloor: { optional: false, shape: { kind: 'number' } },
      forgetHalfLife: { optional: false, shape: { kind: 'number' } },
      rate0: { optional: false, shape: { kind: 'number' } },
      rateScaleHours: { optional: false, shape: { kind: 'number' } },
      challengeOptimum: { optional: false, shape: { kind: 'number' } },
      challengeWidth: { optional: false, shape: { kind: 'number' } },
      challengeFloor: { optional: false, shape: { kind: 'number' } },
      failureLearning: { optional: false, shape: { kind: 'number' } },
      successSlope: { optional: false, shape: { kind: 'number' } },
      successBias: { optional: false, shape: { kind: 'number' } },
      capacityFloor: { optional: false, shape: { kind: 'number' } },
      supportBonus: { optional: false, shape: { kind: 'number' } },
      qualityLow: { optional: false, shape: { kind: 'number' } },
      qualityHigh: { optional: false, shape: { kind: 'number' } },
      instructionGain: { optional: false, shape: { kind: 'number' } },
      instructionGapScale: { optional: false, shape: { kind: 'number' } },
      observeRate: { optional: false, shape: { kind: 'number' } },
      observeCeiling: { optional: false, shape: { kind: 'number' } },
      consolidationHours: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_GROUP_DEFAULTS: {
    kind: 'object',
    fields: {
      insider: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            affection: { optional: false, shape: { kind: 'number' } },
            trust: { optional: false, shape: { kind: 'number' } },
            familiarity: { optional: false, shape: { kind: 'number' } },
            respect: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      outsider: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            affection: { optional: false, shape: { kind: 'number' } },
            trust: { optional: false, shape: { kind: 'number' } },
            familiarity: { optional: false, shape: { kind: 'number' } },
            respect: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      stanceTrust: { optional: false, shape: { kind: 'number' } },
      stanceAffection: { optional: false, shape: { kind: 'number' } },
      insiderCare: { optional: false, shape: { kind: 'number' } },
      outsiderThreat: { optional: false, shape: { kind: 'number' } },
      threatChance: { optional: false, shape: { kind: 'number' } },
      maxGroups: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_IMPRESSION_DEFAULTS: {
    kind: 'object',
    fields: {
      halfLife: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            state: { optional: false, shape: { kind: 'number' } },
            place: { optional: false, shape: { kind: 'number' } },
            trait: { optional: false, shape: { kind: 'number' } },
            tie: { optional: false, shape: { kind: 'number' } },
            trust: { optional: false, shape: { kind: 'number' } },
            skill: { optional: false, shape: { kind: 'number' } },
            regard: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      priorWeight: { optional: false, shape: { kind: 'number' } },
      noise: { optional: false, shape: { kind: 'number' } },
      prior: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            fatigue: { optional: false, shape: { kind: 'number' } },
            pain: { optional: false, shape: { kind: 'number' } },
            fear: { optional: false, shape: { kind: 'number' } },
            mood: { optional: false, shape: { kind: 'number' } },
            place: { optional: false, shape: { kind: 'number' } },
            trait: { optional: false, shape: { kind: 'number' } },
            tie: { optional: false, shape: { kind: 'number' } },
            trust: { optional: false, shape: { kind: 'number' } },
            skill: { optional: false, shape: { kind: 'number' } },
            regard: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      reserve: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            base: { optional: false, shape: { kind: 'number' } },
            emotionalityCoef: { optional: false, shape: { kind: 'number' } },
            fatigue: { optional: false, shape: { kind: 'number' } },
            mood: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      wordsReserve: { optional: false, shape: { kind: 'number' } },
      actTraitWeight: { optional: false, shape: { kind: 'number' } },
      actTraits: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            flee: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  emotionality: { optional: false, shape: { kind: 'number' } },
                  conscientiousness: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            freeze: {
              optional: false,
              shape: {
                kind: 'object',
                fields: { emotionality: { optional: false, shape: { kind: 'number' } } },
              },
            },
            steady: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  emotionality: { optional: false, shape: { kind: 'number' } },
                  conscientiousness: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            help: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  agreeableness: { optional: false, shape: { kind: 'number' } },
                  honesty: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            care: {
              optional: false,
              shape: {
                kind: 'object',
                fields: { agreeableness: { optional: false, shape: { kind: 'number' } } },
              },
            },
            anger: {
              optional: false,
              shape: {
                kind: 'object',
                fields: { agreeableness: { optional: false, shape: { kind: 'number' } } },
              },
            },
            refuse: {
              optional: false,
              shape: {
                kind: 'object',
                fields: { agreeableness: { optional: false, shape: { kind: 'number' } } },
              },
            },
            defer: {
              optional: false,
              shape: {
                kind: 'object',
                fields: { conscientiousness: { optional: false, shape: { kind: 'number' } } },
              },
            },
            complain: {
              optional: false,
              shape: {
                kind: 'object',
                fields: { emotionality: { optional: false, shape: { kind: 'number' } } },
              },
            },
          },
        },
      },
      acquaintWeight: { optional: false, shape: { kind: 'number' } },
      acquaintNoise: { optional: false, shape: { kind: 'number' } },
      maxImpressions: { optional: false, shape: { kind: 'number' } },
      maxCues: { optional: false, shape: { kind: 'number' } },
    },
  },
  Effective_SOCIAL_DEFAULTS: {
    kind: 'object',
    fields: {
      maxRelationships: { optional: false, shape: { kind: 'number' } },
      defaultTrust: { optional: false, shape: { kind: 'number' } },
      familyRoles: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      roleBaselines: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            spouse: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            parent: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            child: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            sibling: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            grandparent: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            grandchild: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            friend: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            colleague: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            neighbor: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
            leader: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  affection: { optional: false, shape: { kind: 'number' } },
                  trust: { optional: false, shape: { kind: 'number' } },
                  familiarity: { optional: false, shape: { kind: 'number' } },
                  respect: { optional: false, shape: { kind: 'number' } },
                },
              },
            },
          },
        },
      },
      negativityBias: { optional: false, shape: { kind: 'number' } },
      familiarityGain: { optional: false, shape: { kind: 'number' } },
      familiarityHalfLife: { optional: false, shape: { kind: 'number' } },
      affectionHalfLife: { optional: false, shape: { kind: 'number' } },
      forgiveRestore: { optional: false, shape: { kind: 'number' } },
      ledgerLimit: { optional: false, shape: { kind: 'number' } },
      terms: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            affection: { optional: false, shape: { kind: 'number' } },
            belonging: { optional: false, shape: { kind: 'number' } },
            benevolence: { optional: false, shape: { kind: 'number' } },
            group: { optional: false, shape: { kind: 'number' } },
            groupFrom: { optional: false, shape: { kind: 'number' } },
            regardRepair: { optional: false, shape: { kind: 'number' } },
            regardRepairMax: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      judge: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            respect: { optional: false, shape: { kind: 'number' } },
            trustLoss: { optional: false, shape: { kind: 'number' } },
            trustGain: { optional: false, shape: { kind: 'number' } },
            harmToClose: { optional: false, shape: { kind: 'number' } },
            witnessFamiliarity: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
    },
  },
  Effective_REPUTATION_DEFAULTS: {
    kind: 'object',
    fields: { familiarityDamping: { optional: false, shape: { kind: 'number' } } },
  },
  Effective_WILL_DEFAULTS: {
    kind: 'object',
    fields: {
      switchMargin: { optional: false, shape: { kind: 'number' } },
      temperature: { optional: false, shape: { kind: 'number' } },
      maxVoices: { optional: false, shape: { kind: 'number' } },
      defaultVoiceTrust: { optional: false, shape: { kind: 'number' } },
      effortCapacityRatio: { optional: false, shape: { kind: 'number' } },
      skillGap: { optional: false, shape: { kind: 'number' } },
      jointSkillSupport: { optional: false, shape: { kind: 'number' } },
      wakeDesperation: { optional: false, shape: { kind: 'number' } },
      distrustTrust: { optional: false, shape: { kind: 'number' } },
      distrustPressure: { optional: false, shape: { kind: 'number' } },
      distrustEpisodeTrust: { optional: false, shape: { kind: 'number' } },
      distrustWindow: { optional: false, shape: { kind: 'number' } },
      distrustValence: { optional: false, shape: { kind: 'number' } },
      distrustSalience: { optional: false, shape: { kind: 'number' } },
      omissionConviction: { optional: false, shape: { kind: 'number' } },
      omissionFraction: { optional: false, shape: { kind: 'number' } },
      maxVoiceHistory: { optional: false, shape: { kind: 'number' } },
      maxPrecommitments: { optional: false, shape: { kind: 'number' } },
      historyEpsilon: { optional: false, shape: { kind: 'number' } },
      complyAutonomyCost: { optional: false, shape: { kind: 'number' } },
      pressurePush: { optional: false, shape: { kind: 'number' } },
      pressureInsist: { optional: false, shape: { kind: 'number' } },
      pressureHalfLife: { optional: false, shape: { kind: 'number' } },
      trustGain: { optional: false, shape: { kind: 'number' } },
      trustLoss: { optional: false, shape: { kind: 'number' } },
      trustLossComplied: { optional: false, shape: { kind: 'number' } },
      trustLossPushed: { optional: false, shape: { kind: 'number' } },
      trustLossWorn: { optional: false, shape: { kind: 'number' } },
      wornInterval: { optional: false, shape: { kind: 'number' } },
      creditHalfLife: { optional: false, shape: { kind: 'number' } },
      maxCredited: { optional: false, shape: { kind: 'number' } },
      inertiaFloor: { optional: false, shape: { kind: 'number' } },
      promiseKeptGain: { optional: false, shape: { kind: 'number' } },
      promiseBrokenLoss: { optional: false, shape: { kind: 'number' } },
      survivalDesperation: { optional: false, shape: { kind: 'number' } },
      survivalNeedUrgency: { optional: false, shape: { kind: 'number' } },
      sleepinessFloor: { optional: false, shape: { kind: 'number' } },
      wakeCommitmentPressure: { optional: false, shape: { kind: 'number' } },
      maxAdvice: { optional: false, shape: { kind: 'number' } },
      adviceHalfLife: { optional: false, shape: { kind: 'number' } },
      adviceFloor: { optional: false, shape: { kind: 'number' } },
      adviceStrength: { optional: false, shape: { kind: 'number' } },
      commandAutonomyCost: { optional: false, shape: { kind: 'number' } },
      commandAutonomyPerHour: { optional: false, shape: { kind: 'number' } },
      commandPressurePerHour: { optional: false, shape: { kind: 'number' } },
      commandTrustPerHour: { optional: false, shape: { kind: 'number' } },
    },
  },
  EffectiveBuiltins: {
    kind: 'object',
    fields: {
      RETELL_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_RETELL_DEFAULTS' } },
      AFFECT_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_AFFECT_DEFAULTS' } },
      CRISIS_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CRISIS_DEFAULTS' } },
      AGENDA_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_AGENDA_DEFAULTS' } },
      EXEMPTION_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_EXEMPTION_DEFAULTS' } },
      PURPOSE_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_PURPOSE_DEFAULTS' } },
      CARE_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CARE_DEFAULTS' } },
      BELIEF_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_BELIEF_DEFAULTS' } },
      BLADDER_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_BLADDER_DEFAULTS' } },
      BODY_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_BODY_DEFAULTS' } },
      DOZE_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_DOZE_DEFAULTS' } },
      INJURY_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_INJURY_DEFAULTS' } },
      CHARACTER_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CHARACTER_DEFAULTS' } },
      CHRONICLE_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CHRONICLE_DEFAULTS' } },
      COGNITION_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_COGNITION_DEFAULTS' } },
      CONSCIENCE_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CONSCIENCE_DEFAULTS' } },
      CONVERSATION_DEFAULTS: {
        optional: false,
        shape: { kind: 'ref', name: 'Effective_CONVERSATION_DEFAULTS' },
      },
      CURIOSITY_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CURIOSITY_DEFAULTS' } },
      ENVIRONMENT_DEFAULTS: {
        optional: false,
        shape: { kind: 'ref', name: 'Effective_ENVIRONMENT_DEFAULTS' },
      },
      FAMILY_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_FAMILY_DEFAULTS' } },
      HABIT_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_HABIT_DEFAULTS' } },
      HEALTH_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_HEALTH_DEFAULTS' } },
      LIFE_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_LIFE_DEFAULTS' } },
      MEMORY_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_MEMORY_DEFAULTS' } },
      GIST_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_GIST_DEFAULTS' } },
      CUE_RECALL_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_CUE_RECALL_DEFAULTS' } },
      METHOD_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_METHOD_DEFAULTS' } },
      NEEDS_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_NEEDS_DEFAULTS' } },
      PARTNERING_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_PARTNERING_DEFAULTS' } },
      PERSISTENCE_DEFAULTS: {
        optional: false,
        shape: { kind: 'ref', name: 'Effective_PERSISTENCE_DEFAULTS' },
      },
      PERSON_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_PERSON_DEFAULTS' } },
      PROJECTS_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_PROJECTS_DEFAULTS' } },
      PROMPTINGS_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_PROMPTINGS_DEFAULTS' } },
      FORECAST_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_FORECAST_DEFAULTS' } },
      PROSPECTION_DEFAULTS: {
        optional: false,
        shape: { kind: 'ref', name: 'Effective_PROSPECTION_DEFAULTS' },
      },
      REVIEW_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_REVIEW_DEFAULTS' } },
      SKILL_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_SKILL_DEFAULTS' } },
      GROUP_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_GROUP_DEFAULTS' } },
      IMPRESSION_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_IMPRESSION_DEFAULTS' } },
      SOCIAL_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_SOCIAL_DEFAULTS' } },
      REPUTATION_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_REPUTATION_DEFAULTS' } },
      WILL_DEFAULTS: { optional: false, shape: { kind: 'ref', name: 'Effective_WILL_DEFAULTS' } },
    },
  },
  BreakBehaviour: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      label: { optional: true, shape: { kind: 'string' } },
      weight: { optional: false, shape: { kind: 'number' } },
      actions: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      tags: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      durationRangeMs: {
        optional: false,
        shape: {
          kind: 'tuple',
          elements: [
            { kind: 'scalar', name: 'DurationMs' },
            { kind: 'scalar', name: 'DurationMs' },
          ],
        },
      },
    },
  },
  ChronicConditionData: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      baseHazard: { optional: false, shape: { kind: 'number' } },
      refAge: { optional: false, shape: { kind: 'number' } },
      doublingYears: { optional: false, shape: { kind: 'number' } },
      severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      sources: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SourceCitation' } },
      },
    },
  },
  FacultyParameters: {
    kind: 'object',
    fields: {
      builtins: { optional: false, shape: { kind: 'ref', name: 'EffectiveBuiltins' } },
      fixedPriors: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            downing: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  moving: { optional: false, shape: { kind: 'literal', value: 0.2 } },
                  health: { optional: false, shape: { kind: 'literal', value: 0.3 } },
                },
              },
            },
            crisisRepertoire: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'BreakBehaviour' } },
            },
            chronicConditions: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'ChronicConditionData' } },
            },
            inheritance: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  traitSlope: { optional: false, shape: { kind: 'literal', value: 0.3 } },
                  traitSd: { optional: false, shape: { kind: 'literal', value: 0.15 } },
                  aptitudeLogSlope: { optional: false, shape: { kind: 'literal', value: 0.5 } },
                  aptitudeLogSd: { optional: false, shape: { kind: 'literal', value: 0.25 } },
                  traitClamp: {
                    optional: false,
                    shape: {
                      kind: 'tuple',
                      elements: [
                        { kind: 'literal', value: 0.02 },
                        { kind: 'literal', value: 0.98 },
                      ],
                    },
                  },
                  aptitudeClamp: {
                    optional: false,
                    shape: {
                      kind: 'tuple',
                      elements: [
                        { kind: 'literal', value: 0.25 },
                        { kind: 'literal', value: 4 },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      planning: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            depth: { optional: false, shape: { kind: 'number' } },
            presentBias: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      assent: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            minStrength: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            pressure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      doze: {
        optional: false,
        shape: { kind: 'object', fields: { hazardScale: { optional: false, shape: { kind: 'number' } } } },
      },
      crisis: {
        optional: false,
        shape: { kind: 'object', fields: { hazardScale: { optional: false, shape: { kind: 'number' } } } },
      },
      promptings: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            practiceHalfLifeDays: { optional: false, shape: { kind: 'number' } },
            echoRate: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
    },
  },
  EffectiveParameters: { kind: 'ref', name: 'FacultyParameters' },
  ParameterPath: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'builtin' } },
          record: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'RETELL_DEFAULTS' },
                { kind: 'literal', value: 'AFFECT_DEFAULTS' },
                { kind: 'literal', value: 'CRISIS_DEFAULTS' },
                { kind: 'literal', value: 'AGENDA_DEFAULTS' },
                { kind: 'literal', value: 'EXEMPTION_DEFAULTS' },
                { kind: 'literal', value: 'PURPOSE_DEFAULTS' },
                { kind: 'literal', value: 'CARE_DEFAULTS' },
                { kind: 'literal', value: 'BELIEF_DEFAULTS' },
                { kind: 'literal', value: 'BLADDER_DEFAULTS' },
                { kind: 'literal', value: 'BODY_DEFAULTS' },
                { kind: 'literal', value: 'DOZE_DEFAULTS' },
                { kind: 'literal', value: 'INJURY_DEFAULTS' },
                { kind: 'literal', value: 'CHARACTER_DEFAULTS' },
                { kind: 'literal', value: 'CHRONICLE_DEFAULTS' },
                { kind: 'literal', value: 'COGNITION_DEFAULTS' },
                { kind: 'literal', value: 'CONSCIENCE_DEFAULTS' },
                { kind: 'literal', value: 'CONVERSATION_DEFAULTS' },
                { kind: 'literal', value: 'CURIOSITY_DEFAULTS' },
                { kind: 'literal', value: 'ENVIRONMENT_DEFAULTS' },
                { kind: 'literal', value: 'FAMILY_DEFAULTS' },
                { kind: 'literal', value: 'HABIT_DEFAULTS' },
                { kind: 'literal', value: 'HEALTH_DEFAULTS' },
                { kind: 'literal', value: 'LIFE_DEFAULTS' },
                { kind: 'literal', value: 'MEMORY_DEFAULTS' },
                { kind: 'literal', value: 'GIST_DEFAULTS' },
                { kind: 'literal', value: 'CUE_RECALL_DEFAULTS' },
                { kind: 'literal', value: 'METHOD_DEFAULTS' },
                { kind: 'literal', value: 'NEEDS_DEFAULTS' },
                { kind: 'literal', value: 'PARTNERING_DEFAULTS' },
                { kind: 'literal', value: 'PERSISTENCE_DEFAULTS' },
                { kind: 'literal', value: 'PERSON_DEFAULTS' },
                { kind: 'literal', value: 'PROJECTS_DEFAULTS' },
                { kind: 'literal', value: 'PROMPTINGS_DEFAULTS' },
                { kind: 'literal', value: 'FORECAST_DEFAULTS' },
                { kind: 'literal', value: 'PROSPECTION_DEFAULTS' },
                { kind: 'literal', value: 'REVIEW_DEFAULTS' },
                { kind: 'literal', value: 'SKILL_DEFAULTS' },
                { kind: 'literal', value: 'GROUP_DEFAULTS' },
                { kind: 'literal', value: 'IMPRESSION_DEFAULTS' },
                { kind: 'literal', value: 'SOCIAL_DEFAULTS' },
                { kind: 'literal', value: 'REPUTATION_DEFAULTS' },
                { kind: 'literal', value: 'WILL_DEFAULTS' },
              ],
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'fixed-prior' } },
          field: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'downing' },
                { kind: 'literal', value: 'crisisRepertoire' },
                { kind: 'literal', value: 'chronicConditions' },
                { kind: 'literal', value: 'inheritance' },
              ],
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'tuning' } },
          field: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'planning' },
                { kind: 'literal', value: 'assent' },
                { kind: 'literal', value: 'doze' },
                { kind: 'literal', value: 'crisis' },
                { kind: 'literal', value: 'promptings' },
              ],
            },
          },
        },
      },
    ],
  },
  ParameterProvenance: {
    kind: 'object',
    fields: {
      path: { optional: false, shape: { kind: 'ref', name: 'ParameterPath' } },
      source: { optional: false, shape: { kind: 'ref', name: 'SourceCitation' } },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'source-engineering' },
            { kind: 'literal', value: 'provisional-unfitted' },
            { kind: 'literal', value: 'authored-tuning' },
          ],
        },
      },
    },
  },
  Phase: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 0 },
      { kind: 'literal', value: 1 },
      { kind: 'literal', value: 2 },
      { kind: 'literal', value: 3 },
      { kind: 'literal', value: 4 },
      { kind: 'literal', value: 5 },
      { kind: 'literal', value: 6 },
    ],
  },
  SchedulerCursor: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      closed: { optional: false, shape: { kind: 'boolean' } },
      phase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
      fidelity: { optional: false, shape: { kind: 'ref', name: 'Fidelity' } },
      frameOrdinal: { optional: false, shape: { kind: 'number' } },
      localOrdinal: { optional: false, shape: { kind: 'number' } },
      resolutionLane: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'scalar', name: 'RequestId' } },
      },
    },
  },
  MakeUpRetirementReceipt: {
    kind: 'object',
    fields: {
      owed: { optional: false, shape: { kind: 'ref', name: 'OwedMakeUp' } },
      commitment: { optional: false, shape: { kind: 'ref', name: 'Commitment' } },
      recordedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  SuggestionResolution: {
    kind: 'object',
    fields: {
      assentCost: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            pressure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            provenance: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
      decidedBy: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            kind: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'inertia' },
                  { kind: 'literal', value: 'term' },
                ],
              },
            },
            source: { optional: true, shape: { kind: 'string' } },
            margin: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      voiceId: { optional: false, shape: { kind: 'ref', name: 'EntityId' } },
      verdict: { optional: false, shape: { kind: 'ref', name: 'SuggestionVerdict' } },
      kind: { optional: true, shape: { kind: 'ref', name: 'RefusalKind' } },
      insteadAffordanceId: { optional: true, shape: { kind: 'string' } },
      counterOffer: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            affordanceId: { optional: true, shape: { kind: 'string' } },
            label: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
      reason: { optional: false, shape: { kind: 'string' } },
      likelihood: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      episodeId: { optional: true, shape: { kind: 'string' } },
      commitmentId: { optional: true, shape: { kind: 'string' } },
      insisted: { optional: true, shape: { kind: 'boolean' } },
      margin: { optional: true, shape: { kind: 'number' } },
    },
  },
  Term: {
    kind: 'object',
    fields: {
      source: { optional: false, shape: { kind: 'string' } },
      value: { optional: false, shape: { kind: 'number' } },
      ref: { optional: true, shape: { kind: 'string' } },
    },
  },
  Considered: {
    kind: 'object',
    fields: {
      affordanceId: { optional: false, shape: { kind: 'string' } },
      action: { optional: false, shape: { kind: 'string' } },
      label: { optional: true, shape: { kind: 'string' } },
      utility: { optional: false, shape: { kind: 'number' } },
      terms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Term' } } },
      vetoed: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            kind: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'cannot' },
                  { kind: 'literal', value: 'willNot' },
                ],
              },
            },
            reason: { optional: false, shape: { kind: 'string' } },
            omission: { optional: true, shape: { kind: 'string' } },
          },
        },
      },
      advertised: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            food: { optional: true, shape: { kind: 'number' } },
            water: { optional: true, shape: { kind: 'number' } },
            sleep: { optional: true, shape: { kind: 'number' } },
            rest: { optional: true, shape: { kind: 'number' } },
            relief: { optional: true, shape: { kind: 'number' } },
            safety: { optional: true, shape: { kind: 'number' } },
            belonging: { optional: true, shape: { kind: 'number' } },
            esteem: { optional: true, shape: { kind: 'number' } },
            autonomy: { optional: true, shape: { kind: 'number' } },
            competence: { optional: true, shape: { kind: 'number' } },
            leisure: { optional: true, shape: { kind: 'number' } },
            meaning: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
      believed: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            food: { optional: true, shape: { kind: 'number' } },
            water: { optional: true, shape: { kind: 'number' } },
            sleep: { optional: true, shape: { kind: 'number' } },
            rest: { optional: true, shape: { kind: 'number' } },
            relief: { optional: true, shape: { kind: 'number' } },
            safety: { optional: true, shape: { kind: 'number' } },
            belonging: { optional: true, shape: { kind: 'number' } },
            esteem: { optional: true, shape: { kind: 'number' } },
            autonomy: { optional: true, shape: { kind: 'number' } },
            competence: { optional: true, shape: { kind: 'number' } },
            leisure: { optional: true, shape: { kind: 'number' } },
            meaning: { optional: true, shape: { kind: 'number' } },
          },
        },
      },
      recalled: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  DecisionRecord: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      chosenAffordanceId: {
        optional: false,
        shape: { kind: 'union', options: [{ kind: 'string' }, { kind: 'literal', value: null }] },
      },
      chosenAction: {
        optional: false,
        shape: { kind: 'union', options: [{ kind: 'string' }, { kind: 'literal', value: null }] },
      },
      considered: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Considered' } } },
      suggestion: { optional: true, shape: { kind: 'ref', name: 'SuggestionResolution' } },
      intention: { optional: false, shape: { kind: 'string' } },
      review: { optional: true, shape: { kind: 'boolean' } },
      interrupt: { optional: true, shape: { kind: 'string' } },
      reconsider: { optional: true, shape: { kind: 'literal', value: true } },
      suggestions: {
        optional: true,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SuggestionResolution' } },
      },
    },
  },
  ToldClaimData: {
    kind: 'object',
    fields: {
      prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      value: { optional: false, shape: { kind: 'boolean' } },
      confidence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      speakerCredence: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      deceit: { optional: false, shape: { kind: 'boolean' } },
      backbiting: { optional: false, shape: { kind: 'boolean' } },
      about: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      score: { optional: false, shape: { kind: 'number' } },
      origin: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      lineage: { optional: true, shape: { kind: 'string' } },
    },
  },
  CommunicationItem: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      data: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'claim' } },
                told: { optional: false, shape: { kind: 'ref', name: 'PerceptClaim' } },
                private: { optional: false, shape: { kind: 'ref', name: 'ToldClaimData' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'gist' } },
                sourceGistId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                gist: { optional: false, shape: { kind: 'ref', name: 'Gist' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'advice' } },
                percept: { optional: false, shape: { kind: 'ref', name: 'PerceptData' } },
                suggestion: { optional: false, shape: { kind: 'ref', name: 'SuggestionData' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'social-act' } },
                speaker: { optional: false, shape: { kind: 'ref', name: 'SocialEventData' } },
                listener: { optional: false, shape: { kind: 'ref', name: 'SocialEventData' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'speaker-deed' } },
                norms: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'NormTag' } },
                },
              },
            },
          ],
        },
      },
    },
  },
  CommunicationRequest: {
    kind: 'object',
    fields: {
      kind: { optional: false, shape: { kind: 'literal', value: 'communication' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'RequestId' } },
      requestHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
      issuedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      boundaryAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      worldRevision: { optional: false, shape: { kind: 'number' } },
      speaker: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      recipients: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'scalar', name: 'PersonId' } },
      },
      items: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'CommunicationItem' } },
      },
    },
  },
  TermSource: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'habit' },
      { kind: 'literal', value: 'effort' },
      { kind: 'literal', value: 'risk' },
      { kind: 'literal', value: 'expectation' },
      { kind: 'literal', value: 'autonomy' },
      { kind: 'literal', value: 'commitment' },
      { kind: 'literal', value: 'memory' },
      { kind: 'literal', value: 'material' },
      { kind: 'literal', value: 'need:bladder' },
      { kind: 'literal', value: 'forecast:body' },
      { kind: 'literal', value: 'promptings:turn' },
      { kind: 'literal', value: 'promptings:echo' },
      { kind: 'literal', value: 'review:resolve' },
      {
        kind: 'pattern',
        pattern:
          '^need:(?:(?:food|water|sleep|rest|relief)|(?:safety|belonging|esteem|autonomy|competence|leisure|meaning))$',
      },
      { kind: 'pattern', pattern: '^norm:.*$' },
      { kind: 'pattern', pattern: '^commitment:.*$' },
      { kind: 'pattern', pattern: '^goal:.*$' },
      {
        kind: 'pattern',
        pattern:
          '^emotion:(?:joy|distress|hope|fear|relief|disappointment|pride|shame|gratitude|anger|guilt|love|grief|awe|boredom|loneliness):.*$',
      },
      { kind: 'pattern', pattern: '^emotion:.*$' },
      { kind: 'pattern', pattern: '^avoid:.*$' },
      { kind: 'pattern', pattern: '^joint:.*$' },
      { kind: 'pattern', pattern: '^companion:.*$' },
      { kind: 'pattern', pattern: '^precommit:.*$' },
      { kind: 'pattern', pattern: '^abstain:.*$' },
      { kind: 'pattern', pattern: '^pursuit:.*$' },
      { kind: 'pattern', pattern: '^suggestion:.*$' },
      { kind: 'pattern', pattern: '^social:.*$' },
      { kind: 'pattern', pattern: '^regard:.*$' },
      { kind: 'pattern', pattern: '^together:.*$' },
      { kind: 'pattern', pattern: '^method:.*$' },
      { kind: 'pattern', pattern: '^curiosity:.*$' },
      { kind: 'pattern', pattern: '^project:.*$' },
      { kind: 'pattern', pattern: '^persistence:.*$' },
      { kind: 'pattern', pattern: '^full:(?:food|water|sleep|rest|relief)$' },
      { kind: 'pattern', pattern: '^partner:.*$' },
      { kind: 'pattern', pattern: '^prospection:.*$' },
      { kind: 'pattern', pattern: '^conscience:.*$' },
    ],
  },
  TermData: {
    kind: 'object',
    fields: {
      source: { optional: false, shape: { kind: 'ref', name: 'TermSource' } },
      value: { optional: false, shape: { kind: 'number' } },
      ref: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  MethodEvidence: {
    kind: 'object',
    fields: {
      support: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      terms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'TermData' } } },
      matched: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              support: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            },
          },
        },
      },
    },
  },
  Injury: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      part: { optional: false, shape: { kind: 'string' } },
      severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      healRatePerDay: { optional: false, shape: { kind: 'number' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      affects: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            moving: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            manipulation: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            sight: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      bleeding: { optional: true, shape: { kind: 'number' } },
      tendedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Illness: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'string' } },
      kind: { optional: false, shape: { kind: 'string' } },
      severity: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      trendPerDay: { optional: false, shape: { kind: 'number' } },
      contagious: { optional: false, shape: { kind: 'boolean' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      chronic: { optional: true, shape: { kind: 'boolean' } },
      baseline: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      aggravatedBy: { optional: true, shape: { kind: 'array', element: { kind: 'string' } } },
    },
  },
  BodyChange: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'consumed' } },
          received: { optional: false, shape: { kind: 'ref', name: 'ConsumedAmounts' } },
          receiptId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'exerted' } },
          costs: { optional: false, shape: { kind: 'ref', name: 'ExertionAmounts' } },
          receiptId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'injured' } },
          injury: { optional: false, shape: { kind: 'ref', name: 'Injury' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'illness' } },
          illness: { optional: false, shape: { kind: 'ref', name: 'Illness' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'downed' } },
          since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          reason: { optional: false, shape: { kind: 'string' } },
          until: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'stood' } },
          ended: { optional: false, shape: { kind: 'ref', name: 'TimeSpan' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'dozed' } },
          since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'woke' } },
          slept: { optional: false, shape: { kind: 'ref', name: 'TimeSpan' } },
          evidenceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'died' } },
          discoveredAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'voided' } },
          receiptId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
    ],
  },
  FacultyId: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'run' },
      { kind: 'literal', value: 'body' },
      { kind: 'literal', value: 'affect' },
      { kind: 'literal', value: 'crisis' },
      { kind: 'literal', value: 'environment' },
      { kind: 'literal', value: 'family' },
      { kind: 'literal', value: 'lifecourse' },
      { kind: 'literal', value: 'partnering' },
      { kind: 'literal', value: 'agenda' },
      { kind: 'literal', value: 'beliefs' },
      { kind: 'literal', value: 'cognition' },
      { kind: 'literal', value: 'conscience' },
      { kind: 'literal', value: 'curiosity' },
      { kind: 'literal', value: 'habits' },
      { kind: 'literal', value: 'methods' },
      { kind: 'literal', value: 'needs' },
      { kind: 'literal', value: 'persistence' },
      { kind: 'literal', value: 'projects' },
      { kind: 'literal', value: 'prospection' },
      { kind: 'literal', value: 'skills' },
      { kind: 'literal', value: 'social' },
      { kind: 'literal', value: 'will' },
      { kind: 'literal', value: 'character' },
      { kind: 'literal', value: 'chronicle' },
      { kind: 'literal', value: 'conversation' },
      { kind: 'literal', value: 'memory' },
      { kind: 'literal', value: 'promptings' },
      { kind: 'literal', value: 'review' },
      { kind: 'literal', value: 'renderer' },
    ],
  },
  InputDisposition: {
    kind: 'object',
    fields: {
      inputId: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      owner: { optional: false, shape: { kind: 'ref', name: 'FacultyId' } },
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'consumed' },
            { kind: 'literal', value: 'inapplicable' },
          ],
        },
      },
      reason: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'applied' },
            { kind: 'literal', value: 'actor-dead' },
            { kind: 'literal', value: 'activity-ended' },
            { kind: 'literal', value: 'offer-withdrawn' },
            { kind: 'literal', value: 'context-ended' },
            { kind: 'literal', value: 'goal-closed' },
            { kind: 'literal', value: 'pregnancy-ended' },
            { kind: 'literal', value: 'bond-ended' },
            { kind: 'literal', value: 'world-revision-changed' },
          ],
        },
      },
      evidenceIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      causeIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
    },
  },
  ConversationData: {
    kind: 'object',
    fields: {
      speaker: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      listener: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      claims: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'ToldClaimData' } } },
      withheld: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              reason: { optional: false, shape: { kind: 'string' } },
            },
          },
        },
      },
      norms: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'NormTag' } } },
      advice: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              percept: { optional: false, shape: { kind: 'ref', name: 'PerceptData' } },
              suggestion: { optional: false, shape: { kind: 'ref', name: 'SuggestionData' } },
            },
          },
        },
      },
      socialEvents: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            speaker: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'SocialEventData' } },
            },
            listener: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'SocialEventData' } },
            },
          },
        },
      },
    },
  },
  YearRecord: {
    kind: 'object',
    fields: {
      year: { optional: false, shape: { kind: 'number' } },
      days: { optional: false, shape: { kind: 'number' } },
      routineDays: { optional: false, shape: { kind: 'number' } },
      mood: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      moodLow: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      moodHigh: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      kept: { optional: false, shape: { kind: 'number' } },
      broken: { optional: false, shape: { kind: 'number' } },
      released: { optional: false, shape: { kind: 'number' } },
      breaches: { optional: false, shape: { kind: 'number' } },
      repairs: { optional: false, shape: { kind: 'number' } },
      material: { optional: false, shape: { kind: 'number' } },
      decisions: { optional: false, shape: { kind: 'number' } },
      actions: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              action: { optional: false, shape: { kind: 'string' } },
              days: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      episodes: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'string' } },
              day: { optional: false, shape: { kind: 'number' } },
              summary: { optional: false, shape: { kind: 'string' } },
              valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
              salience: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
            },
          },
        },
      },
      illness: { optional: false, shape: { kind: 'array', element: { kind: 'string' } } },
      alive: { optional: false, shape: { kind: 'boolean' } },
    },
  },
  EventData: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'observation-attended' } },
          evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          perceptId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          attention: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          episodeId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          deliveredAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          occurredAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          summary: { optional: true, shape: { kind: 'string' } },
          died: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'make-ups-retired' } },
          receipts: {
            optional: false,
            shape: { kind: 'array', element: { kind: 'ref', name: 'MakeUpRetirementReceipt' } },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'suggestion-resolved' } },
          adviceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          decisionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          resolution: { optional: false, shape: { kind: 'ref', name: 'SuggestionResolution' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'decision' } },
          decision: { optional: false, shape: { kind: 'ref', name: 'DecisionRecord' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'action-requested' } },
          request: { optional: false, shape: { kind: 'ref', name: 'ActionRequest' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'communication-requested' } },
          request: { optional: false, shape: { kind: 'ref', name: 'CommunicationRequest' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'communication-settled' } },
          requestId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          received: {
            optional: false,
            shape: { kind: 'array', element: { kind: 'ref', name: 'CommunicationReception' } },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'action-settled' } },
          requestId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          disposition: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'accepted' },
                { kind: 'literal', value: 'rejected' },
                { kind: 'literal', value: 'completed' },
                { kind: 'literal', value: 'failed' },
                { kind: 'literal', value: 'interrupted' },
              ],
            },
          },
          outcomeEvidenceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          worldRevision: { optional: false, shape: { kind: 'number' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'claim-told' } },
          speaker: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          listener: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          deliveryRequestId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          claim: { optional: false, shape: { kind: 'ref', name: 'ToldClaimData' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'belief-revised' } },
          prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          beforeLogOdds: {
            optional: false,
            shape: { kind: 'union', options: [{ kind: 'number' }, { kind: 'literal', value: null }] },
          },
          after: { optional: false, shape: { kind: 'ref', name: 'Belief' } },
          evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          sourceTrustChanges: {
            optional: false,
            shape: {
              kind: 'array',
              element: {
                kind: 'object',
                fields: {
                  sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                  before: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                  after: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
                },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'contradiction-checked' } },
          evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          sourceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          prop: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          disposition: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'applied' },
                { kind: 'literal', value: 'no-account' },
                { kind: 'literal', value: 'same-account' },
                { kind: 'literal', value: 'self' },
                { kind: 'literal', value: 'already-noted' },
                { kind: 'literal', value: 'untrusted-reporter' },
              ],
            },
          },
          appliedWeight: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'method-evidence' } },
          demonstrationId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          methodId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          contextId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          disposition: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'acquired' },
                { kind: 'literal', value: 'duplicate' },
                { kind: 'literal', value: 'unavailable' },
                { kind: 'literal', value: 'unreceived-conditions' },
                { kind: 'literal', value: 'no-attention' },
              ],
            },
          },
          evidence: { optional: false, shape: { kind: 'ref', name: 'MethodEvidence' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'commitment-changed' } },
          commitmentId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          before: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'pending' },
                { kind: 'literal', value: 'kept' },
                { kind: 'literal', value: 'broken' },
                { kind: 'literal', value: 'released' },
                { kind: 'literal', value: null },
              ],
            },
          },
          after: { optional: false, shape: { kind: 'ref', name: 'Commitment' } },
          owed: { optional: true, shape: { kind: 'ref', name: 'OwedMakeUp' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'goal-changed' } },
          goalId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          before: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'active' },
                { kind: 'literal', value: 'achieved' },
                { kind: 'literal', value: 'abandoned' },
                { kind: 'literal', value: null },
              ],
            },
          },
          after: { optional: false, shape: { kind: 'ref', name: 'Goal' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'body-change' } },
          change: { optional: false, shape: { kind: 'ref', name: 'BodyChange' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'lifecycle' } },
          receipt: { optional: false, shape: { kind: 'ref', name: 'LifecycleReceipt' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'chapter-change' } },
          chapterId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          projection: { optional: false, shape: { kind: 'ref', name: 'ChapterProjection' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'input-disposed' } },
          disposition: { optional: false, shape: { kind: 'ref', name: 'InputDisposition' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'effect-applied' } },
          effectId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          owner: { optional: false, shape: { kind: 'ref', name: 'FacultyId' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'social-received' } },
          evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          other: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          event: { optional: false, shape: { kind: 'ref', name: 'SocialEventData' } },
          applied: { optional: false, shape: { kind: 'boolean' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'conversation' } },
          conversation: { optional: false, shape: { kind: 'ref', name: 'ConversationData' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'prompting' } },
          record: { optional: false, shape: { kind: 'ref', name: 'PromptingRecord' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'review' } },
          record: { optional: false, shape: { kind: 'ref', name: 'ReviewRecord' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'day-closed' } },
          record: { optional: false, shape: { kind: 'ref', name: 'DayRecord' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'year-closed' } },
          record: { optional: false, shape: { kind: 'ref', name: 'YearRecord' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'crisis' } },
          change: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'onset' },
                { kind: 'literal', value: 'recovered' },
              ],
            },
          },
          repertoireId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          until: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'voice-promise' } },
          voiceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          kept: { optional: false, shape: { kind: 'boolean' } },
          before: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          after: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'admission' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          castId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
          projectionHash: { optional: true, shape: { kind: 'scalar', name: 'Hash' } },
        },
      },
    ],
  },
  RenderedLine: {
    kind: 'object',
    fields: {
      eventId: { optional: false, shape: { kind: 'scalar', name: 'EventId' } },
      audience: { optional: false, shape: { kind: 'ref', name: 'Perspective' } },
      text: { optional: false, shape: { kind: 'string' } },
      variantId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  RunEvent: {
    kind: 'object',
    fields: {
      wording: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            key: { optional: false, shape: { kind: 'string' } },
            occurrence: { optional: false, shape: { kind: 'number' } },
            index: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      id: { optional: false, shape: { kind: 'scalar', name: 'EventId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      phase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
      person: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
      causeIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      data: { optional: false, shape: { kind: 'ref', name: 'EventData' } },
      narration: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'RenderedLine' } },
      },
    },
  },
  HostRequest: {
    kind: 'union',
    options: [
      { kind: 'ref', name: 'ActionRequest' },
      { kind: 'ref', name: 'CommunicationRequest' },
    ],
  },
  StepResult: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      reachedUntil: { optional: false, shape: { kind: 'boolean' } },
      events: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'RunEvent' } } },
      boundary: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                type: { optional: false, shape: { kind: 'literal', value: 'world-required' } },
                requests: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'HostRequest' } },
                },
              },
            },
            {
              kind: 'object',
              fields: { type: { optional: false, shape: { kind: 'literal', value: 'until' } } },
            },
          ],
        },
      },
      nextAt: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'scalar', name: 'Time' },
            { kind: 'literal', value: null },
          ],
        },
      },
    },
  },
  AcceptedTransaction: {
    kind: 'object',
    fields: {
      ordinal: { optional: false, shape: { kind: 'number' } },
      until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      inputs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Input' } } },
      fidelity: { optional: false, shape: { kind: 'ref', name: 'Fidelity' } },
      reachedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      cursor: { optional: false, shape: { kind: 'ref', name: 'SchedulerCursor' } },
      boundary: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                type: { optional: false, shape: { kind: 'literal', value: 'world-required' } },
                requests: {
                  optional: false,
                  shape: { kind: 'array', element: { kind: 'ref', name: 'HostRequest' } },
                },
              },
            },
            {
              kind: 'object',
              fields: { type: { optional: false, shape: { kind: 'literal', value: 'until' } } },
            },
          ],
        },
      },
      eventHash: { optional: true, shape: { kind: 'scalar', name: 'Hash' } },
      stateHash: { optional: true, shape: { kind: 'scalar', name: 'Hash' } },
    },
  },
  OwnerClock: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      owner: { optional: false, shape: { kind: 'ref', name: 'FacultyId' } },
      advancedThrough: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ContextBasis: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'authored' } },
          author: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          validUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'received' } },
          evidenceId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          validUntil: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
        },
      },
    ],
  },
  DozeState: {
    kind: 'object',
    fields: {
      context: { optional: false, shape: { kind: 'ref', name: 'DozeContext' } },
      basis: { optional: false, shape: { kind: 'ref', name: 'ContextBasis' } },
      since: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  Exposure: {
    kind: 'object',
    fields: {
      recent: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      cumulative: { optional: false, shape: { kind: 'number' } },
      lastAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  BodyState: {
    kind: 'object',
    fields: {
      doze: { optional: false, shape: { kind: 'ref', name: 'DozeState' } },
      bladder: { optional: false, shape: { kind: 'ref', name: 'BladderState' } },
      satiety: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      hydration: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      sleepPressure: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      exertion: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      circadianPeakMs: { optional: false, shape: { kind: 'scalar', name: 'DurationMs' } },
      pain: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      health: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      fitness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      injuries: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Injury' } } },
      illnesses: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Illness' } } },
      sleepDebtHours: { optional: false, shape: { kind: 'number' } },
      depletion: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      asleep: { optional: false, shape: { kind: 'boolean' } },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      alive: { optional: false, shape: { kind: 'boolean' } },
      nextId: { optional: false, shape: { kind: 'number' } },
      exposures: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: { kind: 'ref', name: 'Exposure' },
        },
      },
      lastSleep: { optional: true, shape: { kind: 'ref', name: 'TimeSpan' } },
      lastDowned: { optional: true, shape: { kind: 'ref', name: 'TimeSpan' } },
      downed: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            reason: { optional: false, shape: { kind: 'string' } },
            until: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
    },
  },
  CrisisState: {
    kind: 'object',
    fields: {
      stress: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      checkedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      active: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            repertoireId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            until: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          },
        },
      },
      lastBreakAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      breaks: { optional: false, shape: { kind: 'number' } },
      repertoire: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'BreakBehaviour' } },
      },
    },
  },
  AffectState: {
    kind: 'object',
    fields: {
      mood: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            valence: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
            arousal: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      emotions: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Emotion' } } },
      regulation: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      lastUpdated: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      crisis: { optional: false, shape: { kind: 'ref', name: 'CrisisState' } },
    },
  },
  PlanningState: {
    kind: 'object',
    fields: {
      depth: { optional: false, shape: { kind: 'number' } },
      presentBias: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
    },
  },
  CuriosityError: {
    kind: 'object',
    fields: {
      key: { optional: false, shape: { kind: 'string' } },
      fast: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      slow: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      n: { optional: false, shape: { kind: 'number' } },
      lastAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  CuriosityAct: {
    kind: 'object',
    fields: {
      action: { optional: false, shape: { kind: 'string' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      placeId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  CuriosityState: {
    kind: 'object',
    fields: {
      errors: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'CuriosityError' } } },
      recent: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'CuriosityAct' } } },
    },
  },
  MemoryState: {
    kind: 'object',
    fields: {
      episodes: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Episode' } } },
      beliefs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Belief' } } },
      expectations: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActionExpectation' } },
      },
      sourceTrust: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'scalar', name: 'Unit' } },
      },
      nextEpisode: { optional: false, shape: { kind: 'number' } },
      gists: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Gist' } } },
      nextGist: { optional: false, shape: { kind: 'number' } },
      contradictions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'NotedContradiction' } },
      },
    },
  },
  SocialState: {
    kind: 'object',
    fields: {
      relationships: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'Relationship' } },
      },
      groups: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            memberOf: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
            outsiderStance: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
          },
        },
      },
      impressions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'Impression' } },
      },
      reserve: { optional: false, shape: { kind: 'ref', name: 'Reserve' } },
    },
  },
  AgendaState: {
    kind: 'object',
    fields: {
      exemptions: { optional: false, shape: { kind: 'ref', name: 'ExemptionPremises' } },
      commitments: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'Commitment' } },
      },
      goals: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Goal' } } },
      nextId: { optional: false, shape: { kind: 'number' } },
      lastProposalDay: { optional: false, shape: { kind: 'number' } },
      owed: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'OwedMakeUp' } } },
      lapse: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            missed: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
    },
  },
  ActorActivity: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      offer: { optional: false, shape: { kind: 'ref', name: 'Offer' } },
      needsAtStart: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            food: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            water: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            sleep: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            rest: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            relief: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            safety: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            belonging: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            esteem: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            autonomy: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            competence: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            leisure: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
            meaning: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
          },
        },
      },
      startedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      endsAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      decisionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      intention: { optional: false, shape: { kind: 'string' } },
      suggestions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'SuggestionResolution' } },
      },
      suggestion: { optional: true, shape: { kind: 'ref', name: 'SuggestionResolution' } },
      protest: { optional: true, shape: { kind: 'boolean' } },
      reviewAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      commitmentId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      jointId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      interrupt: {
        optional: true,
        shape: {
          kind: 'object',
          fields: {
            at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            reason: { optional: false, shape: { kind: 'string' } },
          },
        },
      },
      dozedAt: { optional: true, shape: { kind: 'scalar', name: 'Time' } },
      necessity: { optional: true, shape: { kind: 'boolean' } },
    },
  },
  AmbientState: {
    kind: 'object',
    fields: {
      percept: { optional: false, shape: { kind: 'ref', name: 'AmbientPercept' } },
      contextId: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'scalar', name: 'Id' },
            { kind: 'literal', value: null },
          ],
        },
      },
      basis: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'ContextBasis' },
            { kind: 'literal', value: null },
          ],
        },
      },
      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
    },
  },
  ActorState: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      name: { optional: false, shape: { kind: 'string' } },
      now: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      rng: { optional: false, shape: { kind: 'ref', name: 'RngState' } },
      randomIdentity: { optional: false, shape: { kind: 'ref', name: 'ActorRandomIdentity' } },
      life: { optional: false, shape: { kind: 'ref', name: 'LifeCourse' } },
      body: { optional: false, shape: { kind: 'ref', name: 'BodyState' } },
      needs: { optional: false, shape: { kind: 'ref', name: 'NeedReservoirs' } },
      traits: { optional: false, shape: { kind: 'ref', name: 'Traits' } },
      values: { optional: false, shape: { kind: 'ref', name: 'Values' } },
      conscience: { optional: false, shape: { kind: 'ref', name: 'ConscienceState' } },
      affect: { optional: false, shape: { kind: 'ref', name: 'AffectState' } },
      skills: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'ref', name: 'Skill' } },
      },
      methods: { optional: false, shape: { kind: 'ref', name: 'MethodsState' } },
      prospection: { optional: false, shape: { kind: 'ref', name: 'ProspectionState' } },
      planning: { optional: false, shape: { kind: 'ref', name: 'PlanningState' } },
      promptings: { optional: false, shape: { kind: 'ref', name: 'PromptingsState' } },
      curiosity: { optional: false, shape: { kind: 'ref', name: 'CuriosityState' } },
      projects: { optional: false, shape: { kind: 'ref', name: 'ProjectsState' } },
      pursuit: { optional: false, shape: { kind: 'ref', name: 'PursuitState' } },
      review: { optional: false, shape: { kind: 'ref', name: 'ReviewState' } },
      skillRetention: {
        optional: false,
        shape: {
          kind: 'object',
          fields: { consolidationHours: { optional: false, shape: { kind: 'number' } } },
        },
      },
      habits: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Habit' } } },
      memory: { optional: false, shape: { kind: 'ref', name: 'MemoryState' } },
      context: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            scarcity: { optional: false, shape: { kind: 'ref', name: 'Knowledge$70' } },
            smoking: { optional: false, shape: { kind: 'ref', name: 'Knowledge$70' } },
          },
        },
      },
      social: { optional: false, shape: { kind: 'ref', name: 'SocialState' } },
      agenda: { optional: false, shape: { kind: 'ref', name: 'AgendaState' } },
      will: { optional: false, shape: { kind: 'ref', name: 'WillState' } },
      activity: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'ActorActivity' },
            { kind: 'literal', value: null },
          ],
        },
      },
      trace: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'DecisionRecord' } } },
      nextDecision: { optional: false, shape: { kind: 'number' } },
      lastAction: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
      chronicle: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'DayRecord' } } },
      chronicleDay: { optional: false, shape: { kind: 'ref', name: 'ChronicleDay' } },
      chronicleYears: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'YearRecord' } },
      },
      character: { optional: false, shape: { kind: 'ref', name: 'CharacterState' } },
      family: { optional: false, shape: { kind: 'ref', name: 'FamilyState' } },
      bonds: { optional: false, shape: { kind: 'ref', name: 'BondsState' } },
      ambient: { optional: false, shape: { kind: 'ref', name: 'AmbientState' } },
      retention: { optional: false, shape: { kind: 'ref', name: 'Retention' } },
    },
  },
  JointProposalData: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      proposerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      partnerIds: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      offer: { optional: false, shape: { kind: 'ref', name: 'Offer' } },
      record: { optional: false, shape: { kind: 'ref', name: 'DecisionRecord' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      accepted: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      partnerRecords: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: { kind: 'ref', name: 'DecisionRecord' },
        },
      },
      status: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'pending' },
            { kind: 'literal', value: 'accepted' },
            { kind: 'literal', value: 'declined' },
          ],
        },
      },
      settledReason: { optional: true, shape: { kind: 'string' } },
    },
  },
  CommunityState: {
    kind: 'object',
    fields: {
      idleUntil: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'scalar', name: 'Time' } },
      },
      perceivedUntil: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'scalar', name: 'Time' } },
      },
      interrupts: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'object',
            fields: {
              at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
              reason: { optional: false, shape: { kind: 'string' } },
            },
          },
        },
      },
      joint: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            nextId: { optional: false, shape: { kind: 'number' } },
            proposals: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'JointProposalData' } },
            },
            excluded: {
              optional: false,
              shape: {
                kind: 'dict',
                key: { kind: 'scalar', name: 'Id' },
                value: {
                  kind: 'object',
                  fields: {
                    at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                    ids: {
                      optional: false,
                      shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      partnerDeaths: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'object',
            fields: {
              decisionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              jointId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              deceasedId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            },
          },
        },
      },
      queued: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: { kind: 'array', element: { kind: 'ref', name: 'SuggestionData' } },
        },
      },
      dayDone: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'number' } },
      },
      standingDone: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: {
            kind: 'dict',
            key: { kind: 'scalar', name: 'Id' },
            value: {
              kind: 'object',
              fields: {
                at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                action: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                targetId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
          },
        },
      },
    },
  },
  ReceivedOfferBook: {
    kind: 'object',
    fields: {
      revision: { optional: false, shape: { kind: 'number' } },
      receivedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      cause: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
      offers: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Offer' } } },
      rejected: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              offerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              offerRevision: { optional: false, shape: { kind: 'number' } },
              requestId: { optional: false, shape: { kind: 'scalar', name: 'RequestId' } },
            },
          },
        },
      },
    },
  },
  ActiveRoutine: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      entries: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'RoutineEntry' } } },
      source: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'definition' } },
                id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              },
            },
            {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'input' } },
                inputId: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
              },
            },
          ],
        },
      },
    },
  },
  RunRngState: { kind: 'ref', name: 'RngState' },
  HazardKey: {
    kind: 'object',
    fields: {
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'doze' },
            { kind: 'literal', value: 'crisis' },
            { kind: 'literal', value: 'chronic' },
            { kind: 'literal', value: 'mortality' },
          ],
        },
      },
      channelId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  HazardBoundary: {
    kind: 'object',
    fields: {
      key: { optional: false, shape: { kind: 'ref', name: 'HazardKey' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      operation: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'allocate' },
            { kind: 'literal', value: 'fire' },
          ],
        },
      },
    },
  },
  EffectIdentity: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
    },
  },
  TermEffect: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
      from: { optional: false, shape: { kind: 'ref', name: 'FacultyId' } },
      to: { optional: false, shape: { kind: 'literal', value: 'will' } },
      offerId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      term: { optional: false, shape: { kind: 'ref', name: 'TermData' } },
    },
  },
  LifeStage: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'infant' },
      { kind: 'literal', value: 'child' },
      { kind: 'literal', value: 'adolescent' },
      { kind: 'literal', value: 'adult' },
      { kind: 'literal', value: 'elder' },
    ],
  },
  LifeModifiers: {
    kind: 'object',
    fields: {
      ageYears: { optional: false, shape: { kind: 'number' } },
      stage: { optional: false, shape: { kind: 'ref', name: 'LifeStage' } },
      metabolism: { optional: false, shape: { kind: 'number' } },
      recovery: { optional: false, shape: { kind: 'number' } },
      learning: { optional: false, shape: { kind: 'number' } },
      maturity: { optional: false, shape: { kind: 'number' } },
      maxFitness: { optional: false, shape: { kind: 'scalar', name: 'Unit' } },
      mortalityPerYear: { optional: false, shape: { kind: 'number' } },
    },
  },
  ModifierData: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'body-load' } },
          load: { optional: false, shape: { kind: 'ref', name: 'BodyLoad' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'life-modifiers' } },
          modifiers: { optional: false, shape: { kind: 'ref', name: 'LifeModifiers' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'environment-body' } },
          metabolismMultiplier: { optional: false, shape: { kind: 'number' } },
          exertionRecoverHalfLifeMultiplier: { optional: false, shape: { kind: 'number' } },
          exertionRecoverHalfLifeAsleepMultiplier: { optional: false, shape: { kind: 'number' } },
          sleepTauMultiplier: { optional: false, shape: { kind: 'number' } },
          wakeTauMultiplier: { optional: false, shape: { kind: 'number' } },
          moodOffset: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'pregnancy-body' } },
          metabolismMultiplier: { optional: false, shape: { kind: 'number' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'skill-aptitude' } },
          skillId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          multiplier: { optional: false, shape: { kind: 'number' } },
        },
      },
    ],
  },
  ModifierEffect: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
          from: { optional: false, shape: { kind: 'literal', value: 'run' } },
          to: { optional: false, shape: { kind: 'literal', value: 'body' } },
          modifier: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'body-load' } },
                load: { optional: false, shape: { kind: 'ref', name: 'BodyLoad' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
          from: { optional: false, shape: { kind: 'literal', value: 'lifecourse' } },
          to: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'body' },
                { kind: 'literal', value: 'skills' },
                { kind: 'literal', value: 'will' },
                { kind: 'literal', value: 'affect' },
              ],
            },
          },
          modifier: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'life-modifiers' } },
                modifiers: { optional: false, shape: { kind: 'ref', name: 'LifeModifiers' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
          from: { optional: false, shape: { kind: 'literal', value: 'environment' } },
          to: { optional: false, shape: { kind: 'literal', value: 'body' } },
          modifier: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'environment-body' } },
                metabolismMultiplier: { optional: false, shape: { kind: 'number' } },
                exertionRecoverHalfLifeMultiplier: { optional: false, shape: { kind: 'number' } },
                exertionRecoverHalfLifeAsleepMultiplier: { optional: false, shape: { kind: 'number' } },
                sleepTauMultiplier: { optional: false, shape: { kind: 'number' } },
                wakeTauMultiplier: { optional: false, shape: { kind: 'number' } },
                moodOffset: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
          from: { optional: false, shape: { kind: 'literal', value: 'family' } },
          to: { optional: false, shape: { kind: 'literal', value: 'body' } },
          modifier: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'pregnancy-body' } },
                metabolismMultiplier: { optional: false, shape: { kind: 'number' } },
              },
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
          at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
          applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
          from: { optional: false, shape: { kind: 'literal', value: 'family' } },
          to: { optional: false, shape: { kind: 'literal', value: 'skills' } },
          modifier: {
            optional: false,
            shape: {
              kind: 'object',
              fields: {
                kind: { optional: false, shape: { kind: 'literal', value: 'skill-aptitude' } },
                skillId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                multiplier: { optional: false, shape: { kind: 'number' } },
              },
            },
          },
        },
      },
    ],
  },
  AppraisalEvent: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      kind: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'outcome' },
            { kind: 'literal', value: 'event' },
            { kind: 'literal', value: 'prospect' },
            { kind: 'literal', value: 'deed' },
          ],
        },
      },
      desirability: { optional: false, shape: { kind: 'scalar', name: 'Signed' } },
      likelihood: { optional: true, shape: { kind: 'scalar', name: 'Unit' } },
      praiseworthiness: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      agentId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      targetId: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
      affectionToAgent: { optional: true, shape: { kind: 'scalar', name: 'Signed' } },
      loss: { optional: true, shape: { kind: 'boolean' } },
      normId: { optional: true, shape: { kind: 'string' } },
      cause: { optional: false, shape: { kind: 'string' } },
      threatFrom: { optional: true, shape: { kind: 'ref', name: 'EntityId' } },
    },
  },
  AppraisalData: { kind: 'ref', name: 'AppraisalEvent' },
  AppraisalEffect: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      applyPhase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
      from: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'run' },
            { kind: 'literal', value: 'agenda' },
            { kind: 'literal', value: 'conscience' },
            { kind: 'literal', value: 'social' },
            { kind: 'literal', value: 'body' },
            { kind: 'literal', value: 'memory' },
            { kind: 'literal', value: 'environment' },
            { kind: 'literal', value: 'conversation' },
            { kind: 'literal', value: 'projects' },
            { kind: 'literal', value: 'promptings' },
            { kind: 'literal', value: 'review' },
          ],
        },
      },
      to: { optional: false, shape: { kind: 'literal', value: 'affect' } },
      appraisal: { optional: false, shape: { kind: 'ref', name: 'AppraisalData' } },
    },
  },
  ScheduledEffect: {
    kind: 'union',
    options: [
      { kind: 'ref', name: 'TermEffect' },
      { kind: 'ref', name: 'ModifierEffect' },
      { kind: 'ref', name: 'AppraisalEffect' },
    ],
  },
  ScheduledEventData: {
    kind: 'union',
    options: [
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'hazard-boundary' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          boundary: { optional: false, shape: { kind: 'ref', name: 'HazardBoundary' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'input' } },
          input: { optional: false, shape: { kind: 'ref', name: 'Input' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'activity-finish' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'activity-review' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          reason: { optional: false, shape: { kind: 'string' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'calendar' } },
          dayIndex: { optional: false, shape: { kind: 'number' } },
          commitmentIds: {
            optional: false,
            shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'routine-opportunity' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          scheduleId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          entryId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'owner-boundary' } },
          owner: { optional: false, shape: { kind: 'ref', name: 'FacultyId' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          boundary: {
            optional: false,
            shape: {
              kind: 'union',
              options: [
                { kind: 'literal', value: 'hazard' },
                { kind: 'literal', value: 'threshold' },
                { kind: 'literal', value: 'recovery' },
                { kind: 'literal', value: 'expiry' },
                { kind: 'literal', value: 'day' },
                { kind: 'literal', value: 'year' },
              ],
            },
          },
        },
      },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'effect' } },
          effect: { optional: false, shape: { kind: 'ref', name: 'ScheduledEffect' } },
        },
      },
    ],
  },
  ScheduledEvent: {
    kind: 'object',
    fields: {
      id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      phase: { optional: false, shape: { kind: 'ref', name: 'Phase' } },
      person: { optional: true, shape: { kind: 'scalar', name: 'PersonId' } },
      causalId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      localOrdinal: { optional: false, shape: { kind: 'number' } },
      data: { optional: false, shape: { kind: 'ref', name: 'ScheduledEventData' } },
    },
  },
  AllocationScope: {
    kind: 'union',
    options: [
      { kind: 'object', fields: { kind: { optional: false, shape: { kind: 'literal', value: 'run' } } } },
      {
        kind: 'object',
        fields: {
          kind: { optional: false, shape: { kind: 'literal', value: 'person' } },
          person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
        },
      },
    ],
  },
  ReceiptLedger: {
    kind: 'object',
    fields: {
      dispositions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'InputDisposition' } },
      },
      communications: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              requestId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              inputId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              requestHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
              receptions: {
                optional: false,
                shape: { kind: 'array', element: { kind: 'ref', name: 'CommunicationReception' } },
              },
            },
          },
        },
      },
      inputs: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'InputId' } },
              hash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
              ordinal: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
      settlements: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              requestId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              inputId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              requestHash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
              activityId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              stage: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'start' },
                    { kind: 'literal', value: 'finish' },
                    { kind: 'literal', value: 'interrupt' },
                  ],
                },
              },
              outcomeEvidenceId: { optional: true, shape: { kind: 'scalar', name: 'Id' } },
            },
          },
        },
      },
      evidence: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              inputId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              hash: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
            },
          },
        },
      },
      effects: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              cause: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              owner: { optional: false, shape: { kind: 'ref', name: 'FacultyId' } },
              person: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              causalEffectKey: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              appliedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
      allocated: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              scope: { optional: false, shape: { kind: 'ref', name: 'AllocationScope' } },
              reference: { optional: false, shape: { kind: 'ref', name: 'Reference' } },
              allocatedAt: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
            },
          },
        },
      },
    },
  },
  RunCounters: {
    kind: 'object',
    fields: {
      nextInput: { optional: false, shape: { kind: 'number' } },
      nextRequest: { optional: false, shape: { kind: 'number' } },
      nextEvent: { optional: false, shape: { kind: 'number' } },
      nextActivity: { optional: false, shape: { kind: 'number' } },
      nextTransaction: { optional: false, shape: { kind: 'number' } },
    },
  },
  NumericalClock: {
    kind: 'object',
    fields: {
      advancedThroughMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      conditionAnchorMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      conditionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      effectiveParametersHash: { optional: false, shape: { kind: 'string' } },
    },
  },
  BodyVector: {
    kind: 'object',
    fields: {
      satiety: { optional: false, shape: { kind: 'number' } },
      hydration: { optional: false, shape: { kind: 'number' } },
      sleepPressure: { optional: false, shape: { kind: 'number' } },
      sleepDebtHours: { optional: false, shape: { kind: 'number' } },
      fitness: { optional: false, shape: { kind: 'number' } },
      exertion: { optional: false, shape: { kind: 'number' } },
      depletion: { optional: false, shape: { kind: 'number' } },
      health: { optional: false, shape: { kind: 'number' } },
      pain: { optional: false, shape: { kind: 'number' } },
      bladderFill: { optional: false, shape: { kind: 'number' } },
      bladderPending: { optional: false, shape: { kind: 'number' } },
      injuries: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              severity: { optional: false, shape: { kind: 'number' } },
              bleedingPerDay: {
                optional: false,
                shape: { kind: 'union', options: [{ kind: 'number' }, { kind: 'literal', value: null }] },
              },
            },
          },
        },
      },
      illnesses: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              severity: { optional: false, shape: { kind: 'number' } },
              trendPerDay: { optional: false, shape: { kind: 'number' } },
              baseline: {
                optional: false,
                shape: { kind: 'union', options: [{ kind: 'number' }, { kind: 'literal', value: null }] },
              },
              chronic: { optional: false, shape: { kind: 'boolean' } },
            },
          },
        },
      },
      exposures: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              kind: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              recent: { optional: false, shape: { kind: 'number' } },
              cumulativeDose: { optional: false, shape: { kind: 'number' } },
            },
          },
        },
      },
    },
  },
  BodyComponent: {
    kind: 'union',
    options: [
      { kind: 'literal', value: 'satiety' },
      { kind: 'literal', value: 'hydration' },
      { kind: 'literal', value: 'sleep-pressure' },
      { kind: 'literal', value: 'sleep-debt-hours' },
      { kind: 'literal', value: 'fitness' },
      { kind: 'literal', value: 'exertion' },
      { kind: 'literal', value: 'depletion' },
      { kind: 'literal', value: 'health' },
      { kind: 'literal', value: 'pain' },
      { kind: 'literal', value: 'bladder-fill' },
      { kind: 'literal', value: 'bladder-pending' },
      { kind: 'literal', value: 'injury-severity' },
      { kind: 'literal', value: 'injury-bleeding-per-day' },
      { kind: 'literal', value: 'illness-severity' },
      { kind: 'literal', value: 'illness-trend-per-day' },
      { kind: 'literal', value: 'exposure-recent' },
      { kind: 'literal', value: 'exposure-cumulative-dose' },
    ],
  },
  BodyFieldKey: {
    kind: 'object',
    fields: {
      component: { optional: false, shape: { kind: 'ref', name: 'BodyComponent' } },
      recordId: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'scalar', name: 'Id' },
            { kind: 'literal', value: null },
          ],
        },
      },
    },
  },
  ErrorBound: { kind: 'number' },
  ScalarCell: {
    kind: 'object',
    fields: {
      originMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      leftOffsetMinutes: { optional: false, shape: { kind: 'number' } },
      rightOffsetMinutes: { optional: false, shape: { kind: 'number' } },
      coefficients: {
        optional: false,
        shape: {
          kind: 'tuple',
          elements: [
            { kind: 'number' },
            { kind: 'number' },
            { kind: 'number' },
            { kind: 'number' },
            { kind: 'number' },
          ],
        },
      },
      estimatedError: { optional: false, shape: { kind: 'ref', name: 'ErrorBound' } },
    },
  },
  Bracket: {
    kind: 'object',
    fields: {
      originMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      loOffsetMinutes: { optional: false, shape: { kind: 'number' } },
      hiOffsetMinutes: { optional: false, shape: { kind: 'number' } },
    },
  },
  BodyContinuation: {
    kind: 'object',
    fields: {
      clock: { optional: false, shape: { kind: 'ref', name: 'NumericalClock' } },
      anchor: { optional: false, shape: { kind: 'ref', name: 'BodyVector' } },
      acceptedThroughMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      materializedAtMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      nextTrialWidthMinutes: { optional: false, shape: { kind: 'number' } },
      cells: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              field: { optional: false, shape: { kind: 'ref', name: 'BodyFieldKey' } },
              cell: { optional: false, shape: { kind: 'ref', name: 'ScalarCell' } },
            },
          },
        },
      },
      errors: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              field: { optional: false, shape: { kind: 'ref', name: 'BodyFieldKey' } },
              absoluteNormalizedErrorEstimate: {
                optional: false,
                shape: { kind: 'ref', name: 'ErrorBound' },
              },
            },
          },
        },
      },
      circadian: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            epochMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
            peakOffsetMs: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      sleep: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            asleep: { optional: false, shape: { kind: 'boolean' } },
            sinceMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
            dozeSinceMs: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'scalar', name: 'TimeMs' },
                  { kind: 'literal', value: null },
                ],
              },
            },
            lastSleep: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  {
                    kind: 'object',
                    fields: {
                      fromMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
                      toMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
                    },
                  },
                  { kind: 'literal', value: null },
                ],
              },
            },
          },
        },
      },
      clipping: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              field: { optional: false, shape: { kind: 'ref', name: 'BodyFieldKey' } },
              bound: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'lower' },
                    { kind: 'literal', value: 'upper' },
                  ],
                },
              },
              sinceMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
            },
          },
        },
      },
      pendingRoots: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              kind: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'death' },
                    { kind: 'literal', value: 'down' },
                    { kind: 'literal', value: 'up' },
                    { kind: 'literal', value: 'injury-removal' },
                    { kind: 'literal', value: 'illness-removal' },
                    { kind: 'literal', value: 'bleed-stop' },
                    { kind: 'literal', value: 'exposure-removal' },
                  ],
                },
              },
              recordId: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'scalar', name: 'Id' },
                    { kind: 'literal', value: null },
                  ],
                },
              },
              bracket: { optional: false, shape: { kind: 'ref', name: 'Bracket' } },
            },
          },
        },
      },
    },
  },
  HazardContinuation: {
    kind: 'object',
    fields: {
      key: { optional: false, shape: { kind: 'ref', name: 'HazardKey' } },
      episodeOrdinal: { optional: false, shape: { kind: 'number' } },
      clock: { optional: false, shape: { kind: 'ref', name: 'NumericalClock' } },
      eligibility: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'literal', value: 'closed' },
            { kind: 'literal', value: 'positive' },
          ],
        },
      },
      threshold: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                exponentialBudget: { optional: false, shape: { kind: 'number' } },
                drawOrdinal: { optional: false, shape: { kind: 'number' } },
                allocatedAtMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
              },
            },
            { kind: 'literal', value: null },
          ],
        },
      },
      anchorIntegral: { optional: false, shape: { kind: 'number' } },
      acceptedIntegral: { optional: false, shape: { kind: 'number' } },
      absoluteIntegralError: { optional: false, shape: { kind: 'ref', name: 'ErrorBound' } },
      acceptedThroughMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      materializedAtMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      activeIntegralCell: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'ScalarCell' },
            { kind: 'literal', value: null },
          ],
        },
      },
      nextTrialWidthMinutes: { optional: false, shape: { kind: 'number' } },
      crossing: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'Bracket' },
            { kind: 'literal', value: null },
          ],
        },
      },
      pendingEvent: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                eventId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                atMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
                localOrdinal: { optional: false, shape: { kind: 'number' } },
              },
            },
            { kind: 'literal', value: null },
          ],
        },
      },
    },
  },
  DozeContinuation: {
    kind: 'object',
    fields: {
      hazard: { optional: false, shape: { kind: 'ref', name: 'HazardContinuation' } },
      context: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            posture: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'upright' },
                  { kind: 'literal', value: 'seated' },
                  { kind: 'literal', value: 'reclined' },
                ],
              },
            },
            stimulation: { optional: false, shape: { kind: 'number' } },
            basis: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  { kind: 'literal', value: 'authored' },
                  { kind: 'literal', value: 'received' },
                ],
              },
            },
            atMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
            conditionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
    },
  },
  AffectContinuation: {
    kind: 'object',
    fields: {
      clock: { optional: false, shape: { kind: 'ref', name: 'NumericalClock' } },
      materializedAtMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      acceptedThroughMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      anchorMood: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            valence: { optional: false, shape: { kind: 'number' } },
            arousal: { optional: false, shape: { kind: 'number' } },
          },
        },
      },
      emotions: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              intensityAtAnchor: { optional: false, shape: { kind: 'number' } },
              effectiveHalfLifeMinutes: { optional: false, shape: { kind: 'number' } },
              dropBracket: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'ref', name: 'Bracket' },
                    { kind: 'literal', value: null },
                  ],
                },
              },
            },
          },
        },
      },
      regulationAtAnchor: { optional: false, shape: { kind: 'number' } },
      needTrajectoryId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      moodOffsetConditionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      valenceCell: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'ScalarCell' },
            { kind: 'literal', value: null },
          ],
        },
      },
      arousalCell: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'ScalarCell' },
            { kind: 'literal', value: null },
          ],
        },
      },
      valenceError: { optional: false, shape: { kind: 'ref', name: 'ErrorBound' } },
      arousalError: { optional: false, shape: { kind: 'ref', name: 'ErrorBound' } },
      nextTrialWidthMinutes: { optional: false, shape: { kind: 'number' } },
    },
  },
  CrisisContinuation: {
    kind: 'object',
    fields: {
      clock: { optional: false, shape: { kind: 'ref', name: 'NumericalClock' } },
      stressAtAnchor: { optional: false, shape: { kind: 'number' } },
      acceptedThroughMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      materializedAtMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      nextTrialWidthMinutes: { optional: false, shape: { kind: 'number' } },
      stressCell: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'ref', name: 'ScalarCell' },
            { kind: 'literal', value: null },
          ],
        },
      },
      stressError: { optional: false, shape: { kind: 'ref', name: 'ErrorBound' } },
      hazard: { optional: false, shape: { kind: 'ref', name: 'HazardContinuation' } },
      recovery: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            {
              kind: 'object',
              fields: {
                behaviourId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
                sinceMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
                remainingWorkMinutesAtAnchor: { optional: false, shape: { kind: 'number' } },
                anchorMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
                sleepRate: {
                  optional: false,
                  shape: {
                    kind: 'union',
                    options: [
                      { kind: 'literal', value: 1 },
                      { kind: 'literal', value: 2 },
                    ],
                  },
                },
                lastComfortReceiptId: {
                  optional: false,
                  shape: {
                    kind: 'union',
                    options: [
                      { kind: 'scalar', name: 'Id' },
                      { kind: 'literal', value: null },
                    ],
                  },
                },
              },
            },
            { kind: 'literal', value: null },
          ],
        },
      },
      lastBreakAtMs: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'scalar', name: 'TimeMs' },
            { kind: 'literal', value: null },
          ],
        },
      },
      refractoryUntilMs: {
        optional: false,
        shape: {
          kind: 'union',
          options: [
            { kind: 'scalar', name: 'TimeMs' },
            { kind: 'literal', value: null },
          ],
        },
      },
      breaks: { optional: false, shape: { kind: 'number' } },
    },
  },
  LifeContinuation: {
    kind: 'object',
    fields: {
      clock: { optional: false, shape: { kind: 'ref', name: 'NumericalClock' } },
      birthAtMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
      catalogOrder: { optional: false, shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } } },
      hazards: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'HazardContinuation' } },
      },
      bodyTrajectoryId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
      physicalReceiptIds: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'scalar', name: 'Id' } },
      },
      pending: {
        optional: false,
        shape: {
          kind: 'array',
          element: {
            kind: 'object',
            fields: {
              kind: {
                optional: false,
                shape: {
                  kind: 'union',
                  options: [
                    { kind: 'literal', value: 'chronic-onset' },
                    { kind: 'literal', value: 'death' },
                  ],
                },
              },
              channelId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              eventId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
              atMs: { optional: false, shape: { kind: 'scalar', name: 'TimeMs' } },
              physicalReceiptId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            },
          },
        },
      },
    },
  },
  ContinuousAnchor: {
    kind: 'object',
    fields: {
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      conditionId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
    },
  },
  BeliefOwnedState: {
    kind: 'object',
    fields: {
      beliefs: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Belief' } } },
      sourceTrust: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'scalar', name: 'Id' }, value: { kind: 'scalar', name: 'Unit' } },
      },
      contradictions: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'NotedContradiction' } },
      },
    },
  },
  DeliberationContinuation: {
    kind: 'object',
    fields: {
      needs: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'NeedReservoirs' } },
          },
        },
      },
      beliefs: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'BeliefOwnedState' } },
          },
        },
      },
      social: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'SocialState' } },
          },
        },
      },
      habits: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Habit' } } },
          },
        },
      },
      conscience: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'ConscienceState' } },
          },
        },
      },
      skills: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: {
              optional: false,
              shape: {
                kind: 'dict',
                key: { kind: 'scalar', name: 'Id' },
                value: { kind: 'ref', name: 'Skill' },
              },
            },
          },
        },
      },
      projects: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'ProjectsState' } },
          },
        },
      },
      persistence: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'PursuitState' } },
          },
        },
      },
      prospection: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'ProspectionState' } },
          },
        },
      },
      methods: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'MethodsState' } },
          },
        },
      },
      curiosity: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'CuriosityState' } },
          },
        },
      },
      will: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'WillState' } },
          },
        },
      },
      agenda: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'AgendaState' } },
          },
        },
      },
    },
  },
  MemoryOwnedState: {
    kind: 'object',
    fields: {
      episodes: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Episode' } } },
      expectations: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActionExpectation' } },
      },
      nextEpisode: { optional: false, shape: { kind: 'number' } },
      gists: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'Gist' } } },
      nextGist: { optional: false, shape: { kind: 'number' } },
    },
  },
  NarrativeContinuation: {
    kind: 'object',
    fields: {
      memory: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'MemoryOwnedState' } },
          },
        },
      },
      promptings: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'PromptingsState' } },
          },
        },
      },
      review: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: { optional: false, shape: { kind: 'ref', name: 'ReviewState' } },
          },
        },
      },
      character: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            state: {
              optional: false,
              shape: {
                kind: 'object',
                fields: {
                  character: { optional: false, shape: { kind: 'ref', name: 'CharacterState' } },
                  traits: { optional: false, shape: { kind: 'ref', name: 'Traits' } },
                  values: { optional: false, shape: { kind: 'ref', name: 'Values' } },
                },
              },
            },
          },
        },
      },
      chronicle: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            anchor: { optional: false, shape: { kind: 'ref', name: 'ContinuousAnchor' } },
            open: { optional: false, shape: { kind: 'ref', name: 'ChronicleDay' } },
          },
        },
      },
    },
  },
  ActorContinuation: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'scalar', name: 'PersonId' } },
      body: { optional: false, shape: { kind: 'ref', name: 'BodyContinuation' } },
      doze: { optional: false, shape: { kind: 'ref', name: 'DozeContinuation' } },
      affect: { optional: false, shape: { kind: 'ref', name: 'AffectContinuation' } },
      crisis: { optional: false, shape: { kind: 'ref', name: 'CrisisContinuation' } },
      life: { optional: false, shape: { kind: 'ref', name: 'LifeContinuation' } },
      deliberation: { optional: false, shape: { kind: 'ref', name: 'DeliberationContinuation' } },
      narrative: { optional: false, shape: { kind: 'ref', name: 'NarrativeContinuation' } },
    },
  },
  RunState: {
    kind: 'object',
    fields: {
      wording: {
        optional: false,
        shape: { kind: 'dict', key: { kind: 'string' }, value: { kind: 'ref', name: 'WordingSequence' } },
      },
      at: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
      cursor: { optional: false, shape: { kind: 'ref', name: 'SchedulerCursor' } },
      ownerClocks: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'OwnerClock' } },
      },
      world: { optional: false, shape: { kind: 'ref', name: 'WorldSnapshot' } },
      people: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'PersonId' },
          value: { kind: 'ref', name: 'ActorState' },
        },
      },
      community: { optional: false, shape: { kind: 'ref', name: 'CommunityState' } },
      offers: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'PersonId' },
          value: { kind: 'ref', name: 'ReceivedOfferBook' },
        },
      },
      routines: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActiveRoutine' } },
      },
      rng: { optional: false, shape: { kind: 'ref', name: 'RunRngState' } },
      queue: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'ScheduledEvent' } } },
      pending: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'HostRequest' } } },
      receipts: { optional: false, shape: { kind: 'ref', name: 'ReceiptLedger' } },
      effects: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ScheduledEffect' } },
      },
      events: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'RunEvent' } } },
      counters: { optional: false, shape: { kind: 'ref', name: 'RunCounters' } },
      lifecycle: { optional: false, shape: { kind: 'ref', name: 'LifecycleArchive' } },
      continuations: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'ActorContinuation' } },
      },
      chapter: {
        optional: false,
        shape: {
          kind: 'dict',
          key: { kind: 'scalar', name: 'Id' },
          value: { kind: 'ref', name: 'ChapterClock' },
        },
      },
    },
  },
  RunArchive: {
    kind: 'object',
    fields: {
      format: { optional: false, shape: { kind: 'literal', value: 'hf-run' } },
      version: { optional: false, shape: { kind: 'literal', value: 4 } },
      engine: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            package: { optional: false, shape: { kind: 'string' } },
            build: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
            schema: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
          },
        },
      },
      host: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            id: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            edition: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            schema: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
          },
        },
      },
      initial: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            spec: { optional: false, shape: { kind: 'ref', name: 'RunSpec' } },
            effective: { optional: false, shape: { kind: 'ref', name: 'EffectiveParameters' } },
            parameterProvenance: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'ParameterProvenance' } },
            },
            people: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'PersonAuthoring' } },
            },
          },
        },
      },
      history: {
        optional: false,
        shape: { kind: 'array', element: { kind: 'ref', name: 'AcceptedTransaction' } },
      },
      current: { optional: false, shape: { kind: 'ref', name: 'RunState' } },
      hashes: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            initial: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
            history: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
            current: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
            full: { optional: false, shape: { kind: 'scalar', name: 'Hash' } },
          },
        },
      },
    },
  },
  CalendarProjection: {
    kind: 'object',
    fields: {
      person: { optional: false, shape: { kind: 'ref', name: 'PersonaProjection' } },
      calendar: {
        optional: false,
        shape: {
          kind: 'object',
          fields: {
            mappingId: { optional: false, shape: { kind: 'scalar', name: 'Id' } },
            offsetMs: { optional: false, shape: { kind: 'number' } },
            commitments: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'Commitment' } },
            },
            owed: { optional: false, shape: { kind: 'array', element: { kind: 'ref', name: 'OwedMakeUp' } } },
            lapse: {
              optional: false,
              shape: {
                kind: 'union',
                options: [
                  {
                    kind: 'object',
                    fields: {
                      since: { optional: false, shape: { kind: 'scalar', name: 'Time' } },
                      missed: { optional: false, shape: { kind: 'number' } },
                    },
                  },
                  { kind: 'literal', value: null },
                ],
              },
            },
            heldNorms: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'HeldNorm' } },
            },
            norms: {
              optional: false,
              shape: { kind: 'array', element: { kind: 'ref', name: 'SourcedNorm' } },
            },
          },
        },
      },
    },
  },
};
export const ROOT_SHAPES = {
  PortableRetainedState: { kind: 'ref', name: 'PortableRetainedState' },
  RunSpec: { kind: 'ref', name: 'RunSpec' },
  RunTuning: { kind: 'ref', name: 'RunTuning' },
  PersonAuthoring: { kind: 'ref', name: 'PersonAuthoring' },
  StepBatch: { kind: 'ref', name: 'StepBatch' },
  InspectQuery: { kind: 'ref', name: 'InspectQuery' },
  PreviewQuery: { kind: 'ref', name: 'PreviewQuery' },
  RunArchive: { kind: 'ref', name: 'RunArchive' },
  PersonaProjection: { kind: 'ref', name: 'PersonaProjection' },
  CalendarProjection: { kind: 'ref', name: 'CalendarProjection' },
  PortablePersonEnvelope: { kind: 'ref', name: 'PortablePersonEnvelope' },
} as const;
export const DATA_SCHEMA_SOURCE_SHA256 = 'debf2d504769d33fb2b16a33be4c70a679d3ce5cf2305c319760fb8a623771db';
