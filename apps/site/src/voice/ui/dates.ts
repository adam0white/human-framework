/** Display calendar only. The town has no real-year anchor; this fictional spring month starts on Monday
 * 11 March 2024. No prayer times, fasting rules, state or replay timestamps depend on these labels.
 * Keep this local: lab-kit is not installed in the site, and a package change is unnecessary for two formatters.
 */
const START = Date.UTC(2024, 2, 11);
const ENGLISH = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

export function storyDate(day: number): string {
  return ENGLISH.format(START + (day - 1) * 86_400_000).replace(',', '');
}

/** Preserve familiar month labels beside dates on planning and review surfaces. */
export function storyDates(text: string): string {
  return text.replace(
    /\b(Ramadan|Shawwal) (\d+)\b|\bEid al-Fitr\b/g,
    (label, month: string | undefined, n: string | undefined) => {
      const day = month === 'Ramadan' ? Number(n) : month === 'Shawwal' ? 30 + Number(n) : 31;
      return `${label} (${storyDate(day)})`;
    },
  );
}
