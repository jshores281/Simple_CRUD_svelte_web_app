<script lang="ts">
	import { USER_ROLES, type CreateUserInput, type UserRole } from '$lib/types/user';

	let {
		initial,
		submitting = false,
		submitLabel = 'Save',
		onsubmit
	}: {
		initial?: CreateUserInput;
		submitting?: boolean;
		submitLabel?: string;
		onsubmit: (input: CreateUserInput) => void;
	} = $props();

	let name = $state('');
	let email = $state('');
	let role = $state<UserRole>('user');
	let showErrors = $state(false);

	// Seed the fields from the parent, and re-seed whenever it hands us a different record.
	$effect(() => {
		name = initial?.name ?? '';
		email = initial?.email ?? '';
		role = initial?.role ?? 'user';
		showErrors = false;
	});

	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	const nameError = $derived(name.trim() === '' ? 'Name is required.' : '');
	const emailError = $derived(
		email.trim() === ''
			? 'Email is required.'
			: EMAIL_PATTERN.test(email.trim())
				? ''
				: 'Enter a valid email address.'
	);
	const roleError = $derived(
		USER_ROLES.includes(role) ? '' : 'Select one of the available roles.'
	);
	const isValid = $derived(nameError === '' && emailError === '' && roleError === '');

	/** Clears the fields — used by the Create page after a successful POST. */
	export function reset(): void {
		name = '';
		email = '';
		role = 'user';
		showErrors = false;
	}

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();
		showErrors = true;
		if (!isValid) return;
		onsubmit({ name: name.trim(), email: email.trim(), role });
	}

	const fieldClass =
		'w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100';
</script>

<form onsubmit={handleSubmit} novalidate class="space-y-5">
	<div>
		<label for="user-name" class="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
		<input
			id="user-name"
			type="text"
			bind:value={name}
			disabled={submitting}
			autocomplete="name"
			placeholder="Ada Lovelace"
			aria-invalid={showErrors && nameError !== ''}
			aria-describedby={showErrors && nameError ? 'user-name-error' : undefined}
			class="{fieldClass} {showErrors && nameError ? 'border-red-400' : 'border-slate-300'}"
		/>
		{#if showErrors && nameError}
			<p id="user-name-error" class="mt-1.5 text-sm text-red-600">{nameError}</p>
		{/if}
	</div>

	<div>
		<label for="user-email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
		<input
			id="user-email"
			type="email"
			bind:value={email}
			disabled={submitting}
			autocomplete="email"
			placeholder="ada@example.com"
			aria-invalid={showErrors && emailError !== ''}
			aria-describedby={showErrors && emailError ? 'user-email-error' : undefined}
			class="{fieldClass} {showErrors && emailError ? 'border-red-400' : 'border-slate-300'}"
		/>
		{#if showErrors && emailError}
			<p id="user-email-error" class="mt-1.5 text-sm text-red-600">{emailError}</p>
		{/if}
	</div>

	<div>
		<label for="user-role" class="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
		<select
			id="user-role"
			bind:value={role}
			disabled={submitting}
			aria-invalid={showErrors && roleError !== ''}
			aria-describedby={showErrors && roleError ? 'user-role-error' : undefined}
			class="{fieldClass} capitalize {showErrors && roleError
				? 'border-red-400'
				: 'border-slate-300'}"
		>
			{#each USER_ROLES as option (option)}
				<option value={option} class="capitalize">{option}</option>
			{/each}
		</select>
		{#if showErrors && roleError}
			<p id="user-role-error" class="mt-1.5 text-sm text-red-600">{roleError}</p>
		{/if}
	</div>

	<button
		type="submit"
		disabled={submitting}
		class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
	>
		{#if submitting}
			<span
				class="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
				aria-hidden="true"
			></span>
			Saving…
		{:else}
			{submitLabel}
		{/if}
	</button>
</form>
