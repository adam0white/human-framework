# An optional language add-on for HF

Research date: 2026-10-21. Scope: language around a simulated person, plus a separately confirmed input translator. No implementation or inference experiments were run.

**Evidence labels.** **Confirmed** means the linked source was read today. It confirms what the source says, not that a vendor promise or research result generalizes. **Assumed** marks inference, uncertainty, design choices and proposed thresholds. Every recommendation below is assumed until tested. Repository links name files read locally today; they do not certify the remote branch matches this checkout.

## A. Prior art and relevant, buildable ideas

### The boundary worth keeping

**Confirmed.** HF's roadmap says: “No LLM in the loop, including narration that feeds back into state. An LLM may render traces downstream.” Its architecture separates deterministic decisions from host outcomes. The roadmap places narration variety in Horizon 1, the narration batch at 2.15, and a fuller closed speech-act grammar in Horizon 3. These are roadmap positions, not new authorizations. [Roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md), [architecture](https://github.com/adam0white/human-framework/blob/main/docs/framework.md).

**Assumed recommendation.** Build `@adam0white/human-framework-voice` as optional presentation software. HF decides what happened, what someone knows and what they chose to say. The add-on proposes wording. A fluent sentence must never establish a new promise, memory, fact or outcome.

### Prior art: borrow one mechanism at a time

In this table, the source column is **confirmed** at the stated evidence level. The HF lesson column is **assumed**.

| Prior art | Source seen today | HF lesson |
|---|---|---|
| AI Dungeon | Its help describes Do input as an action whose outcome the AI generates. [Official help](https://help.aidungeon.com/the-do-mode) | Borrow accessible free text. Keep outcome resolution in HF and the host. |
| Hidden Door | Its company page describes canon management. Its October 19, 2026 architecture post separates fast replies from slow planning and withholds secrets from the fast writer. These are vendor descriptions; its main site blocked retrieval. [Company page](https://www.linkedin.com/company/hiddendoor/), [architecture post](https://www.linkedin.com/pulse/keeping-story-quality-high-latency-low-thoughtful-architecture-md2uc) | Separate immediate interaction from background prose. Withhold hidden facts instead of asking the writer to conceal them. |
| Inworld | Its own announcement describes contextual intents, activation conditions, scripted lines and long-term memory. [Vendor announcement](https://www.linkedin.com/posts/inworld-ai_our-improved-character-engine-activity-7087134002511282177-TDE4) | Borrow explicit conversational constraints. Avoid duplicating HF memory in a second character engine. |
| Convai | Its documentation separates narrative sections, decisions and application triggers. It also offers actions that affect an environment. [Narrative guide](https://docs.convai.com/api-docs/convai-playground/character-customization/narrative-design), [Action API](https://docs.convai.com/api-docs/api-reference/core-api-reference/character-crafting-apis/action-api) | Use an allowlisted act vocabulary. Do not give the voice renderer an action API. |
| Character.ai | Scenes supplies context and roles for short character-driven role-play. [Official announcement](https://blog.character.ai/introducing-scenes-your-new-way-to-tell-stories-on-c-ai/) | Give each utterance a small scene packet. Avoid sending a whole life history. |
| Ubisoft NEO NPC | Ubisoft described a prototype using Inworld's LLM and NVIDIA Audio2Face, with writers shaping NPCs. [Ubisoft](https://news.ubisoft.com/en-ca/article/5qXdxhshJBXoanFZApdG3L) | Author voice constraints. Treat a prototype as evidence of an interaction, not a proven simulation. |
| Suck Up! | Its site describes charming and disguising oneself among AI townsfolk, plus customizable personalities. [Official site](https://www.playsuckup.com/) | Test persuasion against refusal. Clever wording must not override an HF veto. |
| Vaudeville | Its developer storefront describes a detective game with real-time generated dialogue. Its publisher FAQ says characters reply from supplied scripts. [Steam](https://store.steampowered.com/app/2240920/Vaudeville/), [publisher FAQ](https://store.epicgames.com/en-US/p/vaudeville-faq-dd3e5b) | Try one bounded witness interview, with every permitted claim listed. |
| 1001 Nights | The 2025 paper describes a king with preferences; players induce weapon words that become equipment. [Authors' paper](https://arxiv.org/abs/2503.09102) | Borrow constrained conversational play. Generated words becoming objects would cross HF's present boundary. |
| Infinite Craft | The official page exposes items, discoveries and a combination canvas. Its backend is not documented there. [Official game](https://neal.fun/infinite-craft/) | Assumed backend: AI-produced combinations and caching. Borrow memoized discovery as an idea, not a verified architecture. Never infer physical laws from word combinations. |
| Generative Agents | The 2023 paper describes 25 agents with language memories, reflection and planning. [Paper](https://arxiv.org/abs/2304.03442) | Borrow selective retrieval and situated dialogue. Its LLM decision loop is outside this proposal. |
| Voyager | The project describes a Minecraft agent with an automatic curriculum, executable skill library and feedback-driven code revision. [Authors' project](https://voyager.minedojo.org/) | Borrow reusable, inspectable descriptions of learned methods. Generated executable policies are outside the voice package. |

### What game-master research contributes

**Confirmed.** CALYPSO (2023) supports human dungeon masters with scenario-specific information and inspiration. It does not establish that an autonomous narrator can enforce all rules. [Paper](https://arxiv.org/abs/2308.07540).

**Confirmed.** *Player-Driven Emergence* (2024) studied 28 gamers in a fixed-premise mystery with GPT-4 NPCs. The authors report player-discovered narrative developments. Their analysis also used GPT-4 to construct narrative graphs. [Paper](https://arxiv.org/abs/2404.17027). **Assumed lesson:** unexpected conversation may be enjoyable without constituting valid world change.

**Confirmed.** *Game Master LLM* (2025) describes a GPT-4o game master for task-based slang learning. [Paper](https://arxiv.org/abs/2511.15504). **Assumed lesson:** narrow conversational objectives are a better initial experiment than unrestricted game mastering.

**Confirmed.** *Orchestrated Reality* (June 2026) proposes canonical JSON state and validated deltas, while leaving its planned human study as future work. *CriticaLLM* (October 2026) reports an autonomous game master and evaluation with players across four models. These are authors' reports, not independently replicated findings here. [Orchestrated Reality](https://arxiv.org/abs/2606.16014), [CriticaLLM](https://arxiv.org/abs/2610.21525).

**Assumed recommendation.** HF can use canonical evidence and constrained language without adopting LLM-authored transitions. Call its first game-master mode an observer: it reports completed events and summarizes a session. It cannot spawn danger, choose NPC acts or steer the simulation toward drama.

### Which model does which job?

**Confirmed.** Clef returns probabilities over declared options. Clairic returns typed extracted or estimated values, including text spans with offsets. Neither is a dialogue writer. [Clef](https://developers.cloudflare.com/workers-ai/models/clef/), [Clairic](https://developers.cloudflare.com/workers-ai/models/clairic/).

**Confirmed, repository report only.** The inbox trial reports 67% category accuracy on 36 correlated statements from 11 owner notes. It adopted Clef as a human-checked suggestion. The earlier triage bake-off reports Qwen leading the small LLM arms on classification; several models varied on rerun at temperature zero. These are small, task-specific results. They do not measure dialogue quality or speech-act accuracy. [Inbox trial](https://github.com/adam0white/human-framework/blob/main/docs/lab/experiments/clef-inbox-2026-10-20.md), [bake-off](https://github.com/adam0white/human-framework/blob/main/docs/lab/experiments/clairic-triage-2026-10-20.md).

**Confirmed prices, USD per million tokens.** Exact model suffixes matter. The following rates were read today. Listing a price does not verify a successful inference call. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

| Workers AI model suffix after `@cf/` | Input | Output |
|---|---:|---:|
| `meta/llama-3.2-1b-instruct` | $0.027 | $0.201 |
| `meta/llama-3.2-3b-instruct` | $0.051 | $0.335 |
| `meta/llama-3.1-8b-instruct-fp8-fast` | $0.045 | $0.384 |
| `qwen/qwen3-30b-a3b-fp8` | $0.0509 | $0.335 |
| `google/gemma-4-26b-a4b-it` | $0.10 | $0.30 |
| `cloudflare/clef` | $0.24 | No output charge |
| `cloudflare/clairic` | $0.10 | No output charge |

**Confirmed.** Qwen's model page gives the more precise input rate above; Gemma's page supplies its rate. These names denote larger mixture-of-experts models, not ordinary 3B or 4B total-weight downloads. [Qwen](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [Gemma](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/).

**Confirmed.** Cloudflare's deprecation notice names Phi-2, Gemma 3 12B and several older Llama variants as deprecated on May 30, 2026. Old pricing and catalog entries still exist. Do not choose those entries from an old tutorial. [Notice](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/).

**Confirmed.** Small alternatives have publisher cards: Gemma 3 1B, Qwen3 0.6B and Phi-4-mini. WebLLM documents browser inference through WebGPU, model-family support, JSON mode and worker support. This does not confirm every named checkpoint has a ready WebLLM build. [Gemma](https://huggingface.co/google/gemma-3-1b-it), [Qwen](https://huggingface.co/Qwen/Qwen3-0.6B), [Phi](https://huggingface.co/microsoft/Phi-4-mini-instruct), [WebLLM](https://webllm.mlc.ai/).

**Assumed recommendation.** Compare Llama 3.2 3B, Qwen3 30B-A3B and templates first. Try one browser model later. Local inference avoids per-call provider charges, but downloads, GPU memory, battery, startup and device compatibility still need measurement. No phone latency is established here.

### Package design: read evidence, return text

Everything in this design is **assumed**, including the API names.

Use a host-created, immutable `VoicePacket`, not a mutable `Person`. It contains an event ID, viewpoint, locale, authored voice profile, allowed factual clauses, decided speech act, mandatory semantic clauses and fallback text. A renderer returns `{text, evidenceIds, status}`. It receives no tools or HF mutators.

**Confirmed interface detail.** `DecisionRecord` includes chosen action, considered options, intention and narration. `decidedBy` belongs to `SuggestionResolution`, not every decision. It identifies inertia or a separating score term in eligible cases. Promptings and chronicle have separate readers. [Types](https://github.com/adam0white/human-framework/blob/main/packages/human/src/types.ts), [architecture](https://github.com/adam0white/human-framework/blob/main/docs/framework.md).

**Assumed design.** An adapter selects permitted evidence from those records. It must not send private intentions, hidden scores, spiritual lenses or unseen chronicle events to an ordinary player narrator. A debug explanation may have different permissions. Never turn a score explanation into a claim that the person consciously knows the whole cause.

| Mode, all assumed | Permitted output | Required limit |
|---|---|---|
| Person's voice | Shorter, warmer or more reserved phrasing | Preserve refusal, uncertainty, target and conditions. Author style independently of faith or ethnicity. |
| Observer narration | A subjective account of visible completed events | No invented motives, observations or future outcomes. |
| Conversation | Wording for HF's already selected testimony, advice or refusal | The semantic act and propositions remain canonical; NPC listeners receive those, never generated prose. |
| Chronicle | A recap of disclosed events | Attach event references. Label beliefs as beliefs. |

**Assumed safety design.** Start with controlled clauses and generated optional connective wording. Keep commitment-bearing clauses verbatim. Full paraphrase belongs in an experiment: JSON validation cannot establish semantic equivalence. A generated promise can change a player's expectations even when it changes no engine state. Reject uncertainty, polarity or deadline changes; otherwise show canonical text until the mode earns trust. An LLM judge can flag examples but cannot certify correctness.

**Confirmed.** Workers AI documents JSON/schema output, model-specific support and failures; it explicitly says schema compliance is not guaranteed and JSON Mode does not support streaming. [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/). **Assumed design:** validate locally, reject unknown keys, IDs and excess text, and fall back immediately. Check support on the exact endpoint during the experiment.

### Free-text input needs a separate boundary

**Assumed proposal.** Keep `voice` output-only. Put parsing in a separate optional `input` entry point. It returns candidates, never calls HF. Clef could rank listed acts; Clairic could extract explicitly named targets or times; an LLM could propose a typed combination. Benchmark them separately before composing them.

**Assumed flow:** player text → candidate legal acts → deterministic validation → visible confirmation → host revalidation → HF resolution. “Could you bring water after supper?” becomes “Ask Leyla to carry water after supper,” not “Leyla promises.” Show exact target, act, timing and pressure. Require an explicit click. Keep menu input available. Reject stale candidates when the scene changes. Ambiguity gets alternatives or no match.

**Confirmed.** A full ask/offer/promise/refuse/warn/confide/praise/blame/lie grammar is a Horizon 3 bet; the existing conversation API covers testimony and advice. [Roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md). **Assumed limit:** the first translator exposes only acts already executable by its host. Confirmation makes the player's choice explicit; it does not authorize implementing the missing grammar or making NPCs obey.

### Cost, latency, replay and content

All operating limits below are **assumed proposals**.

At 800 input and 80 total billed output tokens, including reasoning, 1,000 uncached rewrites cost about $0.068 for Llama 3B, $0.068 for Qwen, or $0.104 for Gemma. These are arithmetic estimates from the cited rates, not bills. They exclude hosting, storage, retries and other calls.

Set a $0.25 experiment cap and a $0.01 session cap. Reserve worst-case request cost before dispatch. Count retries, failures, classifier calls and reasoning tokens. Test each endpoint's output limit and usage accounting before relying on this cap. Use a shared atomic budget for concurrent remote requests; a browser counter cannot enforce an account-wide cap. Do not assume earlier experimental funds remain unspent. A public inference endpoint also needs a new infrastructure decision: the current exception covers lab telemetry only. [Confirmed repository boundary: AGENTS.md](https://github.com/adam0white/human-framework/blob/main/AGENTS.md).

Use one request at a time per session, at most 100 output tokens and a proposed 1.5-second deadline. Show canonical text immediately. A timely rewrite may replace it only while its event remains current. Log both display events. Never delay an HF tick for language. Slowdown follows the host's ordinary player control, not model readiness. Discard late responses rather than moving old dialogue onto a changed scene. Record p50/p95 completion latency, timeouts and fallback rate; historical classification latency is not a dialogue benchmark.

Cache complete accepted outputs using canonical packet hash, viewpoint, language, voice version, model ID, generation settings and policy version. Keep this distinct from provider prefix caching, which reuses prompt computation rather than guaranteeing the same answer. [Confirmed prefix-cache behavior](https://developers.cloudflare.com/workers-ai/features/prompt-caching/).

Store every display event, its exact text and display tick, canonical act, source-event IDs, generation metadata and fallback status in the replay sidecar. Store confirmed input acts in the input log. Replay makes no model calls. Missing generations use a declared fallback; never silently regenerate. Engine hashes exclude presentation records. The same seed alone does not reproduce wording. Player choices may differ when wording differs; evaluate that as an interface effect.

Treat player prose as hostile data. Give the model no secrets, execution tools or state-writing capability. Escape output as text. Bound length and use authored age-appropriate exclusions. Do not generate religious rulings, revelation, divine speech, unseen causes, acceptance, forgiveness or claims about the ruh. Route faith-related wording to sourced, authored templates. Even a recorded prompting is a person's held reading; never elaborate its unknown origin. Do not send qalb, nafs, fitra or ʿaql lenses for scoring. [Confirmed foundation for these limits](https://github.com/adam0white/human-framework/blob/main/AGENTS.md).

## B. Utopic ideas, unlinked from feasibility

Everything in this part is **assumed speculation**. No cost, schedule or technical readiness is implied.

**A history heard through its inhabitants.** A simulated century has household diaries, council minutes, songs, arguments and accounts from displaced people. The same event has incompatible descriptions. Every factual clause points to an event or a person's belief. The player can hear a society without gaining an omniscient view.

**Languages with histories.** A family develops phrases from shared work and loss. Migrants carry expressions between communities. Children reinterpret them. Language makes the simulated culture legible while the simulation owns what actually spreads. A future cultural model would need explicit rules; the renderer could not invent cultural change into existence.

**A conversational window into any scale.** Ask one resident about a shortage, then read a town account, then inspect centuries of trade. Each answer declares its viewpoint, evidence and uncertainty. A generated historian can argue an interpretation without rewriting the underlying events.

**A modelled history of humanity.** Imagine ensembles of worlds with different starting conditions, institutions and learned practices. Read ordinary lives inside each outcome. Language makes those worlds explorable. It does not prove their predictions. Calling a world predictive would require independent observations, held-out comparisons and explicit failures. Richer narration alone could make a wrong model more persuasive.

## C. Concrete proposals for HF

All proposals and pass thresholds are **assumed**. They do not start a new roadmap goal.

| What | Why | Roadmap horizon | First cheap experiment |
|---|---|---|---|
| Output-only `human-framework-voice`, initially templates plus optional rewrites | Test whether style improves reading while preserving agency | H1, alongside “Why, in words”; optional package, not a faculty | Render 30 fixed decisions with templates, Llama 3B and Qwen. Blind-pair preference and meaning checks. Reject any changed refusal, promise or hidden-fact leak. Cap $0.25. |
| Observer-only session recap | Make consequences readable without a director changing them | H1 narration; H2 many-lives summaries later | Recap one recorded day in 150 words. Check every clause against permitted event IDs. Any unsupported event fails. |
| Confirmed free-text translator | Let players phrase a request naturally while keeping choice explicit | H3 speech acts; earlier host-only probe limited to existing acts | Hand-label 40 inputs, including Turkish, ambiguity and injection. Compare menu baseline, Clef and one LLM. Measure exact act/target/timing accuracy, abstentions and correction effort. No automatic submissions. |
| Replay and failure control | Make optional inference removable and auditable | H1 package acceptance | Replay identical fixed inputs with model off, cache hits, timeouts and malicious replies. Require identical engine hashes and faithful logged display sequences. |
| One WebLLM voice trial | Test offline presentation within the static-game direction | H2 tooling candidate; no scheduled release | Confirm a supported small checkpoint. Measure download, startup, memory and rewrite latency on one desktop and one actual phone. Stop if ordinary play stalls. |
| Event-linked historical accounts | Explore the owner's long direction without presenting prose as prediction | H3 long bet | Give three witnesses different evidence about one dispute. Generate three accounts. Check knowledge boundaries and whether readers understand the disagreement. |

**Assumed priority:** try output-only voice and the replay control together. Keep templates as the baseline. Advance only if people prefer the wording and it preserves the decided meaning. Let the owner judge that result before adding conversational input or a public service.
