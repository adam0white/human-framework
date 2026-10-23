/** Browser shelf coordination only. Worker owns projection, admission and every simulation change. */
import {
  createPersona,
  type PersonaEnvelope,
  personaChannel,
  validatePersona,
  watchPersonaCheckpoint,
} from '@adam0white/lab-client';
import { personaControls } from '@adam0white/lab-kit';
import { useEffect, useRef } from 'react';
import { gameLabs } from '../../shared/lab.tsx';
import { downloadJson, fetchBuild, type PlaytestFile } from '../../shared/playtest.ts';
import type { MainToWorker, WorkerToMain } from '../protocol.ts';
import type { OneCastRow, SelinReturn } from '../sim/persona.ts';
import { claimAfterValidation, PersonaSession, requireOwnHead } from './persona-session.ts';

const SELIN_CAST = 'hf.cast.selin.voice';

const departureKey = (branch: string) => `hf-voice-departure:${branch}`;
const shelf = personaChannel();
export const voicePersonaReady = shelf.ready;
void shelf.ready.then(() => changed());
let send: ((message: MainToWorker) => void) | undefined;
let startReturn: ((header: SelinReturn, seed: number) => void) | undefined;
const session = new PersonaSession((key) => gameLabs.voice.setPersonaRecording(key));
let checkReturn: ((header: SelinReturn) => Promise<SelinReturn>) | undefined;
let status = 'Selin can make a household enquiry after work.';
let pending = false;
let published = '';
let recordingAttempt = 0;
const listeners = new Set<() => void>();
const changed = () => {
  for (const listener of listeners) listener();
};
const message = (text: string) => {
  status = text;
  changed();
};

async function recording(envelope: PersonaEnvelope): Promise<void> {
  if (session.loading || session.head?.revision !== envelope.revision || session.key !== envelope.branchId)
    return;
  const lab = gameLabs.voice;
  const attempt = ++recordingAttempt;
  lab.setPersonaRecording(envelope.branchId);
  const player = lab.playerId;
  const result = await shelf.request<{ sameEpoch: boolean; branchId?: string; revision?: string }>({
    action: 'recording',
    castId: SELIN_CAST,
    envelope,
  });
  if (
    attempt === recordingAttempt &&
    !session.loading &&
    session.head?.revision === envelope.revision &&
    session.key === envelope.branchId &&
    lab.playerId === player &&
    result.sameEpoch &&
    result.branchId === envelope.branchId &&
    result.revision === envelope.revision
  )
    lab.allowPersonaRecording(true);
  changed();
}

export async function gateVoiceFile(text: string): Promise<void> {
  recordingAttempt++;
  session.beginFile(text);
}

export function settleVoiceFileGate(accepted: boolean): void {
  const own = session.finish(accepted);
  const attempt = ++recordingAttempt;
  if (accepted && own)
    void shelf.ready.then(async () => {
      if (!shelf.enabled || attempt !== recordingAttempt) return;
      const current = await shelf
        .request<PersonaEnvelope | null>({ action: 'get', castId: SELIN_CAST })
        .catch(() => null);
      if (attempt === recordingAttempt && current?.branchId === own.branchId)
        await recording(own).catch(() => {});
    });
  changed();
}

export function bindVoicePersona(
  post: (message: MainToWorker) => void,
  begin: (header: SelinReturn, seed: number) => void,
  verify: (header: SelinReturn) => Promise<SelinReturn>,
): () => void {
  send = post;
  startReturn = begin;
  checkReturn = verify;
  const stop = watchPersonaCheckpoint(checkpointVoicePersona);
  // playerId is deliberately null behind a consent gate. Events invalidate in-flight checks
  // even when an off/on identity change therefore looks like null -> null to the getter.
  const invalidateRecording = () => {
    recordingAttempt++;
  };
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === 'hf-lab-player' || event.key === 'hf-lab-recording-off')
      invalidateRecording();
  };
  window.addEventListener('hf-lab-preference', invalidateRecording);
  window.addEventListener('storage', storage);
  return () => {
    invalidateRecording();
    window.removeEventListener('hf-lab-preference', invalidateRecording);
    window.removeEventListener('storage', storage);
    stop();
    send = undefined;
    startReturn = undefined;
    checkReturn = undefined;
  };
}
export function resetVoicePersona(): void {
  recordingAttempt++;
  session.reset();
  published = '';
  pending = false;
  gameLabs.voice.setPersonaRecording(null);
}
export function checkpointVoicePersona(): void {
  if (!shelf.enabled || !send || pending) return;
  send({ type: 'personaCheckpoint' });
  message(
    'Selin will finish her current action. Her enquiry waits until after work; her commitments travel with her.',
  );
}

export async function receiveVoicePersona(reply: WorkerToMain): Promise<void> {
  if (reply.type !== 'personaCheckpoint') return;
  if (reply.error) {
    message(reply.error);
    return;
  }
  if (!reply.transfer || !reply.file || !shelf.enabled || pending || reply.file.hash === published) return;
  pending = true;
  const departureAttempt = recordingAttempt;
  const epoch = await shelf
    .request<{ recordingEpoch: string | null }>({ action: 'recording' })
    .catch(() => null);
  try {
    let local = false;
    const existing = await shelf
      .request<PersonaEnvelope | null>({ action: 'get', castId: SELIN_CAST })
      .catch(() => {
        local = true;
        return session.head ?? null;
      });
    requireOwnHead(existing, session.head);
    const envelope = await createPersona({
      format: 'hf-persona/1',
      castId: SELIN_CAST,
      castRevision: '1',
      branchId: session.head?.branchId ?? crypto.randomUUID(),
      parentRevision: session.head?.revision ?? null,
      source: { game: 'voice', build: await fetchBuild(), engine: reply.file.engine, rules: 'voice-4' },
      transfer: reply.transfer,
      limitations: reply.transfer.person.person.limitations,
    });
    const accepted = local
      ? envelope
      : await shelf.request<PersonaEnvelope>({
          action: 'put',
          envelope,
          authored: !session.head && departureAttempt === recordingAttempt,
          recordingEpoch: epoch?.recordingEpoch ?? undefined,
        });
    const row: OneCastRow = {
      v: 1,
      probe: 'selin',
      arm: 'continuing',
      scope: local ? 'local' : 'shared',
      castId: SELIN_CAST,
      branchId: accepted.branchId,
      revision: accepted.revision,
      parentRevision: accepted.parentRevision,
      stage: 'checkpoint',
      outcome: 'accepted',
    };
    const prior = (reply.file as PlaytestFile & { oneCast?: OneCastRow[] }).oneCast ?? [];
    const prefix = { ...reply.file, oneCast: [...prior, row], voicePersonaHead: accepted };
    // Source world stays in its host. A lost/evicted prefix makes a return unavailable, not a time reversal.
    try {
      localStorage.setItem(departureKey(accepted.branchId), JSON.stringify(prefix));
    } catch {
      throw new Error(
        'Selin reached the shelf, but this browser could not keep her source chapter for a return. Download the original run.',
      );
    }
    session.accept(accepted);
    published = reply.file.hash;
    if (local) gameLabs.voice.setPersonaRecording(accepted.branchId);
    else await recording(accepted);
    send?.({ type: 'personaPublished', row, envelope: accepted });
    message(
      'Selin’s chapter is on this browser’s people shelf. Her commitments and attended work history travel; other state stays here.',
    );
  } catch (error) {
    message(error instanceof Error ? error.message : String(error));
  } finally {
    pending = false;
    changed();
  }
}

export async function prepareVoiceReturn(
  automatic = false,
  imported?: PersonaEnvelope,
): Promise<{ header: SelinReturn; seed: number } | null> {
  await shelf.ready;
  if (!shelf.enabled || pending || session.loading) return null;
  pending = true;
  try {
    const envelope =
      imported ?? (await shelf.request<PersonaEnvelope | null>({ action: 'get', castId: SELIN_CAST }));
    if (!envelope || envelope.source.game !== 'goodhands') {
      if (automatic) return null;
      throw new Error('No returned enquiry from Good Hands is on this browser’s shelf.');
    }
    const prefix = localStorage.getItem(departureKey(envelope.branchId));
    if (!prefix)
      throw new Error(
        'The original Voice chapter is unavailable in this browser. A fresh authored town remains playable; Selin cannot return to an earlier month.',
      );
    const file = JSON.parse(prefix) as PlaytestFile & { oneCast?: OneCastRow[] };
    if (!checkReturn) throw new Error('The simulation is not ready to check Selin’s return.');
    recordingAttempt++;
    session.begin(envelope.branchId);
    const base: SelinReturn = {
      version: 1,
      prefix,
      initial: '',
      admission: envelope,
      rows: file.oneCast ?? [],
    };
    const checked = await claimAfterValidation(base, checkReturn, async () => {
      const { revision: _oldRevision, ...body } = envelope;
      const claim = await createPersona({
        ...body,
        parentRevision: envelope.revision,
        source: {
          game: 'voice',
          build: await fetchBuild(),
          engine: envelope.source.engine,
          rules: 'voice-4',
        },
      });
      return imported ? claim : await shelf.request<PersonaEnvelope>({ action: 'put', envelope: claim });
    });
    const accepted = checked.head;
    const row: OneCastRow = {
      v: 1,
      probe: 'selin',
      arm: 'continuing',
      scope: imported ? 'file' : 'shared',
      castId: SELIN_CAST,
      branchId: accepted.branchId,
      revision: accepted.revision,
      parentRevision: accepted.parentRevision,
      stage: 'admitted',
      outcome: 'accepted',
    };
    const header: SelinReturn = {
      ...checked.candidate,
      acceptedHead: accepted,
      rows: [...(file.oneCast ?? []), row],
    };
    session.stage(accepted);

    message(
      'A new chapter continues from Selin’s original departure. Her enquiry answer can reach Halil in their next connected call.',
    );
    return { header, seed: file.seed };
  } catch (error) {
    session.finish(false);
    message(error instanceof Error ? error.message : String(error));
  } finally {
    pending = false;
    changed();
  }
  return null;
}
async function continueReturn(): Promise<void> {
  const prepared = await prepareVoiceReturn();
  if (prepared) startReturn?.(prepared.header, prepared.seed);
}

export function VoicePersonaControls({ canReturn }: { canReturn: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const render = () => {
      const element = root.current;
      if (!element) return;
      element.replaceChildren(
        personaControls({
          enabled: shelf.enabled,
          recordingAllowed: gameLabs.voice.personaRecordingAllowed,
          setEnabled(value) {
            shelf.setEnabled(value);
            if (value) checkpointVoicePersona();
            else send?.({ type: 'personaCheckpointCancel' });
            render();
          },
          allowRecording(value) {
            if (session.loading) {
              message('Wait until the chapter has finished loading.');
              return;
            }
            const attempt = ++recordingAttempt;
            const lab = gameLabs.voice;
            const head = session.head;
            const key = session.key;
            if (!value) lab.allowPersonaRecording(false);
            const current = () =>
              attempt === recordingAttempt &&
              !session.loading &&
              session.head?.revision === head?.revision &&
              session.key === key;
            if (!head) {
              if (current()) lab.allowPersonaRecording(value);
              render();
              return;
            }
            void shelf
              .request<{ recordingEpoch: string | null }>({ action: 'recording', envelope: head })
              .then((epoch) => {
                if (!current()) return null;
                return shelf.request<{ branchId?: string; revision?: string }>({
                  action: 'recording',
                  castId: SELIN_CAST,
                  envelope: head,
                  allowRecording: value,
                  recordingEpoch: epoch.recordingEpoch ?? undefined,
                });
              })
              .then((result) => {
                if (current() && result?.branchId === head.branchId && result.revision === head.revision)
                  lab.allowPersonaRecording(value);
                render();
              })
              .catch((error) => message(String(error)));
          },
        }),
      );
      const explanation = document.createElement('p');
      explanation.textContent = status;
      element.append(explanation);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Start Selin’s return chapter';
      button.disabled = !canReturn || !shelf.enabled || pending || session.loading;
      button.onclick = () => {
        void continueReturn();
      };
      element.append(button);
      const exportButton = document.createElement('button');
      exportButton.type = 'button';
      exportButton.textContent = 'Download Selin’s passport';
      exportButton.disabled = !session.head;
      exportButton.onclick = () => {
        if (session.head) downloadJson('selin.persona.json', session.head);
      };
      element.append(exportButton);
      const label = document.createElement('label');
      label.textContent = 'Load Selin’s returned passport';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.disabled = !canReturn || !shelf.enabled || session.loading;
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 256 * 1024) {
          message('This passport is too large.');
          return;
        }
        void file
          .text()
          .then((text) => validatePersona(JSON.parse(text)))
          .then((envelope) => prepareVoiceReturn(false, envelope))
          .then((result) => {
            if (result) startReturn?.(result.header, result.seed);
          })
          .catch((error) => message(String(error)));
      };
      label.append(input);
      element.append(label);
    };
    listeners.add(render);
    render();
    window.addEventListener('hf-lab-preference', render);
    return () => {
      listeners.delete(render);
      window.removeEventListener('hf-lab-preference', render);
    };
  }, [canReturn]);
  return <div ref={root} className="v-persona-controls" />;
}
