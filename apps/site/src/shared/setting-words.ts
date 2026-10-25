/** Display only. Keep saved text, identifiers, advice and replay inputs unchanged.
 * Prayer/meal meanings follow research/decisions.md and research/prayer-times-sources.md.
 * Ramadan and Eid are Voice's two flavour words, explained on its entry page.
 */
export function settingWords(value: string): string;
export function settingWords(value: string | undefined): string | undefined;
export function settingWords(value: string | null | undefined): string | null | undefined;
export function settingWords(value: string | null | undefined): string | null | undefined {
  if (typeof value !== 'string') return value;
  const words: Record<string, string> = {
    suhoor: 'pre-dawn meal',
    iftar: 'sunset meal',
    fajr: 'dawn prayer',
    dhuhr: 'noon prayer',
    asr: 'afternoon prayer',
    maghrib: 'sunset prayer',
    isha: 'night prayer',
    masjid: 'mosque',
    qada: 'make-up prayer',
    salah: 'prayer',
    sawm: 'fasting',
    zakat: 'obligatory charity',
    kapıcı: 'caretaker',
  };
  return value
    .replace(/\bHajja Maryam\b/g, 'Maryam')
    .replace(/\bYusuf Usta\b/g, 'Master Yusuf')
    .replace(/\bEid al-Fitr\b/g, 'Eid')
    .replace(/\bEid mubarak\b/gi, 'Happy Eid')
    .replace(/\bShawwal (\d+)\b/g, (_match, day: string) =>
      Number(day) === 1 ? 'Eid day' : `day ${Number(day) - 1} after Eid`,
    )
    .replace(/\b(pray|prays|prayed) (Fajr|Dhuhr|Asr|Maghrib|Isha)\b/gi, '$1 the $2')
    .replace(
      /\b(after|before|for|until|missed|kept|have|has|had|eat|eats|ate|cook|cooks|cooked|through|miss|misses|remember|remembers|remembered) (suhoor|iftar|Fajr|Dhuhr|Asr|Maghrib|Isha)\b/gi,
      '$1 the $2',
    )
    .replace(
      /\b(?:suhoor|iftar|fajr|dhuhr|asr|maghrib|isha|masjid|qada|salah|sawm|zakat)\b|kapıcı/gi,
      (term, offset: number, text: string) => {
        const english = words[term.toLowerCase()] ?? term;
        const startsSentence = !text.slice(0, offset).trim() || /[.!?]\s*$/.test(text.slice(0, offset));
        return startsSentence && term[0] === term[0]?.toUpperCase()
          ? english[0]?.toUpperCase() + english.slice(1)
          : english;
      },
    );
}
