import { localPlayer, OFF_KEY, readLocal } from '../../../../packages/lab-client/src/identity.ts';
import { preparePersonaLife } from '../../../../packages/lab-client/src/life.ts';
import {
  acceptPersona,
  acceptPersonaBatch,
  PERSONA_LIMITS,
  type PersonaEnvelope,
  type PersonaRequest,
  type PersonaShelfState,
  personaSummary,
  validatePersona,
} from '../../../../packages/lab-client/src/persona.ts';

const EMPTY = (): PersonaShelfState => ({ revisions: [], heads: {} });
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hf-persona-shelf', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('shelf');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser shelf unavailable. Use a file.'));
  });
}
// Keep arrival order through asynchronous validation, including overlapping consent choices.
let requests: Promise<unknown> = Promise.resolve();
export function shelfRequest(request: PersonaRequest): Promise<unknown> {
  const result = requests.then(() => handleRequest(request));
  requests = result.catch(() => {});
  return result;
}
/** Validation/hash precedes transaction; compare and write share one readwrite transaction. */
async function handleRequest(request: PersonaRequest): Promise<unknown> {
  const capturedPlayer = readLocal(OFF_KEY) === '1' ? null : localPlayer();
  const recordingEpoch = capturedPlayer
    ? Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(`hf-recording-epoch/1:${capturedPlayer}`),
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('')
    : null;
  const persona =
    request.action === 'put' || (request.action === 'recording' && request.envelope !== undefined)
      ? await validatePersona(request.envelope)
      : undefined;
  const batch = request.envelopes ? await Promise.all(request.envelopes.map(validatePersona)) : [];
  if (
    ['putBatch', 'recordingBatch'].includes(request.action) &&
    ((!batch.length && !(request.action === 'putBatch' && Object.keys(request.expectedHeads ?? {}).length)) ||
      batch.length > 8 ||
      new Set(batch.map((p) => p.castId)).size !== batch.length)
  )
    throw new Error('A batch needs one to eight distinct pinned people.');
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('shelf', 'readwrite');
    const store = transaction.objectStore('shelf');
    const persist = (state: unknown) => {
      if (new TextEncoder().encode(JSON.stringify(state)).length > PERSONA_LIMITS.shelfBytes)
        throw new Error('The local shelf is full. Export or delete a person first.');
      store.put(state, 'state');
    };
    const read = store.get('state');
    let result: unknown;
    let failure: unknown;
    read.onsuccess = () => {
      try {
        let state: PersonaShelfState & { recordingEpochs?: Record<string, string> } = read.result ?? EMPTY();
        const recordingEpochs = { ...state.recordingEpochs };
        const player = readLocal(OFF_KEY) === '1' ? null : localPlayer();
        const sameIdentity = player !== null && player === capturedPlayer;
        const epochMatches = sameIdentity && request.recordingEpoch === recordingEpoch;
        switch (request.action) {
          case 'list':
            result = Object.values(state.heads)
              .map((head) => state.revisions.find((p) => p.revision === head))
              .filter((p): p is PersonaEnvelope => Boolean(p))
              .map(personaSummary);
            break;
          case 'history':
            if (!request.castId) throw new Error('Select a person.');
            result = state.revisions.filter((p) => p.castId === request.castId).map(personaSummary);
            break;
          case 'get':
            result =
              state.revisions.find(
                (p) =>
                  p.castId === request.castId &&
                  p.revision === (request.revision ?? state.heads[request.castId ?? '']),
              ) ?? null;
            break;
          case 'prepare': {
            const parent = state.revisions.find((p) => p.revision === state.heads[request.castId ?? '']);
            result = parent ? preparePersonaLife(parent, Date.now()) : null;
            break;
          }
          case 'prepareBatch': {
            const ids = request.castIds;
            if (!ids || ids.length > 8 || new Set(ids).size !== ids.length)
              throw new Error('Select at most eight distinct people.');
            const now = Date.now();
            const inputs = [],
              blocked = [];
            for (const castId of ids) {
              const parent = state.revisions.find(
                (p) => p.castId === castId && p.revision === state.heads[castId],
              );
              if (!parent) continue;
              try {
                inputs.push(preparePersonaLife(parent, now));
              } catch (e) {
                blocked.push({ castId, reason: String(e) });
              }
            }
            result = {
              inputs,
              blocked,
              expectedHeads: Object.fromEntries(ids.map((id) => [id, state.heads[id] ?? null])),
            };
            break;
          }
          case 'putBatch': {
            state = acceptPersonaBatch(state, batch, request.expectedHeads);
            const retained = new Set(state.revisions.map((p) => `${p.castId}/${p.branchId}`));
            for (const key of Object.keys(recordingEpochs))
              if (!retained.has(key)) delete recordingEpochs[key];
            persist({ ...state, recordingEpochs });
            result = batch;
            break;
          }
          case 'recordingBatch': {
            if (request.allowRecording !== undefined) {
              if (!epochMatches) throw new Error('Recording identity changed. Choose again.');
              for (const head of batch) {
                const key = `${head.castId}/${head.branchId}`;
                if (request.allowRecording && player) recordingEpochs[key] = player;
                else delete recordingEpochs[key];
              }
              persist({ ...state, recordingEpochs });
            }
            result = {
              sameEpoch: batch.every((head) =>
                Boolean(player && recordingEpochs[`${head.castId}/${head.branchId}`] === player),
              ),
              recordingEpoch: sameIdentity ? recordingEpoch : null,
              revisions: batch.map((head) => head.revision),
            };
            break;
          }
          case 'put': {
            if (!persona) throw new Error('Missing persona.');
            state = acceptPersona(state, persona, request.fork);
            // Cache eviction also removes historical recording associations for those branches.
            const retained = new Set(state.revisions.map((p) => `${p.castId}/${p.branchId}`));
            for (const key of Object.keys(recordingEpochs))
              if (!retained.has(key)) delete recordingEpochs[key];
            if (
              request.authored &&
              persona.parentRevision === null &&
              !request.fork &&
              player &&
              epochMatches &&
              !recordingEpochs[`${persona.castId}/${persona.branchId}`]
            )
              recordingEpochs[`${persona.castId}/${persona.branchId}`] = player;
            state = { ...state, recordingEpochs };
            persist(state);
            result = persona;
            break;
          }
          case 'recording': {
            // An old tab cannot identify its pinned history with a cast id alone.
            const head = persona;
            if (!head) {
              if (request.allowRecording !== undefined) throw new Error('Select a pinned person envelope.');
              result = { sameEpoch: false, recordingEpoch: sameIdentity ? recordingEpoch : null };
              break;
            }
            if (request.castId !== undefined && request.castId !== head.castId)
              throw new Error('Selected person does not match the recording choice.');
            if (request.allowRecording !== undefined) {
              if (!epochMatches) throw new Error('Recording identity changed. Choose again.');
              const key = `${head.castId}/${head.branchId}`;
              if (request.allowRecording && player) recordingEpochs[key] = player;
              else delete recordingEpochs[key];
              persist({ ...state, recordingEpochs });
            }
            result = {
              sameEpoch: Boolean(player && recordingEpochs[`${head.castId}/${head.branchId}`] === player),
              recordingEpoch: sameIdentity ? recordingEpoch : null,
              ...(persona ? { branchId: persona.branchId, revision: persona.revision } : {}),
            };
            break;
          }
          case 'delete': {
            if (!request.castId) throw new Error('Select a person.');
            // Older builds could retain associations after their revision cache entry was pruned.
            for (const key of Object.keys(recordingEpochs))
              if (key.startsWith(`${request.castId}/`)) delete recordingEpochs[key];
            state = { ...state, recordingEpochs };
            state.revisions = state.revisions.filter((p) => p.castId !== request.castId);
            delete state.heads[request.castId];
            persist(state);
            result = true;
            break;
          }
          default:
            throw new Error('Unknown shelf request.');
        }
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onabort = transaction.onerror = () => {
      db.close();
      reject(failure ?? new Error('Browser shelf unavailable. Use a file.'));
    };
  });
}
