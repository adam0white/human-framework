/**
 * The end report (voice.md §7.5), one panel that scrolls inside the viewport. No score, stars, or words about worth,
 * faith or acceptance. Keep listening resumes from Eid night; Replay restarts the seed; New town picks a new one.
 */
import { useEffect, useRef } from 'react';
import type { ReportView, SceneWords } from '../protocol.ts';
import { EndsList, UnaskedStrip } from './EndsPane.tsx';
import { ModelNotes } from './parts.tsx';
import { Strip, StripLegend } from './Strip.tsx';
import { companyWords } from './speech-summary.ts';

function Lines({ lines, empty }: { lines: string[]; empty: string }) {
  if (lines.length === 0) return <p className="v-muted">{empty}</p>;
  return (
    <ul className="v-lines">
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

export function Report({
  view,
  onKeepListening,
  onReplay,
  onNewTown,
  onDownload,
  sceneWords = [],
}: {
  view: ReportView;
  sceneWords?: readonly SceneWords[] | undefined;
  onKeepListening: () => void;
  onReplay: () => void;
  onNewTown: () => void;
  /** Download this run as a playtest file. */
  onDownload?: () => void;
}) {
  const company = companyWords(sceneWords);
  const spoke = view.spoke !== false || company.length > 0;
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    head.current?.focus();
  }, []);
  return (
    <div className="v-overlay v-overlay-eid" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="v-card v-report">
        <p className="v-kicker">The week after Eid</p>
        <h1 id="report-title" ref={head} tabIndex={-1}>
          Without you
        </h1>

        {company.length > 0 && (
          <section>
            <h2>What you said</h2>
            <Lines lines={company} empty="" />
            {view.spoke === false && <p>You kept him company without suggesting anything.</p>}
          </section>
        )}

        {view.eid.summary.length > 0 && (
          <section className="v-report-summary">
            <Lines lines={view.eid.summary} empty="" />
          </section>
        )}

        <section>
          <h2>Eid, without you</h2>
          <Strip row={view.eid.strip} showLabel={false} />
          <Lines lines={view.eid.lines} empty="A quiet day." />
        </section>

        {view.ledger && view.ledger.length > 0 && (
          <section>
            <h2>What you suggested, and what he did on Eid</h2>
            <ul className="v-lines v-ledger">
              {view.ledger.map((l) => (
                <li key={l.said}>
                  <strong>
                    {l.said
                      .replace(/said /g, 'suggested ')
                      .replace(/on the days you spoke/g, 'on the days you played')}
                  </strong>{' '}
                  → {l.eid}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="v-report-cols">
          <section>
            <h2>What he did on his own</h2>
            <Lines lines={view.own} empty="Nothing new that he did unprompted." />
          </section>
          {view.others.length > 0 && (
            <section>
              <h2>What others still had to tell him</h2>
              <Lines lines={view.others} empty="" />
            </section>
          )}
          {view.stopped.length > 0 && (
            <section>
              <h2>What stopped</h2>
              <Lines lines={view.stopped} empty="" />
            </section>
          )}
        </div>

        <section>
          <h2>Who he listens to</h2>
          <table className="v-report-trust">
            <thead>
              <tr>
                <th scope="col">Voice</th>
                <th scope="col">End of Ramadan</th>
                <th scope="col">A week after Eid</th>
              </tr>
            </thead>
            <tbody>
              {view.trust.map((t) => (
                <tr key={t.id}>
                  <th scope="row">{t.name}</th>
                  <td>{t.endRamadan}</td>
                  <td>{t.endWeek}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>His ends when Ramadan ended</h2>
          <p className="v-report-caption">
            As of Eid morning: his record of the month. Under each, what came of it on Eid and in the six days
            after.
          </p>
          <UnaskedStrip items={view.unasked} lead="At Eid morning he would have done unasked:" />
          <EndsList ends={view.ends} />
        </section>

        <div className="v-report-cols">
          <section className="v-report-body">
            <h2>His body a week after Eid, as the doctor would read it</h2>
            <p className="v-report-caption">He never feels this directly.</p>
            <Lines lines={view.body} empty="No reading." />
          </section>
          <section>
            <h2>Still open a week after Eid</h2>
            <Lines lines={view.open} empty="Nothing left open." />
          </section>
        </div>

        {view.silent && (
          <section className="v-report-silent">
            <h2>A month without your suggestions</h2>
            <p className={view.silent.rows.length > 0 ? 'v-report-caption' : 'v-silent-same'}>
              {view.spoke === false
                ? 'You made no suggestions this month.'
                : 'The same town from the same start, run again without your suggestions.'}
            </p>
            {view.silent.rows.length > 0 && (
              <ul className="v-lines v-silent-rows">
                {view.silent.rows.map((r) => (
                  <li key={r.topic}>
                    <strong>{r.topic}</strong>
                    <span>
                      <span className="v-silent-label">As played</span> {r.spoke}
                    </span>
                    <span>
                      <span className="v-silent-label">Without your suggestions</span> {r.silent}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {view.silent.same && <p className="v-silent-same">{view.silent.same}</p>}
            {view.silent.smaller && <p className="v-silent-same">{view.silent.smaller}</p>}
            {/* Without suggestions there is no simulation comparison; care remains recorded above. */}
            {(view.silent.rows.length > 0 || view.silent.same) && (
              <p className="v-silent-caption">{view.silent.caption}</p>
            )}
          </section>
        )}

        <section>
          <h2>{!spoke ? 'The days you watched, and Eid' : 'The days you spoke, and Eid'}</h2>
          <div className="v-strips">
            {view.rows.map((r) => (
              <Strip key={r.label} row={r} />
            ))}
          </div>
          <StripLegend rows={view.rows} />
        </section>

        <div className="v-report-actions">
          <button type="button" className="v-btn v-btn-primary v-btn-big" onClick={onKeepListening}>
            Keep listening
          </button>
          <button type="button" className="v-btn v-btn-big" onClick={onReplay}>
            Replay
          </button>
          <button type="button" className="v-btn v-btn-big" onClick={onNewTown}>
            New town
          </button>
        </div>
        {onDownload && (
          <p className="v-report-playtest">
            <button type="button" className="v-btn v-btn-quiet v-btn-small" onClick={onDownload}>
              Download playtest file
            </button>
          </p>
        )}
        <ModelNotes notes={view.modelNotes.length > 0 ? view.modelNotes : undefined} />
      </div>
    </div>
  );
}
