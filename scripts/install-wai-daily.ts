/** Install an opt-in launchd timer. launchd fires at 17:50; the runner gate checks America/Chicago. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const label = 'work.adamwhite.lab-wai-play';
const directory = join(homedir(), 'Library/LaunchAgents');
const scratch = join(homedir(), 'code/.lab-scratch/wai-daily');
mkdirSync(directory, { recursive: true });
mkdirSync(scratch, { recursive: true });
const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const file = join(directory, `${label}.plist`);
const plist = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>Label</key><string>${label}</string>\n<key>ProgramArguments</key><array><string>/opt/homebrew/bin/node</string><string>${esc(join(root, 'scripts/lab-wai-play.ts'))}</string><string>--run</string><string>--scheduled</string><string>--suggest</string></array>\n<key>WorkingDirectory</key><string>${esc(root)}</string>\n<key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>\n<key>StartCalendarInterval</key><dict><key>Hour</key><integer>17</integer><key>Minute</key><integer>50</integer></dict>\n<key>StandardOutPath</key><string>${esc(join(scratch, 'launchd.log'))}</string><key>StandardErrorPath</key><string>${esc(join(scratch, 'launchd.log'))}</string>\n</dict></plist>\n`;
writeFileSync(file, plist);
execFileSync('/bin/launchctl', ['bootstrap', `gui/${process.getuid?.()}`, file], { stdio: 'inherit' });
console.log(`Installed ${file}; runs at 17:50 America/Chicago (22:50 UTC in CDT / 23:50 UTC in CST).`);
