<script lang="ts">
	export let isExpanded: boolean;
	export let ariaControls: string = '';
	export let size: 'small' | 'medium' | 'large' = 'medium';

	const sizeMap = {
		small: '20px',
		medium: '24px',
		large: '28px'
	};

	const fontSizeMap = {
		small: '1.2rem',
		medium: '1.5rem',
		large: '1.8rem'
	};
</script>

<button
	class="toggle-btn"
	class:expanded={isExpanded}
	aria-expanded={isExpanded}
	aria-controls={ariaControls}
	style="width: {sizeMap[size]}; height: {sizeMap[size]}; font-size: {fontSizeMap[size]}"
	tabindex="-1"
>
	{isExpanded ? '▼' : '▶'}
</button>

<style>
	.toggle-btn {
		background: none;
		border: none;
		color: #d4af37;
		font-weight: bold;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.toggle-btn:focus {
		outline: none;
	}
</style>
