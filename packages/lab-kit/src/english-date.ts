/**
 * Formats Gregorian calendar labels with fixed English words and UTC date fields.
 * Numeric weekdays start Sunday at zero; numeric months start January at one.
 * This does not interpret local civil time or model a game's fictional calendar.
 */
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function weekday(day: number): string {
  const value = weekdays[day];
  if (!Number.isInteger(day) || value === undefined) throw new RangeError('Weekday must be 0–6.');
  return value;
}

export function month(monthNumber: number): string {
  const value = months[monthNumber - 1];
  if (!Number.isInteger(monthNumber) || value === undefined) throw new RangeError('Month must be 1–12.');
  return value;
}

export function dayOf(day: number, total: number): string {
  if (!Number.isInteger(day) || !Number.isInteger(total) || day < 1 || day > total) {
    throw new RangeError('Day must be within a positive total.');
  }
  return `Day ${day} of ${total}`;
}

/** Example: Tuesday 14 May. Pass a Date or milliseconds since the Unix epoch. */
export function englishDate(value: Date | number, includeYear = false): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid date.');
  const label = `${weekday(date.getUTCDay())} ${date.getUTCDate()} ${month(date.getUTCMonth() + 1)}`;
  return includeYear ? `${label} ${date.getUTCFullYear()}` : label;
}
