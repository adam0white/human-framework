# Reconciling the Islamic understanding of the human with current science

Prepared 2026-10-18. §6 (promptings and turning away) is implemented in HF 2.4.0 (`packages/human/src/promptings/`); the lenses `promptingsReading` and `nafsReading` ship with it. §7 remains a menu. Owner's ambition, as relayed: HF is currently "scientific"; it should reconcile what Islam teaches about the human being with strong current science, *as interpretations people hold, not the truth itself, allowing variations*. Guided lightly by the owner's standing direction: AGENTS.md faith rules, [decisions.md](decisions.md) (post-sectarian, most common position overall, pragmatic, no scholarly review expected), [islamic-foundations.md](islamic-foundations.md) and the spine in [docs/framework.md](../docs/framework.md).

Claim kinds follow [source-method.md](source-method.md): **R** revealed source, **I** interpretation (scholar named), **E** empirical finding, **M** explanatory model, **C** engineering convention. Source numbers (Q*, H*, K*, P*) point to the ledger in §8, which gives each source's access depth in this pass. Hadith are paraphrased and linked, not quoted.

## 1. What HF already has

HF is less secular than "scientific" suggests. Its spine, *Urge → Assent → Act* (framework.md), is already the Islamic distinction between a passing suggestion and a deed (H1), and responsibility already follows capacity (Q13). What exists, by module:

| Tradition | HF today | Where |
|---|---|---|
| Niyya (intention apart from the act) | Private intention record, invisible to observers | `conscience/ recordDeed` |
| Held norms, with provenance | A person's *understanding* of each norm: standing and conviction | `conscience/ heldNorms`, `catalog.ts` |
| Necessity, capacity | Veto lifts under 2:173 necessity and 2:286 capacity | `conscience/ normVeto`, `abstentionVeto`, `will/ closingDuties` |
| Tawba | Regret, stopping, resolve, restitution as the person's acts; acceptance never computed | `conscience/ repent`, `recordRepair`; `affect/ release` |
| Lawwama (self-reproach) | Guilt from known breaches, with a tendency to repair | `conscience/ guiltLoad`, `affect/` |
| Worship, dhikr, reflection | Prayer windows, fasting, Eid; worship and reflection as regulation practice | `agenda/prayer.ts`; `affect/ regulate` |
| Ammara-like pulls | Habit pull and craving after abstinence; emotion action tendencies | `habits/`, `affect/ actionTendencies` |
| Sabr as restraint | No willpower fuel; restraint emerges from competing terms, habits, precommitments | `will/`, `agenda/` abstain |
| Fitra (upbringing side of Muslim 2658b) | A minor's norm understanding follows the household's lived example | `family/ raise` → `conscience/ understandNorm` |

Standing exclusions (inventory §8, framework.md): no divine acceptance, worth or reward; no ruh quantity; RNG not named qadar; **qalb, nafs, fitra and ʿaql are not state variables**.

What is missing for the owner's ambition: the inner event *before* assent is not a thing in HF. A habit urge or temptation is only a term inside one utility sum. Nobody notices it, names it, turns from it or reads it as anything. So HF cannot show the one inner movement both the tradition and the science describe most carefully: a pull arises, is noticed, and is let pass or assented to.

## 2. Position on the existing no-scalar decision

**Uphold it, and sharpen it.** The owner's phrase "interpretations people hold" points the same way. HF will not store a qalb meter, a nafs level or a fitra score. Two things become representable instead:

1. **Lenses**: read-only functions that describe existing state in the tradition's vocabulary (and in psychology's). A lens computes nothing new about the person; it only names. Example: `nafsReading(p)` reports whether recent assents followed pulls against held norms, self-reproach after breaches, or settled ease in kept duties, citing the three Qur'anic descriptions (Q1–Q3).
2. **Held self-understanding**: what the *person* believes their inner events are (whisper, own inclination, intrusive thought), stored like `heldNorms` with provenance. This is state, because people differ in it and it changes what they do (§5).

This revises nothing in code; it records the decision with a reason (decisions.md row 1).

## 3. The integrated map

Each row: what the tradition says (R/I), what science says (E/M), and how HF represents it (C). "Agree" means the two predict the same behaviour for a simulated person; "differ" means they make different claims, at least one of which HF cannot or should not simulate.

| Term | Tradition | Science | Relation | HF representation |
|---|---|---|---|---|
| **Ruh** | From the Lord's command; human knowledge of it is small (Q6) | No construct | Outside science's reach; not a disagreement | Referent kept in docs; no field, no derived measure. Not reopened |
| **Fitra** | Created disposition toward recognising God and the good; parents shape it (Q5, H8) | Infant helper preference (P8) failed a large multi-lab replication; intuitive moral judgement (P16) stands as a model; intuitive moral judgement (P16) | Science gives no firm support for an innate moral orientation; tradition affirms one. HF does not pretend the evidence settles it | Not a trait profile. Default values and openness to the household's norms (existing `raise`); the religious content stays a held belief |
| **Qalb** | Seat of understanding and moral perception; it can be blind (Q7); its soundness governs the body (H9); sin is what troubles it (H7); it trembles at remembrance (Q18); tranquil in remembrance (Q11) | Valuation, salience and attention integrate affect and cognition (M) | Agree on integration; differ on whether a non-bodily heart exists | A **lens** over attention, held norms, conviction, mood and trust; never one scalar |
| **Nafs** (ammara, lawwama, mutmaʾinna) | One self described as urging evil (Q1), reproaching itself (Q2), at rest (Q3); it can be purified or corrupted (Q4) | Desire–conflict–resistance in daily life (P1, P2); guilt motivates repair, shame avoidance (P7); people high in self-control meet fewer conflicts, via habits (P6) | Strong agreement on behaviour: three Qurʾanic descriptions match three observed patterns | A **lens** over pulls, guilt and habits. Three Qurʾanic names only, no ladder, no three agents (islamic-foundations §2). Later Sufi stations are elaboration, not modelled |
| **ʿAql** | Qurʾanic verbs of reasoning, often tied to hearts (Q7, Q19); the root sense of tethering | Executive function, model-based choice, inhibition | Agree on function | Existing `cognition/` and `will/`. Sourced from the Qurʾan only: many hadith praising ʿaql are graded weak |
| **Khawatir / waswas** | Passing thoughts, known to God (Q10); seek refuge from a prompting (Q8); the whisperer (Q9; that it withdraws at remembrance is tafsir of *khannas*, I); not counted until acted or spoken (H1); seek refuge and desist (H2); distress at such thoughts is a sign of faith (H3). Stages from passing thought to resolve (K1, K4) | Unwanted intrusive thoughts are near-universal (P4); suppression rebounds (P3); redirection and acceptance help (P13, P17); scrupulosity is measurable and more common in the devout (P15; treatment evidence not verified this pass) | **Strongest convergence**: the thought is not the person's act; do not argue with it; turn attention away. Differ on the source (an external whisperer vs a mental event) | **First slice (§6)**. Same mechanism under both readings; the reading is held per person |
| **Niyya** | Deeds by intentions (H5); God regards hearts and deeds (H6) | Intentions predict behaviour; implementation intentions (P5) | Agree | Existing intention record; implementation intentions are a roadmap item |
| **Dhikr** | Hearts find rest in remembrance (Q11); the rememberer is like the living (H12) | Meditation and religious coping show modest effects on distress (P10, P11) | Agree on regulation and attention; differ on effects beyond them | Existing `regulate(worship)`; in §6 a practised turning-away. Only attentional and regulatory effects are modelled |
| **Tawba** | Return, regret, resolve (Q15, Q16, K5); do not despair (Q17); H10 supporting only | Guilt-driven repair (P7) | Agree on the acts | Existing. Acceptance is never computed |
| **Sabr / shukr** | The believer's affair: gratitude in good, patience in harm (H11); seek help through patience and prayer (Q12); gratitude increases (Q14) | Situation selection and reappraisal (P12, P14); gratitude interventions small effects (P9) | Agree on practices; differ on "increase" (a divine promise vs a mood effect) | Later slice: appraisal styles in `affect/`. No reward model |
| **Muhasaba** | Daily self-examination (K2, K3) | Reflection that revises plans after failure | Agree | Second slice (§7): fills "reflection that revises from failure" |
| **Accountability** | Each person answers for deliberate acts within capacity (Q13) | Responsibility judgements (M) | Theological claim beyond simulation | Records what was assented, with excuse context; computes no judgement |

## 4. Where they differ, and how HF holds both readings

The differences are real and HF does not hide them:

1. **Source of the inner suggestion.** Whisperer (Q9, H2) or a mental event (P4). Both readings predict the same response (turn away); HF keeps the mechanism shared and lets each person hold a reading.
2. **Ruh, the afterlife, divine response to prayer.** Not simulated by rule. A person may *believe* them; the engine never computes them.
3. **Fitra's content.** HF models moral orientation and upbringing, never "innate tawhid" as a measured fact.
4. **Effects of dhikr and shukr beyond attention and mood.** HF models only the attentional and regulatory effect, which is what science measures. It does not claim that is all there is (absence of a number is not absence; islamic-foundations §5).
5. **Scrupulosity.** Both traditions warn against it, but a person who reads every intrusive thought as their own sin is the scrupulous pattern clinicians and Islamic sources both describe (P15). This is the one place where the held reading changes what the person feels: guilt at the thought itself, from their own understanding (§5).

**Rule for representing both readings (C):** mechanics are shared by default. A held reading changes (a) vocabulary in narration and lenses, (b) the person's attribution of an inner event, and (c) which practised responses the person has. A reading changes dynamics only through what the person believes (an appraisal of their own inner event), never through a hidden mechanism; any mechanism beyond that is a labelled, off-by-default assumption. No reading earns a hidden bonus.

## 5. Held readings (variation between people)

A person holds one reading of their own inner suggestions, with provenance, set by the host at birth or by upbringing:

| Reading id | Meaning | Source |
|---|---|---|
| `whisper` | A suggestion from outside the self: seek refuge, desist | Q8, Q9, H2, K4 |
| `inclination` | The self's own pull, which one restrains | Q1, Q4, K1 |
| `intrusion` | A mental event, not who I am | P3, P4, P17 |
| `fault` | The thought itself is my wrongdoing | Scrupulous reading (P15); contrary to H1 |

The first three are the common views in tradition and psychology; they differ in vocabulary, not behaviour. `fault` is the reading both reject. It is included because real people hold it. By default it differs only in appraisal: the person feels guilt at the prompt itself, because they believe the thought was wrong. A recurrence term (`echo`, engaging the prompt makes it return) is available but defaults to 0 and is host-set. The rebound evidence is contested (P3): a 2020 meta-analysis finds rebound, a 2025 review doubts it in healthy people, so the recurrence term is a labelled assumption (C), small by default. Hosts can use it for a character in distress; the default is none of these, which behaves as `intrusion` with neutral vocabulary.

## 6. First slice: prompts and turning away

### 6.1 Scope paragraph (for the module comment)

A *prompt* is a pull toward an option that the person's own held norms, abstentions or goals oppose, strong enough to be noticed. The module records prompts, lets the person turn from them by a practised response, and keeps a prompt apart from assent: only an assented act reaches `conscience/ recordDeed`, so a prompt is never a breach (H1). Borrowed shapes: everyday desire, conflict and resistance (P1, P2); suppression rebound and redirection (P3, P13); practised if–then responses (P5). Every number is an engineering default, not fitted. Does not claim: the source of any thought, a measure of faith, spiritual rank, reward for resisting (by rule; H4 is acknowledged as a held belief), clinical OCD, or a cessation rate.

### 6.2 Discriminators

It sits on one boundary (between `cognition/ consider` and `will/ resolveChoice`); both readings predict the same behaviour; it fills missing rows (implementation intentions, metacognition of one's own urges, a missing link between habits and conscience); it adds no qalb or nafs scalar.

### 6.3 State and ownership

New module `packages/human/src/promptings/`, owning optional `p.promptings` (opt-in: `enablePromptings(p, spec)` or `PersonSpec.enable.promptings`; absent means nothing runs and existing runs replay byte for byte, as `affect/crisis.ts` does).

```ts
interface PromptingsState {
  reading: 'whisper' | 'inclination' | 'intrusion' | 'fault' | 'none';
  readingSource?: string;          // provenance id, as for held norms
  responses: {                     // practised turnings-away (if-then)
    id: string;
    kind: 'refuge' | 'redirect' | 'leave';  // module-own ResponseKind (affect's PracticeKind is reflection|worship|rest)
    practice: Unit;                // skill-like, grows with use, slow decay
  }[];
  recent: {                        // capped ring, like memory episodes
    at: Minute; action: string; source: string;   // 'habit' | 'emotion:*' | 'need:*' | 'host'
    opposedBy: string;             // 'norm:x' | 'commitment:c' | 'goal:g'
    outcome: 'passed' | 'turned' | 'assented';
  }[];
  echo: Record<string, Unit>;      // per action: recurrence from engaging with the prompt
}
```

### 6.4 Inputs, outputs, loop

- **Input**: the `Considered[]` list from `consider`, each with traced terms. A prompt is an option whose pull terms (`habit`, `emotion:*`, `need:*`, host `temptation` tag) exceed `noticeAt` while a `norm:*`, abstention or `goal:*` term on the same option is negative. Detection reads terms; it changes none.
- **Turning away**: if the person has a response, a term `promptings:turn` of value `−turnMax × practice` is added to that option (bounded, so a desperate bodily need still wins, keeping 2:286). With reading `fault`, a small guilt appraisal follows the prompt; if a host sets `echoRate` > 0, `echo` rises (assumption from P3, contested; §5).
- **Outputs**: the extra `Term` into `consider`; one `recent` record per prompt per decision point, labelled `turned`, `passed` (another option won without a response) or `assented`; a chronicle line under the reading's vocabulary ("a thought came; she sought refuge and let it pass" / "an urge passed"); with `fault` only, a small guilt appraisal at the prompt. Assent goes through the usual will and conscience path unchanged.
- **Learning**: each `turned` raises that response's practice with diminishing gains; disuse decays it slowly (reusing `skills/` shapes). `echo` decays over days.
- **Lenses** (read-only, in this module): `promptingsReading(p)` summarises recent prompts, turnings and assents; the nafs lens in §3 reads it together with `guiltLoad`.
- **Determinism**: no RNG; everything derives from terms and time. Under softmax choice the will still draws from `p.rng` as today.
- **Save**: `sanitizePromptings` in `restore.ts`; a migration that leaves old saves without the slice.

### 6.5 Tests

1. Off by default: a person without the slice replays existing fixtures byte for byte.
2. A prompt alone writes no breach, guilt or intention record (all readings except `fault`, which writes guilt only, never a breach).
3. Only assent reaches `recordDeed`; a breach follows only an assented act that a held norm opposes.
4. Practice: over 30 cue days, the share of `turned` rises and assents fall; disuse lowers practice slowly.
5. Bound: a turning-away term never overrides a bodily need at survival desperation.
6. Readings `whisper`, `inclination`, `intrusion` give identical decisions and differ only in narration.
7. With `echoRate` > 0, `fault` raises recurrence (testing the assumed term, not an empirical claim); with the default 0 it does not (more prompts for the same cue) relative to `intrusion`.
8. Save and restore round-trip; a malformed slice is dropped.

### 6.6 Headless control (domain-neutral)

`headless control: practised turning-away vs suppression-only`. Three people with the same cued habit toward an option one held norm opposes, on the same 60-day cue schedule: A has no response; B has a practised `redirect`; C holds `fault`. Expected: B's assents fall over weeks and its prompts stay flat; A's assents track habit strength (extinction only); C feels guilt at prompts but has no extra breaches (with the default `echoRate` 0, the same prompts as A). A plain alternative (a fixed −k penalty with no practice and no echo) cannot produce B's learning curve or separate C's guilt from breaches, which is what the control shows. Neutral labels only ("cue", "option", "norm n1"); no religious content is needed for the test.

### 6.7 How games use it quietly

A character pauses before the forbidden thing, and the line reads "she let it pass". A playtester sees a person who sometimes resists and gets better at it, without a meter. Faith stays background texture (decisions.md, Games row).

## 7. Later slices (menu, not started)

| Slice | Fills | Sources |
|---|---|---|
| Muhasaba: evening review that revises a method or commitment after failure | Inventory §10 "reflection that revises" (v0 revision-from-failure) | K2, K3; P5 |
| Sabr and shukr as appraisal styles (reappraisal, gratitude) in `affect/` | Regulation strategies beyond practice kinds | H11, Q12, Q14; P9, P12 |
| Qalb lens over attention, conviction and mood, for narration | Self-model row in §11 | Q7, H9 |
| Held self-understanding of fitra and purpose | Life purpose row in §7 | Q5, H8; P16 |

## 8. Source ledger

Filled from two verification passes run 2026-10-18 (see access column).

Access: **fetched** = page opened this pass; **abstract** = abstract or catalog record seen via search; **snippet** = search snippet only; **memory** = locator recalled, not verified. sunnah.com refused fetches (403); hadith were read on ihadis.com or the fawazahmed0 hadith-api CDN (whose Muslim numbering is sequential, so Muslim numbers below follow the lettered ihadis/sunnah form).

**Qur'an** (quran.com, Khattab translation; all fetched unless noted)

| Id | Locator | Use |
|---|---|---|
| Q1 | [12:53](https://quran.com/12/53) | The self inclines to evil, except by mercy |
| Q2 | [75:2](https://quran.com/75/2) | The self-reproaching soul |
| Q3 | [89:27–30](https://quran.com/89/27-30) | The soul at peace |
| Q4 | [91:7–10](https://quran.com/91/7-10) | Purifying or corrupting the self (verse 8 not separately displayed) |
| Q5 | [30:30](https://quran.com/30/30) | Fitra |
| Q6 | [17:85](https://quran.com/17/85) | Ruh of the Lord's command; little knowledge |
| Q7 | [22:46](https://quran.com/22/46) | Blindness of hearts; hearts that reason |
| Q8 | [7:200–201](https://quran.com/7/200-201) | Seek refuge from a prompting; the mindful remember (end of 201 from knowledge, not the page) |
| Q9 | [114](https://quran.com/114) | The whisperer who withdraws (partial: only verse 1 loaded) |
| Q10 | [50:16](https://quran.com/50/16) | God knows what the self whispers |
| Q11 | [13:28](https://quran.com/13/28) | Hearts rest in remembrance |
| Q12 | [2:153](https://quran.com/2/153) | Help through patience and prayer |
| Q13 | [2:286](https://quran.com/2/286) | No burden beyond capacity |
| Q14 | [14:7](https://quran.com/14/7) | Gratitude brings increase |
| Q15 | [3:135](https://quran.com/3/135) | Remember, seek forgiveness, do not persist |
| Q16 | [66:8](https://quran.com/66/8) | Sincere repentance |
| Q17 | [39:53](https://quran.com/39/53) | Do not despair of mercy |
| Q18 | [8:2](https://quran.com/8/2) | Hearts tremble at remembrance |
| Q19 | [2:44](https://quran.com/2/44) | *afala taʿqilun* |

**Hadith** (Bukhari and Muslim sahih by collection)

| Id | Locator | Use | Access |
|---|---|---|---|
| H1 | Bukhari 5269; Muslim 127a | Thoughts forgiven unless acted on or spoken | fetched (CDN; ihadis) |
| H2 | Bukhari 3276; Muslim 134a | Seek refuge and desist | fetched (ihadis) |
| H3 | Muslim 132a | Distress at grave thoughts is clear faith | fetched (ihadis) |
| H4 | Bukhari 6491 | An intended sin left undone is recorded as good (held belief only) | fetched (CDN) |
| H5 | Bukhari 1 | Deeds by intentions | fetched (CDN) |
| H6 | Muslim 2564c | God regards hearts and deeds | fetched (ihadis) |
| H7 | Muslim 2553a; Wabisa report (Nawawi 40 no. 27, Ahmad and Darimi, graded hasan by Nawawi) | Sin is what troubles the soul; consult your heart | 2553a fetched; Wabisa snippet only |
| H8 | Muslim 2658b | Born on fitra; parents shape | fetched (ihadis) |
| H9 | Bukhari 52; Muslim 1599a | If the heart is sound, the body is sound | fetched |
| H10 | Tirmidhi 2499 | The best of those who err repent; **grading disputed** (hasan per Shakir/Albani, daʿif per Zubair Ali Zai), so supporting only | fetched (CDN) |
| H11 | Muslim 2999 | Gratitude in ease, patience in harm | fetched (ihadis) |
| H12 | Bukhari 6407 | The rememberer and the living | fetched (CDN) |

**Classical scholarship (interpretation)**

| Id | Work | Access |
|---|---|---|
| K1 | al-Ghazali, *Ihya*, Book 21 *Sharh ʿAjaʾib al-Qalb* (Skellie tr.) | Work and subject confirmed; the exact stage list (passing thought, inclination, conviction, resolve) **not verified**; one source lists hajis, khatir, hadith al-nafs, hamm, ʿazm. Check the text before quoting stages |
| K2 | al-Harith al-Muhasibi, *al-Riʿaya li-huquq Allah* | Fetched: [TDV, Muhâsibî](https://islamansiklopedisi.org.tr/muhasibi) (self-accounting central) |
| K3 | Ibn al-Qayyim, *Madarij al-Salikin* | Work confirmed ([TDV](https://islamansiklopedisi.org.tr/ibn-kayyim-el-cevziyye)); its muhasaba and khawatir passages not checked |
| K4 | Ibn al-Qayyim (attrib.), *al-Fawaʾid*: repel the thought before it becomes idea, desire, resolve, act, habit | Snippet via [islamqa 210592](https://islamqa.info/en/answers/210592); TDV notes the attribution is doubted |
| K5 | al-Ghazali, *Ihya*, Book 31 *Tawba* (Stern tr.) | Fetched: [ghazali.org](https://ghazali.org/works/repent-p1.htm) (knowledge, regret, resolve) |

**Empirical (E) and models (M)**

| Id | Source | Finding used | Access, caveats |
|---|---|---|---|
| P1 | Hofmann, Baumeister, Förster & Vohs (2012), JPSP 102(6), doi:10.1037/a0026545 | Experience sampling (n=205, 7,827 reports): desires frequent, conflicting ones resisted with uneven success | abstract |
| P2 | Hofmann, Vohs & Baumeister (2012), Psych Sci 23(6):582 | What people desire, feel conflicted about, resist | abstract; resource interpretation rests on ego depletion, which failed replication (empirical-models S17) |
| P3 | Wegner et al. (1987) JPSP 53:5, doi:10.1037/0022-3514.53.1.5; Wang, Hagger & Chatzisarantis (2020) Persp Psych Sci 15(3), doi:10.1177/1745691619898795; 2025 review [PMC12689852](https://pmc.ncbi.nlm.nih.gov/articles/PMC12689852/) | Suppression rebound; a preset distracter removed it. **Contested** in healthy people | citation; abstract; abstract |
| P4 | Radomsky et al. (2014) JOCRD 3:269, doi:10.1016/j.jocrd.2013.09.002; Rachman & de Silva (1978) BRT 16:233 | 93.6% of 777 students on six continents reported an intrusion in 3 months | abstract; Rachman citation only (and over-read per Rassin & Muris 2007) |
| P5 | Gollwitzer & Sheeran (2006) Adv Exp Soc Psych 38:69, doi:10.1016/S0065-2601(06)38002-1 | If–then plans, mean d≈0.65 | citation; d from secondary source |
| P6 | Galla & Duckworth (2015) JPSP 109(3):508 ([PMC4731333](https://pmc.ncbi.nlm.nih.gov/articles/PMC4731333)); de Ridder et al. (2012) PSPR 16:76 | Habits mediate self-control and outcomes (correlational); trait self-control relates more to automatic behaviour | abstract |
| P7 | Tangney, Stuewig & Mashek (2007) Annu Rev Psych 58:345 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/16953797/)) | Guilt tends to repair, shame to avoidance | abstract; narrative review |
| P8 | Hamlin, Wynn & Bloom (2007) Nature 450:557; Margoni & Surian (2018) Dev Psych 54:1445; ManyBabies4 (Lucca et al. 2025, Dev Sci 28:e13581) | Helper preference in infants; **failed** multi-lab replication (49% chose the helper) | memory; abstract; abstract |
| P9 | Davis et al. (2016) J Couns Psych 63:20; Emmons & McCullough (2003) JPSP 84:377 | Gratitude interventions: small effects on well-being | secondary; abstract (partial replication) |
| P10 | Goyal et al. (2014) JAMA Intern Med 174:357 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/24395196/)) | Meditation: anxiety ES 0.38 at 8 weeks; no better than active treatments | abstract |
| P11 | Ano & Vasconcelles (2005) J Clin Psych 61:461, doi:10.1002/jclp.20049 | Positive religious coping with better adjustment, negative with worse | abstract; mostly correlational |
| P12 | Gross (1998) JPSP 74:224 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/9457784/)) | Reappraisal lowers distress; suppression does not | abstract |
| P13 | Bowen & Marlatt (2009) Psych Addict Behav 23:666 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/20025372/)) | Urge surfing: urges unchanged, fewer cigarettes; preliminary | abstract |
| P14 | Duckworth, Gendler & Gross (2016) Persp Psych Sci 11:35 ([PMC4736542](https://pmc.ncbi.nlm.nih.gov/articles/PMC4736542/)) | Situational strategies act earlier than intrapsychic ones | abstract; review |
| P15 | Abramowitz et al. (2002) BRT 40:825 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/12074376/)); Besiroglu, Karaca & Keskin, J Relig Health, doi:10.1007/s10943-012-9588-7 | Scrupulosity measurable, higher in the devout; a cognitive reading of scrupulosity in Islamic sources | abstract; record only. Treatment (ERP) evidence not verified |
| P16 | Haidt (2001) Psych Rev 108:814; Greene et al. (2001) Science 293:2105 | Intuitive moral judgement; dual process | citation; abstract (contested) |
| P17 | Levin, Hildebrandt, Lillis & Hayes (2012) Behav Ther 43:741 | Defusion helps against inactive controls | abstract; brief analogue studies, proponent authors |
