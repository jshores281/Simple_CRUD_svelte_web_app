<script lang="ts">
	import { onMount } from 'svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import UserTable from '$lib/components/UserTable.svelte';
	import { listUsers } from '$lib/api/users';
	import { ApiError } from '$lib/api/client';
	import type { User } from '$lib/types/user';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');

	async function load(): Promise<void> {
		loading = true;
		errorMessage = '';
		try {
			users = await listUsers();
		} catch (error) {
			users = [];
			errorMessage =
				error instanceof ApiError ? error.message : 'Something went wrong loading users.';
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

<svelte:head><title>All users · UserAdmin</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">All users</h1>
		<p class="mt-1 text-slate-600">Loaded with <code>GET /users</code>.</p>
	</div>
	<button
		type="button"
		onclick={load}
		disabled={loading}
		class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{loading ? 'Refreshing…' : 'Refresh'}
	</button>
</div>

<div class="mt-6 space-y-4">
	{#if loading}
		<LoadingState message="Loading users…" />
	{:else if errorMessage}
		<ErrorBanner message={errorMessage} ondismiss={() => (errorMessage = '')} />
	{:else if users.length === 0}
		<EmptyState title="No users yet" description="Create one from the Create page to see it here." />
	{:else}
		<UserTable {users} />
	{/if}
</div>
