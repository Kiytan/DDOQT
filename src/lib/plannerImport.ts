// Importer for DDO levelling-planner exports.
//
// A planner export looks like:
//   { xpmultiplier, vipSagas, …config…, heroic: [ {name} | {takeLevel} | … ], epic: [ … ] }
//
// We classify each array entry by its STRUCTURED KEYS first (skipping level markers,
// custom entries and slayer areas), then resolve the remaining named quests against
// static/quests.json by a normalised name match within the entry's tier, falling back
// to a small hand-maintained alias table for known name-form differences.
//
// Design + the analysis behind the alias table live in /PLANNER_IMPORT.md.

import type { Quest } from './types.js';

export type PlanTier = 'heroic' | 'epic';

// Raw planner entries are untrusted JSON, so type them loosely and narrow at runtime.
type PlannerEntry = Record<string, unknown>;

export interface PlannerConfig {
	heroic?: PlannerEntry[];
	epic?: PlannerEntry[];
}

export interface ImportReport {
	/** Quest IDs matched from the plan (deduplicated). */
	questIds: string[];
	matched: number;
	/** Entries deliberately skipped because they are not single quests. */
	skipped: {
		levelMarkers: number; // { takeLevel: true } and other nameless entries
		custom: number; // { custom: true, … } user-defined rows
		slayer: number; // { …, slayerBonus } slayer areas
		wilderness: number; // "Area: Objective (lvlNN)" wilderness/arena objectives
		saga: number; // saga references (not expanded in this version)
		removed: number; // quests no longer in the game
	};
	/** Named quests that could not be resolved — surface these to the user. */
	unmatched: string[];
	/** Names that resolved to more than one quest in the tier (first was used). */
	ambiguous: { name: string; questIds: string[] }[];
}

// Normalise a quest name for matching. The ordering matters:
//  - apostrophe variants are unified BEFORE NFKD, because a lone acute accent (U+00B4)
//    decomposes into a space + combining mark and would otherwise split the word.
//  - combining marks are then stripped.
//  - a trailing parenthetical is removed: handles quests.json's "(quest)" suffix and the
//    planner's "(hard)" / "(lvlNN)" annotations.
//  - apostrophes and hyphens are deleted so "kobold's" == "kobolds'" and
//    "witch-doctor" == "witchdoctor".
//  - a single leading article is dropped.
export function normalizeName(raw: string): string {
	let s = raw.toLowerCase().trim();
	s = s.replace(/[’‘´`]/g, "'");
	s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
	s = s.replace(/\s*\([^)]*\)\s*$/, '');
	s = s.replace(/['-]/g, '');
	s = s.replace(/[^a-z0-9]+/g, ' ');
	s = s.replace(/^(the|a|an)\s+/, '');
	return s.replace(/\s+/g, ' ').trim();
}

// The planner separates plans by tier, which disambiguates quest variants (the same
// name can exist at Heroic and Epic/Legendary as two Quest entries). The Heroic side is
// inclusive of level 20 because a few level-20 quests/raids (e.g. The Lord of Blades,
// Tower of Despair) appear in heroic plans. NOTE: this is local to the importer and does
// NOT change the global Heroic/Epic/Legendary tier helpers in types.ts.
function inTier(level: number, tier: PlanTier): boolean {
	return tier === 'heroic' ? level <= 20 : level >= 20;
}

// Hand-maintained overrides for name-form / typo gaps the normaliser can't bridge.
// Keys are RAW planner names (normalised on load); values are quests.json IDs.
// Regenerate against PLANNER_IMPORT.md's appendix if quest IDs/names change.
const RAW_ALIASES: Record<PlanTier, Record<string, string>> = {
	heroic: {
		'Locked Away pt1': 'locked_away_part_one_level_8',
		'Locked Away pt2': 'locked_away_part_two_level_8',
		'The Deadly Package: Agent of Darguul': 'the_deadly_package_agent_of_the_darguul',
		'ToEE: First lvl and Earth Temple': 'toee_first_level_and_earth_temple_level_8',
		'Doom of the Witch Doctor: Zulkash, Herald Of Woe':
			'doom_of_the_witchdoctor_zulkash_herald_of_woe',
		"Yarkuch's War Plans": 'yarkuchs_warplans',
		"Ogmha's Song": 'oghmas_song_level_13' // planner typo: Ogmha -> Oghma
	},
	epic: {
		'Locked Away pt1': 'locked_away_part_one_level_36',
		'Locked Away pt2': 'locked_away_part_two_level_36',
		"Ogmha's Song": 'oghmas_song_level_35' // planner typo: Ogmha -> Oghma
	}
};

const ALIAS_INDEX: Record<PlanTier, Map<string, string>> = {
	heroic: new Map(Object.entries(RAW_ALIASES.heroic).map(([k, v]) => [normalizeName(k), v])),
	epic: new Map(Object.entries(RAW_ALIASES.epic).map(([k, v]) => [normalizeName(k), v]))
};

// Quests removed from the game: present in planner data but intentionally absent from
// quests.json. Reported as "removed", not as an error.
const KNOWN_REMOVED = new Set<string>([normalizeName('Memoirs of an Illusory Larcener')]);

const WILDERNESS_RE = /^[^:]+:\s.+\(lvl\d+\)$/i;
// Slayer areas normally carry a `slayerBonus` key, but fall back to the name shape
// ("<Area> Slayer <count>") in case an export omits it.
const SLAYER_RE = /\bslayer\s+\d+$/i;

function buildIndex(quests: Quest[]): Map<string, Quest[]> {
	const idx = new Map<string, Quest[]>();
	for (const q of quests) {
		const key = normalizeName(q.name);
		const list = idx.get(key);
		if (list) list.push(q);
		else idx.set(key, [q]);
	}
	return idx;
}

type EntryKind = 'levelMarker' | 'custom' | 'slayer' | 'quest';

function classifyEntry(entry: PlannerEntry): { kind: EntryKind; name?: string } {
	const name = typeof entry?.name === 'string' ? entry.name : undefined;
	if (!name) return { kind: 'levelMarker' }; // { takeLevel: true } etc.
	if (entry.custom === true) return { kind: 'custom' };
	if ('slayerBonus' in entry) return { kind: 'slayer' };
	return { kind: 'quest', name };
}

// Parse raw text into a PlannerConfig, throwing a friendly error on bad input.
export function parsePlannerConfig(text: string): PlannerConfig {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('That doesn’t look like valid JSON.');
	}
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new Error('Expected a planner export object with "heroic" / "epic" lists.');
	}
	const obj = data as Record<string, unknown>;
	const heroic = Array.isArray(obj.heroic) ? (obj.heroic as PlannerEntry[]) : undefined;
	const epic = Array.isArray(obj.epic) ? (obj.epic as PlannerEntry[]) : undefined;
	if (!heroic && !epic) {
		throw new Error('No "heroic" or "epic" quest lists found in the export.');
	}
	return { heroic, epic };
}

// Match a parsed planner config against the quest list.
export function matchPlannerConfig(config: PlannerConfig, quests: Quest[]): ImportReport {
	const idx = buildIndex(quests);
	const questIds = new Set<string>();
	const report: ImportReport = {
		questIds: [],
		matched: 0,
		skipped: { levelMarkers: 0, custom: 0, slayer: 0, wilderness: 0, saga: 0, removed: 0 },
		unmatched: [],
		ambiguous: []
	};

	const tiers: PlanTier[] = ['heroic', 'epic'];
	for (const tier of tiers) {
		const entries = config[tier];
		if (!entries) continue;

		for (const entry of entries) {
			const { kind, name } = classifyEntry(entry);
			if (kind === 'levelMarker') {
				report.skipped.levelMarkers++;
				continue;
			}
			if (kind === 'custom') {
				report.skipped.custom++;
				continue;
			}
			if (kind === 'slayer') {
				report.skipped.slayer++;
				continue;
			}

			const raw = name as string;
			const key = normalizeName(raw);

			if (KNOWN_REMOVED.has(key)) {
				report.skipped.removed++;
				continue;
			}

			const candidates = (idx.get(key) ?? []).filter((q) => inTier(q.level, tier));
			if (candidates.length > 0) {
				// Prefer the candidate closest to the tier boundary: lowest level for
				// heroic, lowest level >= 20 for epic. Variants are rare and flagged.
				const chosen = candidates.reduce((a, b) => (a.level <= b.level ? a : b));
				questIds.add(chosen.id);
				report.matched++;
				if (candidates.length > 1) {
					report.ambiguous.push({ name: raw, questIds: candidates.map((q) => q.id) });
				}
				continue;
			}

			const alias = ALIAS_INDEX[tier].get(key);
			if (alias) {
				questIds.add(alias);
				report.matched++;
				continue;
			}

			if (SLAYER_RE.test(raw.trim())) {
				report.skipped.slayer++;
				continue;
			}
			if (WILDERNESS_RE.test(raw)) {
				report.skipped.wilderness++;
				continue;
			}
			if (/\bsaga$/i.test(raw.trim())) {
				report.skipped.saga++;
				continue;
			}

			report.unmatched.push(raw);
		}
	}

	report.questIds = [...questIds];
	return report;
}

// Convenience: parse + match in one call.
export function importPlannerText(text: string, quests: Quest[]): ImportReport {
	return matchPlannerConfig(parsePlannerConfig(text), quests);
}
