/** Actual work chronology is kept distinct from a claim about what an order caused. */
import type { SideChip } from '../sim/orders.ts';
import { dayClock } from './contract.ts';
import { jobPhrase } from './parts.tsx';

export function OrderWorkEvents({ events }: { events: SideChip['workEvents'] }) {
  if (!events?.length) return null;
  return (
    <section className="well-work-events" aria-label="Work after this order">
      <h4>Work after this order</h4>
      <ul>
        {events.map((e) => (
          <li key={`${e.activityId}-${e.minute}-${e.kind}`}>
            {dayClock(e.minute)}:{' '}
            {e.kind === 'injury' ? 'an injury was recorded during' : 'work was interrupted during'}{' '}
            {jobPhrase(e.action)}.
          </li>
        ))}
      </ul>
      <p>
        This work began after the request. The record does not show that the order caused the injury or
        interruption, or how much it delayed the roof.
      </p>
    </section>
  );
}
