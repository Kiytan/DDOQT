# Planner Import — Atlas & Generator Design

> **Status: design only — nothing here is implemented.** This document specifies the
> *optional* "baked atlas" approach for importing DDO levelling-planner exports, and the
> schemas its generator would produce. For the runtime import feature itself (entry
> taxonomy, classification, matching algorithm), see the *Planned feature* section of
> [AGENTS.md](AGENTS.md). This atlas is the "do it properly / guaranteed coverage"
> upgrade on top of the MVP live-matcher; **the MVP does not require it.**

## Why an atlas (vs live fuzzy matching)

The runtime matcher normalises planner names and matches them against `quests.json` on
the fly. That hits ~97–100% on real exports. An atlas pre-computes those resolutions
once, offline, so that at import time matching is a deterministic dictionary lookup:

- **Deterministic & auditable** — long-tail/awkward names are resolved once by a human and reviewed, not re-guessed per import.
- **Fast** — O(1) lookup per name.
- **Drift detection** — regenerating after a `quests.json` update immediately reports what broke.

Trade-off: the atlas is a **build artefact, not a hand-edited file**. It must be
regenerated whenever `quests.json` *or* the planner's quest catalogue changes. Anything
the atlas/alias don't cover falls back to the live normaliser, then to the
reconciliation report.

## Pipeline

```
inputs:
  static/quests.json          (authoritative quest list: id, name, level, baseQuestId, …)
  static/sagas.json           (saga names + member questIds, per tier)   ← for saga expansion
  planner-catalogue           (every planner quest name + tier — e.g. heroic_config.csv / epic_config.csv)
  alias-table.json            (hand-maintained overrides; see schema below)

process (per tier ∈ {heroic, epic}):
  1. classify each catalogue entry by structured key (skip takeLevel / custom / slayerBonus)
  2. normalise remaining names (the 6-rule normaliser from AGENTS.md)
  3. resolve: exact atlas/quests match  →  alias-table  →  (optional) fuzzy  →  unresolved
  4. record 1:1 confident matches in the atlas; drop ambiguous (>1 candidate) to the report

outputs:
  atlas.json                  (confident, unambiguous name → id map; shipped with the app)
  unmatched-report.json       (everything needing a human decision; NOT shipped)
```

Tier is part of every key because the same normalised name resolves to different ids
per tier (e.g. `an offering of blood` → heroic id vs `an_offering_of_blood_level_21`).

## Schema 1 — `atlas.json` (generated, shipped)

Only **confident 1:1** mappings live here. Ambiguous or unresolved names are deliberately
excluded (they go to the report / alias table) so the atlas never guesses at runtime.

```jsonc
{
  "version": 1,
  "generatedAt": "2026-06-03",
  "source": {
    "questsHash": "<sha256 of quests.json, for drift detection>",
    "plannerCatalogue": ["heroic_config.csv", "epic_config.csv"]
  },
  "entries": {
    "heroic": {
      // normalised planner name  →  quests.json id
      "kobolds new ringleader": "the_kobolds_new_ringleader",
      "garrisons missing pack": "garrisons_missing_pack",
      "legend of the lost locket": "the_legend_of_the_lost_locket_level_5"
    },
    "epic": {
      "offering of blood": "an_offering_of_blood_level_21",
      "bargain of blood": "bargain_of_blood_level_20",
      "mystery of deleras tomb": "the_mystery_of_deleras_tomb_level_27"
    }
  }
}
```

- Keys are the **normalised** form (output of the 6-rule normaliser), so runtime lookup
  is `atlas.entries[tier][normalise(name)]` with no further processing.
- Values are a single `id` string. (If you prefer to keep the raw planner name for
  debugging, add a sibling `"_raw"` map — but the lookup map stays normalised.)

## Schema 2 — `alias-table.json` (hand-maintained, an INPUT)

Human-curated overrides for the long tail. The generator reads this and can also
**scaffold** it (emit stub entries for everything unresolved). Keyed by tier, then by
**raw** planner name (readable for humans); the generator normalises on read.

```jsonc
{
  "version": 1,
  "heroic": {
    "Locked Away pt1": { "questId": "locked_away_part_one" },
    "Locked Away pt2": { "questId": "locked_away_part_two" }
  },
  "epic": {
    // saga reference → expand to member quests (stretch goal; uses sagas.json questIds)
    "Epic Huntsilvers Saga": {
      "sagaName": "Honor of the Huntsilvers",      // sagas.json name, tier Epic
      "expandToSagaQuests": true,
      "note": "planner names sagas '<Tier> <Family> Saga'"
    },
    // explicitly not a single quest → classify so the importer skips quietly
    "Dryad Grove: Defenseless (lvl30)":          { "ignore": "wilderness" },
    "Ruined Keep: The Sunset Ritual (lvl30)":    { "ignore": "wilderness" },
    "Underdark Arena: Fight to the Finish (lvl30)": { "ignore": "wilderness" }
  }
}
```

Resolution kinds (exactly one per entry):
- `"questId": string` — map to a specific quest id.
- `"questIds": string[]` — map to several (e.g. a planner entry that is really a chain).
- `"expandToSagaQuests": true` (+ `sagaName`) — expand to that saga's `questIds`.
- `"ignore": "wilderness" | "slayer" | "custom" | "other"` — known non-quest; skip and count under that label rather than reporting as a miss.

## Schema 3 — `unmatched-report.json` (generated, NOT shipped)

The generator's human-facing output: what auto-resolved, and what still needs a decision.
Driving an alias-table update is its whole purpose.

```jsonc
{
  "generatedAt": "2026-06-03",
  "summary": {
    "totalCatalogue": 886,
    "matchedByAtlas": 850,
    "matchedByAlias": 12,
    "ignored": 78,            // slayer / custom / takeLevel / alias-ignored
    "unresolved": 4           // ← action items
  },
  "byTier": {
    "heroic": {
      "unresolved": [
        { "name": "Ogmha's Song", "normalised": "ogmhas song", "guess": "namegap-or-missing" }
      ]
    },
    "epic": {
      "unresolved": [
        { "name": "Some New Quest", "normalised": "some new quest", "guess": "namegap-or-missing" }
      ],
      "ambiguous": [
        { "name": "...", "normalised": "...", "candidates": ["id_a", "id_b"] }
      ]
    }
  }
}
```

`guess` is a heuristic hint to speed up triage:
- `wilderness` — matches the `<Area>: <objective> (lvl30)` shape.
- `saga` — normalises close to a sagas.json name / ends in "Saga".
- `namegap-or-missing` — looks like a quest but no candidate; either a name-form gap (→ add an alias) or genuinely absent from quests.json (→ data gap to fix in `quests.json`).
- `ambiguous` — more than one in-tier candidate; needs an explicit alias to pick one.

## Runtime lookup order (when an atlas is present)

1. Classify entry by key → skip `takeLevel` / `custom` / `slayerBonus`.
2. `id = atlas.entries[tier][normalise(name)]` → if found, done.
3. Else consult the alias resolution (questId / questIds / saga-expand / ignore).
4. Else (optional) live fuzzy match.
5. Else → reconciliation report shown to the user.

## Maintenance checklist

- Re-run the generator when `quests.json` changes (new/renamed quests) **or** the planner
  adds quests. Compare `source.questsHash` to detect the former automatically.
- Review `unmatched-report.json`; resolve `unresolved`/`ambiguous` by editing
  `alias-table.json`; fix genuine data gaps in `quests.json`.
- Commit the regenerated `atlas.json` alongside the data change.

## Appendix — starter alias table (from a full-catalogue lookup, 2026-06-03)

Generated by running the 6-rule normaliser (plus hyphen removal) over the planner's
full catalogue (498 heroic + 388 epic names) against `static/quests.json`:
**486/498 heroic and 326/388 epic matched outright.** The leftovers split four ways —
**only the last is an alias job:**

1. **Tier-boundary (3, heroic)** — `The Dreaming Dark`, `The Lord of Blades`,
   `Tower of Despair` exist at **level 20** but the heroic plan lists them. Fix in the
   matcher: treat the heroic tier as `level ≤ 20` (or fall back to the nearest tier on
   an in-tier miss). **Not aliases.**
2. **Normaliser bug (1)** — `In the Demon´s Den` (id `in_the_demons_den`) misses only
   because the standalone acute accent `´` (U+00B4) decomposes under NFKD into a space +
   combining mark. Fix: replace apostrophe-variants (`’ ‘ ´`) **before** NFKD and strip
   combining marks. Makes it a clean match. **Not an alias.**
3. **Removed-from-game quest (1)** — `Memoirs of an Illusory Larcener` is no longer in
   the game and is intentionally absent from `quests.json`. It is listed in the
   importer's `KNOWN_REMOVED` set ([plannerImport.ts](src/lib/plannerImport.ts)) so it is
   reported as "removed", not as an error. **Not aliasable** (no id to point at).
4. **Name-form / typo gaps → the alias table below.**

```jsonc
{
  "version": 1,
  "heroic": {
    "Locked Away pt1":                   { "questId": "locked_away_part_one_level_8" },
    "Locked Away pt2":                   { "questId": "locked_away_part_two_level_8" },
    "The Deadly Package: Agent of Darguul": { "questId": "the_deadly_package_agent_of_the_darguul" },
    "ToEE: First lvl and Earth Temple":  { "questId": "toee_first_level_and_earth_temple_level_8" },
    "Doom of the Witch Doctor: Zulkash, Herald Of Woe": { "questId": "doom_of_the_witchdoctor_zulkash_herald_of_woe" },
    "Yarkuch's War Plans":               { "questId": "yarkuchs_warplans" },
    "Ogmha's Song":                      { "questId": "oghmas_song_level_13", "note": "planner typo: Ogmha → Oghma" }
  },
  "epic": {
    "Locked Away pt1": { "questId": "locked_away_part_one_level_36" },
    "Locked Away pt2": { "questId": "locked_away_part_two_level_36" },
    "Ogmha's Song":    { "questId": "oghmas_song_level_35", "note": "planner typo: Ogmha → Oghma" }
  }
}
```

Notes:
- Keys are raw planner names (the importer normalises on read; a trailing `(hard)` is
  stripped by the normaliser, so the epic `Locked Away pt1 (hard)` resolves via the
  `Locked Away pt1` key under the `epic` tier).
- The `Witch Doctor` (spaced) vs `Witch-doctor` mismatch is the inverse of the hyphen
  rule — the *other* Witchdoctor quest (`…The Way to Zulkash`) already matches once
  hyphens are removed; only the spaced variant needs the alias.
- Wilderness/arena objectives (`Dryad Grove:`, `Ruined Keep:`, `Underdark Arena: … (lvl30)`)
  and slayer areas are **not** in this table — they're classified and skipped (slayer by
  the `slayerBonus` key, wilderness by the `<Area>: <objective> (lvl30)` shape).
- This table reflects today's `quests.json`; regenerate if quest ids/names change.
