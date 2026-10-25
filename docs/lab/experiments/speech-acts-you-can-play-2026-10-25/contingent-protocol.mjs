/**
 * SCOPE: explicitly enabled, local host protocol for one three-person shift negotiation.
 * Owns one live proposal and conditional consents. The host admits attended public messages,
 * generates real available offers, and owns turn budgets. No HF state, rewards, private constraints,
 * inferred intent, RNG, networking, general language or enforceable future work is owned here.
 * Message ids identify host-authenticated actions; this is not an authentication service.
 */
export function createShiftProtocol(options) {
  if (!options.enabled) return null;
  const actors = [...options.actors];
  if (actors.length !== 3 || new Set(actors).size !== 3) throw new Error('Three distinct actors required');
  let serial = 0;
  let live = null;
  const agreements = [];
  const seen = new Set();
  const receipts = new Map(actors.map((actor) => [actor, new Set()]));
  const snapshot = () => ({
    live: live ? { ...live, consents: [...live.consents] } : null,
    agreements: agreements.map((a) => ({ ...a, consents: [...a.consents] })),
  });
  return {
    snapshot,
    noteAttended(actor, proposalId) {
      if (!receipts.has(actor) || !live || live.id !== proposalId) return false;
      receipts.get(actor).add(proposalId);
      return true;
    },
    send(actor, message) {
      if (!actors.includes(actor)) return { status: 'unknown-actor' };
      if (agreements.length) return { status: 'closed' };
      if (!message.id || typeof message.id !== 'string') return { status: 'invalid-id' };
      const key = `${actor}:${message.id}`;
      if (seen.has(key)) return { status: 'duplicate' };
      const kind = message.kind;
      if (!['propose', 'counter', 'accept', 'refuse', 'wait'].includes(kind))
        return { status: 'invalid-kind' };
      if (kind === 'wait') return { status: 'wait' };
      if (kind === 'propose' || kind === 'counter') {
        if (!['early', 'late'].includes(message.slot)) return { status: 'invalid-slot' };
        if (live && live.proposer === actor && live.slot === message.slot) return { status: 'duplicate' };
        if (kind === 'propose' && live) return { status: 'busy' };
        if (kind === 'counter' && (!live || message.parent !== live.id || !receipts.get(actor).has(live.id)))
          return { status: 'unknown-parent' };
        live = { id: `proposal-${++serial}`, proposer: actor, slot: message.slot, consents: [actor] };
        receipts.get(actor).add(live.id); // An actor knows its own authored conditional proposal.
      } else {
        if (!live || message.parent !== live.id) return { status: 'stale' };
        if (!receipts.get(actor).has(live.id)) return { status: 'unattended' };
        if (kind === 'refuse') live = null;
        else {
          if (live.consents.includes(actor)) return { status: 'duplicate' };
          live.consents.push(actor);
          if (live.consents.length === actors.length)
            agreements.push({
              id: 'shift-agreement',
              proposalId: live.id,
              slot: live.slot,
              consents: [...live.consents],
            });
        }
      }
      seen.add(key);
      return { status: 'applied', event: { actor, kind, ...snapshot() } };
    },
  };
}
