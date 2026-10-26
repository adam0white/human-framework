import { useCallback, useEffect, useRef, useState } from 'react';
import type { Draft, Frame, SceneWords, Telegraph } from '../protocol.ts';
import { Composer } from './Composer.tsx';
import { storyDates } from './dates.ts';
import { planningContext } from './PlanningContext.tsx';
import { consequentialOffer, speakingOpportunity } from './pause-policy.ts';
import { callAccount, requestAccount } from './request-account.ts';
import { currentReply, sceneResponse } from './scene-response.ts';
import { sceneBeat, sceneWordChoices } from './scene-words.ts';
import { deriveScene, nextEncounter, sceneChoices } from './scenes.ts';
import { useStableSpeechFrame } from './stable-speech-frame.ts';
import { explainTerms } from './terms.tsx';
import { voiceWords as settingWords } from './words.ts';
import './voice-components.css';
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
  speakRequest?: number;
  onSpeakingChange?: (open: boolean) => void;
  onSpeakAvailability?: (available: boolean, caption: string) => void;
}
/** Scenes are presentation only. Inputs still use the existing suggestion protocol. */
export function SceneDay(props: SceneDayProps) {
  const [holdingSheet, setHoldingSheet] = useState(false);
  const stable = useStableSpeechFrame(props.frame, holdingSheet);
  const sheetWasOpen = useRef(false);
  const latestFrame = useRef(props.liveFrame ?? props.frame);
  latestFrame.current = props.liveFrame ?? props.frame;
  const onSpeakingChange = useCallback(
    (open: boolean) => {
      if (open !== sheetWasOpen.current) {
        sheetWasOpen.current = open;
        // A stopped clock cannot expire a choice. Retain choices when reading a running day.
        setHoldingSheet(open && !latestFrame.current.paused);
      }
      props.onSpeakingChange?.(open);
    },
    [props.onSpeakingChange],
  );
  const [unsaid, setUnsaid] = useState<string | null>(null);
  const suggest = (draft: Draft, words?: string) => {
    setHoldingSheet(false);
    const live = props.liveFrame ?? props.frame;
    const available =
      ['day', 'free', 'eid'].includes(live.phase) &&
      live.composer.open &&
      !live.muted &&
      live.options.some((option) => option.id === draft.optionId);
    if (!available || sceneBeat(stable.frame) !== sceneBeat(live)) {
      // This occasion ended even if the same action is offered again. Do not send it to a new one.
      props.onPersonalReply?.(true);
      setUnsaid(
        words ??
          stable.frame.options.find((option) => option.id === draft.optionId)?.label ??
          'Your suggestion',
      );
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
      onSpeakingChange={onSpeakingChange}
      onSceneWord={(kind, beat, words) => {
        setHoldingSheet(false);
        props.onSceneWord?.(kind, beat, words);
      }}
      onSayNothing={() => {
        setHoldingSheet(false);
        props.onSayNothing();
      }}
      earlierMoment={sceneBeat(stable.frame) !== sceneBeat(props.liveFrame ?? props.frame)}
      unsaid={unsaid}
      onDismissUnsaid={() => setUnsaid(null)}
      onKeyDownCapture={stable.onKeyDownCapture}
      onPointerDownCapture={stable.onPointerDownCapture}
    />
  );
}

function SceneDayContent(
  props: SceneDayProps & {
    earlierMoment: boolean;
    unsaid: string | null;
    onDismissUnsaid: () => void;
    onKeyDownCapture: (event: { key: string; target: EventTarget | null }) => void;
    onPointerDownCapture: (event: { pointerId: number }) => void;
  },
) {
  const { frame, onPredict, onSuggest, onSayNothing } = props;
  const accountFrame = props.liveFrame ?? frame;
  const account = requestAccount(accountFrame);
  const calls = callAccount(accountFrame);
  const dayEnd = accountFrame.phase === 'between';
  const leaveLabel = dayEnd
    ? 'Day over · See recap and next day'
    : accountFrame.phase === 'report'
      ? 'See the ending'
      : 'Back to now';
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
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!editor && restoreFocus.current) {
      more.current?.focus();
      restoreFocus.current = false;
    }
  }, [editor]);
  const closeEditor = () => {
    restoreFocus.current = true;
    setEditor(false);
  };
  const available = ['day', 'free', 'eid'].includes(frame.phase) && frame.composer.open && !frame.muted;
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
  const [closedOpportunity, setClosedOpportunity] = useState<string | null>(null);
  const canSpeak = available || wordChoices.length > 0;
  const moreWords = moreFor === beat;
  const opportunity = speakingOpportunity(frame);
  useEffect(() => {
    if (
      frame.paused &&
      opportunity !== null &&
      opportunity !== resolvedOpportunity.current &&
      opportunity !== closedOpportunity
    )
      setSpeaking(beat);
  }, [frame.paused, opportunity, beat, closedOpportunity]);
  const expanded =
    speaking === beat ||
    (frame.paused &&
      opportunity !== null &&
      opportunity !== resolvedOpportunity.current &&
      opportunity !== closedOpportunity);
  const [dismissedOutcomes, setDismissedOutcomes] = useState<Set<string>>(() => new Set());
  const outcomes = frame.log.filter(
    (entry) =>
      entry.day === frame.day &&
      entry.minute <= frame.minute &&
      entry.kind === 'note' &&
      !dismissedOutcomes.has(entry.id) &&
      ((entry.who === 'you' && /Your suggestion (?:has (?:now )?ended|fades)/.test(entry.text)) ||
        /Osman’s payment deadline has passed/.test(entry.text)),
  );
  const reading = (expanded && canSpeak && !heldPersonal) || editor || answerHold || outcomes.length > 0;
  const requested = useRef(props.speakRequest);
  useEffect(() => {
    if (props.speakRequest === requested.current) return;
    requested.current = props.speakRequest;
    if (canSpeak) {
      setLeftReply(personal.current?.key ?? null);
      setSpeaking(beat);
    }
  }, [props.speakRequest, canSpeak, beat]);
  const sheetOpen = editor || (expanded && canSpeak && !heldPersonal);
  useEffect(() => {
    props.onSpeakingChange?.(sheetOpen);
    return () => props.onSpeakingChange?.(false);
  }, [sheetOpen, props.onSpeakingChange]);
  const caption = frame.muted
    ? 'You are silent today. Watch.'
    : frame.halil.asleep
      ? 'You can speak when he wakes.'
      : spoken.length
        ? 'You have spoken. Give him a little room.'
        : canSpeak
          ? 'You can wait without choosing a suggestion.'
          : 'He is occupied. You can speak when he is choosing.';
  useEffect(() => {
    props.onSpeakAvailability?.(canSpeak && !heldPersonal, caption);
  }, [canSpeak, heldPersonal, caption, props.onSpeakAvailability]);
  const onReading = props.onReading;
  useEffect(() => {
    onReading?.(reading);
    return () => onReading?.(false);
  }, [reading, onReading]);
  const sent = sentBeat === beat;
  const speakWord = (line: (typeof wordChoices)[number]) => {
    if (sent) return;
    leaveReply();
    resolvedOpportunity.current = opportunity;
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
  const offer = consequentialOffer(frame);
  const choices = sceneChoices(scene ?? null, frame.options, offer);
  const encounter = nextEncounter(frame);
  const replyText = answer?.text.replace(
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
      ? `Halil chose to ${frame.halil.doing.label}${frame.halil.doing.until ? `, until ${frame.halil.doing.until}` : ''}.`
      : 'Halil is deciding what to do.';
  return (
    <section
      className="v-scene-day"
      aria-label="The day"
      onPointerDownCapture={props.onPointerDownCapture}
      onKeyDownCapture={props.onKeyDownCapture}
    >
      {frame.standing && !frame.muted && (
        <div className="v-held-words" role="note" aria-label="Your standing word">
          <span>
            Your suggestion: {explainTerms(frame.standing.label)} · until{' '}
            {settingWords(frame.standing.expires)}
          </span>
          <button type="button" className="v-btn v-btn-quiet" onClick={props.onWithdraw}>
            Withdraw
          </button>
        </div>
      )}
      <div className="v-scene-reading">
        {account && (
          <aside className="v-scene-answer" aria-label="Your latest suggestion" role="status">
            <p>
              <small>
                Day {account.sent.day} · {account.sent.clock}
              </small>{' '}
              · {settingWords(account.sent.text)}
            </p>
            {account.answer && (
              <p>
                <small>
                  Day {account.answer.day} · {account.answer.clock}
                </small>{' '}
                · {settingWords(account.answer.text)}
              </p>
            )}
            <p>{settingWords(account.status)}</p>
            {account.window && <p>{settingWords(account.window)}</p>}
            {accountFrame.halil.doing && (
              <p>
                Now: {settingWords(accountFrame.halil.doing.label)}. This does not establish why he chose it.
              </p>
            )}
          </aside>
        )}
        {calls.length > 0 && (
          <aside className="v-scene-answer" aria-label="Recorded calls">
            {calls.map((call) => (
              <p key={call.id}>
                <small>
                  Day {call.day} · recorded at {call.clock}
                </small>{' '}
                · {settingWords(call.text)}
              </p>
            ))}
          </aside>
        )}
        {outcomes.length > 0 && (
          <aside className="v-scene-answer" aria-label="What happened" role="status">
            {outcomes.map((entry) => (
              <p key={entry.id}>
                <small>{entry.clock}</small> · {settingWords(entry.text)}
              </p>
            ))}
            <button
              type="button"
              className="v-btn v-btn-quiet"
              onClick={() =>
                setDismissedOutcomes(
                  (previous) => new Set([...previous, ...outcomes.map((entry) => entry.id)]),
                )
              }
            >
              Continue
            </button>
          </aside>
        )}
        {props.unsaid && (
          <div className="v-spoken-lines" role="status">
            <p>
              <strong>Unsaid:</strong> “{settingWords(props.unsaid)}”
            </p>
            <p>That moment has passed. Nothing was said.</p>
            <button
              type="button"
              className="v-personal-leave v-btn v-btn-quiet"
              onClick={props.onDismissUnsaid}
            >
              {leaveLabel}
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
                <strong>You:</strong> “{settingWords(heldPersonal.line.words)}”
              </p>
              <p>
                <strong>{heldPersonal.line.answer.startsWith('He keeps') ? 'Scene' : 'Halil'}:</strong>{' '}
                {settingWords(heldPersonal.line.answer)}
              </p>
            </div>
            {dayEnd && (
              <p role="status">The day is over. Leave this reply to see the recap and the next-day step.</p>
            )}
            <button type="button" className="v-personal-leave v-btn v-btn-quiet" onClick={leaveReply}>
              {leaveLabel}
            </button>
          </article>
        ) : scene ? (
          <article className="v-scene-stage" key={scene.id}>
            <p className="v-scene-place">
              {settingWords(scene.place)} · Started at {scene.clock}
            </p>
            <h1>{settingWords(scene.names.join(' and '))}</h1>
            {scene.kind === 'memory' && <p className="v-scene-memory">He remembers Nuran.</p>}
            {(progressed || condensed) && (
              <details className="v-conversation-earlier">
                <summary>Earlier in this conversation</summary>
                {scene.lines.map((line) => (
                  <p key={`${line.speaker}:${line.words}`}>
                    <strong>{settingWords(line.speaker)}:</strong> “{settingWords(line.words)}”
                  </p>
                ))}
              </details>
            )}
            <div className="v-exchange" aria-live="polite">
              {presentedLines.map((line) => (
                <p className="v-exchange-line" key={`${line.speaker}:${line.words}`}>
                  <strong>{settingWords(line.speaker)}:</strong> “{settingWords(line.words)}”
                </p>
              ))}
            </div>
            {canListen && !condensed && !sheetOpen && (
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
            <p>{settingWords(activity)}</p>
            {encounter && <p className="v-next-encounter">{settingWords(encounter)}</p>}
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
                  <strong>{line.said === false ? 'Unsaid' : 'You'}:</strong> “{settingWords(line.words)}”
                </p>
                {line.answer && (
                  <p>
                    <strong>
                      {line.said === false || line.answer.startsWith('He keeps') ? 'Scene' : 'Halil'}:
                    </strong>{' '}
                    {settingWords(
                      line.said === false || line.answer.startsWith('He keeps')
                        ? line.answer
                        : `“${line.answer}”`,
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {!heldPersonal && reply}
      </div>
      {editor ? (
        <section
          className="v-scene-editor v-plan-sheet"
          role="dialog"
          aria-label="Plan something specific"
          onKeyDownCapture={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              closeEditor();
            }
          }}
        >
          <button type="button" className="v-scene-editor-close v-btn" onClick={closeEditor}>
            ← Back to the scene · Plan something specific
          </button>
          <Composer
            standingLabel={accountFrame.standing?.label}
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
              resolvedOpportunity.current = opportunity;
              setSpeaking(null);
              onSuggest(d);
              closeEditor();
            }}
            onSayNothing={() => {
              resolvedOpportunity.current = opportunity;
              setSpeaking(null);
              onSayNothing();
              closeEditor();
            }}
          />
        </section>
      ) : expanded && canSpeak && !heldPersonal ? (
        <section className="v-scene-participate v-speaking-sheet" role="dialog" aria-label="Speak to Halil">
          <header className="v-speaking-header">
            <h2>Speak to Halil</h2>
            <button
              type="button"
              aria-label="Close speaking sheet"
              onClick={() => {
                setSpeaking(null);
                setClosedOpportunity(opportunity);
                setMoreFor(null);
              }}
            >
              ×
            </button>
          </header>
          <div className="v-speaking-body">
            {scene && presentedLines.at(-1) && (
              <p className="v-scene-offer">
                {settingWords(scene.names.join(' and '))} · {settingWords(presentedLines.at(-1)?.words ?? '')}
              </p>
            )}
            {props.earlierMoment && (
              <p role="status">
                These choices are from an earlier moment. If a choice has ended, nothing will be said.
              </p>
            )}
            {offer && <p className="v-scene-offer">{explainTerms(storyDates(offer.why))}</p>}
            {available && accountFrame.standing && (
              <p role="note">
                A new suggestion replaces your standing word: {settingWords(accountFrame.standing.label)}.
                Saying nothing keeps it.
              </p>
            )}
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
                    {settingWords(choice.label)}
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
                    {settingWords(line.words)}
                  </button>
                ))}
              </fieldset>
            )}
            {!available && (
              <p className="v-scene-wait">He is occupied. Suggestions wait until he is choosing.</p>
            )}
            <div className="v-scene-choice-tools">
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
          </div>
          <div className="v-speaking-actions">
            {canListen && (
              <button
                type="button"
                className="v-conversation-listen v-btn v-btn-quiet"
                onClick={() => {
                  resolvedOpportunity.current = opportunity;
                  setSpeaking(null);
                  setClosedOpportunity(opportunity);
                  setMoreFor(null);
                  setListened({ id: responseKey, page: page + 1 });
                }}
              >
                Keep listening
              </button>
            )}
            <button
              type="button"
              className="v-scene-silence v-btn"
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
          </div>
        </section>
      ) : null}
    </section>
  );
}
