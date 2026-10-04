import type { NormDefinition } from '../types.ts';

/**
 * Default norm catalog. Standings record the common Sunni understanding (Hanafi–Maturidi starting point)
 * as a person might hold it; they are not rulings, and a person's held understanding may differ. Each
 * entry carries provenance. Qur'an references were checked against quran.com (Khattab translation)
 * on 2026-10-03. sunnah.com could not be fetched (HTTP 403), so hadith are cited only where verified in
 * research/islamic-foundations.md.
 * Secular-usable norms whose standing is an engineering choice are marked `assumption`.
 * Review status of each cited source (most standings are not yet attributed in research/): research/norm-sources.md.
 *
 * Forbidden norms are named after the act (`theft`, `lying`) so that `violates` reads naturally.
 */
export const DEFAULT_NORMS: NormDefinition[] = [
  {
    id: 'salah',
    label: 'Perform the daily prayers',
    standing: 'obligatory',
    sources: [
      { kind: 'revelation', ref: "Qur'an 2:43" },
      { kind: 'revelation', ref: "Qur'an 4:103 (prayer at prescribed times)" },
      {
        kind: 'interpretation',
        ref: 'A missed prayer is still owed (qada); sleep, forgetting and unconsciousness lift the blame, not the debt; the debt for a stretch of unconsciousness beyond five prayer times drops (Hanafi count, kept as the default): research/capacity-and-excuse-sources.md §0, §2, §4; research/decisions.md',
      },
      {
        kind: 'assumption',
        ref: 'Window boundaries (Fajr until sunrise, one-shadow Asr, red-twilight Maghrib) are the most common positions, chosen in research/decisions.md; agenda/prayer.ts',
      },
    ],
  },
  {
    id: 'sawm-ramadan',
    label: 'Fast in Ramadan',
    standing: 'obligatory',
    sources: [
      { kind: 'revelation', ref: "Qur'an 2:183" },
      { kind: 'revelation', ref: "Qur'an 2:185 (the month of Ramadan)" },
      {
        kind: 'revelation',
        ref: "Qur'an 2:187 (eat and drink until dawn, then complete the fast until nightfall)",
      },
    ],
    // Exemptions are their own understanding, separate from the necessity exception of 2:173 (forbidden-food).
    exemptions: [
      {
        when: 'illness',
        makeUp: true,
        sources: [
          {
            kind: 'revelation',
            ref: "Qur'an 2:184 (whoever is ill or on a journey: an equal number of days after)",
          },
          { kind: 'revelation', ref: "Qur'an 2:185 (repeated; Allah intends ease, not hardship)" },
          {
            kind: 'assumption',
            ref: 'Which illness qualifies is the person’s judgment; the severity threshold is an engineering stand-in',
          },
          {
            kind: 'interpretation',
            ref: "Qur'an 2:184 continues: 'For those who can only fast with extreme difficulty, compensation can be made by feeding a needy person' (quran.com, checked 2026-10-03). Commonly read as covering chronic illness with no expected recovery (fidya instead of make-up); NOT modelled: every qualifying illness, chronic or acute, owes a make-up, because whether a condition is beyond recovery cannot be derived from body state",
          },
        ],
      },
      {
        when: 'travel',
        makeUp: true,
        sources: [
          {
            kind: 'revelation',
            ref: "Qur'an 2:184 (whoever is ill or on a journey: an equal number of days after)",
          },
          { kind: 'revelation', ref: "Qur'an 2:185" },
          { kind: 'assumption', ref: 'What counts as a journey is supplied by the host as a traveling flag' },
        ],
      },
    ],
  },
  {
    id: 'zakat',
    label: 'Pay zakat',
    standing: 'obligatory',
    sources: [{ kind: 'revelation', ref: "Qur'an 2:43" }],
  },
  {
    id: 'charity',
    label: 'Give voluntary charity (sadaqah)',
    standing: 'recommended',
    sources: [{ kind: 'revelation', ref: "Qur'an 2:261" }],
  },
  {
    id: 'lying',
    label: 'Lying (truthfulness is required)',
    standing: 'forbidden',
    sources: [
      { kind: 'revelation', ref: "Qur'an 22:30 (shun words of falsehood; quran.com, checked 2026-10-03)" },
      { kind: 'revelation', ref: "Qur'an 9:119 (be with the truthful)" },
    ],
  },
  {
    id: 'theft',
    label: 'Theft',
    standing: 'forbidden',
    sources: [
      { kind: 'revelation', ref: "Qur'an 5:38" },
      {
        kind: 'assumption',
        ref: 'Listed in CONSCIENCE_DEFAULTS.necessityEligible: taking food in extremity is a juristic extension of the 2:173 necessity exception by analogy (2:173 itself names forbidden food); not yet sourced in research/, recorded as an engineering assumption pending a Hanafi source',
      },
    ],
  },
  {
    id: 'keep-promise',
    label: 'Keep promises and commitments',
    standing: 'obligatory',
    sources: [{ kind: 'revelation', ref: "Qur'an 17:34" }],
  },
  {
    id: 'kindness-to-parents',
    label: 'Kindness to parents',
    standing: 'obligatory',
    sources: [{ kind: 'revelation', ref: "Qur'an 17:23" }],
  },
  {
    id: 'backbiting',
    label: 'Backbiting',
    standing: 'forbidden',
    sources: [{ kind: 'revelation', ref: "Qur'an 49:12" }],
  },
  {
    id: 'help-neighbor',
    label: 'Help and be good to neighbours',
    standing: 'recommended',
    sources: [
      { kind: 'revelation', ref: "Qur'an 4:36 (be kind to neighbours; a command)" },
      {
        kind: 'interpretation',
        ref: 'Standing recorded as recommended for everyday help beyond basic kindness is an engineering simplification; the verse itself is a command',
      },
    ],
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    standing: 'recommended',
    sources: [
      { kind: 'revelation', ref: "Qur'an 2:152 (thank Me, and never be ungrateful)" },
      {
        kind: 'interpretation',
        ref: 'Standing as recommended for expressed gratitude toward people is an engineering simplification',
      },
    ],
  },
  {
    id: 'harm-others',
    label: 'Harming others without right',
    standing: 'forbidden',
    sources: [
      { kind: 'revelation', ref: "Qur'an 33:58 (abusing believers unjustifiably)" },
      {
        kind: 'interpretation',
        ref: 'General prohibition of unjust harm to any person, extended from specific texts; scope of "without right" left to the host',
      },
    ],
  },
  {
    id: 'intoxicants',
    label: 'Intoxicants',
    standing: 'forbidden',
    sources: [{ kind: 'revelation', ref: "Qur'an 5:90" }],
  },
  {
    id: 'forbidden-food',
    label: 'Eating forbidden food (carrion, blood, swine)',
    standing: 'forbidden',
    sources: [
      {
        kind: 'revelation',
        ref: "Qur'an 2:173 ('if someone is compelled by necessity—neither driven by desire nor exceeding immediate need—they will not be sinful'; quran.com, checked 2026-10-03)",
      },
    ],
  },
  {
    id: 'fairness',
    label: 'Deal fairly (no cheating in trade)',
    standing: 'obligatory',
    sources: [
      { kind: 'revelation', ref: "Qur'an 83:1-3 (woe to the defrauders)" },
      { kind: 'assumption', ref: 'Generalised to fair dealing for secular hosts' },
    ],
  },
  {
    id: 'care-dependents',
    label: 'Care for those who depend on you',
    standing: 'obligatory',
    sources: [
      {
        kind: 'interpretation',
        ref: 'Obligations toward family alongside those toward Allah and oneself (Bukhari 1968, as cited in research/islamic-foundations.md §2); extending it to every dependent’s urgent needs is the host’s reading',
      },
      {
        kind: 'assumption',
        ref: 'Standing obligatory for secular hosts as a shared caregiving norm; engineering default',
      },
    ],
  },
  {
    id: 'punctuality',
    label: 'Be on time',
    standing: 'recommended',
    sources: [{ kind: 'assumption', ref: 'Secular social norm; engineering default' }],
  },
  {
    id: 'eid-prayer',
    label: 'Pray the Eid prayer in congregation',
    standing: 'recommended',
    sources: [
      {
        kind: 'interpretation',
        ref: 'Strongly emphasised in every school: wajib for Hanafis, sunnah mu\'akkada (Maliki), sunnah (Shafi\'i), fard kifaya (Hanbali), per TDV "Bayram" in research/eid-and-mourning-sources.md §1',
      },
      {
        kind: 'assumption',
        ref: 'Recorded as recommended (the most common standing overall, research/decisions.md), so missing it is no breach; congregational, with no individual make-up (eid-and-mourning-sources.md §1)',
      },
    ],
  },
];

/**
 * Which default norms only religiously practising people hold ('religious') and which ordinary people
 * across practice levels tend to hold ('shared'); 'core' shared norms get the firmest baseline conviction.
 */
export const NORM_SCOPE: Record<string, 'religious' | 'shared' | 'core'> = {
  salah: 'religious',
  'eid-prayer': 'religious',
  'sawm-ramadan': 'religious',
  zakat: 'religious',
  charity: 'religious',
  intoxicants: 'religious',
  'forbidden-food': 'religious',
  lying: 'core',
  theft: 'core',
  'harm-others': 'core',
  'keep-promise': 'core',
  'kindness-to-parents': 'shared',
  backbiting: 'shared',
  'help-neighbor': 'shared',
  gratitude: 'shared',
  fairness: 'shared',
  punctuality: 'shared',
  'care-dependents': 'shared',
};
