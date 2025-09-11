<script lang="ts">
	import { completedQuests, saveCompletedToHash, loadCompletedFromHash } from '$lib/questStore.js';
	import ToggleButton from './ToggleButton.svelte';

	let hashInput = '';
	let showSaveSuccess = false;
	let showLoadSuccess = false;
	let showLoadError = false;
	let isExpanded = false;

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function saveHash() {
		const currentHash = window.location.hash.substring(1);
		hashInput = currentHash;

		// Try modern clipboard API first
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard
				.writeText(currentHash)
				.then(() => {
					showSaveSuccess = true;
					setTimeout(() => (showSaveSuccess = false), 2000);
				})
				.catch(() => {
					// Fallback to legacy method
					fallbackCopyToClipboard(currentHash);
				});
		} else {
			// Fallback for older browsers or non-HTTPS
			fallbackCopyToClipboard(currentHash);
		}
	}

	function fallbackCopyToClipboard(text: string) {
		// Create a temporary textarea element
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			document.execCommand('copy');
			showSaveSuccess = true;
			setTimeout(() => (showSaveSuccess = false), 2000);
		} catch (err) {
			console.error('Failed to copy hash:', err);
			// Show the hash in the textarea for manual copying
			showSaveSuccess = false;
		} finally {
			document.body.removeChild(textArea);
		}
	}

	function loadHash() {
		if (!hashInput.trim()) {
			showLoadError = true;
			setTimeout(() => (showLoadError = false), 2000);
			return;
		}

		try {
			// Set the hash and load it
			window.location.hash = hashInput.trim();
			loadCompletedFromHash();
			showLoadSuccess = true;
			setTimeout(() => (showLoadSuccess = false), 2000);
		} catch (error) {
			showLoadError = true;
			setTimeout(() => (showLoadError = false), 2000);
		}
	}

	function resetProgress() {
		if (confirm('Are you sure you want to reset all quest progress? This cannot be undone.')) {
			completedQuests.set({});
			saveCompletedToHash({});
			hashInput = '';
		}
	}
</script>

<div class="settings-panel">
	<div
		class="settings-header"
		on:click={toggleExpanded}
		on:keydown={(e) => e.key === 'Enter' && toggleExpanded()}
		role="button"
		tabindex="0"
		aria-expanded={isExpanded}
		aria-controls="settings-content"
	>
		<h3>Settings</h3>
		<ToggleButton {isExpanded} ariaControls="settings-content" />
	</div>

	{#if isExpanded}
		<div class="settings-content" id="settings-content">
			<div class="setting-group">
				<h4>Save Progress</h4>
				<p>Copy your progress hash to save your quest completions:</p>
				<textarea
					bind:value={hashInput}
					placeholder="Your progress hash will appear here..."
					class="hash-input"
					readonly
				></textarea>
				<button on:click={saveHash} class="action-btn save-btn"> Copy Progress Hash </button>
				{#if showSaveSuccess}
					<div class="message success">Progress hash copied to clipboard!</div>
				{:else if hashInput}
					<div class="message info">
						Hash shown above - you can manually copy it if automatic copy failed
					</div>
				{/if}
			</div>

			<div class="setting-group">
				<h4>Load Progress</h4>
				<p>Paste a progress hash to restore your quest completions:</p>
				<textarea
					bind:value={hashInput}
					placeholder="Paste your progress hash here..."
					class="hash-input"
				></textarea>
				<button on:click={loadHash} class="action-btn load-btn"> Load Progress </button>
				{#if showLoadSuccess}
					<div class="message success">Progress loaded successfully!</div>
				{/if}
				{#if showLoadError}
					<div class="message error">Invalid progress data. Please check your hash.</div>
				{/if}
			</div>

			<div class="setting-group">
				<h4>Reset Progress</h4>
				<p>Clear all quest completions and start over:</p>
				<button on:click={resetProgress} class="action-btn reset-btn"> Reset All Progress </button>
			</div>
		</div>
	{/if}
</div>

<style>
	.settings-panel {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 8px;
		color: #e0e0e0;
		margin-top: 1rem;
	}

	.settings-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		cursor: pointer;
		user-select: none;
		transition: background-color 0.2s ease;
	}

	.settings-header:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.settings-panel h3 {
		margin: 0;
		color: #d4af37;
		font-size: 1.2rem;
	}

	.settings-content {
		padding: 0 1.5rem 1.5rem 1.5rem;
	}

	.setting-group {
		margin-bottom: 1.5rem;
	}

	.setting-group:last-child {
		margin-bottom: 0;
	}

	.setting-group h4 {
		margin: 0 0 0.5rem 0;
		color: #e0e0e0;
		font-size: 1rem;
	}

	.setting-group p {
		margin: 0 0 0.75rem 0;
		color: #b0b0b0;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.hash-input {
		width: 100%;
		min-height: 80px;
		padding: 0.5rem;
		border: 1px solid #555;
		border-radius: 4px;
		background: #1a1a1a;
		color: #e0e0e0;
		font-size: 0.85rem;
		font-family: monospace;
		resize: vertical;
		margin-bottom: 0.75rem;
	}

	.hash-input:focus {
		outline: none;
		border-color: #d4af37;
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
	}

	.action-btn {
		background: #6c757d;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.2s ease;
		margin-right: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.action-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.save-btn {
		background: #28a745;
	}

	.save-btn:hover {
		background: #218838;
	}

	.load-btn {
		background: #007bff;
	}

	.load-btn:hover {
		background: #0056b3;
	}

	.reset-btn {
		background: #dc3545;
	}

	.reset-btn:hover {
		background: #c82333;
	}

	.message {
		padding: 0.5rem;
		border-radius: 4px;
		margin-top: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.message.success {
		background: rgba(40, 167, 69, 0.2);
		border: 1px solid #28a745;
		color: #28a745;
	}

	.message.info {
		background: rgba(23, 162, 184, 0.2);
		border: 1px solid #17a2b8;
		color: #17a2b8;
	}

	.message.error {
		background: rgba(220, 53, 69, 0.2);
		border: 1px solid #dc3545;
		color: #dc3545;
	}

	@media (max-width: 768px) {
		.settings-panel {
			padding: 1rem;
		}

		.action-btn {
			width: 100%;
			margin-right: 0;
		}
	}
</style>
