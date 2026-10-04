# Norm catalog sources: review status

Prepared 2026-10-03 (adversarial review finding 3); updated 2026-10-04 with the prayer-time, fasting, Eid and capacity-and-excuse source notes. AGENTS.md asks that rulings come from `research/`, not from agents. The bundled catalog (`packages/human/src/conscience/catalog.ts`, `DEFAULT_NORMS`) cites the references below directly, and most of them had no entry here. This file records each one and its review status. It adds no verse text, translation or ruling. A row stays **pending** until someone checks the reference and attributes the catalog's standing to a named Hanafi source (or records it as an engineering assumption, which the catalog already does where noted).

What each status means:

- **pending:** cited in the catalog only. The catalog header says every Qur'an reference was checked against quran.com (Khattab translation) on 2026-10-03, so the reference itself has been looked up. Its relevance to the norm and the standing the catalog gives it have not been reviewed or attributed in `research/`.
- **reference checked:** as above, and the catalog entry itself also records the check.
- **in research/:** discussed in another `research/` file (linked).
- **in research/ (secondary):** recorded in a linked `research/` source note from contemporary Hanafi bodies (Diyanet, TDV) and Hanafi fatwa sites. Classical texts are only cited via those pages, not read; no qualified Hanafi review. Added 2026-10-04.
- **not in catalog:** a practice the games or town scenario touch that has no `DEFAULT_NORMS` entry. Listed so its sourcing is visible; listing it does not propose adding it to the catalog.

| Norm id | Catalog standing | Reference as cited in the catalog | Status |
|---|---|---|---|
| `salah` | obligatory | Qur'an 2:43 | pending |
| `salah` | obligatory | Qur'an 4:103 (prayer at prescribed times) | pending for standing; the Hanafi window bounds (Fajr ends at sunrise, the Asr split, the disputed shafaq, Isha to dawn) and makruh times are in research/ (secondary) ([prayer-times-sources.md](prayer-times-sources.md)) |
| `sawm-ramadan` | obligatory | Qur'an 2:183 | pending |
| `sawm-ramadan` | obligatory | Qur'an 2:185 (the month of Ramadan) | pending |
| `sawm-ramadan` | obligatory | Qur'an 2:187 (eating and drinking until dawn) | pending for standing; the fast's start at true dawn (imsak) is in research/ (secondary) ([fasting-sources.md](fasting-sources.md) §4) |
| `sawm-ramadan` illness and travel exemptions, make-up owed | — | Qur'an 2:184 | reference checked (catalog, 2026-10-03); illness exemption, kaza vs fidye in research/ (secondary) ([fasting-sources.md](fasting-sources.md) §2-3; the Diyanet doctor page cites 2:184). Travel not researched. |
| `sawm-ramadan` exemptions | — | Qur'an 2:185 (ease, not hardship) | pending (the verse itself); the Diyanet illness conditions are in research/ (secondary) ([fasting-sources.md](fasting-sources.md) §2) |
| `zakat` | obligatory | Qur'an 2:43 | pending |
| `charity` | recommended | Qur'an 2:261 | pending |
| `lying` | forbidden | Qur'an 22:30 | reference checked (catalog, 2026-10-03) |
| `lying` | forbidden | Qur'an 9:119 | pending |
| `theft` | forbidden | Qur'an 5:38 | pending |
| `theft` necessity eligibility | — | extension of 2:173 by analogy | engineering assumption (catalog), pending a Hanafi source |
| `keep-promise` | obligatory | Qur'an 17:34 | in research/ ([cooperation-boundary.md](cooperation-boundary.md)) |
| `kindness-to-parents` | obligatory | Qur'an 17:23 | pending |
| `backbiting` | forbidden | Qur'an 49:12 | pending |
| `help-neighbor` | recommended | Qur'an 4:36 | pending; the standing is recorded in the catalog as an engineering simplification |
| `gratitude` | recommended | Qur'an 2:152 | pending; the standing is recorded in the catalog as an engineering simplification |
| `harm-others` | forbidden | Qur'an 33:58 | pending; the scope is recorded in the catalog as the host's reading |
| `intoxicants` | forbidden | Qur'an 5:90 | pending |
| `forbidden-food` necessity exception | — | Qur'an 2:173 | reference checked (catalog, 2026-10-03) |
| `fairness` | obligatory | Qur'an 83:1-3 | pending |
| `care-dependents` | obligatory | Bukhari 1968 | in research/ ([islamic-foundations.md](islamic-foundations.md) §2) |
| `punctuality` | recommended | engineering default | engineering assumption (catalog) |
| fast violated by smoking (town scenario `violatedBy`) | — | Diyanet Kurul fetva (cites al-Hidaya 1/120-121, Radd al-Muhtar 2/371, 395, 410 via the page) | in research/ (secondary) ([fasting-sources.md](fasting-sources.md) §1). Kaza vs kefaret under Diyanet is unresolved. |
| fidya (permanent inability) vs kaza (temporary) | — | Diyanet Kurul fetvas; Qur'an 2:184 | in research/ (secondary) ([fasting-sources.md](fasting-sources.md) §3) |
| tarawih | not in catalog | Diyanet Kurul; TDV "Teravih" | in research/ (secondary) ([fasting-sources.md](fasting-sources.md) §5); 20 rak'ahs at Diyanet level and Bukhari 2010 unverified |
| Eid al-Fitr prayer | not in catalog (town custom flag `eidPrayer`) | TDV "Bayram"; Hanafi fatwa site; blog | in research/ (secondary) ([eid-and-mourning-sources.md](eid-and-mourning-sources.md) §1): Hanafi wajib; after sunrise kerahat until zawal |
| zakat al-fitr (fitre) | not in catalog | TDV "Fitre"; Diyanet Kurul fetvas and 2026 duyuru; Bukhari 1503-1509 via ihadis.com | in research/ (secondary) ([eid-and-mourning-sources.md](eid-and-mourning-sources.md) §2): Hanafi wajib; due at Eid dawn; cash allowed; 240 TL (2026) |
| grave visit | not in catalog (town activity) | Muslim 976-977 via a fatwa site; Diyanet Kurul etiquette page | in research/ (secondary) ([eid-and-mourning-sources.md](eid-and-mourning-sources.md) §3): Hanafi mandub; on Eid a custom (issuer unconfirmed) |
| condolence (taziye) | not in catalog | TDV "Taziye"; Diyanet Kurul; Bukhari 1280 via hadithunlocked.com | in research/ (secondary) ([eid-and-mourning-sources.md](eid-and-mourning-sources.md) §4) |
| `salah` missed while asleep or forgetting: no sin without intent, qada owed | — | Bukhari 597, Muslim 681/684 via substitute sites; Diyanet Kurul (03.09.2019); TDV "Uyku", "Nisyan" | in research/ (secondary) ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §4); sinful if one sleeps after the time enters while fearing not waking |
| `salah` missed while unconscious (ighma) or insane (junun): five or fewer owed, debt drops once a sixth time has fully passed | — | Diyanet Kurul (12.07.2017, citing Bedâ'i 1/106-108); TDV "Baygınlık", "Cünûn"; Durr al-Mukhtar / Radd al-Muhtar 2/102 via islamqa muftionline; Abu Dawud 4398/4403 | in research/ (secondary) ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §1-2); Abu Hanifa / Abu Yusuf count 24 hours instead (TDV) |
| `sawm-ramadan` missed while unconscious or insane | — | TDV "Baygınlık" (ighma: owed, by agreement); TDV "Cünûn" and SeekersGuidance (junun: none if the whole month, owed if sane at any point) | in research/ (secondary) ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §1-2); one contrary snippet on whole-month ighma unverified |
| `intoxicants` effect on worship (sukr): forbidden means sinful and owes qada; permitted means not sinful | — | Qur'an 4:43 (reference checked); TDV "Sarhoşluk"; Diyanet Kurul (12.07.2017) | in research/ (secondary) ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §3); qada after permitted intoxication unresolved; anaesthesia unsourced |
| `salah` in severe illness: head gesture only (Hanafi); unable to nod, deferred, same five / sixth-time rule | — | Bukhari 1117; Diyanet Kurul îmâ (25.03.2026, citing Bedâ'i 1/108, Hidâye 1/77) | in research/ (secondary) ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §5) |
| emotional distress, panic, grief as an excuse from prayer or fast | — | none | **unsourced** as an excuse; sources found test retained capacity (Darul Iftaa Chicago 257) ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §6) |
| coercion (ikrah) / being prevented from praying | — | TDV "İkrah" | in research/ (secondary) for coercion to break worship (sin lifted, prayer repeated); being prevented or ordered unsourced ([capacity-and-excuse-sources.md](capacity-and-excuse-sources.md) §7) |

The standings in the second column are copied from the catalog for reference; check `catalog.ts` for the current values. Until a row leaves **pending** (and even when it is marked **in research/ (secondary)**, which is not a qualified review), the norm is the engine's working representation of a person's *understanding*, as AGENTS.md requires, and not a ruling.
