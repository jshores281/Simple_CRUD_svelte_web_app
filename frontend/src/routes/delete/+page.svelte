<script lang="ts">
	import { onMount } from 'svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import UserTable from '$lib/components/UserTable.svelte';
	import { deleteUser, listUsers } from '$lib/api/users';
	import { ApiError } from '$lib/api/client';
	import type { User } from '$lib/types/user';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');
	let successMessage = $state('');
	let confirmingId = $state('');
	let deletingId = $state('');

	async function load(): Promise<void> {
		loading = true;
		errorMessage = '';
		confirmingId = '';
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

	async function confirmDelete(user: User): Promise<void> {
		deletingId = user.id;
		errorMessage = '';
		successMessage = '';
		try {
			await deleteUser(user.id);
			users = users.filter((existing) => existing.id !== user.id);
			successMessage = `Deleted ${user.name} (${user.email}).`;
			confirmingId = '';
		} catch (error) {
			errorMessage =
				error instanceof ApiError ? error.message : `Something went wrong deleting ${user.name}.`;
		} finally {
			deletingId = '';
		}
	}

	onMount(load);
</script>

<svelte:head><title>Delete user · UserAdmin</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Delete user</h1>
		<p class="mt-1 text-slate-600">Removes a record with <code>DELETE /users/:id</code>.</p>
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
	{#if errorMessage}
		<ErrorBanner message={errorMessage} ondismiss={() => (errorMessage = '')} />
	{/if}
	{#if successMessage}
		<div
			role="status"
			class="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
		>
			{successMessage}
		</div>
	{/if}

	{#if loading}
		<LoadingState message="Loading users…" />
	{:else if users.length > 0}
		<UserTable {users}>
			{#snippet rowAction(user)}
				{#if confirmingId === user.id}
					<div class="flex flex-wrap items-center justify-end gap-2">
						<span class="text-xs text-slate-600">Delete {user.name}?</span>
						<button
							type="button"
							onclick={() => confirmDelete(user)}
							disabled={deletingId === user.id}
							class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
						>
							{deletingId === user.id ? 'Deleting…' : 'Confirm'}
						</button>
						<button
							type="button"
							onclick={() => (confirmingId = '')}
							disabled={deletingId === user.id}
							class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
						>
							Cancel
						</button>
					</div>
				{:else}
					<button
						type="button"
						onclick={() => (confirmingId = user.id)}
						class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
					>
						Delete
					</button>
				{/if}
			{/snippet}
		</UserTable>
	{:else if !errorMessage}
		<EmptyState title="No users to delete" description="The list came back empty." />
	{/if}
</div>
