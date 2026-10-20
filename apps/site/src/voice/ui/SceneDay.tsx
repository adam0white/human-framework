import { type RefObject, useEffect, useRef, useState } from 'react';
import type { Draft, Frame, Telegraph } from '../protocol.ts';
import { Composer } from './Composer.tsx';
import { spokenLogText } from './conversations.ts';
import { DayLog } from './DayLog.tsx';
import { obstacleWords } from './obstacle.ts';
import { StandingCard } from './StandingCard.tsx';
import { deriveScene, nextEncounter, sceneChoices } from './scenes.ts';
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
  onScenePause?: () => void;
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
  const read = useRef(new Set<string>());
  const sceneId = scene?.id;
  useEffect(() => {
    if (!sceneId || !available || read.current.has(sceneId)) return;
    read.current.add(sceneId);
    if (frame.autoPause && !frame.paused) props.onScenePause?.();
  }, [sceneId, available, frame.autoPause, frame.paused, props.onScenePause]);
  const answer = frame.log.findLast((e) => e.kind === 'answer');
  const you = answer ? frame.log.findLast((e) => e.kind === 'you' && e.minute <= answer.minute) : undefined;
  const latestAction = frame.log.findLast((e) => e.kind === 'act');
  const choices = sceneChoices(scene ?? null, frame.options);
  const encounter = nextEncounter(frame);
  const activity = frame.halil.asleep
    ? 'Halil is asleep.'
    : frame.halil.doing
      ? `Halil is ${frame.halil.doing.label}.`
      : 'Halil is deciding what to do.';
  return (
    <section className="v-scene-day" aria-label="The day">
      <details className="v-routine">
        <summary>Today’s timeline</summary>
        <DayLog
          log={frame.log}
          moment={{ minute: frame.minute, halil: frame.halil }}
          paused={frame.paused}
          onWhy={props.onWhy}
          onRetainWhy={props.onRetainWhy}
          selected={props.selected}
        />
      </details>
      <div className="v-scene-reading">
        {scene ? (
          <article className="v-scene-stage" key={scene.id}>
            <p className="v-scene-place">
              {scene.place} · {scene.clock}
            </p>
            <h1>{scene.names.join(' and ')}</h1>
            {scene.kind === 'memory' && <p className="v-scene-memory">He remembers Nuran.</p>}
            <div className="v-exchange">
              {scene.lines.map((line) => (
                <p className="v-exchange-line" key={`${line.speaker}:${line.words}`}>
                  <strong>{line.speaker}:</strong> “{line.words}”
                </p>
              ))}
            </div>
          </article>
        ) : (
          <div className="v-between-scenes">
            <p>{activity}</p>
            {encounter && <p className="v-next-encounter">{encounter}</p>}
          </div>
        )}
        {frame.pauseBeat && <p className="v-scene-notice">{frame.pauseBeat.text}</p>}
        {latestAction?.decisionId && (
          <button
            type="button"
            className="v-current-why"
            onClick={() => latestAction.decisionId && props.onWhy(latestAction.decisionId)}
          >
            Why his current action?
          </button>
        )}
        {answer && (
          <div className="v-scene-answer" aria-live="polite">
            <small>
              {latestAction && latestAction.minute > answer.minute ? 'Earlier answer' : 'His answer'} ·{' '}
              {answer.clock}
            </small>
            {you && <p>{spokenLogText(you.text)}</p>}
            <p>Halil: “{spokenLogText(answer.text)}”</p>
          </div>
        )}
      </div>
      {frame.standing && !frame.muted && (
        <StandingCard standing={frame.standing} onWithdraw={props.onWithdraw} />
      )}
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
              key={`${scene?.id ?? 'between'}:${frame.composer.open}`}
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
            <p className="v-scene-wait">
              {frame.muted
                ? 'You are silent today. Watch.'
                : frame.halil.asleep
                  ? 'You can speak when he wakes.'
                  : 'He is busy. You can speak when he is choosing.'}
            </p>
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
}: Pick<SceneDayProps, 'telegraph' | 'onPredict' | 'onSuggest' | 'onSayNothing'> & {
  choices: ReturnType<typeof sceneChoices>;
  onMore: () => void;
  moreRef: RefObject<HTMLButtonElement | null>;
}) {
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
  return (
    <>
      <div className="v-scene-choices">
        {choices.map((choice) => (
          <button
            type="button"
            className="v-scene-choice"
            key={choice.draft.optionId}
            aria-pressed={selected?.optionId === choice.draft.optionId}
            onClick={() => setDraft(choice.draft)}
          >
            {choice.label}
          </button>
        ))}
        <button
          type="button"
          className="v-scene-silence"
          onClick={() => {
            setDraft(null);
            onPredict(null);
            onSayNothing();
          }}
        >
          Say nothing
        </button>
        <button ref={moreRef} type="button" className="v-scene-more" onClick={onMore}>
          Say something else…
        </button>
      </div>
      <div className="v-scene-preview">
        <p className="v-scene-likely" aria-live="polite">
          {selected
            ? prediction
              ? `Likely: “${obstacleWords(prediction) ?? prediction.says}”`
              : 'Reading his likely reply…'
            : 'You can leave him to it.'}
        </p>
        <button
          type="button"
          className="v-scene-send v-btn"
          disabled={!selected || !prediction}
          onClick={() => {
            if (selected) {
              onSuggest(selected);
              setDraft(null);
              onPredict(null);
            }
          }}
        >
          Say it
        </button>
      </div>
    </>
  );
}
