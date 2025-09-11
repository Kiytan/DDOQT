<script lang="ts">
	import { filters, quests } from '$lib/questStore.js';
	import { derived } from 'svelte/store';
	import type { QuestFilters } from '$lib/types.js';
	import ToggleButton from './ToggleButton.svelte';

	// Derive unique values for filter options
	const filterOptions = derived(quests, ($quests) => ({
		patrons: [...new Set($quests.map((q) => q.patron))].sort()
	}));

	let currentFilters: QuestFilters = {};
	let patronsExpanded = false; // State for patron filter collapse/expand
	let isExpanded = true; // State for entire filters section collapse/expand
	let showAutocomplete = false;
	let autocompleteResults: string[] = [];
	let selectedAutocompleteIndex = -1;
	let searchInput: HTMLInputElement;
	let debounceTimer: number;

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

	function updateFilters() {
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

	function clearFilters() {
		currentFilters = {
			sortBy: undefined,
			sortOrder: undefined,
			search: undefined
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
							on:input={updateFilters}
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
				<span class="filter-label">Completion Status:</span>
				<select bind:value={currentFilters.completed} on:change={updateFilters}>
					<option value={undefined}>All</option>
					<option value={true}>Completed</option>
					<option value={false}>Not Completed</option>
				</select>
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
						{#if !patronsExpanded && currentFilters.patron && currentFilters.patron.length > 0}
							<span class="filter-count">({currentFilters.patron.length} selected)</span>
						{/if}
					</div>
					{#if patronsExpanded}
						<div class="patron-list">
							{#each $filterOptions.patrons as patron}
								<label class="patron-label">
									<input
										type="checkbox"
										checked={currentFilters.patron?.includes(patron) || false}
										on:change={() => {
											currentFilters.patron = toggleArrayFilter(currentFilters.patron, patron);
											updateFilters();
										}}
									/>
									<span class="patron-name">{patron}</span>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

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
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem 1rem;
		margin-left: 1rem;
		margin-top: 0.5rem;
	}

	.patron-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
		color: #b0b0b0;
		font-size: 0.9rem;
	}

	.patron-label:hover {
		background-color: #404040;
	}

	.patron-label input[type='checkbox'] {
		margin: 0;
		cursor: pointer;
		accent-color: #d4af37;
	}

	.patron-name {
		flex: 1;
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
</style>
