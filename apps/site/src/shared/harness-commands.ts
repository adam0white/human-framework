/** CLI words and quoted or semicolon-separated commands share one parser. */
export function harnessCommands(args: string[], commands: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const arg of args) {
    const parts = arg.split(';');
    for (const [i, part] of parts.entries()) {
      const text = part.trim();
      if (!text) continue;
      const word = text.split(/\s+/)[0]?.toLowerCase() ?? '';
      if (i === 0 && out.length > 0 && !commands.has(word)) out[out.length - 1] += ` ${text}`;
      else out.push(text);
    }
  }
  return out;
}
