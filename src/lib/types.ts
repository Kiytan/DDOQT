export interface Quest {
	id: string;
	name: string;
	level: number;
	baseFavor: number;
	patron: string;
	adventurePack: string;
	baseQuestId?: string; // For quest variants, reference to the original quest ID
}

export interface QuestFilters {
	minLevel?: number;
	maxLevel?: number;
	patron?: string[];
	adventurePacks?: string[];
	completed?: boolean;
	heroic?: boolean; // Filter for Heroic quests (level 1-19)
	epic?: boolean; // Filter for Epic quests (level 20-29)
	legendary?: boolean; // Filter for Legendary quests (level 30+)
	raids?: boolean; // Filter for Raid quests
	noEpicLegendaryVersions?: boolean; // Filter for quests without Epic/Legendary variants
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
