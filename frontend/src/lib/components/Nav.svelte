<script lang="ts">
	import { page } from '$app/state';

	const links: { href: string; label: string }[] = [
		{ href: '/', label: 'Home' },
		{ href: '/create', label: 'Create' },
		{ href: '/read', label: 'Read' },
		{ href: '/update', label: 'Update' },
		{ href: '/delete', label: 'Delete' }
	];

	const isActive = (href: string): boolean =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<header class="border-b border-slate-200 bg-white">
	<nav
		aria-label="Main"
		class="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<a href="/" class="text-lg font-semibold tracking-tight text-slate-900">
			User<span class="text-indigo-600">Admin</span>
		</a>
		<ul class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
			{#each links as link (link.href)}
				<li>
					<a
						href={link.href}
						aria-current={isActive(link.href) ? 'page' : undefined}
						class="rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
							{isActive(link.href)
							? 'font-semibold text-indigo-600 underline decoration-2 underline-offset-8'
							: 'font-medium text-slate-600 hover:text-slate-900'}"
					>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</header>
