import { type PhoneStage, phoneStage } from '@adam0white/lab-kit';
import { type RefObject, useEffect, useRef, useState } from 'react';
import type { HurtNews } from '../sim/game.ts';
import type { Prediction } from '../sim/human-side.ts';
import type { PlaceId } from '../sim/map.ts';
import { APPEALS, type OrderCard } from '../sim/orders.ts';
import { VILLAGES } from '../sim/village.ts';
import { type ActionId, VILLAGERS, type VillagerId, villagerById } from '../sim/world-types.ts';
import { dayClock, type Frame, type Nudge } from './contract.ts';
import { latestPersonOrder } from './order-status.ts';
import {
  type ComposerState,
  EMPTY_COMPOSER,
  HurtLine,
  inferredJob,
  jobPhrase,
  OrderLog,
  PersonOrder,
  PLACE_LABEL,
  SuggestionCard,
  shortName,
  suggestionNeedsReview,
} from './parts.tsx';
import { suggestionChoice } from './suggestion-choice.ts';

/** Phone presentation only. Orders still pass through the same callbacks and simulation. */
export function VillageStrip({ frame, side }: { frame: Frame | null; side: 'human' | 'classic' }) {
  const [expanded, setExpanded] = useState(false);
  const roof = frame?.goals.find((g) => g.id === 'project') ?? frame?.goals.find((g) => g.id === 'roof');
  const food = frame?.goals.find((g) => g.id === 'stock');
  const world = side === 'human' ? frame?.humanWorld : frame?.classicWorld;
  const meals = frame?.scoreboard[side].meals ?? 0;
  const storm = frame?.timeline.markers.find((m) => m.kind === 'storm');
  const stormPassed = Boolean(frame && storm && frame.minute >= (storm.until ?? storm.minute));
  const deadline = stormPassed ? roof?.deadlineMinute : (storm?.minute ?? roof?.deadlineMinute);
  const stage = world?.project.stage ?? world?.houseStage ?? 0;
  const target = world?.project.stages ?? roof?.targetValue ?? 10;
  const label = world?.project.kind === 'storeroom' ? 'Store-room' : 'Roof';
  return (
    <section
      className="well-phone-strip lk-strip"
      data-expanded={expanded}
      aria-label={`${side === 'human' ? 'Human' : 'Classic'} village state`}
    >
      <button
        type="button"
        className="lk-chips"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          {side === 'human' ? 'Human' : 'Classic'} · {label} {stage} of {target}
        </span>
        <span>
          Meals {meals}
          {food ? ` / ${food.targetValue}` : ''}
        </span>
        <span>
          {stormPassed ? `${label} by ` : 'Storm '}
          {deadline === undefined ? 'not scheduled' : dayClock(deadline).replace('D', 'Day ')}
        </span>
      </button>
      <p className="village-setting">{VILLAGES[frame?.village ?? 'default'].label}</p>
      <p className="lk-strip-detail" data-expanded={expanded}>
        The {side === 'human' ? 'Human' : 'Classic'} village has completed {stage} of {target}{' '}
        {label.toLowerCase()} stages and stores {meals} meals.{' '}
        {deadline !== undefined &&
          (stormPassed
            ? `${label} due ${dayClock(deadline).replace('D', 'Day ')}.`
            : `The storm arrives on ${dayClock(deadline).replace('D', 'Day ')}.`)}
        {food &&
          ` Food target: ${food.targetValue} meals by ${dayClock(food.deadlineMinute).replace('D', 'Day ')}.`}
      </p>
      {stormPassed && storm && (
        <details className="well-storm-history">
          <summary>Weather history</summary>
          <p>
            Storm passed · {dayClock(storm.minute)}–{dayClock(storm.until ?? storm.minute)}
          </p>
        </details>
      )}
    </section>
  );
}

type View = 'person' | 'tools' | 'order' | 'worker' | 'place' | 'options' | 'suggestion' | 'orders';
export function PhoneSheet(props: {
  stageRoot: RefObject<HTMLElement | null>;
  onSceneHeight(height: number): void;
  onWatch?(): void;
  shownSide?: 'classic' | 'human';
  placeRequest?: number;
  personRequest?: number;
  onAgain(card: OrderCard): void;
  onInsist(card: OrderCard): void;
  onScenePlace?(place: PlaceId): void;
  onShowNews?(news: HurtNews): void;
  onRestNews?(news: HurtNews): void;
  job: ActionId | null;
  inspecting: boolean;
  active: boolean;
  onKeepWatching(): void;
  frame: Frame | null;
  state: ComposerState;
  prediction: Prediction | null;
  suggestionPrediction?: Prediction | null;
  ordering: boolean;
  onOrdering(open: boolean): void;
  onChange(state: ComposerState): void;
  onWho(id: VillagerId): void;
  onWhere(place: PlaceId): void;
  onConfirm(): void;
  onUse(nudge: Nudge): void;
  onSkip(id: string): void;
  onCancel(id: string): void;
  onInspect(id: VillagerId): void;
  onSheet(height: 'closed' | 'peek' | 'half' | 'full' | 'fit'): void;
}) {
  const [view, setView] = useState<View>('order');
  const [scenePicker, setScenePicker] = useState(false);
  const [open, setOpen] = useState(props.ordering && props.active);
  const [canBack, setCanBack] = useState(false);
  const controller = useRef<PhoneStage | null>(null);
  const currentId = useRef<string | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const s = props.state;
  const nudge = props.frame?.nudges[0];
  const choice = nudge
    ? suggestionChoice(nudge, props.frame, props.frame?.cards, props.suggestionPrediction)
    : null;
  const cards = props.frame?.cards ?? [];
  const personOrder = latestPersonOrder(cards, s.personId);
  const ready = Boolean(s.personId && s.placeId);
  useEffect(() => {
    const root = props.stageRoot.current;
    if (!root || !props.active) {
      setOpen(false);
      props.onSheet('closed');
      return;
    }
    const media = window.matchMedia('(max-width: 899px)');
    const mount = () => {
      controller.current?.destroy();
      controller.current = null;
      if (!media.matches) return;
      let initialized = false;
      const instance = phoneStage(root, {
        onSceneRect: (rect) => {
          latest.current.onSceneHeight(rect.height);
          const colony = root.closest<HTMLElement>('.colony');
          const chip = root.querySelector('.lk-chips');
          if (colony && chip)
            colony.dataset.reflow = String(parseFloat(getComputedStyle(chip).fontSize) > 24);
        },
        onChange: (sheet, back) => {
          currentId.current = sheet?.id ?? null;
          setOpen(Boolean(sheet));
          setCanBack(back);
          if (sheet) setView(sheet.id as View);
          latest.current.onSheet(sheet?.height ?? 'closed');
          if (initialized && !sheet) latest.current.onOrdering(false);
        },
      });
      controller.current = instance;
      if (latest.current.ordering)
        instance.open({ id: 'order', height: 'half', openerSelector: '#well-give-order' });
      initialized = true;
    };
    mount();
    media.addEventListener('change', mount);
    return () => {
      media.removeEventListener('change', mount);
      controller.current?.destroy();
      controller.current = null;
    };
  }, [props.stageRoot, props.active, props.onSheet]);
  useEffect(() => {
    if (!props.active) return;
    if (props.ordering && !currentId.current)
      controller.current?.open({ id: 'order', height: 'half', openerSelector: '#well-give-order' });
    if (
      !props.ordering &&
      (currentId.current === 'order' || currentId.current === 'place' || currentId.current === 'options')
    )
      controller.current?.close();
  }, [props.ordering, props.active]);
  useEffect(() => {
    controller.current?.refresh();
    if (!props.inspecting) document.getElementById('well-about-worker')?.focus();
  }, [props.inspecting]);
  useEffect(() => {
    if (!props.placeRequest || !props.active) return;
    setScenePicker(true);
    controller.current?.open({ id: 'place', height: 'half' });
  }, [props.placeRequest, props.active]);
  useEffect(() => {
    if (!props.personRequest || !props.active) return;
    if (!latestPersonOrder(latest.current.frame?.cards ?? [], latest.current.state.personId)) return;
    setScenePicker(false);
    controller.current?.open({ id: 'person', height: 'fit' });
  }, [props.personRequest, props.active]);
  function show(next: View, target: EventTarget | null) {
    setScenePicker(false);
    const opener = target instanceof HTMLElement ? target : undefined;
    controller.current?.open({
      id: next,
      height: next === 'suggestion' ? 'fit' : 'half',
      ...(opener ? { opener, openerSelector: opener.id ? `#${opener.id}` : undefined } : {}),
    });
  }
  function back() {
    controller.current?.back();
  }
  function close() {
    controller.current?.close();
  }
  function prepareSuggestion(n: Nudge) {
    controller.current?.close();
    props.onUse(n);
    if (suggestionNeedsReview(n, props.frame)) {
      props.onOrdering(true);
      controller.current?.open({ id: 'order', height: 'half', openerSelector: '#well-give-order' });
    }
  }
  const title = {
    person: s.personId ? `${shortName(s.personId)} · latest order` : 'Latest order',
    tools: 'Village actions',
    order: 'Order options',
    worker: 'Choose worker',
    place: 'Choose place',
    options: 'Order options',
    suggestion: 'Suggestion',
    orders: 'Orders',
  }[view];
  return (
    <>
      <nav className="well-phone-tools" aria-label="Village actions">
        <button
          type="button"
          id="well-give-order"
          onClick={(e) => {
            props.onOrdering(true);
            show(s.personId ? 'order' : 'worker', e.currentTarget);
          }}
        >
          {s.personId ? `Order options · ${shortName(s.personId)}` : 'Choose person'}
        </button>
        {nudge && (
          <button type="button" onClick={(e) => show('suggestion', e.currentTarget)}>
            Suggestion
          </button>
        )}
        <button type="button" onClick={(e) => show('orders', e.currentTarget)}>
          History ({cards.length})
        </button>
      </nav>
      <section className="well-phone-sheet lk-sheet" hidden={!open || props.inspecting} aria-label={title}>
        <header className="lk-sheet-head">
          <span className="lk-sheet-handle" aria-hidden="true">
            ↕
          </span>
          <h2>{title}</h2>
          {canBack && (
            <button type="button" onClick={back}>
              Back
            </button>
          )}
          <button type="button" id="well-sheet-more" onClick={(e) => show('tools', e.currentTarget)}>
            More
          </button>
          <button type="button" onClick={close}>
            Close
          </button>
        </header>
        <div className="lk-sheet-body">
          {view === 'person' && personOrder && (
            <PersonOrder
              card={personOrder}
              onAgain={(card) => {
                props.onAgain(card);
                close();
              }}
              onCancel={props.onCancel}
              onInsist={(card) => {
                props.onInsist(card);
                close();
              }}
            />
          )}
          {view === 'tools' && (
            <div className="well-phone-choices">
              <button type="button" id="well-tools-options" onClick={(e) => show('options', e.currentTarget)}>
                Order options
              </button>
              {nudge && (
                <button
                  type="button"
                  id="well-tools-suggestion"
                  onClick={(e) => show('suggestion', e.currentTarget)}
                >
                  Suggestion
                </button>
              )}
              <button type="button" id="well-tools-orders" onClick={(e) => show('orders', e.currentTarget)}>
                History ({cards.length})
              </button>
              {(['peek', 'half', 'full', 'fit'] as const).map((size) => (
                <button type="button" key={size} data-lk-snap={size}>
                  {size === 'peek'
                    ? 'Small panel'
                    : size === 'half'
                      ? 'Half panel'
                      : size === 'full'
                        ? 'Full panel'
                        : 'Fit panel'}
                </button>
              ))}
            </div>
          )}
          {view === 'order' && (
            <>
              <div className="well-order-picks">
                <button type="button" id="well-pick-worker" onClick={(e) => show('worker', e.currentTarget)}>
                  Worker · {s.personId ? shortName(s.personId) : 'Choose'}
                </button>
                <button
                  type="button"
                  id="well-pick-place"
                  disabled={!s.personId}
                  onClick={(e) => show('place', e.currentTarget)}
                >
                  Place · {s.placeId ? PLACE_LABEL[s.placeId] : 'Choose'}
                </button>
              </div>
              <p className="well-order-preview" hidden={!s.personId}>
                {!s.personId
                  ? 'Pick a villager here or on the map.'
                  : !s.placeId
                    ? `${shortName(s.personId)}: now pick a place.`
                    : `${shortName(s.personId)} → ${PLACE_LABEL[s.placeId]}`}
              </p>
              {s.personId && (
                <button
                  type="button"
                  aria-pressed={s.rush}
                  onClick={() => props.onChange({ ...s, rush: !s.rush })}
                >
                  Rush · faster, hungrier
                </button>
              )}
              {ready && (
                <p>
                  {props.job && <>{jobPhrase(props.job)} · </>}
                  {props.prediction?.text ?? 'Checking current answer…'}
                </p>
              )}
              {(s.rush || s.insist || s.appeal) && (
                <p className="well-order-costs">
                  {[
                    s.rush && 'Rush: faster, hungrier',
                    s.insist && 'Insist: trust at risk',
                    s.appeal === 'safety' && 'Safety: a promise; hurt on this job, they will hold you to it',
                    s.appeal === 'children' && 'For the children',
                    s.appeal === 'duty' && 'Duty',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {s.reason && <p>{s.reason}</p>}
            </>
          )}
          {view === 'worker' && (
            <div className="well-phone-choices">
              {VILLAGERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={s.personId === p.id}
                  onClick={() => {
                    props.onWho(p.id);
                    props.onOrdering(false);
                    close();
                  }}
                >
                  {shortName(p.id)}
                </button>
              ))}
            </div>
          )}
          {view === 'place' && (
            <div className="well-phone-choices">
              {(
                [
                  'site',
                  'forest',
                  'cedar',
                  'field',
                  'well',
                  'kitchen',
                  'masjid',
                  villagerById(s.personId ?? 'yusuf')?.home ?? 'home-yusuf',
                ] as PlaceId[]
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={s.placeId === p}
                  onClick={() => {
                    if (scenePicker && props.onScenePlace) {
                      props.onScenePlace(p);
                      setScenePicker(false);
                      if (p === 'cedar' && props.frame && inferredJob(props.frame, p) === 'fell-cedar')
                        controller.current?.open({ id: 'order', height: 'half' });
                      else close();
                    } else {
                      props.onWhere(p);
                      back();
                    }
                  }}
                >
                  {PLACE_LABEL[p]}
                </button>
              ))}
            </div>
          )}
          {view === 'options' && (
            <div className="well-phone-choices">
              <button
                type="button"
                disabled={!s.personId}
                aria-pressed={s.rush}
                onClick={() => props.onChange({ ...s, rush: !s.rush })}
              >
                Rush · faster, hungrier
              </button>
              <button
                type="button"
                disabled={!s.personId}
                aria-pressed={s.insist}
                onClick={() => props.onChange({ ...s, insist: !s.insist })}
              >
                Insist · may cost trust
              </button>
              {APPEALS.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  disabled={!s.personId}
                  aria-pressed={s.appeal === a.id}
                  onClick={() => props.onChange({ ...s, appeal: s.appeal === a.id ? null : a.id })}
                >
                  Appeal: {a.label}
                </button>
              ))}
              {s.personId && (
                <button
                  type="button"
                  id="well-about-worker"
                  onClick={() => props.onInspect(s.personId as VillagerId)}
                >
                  About {shortName(s.personId)}
                </button>
              )}
              <button type="button" onClick={() => props.onChange(EMPTY_COMPOSER)}>
                Clear order
              </button>
            </div>
          )}
          {view === 'suggestion' && nudge && props.frame && (
            <SuggestionCard
              nudge={nudge}
              prediction={props.suggestionPrediction}
              frame={props.frame}
              minute={props.frame.minute}
              cards={cards}
              queued={props.frame.nudges.length - 1}
              active={s.nudgeId === nudge.id}
              onUse={prepareSuggestion}
              onSkip={(id) => {
                props.onSkip(id);
                close();
              }}
              onKeepWatching={() => {
                props.onKeepWatching();
                props.onWatch?.();
                close();
              }}
            />
          )}
          {view === 'orders' && (
            <>
              <HurtLine
                news={props.frame?.news ?? []}
                {...(props.shownSide ? { shownSide: props.shownSide } : {})}
                onShow={props.onShowNews ?? (() => {})}
                {...(props.onRestNews ? { onRest: props.onRestNews } : {})}
              />
              <OrderLog cards={cards} onCancel={props.onCancel} />
            </>
          )}
        </div>
        <footer className="lk-commit">
          <button
            type="button"
            onClick={() => {
              if (view === 'suggestion') props.onKeepWatching();
              props.onWatch?.();
              close();
            }}
          >
            {view === 'suggestion' ? 'Keep watching' : 'Watch village'}
          </button>
          {view === 'suggestion' && nudge && (
            <button type="button" onClick={() => prepareSuggestion(choice?.nudge ?? nudge)}>
              {choice?.refusal
                ? 'Insist · may cost trust'
                : suggestionNeedsReview(nudge, props.frame)
                  ? 'Review order'
                  : 'Send order'}
            </button>
          )}
          {view !== 'suggestion' && view !== 'person' && (
            <button
              type="button"
              className="btn-confirm"
              disabled={!ready}
              onClick={() => {
                props.onConfirm();
                close();
              }}
            >
              Confirm
            </button>
          )}
        </footer>
      </section>
    </>
  );
}
