<script lang="ts">
	import type { FilterState } from './types';

	export let value: FilterState = undefined;
	export let label: string;
	export let colorClass: string = '';
	export let onToggle: (newValue: FilterState) => void;

	function handleClick() {
		// Cycle through: undefined → include → exclude → undefined
		if (value === undefined) {
			value = 'include';
		} else if (value === 'include') {
			value = 'exclude';
		} else {
			value = undefined;
		}
		onToggle(value);
	}

	$: stateIcon = getStateIcon(value);
	$: stateClass = getStateClass(value);
	$: stateText = getStateText(value);

	function getStateIcon(state: FilterState): string {
		switch (state) {
			case 'include':
				return '✓';
			case 'exclude':
				return '✗';
			default:
				return '○';
		}
	}

	function getStateClass(state: FilterState): string {
		switch (state) {
			case 'include':
				return 'include';
			case 'exclude':
				return 'exclude';
			default:
				return 'none';
		}
	}

	function getStateText(state: FilterState): string {
		switch (state) {
			case 'include':
				return 'Include';
			case 'exclude':
				return 'Exclude';
			default:
				return 'No filter';
		}
	}
</script>

<button
	class="tri-state-toggle {stateClass}"
	on:click={handleClick}
	title="{stateText}: {label}"
	aria-label="{stateText}: {label}"
>
	<div class="checkbox {stateClass}">
		<span class="checkbox-icon">{stateIcon}</span>
	</div>
	<span class="toggle-label {colorClass}">{label}</span>
</button>

<style>
	.tri-state-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0;
		border: none;
		background: transparent;
		color: #e0e0e0;
		cursor: pointer;
		font-size: 0.9rem;
		min-width: 0;
		width: 100%;
		box-sizing: border-box;
	}

	.tri-state-toggle:hover .checkbox {
		border-color: #d4af37;
		background: rgba(212, 175, 55, 0.05);
	}

	.checkbox {
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

	.checkbox.none {
		border-color: #555;
		background: #1a1a1a;
	}

	.checkbox.include {
		border-color: #10b981;
		background: #10b981;
	}

	.checkbox.exclude {
		border-color: #ef4444;
		background: #ef4444;
	}

	.checkbox-icon {
		font-weight: bold;
		font-size: 12px;
		line-height: 1;
		color: white;
	}

	.none .checkbox-icon {
		color: transparent;
	}

	.include .checkbox-icon,
	.exclude .checkbox-icon {
		color: white;
	}

	.toggle-label {
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

	/* Color classes for different quest types */
	.toggle-label.heroic {
		color: #10b981;
	}

	.toggle-label.epic {
		color: #a855f7;
	}

	.toggle-label.legendary {
		color: #ea580c;
	}

	.toggle-label.raid {
		color: #dc2626;
	}
</style>