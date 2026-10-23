/** Store the existing playtest envelope; Continue always replays its log, never trusts a snapshot. */
import type { PlaytestFile } from '../../shared/playtest.ts';
export type VoicePlaytest = PlaytestFile;
export const VOICE_SAVE_KEY = 'hf-voice-run';
export function savedVoice(storage: Pick<Storage, 'getItem'>): { text: string; label: string } | null {
  try {
    const text = storage.getItem(VOICE_SAVE_KEY);
    if (!text) return null;
    const file = JSON.parse(text) as PlaytestFile;
    if (file.game !== 'voice' || !Array.isArray(file.log) || typeof file.minute !== 'number') return null;
    const day = Math.floor(file.minute / 1440);
    const minute = file.minute % 1440;
    return {
      text,
      label: `${day > 30 ? 'After Eid' : `Ramadan ${day}`} · ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}
export function saveVoice(storage: Pick<Storage, 'setItem'>, file: VoicePlaytest): boolean {
  try {
    storage.setItem(VOICE_SAVE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}
