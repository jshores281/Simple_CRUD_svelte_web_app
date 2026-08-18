<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { User } from '$lib/types/user';

	let {
		users,
		rowAction
	}: {
		users: User[];
		/** Optional per-row action cell, e.g. a Delete button. */
		rowAction?: Snippet<[User]>;
	} = $props();

	function formatDate(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return iso;
		return date.toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
	<table class="w-full min-w-3xl border-collapse text-left text-sm">
		<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
			<tr>
				<th scope="col" class="px-4 py-3 font-semibold">ID</th>
				<th scope="col" class="px-4 py-3 font-semibold">Name</th>
				<th scope="col" class="px-4 py-3 font-semibold">Email</th>
				<th scope="col" class="px-4 py-3 font-semibold">Role</th>
				<th scope="col" class="px-4 py-3 font-semibold">Created</th>
				{#if rowAction}
					<th scope="col" class="px-4 py-3 text-right font-semibold">Actions</th>
				{/if}
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each users as user (user.id)}
				<tr class="odd:bg-white even:bg-slate-50/60">
					<td class="px-4 py-3 font-mono text-xs text-slate-500">{user.id}</td>
					<td class="px-4 py-3 font-medium text-slate-900">{user.name}</td>
					<td class="px-4 py-3 text-slate-700">{user.email}</td>
					<td class="px-4 py-3">
						<span
							class="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 capitalize"
						>
							{user.role}
						</span>
					</td>
					<td class="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(user.createdAt)}</td>
					{#if rowAction}
						<td class="px-4 py-3 text-right">{@render rowAction(user)}</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
