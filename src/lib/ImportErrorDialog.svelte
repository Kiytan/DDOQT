<script lang="ts">
	import { hashImportError, dismissHashImportError } from '#lib/questStore.js';
</script>

<div class="dialog-overlay">
	<div class="dialog" role="alertdialog" aria-labelledby="import-error-title">
		<h2 id="import-error-title">Import Failed</h2>
		<p>{$hashImportError}</p>
		<p class="info-text">Your saved progress hasn't been changed.</p>

		<div class="dialog-buttons">
			<button class="btn btn-cancel" on:click={dismissHashImportError}>OK</button>
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
	}

	.btn-cancel {
		background: #404040;
		color: #e0e0e0;
	}

	.btn-cancel:hover {
		background: #4a4a4a;
	}

	.info-text {
		font-size: 0.85rem;
		color: #888;
	}
</style>
