# Norm catalog sources: review status

Prepared 2026-10-03 (adversarial review finding 3). AGENTS.md asks that rulings come from `research/`, not from agents. The bundled catalog (`packages/human/src/conscience/catalog.ts`, `DEFAULT_NORMS`) cites the references below directly, and most of them had no entry here. This file records each one and its review status. It adds no verse text, translation or ruling. A row stays **pending** until someone checks the reference and attributes the catalog's standing to a named Hanafi source (or records it as an engineering assumption, which the catalog already does where noted).

What each status means:

- **pending:** cited in the catalog only. The catalog header says every Qur'an reference was checked against quran.com (Khattab translation) on 2026-10-03, so the reference itself has been looked up. Its relevance to the norm and the standing the catalog gives it have not been reviewed or attributed in `research/`.
- **reference checked:** as above, and the catalog entry itself also records the check.
- **in research/:** discussed in another `research/` file (linked).

| Norm id | Catalog standing | Reference as cited in the catalog | Status |
|---|---|---|---|
| `salah` | obligatory | Qur'an 2:43 | pending |
| `salah` | obligatory | Qur'an 4:103 (prayer at prescribed times) | pending |
| `sawm-ramadan` | obligatory | Qur'an 2:183 | pending |
| `sawm-ramadan` | obligatory | Qur'an 2:185 (the month of Ramadan) | pending |
| `sawm-ramadan` | obligatory | Qur'an 2:187 (eating and drinking until dawn) | pending |
| `sawm-ramadan` illness and travel exemptions, make-up owed | — | Qur'an 2:184 | reference checked (catalog, 2026-10-03) |
| `sawm-ramadan` exemptions | — | Qur'an 2:185 (ease, not hardship) | pending |
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

The standings in the second column are copied from the catalog for reference; check `catalog.ts` for the current values. Until a row leaves **pending**, the norm is the engine's working representation of a person's *understanding*, as AGENTS.md requires, and not a ruling.
