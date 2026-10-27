/** SCOPE: fixed internal faculty composition. Hosts supply data, never handlers. */
import { affectOwner } from './affect/affect.ts';
import { crisisOwner } from './affect/crisis.ts';
import { agendaOwner } from './agenda/agenda.ts';
import { beliefOwner } from './beliefs/beliefs.ts';
import { bodyOwner } from './body/body.ts';
import { characterOwner } from './character/character.ts';
import { chronicleOwner } from './chronicle/chronicle.ts';
import { conscienceOwner } from './conscience/conscience.ts';
import { curiosityOwner } from './curiosity/curiosity.ts';
import { environmentOwner } from './environment/environment.ts';
import { familyOwner } from './family/family.ts';
import { habitsOwner } from './habits/habits.ts';
import { lifecycleOwner } from './lifecourse/lifecourse.ts';
import { memoryOwner } from './memory/memory.ts';
import { methodOwner } from './methods/methods.ts';
import { needsOwner } from './needs/needs.ts';
import { partneringOwner } from './partnering/partnering.ts';
import { persistenceOwner } from './persistence/persistence.ts';
import { projectsOwner } from './projects/projects.ts';
import { promptingsOwner } from './promptings/promptings.ts';
import { prospectionOwner } from './prospection/prospection.ts';
import { reviewOwner } from './review/review.ts';
import type { PhysiologyOwners, RetainedOwners } from './run-advance.ts';
import type { IntegrityOwners } from './run-integrity.ts';
import type { ConstructorOwners } from './run-person.ts';
import { skillsOwner } from './skills/skills.ts';
import { socialOwner } from './social/social.ts';
import { willOwner } from './will/will.ts';

export const OWNERS = Object.freeze({
  body: bodyOwner,
  affect: affectOwner,
  crisis: crisisOwner,
  life: lifecycleOwner,
  family: familyOwner,
  partnering: partneringOwner,
  agenda: agendaOwner,
  beliefs: beliefOwner,
  memory: memoryOwner,
  conscience: conscienceOwner,
  social: socialOwner,
  skills: skillsOwner,
  will: willOwner,
  promptings: promptingsOwner,
  review: reviewOwner,
  needs: needsOwner,
  habits: habitsOwner,
  methods: methodOwner,
  prospection: prospectionOwner,
  projects: projectsOwner,
  persistence: persistenceOwner,
  curiosity: curiosityOwner,
  character: characterOwner,
  chronicle: chronicleOwner,
  environment: environmentOwner,
}) satisfies ConstructorOwners & IntegrityOwners & PhysiologyOwners & RetainedOwners;
