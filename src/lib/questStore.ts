import { writable, derived, get } from 'svelte/store';
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

// Completed quests store (synced with localStorage, importable from URL hash)
export const completedQuests = writable<CompletedQuests>({});

// Store for tracking if there's a hash to import
export const pendingHashImport = writable<CompletedQuests | null>(null);

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

const STORAGE_KEY = 'ddoqt-completed-quests';
const SETTINGS_KEY = 'ddoqt-settings';

// Settings store
export const autoSyncEnabled = writable<boolean>(false);

// Load settings from localStorage
export function loadSettings(): void {
	if (typeof window === 'undefined') return;
	
	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const settings = JSON.parse(stored);
			autoSyncEnabled.set(settings.autoSyncEnabled ?? false);
		}
	} catch (error) {
		console.error('Failed to load settings:', error);
	}
}

// Save auto-sync setting
export function setAutoSyncEnabled(enabled: boolean): void {
	if (typeof window === 'undefined') return;
	
	autoSyncEnabled.set(enabled);
	
	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		const settings = stored ? JSON.parse(stored) : {};
		settings.autoSyncEnabled = enabled;
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch (error) {
		console.error('Failed to save settings:', error);
	}
}

// Load completed quests from localStorage
export function loadCompletedFromStorage(): void {
	if (typeof window === 'undefined') return;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			
			// Validate structure
			if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
				const validated: CompletedQuests = {};
				
				for (const [questId, completion] of Object.entries(parsed)) {
					if (
						typeof questId === 'string' &&
						typeof completion === 'object' &&
						completion !== null &&
						'difficulty' in completion &&
						'completedDate' in completion
					) {
						const comp = completion as any;
						if (['Normal', 'Hard', 'Elite', 'Reaper'].includes(comp.difficulty)) {
							validated[questId] = {
								difficulty: comp.difficulty,
								completedDate: comp.completedDate
							};
						}
					}
				}
				
				completedQuests.set(validated);
				return;
			}
		}
	} catch (error) {
		console.error('Failed to load from localStorage:', error);
	}
	
	completedQuests.set({});
}

// Save completed quests to localStorage
export function saveCompletedToStorage(completed: CompletedQuests): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
	} catch (error) {
		console.error('Failed to save to localStorage:', error);
	}
}

// Check for URL hash and parse it (doesn't auto-import unless autoAction is specified)
export function checkForHashImport(): void {
	if (typeof window === 'undefined') return;

	const hash = window.location.hash.slice(1);
	if (!hash) {
		pendingHashImport.set(null);
		return;
	}

	// Check for auto-import query parameter: ?action=merge or ?action=replace
	const urlParams = new URLSearchParams(window.location.search);
	const autoAction = urlParams.get('action');

	try {
		// Limit hash size to prevent memory exhaustion
		if (hash.length > 75000) {
			console.warn('URL hash too large, ignoring');
			pendingHashImport.set(null);
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
					pendingHashImport.set(null);
					return;
				}
				decoded = atob(hash);
			} catch (base64Error) {
				console.warn(
					'Failed to decode hash with both LZ-string and base64:',
					lzError,
					base64Error
				);
				pendingHashImport.set(null);
				return;
			}
		}

		// Additional validation on decoded content
		if (decoded.length > 50000) {
			console.warn('Decoded hash content too large, ignoring');
			pendingHashImport.set(null);
			return;
		}

		const parsed = JSON.parse(decoded);

		// Validate that parsed data is an object
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			console.warn('Invalid hash data structure, expected object');
			pendingHashImport.set(null);
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

		// Set the pending import data (doesn't auto-import)
		pendingHashImport.set(completed);
		
		// Auto-import if action parameter is specified AND setting is enabled
		const isAutoSyncEnabled = get(autoSyncEnabled);
		if ((autoAction === 'merge' || autoAction === 'replace') && isAutoSyncEnabled) {
			const merge = autoAction === 'merge';
			
			if (merge) {
				// Merge with existing data
				completedQuests.update((current) => {
					const merged = { ...current, ...completed };
					saveCompletedToStorage(merged);
					return merged;
				});
			} else {
				// Replace existing data
				completedQuests.set(completed);
				saveCompletedToStorage(completed);
			}
			
			// Clear the hash, query params, and pending import
			pendingHashImport.set(null);
			const newUrl = window.location.pathname;
			window.history.replaceState({}, '', newUrl);
			console.log(`Auto-imported ${Object.keys(completed).length} quests (${autoAction})`);
		}
	} catch (error) {
		console.error('Failed to parse hash:', error);
		pendingHashImport.set(null);
	}
}

// Import data from pending hash
export function importFromHash(merge: boolean = false): void {
	pendingHashImport.subscribe((hashData) => {
		if (!hashData) return;

		if (merge) {
			// Merge with existing data
			completedQuests.update((current) => {
				const merged = { ...current, ...hashData };
				saveCompletedToStorage(merged);
				return merged;
			});
		} else {
			// Replace existing data
			completedQuests.set(hashData);
			saveCompletedToStorage(hashData);
		}

		// Clear the hash and pending import
		pendingHashImport.set(null);
		if (typeof window !== 'undefined') {
			window.location.hash = '';
		}
	})();
}

// Cancel hash import
export function cancelHashImport(): void {
	pendingHashImport.set(null);
	if (typeof window !== 'undefined') {
		window.location.hash = '';
	}
}

// Export current progress to URL hash
export function exportToHash(): string {
	let hash = '';
	
	completedQuests.subscribe((completed) => {
		try {
			const json = JSON.stringify(completed);
			
			if (json.length > 50000) {
				console.warn('Completed quests data too large for URL hash');
				return;
			}

			const compressed = LZString.compressToEncodedURIComponent(json);
			
			if (compressed.length > 75000) {
				console.warn('Compressed hash too large for URL');
				return;
			}

			hash = compressed;
		} catch (error) {
			console.error('Failed to create export hash:', error);
		}
	})();
	
	return hash;
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

		saveCompletedToStorage(newCompleted);
		return newCompleted;
	});
}

// Filtered quests derived store
export const filteredQuests = derived(
	[quests, filters, completedQuests],
	([$quests, $filters, $completed]) => {
		let filtered = $quests.filter((quest) => {
			// Saga quest ID filter - highest priority
			if ($filters.sagaQuestIds && $filters.sagaQuestIds.length > 0) {
				if (!$filters.sagaQuestIds.includes(quest.id)) return false;
			}

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

// Apply saga filter - filters quests to show only those in a specific saga
export function applySagaFilter(questIds: string[], tier: 'Heroic' | 'Epic' | 'Legendary'): void {
	if (questIds.length === 0) {
		// If no quest IDs, clear all filters
		clearFilters();
		return;
	}

	// Simply set the saga quest IDs filter - this will show ONLY these specific quests
	filters.update((currentFilters) => ({
		...currentFilters,
		sagaQuestIds: questIds,
		search: '' // Clear search when applying saga filter
	}));
}

// Clear all filters
export function clearFilters(): void {
	quests.subscribe((questData) => {
		initializeDefaultFilters(questData);
	})();
}
