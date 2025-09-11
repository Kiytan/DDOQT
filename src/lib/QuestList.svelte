<script lang="ts">
	import {
		filteredQuests,
		completedQuests,
		toggleQuestCompletion,
		calculateFavor,
		filters,
		quests
	} from '$lib/questStore.js';
	import type { Quest } from '$lib/types.js';

	type Difficulty = 'Normal' | 'Hard' | 'Elite' | 'Reaper';

	const difficulties: Difficulty[] = ['Normal', 'Hard', 'Elite', 'Reaper'];

	function handleQuestToggle(quest: Quest, difficulty?: Difficulty) {
		if (difficulty) {
			toggleQuestCompletion(quest.id, difficulty);
		}
	}

	function getDifficultyColor(difficulty: string): string {
		switch (difficulty) {
			case 'Normal':
				return '#28a745'; // Green
			case 'Hard':
				return '#ffc107'; // Yellow
			case 'Elite':
				return '#fd7e14'; // Orange
			case 'Reaper':
				return '#dc3545'; // Red
			default:
				return '#6c757d'; // Gray fallback
		}
	}

	function getDifficultyBackgroundColor(difficulty: string): string {
		switch (difficulty) {
			case 'Normal':
				return '#1a2e1a'; // Dark green
			case 'Hard':
				return '#2e2a1a'; // Dark yellow/brown
			case 'Elite':
				return '#2e1f1a'; // Dark orange/brown
			case 'Reaper':
				return '#2e1a1a'; // Dark red/brown
			default:
				return '#2a2a2a'; // Dark gray fallback
		}
	}

	function isQuestCompleted(questId: string): boolean {
		return !!$completedQuests[questId];
	}

	function getCompletedDifficulty(questId: string): string | null {
		return $completedQuests[questId]?.difficulty || null;
	}

	function generateWikiUrl(questName: string): string {
		// Generate DDO Wiki URL based on quest name
		// Replace spaces with underscores and encode special characters
		const wikiTitle = questName
			.replace(/\s+/g, '_')
			.replace(/'/g, '%27')
			.replace(/"/g, '%22')
			.replace(/&/g, '%26');
		return `https://ddowiki.com/page/${wikiTitle}`;
	}
</script>

<div class="quest-list">
	{#if $filters.search || $filteredQuests.length !== $quests.length}
		<div class="search-results-info">
			Showing {$filteredQuests.length} of {$quests.length} quests
			{#if $filters.search}
				<span class="search-term">for "{$filters.search}"</span>
			{/if}
		</div>
	{/if}

	{#if $filteredQuests.length === 0}
		<p class="no-quests">No quests match the current filters.</p>
	{:else}
		{#each $filteredQuests as quest (quest.id)}
			{@const isCompleted = isQuestCompleted(quest.id)}
			{@const completedDifficulty = getCompletedDifficulty(quest.id)}
			{@const completedDate = $completedQuests[quest.id]?.completedDate}
			{@const difficultyBgColor = completedDifficulty
				? getDifficultyBackgroundColor(completedDifficulty)
				: ''}

			<div
				class="quest-card"
				class:completed={isCompleted}
				style={isCompleted && completedDifficulty
					? `background-color: ${difficultyBgColor}; border-color: ${getDifficultyColor(completedDifficulty)}`
					: ''}
			>
				{#if isCompleted}
					<!-- Compact view for completed quests -->
					<div class="quest-header-compact">
						<div class="quest-info-compact">
							<h4 class="quest-name-compact">
								{quest.name}
								{#if quest.baseQuestId}
									<span class="level-variant">(Level {quest.level})</span>
								{/if}
							</h4>
							<div class="quest-meta-compact">
								<span class="level">Level {quest.level}</span>
								{#if completedDifficulty}
									<span
										class="completed-difficulty"
										style="background-color: {getDifficultyColor(completedDifficulty)}"
									>
										{completedDifficulty}
									</span>
									<span class="favor-earned">
										{calculateFavor(quest.baseFavor, completedDifficulty as Difficulty)} favor
									</span>
								{/if}
								<a
									href={generateWikiUrl(quest.name)}
									target="_blank"
									rel="noopener noreferrer"
									class="wiki-link-compact"
									title="View quest on DDO Wiki"
								>
									<img src="/ddowiki_favicon.png" alt="DDO Wiki" class="wiki-favicon-compact" />
								</a>
							</div>
						</div>

						<button
							class="uncomplete-btn-compact"
							on:click={() => toggleQuestCompletion(quest.id, 'Normal')}
						>
							✕
						</button>
					</div>
				{:else}
					<!-- Full view for uncompleted quests -->
					<div class="quest-header">
						<div class="quest-info">
							<h4 class="quest-name">
								{quest.name}
								{#if quest.baseQuestId}
									<span class="level-variant">(Level {quest.level})</span>
								{/if}
							</h4>
							<div class="quest-meta">
								<span class="level">Level {quest.level}</span>
								<span class="base-favor">{quest.baseFavor} Base Favor</span>
								<a
									href={generateWikiUrl(quest.name)}
									target="_blank"
									rel="noopener noreferrer"
									class="wiki-link"
									title="View quest on DDO Wiki"
								>
									<img src="/ddowiki_favicon.png" alt="DDO Wiki" class="wiki-favicon" />
									Wiki
								</a>
							</div>
						</div>
					</div>

					<div class="quest-details">
						<div class="quest-attributes">
							<span class="patron"><strong>Patron:</strong> {quest.patron}</span>
							<span class="pack"><strong>Adventure Pack:</strong> {quest.adventurePack}</span>
						</div>

						<div class="difficulties">
							<h5>Mark as completed:</h5>
							<div class="difficulty-buttons">
								{#each difficulties as difficulty}
									<button
										class="difficulty-btn"
										style="background-color: {getDifficultyColor(difficulty)}"
										on:click={() => handleQuestToggle(quest, difficulty)}
									>
										{difficulty}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.quest-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.no-quests {
		text-align: center;
		color: #666;
		font-style: italic;
		padding: 2rem;
	}

	.search-results-info {
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		color: #b0b0b0;
		text-align: center;
	}

	.search-term {
		color: #d4af37;
		font-weight: 500;
	}

	.quest-card {
		background: #2d2d2d;
		border: 2px solid #404040;
		border-radius: 8px;
		padding: 1rem;
		transition: all 0.2s ease;
		color: #e0e0e0;
	}

	.quest-card:hover {
		border-color: #d4af37;
		box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
	}

	.quest-card.completed {
		padding: 0; /* Remove padding for compact view */
		/* Background and border colors are now set dynamically via style attribute */
	}

	/* Compact view styles for completed quests */
	.quest-header-compact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.6rem;
		gap: 0.6rem;
	}

	.quest-info-compact {
		flex: 1;
		min-width: 0;
	}

	.quest-name-compact {
		font-size: 0.8rem;
		margin: 0 0 0.15rem 0;
		color: #d4af37;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-decoration: line-through;
		text-decoration-thickness: 2px;
		text-decoration-color: #dc3545;
		opacity: 0.7;
	}

	.quest-meta-compact {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.75rem;
	}

	.quest-meta-compact .level {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
		text-decoration-color: #dc3545;
		opacity: 0.7;
	}

	.favor-earned {
		color: #666;
		font-weight: 500;
	}

	.uncomplete-btn-compact {
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 50%;
		width: 22px;
		height: 22px;
		cursor: pointer;
		font-size: 0.7rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background-color 0.2s ease;
	}

	.uncomplete-btn-compact:hover {
		background: #c82333;
	}

	/* Full view styles for uncompleted quests */

	.quest-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.quest-info {
		flex: 1;
	}

	.quest-name {
		margin: 0 0 0.5rem 0;
		color: #d4af37;
	}

	.quest-meta {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.wiki-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: #4a9eff;
		text-decoration: none;
		font-size: 0.8rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: rgba(74, 158, 255, 0.1);
		border: 1px solid rgba(74, 158, 255, 0.3);
		transition: all 0.2s ease;
	}

	.wiki-link:hover {
		color: #ffffff;
		background: rgba(74, 158, 255, 0.2);
		border-color: #4a9eff;
		transform: translateY(-1px);
	}

	.wiki-favicon {
		width: 14px;
		height: 14px;
		object-fit: contain;
	}

	.wiki-link-compact {
		color: #4a9eff;
		text-decoration: none;
		padding: 0.15rem;
		border-radius: 3px;
		transition: all 0.2s ease;
		opacity: 0.8;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.wiki-link-compact:hover {
		opacity: 1;
		transform: scale(1.1);
	}

	.wiki-favicon-compact {
		width: 12px;
		height: 12px;
		object-fit: contain;
	}

	.level {
		background: #6c757d;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.base-favor {
		background: #17a2b8;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.completed-difficulty {
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.difficulties {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #404040;
	}

	.difficulties h5 {
		margin: 0 0 0.75rem 0;
		color: #e0e0e0;
		font-size: 0.9rem;
	}

	.difficulty-buttons {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.4rem;
	}

	.difficulty-btn {
		color: white;
		border: none;
		padding: 0.5rem 0.4rem;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		text-align: center;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.85rem;
	}

	.difficulty-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.quest-details {
		border-top: 1px solid #404040;
		padding-top: 0.75rem;
	}

	.quest-attributes {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.patron,
	.pack {
		font-size: 0.9rem;
		color: #b0b0b0;
	}

	@media (max-width: 768px) {
		.quest-header {
			flex-direction: column;
			gap: 0.5rem;
		}

		.difficulty-buttons {
			grid-template-columns: 1fr 1fr;
		}

		.quest-attributes {
			flex-direction: column;
			gap: 0.25rem;
		}

		.quest-header-compact {
			padding: 0.5rem 0.75rem;
			gap: 0.75rem;
		}

		.quest-meta-compact {
			gap: 0.5rem;
			font-size: 0.8rem;
		}

		.quest-name-compact {
			font-size: 0.9rem;
		}

		.uncomplete-btn-compact {
			width: 24px;
			height: 24px;
			font-size: 0.75rem;
		}
	}

	.level-variant {
		font-size: 0.85em;
		color: #6c757d;
		font-weight: normal;
		margin-left: 0.5rem;
	}
</style>
