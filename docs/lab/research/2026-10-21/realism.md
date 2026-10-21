# Realism-inspired full simulation: research for HF

2026-10-21. Research only. No implementation is proposed as authorized work.

**Evidence rule.** **Confirmed** means the cited source was seen today. It confirms what that source reports, not that its model reproduces humanity. **Assumed** marks interpretation, an unverified claim, a proposed design or an expected result. Each table cell inherits its column label. Local HF documents were read today; their repository URLs identify the documents, but remote copies and release receipts were not independently checked.

## A. Prior art and relevant, buildable ideas

### The direction and the existing boundary

**Assumed — recommendation.** Pursue realism through connected causes. A shortage should change a person's body, attention, choices, promises and reputation. Adding more named faculties without those connections would make a larger model without making a more convincing person.

**Confirmed — local documents.** HF separates a person's decision from the host's resolution of its outcome. Suggestions can be refused. Decisions retain labelled terms. The architecture requires deterministic state and seeded randomness; it explicitly calls its coefficients engineering defaults, not calibrated human predictions. The roadmap orders partial sight, readable reasons, long lives and inner movement across three horizons. Sources: [architecture](https://github.com/adam0white/human-framework/blob/main/docs/framework.md), [roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md), [rules](https://github.com/adam0white/human-framework/blob/main/AGENTS.md).

**Confirmed — local status, not a fresh release audit.** HANDOFF reports 2.14.1, including a correction to projects and persistence. It still reports excessive replacement of island placements and no improvement in the carry task. The roadmap's introductory 2.9.0 status is therefore older than the handoff's account. Source: [HANDOFF](https://github.com/adam0white/human-framework/blob/main/HANDOFF.md).

### Worlds, persons and institutions

| Prior art | Confirmed: source seen today | Assumed: useful transfer to HF |
|---|---|---|
| Dwarf Fortress | Bay 12 describes persistent worlds with centuries of recorded history, dwarf thoughts, needs, trade and generated cultural forms. [Developer features](https://bay12games.com/dwarves/features.html) | Preserve consequences across play scales. A broken tool should remain broken after switching from a personal scene to a settlement view. Start with one persistent object and its ownership history. |
| RimWorld | Its developer describes colonist needs, wounds and relationships. Its storyteller deliberately selects external events to produce stories. [Developer overview](https://rimworldgame.com/) | Separate autonomous residents from dramatic intervention. Offer a mode with fixed external shocks when measuring emergence. Otherwise the storyteller can manufacture the pattern being measured. |
| Crusader Kings | The retrieved CK3 diary identifies stress as a character system. The detailed personality link was visible in the developer diary reproduced on Reddit; the official Steam body did not load. [Diary reproduction](https://www.reddit.com/r/CrusaderKings/comments/ha32zg/) | Treat acting against temperament as a lasting cost. Do not assume a stress scalar establishes psychological realism. Dynastic succession could change which person's limited knowledge the player inherits. |
| Kenshi | Lo-Fi describes an open sandbox, a world that does not level with the player, and injuries that alter movement and sight. [Developer site](https://lofigames.com/) | Let capability and the world's indifference set limits. Losing sight should change received evidence, not merely a combat statistic. |
| The Sims | EA describes needs, aspirations and traits; EA-hosted player discussions describe autonomy settings. These establish documented play concepts, not verified current AI reliability. [Developer introduction](https://www.ea.com/games/the-sims/the-sims-4/how-to-play-the-sims), [discussion](https://forums.ea.com/discussions/the-sims-4-gameplay-en/how-to-just-play-with-one-sim/8621295/replies/8621296) | Let objects advertise possible uses while persons choose among them. Test what people do after needs are met. Survival maintenance alone is a weak account of a life. |
| Paradox / Victoria 3 | A developer diary describes Pops supporting different interest groups internally. Another describes religious and cultural change under laws. [Interest groups](https://steamcommunity.com/games/529340/announcements/detail/2981928042001763297), [conversion](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-47-conversion-and-assimilation) | Use population groups for aggregate economics, but do not silently replace individual memory or dissent with group averages. Institutional rules should change opportunities and costs. |
| Football Manager | Sports Interactive describes scouting stages, report completion and reports needing updates. [Recruitment design](https://www.footballmanager.com/features/recruitment-revamp) | Make knowledge acquired, dated and revisable. A confident old assessment should sometimes be less useful than an uncertain recent observation. |

**Assumed — synthesis.** These games suggest three separable forms of realism: material continuity, autonomous choice and institutions that constrain choice. HF should connect them through host contracts. HF need not own terrain, prices or inheritance law to model what a person knows and chooses within them.

### Social interaction and generated history

**Confirmed.** Façade combines autonomous characters, language interpretation and story management in a real-time domestic drama. Its AR study also reports that increased presence did not always increase engagement. [Research paper](https://www.cs.cmu.edu/~spdow/files/AEL-ARFacade-demo-VRST07.pdf). **Assumed.** Borrow interruptions and socially consequential timing. Do not equate greater sensory immersion with better play.

**Confirmed.** Versu coordinates autonomous agents through social practices. These practices offer actions rather than directly controlling agents. Agents select through utility. [Evans and Short](https://cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf). **Assumed.** This is HF's closest architectural comparison here. A shared meal, negotiation or repair session could supply role-dependent offers while retaining each person's refusal. Agency through suggestions is not unprecedented.

**Confirmed.** Prom Week uses Comme il Faut to make social relationships playable. A related paper identifies the burden of writing dialogue that renders its rich social states. [Prom Week](https://ojs.aaai.org/index.php/AIIDE/article/view/12662), [dialogue paper](https://ocs.aaai.org/ocs/index.php/INT/INT7/paper/download/9255/9207). **Assumed.** Separate a social move from its wording: request, promise, decline, warn, accuse, repair. First try two moves with several phrasings, not unrestricted conversation.

**Confirmed.** Ultima Ratio Regum's developer describes discovering generated clues across cultures, religions and societies. [Developer account](https://www.markrjohnsongames.com/games/ultima-ratio-regum/). Caves of Qud's authors describe generating mythic biographies with a deliberately nonstandard relationship between historical cause and effect. [Authors' paper](https://www.freeholdgames.com/papers/Generation_of_Mythic_Biographies_in_CavesofQud.pdf). **Assumed.** Borrow artifacts that carry cultural information. Keep generated atmosphere distinct from events actually produced by simulated people.

**Confirmed.** Shadows of Doubt's developer describes hundreds of generated citizens; its published description places investigation in a persistent city of independent lives. [Citizen development update](https://steamcommunity.com/ogg/986130/announcements/detail/2919981352028600407), [game description](https://steamcommunity.com/app/986130). **Assumed.** Make routines leave inspectable evidence. A witness should report what their route allowed them to see. A printed schedule should not prove actual attendance.

### Subjective UI and control of time

**Assumed — design distinction.** A diegetic interface exists inside the fiction. A subjective interface limits information to a person's evidence. Neither implies the other. A fictional clipboard can still reveal impossible knowledge. A plain text panel can preserve partial sight exactly.

| Example | Confirmed: source seen today | Assumed: HF lesson |
|---|---|---|
| Pathologic, using Pathologic 2 as the concrete example | The published description joins limited time, hunger, thirst, exhaustion and dependence on allies. [Game description](https://store.steampowered.com/app/505230/Pathologic_2/) | Make information gathering compete with survival and obligations. This source does not establish a completely subjective UI. |
| Return of the Obra Dinn | The developer frames the player as an insurance investigator assessing a deserted ship. [Developer site](https://obradinn.com/) | Give the player a task and evidence rather than a world-state dashboard. Treat its supernatural reconstruction as a fictional device, not a human perception model. |
| Disco Elysium | The developer describes 24 non-combat skills and competing internal voices. [Skills](https://discoelysium.com/devblog/2016/09/19/on-skill-checks), [voices](https://discoelysium.com/devblog/2019/07/15/choose-your-own-misadventure-part-1) | Let a faculty change what the character notices or how they interpret it. More confidence need not mean more truth. |
| Papers, Please | Its developer limits inspection to supplied documents and inspection, search and fingerprint systems. [Press kit](https://papersplea.se/presskit/) | Make checking evidence an action with a cost. Documents express claims, not omniscient truth. |

**Confirmed.** SUPERHOT's developer describes time as linked to player movement. Max Payne's manual describes Bullet Time as action slowed for the player. Frozen Synapse's publisher describes planning, testing orders and then simultaneous execution. [SUPERHOT](https://superhotgame.com/presskit), [Max Payne manual](https://cdn.akamai.steamstatic.com/steam/apps/12140/manuals/manual_en.pdf), [Frozen Synapse](https://store.steampowered.com/app/98200/).

**Assumed — comparison.** These solve different problems. Bullet time extends reaction time. Real-time-with-pause suspends consequences during deliberation. Simultaneous turns separate planning from execution. Continuous slowdown preserves urgency while allowing reading. For HF, slow the host's clock for everyone equally. Keep actor decisions on simulation time. Log inputs at simulation timestamps. Do not give the player unlimited previews of another person's private mind. Keep a separate accessibility pause available as a host option; test whether continuous pressure improves the intended experience.

### Beyond games: growing societies and checking claims

**Confirmed.** Epstein and Axtell's Sugarscape grows aggregate patterns from local resource-seeking agents. Its extensions include trade, cultural transmission and a proposed proto-history. Epstein's Generative Social Science frames explanation as generating macro patterns through interacting agents. NetLogo supplies executable Sugarscape examples with documented rules. [Sugarscape](https://www.brookings.edu/books/growing-artificial-societies/), [Epstein](https://www.jstor.org/stable/j.ctt7rxj1), [NetLogo model](https://ccl.northwestern.edu/netlogo/models/Sugarscape3WealthDistribution).

**Assumed.** Use that experimental discipline before attempting a comprehensive civilization. Compare HF people with simple resource-seekers in the same world. Ask which extra faculty changes an outcome, and whether it improves a separately specified target. A plausible story alone cannot distinguish competing explanations.

**Confirmed.** Stanford's Generative Agents paper uses an LLM with memory, reflection and planning for 25 agents. Its evaluation concerns believable behavior. Project Sid reports 10–1,000+ agents in Minecraft, including specialized roles, collective rules and cultural transmission; it calls its findings preliminary. [Generative Agents](https://arxiv.org/abs/2304.03442), [Project Sid](https://arxiv.org/abs/2411.00114).

**Assumed.** Borrow their questions about coordination and memory, not their inference engines. Language fluency and observer-rated believability are different targets from historically accurate behavior. HF could compare explicit rules against these demonstrations without putting an LLM in its actor loop.

**Confirmed.** Turchin and colleagues tested a model of warfare, geography and institutions against the distribution of large societies from 1500 BCE to 1500 CE. They report 65% explained variance for their selected outcome. Seshat publishes replication datasets, curated snapshots and API access. Epstein explicitly distinguishes explanation from prediction. [Historical model](https://doi.org/10.1073/pnas.1308825110), [Seshat data](https://seshatdatabank.info/data), [Why Model?](https://www.jasss.org/11/4/12/12.pdf).

**Assumed.** Cliodynamics offers targets for aggregate historical comparison, not validation of every person's motives. Use a fixed dataset release, record missingness and disputed coding, and hold out regions or periods before tuning. Compare alternative mechanisms. Reproducing a curve does not identify its cause.

**Confirmed.** A social digital twin review proposes incorporating lived social dimensions into urban twins and identifies data and validation gaps. A modelling-methods paper requires renewed justification when changing a model's purpose. [Social twins review](https://www.mdpi.com/2624-6511/8/1/23), [modelling purposes](https://www.jasss.org/22/3/6.html). **Assumed.** A synthetic HF town should be called a simulation. Calling it a twin would need an identified real counterpart, continuing observations and explicit validation targets.

### Personas: profiles and observed choices

**Confirmed.** EA describes authored aspirations, interests and traits. HF documents traits and values alongside state changed by experience, relationships, upbringing and optional slow character change. [The Sims introduction](https://www.ea.com/games/the-sims/the-sims-4/how-to-play-the-sims), [HF architecture](https://github.com/adam0white/human-framework/blob/main/docs/framework.md).

**Assumed.** A persona should be an initial profile, not a script that forces matching acts. A cautious caregiver may take a risk for a child. A curious person may stop exploring when exhausted. Evaluate both stable differences between people and changes within the same person across settings. Repeated identical choices would be a poor definition of consistency. Simulated playtest personas could expose usability failures, but their preferences would remain model outputs rather than evidence of human enjoyment.

### What HF could distinctly contribute

**Confirmed — local architecture.** HF documents seeded replay, labelled decision terms, no LLM in the actor loop, and perception through attended evidence. It separates world outcomes from persons' understanding. [Architecture](https://github.com/adam0white/human-framework/blob/main/docs/framework.md).

**Assumed.** The opportunity is their combination in a reusable person model. None is individually unique. Deterministic replay supports debugging; it does not establish accuracy. A decision trace explains the implemented score; it does not prove a human reason. Partial sight fails if a host accidentally supplies hidden facts. These are contracts to test, not marketing claims.

## B. Utopic ideas, without a feasibility requirement

**Assumed — imagined destination.** HF could model humanity from small mobile groups to connected societies. Every institution would consist of people teaching, complying, resisting, caring and forgetting. Every material practice would require resources, learned procedures and transmission. A history could be explored from an individual morning to centuries of migration without inventing a different past at each scale.

**Assumed — what this would require.** Give the model ecology, climate, disease, demography, kinship, production, transport, power, institutions, language, cultural learning and invention. Let institutions reshape people as people reshape institutions. Permit concepts and available actions to change historically. Preserve disagreement about reality. Let archives lose evidence and historians within the world argue about the same events.

**Assumed — subjective history.** Offer three accounts: what happened, what each participant believed, and what descendants can reconstruct. A successful trade route might leave no surviving explanation. A false accusation might persist longer than the evidence against it. The player could inhabit one descendant, discover a family account and later learn that it was wrong.

**Confirmed — fiction only.** Asimov's Foundation imagines psychohistory forecasting the fate of an empire. This is a literary precedent, not a demonstrated scientific capacity. [Publisher description](https://www.penguinrandomhouse.com/books/711800/foundation-3-book-bundle-by-isaac-asimov/9780593500620/).

**Assumed — what HF would get wrong.** Its action vocabulary would exclude acts designers never imagined. Modern psychological assumptions could be projected onto distant societies. Recorded states could dominate training while poorly documented lives disappear. Calibration could reward the same aggregate result from incompatible mechanisms. Innovation, interpretation and rare events could overwhelm a fitted trajectory. People reacting to a published prediction could change its conditions. Exact replay would preserve those errors perfectly.

**Assumed — desired prediction.** Ask for distributions over possible histories under declared premises. Allow several incompatible models to survive. Let a forecast say what observation would falsify it. Reserve a stronger aspiration for the utopia: a model that invents genuinely new practices, explains its own limits and learns when its categories no longer fit.

**Assumed — intermediate toy histories, independent of implementation cost:**

| Toy history | Question | Evidence worth retaining |
|---|---|---|
| A village over 40 generations | Can cooperation, care and dissent survive changes in households, resources and authority? | Every birth and death; inherited resources; learned practices; broken agreements; migration; extinction, including failed runs. |
| The spread of one practice | Does adoption depend on usefulness, testimony, imitation, prestige or coercion? | Who encountered which version; why they adopted or refused; what happened; how transmission altered it. |
| One trade route | Can local exchanges create a route, sustain trust and later fail? | Stocks, travel, promises, losses, prices, information delays and competing explanations for collapse. |

## C. Concrete proposals for HF

**Assumed — all proposals below.** These are candidates for owner selection. Horizons follow the requested roadmap: H1 through 2026-11-30; H2 through 2027-02-28; H3 long bets. Keep world mechanics in hosts. Make no new claim of scientific validity from passing a game control.

| What | Why | Horizon | First cheap experiment |
|---|---|---|---|
| **One event, three readings.** Render witness evidence, remembered testimony and developer truth separately. | Tests the connection between partial sight and subjective UI. | H1: Word and witness integration; Why, in words. | Four residents, one broken promise, one hidden witness. Ask players who knows what. Fail if a hidden witness changes an unaware person's belief or the UI reveals private truth. |
| **A continuing clock while reading.** Add a host-only slow speed with logged simulation-time inputs. | Tests tactical slowdown without changing cognition. | H1 host/game probe; no new faculty. | Replay one five-minute dispute at normal speed, slowdown and pause. Compare comprehension, perceived urgency and input burden. Verify identical state for identical timestamped inputs. |
| **Social practices that offer rather than order.** A host supplies roles, requests and promises. | Versu suggests a small route to coordination with refusal. | H3 speech acts; a host probe can precede it. | Three people repair one object. One person refuses. Compare voluntary cooperation with imposed participation. Record whether another plan forms and which agreement fails. |
| **An explanation with an information boundary.** Keep full terms for developers and evidence-limited lines for players. | Makes reasons readable without revealing minds. | H1 narration; H3 Fork the day. | Fork one refusal after changing fatigue or source trust. Check that the internal trace identifies the changed mechanism and the player line discloses only warranted signs or speech. |
| **Personas across settings.** Reuse authored profiles while changing circumstances. | Tests whether individual differences survive without scripted choices. | H2 replication gate and inner life. | Four profiles face the same request, rested and exhausted, alone and responsible for a dependent. Keep offers identical within each setting. Compare choices and reasons across ten seeds; remove trait differences as a control. |
| **A declared scale contract.** State what coarse stepping preserves. | Prevents scale from silently deleting private knowledge or duties. | H1 benchmark → H2 Many lives. | Run 100 people for 30 days, then 1,000 if affordable. Compare fine and coarse stepping. Measure runtime and memory. Require exact preservation of named events; predeclare tolerances for aggregates. |
| **One practice with competing transmission rules.** Track exposure, teaching and outcomes. | Makes cultural persistence a testable mechanism. | H2 culture candidate → H3 Traditions that travel. | Twenty adults, two practices, ten seeds. Compare exposure-only, utility-only and combined rules. Remove one teacher. Retain null results. |
| **A toy-history ladder.** Start with one trade route; extend to three generations before forty. | Connects person-scale causes to aggregate history with bounded scope. | H3 ant farm and traditions. | Three hamlets, two goods, delayed information, no narrative director. Compare HF against a simple trader baseline. Preselect route survival, shortage and promise completion; inspect failures before adding faculties. |

**Assumed — priority.** Start with one event and three readings. Then test scale and one practice. These would make the larger historical ambition easier to evaluate without requiring a larger world first.

