export interface Quest {
	id: string;
	name: string;
	level: number;
	baseFavor: number;
	patron: string;
	adventurePack: string;
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

// List of raid quest names
export const RAID_QUESTS = [
	'The Chronoscope',
	'The Twilight Forge',
	'The Shroud',
	'The Codex and the Shroud',
	'Legendary Hound of Xoriat',
	'Legendary Tempest\'s Spine',
	'The Fall of Truth',
	'Caught in the Web',
	'Fire on Thunder Peak',
	'Defiler of the Just',
	'Riding the Storm Out',
	'The Curse of Strahd',
	'Old Baba\'s Hut',
	'Killing Time',
	'Too Hot to Handle',
	'Project Nemesis',
	'Legendary Vision of Destruction',
	'Legendary Master Artificer',
	'Legendary Lord of Blades',
	'Temple of the Deathwyrm',
	'The Mark of Death',
	'The Dryad and the Demigod',
	'The Lord of Blades',
	'The Master Artificer',
	'The Vault of Night',
	'Hunt or Be Hunted',
	'Skeletons in the Closet',
	'Fire Over Morgrave',
	'Threats Old and New',
	'Den of Vipers',
	'The Chronoscope (Legendary)'
];

// Helper function to check if a quest is a raid
export function isRaid(questName: string): boolean {
	return RAID_QUESTS.includes(questName);
}
