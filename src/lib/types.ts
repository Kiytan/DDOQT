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
