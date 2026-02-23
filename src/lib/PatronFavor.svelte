<script lang="ts">
	import { quests, completedQuests, calculateFavor } from '$lib/questStore.js';
	import type { Quest } from '$lib/types.js';
	import { derived } from 'svelte/store';
	import { onMount } from 'svelte';
	import ToggleButton from './ToggleButton.svelte';

	let sortByFavor = false;
	let questGroupsCache = new Map<string, Quest[]>();
	let lastQuestHash = '';
	let favorTiers: any[] = [];
	let patronExpansionState: Record<string, boolean> = {}; // Individual patron expansion states
	let isPatronFavorExpanded = false; // Main panel expansion state - collapsed by default

	// Load favor tiers data
	onMount(async () => {
		try {
			const response = await fetch('/favor-tiers.json');
			favorTiers = await response.json();
		} catch (error) {
			console.error('Failed to load favor tiers:', error);
		}
	});

	// Helper function to get favor data for a patron
	function getPatronFavorData(patronName: string) {
		return favorTiers.find((f) => f.name === patronName);
	}

	// Helper function to get wiki link for a patron
	function getWikiLink(patronName: string): string {
		const favorData = favorTiers.find((f) => f.name === patronName);
		if (favorData && favorData.link) {
			// Replace spaces with underscores for wiki URLs
			return `https://ddowiki.com/page/${favorData.link.replace(/ /g, '_')}`;
		}
		return '';
	}

	// Toggle main panel expansion
	function toggleMainPanel() {
		isPatronFavorExpanded = !isPatronFavorExpanded;
	}

	// Toggle individual patron expansion
	function togglePatronExpansion(patronName: string) {
		patronExpansionState[patronName] = !patronExpansionState[patronName];
	}

	// Helper function to display patron name properly
	function getDisplayName(patronName: string): string {
		return patronName.replace('<br>', ' ');
	}

	// Helper function to check if this is the Total Favor patron
	function isTotalFavorPatron(patronName: string): boolean {
		return patronName.includes('Total Favor');
	}

	function toggleSort() {
		sortByFavor = !sortByFavor;
	}

	function getSortableName(patronName: string): string {
		// Remove "House " prefix for sorting purposes
		return patronName.replace(/^House\s+/i, '');
	}

	// Memoized quest group calculation
	function getQuestGroups(quests: Quest[]): Map<string, Quest[]> {
		const questHash = JSON.stringify(quests.map((q) => q.id)).slice(0, 100); // Simple hash

		if (questHash === lastQuestHash && questGroupsCache.size > 0) {
			return questGroupsCache;
		}

		questGroupsCache.clear();
		quests.forEach((quest) => {
			const groupKey = quest.baseQuestId || quest.id;
			if (!questGroupsCache.has(groupKey)) {
				questGroupsCache.set(groupKey, []);
			}
			questGroupsCache.get(groupKey)!.push(quest);
		});

		lastQuestHash = questHash;
		return questGroupsCache;
	}

	// Calculate favor by patron
	const patronFavor = derived([quests, completedQuests], ([$quests, $completed]) => {
		const patronStats = new Map<string, { earned: number; total: number }>();

		// Use memoized quest groups calculation
		const questGroups = getQuestGroups($quests);

		// Initialize all patrons with 0
		$quests.forEach((quest) => {
			if (!patronStats.has(quest.patron)) {
				patronStats.set(quest.patron, { earned: 0, total: 0 });
			}
		});

		// Calculate totals and earned favor using quest groups
		Array.from(questGroups.values()).forEach((questGroup) => {
			// Use the first quest in the group for patron assignment
			const patron = questGroup[0].patron;
			const stats = patronStats.get(patron)!;

			// Add maximum possible favor from highest base favor variant in group
			const highestBaseFavor = Math.max(...questGroup.map((q) => q.baseFavor));
			stats.total += calculateFavor(highestBaseFavor, 'Elite');

			// Find highest earned favor from any completed variant in this group
			const completedInGroup = questGroup
				.map((quest) => ({ quest, completion: $completed[quest.id] }))
				.filter((item) => item.completion);

			if (completedInGroup.length > 0) {
				const highestGroupFavor = Math.max(
					...completedInGroup.map((item) =>
						calculateFavor(item.quest.baseFavor, item.completion.difficulty)
					)
				);
				stats.earned += highestGroupFavor;
			}
		});

		// Convert to array and add Total Favor entry
		const patronArray = Array.from(patronStats.entries()).map(([patron, stats]) => ({
			patron,
			earned: stats.earned,
			total: stats.total,
			percentage: stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0
		}));

		// Add Total Favor entry
		const totalEarned = patronArray.reduce((sum, p) => sum + p.earned, 0);
		const totalPossible = patronArray.reduce((sum, p) => sum + p.total, 0);

		patronArray.unshift({
			patron: 'Total Favor<br>Account Rewards',
			earned: totalEarned,
			total: totalPossible,
			percentage: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0
		});

		return patronArray;
	});

	// Reactive sorted patron favor
	$: sortedPatronFavor = $patronFavor.slice().sort((a, b) => {
		// Keep "Total Favor" at the top
		if (a.patron.includes('Total Favor')) return -1;
		if (b.patron.includes('Total Favor')) return 1;

		if (sortByFavor) {
			// Sort by earned favor (descending), then by name
			if (b.earned !== a.earned) return b.earned - a.earned;
			return getSortableName(a.patron).localeCompare(getSortableName(b.patron));
		} else {
			// Sort alphabetically, ignoring "House"
			return getSortableName(a.patron).localeCompare(getSortableName(b.patron));
		}
	});
</script>

<div class="patron-favor-panel">
	<div
		class="favor-header"
		on:click={toggleMainPanel}
		on:keydown={(e) => e.key === 'Enter' && toggleMainPanel()}
		role="button"
		tabindex="0"
		aria-expanded={isPatronFavorExpanded}
		aria-controls="patron-favor-content"
	>
		<div class="header-left">
			<ToggleButton
				isExpanded={isPatronFavorExpanded}
				ariaControls="patron-favor-content"
				size="medium"
			/>
			<h3>Patron Favor Progress</h3>
		</div>
		<div class="sort-controls">
			<button
				class="sort-toggle"
				class:active={!sortByFavor}
				on:click={(e) => {
					e.stopPropagation();
					toggleSort();
				}}
				title="Sort alphabetically"
			>
				A-Z
			</button>
			<button
				class="sort-toggle"
				class:active={sortByFavor}
				on:click={(e) => {
					e.stopPropagation();
					toggleSort();
				}}
				title="Sort by earned favor"
			>
				Favor
			</button>
		</div>
	</div>

	{#if isPatronFavorExpanded}
		<div class="patron-list" id="patron-favor-content">
			{#each sortedPatronFavor as patron (patron.patron)}
			{@const wikiLink = getWikiLink(patron.patron)}
			<div class="patron-card" class:total-favor={isTotalFavorPatron(patron.patron)}>
				<div
					class="patron-header"
					on:click={() => togglePatronExpansion(patron.patron)}
					on:keydown={(e) => e.key === 'Enter' && togglePatronExpansion(patron.patron)}
					role="button"
					tabindex="0"
					aria-expanded={patronExpansionState[patron.patron]}
					aria-controls="patron-details-{patron.patron}"
				>
				<h4 class="patron-name">{getDisplayName(patron.patron)}</h4>
				<div class="patron-header-right">
					<div class="patron-stats">
						<span class="patron-favor">{patron.earned}/{patron.total}</span>
						<span class="patron-percentage">{patron.percentage}%</span>
					</div>
					<ToggleButton
						isExpanded={patronExpansionState[patron.patron] || false}
						ariaControls="patron-details-{patron.patron}"
						size="small"
					/>
				</div>
				</div>
				<div class="patron-progress">
					<div class="patron-progress-bar">
						<div class="patron-progress-fill" style="width: {patron.percentage}%"></div>
					</div>
				</div>
				{#if patronExpansionState[patron.patron]}
					{@const favorData = getPatronFavorData(patron.patron)}
					<div class="favor-details" id="patron-details-{patron.patron}">
						{#if favorData}
							<div class="favor-tiers">
								<div class="favor-tiers-header">
									<span>Favor Rewards</span>
									{#if getWikiLink(patron.patron)}
										<a 
											href={getWikiLink(patron.patron)} 
											class="patron-wiki-link"
											target="_blank"
											rel="noopener noreferrer"
										>
											<img src="/ddowiki_favicon.png" alt="DDO Wiki" class="patron-wiki-favicon" />
											Wiki
										</a>
									{/if}
								</div>
								{#each favorData.tiers as tier}
									<div
										class="favor-tier"
										class:unreachable={tier.unreachable}
										class:earned={patron.earned >= tier.favorRequired}
									>
										<div class="tier-info">
											<span class="tier-number">Tier {tier.tier}</span>
											<span class="favor-amount">{tier.favorRequired} favor</span>
										</div>
										{#if patron.earned >= tier.favorRequired}
											<div class="tier-status earned">✓ Earned</div>
										{:else}
											<div class="tier-status needed">
												Need {tier.favorRequired - patron.earned} more
											</div>
										{/if}
										<div class="tier-reward">{tier.reward}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="favor-details">
								<div class="no-favor-data">No favor tier data available</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.patron-favor-panel {
		background: #1c2126;
		border: 2px solid #404040;
		border-radius: 12px;
		padding: 1.5rem;
		height: fit-content;
		color: #e0e0e0;
	}

	.patron-favor-panel h3 {
		margin: 0;
		color: #d4af37;
		font-size: 1.25rem;
		font-weight: 500;
	}

	.favor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 6px;
		transition: background-color 0.2s ease;
	}

	.favor-header:hover {
		background-color: rgba(212, 175, 55, 0.1);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort-controls {
		display: flex;
		gap: 0.25rem;
	}

	.sort-toggle {
		background: #404040;
		color: #e0e0e0;
		border: 1px solid #555;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.sort-toggle:hover {
		background: #4a4a4a;
		border-color: #666;
	}

	.sort-toggle.active {
		background: #d4af37;
		color: #1a1a1a;
		border-color: #d4af37;
	}

	.patron-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.patron-card {
		background: #3a3a3a;
		border: 1px solid #4a4a4a;
		border-radius: 6px;
		padding: 0.75rem;
		transition: all 0.2s ease;
	}

	.patron-card.total-favor {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-color: #667eea;
		color: white;
	}

	.patron-card.total-favor .patron-name {
		color: white;
	}

	.patron-card.total-favor .patron-favor,
	.patron-card.total-favor .patron-percentage {
		color: rgba(255, 255, 255, 0.9);
	}

	.patron-card:hover {
		border-color: #007bff;
		background: #404040;
	}

	.patron-card.total-favor:hover {
		background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
		border-color: #5a6fd8;
	}

	.patron-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.patron-header:hover {
		background-color: rgba(212, 175, 55, 0.1);
	}

	.patron-header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.patron-name {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: #d4af37;
	}

	.patron-stats {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.patron-favor {
		font-size: 0.8rem;
		color: #b0b0b0;
		font-weight: 500;
	}

	.patron-percentage {
		font-size: 0.8rem;
		font-weight: bold;
		color: #007bff;
		min-width: 35px;
		text-align: right;
	}

	.patron-progress {
		margin-top: 0.5rem;
	}

	.patron-progress-bar {
		width: 100%;
		height: 4px;
		background: #2a2a2a;
		border-radius: 2px;
		overflow: hidden;
	}

	.patron-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #007bff, #17a2b8);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	@media (max-width: 768px) {
		.patron-favor-panel {
			position: static;
			margin-bottom: 1rem;
		}

		.patron-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.patron-stats {
			align-self: flex-end;
		}
	}

	.favor-details {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #555;
	}

	.favor-tiers-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-weight: bold;
		color: #d4af37;
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
	}

	.favor-tier {
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		background: #2a2a2a;
		border-radius: 6px;
		border-left: 4px solid #666;
		transition: all 0.2s ease;
	}

	.favor-tier.earned {
		border-left-color: #28a745;
		background: #1a2f1a;
	}

	.favor-tier.unreachable {
		opacity: 0.6;
		border-left-color: #666;
	}

	.favor-tier:last-child {
		margin-bottom: 0;
	}

	.tier-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
		font-size: 0.85rem;
	}

	.tier-number {
		font-weight: bold;
		color: #d4af37;
	}

	.favor-amount {
		color: #888;
		font-style: italic;
	}

	.tier-status {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-weight: 500;
		margin-bottom: 0.5rem;
		width: fit-content;
	}

	.tier-status.earned {
		background: #28a745;
		color: white;
	}

	.tier-status.needed {
		background: #666;
		color: #ccc;
	}

	.tier-reward {
		color: #e0e0e0;
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.patron-wiki-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: #4a9eff;
		text-decoration: none;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: rgba(74, 158, 255, 0.1);
		transition: all 0.2s;
		margin-right: 0.5rem;
	}

	.patron-wiki-link:hover {
		background: rgba(74, 158, 255, 0.2);
		color: #6bb3ff;
	}

	.patron-wiki-favicon {
		width: 14px;
		height: 14px;
		object-fit: contain;
	}

	.no-favor-data {
		color: #888;
		font-style: italic;
		text-align: center;
		padding: 1rem;
	}
</style>
