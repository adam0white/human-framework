import { labMode } from './lab-mode.ts';
/** Presentation only. Retain diagnostics for the lab; never reinterpret or repair saved state. */
export function playerError(detail: string, action: 'start' | 'load' | 'play' = 'start'): string {
  if (
    /provenance|bound full-source receipt|checksum differs|missing-identity|preservation blocked|native (?:file|continuity)/i.test(
      detail,
    )
  )
    return fileError(detail);
  if (labMode()) return detail.replace(/^Error: /, '');
  if (action === 'load')
    return 'The saved game could not be opened. The saved copy has been kept. You can send Feedback or start a new game.';
  if (action === 'play')
    return 'The game stopped because something went wrong. You can send Feedback or start again.';
  if (/\b(?:head|revision|changed|conflict|ownership)\b/i.test(detail))
    return 'These people changed in another chapter. Check their earlier game before continuing, or start a separate local game here.';
  if (/incompatible|unsupported|eligible|authored|terminal|dead/i.test(detail))
    return 'These people cannot continue here from their current chapter. You can return to their earlier game or start a separate local game here.';
  return 'The game could not access your saved people. You can try again later, send Feedback, or start a separate local game here.';
}

/** File failures stay understandable even when diagnostic tools are visible. */
export function fileError(_error: unknown): string {
  return 'This file could not be opened here. Keep the original file.';
}
