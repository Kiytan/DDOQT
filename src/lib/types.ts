export interface Quest {
	id: string;
	name: string;
	level: number;
	baseFavor: number;
	patron: string;
	adventurePack: string;
	raid?: boolean; // Present and true only on raids; absent on ordinary quests
	baseQuestId?: string; // For quest variants, reference to the original quest ID
}

export type FilterState = 'include' | 'exclude' | undefined;

export interface QuestFilters {
	minLevel?: number;
	maxLevel?: number;
	patron?: { [patronName: string]: FilterState }; // Tri-state patron filtering
	adventurePacks?: { [adventurePackName: string]: FilterState }; // Tri-state adventure pack filtering
	completed?: FilterState; // Tri-state: include completed, exclude completed, or no filter
	heroic?: FilterState; // Tri-state: include Heroic quests (level 1-19)
	epic?: FilterState; // Tri-state: include Epic quests (level 20-29)
	legendary?: FilterState; // Tri-state: include Legendary quests (level 30+)
	raids?: FilterState; // Tri-state: include raids, exclude raids, or no filter
	onlyRaids?: boolean; // Show only raid quests (keep as boolean)
	noEpicLegendaryVersions?: boolean; // Filter for quests without Epic/Legendary variants (keep as boolean)
	sagaQuestIds?: string[]; // Filter to show only specific quest IDs (for saga filtering)
	customQuestIds?: string[]; // Filter to show only specific quest IDs (imported levelling plan)
	sortBy?: 'name' | 'level' | 'baseFavor' | 'patron';
	sortOrder?: 'asc' | 'desc';
	search?: string;
}

export interface CompletedQuests {
	[questId: string]: {
		difficulty: 'Normal' | 'Hard' | 'Elite' | 'Reaper';
		completedDate: string;
	};
}

// Helper functions for quest classification
export function isHeroicQuest(level: number): boolean {
	return level >= 1 && level <= 19;
}

export function isEpicQuest(level: number): boolean {
	return level >= 20 && level <= 29;
}

export function isLegendaryQuest(level: number): boolean {
	return level >= 30;
}

export function getQuestTier(level: number): 'Heroic' | 'Epic' | 'Legendary' {
	if (level >= 30) return 'Legendary';
	if (level >= 20) return 'Epic';
	return 'Heroic';
}

// Helper function to check if a quest is a raid.
// Raids carry `raid: true` in quests.json; ordinary quests omit the field.
export function isRaid(quest: Pick<Quest, 'raid'>): boolean {
	return quest.raid === true;
}
