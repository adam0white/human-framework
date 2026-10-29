/** One readout of physical construction facts for the person sheet and first inspection. No actor equations. */
import type { WorldView } from '../sim/game.ts';
import {
  BEAM_STAGE,
  JOBS,
  STAGE_COST,
  STORM_START,
  stageKind,
  type VillagerId,
  WARNING_AT,
} from '../sim/world-types.ts';
import { shortName } from './parts.tsx';

export function RoofRisk({
  world,
  minute,
  side,
}: {
  world: WorldView;
  minute: number;
  side: 'Classic' | 'Human';
}) {
  if (
    world.project.kind !== 'house' ||
    world.houseStage >= 10 ||
    minute < WARNING_AT ||
    minute >= STORM_START
  )
    return null;
  return (
    <p className="well-roof-risk">
      {side} roof goal at risk: still unfinished at the storm warning. Due by 19:00 on day 2. A completed task
      is not the whole roof.
    </p>
  );
}

export function ConstructionReadout({
  world,
  side,
  personId,
  activity,
  stockTarget,
}: {
  world: WorldView;
  side: 'Classic' | 'Human';
  personId?: VillagerId;
  activity?: string;
  stockTarget?: number;
}) {
  const project = world.project,
    facts = world.construction;
  const open = project.stage < project.stages;
  const selected = personId !== undefined && facts?.selectedPersonId === personId;
  const normal = selected ? facts?.normalSession : undefined;
  const stageMinutes =
    normal && normal.progress > 0
      ? Math.ceil((Math.max(0, 1 - world.houseProgress) / normal.progress) * normal.minutes)
      : null;
  return (
    <div className="well-building-side" data-village={side.toLowerCase()}>
      <p className="well-building-progress">
        {side} village: {project.kind === 'house' ? 'roof' : 'store-room'} {project.stage} of {project.stages}{' '}
        stages{open ? `; ${Math.floor(world.houseProgress * 100)}% toward the next stage` : ''}.
      </p>
      <p className="well-building-meals">
        {world.resources.meals}
        {stockTarget === undefined ? '' : ` of ${stockTarget}`} meals currently in store.
      </p>
      {activity && personId && (
        <p>
          Current activity for {shortName(personId)}: {activity}. An incomplete stage does not establish why
          work is delayed.
        </p>
      )}
      {!facts && open ? <p>The cause of the remaining delay is unknown.</p> : null}
      {facts && (
        <div className="well-building-details">
          <p>
            Timber in store: {facts.stockTimber}.
            {world.shuttered ? ' The shutters are closed; this does not close the building site.' : ''}
            {facts.payment === 'on-site' ? ' Materials for this stage are already on site.' : ''}
            {facts.nextStage !== null
              ? ` Next ${facts.nextWork === 'beam' ? 'beam work' : 'stage'}: ${facts.nextTimber} timber${facts.payment === 'on-site' ? ' already paid' : ' needed from stores'}.`
              : facts.active.length
                ? ' No further stage can be claimed yet.'
                : open
                  ? ' The cause of the remaining delay is unknown.'
                  : ' Building is complete.'}
          </p>
          {facts.payment === 'unpaid' &&
            facts.nextTimber !== null &&
            facts.stockTimber < facts.nextTimber && <p>There is not enough timber in store for that work.</p>}
          {facts.active.map((a) => (
            <p key={`${a.personId}-${a.stage}`}>
              {shortName(a.personId)} is{' '}
              {a.phase === 'travelling' ? 'travelling to the site for' : 'working on'} stage {a.stage}.
            </p>
          ))}
          {(facts.selectedPersonId === undefined || selected ? (facts.constraints ?? []) : []).map((text) => (
            <p key={text}>{text}</p>
          ))}
          {selected && facts.selectedOffer && (
            <p>
              {facts.selectedOffer.beam
                ? 'Raising the beam is available to this person; they still choose.'
                : facts.selectedOffer.build
                  ? 'Building is available to this person; they still choose.'
                  : 'Building is not currently offered to this person.'}
            </p>
          )}
          {stageMinutes !== null && personId && (
            <p>
              At normal quality, the remaining part of this stage takes about {stageMinutes} minutes of{' '}
              {shortName(personId)}’s work. Travel, breaks, protest and later choices can change the time.
              This is not an estimate for the whole roof.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ConstructionRequirements({ world }: { world: WorldView }) {
  const rows: { label: string; timber: number; work: number }[] = [];
  const last = world.project.stages;
  for (let stage = world.project.stage + 1; stage <= last; stage++) {
    const kind = world.project.kind === 'storeroom' ? 'wall' : stageKind(stage);
    const timber = STAGE_COST[kind].timber;
    const work = kind === 'beam' ? JOBS['raise-beam'].work : STAGE_COST[kind].work;
    rows.push({
      label: `Stage ${stage}${stage === BEAM_STAGE && world.project.kind === 'house' ? ' · beam' : ''}`,
      timber,
      work,
    });
  }
  if (!rows.length) return null;
  return (
    <section className="well-stage-costs" aria-label="Remaining stage requirements">
      <h4>What the remaining stages need</h4>
      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Timber</th>
            <th>Classic work minutes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th>{r.label}</th>
              <td>{r.timber}</td>
              <td>{r.work}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        These are Classic work amounts at base pace. Skill and Rush can change elapsed time. Human builders
        add progress through work sessions. Their pace depends on the builder and work quality; raising the
        beam is a separate job.
      </p>
    </section>
  );
}
