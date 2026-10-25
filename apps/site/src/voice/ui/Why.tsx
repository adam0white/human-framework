/**
 * Why: the recorded influences in Halil’s words, strongest first within each option.
 * Model values stay in a closed secondary disclosure. This reads the view only; it never reweighs a decision.
 */
import { useEffect, useRef } from 'react';
import { labMode } from '../../shared/lab-mode.ts';
import { settingWords } from '../../shared/setting-words.ts';
import type { WhyView } from '../protocol.ts';

/** Authored paraphrases of recorded influences, not additional causes or simulated speech. */
function pullLine(label: string, toward: boolean): string {
  const lines: Record<string, [string, string]> = {
    grieving: ['My grief makes me want to do this.', 'My grief makes this difficult for me.'],
    hunger: ['This would help with my hunger.', 'This would leave me hungrier.'],
    thirst: ['This would help with my thirst.', 'This would leave me thirstier.'],
    sleep: ['This would help me catch up on sleep.', 'This would cost me sleep.'],
    rest: ['This would let me recover.', 'This would tire me further.'],
    company: ['This would help me feel less alone.', 'This would leave me feeling more alone.'],
    effort: ['I feel up to the effort.', 'The effort makes me less willing to do this.'],
    risk: ['The risk seems worth taking.', 'I am wary of what could happen.'],
    habit: ['This is what I am used to doing.', 'This goes against what I am used to doing.'],
    money: ['I want to earn the money.', 'The cost makes me less willing to do this.'],
    'your suggestions': ['I am considering your suggestions.', 'Your suggestions make me reluctant.'],
    'not being pushed': ['I want to choose for myself.', 'I do not want to be pushed into this.'],
    'what he expects from it': ['I expect this to help.', 'I do not expect this to go well.'],
    'a goal': ['This serves something I want to do.', 'This gets in the way of something I want to do.'],
    'keeping at it': ['I want to keep at what I started.', 'I am reluctant to keep at this.'],
    'something he had decided to do': [
      'I want to do what I decided to do.',
      'This gets in the way of what I decided to do.',
    ],
    safety: ['This would help me feel safe.', 'This does not feel safe.'],
    relief: ['This would ease my discomfort.', 'This would add to my discomfort.'],
    'deciding for himself': ['I want to do this my own way.', 'This does not feel like my choice.'],
    'respect from others': ['I want people to respect me.', 'I worry how this will look to people.'],
    meaning: ['This matters to me.', 'I find little meaning in this.'],
    'doing it well': ['I want to do this well.', 'I do not feel able to do this well.'],
    enjoyment: ['I would enjoy this.', 'I would not enjoy this.'],
  };
  const pair = lines[label];
  if (pair) return pair[toward ? 0 : 1];
  const emotions: Record<string, string> = {
    anxious: 'worry',
    afraid: 'fear',
    ashamed: 'shame',
    guilty: 'guilt',
    proud: 'pride',
    grateful: 'gratitude',
    glad: 'joy',
    upset: 'distress',
    hopeful: 'hope',
    relieved: 'relief',
    'let down': 'disappointment',
    fond: 'affection',
    moved: 'awe',
    content: 'contentment',
    lonely: 'loneliness',
    bored: 'boredom',
    angry: 'anger',
  };
  if (emotions[label])
    return toward
      ? `My ${emotions[label]} makes me want to do this.`
      : `My ${emotions[label]} makes this difficult for me.`;
  if (label.startsWith('for '))
    return toward
      ? `I want to do this for ${label.slice(4)}.`
      : `My concern for ${label.slice(4)} makes me less willing to do this.`;
  if (label === 'the pre-dawn meal' || label === 'the sunset meal')
    return toward ? 'I want to make time for my meal.' : 'This would get in the way of my meal.';
  if (label.startsWith('Pay Osman '))
    return toward
      ? 'I want to keep my word to Osman.'
      : 'This would make it harder to keep my promise to Osman.';
  if (label.startsWith('his understanding of '))
    return toward ? 'This fits how I understand my duties.' : 'This goes against how I understand my duties.';
  if (/^(Fajr|Dhuhr|Asr|Maghrib|Isha|the fast|Eid prayer)/i.test(label))
    return toward ? 'I want to make time for my religious duties.' : 'My religious duties make me reluctant.';
  if (/^[A-ZİŞÇÖÜĞ][\p{L}ı]+(?:’s words| said so earlier)$/u.test(label))
    return toward
      ? `I am considering ${label.replace(/ said so earlier$/, '’s words')}.`
      : `${label.replace(/ said so earlier$/, '’s words')} make me reluctant.`;
  return toward ? 'I have another reason to want to do this.' : 'I have other reasons not to do this.';
}

/** A verdict can name a limit that is absent from the considered options. */
function answerReason(reason: string): string | null {
  const limits: Record<string, string> = {
    'he does not trust you enough for this': 'I do not trust you enough for this.',
    'he is asleep': 'I am asleep.',
    'he is not sleepy': 'I am not sleepy.',
    'he is not up to it': 'I am not up to it.',
    'he cannot do that right now': 'I cannot do that just now.',
    'he cannot': 'I cannot do that.',
    'he does not know how': 'I do not know how.',
    grieving: 'I am still grieving.',
  };
  if (limits[reason]) return limits[reason];
  if (reason.startsWith('he had already said yes to ')) return reason.replace('he had', 'I had');
  // Already-readable host reasons stay prose; model identifiers belong in the disclosure only.
  if (!/[:_]|\d\.\d/.test(reason) && reason !== 'grieving') return reason;
  return null;
}

export function Why({
  why,
  missing = false,
  onClose,
}: {
  why: WhyView | null;
  /** The worker no longer holds that decision (it keeps the recent ones only). */
  missing?: boolean;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Focus moves into the sheet, and back to whatever opened it on close.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    close.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="v-why" aria-label="Why he chose this">
      <div className="v-why-head">
        <h2>Why</h2>
        {why && <span className="v-why-clock">{why.clock}</span>}
        <button ref={close} type="button" className="v-btn v-btn-quiet v-btn-small" onClick={onClose}>
          Close <kbd>Esc</kbd>
        </button>
      </div>
      {!why ? (
        <p className="v-muted">{missing ? 'That moment is too far back to read.' : 'Reading his reasons…'}</p>
      ) : (
        <div className="v-why-body">
          <p className="v-why-chosen">
            He chose <em>{settingWords(why.chosen)}</em>.
          </p>
          {why.note && (
            <p className="v-why-voice">
              {why.note.includes('insisted')
                ? 'He went along because he was pressed to do it.'
                : 'He kept doing what he had started. The other choices did not seem much better.'}
            </p>
          )}
          {why.voice && (
            <p className="v-why-voice">
              To your words he said <q>{settingWords(why.voice.says)}</q>
              {answerReason(why.voice.reason) && <span> {settingWords(answerReason(why.voice.reason))}</span>}
            </p>
          )}
          {why.recalled && <p className="v-why-recall">{settingWords(why.recalled)}</p>}
          <p className="v-why-note">
            These are his reasons for considering each choice. The strongest reason comes first.
          </p>
          <ol className="v-why-options">
            {why.options.map((o) => (
              <li key={o.label}>
                <div className="v-why-opt-head">{settingWords(o.label)}</div>
                <ul className="v-why-pulls">
                  {[...o.terms]
                    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                    .filter((t) => t.value !== 0)
                    .map((t) => (
                      <li key={`${t.label}-${t.value}`}>{settingWords(pullLine(t.label, t.value > 0))}</li>
                    ))}
                  {!o.terms.some((t) => t.value !== 0) && (
                    <li>I have no particular reason to choose this.</li>
                  )}
                </ul>
              </li>
            ))}
          </ol>
          {labMode() && (
            <details className="v-model-numbers" key={why.decisionId}>
              <summary>Model numbers</summary>
              <p className="v-why-note">
                Simulation terms for lab readers. These are model values, not measurements of Halil’s feelings
                or faith.
              </p>
              <ol className="v-why-options">
                {why.options.map((o) => (
                  <li key={o.label}>
                    <div className="v-why-opt-head">
                      {settingWords(o.label)} <span className="v-why-total">{o.total.toFixed(2)}</span>
                    </div>
                    <ul>
                      {o.terms.map((t) => (
                        <li key={`${t.label}-${t.value}`}>
                          {settingWords(t.label)}{' '}
                          <span className="v-why-val">
                            {t.value >= 0 ? '+' : '−'}
                            {Math.abs(t.value).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </aside>
  );
}
