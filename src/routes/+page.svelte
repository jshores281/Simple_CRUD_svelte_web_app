<script lang="ts">
	const operations: { href: string; title: string; description: string }[] = [
		{ href: '/create', title: 'Create', description: 'Add a new user record (POST /users).' },
		{ href: '/read', title: 'Read', description: 'Browse every user in the system (GET /users).' },
		{
			href: '/update',
			title: 'Update',
			description: 'Pick a user and replace their details (PUT /users/:id).'
		},
		{
			href: '/delete',
			title: 'Delete',
			description: 'Remove a user after confirming (DELETE /users/:id).'
		}
	];
</script>

<svelte:head><title>UserAdmin</title></svelte:head>

<section class="space-y-2">
	<h1 class="text-3xl font-semibold tracking-tight">User management</h1>
	<p class="text-slate-600">
		A small admin console for creating, reading, updating, and deleting user records through the
		backend API.
	</p>
</section>

<div class="mt-8 grid gap-4 sm:grid-cols-2">
	{#each operations as operation (operation.href)}
		<a
			href={operation.href}
			class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
		>
			<h2 class="text-lg font-semibold text-slate-900">{operation.title}</h2>
			<p class="mt-1 text-sm text-slate-600">{operation.description}</p>
			<span class="mt-4 inline-block text-sm font-medium text-indigo-600">Go &rarr;</span>
		</a>
	{/each}
</div>
