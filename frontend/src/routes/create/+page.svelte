<script lang="ts">
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import UserForm from '$lib/components/UserForm.svelte';
	import { createUser } from '$lib/api/users';
	import { ApiError } from '$lib/api/client';
	import type { CreateUserInput } from '$lib/types/user';

	let form = $state<UserForm | undefined>();
	let submitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function handleSubmit(input: CreateUserInput): Promise<void> {
		submitting = true;
		errorMessage = '';
		successMessage = '';
		try {
			const created = await createUser(input);
			successMessage = `Created ${created.name} (${created.email}).`;
			form?.reset();
		} catch (error) {
			errorMessage =
				error instanceof ApiError ? error.message : 'Something went wrong creating the user.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Create user · UserAdmin</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">Create user</h1>
<p class="mt-1 text-slate-600">Submits a new record with <code>POST /users</code>.</p>

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

	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<UserForm bind:this={form} {submitting} submitLabel="Create user" onsubmit={handleSubmit} />
	</div>
</div>
