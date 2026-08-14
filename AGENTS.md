# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. Read this
before making changes — it explains what the project is, how it is wired together,
the conventions to follow, and the non-obvious gotchas that are easy to break.

## What this is

**DDO Quest Tracker** is a single-page web app for tracking completed *Dungeons &
Dragons Online* (DDO) quests. A player marks quests as completed at a chosen
difficulty; the app then computes favour earned, patron-by-patron favour progress,
account-wide favour reward unlocks, and saga completion. All data lives on the
player's own device — there is no backend or server.

It is deployed as a static site (a sub-tool of `ddotools.xyz`) and there is a
companion DungeonHelper plugin (separate repo:
`https://github.com/Kiytan/DDOQT-DHPlugin`) that can push completions into the app
via a URL hash + auto-sync.

## Tech stack

- **Framework**: Svelte 5 + SvelteKit 2
- **Language**: TypeScript (strict)
- **Build tool**: Vite 7
- **Adapter**: `@sveltejs/adapter-static` — output is fully static, prerendered, **client-side only** (`ssr = false`, `prerender = true` in [src/routes/+layout.js](src/routes/+layout.js))
- **State**: Svelte stores (`writable`/`derived`), no external state library
- **Persistence**: `localStorage` (primary) + URL hash (import/export/sharing)
- **Compression**: `lz-string` for the shareable URL hash
- **Styling**: component-scoped CSS, dark theme, gold (`#d4af37`) accent throughout. No CSS framework.

There are **no tests** and **no linter beyond Prettier** in this project.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → ./build
npm run preview    # preview the production build
npm run check      # svelte-check type checking (the closest thing to CI)
npm run format     # prettier --write .
npm run lint       # prettier --check .
```

After changing types or store signatures, run `npm run check` — it is the only
automated correctness gate.

Prettier config ([.prettierrc](.prettierrc)): **tabs**, single quotes, no trailing
commas, width 100. Match it.

## Project layout

```
src/
  app.html                 HTML shell. Contains the Content-Security-Policy and security meta tags.
  app.d.ts                 SvelteKit ambient types (boilerplate).
  routes/
    +layout.js             prerender = true, ssr = false. (Makes the whole app a static SPA.)
    +layout.svelte         Renders {children} only.
    +page.svelte           The single page. Lays out the 3-column grid and bootstraps the app on mount.
  lib/
    types.ts               Core types + quest-classification helpers (tier, raid).
    questStore.ts          The heart of the app: all stores, persistence, import/export, filtering, stats.
    QuestList.svelte       Renders the filtered quest cards; mark/unmark completion.
    QuestFilters.svelte    Search, level range, quest-type/tier filters, patron filters, sorting.
    AdventurePackFilters.svelte  Tri-state include/exclude per adventure pack, grouped into categories.
    QuestStats.svelte      "Total Progress" panel: counts, %, favour, account reward unlocks.
    PatronFavor.svelte     Per-patron favour progress + favour tier rewards (expandable).
    SagaProgress.svelte    Saga completion by tier (Heroic/Epic/Legendary), with "filter to saga".
    QuestSettings.svelte   Export URL, plugin auto-sync toggle, reset, patch-notes modal.
    ImportDialog.svelte    Modal shown when a shared URL hash is detected.
    TriStateToggle.svelte  Reusable 3-state control: none → include → exclude → none.
    ToggleButton.svelte    Reusable expand/collapse chevron (presentational; tabindex=-1).
static/
  quests.json              ~832 quests. THE primary data source. (See "Data files" below.)
  sagas.json               29 saga definitions, each listing its member quest IDs.
  favor-tiers.json         Favour reward tiers per patron (+ a "Total Favor" account-rewards entry).
  PATCHNOTES.md            Rendered in the patch-notes modal via a hand-rolled markdown parser.
  *.png, favicon.ico       Logo, wiki favicon, favicons.
```

Two design docs exist at the repo root: [README.md](README.md) (user/dev intro) and
[LOCALSTORAGE_MIGRATION.md](LOCALSTORAGE_MIGRATION.md) (history of the localStorage +
URL-hash storage model). Treat the migration doc as historical context.

## Data model

```ts
interface Quest {
  id: string;            // unique, snake_case, e.g. "the_grotto"
  name: string;          // display name, e.g. "The Grotto"
  level: number;         // recommended character level (drives Heroic/Epic/Legendary tiering)
  baseFavor: number;     // favour at Normal difficulty (can be 0)
  patron: string;        // patron organisation, e.g. "The Free Agents"
  adventurePack: string; // source pack, or "Free to Play"
  raid?: boolean;        // true on raids (each variant flagged separately); absent otherwise
  baseQuestId?: string;  // for level variants: points at the canonical quest's id
}

interface CompletedQuests {
  [questId: string]: { difficulty: 'Normal' | 'Hard' | 'Elite' | 'Reaper'; completedDate: string };
}
```

### Quest variants and `baseQuestId` — important

Many quests exist at multiple levels (a Heroic version and an Epic/Legendary
version). These are **separate `Quest` entries** with distinct `id`s, linked by
`baseQuestId` pointing at the canonical quest's id. This grouping matters because
**favour is shared across a variant group**: you earn favour once per group, at the
highest value any completed variant gives. Quest grouping logic appears in several
places — always group by `quest.baseQuestId || quest.id`:

- `questStats` (total + earned favour) in [questStore.ts](src/lib/questStore.ts)
- `PatronFavor.svelte` (per-patron favour)
- `QuestStats.svelte` (its own duplicate patron-favour calc + filtered-quest favour)
- the `noEpicLegendaryVersions` filter

If you change the grouping rule, change it in **all** of these or the numbers will
disagree between panels.

### Difficulty → favour

```ts
difficultyMultipliers = { Normal: 1.0, Hard: 2.0, Elite: 3.0, Reaper: 3.0 }
calculateFavor(baseFavor, difficulty) = round(baseFavor * multiplier)
```

**Reaper and Elite intentionally share the same 3.0 multiplier** — this matches
DDO's favour rules, so Reaper does not award more favour than Elite. "Maximum
possible favour" is always computed at **Elite**.

### Quest tiers (derived purely from `level`, see [types.ts](src/lib/types.ts))

- Heroic: level 1–19
- Epic: level 20–29
- Legendary: level 30+

### Raids

Raids are identified by a **`raid: true` field on the quest entry** in `quests.json`;
ordinary quests omit the field entirely. `isRaid(quest)` in
[types.ts](src/lib/types.ts) is the only reader — it takes the quest object, not a name.

Because the flag is per-entry, each **variant** of a raid needs its own `raid: true`
(e.g. heroic and epic `Plane of Night` are two entries, both flagged). Adding a raid to
the data therefore needs no code change — set the flag and filtering/labelling follows.

This replaced a hard-coded `RAID_QUESTS` name array. That array had drifted: it was
missing every heroic-era raid (`A Vision of Destruction`, `Hound of Xoriat`,
`Tempest's Spine`, `Plane of Night`, `Zawabi's Revenge`, `The Titan Awakes`,
`The Reaver's Fate`, `Ascension Chamber`), which showed up in the UI as those raids
being labelled and filtered as ordinary quests.

## How it works (runtime flow)

### Bootstrap — [src/routes/+page.svelte](src/routes/+page.svelte) `onMount`

1. `loadQuests()` — fetch `/quests.json`, populate the `quests` store, then
   `initializeDefaultFilters()` (every adventure pack set to `include`, raids
   `include`).
2. `loadCompletedFromStorage()` — read + validate `localStorage['ddoqt-completed-quests']` into the `completedQuests` store.
3. `loadSettings()` — read `localStorage['ddoqt-settings']` (currently just `autoSyncEnabled`).
4. `checkForHashImport()` — if the URL has a `#hash`, decode it and stage it in `pendingHashImport`, which makes `ImportDialog` appear.

### Stores ([src/lib/questStore.ts](src/lib/questStore.ts))

| Store | Type | Purpose |
|-------|------|---------|
| `quests` | `writable<Quest[]>` | All quests, loaded from JSON. |
| `completedQuests` | `writable<CompletedQuests>` | The user's progress. Source of truth for completion. |
| `filters` | `writable<QuestFilters>` | All active filters. |
| `pendingHashImport` | `writable<CompletedQuests \| null>` | Non-null ⇒ show the import dialog. |
| `autoSyncEnabled` | `writable<boolean>` | Whether plugin URLs auto-import without a dialog. |
| `filteredQuests` | `derived` | `quests` run through every active filter, then sorted. |
| `questStats` | `derived` | Totals, completion %, total/earned favour. |

### Persistence model

- **Primary store**: `localStorage['ddoqt-completed-quests']` (plain JSON). Every
  `toggleQuestCompletion` writes through to it immediately via `saveCompletedToStorage`.
- **Sharing/backup**: the URL hash holds an LZ-string-compressed JSON of
  `CompletedQuests`. `exportToHash()` produces it; `checkForHashImport()` parses it.
- **Settings**: `localStorage['ddoqt-settings']`.

`checkForHashImport()` is defensive by design: it caps hash length (75k) and decoded
length (50k), tries LZ-string first then falls back to legacy base64, and validates
each entry's `difficulty` against the allowed set before accepting it. Keep that
validation if you touch import — it is the trust boundary for externally-supplied
data (e.g. plugin-generated URLs).

Auto-sync: a URL of the form `…#<hash>?action=merge|replace` will import **without**
the dialog **only if** `autoSyncEnabled` is on; otherwise the dialog always shows.

### Filtering — `filteredQuests` derived store

Filters are applied in sequence; a quest must survive all of them. Order/logic worth knowing:

- `sagaQuestIds` is **highest priority** — when set (via the saga "filter to this
  saga" button), only those quest IDs are shown; everything else is irrelevant.
- Most toggles are **tri-state** (`'include' | 'exclude' | undefined`) via the shared
  `applyTriStateFilter` helper and the `TriStateToggle` component.
- Adventure-pack filtering: if **any** pack is `include`, only `include` packs show;
  any `exclude` pack is always hidden.
- `raids` tri-state: `include` is a **no-op** (shows everything), `exclude` hides
  raids. `onlyRaids` is a separate boolean that shows raids only.
- `noEpicLegendaryVersions`: hides a quest if any quest in its variant group is
  Epic/Legendary (i.e. shows only quests that exist *only* at Heroic level).

### Two different "clear filters"

Be aware these are **not** the same:

- `clearFilters()` in [questStore.ts](src/lib/questStore.ts) → resets to
  `initializeDefaultFilters` (all packs `include`).
- `clearFilters()` local to [QuestFilters.svelte](src/lib/QuestFilters.svelte) → sets
  `filters` to `{}` (an empty object, i.e. *no* explicit pack includes).

They produce different visible results. Don't assume "clear" has one meaning.

## Conventions

- **Imports**: use the `$lib` alias and import store/helpers from
  `$lib/questStore.js` / `$lib/types.js` (note the `.js` extension on the TS files —
  this is the SvelteKit/bundler convention here; keep it).
- **Svelte version mix**: [+layout.svelte](src/routes/+layout.svelte) uses Svelte 5
  runes (`$props`), but the feature components use the **Svelte 4-style API**
  (`export let`, `$:` reactive statements, `on:click`, store-`$` autosubscription).
  Match the surrounding file's style rather than introducing runes piecemeal.
- **Styling**: component-scoped `<style>` blocks; dark palette with `#d4af37` gold
  accents; difficulty colours are Normal=green, Hard=yellow, Elite=orange,
  Reaper=red (defined per-component, not centralised).
- **External links** open with `target="_blank" rel="noopener noreferrer"`.
- **Wiki URLs** are generated from quest names by `generateWikiUrl` in
  [QuestList.svelte](src/lib/QuestList.svelte) (spaces → `_`, special chars
  percent-encoded) → `https://ddowiki.com/page/<title>`.

## Editing the data

### Adding / changing quests — `static/quests.json`

Each entry needs `id`, `name`, `level`, `baseFavor`, `patron`, `adventurePack`
(and `baseQuestId` for variants). Knock-on effects to remember:

- A new **patron** automatically appears in patron filters and the PatronFavor panel.
  To show its favour reward tiers, add a matching entry (keyed by `name`) to
  `favor-tiers.json`.
- A new **adventure pack** appears automatically under "Adventure Packs" in
  [AdventurePackFilters.svelte](src/lib/AdventurePackFilters.svelte) unless its name
  is in that file's `fixedCategories.Expansions` list (those render under
  "Expansions"). "Free to Play" is special-cased as a top-level toggle.
- A new **raid**: set `"raid": true` on the entry (and on each of its level variants).
  No code change needed.
- A **variant** (same quest at a higher level): give it its own `id` and set
  `baseQuestId` to the canonical quest's `id`, so favour is grouped correctly.

### Sagas — `static/sagas.json`

Each saga has `name`, `tier` (`Heroic`/`Epic`/`Legendary`), `level` (a **string**),
`questCount` (expected total), and `questIds` (member quest IDs). `questIds` must
match real `id`s in `quests.json` or those quests won't be found/counted.

### Favour tiers — `static/favor-tiers.json`

Keyed by patron `name` (which may contain `<br>` for display, e.g. the synthetic
`"Total Favor<br>Account Rewards"` patron). Each `tiers[]` entry has `tier`,
`favorRequired`, `reward`, and `unreachable` (true ⇒ shown greyed-out and excluded
from "earned rewards").

### Patch notes — `static/PATCHNOTES.md`

Rendered in a modal by a **hand-rolled markdown parser** in
[QuestSettings.svelte](src/lib/QuestSettings.svelte) (`parseMarkdownToHTML`),
inserted with `{@html …}`. It supports headings, lists, `---`, bold/italic/inline
code, and raw HTML passes through (the existing file deliberately uses raw `<a>`
tags). Because output is injected as HTML, **treat this file as trusted,
author-controlled content** — do not pipe user input through this parser.

## Gotchas / things to be careful about

- **No SSR.** Anything touching `window`/`localStorage` must be guarded
  (`if (typeof window === 'undefined') return;`) — the store functions already do
  this; preserve it.
- **Favour is grouped, completion count is not.** `questStats.completedQuests` counts
  raw completed entries; favour numbers collapse variant groups. Expect the
  "X/Y quests" and favour figures to be based on different denominators.
- **Duplicated favour logic.** The per-patron favour calculation exists in *both*
  `PatronFavor.svelte` and `QuestStats.svelte`. Changing one without the other will
  desynchronise the displayed numbers.
- **`exportToHash()` / `importFromHash()` read stores via a self-invoked
  `subscribe(...)()`** rather than `get()` (which is imported and used elsewhere).
  It works but is unusual; prefer `get(store)` if you refactor.
- **CSP** is declared in [src/app.html](src/app.html) and is fairly strict
  (`connect-src 'self'`, `frame-src 'none'`, etc.). If you add an external request,
  image host, or font, update the CSP or it will be blocked.
- **Data fetches use absolute paths** (`/quests.json` etc.). If the app is ever
  hosted under a base path, these need revisiting.

## Where to start for common tasks

- *Add/fix quest data* → `static/quests.json` (+ see "knock-on effects" above).
- *Change how favour is calculated* → `calculateFavor`/`difficultyMultipliers` and
  the grouped reducers in [questStore.ts](src/lib/questStore.ts) **and**
  [QuestStats.svelte](src/lib/QuestStats.svelte) / [PatronFavor.svelte](src/lib/PatronFavor.svelte).
- *Add/adjust a filter* → `QuestFilters` type in [types.ts](src/lib/types.ts), the
  `filteredQuests` derived store in [questStore.ts](src/lib/questStore.ts), and the
  relevant filter component.
- *Change sharing/import behaviour* → `checkForHashImport`, `importFromHash`,
  `exportToHash` in [questStore.ts](src/lib/questStore.ts) and
  [ImportDialog.svelte](src/lib/ImportDialog.svelte).
- *Update the changelog shown in-app* → `static/PATCHNOTES.md`.

## Feature: level-planner import (IMPLEMENTED — MVP)

> Status: MVP implemented. Matcher + alias table live in
> [src/lib/plannerImport.ts](src/lib/plannerImport.ts); the `customQuestIds` filter and
> `applyCustomQuestList()` are in [questStore.ts](src/lib/questStore.ts); the import UI is
> the "Import Levelling Plan" group in [QuestSettings.svelte](src/lib/QuestSettings.svelte).
> The optional baked-atlas/generator approach (not built) and the alias-table analysis
> are in [PLANNER_IMPORT.md](PLANNER_IMPORT.md). The active plan IS persisted across
> reloads and plugin syncs — the single active `customQuestIds` list is saved to
> `localStorage['ddoqt-active-plan']` by `applyCustomQuestList()` and restored on mount
> by `loadActivePlan()` (called after `loadQuests()`, which resets filters). Cleared by
> any "clear filters" path (`clearActivePlan()`). Not yet done: multiple named saved
> plans, persisting other filters (packs/level/etc.), saga-reference expansion. The spec
> below documents the implemented behaviour.

### Goal

Let a user import a quest list exported from a DDO levelling planner and have DDOQT
**filter the quest list to exactly those quests** (and, for free, show favour/progress
for that set via the existing "Selected Total Favor" stat). The planner names map onto
quests.json with very high fidelity — measured **100% on realistic selections** and
~97–98% across the planner's *entire* catalogue, the residue being entries that aren't
single quests at all (see below).

### Source format

The planner exports JSON like:

```jsonc
{
  "xpmultiplier": 1.15, "vipSagas": true,            // run config — IGNORE all top-level keys
  "learningTomeByMode": {…}, "configPreset": "default",
  "heroic": [ { "name": "Outbreak" }, { "takeLevel": true }, … ],
  "epic":   [ { "name": "An Offering of Blood" }, … ]
}
```

The `heroic` / `epic` arrays give the **tier explicitly** — this is the lever that
disambiguates quest variants (the same name exists at Heroic *and* Epic/Legendary as
two `Quest` entries; the array it appears in decides which `id` to resolve to). Array
order is the intended run order (preserve it if an ordered checklist is ever wanted).

### Entry taxonomy & classification (classify by KEY first, not by name)

Every array element is one of these; the non-quest kinds are detectable by structured
keys, so they are filtered **before** any name matching:

| Shape | Detect by | Action |
|---|---|---|
| Regular quest | has `name`, no other flag | resolve name → quest id (within tier) |
| Level marker `{ "takeLevel": true }` | **no** `name` | skip |
| Custom entry `{ "custom": true, "name": …, "xp": … }` | `custom === true` | skip (user's own placeholder) |
| Slayer area `{ "name": "Orchard Slayer 100", "slayerBonus": … }` | `slayerBonus` present | skip (not a quest) |
| Wilderness/arena `{ "name": "Underdark Arena: … (lvl30)" }` | *no flag* — looks like a quest | will not match → reconciliation report (optionally labelled "wilderness" via the `<Area>: <objective> (lvl30)` shape) |
| Saga reference `{ "name": "Epic Huntsilvers Saga" }` | *no flag* — looks like a quest | will not name-match a quest → report; **stretch goal**: alias-map to a saga and expand to its `questIds` |

### Name-matching algorithm

Normalise both the planner name and each `quest.name`, then look up **within the
declared tier** (`heroic` ⇒ `level ≤ 19`, `epic` ⇒ `level ≥ 20`):

1. Unicode NFKD; lowercase; trim.
2. Normalise apostrophes (`’ ‘ ´` → `'`).
3. Strip a trailing parenthetical — handles quests.json's `(quest)` suffix and the
   planner's `(hard)` / `(lvl30)` annotations.
4. **Delete** apostrophes (so `kobold's` == `kobolds'`).
5. Replace remaining punctuation with spaces; collapse whitespace.
6. Drop a single leading article (`the` / `a` / `an`).

This ~6-rule normaliser is what achieves the measured match rates. A small
hand-maintained **alias table** mops up the structural long-tail (e.g. planner
`Locked Away pt1` ↔ quests.json `Locked Away (Part One)`).

### Reuse points in the existing code

- Add a `customQuestIds?: string[]` field to `QuestFilters` ([types.ts](src/lib/types.ts))
  and one clause in the `filteredQuests` derived store
  ([questStore.ts](src/lib/questStore.ts)) mirroring the existing `sagaQuestIds`
  "show only these IDs" logic. Use a **separate** field so it doesn't collide with the
  saga "filter to saga" button, which writes `sagaQuestIds`.
- The **"Selected Total Favor"** stat in [QuestStats.svelte](src/lib/QuestStats.svelte)
  already reports favour for the active filter set, so an imported plan gets a progress
  readout with no extra work.
- A new import UI (textarea/file-drop + reconciliation panel) belongs alongside the
  export UI in [QuestSettings.svelte](src/lib/QuestSettings.svelte).

### Reconciliation (don't silently drop)

Surface a summary: *"matched X, skipped N slayer/custom/level entries, M not found"*,
and list the not-found names so the user can resolve or ignore them. Skipped-by-key
entries are expected and should be counted, not flagged as errors.

### Effort

MVP delivered. The single active plan is persisted (`localStorage['ddoqt-active-plan']`).
Remaining add-ons: multiple *named* saved lists and persisting other filters (the
save/restore pattern in `applyCustomQuestList`/`loadActivePlan` generalises — widen it
to persist more of the `filters` object, adding pack-reconciliation for future content
and a visible "filters active/clear" cue); a baked atlas + generator (see
[PLANNER_IMPORT.md](PLANNER_IMPORT.md)); saga-expansion (stretch).
