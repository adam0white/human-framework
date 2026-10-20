import { useEffect, useRef, useState } from 'react';
import type { Draft, Frame, SceneWords, Telegraph } from '../protocol.ts';
import { Composer } from './Composer.tsx';
import { spokenLogText } from './conversations.ts';
import { DayLog } from './DayLog.tsx';
import { storyDates } from './dates.ts';
import { planningContext } from './PlanningContext.tsx';
import { consequentialOffer, speakingOpportunity } from './pause-policy.ts';
import { currentReply, sceneResponse } from './scene-response.ts';
import { sceneBeat, sceneWordChoices } from './scene-words.ts';
import { deriveScene, nextEncounter, sceneChoices } from './scenes.ts';
import { useStableSpeechFrame } from './stable-speech-frame.ts';
import { explainTerms } from './terms.tsx';
export interface SceneDayProps {
  frame: Frame;
  liveFrame?: Frame;
  telegraph: { draft: Draft; telegraph: Telegraph } | null;
  whyOpen: boolean;
  selected: string | null;
  onWhy: (id: string) => void;
  onRetainWhy: (id: string) => void;
  onPredict: (draft: Draft | null) => void;
  onSuggest: (draft: Draft, sceneLine?: string) => void;
  onSceneWord?: (kind: 'care' | 'question', beat: string, words: string) => void;
  onSayNothing: () => void;
  onWithdraw: () => void;
  onPause?: () => void;
  onReading?: (reading: boolean) => void;
  active?: boolean;
  sceneReading?: boolean;
  onPersonalReply?: (held: boolean) => void;
}
/** Scenes are presentation only. Inputs still use the existing suggestion protocol. */
export function SceneDay(props: SceneDayProps) {
  const stable = useStableSpeechFrame(props.frame);
  const [unsaid, setUnsaid] = useState<string | null>(null);
  const suggest = (draft: Draft, words?: string) => {
    const live = props.liveFrame ?? props.frame;
    if (words && sceneBeat(stable.frame) !== sceneBeat(live)) {
      // This occasion ended even if the same action is offered again. Do not send it to a new one.
      setUnsaid(words);
      return;
    }
    setUnsaid(null);
    props.onSuggest(draft, words);
  };
  return (
    <SceneDayContent
      key={stable.frame.day}
      {...props}
      frame={stable.frame}
      onSuggest={suggest}
      unsaid={unsaid}
      onDismissUnsaid={() => setUnsaid(null)}
      onKeyDownCapture={stable.onKeyDownCapture}
      onPointerDownCapture={stable.onPointerDownCapture}
    />
  );
}

function SceneDayContent(
  props: SceneDayProps & {
    unsaid: string | null;
    onDismissUnsaid: () => void;
    onKeyDownCapture: (event: { key: string; target: EventTarget | null }) => void;
    onPointerDownCapture: (event: { pointerId: number }) => void;
  },
) {
  const { frame, onPredict, onSuggest, onSayNothing } = props;
  const derived = deriveScene(frame);
  // Freeze a scene's words for its occasion; a later body reading cannot rewrite the exchange.
  const cache = useRef<{ id: string; scene: NonNullable<typeof derived> } | null>(null);
  if (derived && cache.current?.id !== derived.id) cache.current = { id: derived.id, scene: derived };
  const scene = derived?.current ? cache.current?.scene : null;
  // A personal answer belongs to the reader, not to a later activity or status update.
  const personal = useRef<{ key: string; line: SceneWords; scene: typeof scene } | null>(null);
  const received = useRef<string | null>(null);
  const [leftReply, setLeftReply] = useState<string | null>(null);
  const latestWords = frame.sceneWords?.at(-1);
  const wordKey = latestWords ? JSON.stringify(latestWords) : null;
  if (wordKey !== received.current) {
    received.current = wordKey;
    personal.current =
      latestWords &&
      latestWords.day === frame.day &&
      latestWords.kind !== 'suggestion' &&
      latestWords.said !== false
        ? { key: wordKey ?? '', line: latestWords, scene }
        : null;
  }
  const heldPersonal = personal.current?.key !== leftReply ? personal.current : null;
  const onPersonalReply = props.onPersonalReply;
  const hasPersonalReply = !!heldPersonal || props.unsaid !== null;
  useEffect(() => {
    onPersonalReply?.(hasPersonalReply);
    return () => onPersonalReply?.(false);
  }, [hasPersonalReply, onPersonalReply]);
  const leaveReply = () => setLeftReply(personal.current?.key ?? null);
  useEffect(() => {
    if (props.active === false) setLeftReply(personal.current?.key ?? null);
  }, [props.active]);
  const [editor, setEditor] = useState(false);
  const planningSnapshot = useRef<ReturnType<typeof planningContext> | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const [sentBeat, setSentBeat] = useState<string | null>(null);
  const [answerHold, setAnswerHold] = useState(false);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (answerTimer.current) clearTimeout(answerTimer.current);
    },
    [],
  );
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
  const beat = sceneBeat(frame);
  const wordChoices = sceneWordChoices(frame);
  const lastRequest = frame.log.findLast((entry) => entry.kind === 'you');
  const spoken =
    frame.sceneWords
      ?.filter(
        (line) =>
          (line.beat === beat && JSON.stringify(line) !== leftReply) ||
          (answerHold &&
            JSON.stringify(line) !== leftReply &&
            line === frame.sceneWords?.at(-1) &&
            (line.kind !== 'suggestion' || line.said === false)) ||
          (line.kind === 'suggestion' &&
            line.day === frame.day &&
            line.minute === lastRequest?.minute &&
            !!currentReply(frame, scene ?? null)),
      )
      .slice(-2) ?? [];
  const receipt = `${beat}:${lastRequest?.id ?? ''}:${frame.sceneWords?.length ?? 0}`;
  const sending = useRef<string | null>(null);
  const resolvedOpportunity = useRef<string | null>(null);
  const canSpeak = available || wordChoices.length > 0;
  const moreWords = moreFor === beat;
  const opportunity = speakingOpportunity(frame);
  useEffect(() => {
    if (frame.paused && opportunity !== null && opportunity !== resolvedOpportunity.current)
      setSpeaking(beat);
  }, [frame.paused, opportunity, beat]);
  const expanded =
    speaking === beat ||
    (frame.paused && opportunity !== null && opportunity !== resolvedOpportunity.current);
  const reading = (expanded && canSpeak && !heldPersonal) || editor || answerHold;
  const onReading = props.onReading;
  useEffect(() => {
    onReading?.(reading);
    return () => onReading?.(false);
  }, [reading, onReading]);
  const sent = sentBeat === beat;
  const speakWord = (line: (typeof wordChoices)[number]) => {
    if (sent) return;
    leaveReply();
    setSentBeat(beat);
    setAnswerHold(true);
    if (answerTimer.current) clearTimeout(answerTimer.current);
    answerTimer.current = setTimeout(() => setAnswerHold(false), 6000);
    setSpeaking(null);
    setMoreFor(null);
    props.onSceneWord?.(line.kind, beat, line.words);
  };
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
  const livePlanning = planningContext(frame, scene ?? null, visibleLines);
  const shownPlanning = { ...(planningSnapshot.current ?? livePlanning) };
  if (livePlanning.rent) shownPlanning.rent = livePlanning.rent;
  const condensed = moreWords && visibleLines.length > 2;
  const presentedLines = condensed ? visibleLines.slice(-1) : visibleLines;
  const canListen = !!response && !refused && page < 2;
  const latestAction = frame.log.findLast((e) => e.kind === 'act');
  const offer = consequentialOffer(frame);
  const choices = sceneChoices(scene ?? null, frame.options, offer);
  const encounter = nextEncounter(frame);
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
    <section
      className="v-scene-day"
      aria-label="The day"
      onPointerDownCapture={props.onPointerDownCapture}
      onKeyDownCapture={props.onKeyDownCapture}
    >
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
        {props.unsaid && (
          <div className="v-spoken-lines" role="status">
            <p>
              <strong>Unsaid:</strong> “{props.unsaid}”
            </p>
            <p>That moment has passed. Nothing was said.</p>
            <button
              type="button"
              className="v-personal-leave v-btn v-btn-quiet"
              onClick={props.onDismissUnsaid}
            >
              Back to today
            </button>
          </div>
        )}
        {heldPersonal ? (
          <article className="v-personal-reply">
            <p className="v-scene-place">
              {heldPersonal.scene?.place ?? 'With Halil'} · {heldPersonal.line.clock}
            </p>
            <h1>{heldPersonal.scene?.names.join(' and ') ?? 'Halil'}</h1>
            <div className="v-spoken-lines" aria-live="polite">
              <p>
                <strong>You:</strong> “{heldPersonal.line.words}”
              </p>
              <p>
                <strong>{heldPersonal.line.answer.startsWith('He keeps') ? 'Scene' : 'Halil'}:</strong>{' '}
                {heldPersonal.line.answer}
              </p>
            </div>
            <button type="button" className="v-personal-leave v-btn v-btn-quiet" onClick={leaveReply}>
              Back to today
            </button>
          </article>
        ) : scene ? (
          <article className="v-scene-stage" key={scene.id}>
            <p className="v-scene-place">
              {scene.place} · {scene.clock}
            </p>
            <h1>{scene.names.join(' and ')}</h1>
            {scene.kind === 'memory' && <p className="v-scene-memory">He remembers Nuran.</p>}
            {(progressed || condensed) && (
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
              {presentedLines.map((line) => (
                <p className="v-exchange-line" key={`${line.speaker}:${line.words}`}>
                  <strong>{line.speaker}:</strong> “{line.words}”
                </p>
              ))}
            </div>
            {canListen && !condensed && (
              <button
                type="button"
                className="v-conversation-listen v-btn v-btn-quiet"
                onClick={() => {
                  leaveReply();
                  setListened({ id: responseKey, page: page + 1 });
                }}
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
        {!heldPersonal && frame.pauseBeat && !scene && (
          <p className="v-scene-notice">{explainTerms(frame.pauseBeat.text)}</p>
        )}
        {!heldPersonal && spoken.length > 0 && (
          <div className="v-spoken-lines" aria-live="polite">
            {spoken.map((line) => (
              <div key={`${line.beat}:${line.kind}:${line.minute}:${line.words}`}>
                <small>Your words · {line.clock}</small>
                <p>
                  <strong>{line.said === false ? 'Unsaid' : 'You'}:</strong> “{line.words}”
                </p>
                {line.answer && (
                  <p>
                    <strong>
                      {line.said === false || line.answer.startsWith('He keeps') ? 'Scene' : 'Halil'}:
                    </strong>{' '}
                    {line.said === false || line.answer.startsWith('He keeps')
                      ? line.answer
                      : `“${line.answer}”`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {!heldPersonal && reply}
      </div>
      {editor ? (
        <dialog
          ref={dialog}
          className="v-scene-editor"
          aria-label="Plan something specific"
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
            planningContext={shownPlanning}
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
          {heldPersonal ? (
            <div className="v-scene-compact">
              <p className="v-scene-wait">
                {frame.paused ? 'Time is stopped.' : 'Time is passing.'} Later activity is in Timeline.
              </p>
              {(frame.paused || props.sceneReading) && (
                <button type="button" className="v-btn v-btn-quiet" onClick={onSayNothing}>
                  Let time pass
                </button>
              )}
            </div>
          ) : canSpeak ? (
            !expanded ? (
              <div className="v-scene-compact">
                <button
                  type="button"
                  className="v-scene-speak v-btn"
                  onClick={() => {
                    leaveReply();
                    setSpeaking(beat);
                  }}
                >
                  Speak
                </button>
                {frame.paused || props.sceneReading ? (
                  <button type="button" className="v-btn v-btn-quiet" onClick={onSayNothing}>
                    Let time pass
                  </button>
                ) : (
                  <span className="v-scene-wait">Listening. Silence needs no tap.</span>
                )}
              </div>
            ) : (
              <>
                {offer && <p className="v-scene-offer">{explainTerms(storyDates(offer.why))}</p>}
                {available && (
                  <div className="v-scene-choices">
                    {choices.map((choice) => (
                      <button
                        type="button"
                        className="v-scene-choice"
                        key={`${beat}:${choice.draft.optionId}:${choice.label}`}
                        onClick={() => {
                          if (sending.current === receipt) return;
                          leaveReply();
                          sending.current = receipt;
                          resolvedOpportunity.current = opportunity;
                          setAnswerHold(true);
                          if (answerTimer.current) clearTimeout(answerTimer.current);
                          answerTimer.current = setTimeout(() => setAnswerHold(false), 6000);
                          onSuggest(choice.draft, choice.label);
                          setSpeaking(null);
                          setMoreFor(null);
                          onPredict(null);
                        }}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
                {(!available || moreWords) && wordChoices.length > 0 && !sent && (
                  <fieldset className="v-scene-words" aria-label="Your words">
                    {wordChoices.map((line) => (
                      <button
                        type="button"
                        className="v-scene-word"
                        key={`${beat}:${line.kind}:${line.words}`}
                        onClick={() => speakWord(line)}
                      >
                        {line.words}
                      </button>
                    ))}
                  </fieldset>
                )}
                {!available && (
                  <p className="v-scene-wait">He is occupied. Suggestions wait until he is choosing.</p>
                )}
                <div className="v-scene-choice-tools">
                  <button
                    type="button"
                    className="v-scene-silence"
                    onClick={() => {
                      resolvedOpportunity.current = opportunity;
                      setSpeaking(null);
                      setMoreFor(null);
                      onPredict(null);
                      setAnswerHold(false);
                      onSayNothing();
                    }}
                  >
                    Say nothing
                  </button>
                  {available && !moreWords && (
                    <button type="button" className="v-scene-more" onClick={() => setMoreFor(beat)}>
                      Say something else…
                    </button>
                  )}
                </div>
                {available && moreWords && (
                  <button
                    type="button"
                    ref={more}
                    className="v-scene-plan"
                    onClick={() => {
                      onPredict(null);
                      planningSnapshot.current = planningContext(frame, scene ?? null, presentedLines);
                      setEditor(true);
                    }}
                  >
                    Plan something specific…
                  </button>
                )}
              </>
            )
          ) : (
            <div className="v-scene-compact">
              <p className="v-scene-wait">
                {frame.muted
                  ? 'You are silent today. Watch.'
                  : frame.halil.asleep
                    ? 'You can speak when he wakes.'
                    : spoken.length
                      ? 'You have spoken. Give him a little room.'
                      : 'He is occupied. You can speak when he is choosing.'}
              </p>
              {(frame.paused || props.sceneReading) && !frame.muted && (
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
