<script lang="ts">
	import { quests, filters } from '$lib/questStore.js';
	import { derived } from 'svelte/store';

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
			'Shadow Over Wheloon',
			'The Secret of the Storm Horns'


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
		Expansions: true
	};

	function toggleAdventurePack(pack: string) {
		filters.update((currentFilters) => {
			const currentPacks = currentFilters.adventurePacks || [];
			const newPacks = currentPacks.includes(pack)
				? currentPacks.filter((p) => p !== pack)
				: [...currentPacks, pack];

			return {
				...currentFilters,
				adventurePacks: newPacks
			};
		});
	}

	function toggleAllInCategory(category: string) {
		const packsInCategory =
			$adventurePackCategories[category as keyof typeof $adventurePackCategories];

		filters.update((currentFilters) => {
			const currentPacks = currentFilters.adventurePacks || [];
			const allSelected = packsInCategory.every((pack) => currentPacks.includes(pack));

			let newPacks: string[];
			if (allSelected) {
				// Remove all packs in this category
				newPacks = currentPacks.filter((pack) => !packsInCategory.includes(pack));
			} else {
				// Add all packs in this category
				newPacks = [...new Set([...currentPacks, ...packsInCategory])];
			}

			return {
				...currentFilters,
				adventurePacks: newPacks
			};
		});
	}

	function isAllInCategorySelected(category: string): boolean {
		const packsInCategory =
			$adventurePackCategories[category as keyof typeof $adventurePackCategories];
		const currentPacks = $filters.adventurePacks || [];
		return packsInCategory.every((pack) => currentPacks.includes(pack));
	}

	function toggleFreeToPlay() {
		toggleAdventurePack('Free to Play');
	}

	function isFreeToPlaySelected(): boolean {
		const currentPacks = $filters.adventurePacks || [];
		return currentPacks.includes('Free to Play');
	}
</script>

<div class="adventure-pack-filters">
	<h3>Available Content</h3>

	<!-- Free to Play as top-level toggle -->
	<div class="ftp-toggle">
		<label class="ftp-label">
			<input type="checkbox" checked={isFreeToPlaySelected()} on:change={toggleFreeToPlay} />
			<strong>Free to Play</strong>
		</label>
	</div>

	{#each Object.entries($adventurePackCategories) as [categoryName, packs]}
		<div class="category-section">
			<div class="category-header">
				<label class="category-label">
					<input
						type="checkbox"
						checked={isAllInCategorySelected(categoryName)}
						on:change={() => toggleAllInCategory(categoryName)}
					/>
					<strong>{categoryName}</strong>
				</label>
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
						($filters.adventurePacks || []).includes(pack)
					)}
					{#if selectedInCategory.length > 0}
						<span class="category-count">({selectedInCategory.length}/{packs.length} selected)</span
						>
					{/if}
				{/if}
			</div>

			{#if categoryExpanded[categoryName]}
				<div class="pack-list">
					{#each packs as pack}
						{#if $allAdventurePacks.includes(pack)}
							<label class="pack-label">
								<input
									type="checkbox"
									checked={($filters.adventurePacks || []).includes(pack)}
									on:change={() => toggleAdventurePack(pack)}
								/>
								{pack}
							</label>
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

	.ftp-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
		color: #e0e0e0;
		font-weight: 500;
	}

	.ftp-label input[type='checkbox'] {
		margin: 0;
		accent-color: #d4af37;
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

	.category-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		color: #e0e0e0;
		font-size: 1rem;
		flex: 1;
	}

	.category-label input[type='checkbox'] {
		margin: 0;
		cursor: pointer;
	}

	.pack-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-left: 1.5rem;
	}

	.pack-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.25rem 0;
		border-radius: 4px;
		transition: background-color 0.2s ease;
		color: #b0b0b0;
		font-size: 0.9rem;
	}

	.pack-label:hover {
		background-color: #404040;
	}

	.pack-label input[type='checkbox'] {
		margin: 0;
		cursor: pointer;
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
		}
	}
</style>
