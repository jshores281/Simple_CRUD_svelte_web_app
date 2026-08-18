import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA build (fallback for client-side routing) — consumed by the Tauri shells.
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	server: {
		host: true, // bind 0.0.0.0 so the host machine can reach the container
		port: 5173,
		strictPort: true,
		watch: {
			usePolling: true, // bind-mounted file changes only trigger HMR with polling
			ignored: ['**/build/**'] // the static build output (consumed by the Tauri shells) is not a source
		}
		// If HMR fails to connect in the browser, also set: hmr: { clientPort: 5173 }
	}
});
