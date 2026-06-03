<script lang="ts">
	import {
		completedQuests,
		exportToHash,
		autoSyncEnabled,
		setAutoSyncEnabled,
		quests,
		filters,
		applyCustomQuestList,
		clearFilters
	} from '$lib/questStore.js';
	import { importPlannerText, type ImportReport } from '$lib/plannerImport.js';
	import { get } from 'svelte/store';
	import ToggleButton from './ToggleButton.svelte';

	let showSaveSuccess = false;
	let isExpanded = false;
	let showPatchNotes = false;
	let patchNotesContent = '';
	let patchNotesLoading = false;

	// Levelling-plan import
	let planText = '';
	let planReport: ImportReport | null = null;
	let planError = '';

	function handlePlanFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			planText = typeof reader.result === 'string' ? reader.result : '';
			applyPlan();
		};
		reader.readAsText(file);
	}

	function applyPlan() {
		planError = '';
		planReport = null;
		try {
			const report = importPlannerText(planText, get(quests));
			if (report.questIds.length === 0) {
				planError = 'No quests in this plan matched the quest list.';
				return;
			}
			applyCustomQuestList(report.questIds);
			planReport = report;
		} catch (error) {
			planError = error instanceof Error ? error.message : 'Failed to read the plan.';
		}
	}

	function clearPlan() {
		planReport = null;
		planError = '';
		planText = '';
		clearFilters();
	}

	// Total entries deliberately skipped (areas, markers, custom rows, removed quests).
	$: planSkipped = planReport
		? Object.values(planReport.skipped).reduce((a, b) => a + b, 0)
		: 0;

	// A plan filter is active whenever customQuestIds is set — including after a reload,
	// when the in-session report is gone but the persisted filter has been restored.
	$: activePlanCount = $filters.customQuestIds?.length ?? 0;

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function exportProgress() {
		const hash = exportToHash();
		if (!hash) {
			alert('Failed to create export URL');
			return;
		}

		const url = `${window.location.origin}${window.location.pathname}#${hash}`;

		// Try modern clipboard API first
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard
				.writeText(url)
				.then(() => {
					showSaveSuccess = true;
					setTimeout(() => (showSaveSuccess = false), 2000);
				})
				.catch(() => {
					fallbackCopyToClipboard(url);
				});
		} else {
			fallbackCopyToClipboard(url);
		}
	}

	function fallbackCopyToClipboard(text: string) {
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

	function resetProgress() {
		if (confirm('Are you sure you want to reset all quest progress? This cannot be undone.')) {
			completedQuests.set({});
			if (typeof window !== 'undefined') {
				localStorage.removeItem('ddoqt-completed-quests');
			}
		}
	}

	function openPatchNotes() {
		showPatchNotes = true;
		loadPatchNotes();
	}

	function closePatchNotes() {
		showPatchNotes = false;
	}

	async function loadPatchNotes() {
		patchNotesLoading = true;
		try {
			// Add cache-busting timestamp to ensure fresh content
			const timestamp = new Date().getTime();
			const response = await fetch(`/PATCHNOTES.md?v=${timestamp}`, {
				cache: 'no-cache',
				headers: {
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache'
				}
			});
			if (response.ok) {
				const markdown = await response.text();
				patchNotesContent = parseMarkdownToHTML(markdown);
			} else {
				patchNotesContent = '<p>Failed to load patch notes.</p>';
			}
		} catch (error) {
			console.error('Error loading patch notes:', error);
			patchNotesContent = '<p>Error loading patch notes.</p>';
		} finally {
			patchNotesLoading = false;
		}
	}

	function parseMarkdownToHTML(markdown: string): string {
		// Split into lines for better processing
		const lines = markdown.split('\n');
		let html = '';
		let inList = false;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			
			// Skip empty lines
			if (!line) {
				if (inList) {
					html += '</ul>';
					inList = false;
				}
				html += '<br>';
				continue;
			}
			
			// Headers
			if (line.startsWith('# ')) {
				if (inList) { html += '</ul>'; inList = false; }
				html += `<h1>${line.substring(2)}</h1>`;
			} else if (line.startsWith('## ')) {
				if (inList) { html += '</ul>'; inList = false; }
				html += `<h2>${line.substring(3)}</h2>`;
			} else if (line.startsWith('### ')) {
				if (inList) { html += '</ul>'; inList = false; }
				html += `<h3>${line.substring(4)}</h3>`;
			}
			// Horizontal rule
			else if (line === '---') {
				if (inList) { html += '</ul>'; inList = false; }
				html += '<hr>';
			}
			// List items
			else if (line.startsWith('- ')) {
				if (!inList) {
					html += '<ul>';
					inList = true;
				}
				let listContent = line.substring(2);
				// Handle bold text in list items
				listContent = listContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
				listContent = listContent.replace(/`([^`]+)`/g, '<code>$1</code>');
				html += `<li>${listContent}</li>`;
			}
			// Regular paragraphs
			else {
				if (inList) { html += '</ul>'; inList = false; }
				let content = line;
				// Handle inline formatting
				content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
				content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
				content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
				html += `<p>${content}</p>`;
			}
		}
		
		// Close any open list
		if (inList) {
			html += '</ul>';
		}
		
		return html;
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
				<h4>Export Progress</h4>
				<p>Create a shareable URL with your quest progress:</p>
				<button on:click={exportProgress} class="action-btn save-btn"> 
					Export & Copy URL 
				</button>
				{#if showSaveSuccess}
					<div class="message success">Shareable URL copied to clipboard!</div>
				{/if}
				<div class="message info">
					Share this URL with others or save it as a backup. To import someone else's progress, simply visit their shared URL.
				</div>
			</div>

			<div class="setting-group">
				<h4>Import Levelling Plan</h4>
				<p>
					Load a quest list exported from a DDO levelling planner to filter the tracker to just
					those quests. Paste the JSON below, or choose the exported file.
				</p>
				<textarea
					class="plan-input"
					rows="4"
					placeholder={'{ "heroic": [ { "name": "..." } ], "epic": [ ... ] }'}
					bind:value={planText}
				></textarea>
				<div class="plan-actions">
					<button on:click={applyPlan} class="action-btn save-btn" disabled={!planText.trim()}>
						Apply Plan
					</button>
					<label class="action-btn info-btn file-btn">
						Choose File…
						<input type="file" accept=".json,application/json" on:change={handlePlanFile} hidden />
					</label>
					{#if activePlanCount > 0 || planError}
						<button on:click={clearPlan} class="action-btn reset-btn">Clear Plan Filter</button>
					{/if}
				</div>

				{#if planError}
					<div class="message error">{planError}</div>
				{/if}

				{#if activePlanCount > 0 && !planReport}
					<div class="message success">
						A levelling plan filter is active ({activePlanCount} quest{activePlanCount === 1
							? ''
							: 's'}).
					</div>
				{/if}

				{#if planReport}
					<div class="message success">
						Filtering to {planReport.questIds.length} quest{planReport.questIds.length === 1
							? ''
							: 's'} from your plan.
					</div>
					{#if planSkipped > 0}
						<div class="message info">
							Skipped {planSkipped} non-quest entr{planSkipped === 1 ? 'y' : 'ies'}
							(areas, level-up markers, custom rows, removed quests).
						</div>
					{/if}
					{#if planReport.unmatched.length > 0}
						<div class="message info">
							<strong
								>{planReport.unmatched.length} name{planReport.unmatched.length === 1
									? ''
									: 's'} not found:</strong
							>
							<ul class="unmatched-list">
								{#each planReport.unmatched as name}
									<li>{name}</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/if}
			</div>

			<div class="setting-group">
				<h4>Plugin Auto-Sync  (CURRENTLY IN TESTING)</h4>
				<p>Allow Dungeon Helper plugin to automatically sync quests:</p>
				<label class="toggle-setting">
					<input 
						type="checkbox" 
						checked={$autoSyncEnabled}
						on:change={(e) => setAutoSyncEnabled(e.currentTarget.checked)}
					/>
					<span class="toggle-label">Enable auto-sync from plugins</span>
				</label>
				<div class="message info">
					When enabled, the Quest Tracker plugin can automatically update your completed quests without showing a confirmation dialog.
				</div>
			</div>

			<div class="setting-group">
				<h4>Reset Progress</h4>
				<p>Clear all quest completions and start over:</p>
				<button on:click={resetProgress} class="action-btn reset-btn"> Reset All Progress </button>
			</div>

			<div class="setting-group">
				<h4>Patch Notes</h4>
				<p></p>
				<button on:click={openPatchNotes} class="action-btn info-btn"> View Patch Notes </button>
			</div>
		</div>
	{/if}
</div>

<!-- Patch Notes Modal -->
{#if showPatchNotes}
	<div 
		class="modal-overlay" 
		on:click={closePatchNotes}
		on:keydown={(e) => e.key === 'Escape' && closePatchNotes()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="patch-notes-title"
		tabindex="-1"
	>
		<div 
			class="modal-content" 
			role="document"
		>
			<div class="modal-header">
				<h3 id="patch-notes-title">Patch Notes</h3>
				<button class="close-btn" on:click={closePatchNotes} aria-label="Close patch notes">&times;</button>
			</div>
			<div class="modal-body">
				{#if patchNotesLoading}
					<div class="loading">Loading patch notes...</div>
				{:else}
					<div class="markdown-content">
						{@html patchNotesContent}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

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

	.reset-btn {
		background: #dc3545;
	}

	.reset-btn:hover {
		background: #c82333;
	}

	.info-btn {
		background: #17a2b8;
	}

	.info-btn:hover {
		background: #138496;
	}

	.toggle-setting {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		padding: 0.5rem 0;
	}

	.toggle-setting input[type="checkbox"] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #28a745;
	}

	.toggle-label {
		color: #e0e0e0;
		font-size: 0.95rem;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background: #2a2a2a;
		border-radius: 8px;
		max-width: 600px;
		max-height: 80vh;
		width: 90%;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #404040;
		background: #333;
	}

	.modal-header h3 {
		margin: 0;
		color: #d4af37;
	}

	.close-btn {
		background: none;
		border: none;
		color: #ccc;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: #555;
		color: white;
	}

	.modal-body {
		padding: 1.5rem;
		max-height: 60vh;
		overflow-y: auto;
	}

	.loading {
		text-align: center;
		color: #d4af37;
		font-style: italic;
		padding: 2rem;
	}

	.markdown-content {
		color: #e0e0e0;
		line-height: 1.6;
	}

	.markdown-content :global(h1) {
		color: #d4af37;
		font-size: 1.5rem;
		margin: 0 0 1rem 0;
		border-bottom: 2px solid #d4af37;
		padding-bottom: 0.5rem;
	}

	.markdown-content :global(h2) {
		color: #d4af37;
		font-size: 1.3rem;
		margin: 2rem 0 1rem 0;
	}

	.markdown-content :global(h3) {
		color: #f0c674;
		font-size: 1.1rem;
		margin: 1.5rem 0 0.5rem 0;
	}

	.markdown-content :global(ul) {
		margin: 0.5rem 0 1rem 1.5rem;
	}

	.markdown-content :global(li) {
		margin-bottom: 0.3rem;
	}

	.markdown-content :global(strong) {
		color: #81a1c1;
	}

	.markdown-content :global(code) {
		background: #3c3c3c;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
	}

	.markdown-content :global(hr) {
		border: none;
		border-top: 1px solid #555;
		margin: 2rem 0;
	}

	.markdown-content :global(p) {
		margin: 0.5rem 0;
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
		color: #f08591;
	}

	.plan-input {
		width: 100%;
		box-sizing: border-box;
		background: #1a1a1a;
		border: 1px solid #555;
		color: #e0e0e0;
		border-radius: 4px;
		padding: 0.5rem;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		resize: vertical;
		margin-bottom: 0.5rem;
	}

	.plan-input:focus {
		outline: none;
		border-color: #d4af37;
	}

	.plan-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.file-btn {
		display: inline-flex;
		align-items: center;
		cursor: pointer;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.unmatched-list {
		margin: 0.5rem 0 0 1rem;
		padding: 0;
		font-size: 0.85rem;
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
