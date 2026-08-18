# UserAdmin — CRUD user management SPA

A client-rendered SvelteKit (Svelte 5) + TypeScript + Tailwind v4 single-page app that performs CRUD
operations on `User` records against a separate backend HTTP API. The backend is **not** part of this
repo — every call is a real `fetch`, and each page degrades to a clear error state while the API is
unavailable.

## Run

```bash
docker compose up --build
```

Open <http://localhost:5173>. Editing anything under `src/` hot-reloads the browser.

To run outside Docker: `npm install && npm run dev`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL of the backend user API |

Set it in `.env` (see `.env.example`) for local runs, or in the `environment:` block of
`docker-compose.yml` for the container.

## Pages

| Route | Operation |
| --- | --- |
| `/` | Home / entry point |
| `/create` | `POST /users` |
| `/read` | `GET /users` |
| `/update` | `GET /users`, `GET /users/:id`, `PUT /users/:id` |
| `/delete` | `GET /users`, `DELETE /users/:id` |

## Layout

- `src/lib/types/user.ts` — the `User` shape and input types (the single place to change it).
- `src/lib/api/client.ts` — typed `fetch` wrapper; throws `ApiError` on any non-2xx or network failure.
- `src/lib/api/users.ts` — one typed function per CRUD operation.
- `src/lib/components/` — presentational components; pages own all data fetching.

## Scripts

- `npm run dev` — dev server
- `npm run check` — `svelte-check` type check (strict, no `any`)
