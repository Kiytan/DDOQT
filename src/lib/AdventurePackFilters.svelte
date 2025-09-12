<script lang="ts">
	import { quests, filters } from '$lib/questStore.js';
	import { derived } from 'svelte/store';
	import TriStateToggle from './TriStateToggle.svelte';
	import type { FilterState } from '$lib/types.js';

	// Define only the specific categories that need to be separated
	const fixedCategories = {
		Expansions: [
			'Shadowfell Conspiracy',
			'Menace of the Underdark',
			'Vecna Unleashed',
			'Sinister Secret of Saltmarsh',
			'Fables of the Feywild',
			'The Isle of Dread',
			'Mists of Ravenloft',
			'Magic of Myth Drannor',
			'Masterminds of Sharn',
			'The Chill of Ravenloft'
		]
	};

	// Get all unique adventure packs from quest data and categorize them
	const allAdventurePacks = derived(quests, ($quests) => {
		const packs = new Set($quests.map((quest) => quest.adventurePack));
		return Array.from(packs).sort();
	});

	// Create dynamic adventure pack categories (excluding Free to Play)
	const adventurePackCategories = derived(allAdventurePacks, ($allAdventurePacks) => {
		// Get all packs that are already in fixed categories (plus Free to Play)
		const categorizedPacks = new Set(['Free to Play', ...fixedCategories['Expansions']]);

		// Everything else goes into Adventure Packs
		const adventurePacks = $allAdventurePacks.filter((pack) => !categorizedPacks.has(pack));

		return {
			'Adventure Packs': adventurePacks,
			Expansions: fixedCategories['Expansions']
		};
	});

	// State for collapsible categories
	let categoryExpanded: Record<string, boolean> = {
		'Adventure Packs': false, // Start collapsed since this is the longest list
		Expansions: false // Start collapsed
	};

	function toggleAdventurePack(pack: string, newState: FilterState) {
		filters.update((currentFilters) => {
			const currentPacks = currentFilters.adventurePacks || {};
			const newPacks = { ...currentPacks };

			if (newState === undefined) {
				delete newPacks[pack];
				// If no packs are filtered, clear the object
				if (Object.keys(newPacks).length === 0) {
					return {
						...currentFilters,
						adventurePacks: undefined
					};
				}
			} else {
				newPacks[pack] = newState;
			}

			return {
				...currentFilters,
				adventurePacks: newPacks
			};
		});
	}

	function getActivePackCount(): number {
		const currentPacks = $filters.adventurePacks || {};
		return Object.values(currentPacks).filter(state => state !== undefined).length;
	}

	function toggleCategoryPacks(categoryName: string, packs: string[], value: FilterState) {
		filters.update((currentFilters) => {
			const currentPacks = currentFilters.adventurePacks || {};
			const newPacks = { ...currentPacks };

			if (value === undefined) {
				// Clear all packs in this category
				packs.forEach(pack => {
					if ($allAdventurePacks.includes(pack)) {
						delete newPacks[pack];
					}
				});
			} else {
				// Set all packs in this category to the specified state
				packs.forEach(pack => {
					if ($allAdventurePacks.includes(pack)) {
						newPacks[pack] = value;
					}
				});
			}

			return {
				...currentFilters,
				adventurePacks: Object.keys(newPacks).length > 0 ? newPacks : undefined
			};
		});
	}

	function getCategoryState(packs: string[]): FilterState {
		const currentPacks = $filters.adventurePacks || {};
		const availablePacks = packs.filter(pack => $allAdventurePacks.includes(pack));
		
		if (availablePacks.length === 0) return undefined;
		
		let includeCount = 0;
		let excludeCount = 0;
		let undefinedCount = 0;
		
		availablePacks.forEach(pack => {
			const state = currentPacks[pack];
			if (state === 'include') includeCount++;
			else if (state === 'exclude') excludeCount++;
			else undefinedCount++;
		});
		
		// All packs are set to 'include'
		if (includeCount === availablePacks.length) return 'include';
		// All packs are set to 'exclude'
		if (excludeCount === availablePacks.length) return 'exclude';
		// Mixed states or some undefined
		return undefined;
	}
</script>

<div class="adventure-pack-filters">
	<h3>Available Content</h3>
	{#if getActivePackCount() > 0}
		<p class="active-count">{getActivePackCount()} content filters active</p>
	{/if}

	<!-- Free to Play as top-level toggle -->
	<div class="ftp-toggle">
		<TriStateToggle
			value={$filters.adventurePacks?.['Free to Play']}
			label="Free to Play"
			onToggle={(value) => toggleAdventurePack('Free to Play', value)}
		/>
	</div>

	{#each Object.entries($adventurePackCategories) as [categoryName, packs]}
		<div class="category-section">
			<div class="category-header">
				<strong>{categoryName}</strong>
				<button
					class="toggle-button"
					on:click={() => (categoryExpanded[categoryName] = !categoryExpanded[categoryName])}
					aria-label={categoryExpanded[categoryName]
						? `Collapse ${categoryName}`
						: `Expand ${categoryName}`}
				>
					{categoryExpanded[categoryName] ? '▼' : '▶'}
				</button>
				{#if !categoryExpanded[categoryName]}
					{@const selectedInCategory = packs.filter((pack) =>
						$filters.adventurePacks?.[pack] !== undefined
					)}
					{#if selectedInCategory.length > 0}
						<span class="category-count">({selectedInCategory.length}/{packs.length} active)</span>
					{/if}
				{/if}
			</div>

			{#if categoryExpanded[categoryName]}
				<div class="category-select-all">
					<TriStateToggle
						value={getCategoryState(packs)}
						label="Select All {categoryName}"
						onToggle={(value) => toggleCategoryPacks(categoryName, packs, value)}
					/>
				</div>
				<div class="pack-list">
					{#each packs as pack (pack)}
						{#if $allAdventurePacks.includes(pack)}
							<TriStateToggle
								value={$filters.adventurePacks?.[pack]}
								label={pack}
								onToggle={(value) => toggleAdventurePack(pack, value)}
							/>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.adventure-pack-filters {
		background: #1c2126;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		height: fit-content;
		border: 1px solid #404040;
		color: #e0e0e0;
		box-sizing: border-box;
		contain: layout;
	}

	.adventure-pack-filters h3 {
		margin: 0 0 1rem 0;
		color: #d4af37;
		font-size: 1.2rem;
		border-bottom: 2px solid #d4af37;
		padding-bottom: 0.5rem;
	}

	.ftp-toggle {
		margin-bottom: 1.5rem;
	}

	.category-section {
		margin-bottom: 1.5rem;
	}

	.category-section:last-child {
		margin-bottom: 0;
	}

	.category-header {
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.category-header strong {
		color: #e0e0e0;
		font-size: 1rem;
		flex: 1;
	}

	.category-select-all {
		margin-left: 1.5rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #333;
	}

	.pack-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.5rem 1rem;
		margin-left: 1.5rem;
		align-items: start;
		box-sizing: border-box;
	}

	.toggle-button {
		background: none;
		border: none;
		color: #d4af37;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.2rem 0.4rem;
		border-radius: 2px;
		transition: background-color 0.2s;
		min-width: 24px;
	}

	.toggle-button:hover {
		background: rgba(212, 175, 55, 0.1);
	}

	.category-count {
		font-size: 0.85rem;
		color: #888;
		font-style: italic;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.adventure-pack-filters {
			position: static;
			margin-bottom: 1rem;
		}

		.pack-list {
			margin-left: 1rem;
			grid-template-columns: 1fr;
		}
	}
</style>
