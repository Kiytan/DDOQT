<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		loadQuests, 
		loadCompletedFromStorage, 
		checkForHashImport,
		pendingHashImport 
	} from '$lib/questStore.js';
	import QuestStats from '$lib/QuestStats.svelte';
	import QuestFilters from '$lib/QuestFilters.svelte';
	import QuestList from '$lib/QuestList.svelte';
	import PatronFavor from '$lib/PatronFavor.svelte';
	import SagaProgress from '$lib/SagaProgress.svelte';
	import AdventurePackFilters from '$lib/AdventurePackFilters.svelte';
	import QuestSettings from '$lib/QuestSettings.svelte';
	import ImportDialog from '$lib/ImportDialog.svelte';

	let showBackToTop = false;

	onMount(() => {
		const initializeApp = async () => {
			await loadQuests();
			loadCompletedFromStorage();
			checkForHashImport();
		};

		initializeApp();

		// Handle scroll events for back to top button
		const handleScroll = () => {
			showBackToTop = window.scrollY > 400;
		};

		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}
</script>

<svelte:head>
	<title>DDO Quest Tracker</title>
	<meta
		name="description"
		content="Track your completed DDO quests with filtering and progress saving"
	/>
</svelte:head>

<main>
	<header>
		<div class="header-title">
			<img src="/QTLogo.png" alt="DDO Quest Tracker Logo" class="logo" />
			<h1>DDO Quest Tracker</h1>
		</div>
		<p>Keep track of your completed Dungeons & Dragons Online quests</p>
	</header>

	<div class="main-content">
		<div class="adventure-pack-section">
			<AdventurePackFilters />
			<QuestStats />
			<QuestSettings />
		</div>

		<div class="quest-section">
			<QuestFilters />
			<QuestList />
		</div>

		<div class="favor-section">
			<PatronFavor />
			<SagaProgress />
		</div>
	</div>
</main>

<!-- Import dialog for URL hash data -->
{#if $pendingHashImport}
	<ImportDialog />
{/if}

{#if showBackToTop}
	<button
		class="back-to-top"
		on:click={scrollToTop}
		title="Back to top"
		aria-label="Scroll back to top"
	>
		▲
	</button>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #252832;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #e0e0e0;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.header-title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.logo {
		width: 48px;
		height: 48px;
		object-fit: contain;
	}

	header h1 {
		font-size: 2.5rem;
		color: white;
		margin: 0;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	header p {
		color: #b0b0b0;
		font-size: 1.1rem;
		margin: 0;
	}

	.main-content {
		display: grid;
		grid-template-columns: 250px 1fr 300px;
		gap: 2rem;
		align-items: start;
	}

	.adventure-pack-section {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem; /* Add some gap between components */
	}

	.quest-section {
		min-width: 0; /* Prevents grid overflow */
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.favor-section {
		min-width: 0;
	}

	@media (max-width: 1200px) {
		.main-content {
			grid-template-columns: 200px 1fr 280px;
			gap: 1.5rem;
		}
	}

	@media (max-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.adventure-pack-section {
			order: -2; /* Show adventure packs first on mobile */
		}

		.favor-section {
			order: -1; /* Show favor panel second on mobile */
		}
	}

	@media (max-width: 768px) {
		main {
			padding: 1rem;
		}

		.logo {
			width: 40px;
			height: 40px;
		}

		header h1 {
			font-size: 2rem;
		}
	}

	.back-to-top {
		position: fixed;
		bottom: 2rem;
		left: 2rem;
		width: 50px;
		height: 50px;
		background: #d4af37;
		color: #1a1a1a;
		border: none;
		border-radius: 50%;
		font-size: 1.5rem;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		transition: all 0.3s ease;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.back-to-top:hover {
		background: #e6c547;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
	}

	.back-to-top:active {
		transform: translateY(0);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 768px) {
		.back-to-top {
			bottom: 1rem;
			left: 1rem;
			width: 45px;
			height: 45px;
			font-size: 1.3rem;
		}
	}
</style>
