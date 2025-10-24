<script lang="ts">
	import { quests, completedQuests, applySagaFilter } from '$lib/questStore.js';
	import type { Quest } from '$lib/types.js';
	import { derived } from 'svelte/store';
	import { onMount } from 'svelte';
	import ToggleButton from './ToggleButton.svelte';

	let isSagaProgressExpanded = true; // Main panel expansion state
	let sagaDefinitions: any[] = [];
	let selectedTier: 'Heroic' | 'Epic' | 'Legendary' = 'Heroic';
	let expandedSagas: Record<string, boolean> = {}; // Track expanded state for each saga

	// Toggle main panel expansion
	function toggleMainPanel() {
		isSagaProgressExpanded = !isSagaProgressExpanded;
	}

	// Toggle individual saga expansion
	function toggleSagaExpansion(sagaKey: string, event: Event) {
		event.stopPropagation();
		expandedSagas[sagaKey] = !expandedSagas[sagaKey];
	}

	// Apply saga filter
	function filterToSaga(questIds: string[], tier: 'Heroic' | 'Epic' | 'Legendary', event: Event) {
		event.stopPropagation();
		applySagaFilter(questIds, tier);
	}

	// Load saga data
	onMount(async () => {
		try {
			const response = await fetch('/sagas.json');
			sagaDefinitions = await response.json();
		} catch (error) {
			console.error('Failed to load saga data:', error);
		}
	});

	// Calculate saga progress - using $: reactive statement to recalculate when selectedTier changes
	$: sagaProgress = sagaDefinitions
		.filter((saga) => saga.tier === selectedTier)
		.map((saga) => {
			// Match quests by ID if questIds are provided
			let sagaQuests: Quest[] = [];
			if (saga.questIds && saga.questIds.length > 0) {
				const questIdSet = new Set(saga.questIds);
				sagaQuests = $quests.filter((q) => questIdSet.has(q.id));
			}

			const completedCount = sagaQuests.filter((q) => $completedQuests[q.id]).length;
			const totalCount = saga.questCount; // Use expected quest count from saga definition
			const foundCount = sagaQuests.length;
			const percentage =
				foundCount > 0 ? Math.round((completedCount / foundCount) * 100) : 0;

			return {
				name: saga.name,
				completed: completedCount,
				total: totalCount,
				found: foundCount,
				level: saga.level,
				percentage,
				quests: sagaQuests.sort((a, b) => a.level - b.level) // Sort quests by level
			};
		});
</script>

<div class="saga-progress-panel">
	<div
		class="saga-header"
		on:click={toggleMainPanel}
		on:keydown={(e) => e.key === 'Enter' && toggleMainPanel()}
		role="button"
		tabindex="0"
		aria-expanded={isSagaProgressExpanded}
		aria-controls="saga-progress-content"
	>
		<div class="header-left">
			<ToggleButton
				isExpanded={isSagaProgressExpanded}
				ariaControls="saga-progress-content"
				size="medium"
			/>
			<h3>Saga Progress</h3>
		</div>
	</div>

	{#if isSagaProgressExpanded}
		<div class="tier-selector">
			<button
				class="tier-btn heroic-tier"
				class:active={selectedTier === 'Heroic'}
				on:click={(e) => {
					e.stopPropagation();
					selectedTier = 'Heroic';
				}}
			>
				Heroic
			</button>
			<button
				class="tier-btn epic-tier"
				class:active={selectedTier === 'Epic'}
				on:click={(e) => {
					e.stopPropagation();
					selectedTier = 'Epic';
				}}
			>
				Epic
			</button>
			<button
				class="tier-btn legendary-tier"
				class:active={selectedTier === 'Legendary'}
				on:click={(e) => {
					e.stopPropagation();
					selectedTier = 'Legendary';
				}}
			>
				Legendary
			</button>
		</div>
	{/if}

	{#if isSagaProgressExpanded}
		<div class="saga-list" id="saga-progress-content">
			{#each sagaProgress as saga (saga.name + saga.level)}
				{@const sagaKey = `${saga.name}-${saga.level}`}
				<div class="saga-card">
					<div class="saga-header-wrapper">
						<div
							class="saga-header-row"
							on:click={(e) => saga.quests.length > 0 && toggleSagaExpansion(sagaKey, e)}
							on:keydown={(e) =>
								e.key === 'Enter' && saga.quests.length > 0 && toggleSagaExpansion(sagaKey, e)}
							role="button"
							tabindex="0"
							class:clickable={saga.quests.length > 0}
							aria-expanded={expandedSagas[sagaKey]}
							aria-controls="saga-quests-{sagaKey}"
						>
							<div class="saga-info">
								<div class="saga-name-row">
									{#if saga.quests.length > 0}
										<ToggleButton
											isExpanded={expandedSagas[sagaKey] || false}
											ariaControls="saga-quests-{sagaKey}"
											size="small"
										/>
									{/if}
									<h4 class="saga-name">{saga.name}</h4>
									<span class="saga-level">Lvl {saga.level}</span>
								</div>
								<div class="saga-stats">
									<span class="saga-count"
										>{saga.completed}/{saga.found > 0 ? saga.found : saga.total}</span
									>
									<span class="saga-percentage">{saga.percentage}%</span>
								</div>
							</div>
						</div>
						{#if saga.quests.length > 0}
							{@const sagaQuestIds = sagaDefinitions
								.find((s) => s.name === saga.name && s.tier === selectedTier)
								?.questIds || []}
							<button
								class="filter-saga-btn"
								on:click={(e) => filterToSaga(sagaQuestIds, selectedTier, e)}
								title="Filter quests to this saga"
								aria-label="Filter quests to show only {saga.name}"
							>
								🔍
							</button>
						{/if}
					</div>
					<div class="saga-progress">
						<div class="saga-progress-bar">
							<div class="saga-progress-fill" style="width: {saga.percentage}%"></div>
						</div>
					</div>

					{#if expandedSagas[sagaKey] && saga.quests.length > 0}
						<div class="saga-quest-list" id="saga-quests-{sagaKey}">
							{#each saga.quests as quest (quest.id)}
								{@const completionData = $completedQuests[quest.id]}
								{@const difficulty = completionData?.difficulty}
								{@const bgColor = difficulty === 'Normal' ? '#1a2e1a' :
								                  difficulty === 'Hard' ? '#2e2a1a' :
								                  difficulty === 'Elite' ? '#2e1f1a' :
								                  difficulty === 'Reaper' ? '#2e1a1a' : '#2a2a2a'}
								{@const borderColor = difficulty === 'Normal' ? '#28a745' :
								                      difficulty === 'Hard' ? '#ffc107' :
								                      difficulty === 'Elite' ? '#fd7e14' :
								                      difficulty === 'Reaper' ? '#dc3545' : '#666'}
								<div 
									class="saga-quest-item" 
									class:completed={completionData}
									style={completionData ? `background: ${bgColor}; border-left-color: ${borderColor}` : ''}
								>
									<div class="quest-info">
										<span class="quest-name">{quest.name}</span>
										<span class="quest-level">Lvl {quest.level}</span>
									</div>
									{#if completionData}
										<div class="quest-completion">
											<span class="difficulty-badge {difficulty.toLowerCase()}"
												>{difficulty}</span
											>
											<span class="checkmark">✓</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.saga-progress-panel {
		background: #1c2126;
		border: 2px solid #404040;
		border-radius: 12px;
		padding: 1.5rem;
		height: fit-content;
		color: #e0e0e0;
		margin-top: 1rem;
	}

	.saga-progress-panel h3 {
		margin: 0;
		color: #d4af37;
		font-size: 1.25rem;
		font-weight: 500;
	}

	.saga-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 6px;
		transition: background-color 0.2s ease;
	}

	.saga-header:hover {
		background-color: rgba(212, 175, 55, 0.1);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tier-selector {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1rem;
		padding: 0 0.25rem;
	}

	.tier-btn {
		flex: 1;
		background: #404040;
		color: #e0e0e0;
		border: 1px solid #555;
		padding: 0.4rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.tier-btn:hover {
		background: #4a4a4a;
		border-color: #666;
	}

	.tier-btn.heroic-tier.active {
		background: #10b981;
		border-color: #10b981;
		color: white;
	}

	.tier-btn.epic-tier.active {
		background: #a855f7;
		border-color: #a855f7;
		color: white;
	}

	.tier-btn.legendary-tier.active {
		background: #ea580c;
		border-color: #ea580c;
		color: white;
	}

	.saga-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.saga-card {
		background: #3a3a3a;
		border: 1px solid #4a4a4a;
		border-radius: 6px;
		padding: 0.75rem;
		transition: all 0.2s ease;
	}

	.saga-header-wrapper {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.saga-header-row {
		flex: 1;
		transition: background-color 0.2s ease;
		border-radius: 4px;
		padding: 0.25rem;
		margin: -0.25rem;
	}

	.saga-header-row.clickable {
		cursor: pointer;
	}

	.saga-header-row.clickable:hover {
		background-color: rgba(157, 78, 221, 0.1);
	}

	.saga-card:hover {
		border-color: #9d4edd;
		background: #404040;
	}

	.filter-saga-btn {
		background: transparent;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.4rem 0.6rem;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s ease;
		flex-shrink: 0;
		height: fit-content;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: -0.25rem;
	}

	.filter-saga-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: scale(1.05);
	}

	.filter-saga-btn:active {
		transform: scale(0.95);
	}

	.saga-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.saga-name-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.saga-name {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: #d4af37;
		flex: 1;
	}

	.saga-level {
		font-size: 0.75rem;
		color: #888;
		font-weight: 500;
	}

	.saga-stats {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		align-items: center;
	}

	.saga-count {
		font-size: 0.8rem;
		color: #b0b0b0;
		font-weight: 500;
	}

	.saga-percentage {
		font-size: 0.8rem;
		font-weight: bold;
		color: #9d4edd;
		min-width: 35px;
		text-align: right;
	}

	.saga-progress {
		margin-top: 0.5rem;
	}

	.saga-progress-bar {
		width: 100%;
		height: 4px;
		background: #2a2a2a;
		border-radius: 2px;
		overflow: hidden;
	}

	.saga-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #9d4edd, #c77dff);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.saga-quest-list {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #555;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.saga-quest-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: #2a2a2a;
		border-radius: 4px;
		border-left: 3px solid #666;
		transition: all 0.2s ease;
	}

	.saga-quest-item:hover {
		filter: brightness(1.15);
	}

	.quest-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.quest-name {
		color: #e0e0e0;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.quest-level {
		color: #888;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.quest-completion {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.difficulty-badge {
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.difficulty-badge.normal {
		background: #28a745;
		color: white;
	}

	.difficulty-badge.hard {
		background: #ffc107;
		color: white;
	}

	.difficulty-badge.elite {
		background: #fd7e14;
		color: white;
	}

	.difficulty-badge.reaper {
		background: #dc3545;
		color: white;
	}

	.checkmark {
		color: #28a745;
		font-size: 1rem;
		font-weight: bold;
	}

	@media (max-width: 768px) {
		.saga-progress-panel {
			margin-bottom: 1rem;
		}

		.tier-selector {
			flex-direction: column;
		}

		.tier-btn {
			width: 100%;
		}

		.saga-header-wrapper {
			gap: 0.25rem;
		}

		.filter-saga-btn {
			padding: 0.3rem 0.5rem;
			font-size: 0.9rem;
		}

		.quest-info {
			flex-wrap: wrap;
		}

		.quest-name {
			font-size: 0.8rem;
		}

		.quest-completion {
			flex-direction: column;
			gap: 0.25rem;
		}
	}
</style>
