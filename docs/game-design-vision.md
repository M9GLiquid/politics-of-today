# Game design vision — consolidated notes

This document captures high-level design direction for *Politics of Today*: policy model, player loop, **goals** (individual, nation, world), news and events, chat, voting rules, and a **running continuation** (§10–§11) for the next waves of notes.

---

## 1. Policies and categories (shift from party-authored slates)

Instead of parties generating their own full policy programs, the game offers an **assortment of policies per category** to choose from.

- Each **policy** is scoped to **impact one part of the nation** (a sector, budget line, or similar lever—not a vague “everything” effect).
- Policies we author should have **clear pros and cons in plain language**, but **not** heavy ideological labels. Example: don’t say “favors oligarchs”; say something like **“lower tax on high earners”** and let players infer downstream effects.
- **Each year** can introduce **new categories, new policies, or other content** so the game does not freeze in one meta.

---

## 2. Player loop: bets, companies, and “game of life”

Individuals **bet, start companies, and take positions** that are then affected **for better or worse** by the policies in play—similar to real life where rule changes shift who wins and loses.

- A player might **vote for policies that benefit them right now** (self-interested voting).
- Or they **vote for policies they believe are better for the nation**; nation-building **also** benefits the player, but in **more indirect, slower, less obvious** ways.

This tension is intentionally a **“game of life”** loop: short-term personal gain vs longer-term collective outcomes.

### Venture types: single-sector vs multi-sector

Ventures are not all the same shape:

- **Sector-based ventures** (e.g. a **clinic** in health) are **tied primarily to one national sector**. Policy and funding in that sector hit them **directly**—strong upside when aligned, sharp downside when that sector is neglected or punished.
- **Multi-sector ventures** span **more than one sector** (e.g. a business that depends on energy, logistics, and labor rules). They use **different multipliers** than pure single-sector plays: they may be **smoother** when only one sector wobbles (diversification) or **more volatile** when several levers move at once—design TBD, but the rule is **explicit multipliers per venture archetype**, not one-size-fits-all.

**All venture types are driven by policy:** national (and any relevant party) outcomes change sector conditions, which flow into venture performance through those multipliers.

### Two paths to wealth

An individual can become **rich** through **either** (or both) of these playstyles:

1. **Betting the “market”** — take positions, start ventures, and time or hedge against **how policies and events will move sector conditions**, without necessarily trying to change the law. You read the nation and the world; you profit when you’re right.
2. **Influencing the nation** — organize, vote, party-build, and persuade so that **the policies that pass** are the ones that **help your bets and businesses**. Power becomes a path to wealth: you shape the rules, then the rules pay you.

The game should make both fantasies legible: **speculator** vs **kingmaker**, often overlapping in practice.

### Example (health / clinic)

- A player **starts a clinic** (a health-sector venture).
- If **funding and policy lean toward health**, the company can become **more valuable**.
- If **health is defunded or policies turn hostile**, the venture may **fail or go bankrupt**.
- A **bailout** (or similar) could then **increase tax burden** or otherwise **shift cost to the nation**—linking individual outcomes to national fiscal pressure.

---

## 3. Goals: individual, nation, and world

The loop in §2 naturally splits into **layers of goals**. Players should always see **which layer** they are optimizing—personal, national, or planetary—and how those layers can **align or clash**.

### Individual goals

- **What they are:** outcomes tied to **one player**—wealth, venture valuation, bets paying off, milestones (first profitable clinic, market calls, etc.).
- **How they connect:** they map directly to **betting the market** and **influencing the nation** (§2). Selfish votes and risky ventures are often rational **here**.
- **UX:** surfaced in profiles, dashboards, or achievements so “how am *I* doing?” is always clear.

### Nation goals

- **What they are:** **collective** targets for a **single nation**—e.g. fiscal health, sector balance, reducing a crisis metric (homelessness, unemployment spike), or winning a national ranking vs other nations.
- **How they connect:** national policy choices and **events** (§5) move these meters. **Nation News** (§4) should report progress and failure in narrative form.
- **Tension with individual goals:** what helps **your** portfolio this month may **hurt** national stability—or the reverse (nation-building pays you slowly). That’s the core drama.

### World goals (year-end, cooperative season extension)

At **the end of each in-game year** (or equivalent season boundary), the **whole world** can face **one shared objective**. If players and nations **collectively succeed**, the **current season is extended**—for example by **three months** of real or in-game time (exact clock TBD). If they **fail**, the year ends on schedule and the next season begins without that bonus.

**Refined design (how it should feel):**

1. **Single focus per year** — The world is not solving ten problems at once. One **theme** is highlighted (e.g. **climate / environment**, pandemic preparedness, trade stability). That theme is **legible in World News** well before the deadline.
2. **Measured by policy reality, not vibes** — Success is judged from **game state**: e.g. a **global environmental index** built from **what is actually in effect** across nations (strength of environmental laws, funding levels, penalties for polluting sectors—whatever we encode). “Everyone tried” isn’t enough; **the world’s combined rules** must cross a **clear threshold**.
3. **Nations contribute differently** — Large economies might move the needle more; small nations might still **punch above weight** with aggressive policy. The formula should be **transparent** so players can argue in World chat: “We need two more nations above tier X.”
4. **Cooperation vs self-interest** — A nation might **free-ride** (weak env policy, cheap growth) while hoping others carry the world goal—or **lead** and pay short-term costs for the **season extension** everyone wants. That mirrors real global coordination problems.
5. **Reward** — Meeting the threshold **extends the season** (e.g. **+3 months**) so content cadence (votes, events, new policies) **continues** in the same meta instead of resetting immediately. Optional: partial credit (smaller extension) if we want softer failure—design choice.

**Example (global warming):**

- Year-end **World goal:** “Stabilize the climate track.”
- **Rule:** The world’s **aggregate environmental policy score** (derived from active national policies in environment-related categories) must reach **≥ N** by the deadline.
- **Success:** Season **+3 months**; World News runs a positive headline arc.
- **Failure:** No extension; next year might pick a **different** world goal so the meta rotates.

World goals are **optional pressure**, not a replacement for individual or nation goals—they’re the third layer that says: *sometimes everyone needs to row the same direction or we all lose time.*

### Leaderboards (cross-layer competition)

To make progression and status clear, the game includes public leaderboards for parties, players, and nations.

- **Party leaderboard:** ranked by **total accepted policies** (descending). The party with the most accepted policies is **Top 1**.
- **Player leaderboard:** ranked by **current personal wealth** (descending). The richest player is **Top 1**.
- **Nation leaderboard:** ranked by **accumulative nation wealth** (descending). The nation with the highest cumulative wealth is **Top 1**.

Design notes:

- Use deterministic tie-breakers (for example: earlier achievement timestamp, then stable ID) so rank order is always stable.
- Clearly label the metric near each leaderboard title so players know exactly what “winning” means in each board.

---

## 4. World News and Nation News

### World News (main room)

A **World News** feed/room reports what the **world as a whole** experiences: **events** and **plain news** that every player sees in a shared global context.

### Nation News

**Nation News** does the same style of reporting but **scoped to a specific nation**—outcomes, headlines, and pressures that make sense **for that country’s situation**.

---

## 5. Events (global schedule, unequal national effects)

- **Events** occur on a **regular basis** and on a **shared schedule for all nations** (everyone experiences the “same moment” in global time).
- **Effects are not copy-pasted**: the same event can **land differently** per nation depending on **policies, economy, and social outcomes** already in play.
- Example: one nation may show **a lot of homelessness** after a shock or policy path, while another **does not**—same world event, **different national stories and numbers**.

---

## 6. Forum (simple, live, channel-based)

We want a **forum for people to talk**: **simple** and **live** (real-time feel), organized by **channels**:


| Channel    | Purpose                                                      |
| ---------- | ------------------------------------------------------------ |
| **World**  | Global discussion, aligned with world-scale news and events. |
| **Nation** | Discussion for people tied to a nation.                      |
| **Party**  | Discussion inside a party context.                           |


Implementation details (tech stack, moderation, history retention) are TBD; the design intent is **lightweight live chat** with **clear channel boundaries**.

---

## 7. Parties and membership

- A party can have an **unlimited number of members** (no hard cap on membership count).

---

## 8. Voting rules (summary)


| What is being voted on                                             | Who may vote                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Any party** (national / public party choice)                     | **Anyone** (eligible voter per game rules).                                                                |
| **Any policy for the nation** (national policy layer)              | **Anyone** (eligible voter per game rules).                                                                |
| **Policy inside the party** (party-internal drafts / party policy) | **Only members of that party** — **all member ranks** can participate (not restricted to leadership only). |


National vs party scopes should stay explicit in UI and rules so players never confuse “nation law” votes with “our party platform” votes.

---

## 9. Open design questions (for later)

- Exact **cadence** of events vs news vs votes (weekly tick, monthly, in-game “year,” etc.).
- How **bailouts**, **bankruptcy**, and **company valuation** tie into existing **national economy / ledger** systems.
- **Moderation** for World / Nation / Party channels (reports, slow mode, admin tools).
- Whether **guests** read news/chat or must be registered.
- **Tuning** single-sector vs multi-sector **multipliers** (risk/reward, diversification rules) so both venture types feel distinct and fair.
- **World goal** math: exact **thresholds**, **weighting per nation**, **partial credit**, and whether **+3 months** is real-time, in-game, or both.
- How **individual / nation / world goals** appear in UI (one screen vs tabs vs news-led prompts).

---

## 10. Continued notes — systems to specify next

This section **extends the same notes list**: topics we implied earlier but have not fully designed. Use it as a **backlog for the next writing passes** (and eventually for implementation specs).

### 10.1 Ventures (companies) as first-class entities

- **Create / wind down:** rules for founding a venture (cost, cooldown, max count per player—if any).
- **Sector tags:** each venture declares **primary sector** (single-sector) or **multiple sectors** with **weights** (multi-sector multipliers).
- **Valuation:** how often it updates (per tick, per vote resolution, on events); what inputs (sector indices, national GDP slice, randomness).
- **Bankruptcy:** triggers (cash runway, policy shock thresholds); what happens to the player (debt, cooldown, forced sale).
- **Bailouts:** when the **nation** pays (automatic vs vote); how that hits **national ledger / taxes** (see §9 open questions).

### 10.2 Betting the “market” (distinct from ventures?)

- Clarify whether **bets** are **separate instruments** (prediction contracts, “will health funding rise?”) or **only** expressed through **ventures and inventory**.
- If separate: **liquidity**, **counterparty** (house vs player vs pool), **resolution** tied to **observable game state** at a deadline.
- **Influencing the nation** should still **move the same underlying meters** bets resolve against—one simulation, two playstyles.

### 10.3 News pipeline (World and Nation)

- **Sources:** templated lines filled from **simulation state** vs occasional **hand-authored** beats for major seasons.
- **Ordering:** chronological feed; **pin** world goal progress; **highlight** nation-critical crises.
- **Tone:** neutral wire-service style vs satirical—product decision.
- **Link-out:** news items might deep-link to **relevant votes**, **sector charts**, or **World goal** meter.

### 10.4 Events engine (pairs with §5)

- **Catalog:** event types (shock, opportunity, scandal, natural) with **base effects** and **per-nation scaling rules** (policy modifiers, vulnerability tags).
- **Scheduling:** fixed calendar slots vs weighted random; **visibility** (preview in World News?).
- **Interaction with world goal:** some events could **help or hurt** the global meter (e.g. climate disaster reduces slack).

### 10.5 Forum (beyond §6)

- **Party channels:** visible only to **that party’s members**, or public read / member write?
- **History:** how long messages persist; search; **quotes** vs flat live stream.
- **Cross-posting:** whether Nation and World are separate rooms only, or **threads** with tags.

### 10.6 Policy catalog transition (product note)

- Current product direction includes **party-authored drafts**; long-term vision (§1) is **curated national policy assortment**. Document a **migration story**: e.g. parties become **coalition / advocacy** layers while **national ballots** pull from the global catalog—**TBD**, avoid breaking social features abruptly.

---

## 11. Running checklist (documented vs next)

| Topic                         | Status in this doc                          | Next step                          |
| ----------------------------- | ------------------------------------------- | ---------------------------------- |
| National policy catalog       | §1 sketched                                 | Category list + policy card schema |
| Ventures + multipliers        | §2 sketched                                 | §10.1 spec + numbers               |
| Wealth paths                  | §2                                          | Align with economy model           |
| Individual / nation / world goals | §3                                    | UI mock + meters                   |
| World goal + season extension | §3                                          | §10.4 + exact clock                |
| World / Nation news           | §4                                          | §10.3 pipeline                     |
| Global events                 | §5                                          | §10.4 catalog                      |
| Live forum                    | §6                                          | §10.5 + tech choice                |
| Leaderboards (party/player/nation) | §3                                    | Define update cadence + tie-break UX |
| Party size                    | §7                                          | Done for v1                        |
| Voting scopes                 | §8                                          | Copy + UI badges                   |
| Admin / moderation            | Not in vision doc (implemented in app)      | Link to eng doc if needed          |

---

*Last updated — §10–§11 continue the shared notes list; add new rows to §11 as topics firm up.*