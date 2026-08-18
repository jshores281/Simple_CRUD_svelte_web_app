<script lang="ts">
	let { message, ondismiss }: { message: string; ondismiss?: () => void } = $props();
</script>

<div
	role="alert"
	class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
>
	<span class="flex-1">{message}</span>
	{#if ondismiss}
		<button
			type="button"
			onclick={ondismiss}
			aria-label="Dismiss error"
			class="rounded px-1 text-lg leading-none text-red-500 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
		>
			&times;
		</button>
	{/if}
</div>
