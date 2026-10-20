import { type RefObject, useEffect, useRef, useState } from 'react';
import type { Draft, Frame, Telegraph } from '../protocol.ts';
import { Composer } from './Composer.tsx';
import { spokenLogText } from './conversations.ts';
import { DayLog } from './DayLog.tsx';
import { storyDates } from './dates.ts';
import { obstacleWords } from './obstacle.ts';
import { consequentialOffer, speakingOpportunity } from './pause-policy.ts';
import { currentReply, sceneResponse } from './scene-response.ts';
import { deriveScene, nextEncounter, sceneChoices } from './scenes.ts';
import { explainTerms } from './terms.tsx';
export interface SceneDayProps {
  frame: Frame;
  telegraph: { draft: Draft; telegraph: Telegraph } | null;
  whyOpen: boolean;
  selected: string | null;
  onWhy: (id: string) => void;
  onRetainWhy: (id: string) => void;
  onPredict: (draft: Draft | null) => void;
  onSuggest: (draft: Draft) => void;
  onSayNothing: () => void;
  onWithdraw: () => void;
  onPause?: () => void;
}
/** Scenes are presentation only. Inputs still use the existing suggestion protocol. */
export function SceneDay(props: SceneDayProps) {
  const { frame, onPredict, onSuggest, onSayNothing } = props;
  const derived = deriveScene(frame);
  // Freeze a scene's words for its occasion; a later body reading cannot rewrite the exchange.
  const cache = useRef<{ id: string; scene: NonNullable<typeof derived> } | null>(null);
  if (derived && cache.current?.id !== derived.id) cache.current = { id: derived.id, scene: derived };
  const scene = derived?.current ? cache.current?.scene : null;
  const [editor, setEditor] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (editor) dialog.current?.showModal();
    else if (restoreFocus.current) {
      more.current?.focus();
      restoreFocus.current = false;
    }
  }, [editor]);
  const closeEditor = () => {
    restoreFocus.current = true;
    setEditor(false);
  };
  const available = frame.composer.open && !frame.muted;
  const answer = currentReply(frame, scene ?? null);
  const responseKey = `${scene?.id ?? ''}:${answer?.id ?? ''}`;
  const responseCache = useRef<{ key: string; value: ReturnType<typeof sceneResponse> } | null>(null);
  if (responseCache.current?.key !== responseKey)
    responseCache.current = { key: responseKey, value: sceneResponse(frame, scene ?? null) };
  const response = responseCache.current.value;
  const [listened, setListened] = useState<{ id: string; page: number } | null>(null);
  const page = listened?.id === responseKey ? listened.page : response?.accepted ? 1 : 0;
  const refused = !!response?.answer && !response.accepted;
  const progressed = !!response && (page > 0 || refused);
  const visibleLines = progressed
    ? [...response.lines, ...(page >= 2 ? response.more : [])]
    : (scene?.lines ?? []);
  const canListen = !!response && !refused && page < 2;
  const latestAction = frame.log.findLast((e) => e.kind === 'act');
  const offer = consequentialOffer(frame);
  const choices = sceneChoices(scene ?? null, frame.options, offer);
  const encounter = nextEncounter(frame);
  const opportunity = speakingOpportunity(frame);
  const replyText =
    answer &&
    spokenLogText(answer.text).replace(
      /^(Talk with Hacer at the door|Have tea with Rıza|Call Selin)\?\s*/,
      '',
    );
  const reply = answer && !response?.answer && (
    <div className="v-scene-answer" aria-live="polite">
      <small>His answer · {answer.clock}</small>
      <p>Halil: {explainTerms(replyText ?? '')}</p>
    </div>
  );
  const activity = frame.halil.asleep
    ? 'Halil is asleep.'
    : frame.halil.doing
      ? `Halil is ${frame.halil.doing.label}.`
      : 'Halil is deciding what to do.';
  return (
    <section className="v-scene-day" aria-label="The day">
      <div className="v-scene-tools">
        <details className="v-routine">
          <summary>Timeline</summary>
          <DayLog
            log={frame.log}
            moment={{ minute: frame.minute, halil: frame.halil }}
            paused={frame.paused}
            onWhy={props.onWhy}
            onRetainWhy={props.onRetainWhy}
            selected={props.selected}
          />
        </details>
        {frame.standing && !frame.muted && (
          <details className="v-held-words">
            <summary>Your words</summary>
            <p className="v-held-line">
              {explainTerms(frame.standing.label)} · until {frame.standing.expires}
              <button type="button" className="v-btn v-btn-quiet" onClick={props.onWithdraw}>
                Withdraw
              </button>
            </p>
          </details>
        )}
        {latestAction?.decisionId && (
          <button
            type="button"
            className="v-current-why"
            onClick={() => latestAction.decisionId && props.onWhy(latestAction.decisionId)}
          >
            Why his current action?
          </button>
        )}
      </div>
      <div className="v-scene-reading">
        {scene ? (
          <article className="v-scene-stage" key={scene.id}>
            <p className="v-scene-place">
              {scene.place} · {scene.clock}
            </p>
            <h1>{scene.names.join(' and ')}</h1>
            {scene.kind === 'memory' && <p className="v-scene-memory">He remembers Nuran.</p>}
            {progressed && (
              <details className="v-conversation-earlier">
                <summary>Earlier in this conversation</summary>
                {scene.lines.map((line) => (
                  <p key={`${line.speaker}:${line.words}`}>
                    <strong>{line.speaker}:</strong> “{line.words}”
                  </p>
                ))}
              </details>
            )}
            <div className="v-exchange" aria-live="polite">
              {visibleLines.map((line) => (
                <p className="v-exchange-line" key={`${line.speaker}:${line.words}`}>
                  <strong>{line.speaker}:</strong> “{line.words}”
                </p>
              ))}
            </div>
            {canListen && (
              <button
                type="button"
                className="v-conversation-listen v-btn v-btn-quiet"
                onClick={() => setListened({ id: responseKey, page: page + 1 })}
              >
                Keep listening
              </button>
            )}
          </article>
        ) : (
          <div className="v-between-scenes">
            <p>{activity}</p>
            {encounter && <p className="v-next-encounter">{encounter}</p>}
          </div>
        )}
        {frame.pauseBeat && !scene && <p className="v-scene-notice">{explainTerms(frame.pauseBeat.text)}</p>}
        {reply}
      </div>
      {editor ? (
        <dialog
          ref={dialog}
          className="v-scene-editor"
          aria-label="Say something else"
          onKeyDownCapture={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              closeEditor();
            }
          }}
          onCancel={(e) => {
            e.preventDefault();
            closeEditor();
          }}
        >
          <button type="button" className="v-scene-editor-close v-btn" onClick={closeEditor}>
            Back to the scene
          </button>
          <Composer
            composer={frame.composer}
            prefill={frame.prefill}
            options={frame.options}
            leaning={frame.leaning}
            muted={frame.muted}
            doingLabel={frame.halil.doing?.label}
            telegraph={props.telegraph}
            whyOpen={props.whyOpen}
            onPredict={onPredict}
            onSuggest={(d) => {
              onSuggest(d);
              closeEditor();
            }}
            onSayNothing={() => {
              onSayNothing();
              closeEditor();
            }}
          />
        </dialog>
      ) : (
        <div className="v-scene-participate v-scene-participate-secondary">
          {available ? (
            <SceneSuggestions
              key={`${opportunity ?? 'routine'}:${offer?.optionId ?? ''}`}
              offer={offer ? explainTerms(storyDates(offer.why)) : null}
              expand={frame.paused && opportunity !== null}
              paused={frame.paused}
              onPause={props.onPause}
              choices={choices}
              telegraph={props.telegraph}
              onPredict={onPredict}
              onSuggest={onSuggest}
              onSayNothing={onSayNothing}
              moreRef={more}
              onMore={() => {
                onPredict(null);
                setEditor(true);
              }}
            />
          ) : (
            <div className="v-scene-compact">
              <p className="v-scene-wait">
                {frame.muted
                  ? 'You are silent today. Watch.'
                  : frame.halil.asleep
                    ? 'You can speak when he wakes.'
                    : 'He is busy. You can speak when he is choosing.'}
              </p>
              {frame.paused && !frame.muted && (
                <button type="button" className="v-scene-listen v-btn" onClick={onSayNothing}>
                  Let time pass
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function SceneSuggestions({
  choices,
  telegraph,
  onPredict,
  onSuggest,
  onSayNothing,
  onMore,
  moreRef,
  expand,
  paused,
  onPause,
  offer,
}: Pick<SceneDayProps, 'telegraph' | 'onPredict' | 'onSuggest' | 'onSayNothing'> & {
  offer: string | null;
  expand: boolean;
  paused: boolean;
  onPause?: (() => void) | undefined;
  choices: ReturnType<typeof sceneChoices>;
  onMore: () => void;
  moreRef: RefObject<HTMLButtonElement | null>;
}) {
  const [opened, setOpened] = useState<boolean | null>(null);
  const expanded = opened ?? expand;
  const [draft, setDraft] = useState<Draft | null>(null);
  const selected = draft && choices.some((c) => c.draft.optionId === draft.optionId) ? draft : null;
  const id = selected?.optionId;
  // Re-predict when the offered choices change, even if a selected action survives.
  const ids = choices.map((c) => c.draft.optionId).join('|');
  // biome-ignore lint/correctness/useExhaustiveDependencies: changed offers invalidate the prediction context.
  useEffect(() => {
    onPredict(id ? { optionId: id, strength: 'mention', insist: false } : null);
  }, [id, ids, onPredict]);
  const prediction =
    selected &&
    telegraph?.draft.optionId === selected.optionId &&
    telegraph.draft.strength === 'mention' &&
    !telegraph.draft.insist &&
    !telegraph.draft.appeal
      ? telegraph.telegraph
      : null;
  const silence = () => {
    setDraft(null);
    setOpened(false);
    onPredict(null);
    onSayNothing();
  };
  if (!expanded)
    return (
      <div className="v-scene-compact">
        <button
          type="button"
          className="v-scene-speak v-btn"
          aria-expanded={false}
          onClick={() => {
            onPause?.();
            setOpened(true);
          }}
        >
          Speak
        </button>
        {paused ? (
          <button type="button" className="v-scene-listen v-btn v-btn-quiet" onClick={silence}>
            Let time pass
          </button>
        ) : (
          <span className="v-scene-wait">Listening. Silence needs no tap.</span>
        )}
      </div>
    );
  return (
    <>
      {offer && <p className="v-scene-offer">{offer}</p>}
      {selected ? (
        <>
          <p className="v-selected-words">
            {choices.find((choice) => choice.draft.optionId === selected.optionId)?.label}
          </p>
          <div className="v-scene-preview">
            <p className="v-scene-likely" aria-live="polite">
              {prediction
                ? `Likely: “${explainTerms(obstacleWords(prediction) ?? prediction.says)}”`
                : 'Reading his likely reply…'}
            </p>
            <button
              type="button"
              className="v-scene-send v-btn"
              disabled={!prediction}
              onClick={() => {
                onSuggest(selected);
                setDraft(null);
                setOpened(false);
                onPredict(null);
              }}
            >
              Say it
            </button>
          </div>
        </>
      ) : (
        <div className="v-scene-choices">
          {choices.map((choice) => (
            <button
              type="button"
              className="v-scene-choice"
              key={choice.draft.optionId}
              onClick={() => setDraft(choice.draft)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      <div className="v-scene-choice-tools">
        <button type="button" className="v-scene-silence" onClick={silence}>
          Say nothing
        </button>
        {selected ? (
          <button type="button" className="v-scene-more" onClick={() => setDraft(null)}>
            Change words
          </button>
        ) : (
          <button ref={moreRef} type="button" className="v-scene-more" onClick={onMore}>
            Say something else…
          </button>
        )}
      </div>
    </>
  );
}
