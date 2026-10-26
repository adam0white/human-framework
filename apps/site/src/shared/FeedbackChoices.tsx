/** Optional local feedback choices. Only the host's explicit Submit sends the note. */
import { FEEDBACK_LABELS, type FeedbackLabel } from '@adam0white/lab-client';

export function feedbackMessage(label: FeedbackLabel | undefined, verdict: string, note: string): string {
  const legacy = [verdict ? `Verdict: ${verdict}` : '', note.trim()].filter(Boolean).join('\n\n');
  return label ? [FEEDBACK_LABELS[label], legacy].filter(Boolean).join('\n\n').slice(0, 4000) : legacy;
}

export function FeedbackChoices({
  value,
  onChange,
  disabled,
  className,
  buttonClassName,
}: {
  value: FeedbackLabel | undefined;
  onChange: (value: FeedbackLabel | undefined) => void;
  disabled: boolean;
  className: string;
  buttonClassName: string;
}) {
  return (
    <fieldset className={className} aria-label="Optional feedback">
      {(Object.keys(FEEDBACK_LABELS) as FeedbackLabel[]).map((label) => (
        <button
          type="button"
          key={label}
          className={buttonClassName}
          aria-pressed={value === label}
          disabled={disabled}
          onClick={() => onChange(value === label ? undefined : label)}
        >
          {FEEDBACK_LABELS[label]}
        </button>
      ))}
    </fieldset>
  );
}
