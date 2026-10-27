/** Browser shelf coordination only. Worker owns projection, admission and every simulation change. */
import {
  anchorPersonaLife,
  createPersona,
  initialPersonaLife,
  type PersonaEnvelope,
  type PersonaLife,
  preparePersonaLife,
  validatePersona,
  watchPersonaCheckpoint,
} from '@adam0white/lab-client';
import { personaControls } from '@adam0white/lab-kit';
import { useEffect, useRef } from 'react';
import {
  castRecordingGate,
  chooseCastRecording,
  fileSession,
  setCastEnabled,
  sitePersonaShelf,
} from '../../shared/cast-runtime.ts';
import { gameLabs } from '../../shared/lab.tsx';
import { downloadJson, fetchBuild, type PlaytestFile } from '../../shared/playtest.ts';
import { requireValue } from '../../shared/require-value.ts';
import type { MainToWorker, WorkerToMain } from '../protocol.ts';
import type { OneCastRow, SelinReturn } from '../sim/persona.ts';
import { claimAfterValidation, PersonaSession, requireOwnHead } from './persona-session.ts';

const SELIN_CAST = 'hf.cast.selin.voice';

const departureKey = (branch: string) => `hf-voice-departure:${branch}`;
const shelf = sitePersonaShelf;
export const voicePersonaReady = fileSession ? Promise.resolve(false) : requireValue(shelf).ready;
if (!fileSession) void requireValue(shelf).ready.then(() => changed());
let send: ((message: MainToWorker) => void) | undefined;
let startReturn: ((header: SelinReturn, seed: number) => void) | undefined;
const session = new PersonaSession((key) => {
  gameLabs.voice.setPersonaRecording(key ?? castRecordingGate('voice'));
  changed();
});
let checkReturn: ((header: SelinReturn) => Promise<SelinReturn>) | undefined;
let status = 'Selin can make a household enquiry after work.';
let pending = false;
let published = '';
const listeners = new Set<() => void>();
const changed = () => {
  for (const listener of listeners) listener();
  // This is a gate/UI update, not a recording-identity preference change.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('voice-persona'));
};
const message = (text: string) => {
  status = text;
  changed();
};

export async function gateVoiceFile(text: string): Promise<void> {
  if (fileSession) return;
  session.beginFile(text);
}

export function settleVoiceFileGate(accepted: boolean): void {
  if (fileSession) return;
  session.finish(accepted);
  changed();
}

export function bindVoicePersona(
  post: (message: MainToWorker) => void,
  begin: (header: SelinReturn, seed: number) => void,
  verify: (header: SelinReturn) => Promise<SelinReturn>,
): () => void {
  if (fileSession) return () => {};
  send = post;
  startReturn = begin;
  checkReturn = verify;
  const stop = watchPersonaCheckpoint(checkpointVoicePersona);
  return () => {
    stop();
    send = undefined;
    startReturn = undefined;
    checkReturn = undefined;
  };
}
export function resetVoicePersona(): void {
  if (fileSession) return;
  session.reset();
  published = '';
  pending = false;
  gameLabs.voice.setPersonaRecording(null);
}
export function checkpointVoicePersona(): void {
  if (fileSession) return;
  if (!requireValue(shelf).enabled || !send || pending) return;
  send({ type: 'personaCheckpoint' });
  message(
    'Selin will finish her current action. Her enquiry waits until after work; her commitments travel with her.',
  );
}

export async function receiveVoicePersona(reply: WorkerToMain): Promise<void> {
  if (fileSession) return;
  if (reply.type !== 'personaCheckpoint') return;
  if (reply.error) {
    message(reply.error);
    return;
  }
  if (
    !reply.transfer ||
    !reply.file ||
    !requireValue(shelf).enabled ||
    pending ||
    reply.file.hash === published
  )
    return;
  pending = true;
  try {
    let local = false;
    const existing = await requireValue(shelf)
      .request<PersonaEnvelope | null>({ action: 'get', castId: SELIN_CAST })
      .catch(() => {
        local = true;
        return session.head ?? null;
      });
    requireOwnHead(existing, session.head);
    const branchId = session.head?.branchId ?? crypto.randomUUID();
    const life = session.head?.transfer.life
      ? anchorPersonaLife(session.head.transfer.life as PersonaLife, SELIN_CAST, Date.now())
      : initialPersonaLife(SELIN_CAST, branchId, Date.now());
    const envelope = await createPersona({
      format: 'hf-persona/1',
      castId: SELIN_CAST,
      castRevision: '2',
      branchId,
      parentRevision: session.head?.revision ?? null,
      source: { game: 'voice', build: await fetchBuild(), engine: reply.file.engine, rules: 'voice-4' },
      transfer: { ...reply.transfer, life },
      limitations: reply.transfer.person.person.limitations,
    });
    const accepted = local
      ? envelope
      : await requireValue(shelf).request<PersonaEnvelope>({
          action: 'put',
          envelope,
          authored: !session.head,
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
  if (fileSession) return null;
  await requireValue(shelf).ready;
  if (!requireValue(shelf).enabled || pending || session.loading) return null;
  pending = true;
  try {
    const envelope =
      imported ??
      (await requireValue(shelf).request<PersonaEnvelope | null>({ action: 'get', castId: SELIN_CAST }));
    if (envelope?.source.game !== 'goodhands') {
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
    session.begin(envelope.branchId);
    const life = imported
      ? preparePersonaLife(envelope, Date.now())
      : await requireValue(shelf).request<import('@adam0white/lab-client').LifePreparation>({
          action: 'prepare',
          castId: SELIN_CAST,
        });
    if (life.parent.revision !== envelope.revision)
      throw new Error('Selin’s active head changed. Export or choose again.');
    const base: SelinReturn = {
      life,
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
        transfer: { ...body.transfer, life: life.life },
        source: {
          game: 'voice',
          build: await fetchBuild(),
          engine: envelope.source.engine,
          rules: 'voice-4',
        },
      });
      return imported
        ? claim
        : await requireValue(shelf).request<PersonaEnvelope>({ action: 'put', envelope: claim });
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

/** Compatibility entry point for the single recording switch. */
export function chooseVoiceRecording(value: boolean) {
  return chooseCastRecording('voice', value);
}

export function VoicePersonaControls({ canReturn }: { canReturn: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fileSession) return;
    const render = () => {
      const element = root.current;
      if (!element) return;
      element.replaceChildren(
        personaControls({
          enabled: requireValue(shelf).enabled,
          recordingAllowed: gameLabs.voice.personaRecordingAllowed,
          setEnabled(value) {
            setCastEnabled(value);
            if (value) checkpointVoicePersona();
            else send?.({ type: 'personaCheckpointCancel' });
            render();
          },
          allowRecording: chooseVoiceRecording,
        }),
      );
      const explanation = document.createElement('p');
      explanation.textContent = status;
      element.append(explanation);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Start Selin’s return chapter';
      button.disabled = !canReturn || !requireValue(shelf).enabled || pending || session.loading;
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
      input.disabled = !canReturn || !requireValue(shelf).enabled || session.loading;
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
    window.addEventListener('hf-cast-preference', render);
    return () => {
      listeners.delete(render);
      window.removeEventListener('hf-lab-preference', render);
      window.removeEventListener('hf-cast-preference', render);
    };
  }, [canReturn]);
  return <div ref={root} className="v-persona-controls" />;
}
