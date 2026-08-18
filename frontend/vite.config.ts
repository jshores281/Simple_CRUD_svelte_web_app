import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
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
			adapter: adapter()
		})
	],
	server: {
		host: true, // bind 0.0.0.0 so the host machine can reach the container
		port: 5173,
		strictPort: true,
		watch: { usePolling: true } // bind-mounted file changes only trigger HMR with polling
		// If HMR fails to connect in the browser, also set: hmr: { clientPort: 5173 }
	}
});
