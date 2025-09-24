<script lang="ts">
	import { questStats, quests, completedQuests, calculateFavor, filteredQuests } from '$lib/questStore.js';
	import ToggleButton from './ToggleButton.svelte';
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import type { Quest } from '$lib/types.js';

	let isExpanded = true;
	let favorTiers: any[] = [];

	// Load favor tiers data
	onMount(async () => {
		try {
			const response = await fetch('/favor-tiers.json');
			favorTiers = await response.json();
		} catch (error) {
			console.error('Failed to load favor tiers:', error);
		}
	});

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	// Calculate favor by patron (same logic as PatronFavor.svelte)
	const patronFavor = derived([quests, completedQuests], ([$quests, $completed]) => {
		const patronStats = new Map<string, { earned: number; total: number }>();
		let questGroupsCache = new Map<string, Quest[]>();

		// Group quests by base quest ID
		$quests.forEach((quest) => {
			const groupKey = quest.baseQuestId || quest.id;
			if (!questGroupsCache.has(groupKey)) {
				questGroupsCache.set(groupKey, []);
			}
			questGroupsCache.get(groupKey)!.push(quest);
		});

		// Initialize all patrons with 0
		$quests.forEach((quest) => {
			if (!patronStats.has(quest.patron)) {
				patronStats.set(quest.patron, { earned: 0, total: 0 });
			}
		});

		// Calculate totals and earned favor using quest groups
		Array.from(questGroupsCache.values()).forEach((questGroup) => {
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

		return patronStats;
	});

	// Get all favor rewards that have been earned across all patrons
	$: earnedRewards = (() => {
		if (!favorTiers.length || $patronFavor.size === 0) return [];

		const allEarnedRewards: Array<{
			patronName: string;
			tier: string;
			favorRequired: number;
			reward: string;
			isTotal: boolean;
		}> = [];

		// Use the per-patron favor calculations to determine earned rewards
		for (const [patronName, stats] of $patronFavor) {
			const patron = favorTiers.find((p) => p.name === patronName);
			if (patron && patron.tiers) {
				patron.tiers.forEach((tier: any) => {
					if (!tier.unreachable && stats.earned >= tier.favorRequired) {
						allEarnedRewards.push({
							patronName: patronName.replace('<br>', ' '),
							tier: tier.tier,
							favorRequired: tier.favorRequired,
							reward: tier.reward,
							isTotal: patronName.includes('Total Favor')
						});
					}
				});
			}
		}

		return allEarnedRewards.sort((a, b) => a.favorRequired - b.favorRequired);
	})();

	// Calculate maximum possible favor and remaining favor for currently filtered quests
	const filteredQuestFavorStats = derived([filteredQuests, completedQuests], ([$filteredQuests, $completed]) => {
		// Group filtered quests by base quest ID
		const questGroups = new Map<string, Quest[]>();
		$filteredQuests.forEach((quest) => {
			const groupKey = quest.baseQuestId || quest.id;
			if (!questGroups.has(groupKey)) {
				questGroups.set(groupKey, []);
			}
			questGroups.get(groupKey)!.push(quest);
		});

		let maxPossibleFavor = 0;
		let currentEarnedFavor = 0;

		// Calculate favor for each quest group
		Array.from(questGroups.values()).forEach((questGroup) => {
			// Get the highest base favor from any variant in this group for max possible
			const highestBaseFavor = Math.max(...questGroup.map((q) => q.baseFavor));
			maxPossibleFavor += calculateFavor(highestBaseFavor, 'Elite');

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
				currentEarnedFavor += highestGroupFavor;
			}
		});

		return {
			maxPossible: maxPossibleFavor,
			currentEarned: currentEarnedFavor,
			remaining: maxPossibleFavor - currentEarnedFavor
		};
	});
</script>

<div class="stats-container">
	<div
		class="stats-header"
		on:click={toggleExpanded}
		on:keydown={(e) => e.key === 'Enter' && toggleExpanded()}
		role="button"
		tabindex="0"
		aria-expanded={isExpanded}
		aria-controls="stats-content"
	>
		<h3>Total Progress</h3>
		<ToggleButton {isExpanded} ariaControls="stats-content" />
	</div>
	{#if isExpanded}
		<div class="stats-content" id="stats-content">
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">{$questStats.completedQuests}/{$questStats.totalQuests}</div>
					<div class="stat-label">Quests Completed</div>
				</div>

				<div class="stat-card">
					<div class="stat-value">{$questStats.completionPercentage}%</div>
					<div class="stat-label">Completion Rate</div>
				</div>

				<div class="stat-card">
					<div class="stat-value">{$filteredQuestFavorStats.currentEarned}/{$filteredQuestFavorStats.maxPossible}</div>
					<div class="stat-label">Selected Total Favor</div>
				</div>

				<div class="stat-card">
					<div class="stat-value">{$questStats.earnedFavor}/{$questStats.totalFavor}</div>
					<div class="stat-label">Total Favor</div>
				</div>
			</div>

			{#if $questStats.totalQuests > 0}
				<div class="progress-bar">
					<div class="progress-fill" style="width: {$questStats.completionPercentage}%"></div>
				</div>
			{/if}

			<!-- Favor Rewards Section -->
			{#if earnedRewards.length > 0}
				<div class="favor-rewards-section">
					<h4 class="section-title">Account Favor Rewards</h4>

					{#if earnedRewards.length > 0}
						<div class="earned-rewards">
							<div class="rewards-header">✓ Unlocked</div>
							{#each earnedRewards as reward}
								<div class="reward-item earned">
									<div class="reward-info">
										<span class="reward-favor">{reward.favorRequired} favor</span>
										<span class="reward-description">{reward.reward}</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.stats-container {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 8px;
		color: #e0e0e0;
		margin-top: 1rem;
	}

	.stats-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		cursor: pointer;
		user-select: none;
		transition: background-color 0.2s ease;
	}

	.stats-header:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.stats-container h3 {
		margin: 0;
		color: #d4af37;
		font-size: 1.2rem;
	}

	.stats-content {
		padding: 0 1.5rem 1.5rem 1.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		background: #3a3a3a;
		border: 1px solid #4a4a4a;
		border-radius: 6px;
		padding: 0.75rem;
		text-align: center;
		transition: all 0.2s ease;
	}

	.stat-card:hover {
		border-color: #d4af37;
		background: #404040;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: #d4af37;
		margin-bottom: 0.25rem;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.85rem;
		color: #b0b0b0;
		font-weight: 500;
		line-height: 1;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #3a3a3a;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid #4a4a4a;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #28a745, #20c997);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.favor-rewards-section {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #4a4a4a;
	}

	.section-title {
		margin: 0 0 1rem 0;
		color: #d4af37;
		font-size: 1rem;
		font-weight: 600;
	}

	.earned-rewards {
		margin-bottom: 1rem;
	}

	.rewards-header {
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #b0b0b0;
	}

	.reward-item {
		background: #3a3a3a;
		border: 1px solid #4a4a4a;
		border-radius: 4px;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.reward-item.earned {
		border-left: 3px solid #28a745;
		background: #1a2f1a;
	}

	.reward-item:last-child {
		margin-bottom: 0;
	}

	.reward-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.reward-favor {
		font-size: 0.8rem;
		color: #d4af37;
		font-weight: 600;
	}

	.reward-description {
		font-size: 0.85rem;
		color: #e0e0e0;
		line-height: 1.3;
	}

	@media (max-width: 1024px) {
		.stats-container {
			margin-top: 1rem;
			margin-bottom: 0;
		}
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
			gap: 0.5rem;
		}

		.stat-card {
			padding: 0.5rem;
		}

		.stat-value {
			font-size: 1.2rem;
		}

		.stat-label {
			font-size: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.stat-value {
			font-size: 1.3rem;
		}

		.stat-label {
			font-size: 0.8rem;
		}
	}
</style>
