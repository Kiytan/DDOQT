<script lang="ts">
	import { pendingHashImport, importFromHash, cancelHashImport } from '$lib/questStore.js';

	function handleImport(merge: boolean) {
		importFromHash(merge);
	}

	function handleCancel() {
		cancelHashImport();
	}

	let questCount = 0;
	$: if ($pendingHashImport) {
		questCount = Object.keys($pendingHashImport).length;
	}
</script>

<div class="dialog-overlay">
	<div class="dialog">
		<h2>Import Quest Progress</h2>
		<p>
			A URL with quest progress data has been detected ({questCount} completed quest{questCount !== 1 ? 's' : ''}).
		</p>
		<p>Would you like to import this data?</p>

		<div class="dialog-buttons">
			<button class="btn btn-primary" on:click={() => handleImport(false)}>
				Replace My Progress
			</button>
			<button class="btn btn-secondary" on:click={() => handleImport(true)}>
				Merge with My Progress
			</button>
			<button class="btn btn-cancel" on:click={handleCancel}>
				Cancel
			</button>
		</div>

		<div class="dialog-info">
			<p class="info-text">
				<strong>Replace:</strong> Your current progress will be replaced with the imported data.<br/>
				<strong>Merge:</strong> Imported quests will be added to your current progress.
			</p>
		</div>
	</div>
</div>

<style>
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 1rem;
	}

	.dialog {
		background: #2a2a2a;
		border-radius: 8px;
		padding: 2rem;
		max-width: 500px;
		width: 100%;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		border: 1px solid #404040;
	}

	.dialog h2 {
		margin: 0 0 1rem 0;
		color: #e0e0e0;
		font-size: 1.5rem;
	}

	.dialog p {
		color: #b0b0b0;
		line-height: 1.5;
		margin: 0.5rem 0;
	}

	.dialog-buttons {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
		flex-wrap: wrap;
	}

	.btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.btn-primary {
		background: #9d4edd;
		color: white;
	}

	.btn-primary:hover {
		background: #b794f4;
	}

	.btn-secondary {
		background: #10b981;
		color: white;
	}

	.btn-secondary:hover {
		background: #34d399;
	}

	.btn-cancel {
		background: #404040;
		color: #e0e0e0;
	}

	.btn-cancel:hover {
		background: #4a4a4a;
	}

	.dialog-info {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #404040;
	}

	.info-text {
		font-size: 0.85rem;
		color: #888;
		line-height: 1.6;
	}

	@media (max-width: 600px) {
		.dialog-buttons {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
