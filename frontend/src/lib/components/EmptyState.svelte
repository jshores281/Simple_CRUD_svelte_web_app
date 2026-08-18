<script lang="ts">
	let {
		title = 'Nothing here yet',
		description = ''
	}: { title?: string; description?: string } = $props();
</script>

<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
	<p class="text-base font-medium text-slate-800">{title}</p>
	{#if description}
		<p class="mt-1 text-sm text-slate-500">{description}</p>
	{/if}
</div>
