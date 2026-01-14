<script lang="ts">
	import { filters, quests } from '$lib/questStore.js';
	import { derived } from 'svelte/store';
	import type { QuestFilters, FilterState } from '$lib/types.js';
	import ToggleButton from './ToggleButton.svelte';
	import TriStateToggle from './TriStateToggle.svelte';

	// Derive unique values for filter options
	const filterOptions = derived(quests, ($quests) => ({
		patrons: [...new Set($quests.map((q) => q.patron))].sort()
	}));

	let currentFilters: QuestFilters = {};
	let patronsExpanded = false; // State for patron filter collapse/expand
	let levelFiltersExpanded = false; // State for level-based filters collapse/expand
	let isExpanded = true; // State for entire filters section collapse/expand
	let showAutocomplete = false;
	let autocompleteResults: string[] = [];
	let selectedAutocompleteIndex = -1;
	let searchInput: HTMLInputElement;
	let debounceTimer: number;
	let filterDebounceTimer: number;

	// Subscribe to filters store
	filters.subscribe((value) => {
		currentFilters = value;
	});

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	// Debounced autocomplete generation
	function generateAutocomplete(searchTerm: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (searchTerm && searchTerm.length > 0) {
				const term = searchTerm.toLowerCase();
				autocompleteResults = $quests
					.map((q) => q.name)
					.filter((name) => name.toLowerCase().includes(term))
					.filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates
					.sort()
					.slice(0, 8); // Limit to 8 suggestions
				showAutocomplete = autocompleteResults.length > 0;
			} else {
				showAutocomplete = false;
				autocompleteResults = [];
			}
		}, 150); // 150ms debounce
	}

	// Generate autocomplete suggestions with debouncing
	$: generateAutocomplete(currentFilters.search || '');

	// Debounced filter update for better performance with large datasets
	function updateFiltersDebounced() {
		clearTimeout(filterDebounceTimer);
		filterDebounceTimer = setTimeout(() => {
			updateFiltersImmediate();
		}, 100); // 100ms debounce for filter updates
	}

	function updateFiltersImmediate() {
		// Initialize sortOrder to 'asc' if sortBy is set but sortOrder is not
		if (currentFilters.sortBy && !currentFilters.sortOrder) {
			currentFilters.sortOrder = 'asc';
		}
		// Clear sortOrder if sortBy is cleared
		if (!currentFilters.sortBy) {
			currentFilters.sortOrder = undefined;
		}
		filters.set({ ...currentFilters });
	}

	// Use debounced version for text input, immediate for other controls
	function updateFilters() {
		updateFiltersImmediate();
	}

	function updateFiltersFromSearch() {
		updateFiltersDebounced();
	}

	function handleOnlyRaidsChange() {
		// When "Only Raids" is checked, automatically enable "Raids" filter
		if (currentFilters.onlyRaids) {
			currentFilters.raids = 'include';
		}
		updateFilters();
	}

	function getTriStateLabel(state: FilterState, baseName: string): string | null {
		if (state === 'include') return `+${baseName}`;
		if (state === 'exclude') return `-${baseName}`;
		return null;
	}

	function clearFilters() {
		currentFilters = {
			sortBy: undefined,
			sortOrder: undefined,
			search: undefined,
			heroic: undefined,
			epic: undefined,
			legendary: undefined,
			completed: undefined,
			patron: undefined
		};
		filters.set({});
	}

	function toggleArrayFilter(array: string[] | undefined, value: string): string[] {
		if (!array) return [value];
		if (array.includes(value)) {
			return array.filter((item) => item !== value);
		}
		return [...array, value];
	}

	function selectAutocomplete(questName: string) {
		currentFilters.search = questName;
		showAutocomplete = false;
		selectedAutocompleteIndex = -1;
		updateFilters();
		searchInput.blur();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!showAutocomplete) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedAutocompleteIndex = Math.min(
					selectedAutocompleteIndex + 1,
					autocompleteResults.length - 1
				);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedAutocompleteIndex >= 0) {
					selectAutocomplete(autocompleteResults[selectedAutocompleteIndex]);
				}
				break;
			case 'Escape':
				showAutocomplete = false;
				selectedAutocompleteIndex = -1;
				break;
		}
	}

	function handleBlur() {
		// Delay hiding to allow click events on autocomplete items
		setTimeout(() => {
			showAutocomplete = false;
			selectedAutocompleteIndex = -1;
		}, 150);
	}
</script>

<div class="filters">
	<div
		class="filters-header"
		on:click={toggleExpanded}
		on:keydown={(e) => e.key === 'Enter' && toggleExpanded()}
		role="button"
		tabindex="0"
		aria-expanded={isExpanded}
		aria-controls="filters-content"
	>
		<h3>Filters</h3>
		<ToggleButton {isExpanded} ariaControls="filters-content" />
	</div>

	{#if isExpanded}
		<div class="filters-content" id="filters-content">
			<div class="filter-group">
				<label>
					Search Quests:
					<div class="search-container">
						<input
							type="text"
							placeholder="Search by quest name..."
							bind:value={currentFilters.search}
							bind:this={searchInput}
							on:input={updateFiltersFromSearch}
							on:keydown={handleKeydown}
							on:blur={handleBlur}
							on:focus={() => (showAutocomplete = autocompleteResults.length > 0)}
							class="search-input"
							autocomplete="off"
						/>
						{#if showAutocomplete}
							<div class="autocomplete-dropdown">
								{#each autocompleteResults as suggestion, index}
									<button
										class="autocomplete-item"
										class:selected={index === selectedAutocompleteIndex}
										on:mousedown|preventDefault={() => selectAutocomplete(suggestion)}
										on:mouseenter={() => (selectedAutocompleteIndex = index)}
									>
										{suggestion}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</label>
			</div>

			<div class="filter-group">
				<label>
					Level Range:
					<input
						type="number"
						placeholder="Min"
						bind:value={currentFilters.minLevel}
						on:input={updateFilters}
						min="1"
						max="30"
					/>
					-
					<input
						type="number"
						placeholder="Max"
						bind:value={currentFilters.maxLevel}
						on:input={updateFilters}
						min="1"
						max="30"
					/>
				</label>
			</div>

			<div class="filter-group">
				<div class="filter-header">
					<div class="filter-label">
						<strong>Quest Type</strong>
					</div>
					<button
						class="toggle-button"
						on:click={() => (levelFiltersExpanded = !levelFiltersExpanded)}
						aria-label={levelFiltersExpanded ? 'Collapse level filters' : 'Expand level filters'}
					>
						{levelFiltersExpanded ? '▼' : '▶'}
					</button>
					{#if !levelFiltersExpanded}
						{@const activeLevelFilters = [
							getTriStateLabel(currentFilters.heroic, 'Heroic'),
							getTriStateLabel(currentFilters.epic, 'Epic'), 
							getTriStateLabel(currentFilters.legendary, 'Legendary'),
							getTriStateLabel(currentFilters.raids, 'Raids'),
							currentFilters.onlyRaids && 'Only Raids',
							currentFilters.noEpicLegendaryVersions && 'Unique only'
						].filter(Boolean)}
						{#if activeLevelFilters.length > 0}
							<span class="filter-count">({activeLevelFilters.length} active)</span>
						{/if}
					{/if}
				</div>
				{#if levelFiltersExpanded}
					<div class="level-filters-content">
						<div class="quest-tier-section">
							<div class="tier-group">
								<span class="filter-label">Quest Tier:</span>
								<div class="quest-tier-filters">
									<TriStateToggle
										value={currentFilters.heroic}
										label="Heroic (1-19)"
										colorClass="heroic"
										onToggle={(value) => {
											currentFilters.heroic = value;
											updateFilters();
										}}
									/>
									<TriStateToggle
										value={currentFilters.epic}
										label="Epic (20-29)"
										colorClass="epic"
										onToggle={(value) => {
											currentFilters.epic = value;
											updateFilters();
										}}
									/>
									<TriStateToggle
										value={currentFilters.legendary}
										label="Legendary (30+)"
										colorClass="legendary"
										onToggle={(value) => {
											currentFilters.legendary = value;
											updateFilters();
										}}
									/>
								</div>
							</div>
							<div class="type-group">
								<span class="filter-label">Quest Type:</span>
								<div class="quest-tier-filters">
									<TriStateToggle
										value={currentFilters.raids}
										label="Raids"
										colorClass="raid"
										onToggle={(value) => {
											currentFilters.raids = value;
											updateFilters();
										}}
									/>
									<button
										class="boolean-toggle {currentFilters.onlyRaids ? 'checked' : 'unchecked'}"
										on:click={() => {
											currentFilters.onlyRaids = !currentFilters.onlyRaids;
											handleOnlyRaidsChange();
										}}
										title={currentFilters.onlyRaids ? 'Enabled: Only Raids' : 'Disabled: Only Raids'}
										aria-label={currentFilters.onlyRaids ? 'Enabled: Only Raids' : 'Disabled: Only Raids'}
									>
										<div class="checkbox {currentFilters.onlyRaids ? 'checked' : 'unchecked'}">
											<span class="checkbox-icon">{currentFilters.onlyRaids ? '✓' : ''}</span>
										</div>
										<span class="toggle-label only-raids">Only Raids</span>
									</button>
								</div>
							</div>
						</div>
						<div class="unique-quests-section">
							<button
								class="boolean-toggle {currentFilters.noEpicLegendaryVersions ? 'checked' : 'unchecked'}"
								on:click={() => {
									currentFilters.noEpicLegendaryVersions = !currentFilters.noEpicLegendaryVersions;
									updateFilters();
								}}
								title={currentFilters.noEpicLegendaryVersions ? 'Enabled: Only quests without Epic/Legendary versions' : 'Disabled: Only quests without Epic/Legendary versions'}
								aria-label={currentFilters.noEpicLegendaryVersions ? 'Enabled: Only quests without Epic/Legendary versions' : 'Disabled: Only quests without Epic/Legendary versions'}
							>
								<div class="checkbox {currentFilters.noEpicLegendaryVersions ? 'checked' : 'unchecked'}">
									<span class="checkbox-icon">{currentFilters.noEpicLegendaryVersions ? '✓' : ''}</span>
								</div>
								<span class="toggle-label">Only quests without Epic/Legendary versions</span>
							</button>
						</div>
					</div>
				{/if}
			</div>

			{#if $filterOptions.patrons.length > 0}
				<div class="filter-group">
					<div class="filter-header">
						<div class="filter-label">
							<strong>Patron</strong>
						</div>
						<button
							class="toggle-button"
							on:click={() => (patronsExpanded = !patronsExpanded)}
							aria-label={patronsExpanded ? 'Collapse patron filters' : 'Expand patron filters'}
						>
							{patronsExpanded ? '▼' : '▶'}
						</button>
						{#if !patronsExpanded && currentFilters.patron}
							{@const activePatronFilters = Object.entries(currentFilters.patron).filter(([_, state]) => state !== undefined)}
							{#if activePatronFilters.length > 0}
								<span class="filter-count">({activePatronFilters.length} active)</span>
							{/if}
						{/if}
					</div>
					{#if patronsExpanded}
						<div class="patron-list">
							{#each $filterOptions.patrons as patron}
								<TriStateToggle
									value={currentFilters.patron?.[patron]}
									label={patron}
									onToggle={(value) => {
										if (!currentFilters.patron) {
											currentFilters.patron = {};
										}
										if (value === undefined) {
											delete currentFilters.patron[patron];
											// If no patrons are filtered, clear the object
											if (Object.keys(currentFilters.patron).length === 0) {
												currentFilters.patron = undefined;
											}
										} else {
											currentFilters.patron[patron] = value;
										}
										updateFilters();
									}}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="filter-group">
				<span class="filter-label">Completion Status:</span>
				<TriStateToggle
					value={currentFilters.completed}
					label="Completed"
					onToggle={(value) => {
						currentFilters.completed = value;
						updateFilters();
					}}
				/>
			</div>

			<div class="filter-group">
				<span class="filter-label">Sort By:</span>
				<div class="sort-controls">
					<select bind:value={currentFilters.sortBy} on:change={updateFilters}>
						<option value={undefined}>Default</option>
						<option value="name">Name</option>
						<option value="level">Level</option>
						<option value="baseFavor">Base Favor</option>
						<option value="patron">Patron</option>
					</select>
					{#if currentFilters.sortBy}
						<select bind:value={currentFilters.sortOrder} on:change={updateFilters}>
							<option value="asc">Ascending</option>
							<option value="desc">Descending</option>
						</select>
					{/if}
				</div>
			</div>

			<button on:click={clearFilters} class="clear-button">Clear All Filters</button>
		</div>
	{/if}
</div>

<style>
	.filters {
		background: #1c2126;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #404040;
		color: #e0e0e0;
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		margin-bottom: 1rem;
		padding: 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.filters-header:hover {
		background: rgba(212, 175, 55, 0.1);
	}

	.filters-header:focus {
		outline: 2px solid #d4af37;
		outline-offset: 2px;
	}

	.filters-content {
		animation: slideDown 0.3s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
		}
		to {
			opacity: 1;
			max-height: 1000px;
		}
	}

	.filters h3 {
		margin: 0;
		color: #d4af37;
		font-size: 1.2rem;
	}

	.filter-group {
		margin-bottom: 1rem;
	}

	.filter-group label {
		display: block;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #e0e0e0;
	}

	.filter-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		color: #e0e0e0;
		font-size: 1rem;
		flex: 1;
		font-weight: normal;
	}

	.filter-header {
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.patron-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 0.5rem;
		margin-left: 1rem;
		margin-top: 0.5rem;
		max-height: 400px;
		overflow-y: auto;
	}

	/* Responsive breakpoints for patron columns */
	@media (min-width: 768px) {
		.patron-list {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1200px) {
		.patron-list {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.filter-count {
		font-size: 0.85rem;
		color: #888;
		font-style: italic;
		white-space: nowrap;
	}

	input[type='number'] {
		width: 80px;
		padding: 0.25rem;
		margin: 0 0.25rem;
		background: #1a1a1a;
		border: 1px solid #555;
		color: #e0e0e0;
		border-radius: 4px;
	}

	input[type='number']:focus {
		outline: none;
		border-color: #d4af37;
	}

	select {
		padding: 0.25rem;
		width: 150px;
		background: #1a1a1a;
		border: 1px solid #555;
		color: #e0e0e0;
		border-radius: 4px;
	}

	select:focus {
		outline: none;
		border-color: #d4af37;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #555;
		border-radius: 4px;
		background: #1a1a1a;
		color: #e0e0e0;
		font-size: 0.9rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #d4af37;
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
	}

	.search-input::placeholder {
		color: #888;
	}

	.search-container {
		position: relative;
		width: 100%;
	}

	.autocomplete-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: #1a1a1a;
		border: 1px solid #555;
		border-top: none;
		border-radius: 0 0 4px 4px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.autocomplete-item {
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		color: #e0e0e0;
		text-align: left;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s ease;
	}

	.autocomplete-item:hover,
	.autocomplete-item.selected {
		background: #d4af37;
		color: #1a1a1a;
	}

	.autocomplete-item:first-child {
		border-radius: 0;
	}

	.autocomplete-item:last-child {
		border-radius: 0 0 4px 4px;
	}

	.sort-controls {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.sort-controls select {
		flex: 1;
		min-width: 100px;
	}

	.clear-button {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.clear-button:hover {
		background: #c82333;
	}

	.filter-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
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
	}

	.toggle-button:hover {
		background: rgba(212, 175, 55, 0.1);
	}

	.filter-count {
		font-size: 0.85rem;
		color: #888;
		font-style: italic;
	}

	.quest-tier-filters {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.level-filters-content {
		margin-top: 1rem;
		padding-left: 1rem;
		border-left: 2px solid #404040;
	}

	.quest-tier-section {
		margin-bottom: 1rem;
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.tier-group,
	.type-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.unique-quests-section {
		margin-bottom: 0.5rem;
	}

	.boolean-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0;
		border: none;
		background: transparent;
		color: #e0e0e0;
		cursor: pointer;
		font-size: 0.9rem;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
	}

	.boolean-toggle:hover .checkbox {
		border-color: #d4af37;
		background: rgba(212, 175, 55, 0.05);
	}

	.boolean-toggle .checkbox {
		width: 16px;
		height: 16px;
		border: 2px solid #555;
		border-radius: 3px;
		background: #1a1a1a;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		position: relative;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.boolean-toggle .checkbox.unchecked {
		border-color: #555;
		background: #1a1a1a;
	}

	.boolean-toggle .checkbox.checked {
		border-color: #10b981;
		background: #10b981;
	}

	.boolean-toggle .checkbox-icon {
		font-weight: bold;
		font-size: 12px;
		line-height: 1;
		color: white;
	}

	.boolean-toggle .toggle-label {
		font-weight: 400;
		user-select: none;
		flex: 1;
		word-break: break-word;
		line-height: 1.3;
		overflow-wrap: break-word;
		hyphens: auto;
		white-space: normal;
		width: 0;
	}
</style>
