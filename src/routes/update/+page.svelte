<script lang="ts">
	import { onMount } from 'svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import UserForm from '$lib/components/UserForm.svelte';
	import { getUser, listUsers, updateUser } from '$lib/api/users';
	import { ApiError } from '$lib/api/client';
	import type { CreateUserInput, User } from '$lib/types/user';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let selectedId = $state('');
	let manualId = $state('');
	let lookingUp = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	const selected = $derived(users.find((user) => user.id === selectedId));
	const initial = $derived<CreateUserInput | undefined>(
		selected ? { name: selected.name, email: selected.email, role: selected.role } : undefined
	);

	function describe(error: unknown, fallback: string): string {
		return error instanceof ApiError ? error.message : fallback;
	}

	async function load(): Promise<void> {
		loading = true;
		errorMessage = '';
		try {
			users = await listUsers();
		} catch (error) {
			users = [];
			errorMessage = describe(error, 'Something went wrong loading users.');
		} finally {
			loading = false;
		}
	}

	/** Fallback path when the list is empty: fetch a single user by id. */
	async function lookUpById(): Promise<void> {
		const id = manualId.trim();
		if (id === '') return;
		lookingUp = true;
		errorMessage = '';
		successMessage = '';
		try {
			const user = await getUser(id);
			users = [user, ...users.filter((existing) => existing.id !== user.id)];
			selectedId = user.id;
		} catch (error) {
			errorMessage = describe(error, `Could not load the user with id "${id}".`);
		} finally {
			lookingUp = false;
		}
	}

	async function handleSubmit(input: CreateUserInput): Promise<void> {
		const current = selected;
		if (!current) return;
		submitting = true;
		errorMessage = '';
		successMessage = '';
		try {
			const updated = await updateUser(current.id, input);
			users = users.map((user) => (user.id === updated.id ? updated : user));
			successMessage = `Updated ${updated.name} (${updated.email}).`;
		} catch (error) {
			errorMessage = describe(error, 'Something went wrong updating the user.');
		} finally {
			submitting = false;
		}
	}

	onMount(load);
</script>

<svelte:head><title>Update user · UserAdmin</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">Update user</h1>
<p class="mt-1 text-slate-600">Replaces the editable fields with <code>PUT /users/:id</code>.</p>

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
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<label for="user-picker" class="mb-1.5 block text-sm font-medium text-slate-700">
				Select a user
			</label>
			<select
				id="user-picker"
				bind:value={selectedId}
				disabled={users.length === 0 || submitting}
				class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
			>
				<option value="">— choose a user —</option>
				{#each users as user (user.id)}
					<option value={user.id}>{user.name} ({user.email})</option>
				{/each}
			</select>

			{#if users.length === 0}
				<div class="mt-5 border-t border-slate-100 pt-5">
					<label for="manual-id" class="mb-1.5 block text-sm font-medium text-slate-700">
						No users loaded — look one up by id
					</label>
					<div class="flex flex-wrap gap-2">
						<input
							id="manual-id"
							type="text"
							bind:value={manualId}
							placeholder="e.g. 6f1c…"
							class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
						/>
						<button
							type="button"
							onclick={lookUpById}
							disabled={lookingUp || manualId.trim() === ''}
							class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{lookingUp ? 'Loading…' : 'Load user'}
						</button>
					</div>
				</div>
			{/if}
		</div>

		{#if selected}
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="mb-5 text-xs text-slate-500">
					Editing <span class="font-mono">{selected.id}</span>
				</p>
				<UserForm {initial} {submitting} submitLabel="Save changes" onsubmit={handleSubmit} />
			</div>
		{:else if users.length > 0}
			<EmptyState title="No user selected" description="Pick a user above to edit their details." />
		{/if}
	{/if}
</div>
