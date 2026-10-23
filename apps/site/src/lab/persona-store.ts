import { localPlayer, OFF_KEY, readLocal } from '../../../../packages/lab-client/src/identity.ts';
import {
  acceptPersona,
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
/** Validation/hash precedes transaction; compare and write share one readwrite transaction. */
export async function shelfRequest(request: PersonaRequest): Promise<unknown> {
  const persona = request.action === 'put' ? await validatePersona(request.envelope) : undefined;
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
        switch (request.action) {
          case 'list':
            result = Object.values(state.heads)
              .map((head) => state.revisions.find((p) => p.revision === head))
              .filter((p): p is PersonaEnvelope => Boolean(p))
              .map(personaSummary);
            break;
          case 'get':
            result = state.revisions.find((p) => p.revision === state.heads[request.castId ?? '']) ?? null;
            break;
          case 'put':
            if (!persona) throw new Error('Missing persona.');
            state = acceptPersona(state, persona, request.fork);
            if (
              request.authored &&
              persona.parentRevision === null &&
              !request.fork &&
              player &&
              !recordingEpochs[`${persona.castId}/${persona.branchId}`]
            )
              recordingEpochs[`${persona.castId}/${persona.branchId}`] = player;
            state = { ...state, recordingEpochs };
            persist(state);
            result = persona;
            break;
          case 'recording': {
            const head = state.revisions.find((p) => p.revision === state.heads[request.castId ?? '']);
            if (!head) throw new Error('Select a person.');
            if (request.allowRecording && player) {
              recordingEpochs[`${head.castId}/${head.branchId}`] = player;
              persist({ ...state, recordingEpochs });
            }
            result = {
              sameEpoch: Boolean(player && recordingEpochs[`${head.castId}/${head.branchId}`] === player),
            };
            break;
          }
          case 'delete': {
            if (!request.castId) throw new Error('Select a person.');
            for (const p of state.revisions)
              if (p.castId === request.castId) delete recordingEpochs[`${p.castId}/${p.branchId}`];
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
