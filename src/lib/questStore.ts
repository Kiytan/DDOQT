import { writable, derived } from 'svelte/store';
import LZString from 'lz-string';
import type { Quest, QuestFilters, CompletedQuests, FilterState } from './types.js';
import { isHeroicQuest, isEpicQuest, isLegendaryQuest, isRaid } from './types.js';

// Helper function for tri-state filtering
function applyTriStateFilter(filterState: FilterState, conditionMet: boolean): boolean {
	if (filterState === 'include') {
		return conditionMet; // Show only if condition is met
	} else if (filterState === 'exclude') {
		return !conditionMet; // Show only if condition is NOT met
	}
	return true; // No filter applied
}

// Difficulty multipliers
export const difficultyMultipliers = {
	Normal: 1.0,
	Hard: 2.0,
	Elite: 3.0,
	Reaper: 3.0
} as const;

// Helper function to calculate favor for a difficulty
export function calculateFavor(
	baseFavor: number,
	difficulty: 'Normal' | 'Hard' | 'Elite' | 'Reaper'
): number {
	return Math.round(baseFavor * difficultyMultipliers[difficulty]);
}

// Quest data store
export const quests = writable<Quest[]>([]);

// Completed quests store (synced with URL hash)
export const completedQuests = writable<CompletedQuests>({});

// Filters store
export const filters = writable<QuestFilters>({});

// Load quest data
export async function loadQuests(): Promise<void> {
	try {
		const response = await fetch('/quests.json');

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const questData: Quest[] = await response.json();
		quests.set(questData);
		
		// Initialize default filters after quests are loaded
		initializeDefaultFilters(questData);
	} catch (error) {
		console.error('Failed to load quest data:', error);
		quests.set([]);
	}
}

// Initialize default filters to show all content
function initializeDefaultFilters(questData: Quest[]): void {
	// Get all unique adventure packs
	const allPacks = [...new Set(questData.map(q => q.adventurePack))];
	
	// Set all adventure packs to 'include' by default
	const defaultAdventurePacks: { [key: string]: FilterState } = {};
	allPacks.forEach(pack => {
		defaultAdventurePacks[pack] = 'include';
	});
	
	filters.set({
		adventurePacks: defaultAdventurePacks,
		raids: 'include'
	});
}

// Load completed quests from URL hash
export function loadCompletedFromHash(): void {
	if (typeof window === 'undefined') return;

	const hash = window.location.hash.slice(1);
	if (hash) {
		try {
			// Limit hash size to prevent memory exhaustion
			if (hash.length > 75000) {
				// ~75KB limit for compressed data
				console.warn('URL hash too large, ignoring');
				completedQuests.set({});
				return;
			}

			// Try LZ-string decompression first (new format)
			let decoded: string;
			try {
				decoded = LZString.decompressFromEncodedURIComponent(hash) || '';
				if (!decoded) {
					throw new Error('LZ-string decompression failed');
				}
			} catch (lzError) {
				// Fallback to base64 decoding for backward compatibility
				try {
					// Validate hash format before attempting to decode
					if (!/^[A-Za-z0-9+/]*={0,2}$/.test(hash)) {
						console.warn('Invalid hash format');
						completedQuests.set({});
						return;
					}
					decoded = atob(hash);
				} catch (base64Error) {
					console.warn(
						'Failed to decode hash with both LZ-string and base64:',
						lzError,
						base64Error
					);
					completedQuests.set({});
					return;
				}
			}

			// Additional validation on decoded content
			if (decoded.length > 50000) {
				// ~50KB limit on JSON
				console.warn('Decoded hash content too large, ignoring');
				completedQuests.set({});
				return;
			}

			const parsed = JSON.parse(decoded);

			// Validate that parsed data is an object
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				console.warn('Invalid hash data structure, expected object');
				completedQuests.set({});
				return;
			}

			// Validate completed quest structure
			const completed: CompletedQuests = {};
			for (const [questId, completion] of Object.entries(parsed)) {
				// Validate quest ID format
				if (typeof questId !== 'string' || questId.length > 100) {
					console.warn(`Invalid quest ID: ${questId}`);
					continue;
				}

				// Validate completion object
				if (
					typeof completion === 'object' &&
					completion !== null &&
					'difficulty' in completion &&
					'completedDate' in completion
				) {
					const comp = completion as any;

					// Validate difficulty
					if (['Normal', 'Hard', 'Elite', 'Reaper'].includes(comp.difficulty)) {
						completed[questId] = {
							difficulty: comp.difficulty,
							completedDate: comp.completedDate
						};
					}
				}
			}

			completedQuests.set(completed);
		} catch (error) {
			console.error('Failed to parse hash:', error);
			completedQuests.set({});
		}
	}
}

// Save completed quests to URL hash
export function saveCompletedToHash(completed: CompletedQuests): void {
	if (typeof window === 'undefined') return;

	try {
		// Validate input before encoding
		if (typeof completed !== 'object' || completed === null) {
			console.warn('Invalid completed quests data, not saving to hash');
			return;
		}

		const json = JSON.stringify(completed);

		// Prevent excessively large URLs
		if (json.length > 50000) {
			// ~50KB limit
			console.warn('Completed quests data too large for URL hash');
			return;
		}

		// Use LZ-string compression for better compression ratio
		const compressed = LZString.compressToEncodedURIComponent(json);

		// Additional check on final hash size (LZ-string typically achieves 70-90% compression)
		if (compressed.length > 75000) {
			// ~75KB limit for compressed data
			console.warn('Compressed hash too large for URL');
			return;
		}

		window.location.hash = compressed;
	} catch (error) {
		console.error('Failed to save to hash:', error);
	}
}

// Toggle quest completion for a specific difficulty
export function toggleQuestCompletion(
	questId: string,
	difficulty: 'Normal' | 'Hard' | 'Elite' | 'Reaper'
): void {
	completedQuests.update((completed) => {
		const newCompleted = { ...completed };

		if (newCompleted[questId]) {
			// Quest is already completed, remove it
			delete newCompleted[questId];
		} else {
			// Mark quest as completed with the selected difficulty
			newCompleted[questId] = {
				difficulty,
				completedDate: new Date().toISOString()
			};
		}

		saveCompletedToHash(newCompleted);
		return newCompleted;
	});
}

// Filtered quests derived store
export const filteredQuests = derived(
	[quests, filters, completedQuests],
	([$quests, $filters, $completed]) => {
		let filtered = $quests.filter((quest) => {
			// Search filter (quest name only)
			if ($filters.search) {
				const searchTerm = $filters.search.toLowerCase();
				const nameMatch = quest.name.toLowerCase().includes(searchTerm);
				if (!nameMatch) return false;
			}

			// Level filter
			if ($filters.minLevel && quest.level < $filters.minLevel) return false;
			if ($filters.maxLevel && quest.level > $filters.maxLevel) return false;

			// Patron filter (tri-state)
			if ($filters.patron && Object.keys($filters.patron).length > 0) {
				const patronState = $filters.patron[quest.patron];
				if (patronState !== undefined) {
					if (!applyTriStateFilter(patronState, true)) return false;
				} else {
					// If patron has no explicit state, check if any patrons are included
					const hasIncludedPatrons = Object.values($filters.patron).some(state => state === 'include');
					if (hasIncludedPatrons) {
						// If some patrons are explicitly included, exclude those without explicit include
						return false;
					}
				}
			}

			// Adventure pack filter
			if ($filters.adventurePacks && Object.keys($filters.adventurePacks).length > 0) {
				// Check if any adventure pack has an 'include' filter
				const includeFilters = Object.entries($filters.adventurePacks).filter(([_, state]) => state === 'include');
				const excludeFilters = Object.entries($filters.adventurePacks).filter(([_, state]) => state === 'exclude');
				
				// If there are include filters, only show quests from those packs
				if (includeFilters.length > 0) {
					const includePacks = includeFilters.map(([pack, _]) => pack);
					if (!includePacks.includes(quest.adventurePack)) return false;
				}
				
				// If there are exclude filters, hide quests from those packs
				if (excludeFilters.length > 0) {
					const excludePacks = excludeFilters.map(([pack, _]) => pack);
					if (excludePacks.includes(quest.adventurePack)) return false;
				}
			}

			// Completion filter
			if ($filters.completed !== undefined) {
				const isCompleted = !!$completed[quest.id];
				if (!applyTriStateFilter($filters.completed, isCompleted)) return false;
			}

			// Heroic quest filter (level 1-19) 
			if ($filters.heroic !== undefined) {
				if (!applyTriStateFilter($filters.heroic, isHeroicQuest(quest.level))) return false;
			}

			// Epic quest filter (level 20-29)
			if ($filters.epic !== undefined) {
				if (!applyTriStateFilter($filters.epic, isEpicQuest(quest.level))) return false;
			}

			// Legendary quest filter (level 30+)
			if ($filters.legendary !== undefined) {
				if (!applyTriStateFilter($filters.legendary, isLegendaryQuest(quest.level))) return false;
			}

			// Raid quest filter
			if ($filters.raids !== undefined) {
				const questIsRaid = isRaid(quest.name);
				if ($filters.raids === 'include') {
					// Include: allow both raids and non-raids (no filtering)
					// This is a no-op - don't filter anything
				} else if ($filters.raids === 'exclude') {
					// Exclude: hide raids, show only non-raids
					if (questIsRaid) return false;
				}
				// None (undefined): show both raids and non-raids (no filtering)
			}

			// Only raids filter - show only raids when enabled
			if ($filters.onlyRaids && !isRaid(quest.name)) return false;

			// Filter for quests without Epic/Legendary versions
			if ($filters.noEpicLegendaryVersions) {
				// Get the base quest ID (either the quest's own ID or its baseQuestId)
				const baseId = quest.baseQuestId || quest.id;
				
				// Check if any quest in the dataset has this baseId and is Epic/Legendary
				const hasEpicLegendaryVersion = $quests.some(q => {
					const qBaseId = q.baseQuestId || q.id;
					return qBaseId === baseId && (isEpicQuest(q.level) || isLegendaryQuest(q.level));
				});
				
				// If this quest has Epic/Legendary versions, exclude it
				if (hasEpicLegendaryVersion) return false;
			}

			return true;
		});

		// Apply sorting
		if ($filters.sortBy) {
			filtered = filtered.sort((a, b) => {
				let aValue: string | number;
				let bValue: string | number;

				switch ($filters.sortBy) {
					case 'name':
						aValue = a.name.toLowerCase();
						bValue = b.name.toLowerCase();
						break;
					case 'level':
						aValue = a.level;
						bValue = b.level;
						break;
					case 'baseFavor':
						aValue = a.baseFavor;
						bValue = b.baseFavor;
						break;
					case 'patron':
						aValue = a.patron.toLowerCase();
						bValue = b.patron.toLowerCase();
						break;
					default:
						return 0;
				}

				let comparison = 0;
				if (aValue < bValue) {
					comparison = -1;
				} else if (aValue > bValue) {
					comparison = 1;
				}

				return $filters.sortOrder === 'desc' ? -comparison : comparison;
			});
		}

		return filtered;
	}
);

// Statistics derived store
export const questStats = derived([quests, completedQuests], ([$quests, $completed]) => {
	const totalQuests = $quests.length;
	const completedQuests = Object.keys($completed).length;

	// Group quests by base quest ID for shared favor calculation
	const questGroups = new Map<string, Quest[]>();
	$quests.forEach((quest) => {
		const groupKey = quest.baseQuestId || quest.id;
		if (!questGroups.has(groupKey)) {
			questGroups.set(groupKey, []);
		}
		questGroups.get(groupKey)!.push(quest);
	});

	// Calculate total possible favor (maximum favor per quest group - using highest base favor variant at Elite)
	const totalFavor = Array.from(questGroups.values()).reduce((sum, questGroup) => {
		const highestBaseFavor = Math.max(...questGroup.map((q) => q.baseFavor));
		return sum + calculateFavor(highestBaseFavor, 'Elite');
	}, 0);

	// Calculate earned favor (only highest from each quest group)
	const earnedFavor = Array.from(questGroups.entries()).reduce((sum, [groupKey, questGroup]) => {
		// Find all completed quests in this group
		const completedInGroup = questGroup
			.map((quest) => ({ quest, completion: $completed[quest.id] }))
			.filter((item) => item.completion);

		if (completedInGroup.length === 0) return sum;

		// Find the highest favor earned from any variant in this group
		const highestGroupFavor = Math.max(
			...completedInGroup.map((item) =>
				calculateFavor(item.quest.baseFavor, item.completion.difficulty)
			)
		);

		return sum + highestGroupFavor;
	}, 0);

	return {
		totalQuests,
		completedQuests,
		completionPercentage: totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0,
		totalFavor,
		earnedFavor
	};
});
