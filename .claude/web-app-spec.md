# SPEC.md — CRUD User Management Web App

## PROMPT

spec design template
I want to create  a simple web app that makes 4 api request to a backend service that performs a CRUD operation of form data. we will need a page for each of these operations, 1 to input user data, 1 to update existing user data, 1 to list and delete user account, 1 to simply list all users, create, read, update, delete operations. these should be in sub-domains. we will need a home page, from the home there should be a nav bar to navigate to the other 4 pages. so 5 pages total

create a spec driven development manifest i can feed into claude code to develop this very accurately and precisely

the web app should  be a simple web app interface and its tech stack for the web app i want to be typescript, vue.js, svelte tailwind css.  

i will wire up the backend myself later, i only want this in a local hosted web app using docker container with hot reloading enabled using volume mounts (use docker-compose.yml)

any questions?

---

> **Purpose of this file:** A spec-driven development manifest for Claude Code. Build the project exactly as described. Where a value is marked `[ASSUMPTION]`, it is a reasonable default chosen for you — keep it unless told otherwise. Do **not** invent features outside this spec.

---

## 1. Objective

Build a small, client-rendered single-page web app that performs CRUD operations on **User** records by calling a separate backend HTTP API. The backend does **not** exist yet and is **out of scope** — the app must make real `fetch` calls to a configurable base URL and degrade gracefully (clear loading and error states) when the backend is unreachable.

The app has **5 pages**: a home page plus one page per CRUD operation, reachable through a persistent nav bar.

---

## 2. Tech stack (locked — do not substitute)

| Concern | Choice |
| --- | --- |
| Language | TypeScript (strict mode, no `any`) |
| Framework | **SvelteKit** (Svelte 5), configured as a client-rendered SPA |
| Build tool / dev server | Vite (bundled with SvelteKit) |
| Styling | Tailwind CSS v4 (via the `@tailwindcss/vite` plugin) |
| Runtime image | `node:20-alpine` |
| Local orchestration | Docker + Docker Compose with bind-mount volumes and HMR |
| Data source | Real `fetch` calls only — **no mock data, no MSW, no fixtures** |

Vue.js is intentionally **not** used.

---

## 3. Scope & non-goals

**In scope:** the 5 pages, the nav bar, a typed API client, shared UI components, Tailwind styling, and a working Dockerized dev environment with hot reloading.

**Explicitly out of scope (do not build):**
- The backend API, any database, or any persistence.
- Authentication, authorization, sessions, or user login.
- Production build / deployment config (dev environment only).
- State management libraries (no Redux/Pinia/etc.) — use component-local state.
- Automated tests (optional; see §14).
- Real subdomains or reverse proxies — routing is via sub-routes only.

---

## 4. Data model

A single `User` entity. Define these types in `src/lib/types/user.ts`:

```ts
export type UserRole = 'admin' | 'user' | 'guest';

export interface User {
  id: string;          // server-generated (UUID). Read-only in the UI.
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;   // ISO 8601. server-generated. Read-only in the UI.
}

// Fields the user can submit when creating.
export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
}

// PUT is a full replace of the editable fields.
export type UpdateUserInput = CreateUserInput;
```

`[ASSUMPTION]` The editable fields are `name`, `email`, `role`. `id` and `createdAt` are always server-owned and never sent in request bodies. If the real user shape differs later, it changes in this one file only.

---

## 5. API contract

All requests go to `${VITE_API_BASE_URL}` (see §9). The four CRUD operations map to four HTTP verbs. `GET /users/:id` is a small reuse of the read verb to support the Update page.

| Operation | Method & path | Request body | Success | Returns |
| --- | --- | --- | --- | --- |
| Create | `POST /users` | `CreateUserInput` | `201` | `User` |
| Read (list all) | `GET /users` | — | `200` | `User[]` |
| Read (one) | `GET /users/:id` | — | `200` | `User` |
| Update | `PUT /users/:id` | `UpdateUserInput` | `200` | `User` |
| Delete | `DELETE /users/:id` | — | `204` | empty |

**API client requirements** (`src/lib/api/`):
- `client.ts` — a small typed `fetch` wrapper. Reads the base URL from `import.meta.env.VITE_API_BASE_URL`. Sets `Content-Type: application/json` on write requests. On any non-2xx response **or** network failure, it throws an `ApiError` carrying a human-readable message and, when available, the HTTP status. It never throws raw/undefined errors to the UI.
- `users.ts` — exports typed functions: `createUser`, `listUsers`, `getUser`, `updateUser`, `deleteUser`. Each returns a typed promise and delegates to `client.ts`.

Because the backend is not wired up, every call will currently fail — this is expected. The UI must surface those failures as error banners, never as an uncaught exception or blank screen.

---

## 6. Routing & pages

SvelteKit file-based routing. Configure the app as a **client-rendered SPA**: in `src/routes/+layout.ts` export `ssr = false` and `prerender = false`. Data fetching happens client-side in each page's `onMount` (there is no server to fetch from during SSR).

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Landing page + entry point |
| `/create` | Create | Input new user data (Create) |
| `/read` | Read | List all users (Read) |
| `/update` | Update | Update existing user data (Update) |
| `/delete` | Delete | List users and delete an account (Delete) |

### 6.1 Home — `/`
- No API calls.
- Heading + one-line description of the app.
- Four cards or buttons linking to `/create`, `/read`, `/update`, `/delete`, each with a short label describing the operation.

### 6.2 Create — `/create`
- Renders `UserForm` (empty) with fields: `name` (text), `email` (email), `role` (select of the three roles, default `user`).
- Client-side validation before submit: `name` non-empty, `email` non-empty and valid email format, `role` one of the allowed values. Show inline field errors.
- On submit → `createUser`. Disable the submit button and show a loading state while in flight.
- On success (`201`): show a success message and reset the form.
- On failure: show `ErrorBanner` with the error message; keep the entered values.

### 6.3 Read — `/read`
- On mount → `listUsers`.
- States: **loading** (spinner/skeleton) → **data** (`UserTable`) or **empty** (`EmptyState` when the array is empty) or **error** (`ErrorBanner`).
- `UserTable` columns: `id`, `name`, `email`, `role`, `createdAt` (format the date readably).
- A **Refresh** button re-runs the fetch.

### 6.4 Update — `/update`
- On mount → `listUsers` to populate a user picker (a `<select>` of existing users, labelled by name + email).
- Selecting a user loads its current values into `UserForm` (reuse the already-listed record; no separate `getUser` call needed unless the list is empty and the user typed an id — `getUser` is available for that path).
- Same validation as Create.
- On submit → `updateUser(id, input)` via `PUT`. Loading state on the button.
- On success (`200`): show success message and reflect the updated values.
- On failure: `ErrorBanner`.

### 6.5 Delete — `/delete`
- On mount → `listUsers`, render `UserTable` with a **Delete** button in each row.
- Clicking Delete opens a confirmation (inline confirm or small modal) naming the user.
- On confirm → `deleteUser(id)` via `DELETE`. Show a per-row loading/disabled state.
- On success (`204`): remove the row from local state (or re-fetch the list).
- On failure: `ErrorBanner`; keep the row.
- Empty and error states handled the same way as `/read`.

---

## 7. Shared components (`src/lib/components/`)

- **`Nav.svelte`** — persistent top nav bar rendered in `+layout.svelte`. Links to all 5 pages. Highlights the active route (use SvelteKit's `$page.url.pathname`). Collapses to a usable layout on small screens.
- **`UserForm.svelte`** — controlled form used by both Create and Update. Props: initial values (optional) and a submit handler. Emits typed submit payload. Owns field-level validation display. Does **not** call the API itself — the parent page does.
- **`UserTable.svelte`** — renders `User[]`. Optional per-row action slot (used by `/delete` for the Delete button).
- **`LoadingState.svelte`** — spinner/skeleton.
- **`ErrorBanner.svelte`** — prop: message string. Dismissible.
- **`EmptyState.svelte`** — shown when a list returns zero rows.

Keep components presentational; pages own data fetching and API calls.

---

## 8. Project structure

```
.
├── docker-compose.yml
├── Dockerfile.dev
├── .dockerignore
├── .env                      # VITE_API_BASE_URL (git-ignored)
├── .env.example
├── package.json
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── app.html
    ├── app.css               # Tailwind entry: @import "tailwindcss";
    ├── routes/
    │   ├── +layout.svelte    # Nav + page content
    │   ├── +layout.ts        # export const ssr = false; export const prerender = false;
    │   ├── +page.svelte      # Home
    │   ├── create/+page.svelte
    │   ├── read/+page.svelte
    │   ├── update/+page.svelte
    │   └── delete/+page.svelte
    └── lib/
        ├── api/
        │   ├── client.ts
        │   └── users.ts
        ├── types/
        │   └── user.ts
        └── components/
            ├── Nav.svelte
            ├── UserForm.svelte
            ├── UserTable.svelte
            ├── LoadingState.svelte
            ├── ErrorBanner.svelte
            └── EmptyState.svelte
```

---

## 9. Configuration

- The API base URL is read from the Vite env var **`VITE_API_BASE_URL`** via `import.meta.env.VITE_API_BASE_URL`.
- `[ASSUMPTION]` Default value: `http://localhost:8080`. Change it in one place (`.env` / compose) when the backend is ready.
- Provide `.env.example` documenting the variable. Add `.env` to `.gitignore`.
- If the var is missing at runtime, the client wrapper falls back to the default and logs a warning — it must not crash the app.

---

## 10. Styling / design direction (Tailwind)

Aim for a clean, modern, uncluttered admin-tool look. Keep it consistent across pages.

- **Layout:** centered content, max width ~`max-w-4xl`, generous vertical spacing, page padding `px-4`.
- **Nav:** full-width top bar, app title on the left, page links on the right; active link visually distinct (e.g. font weight + underline or accent color).
- **Cards / panels:** white surface, subtle border, `rounded-2xl`, soft shadow, `p-6`.
- **Buttons:** primary (solid accent), secondary (outline), destructive (red) for delete. Disabled + loading states must be visible.
- **Forms:** labelled inputs, full-width, focus ring, inline red validation text under invalid fields.
- **Tables:** zebra rows or row dividers, readable header, horizontal scroll on small screens.
- **Feedback:** success = green banner/toast, error = red `ErrorBanner`.
- **Accessibility:** real `<label>`s tied to inputs, buttons are `<button>`, sufficient contrast, keyboard-usable confirm dialog.

`[ASSUMPTION]` Pick a single accent color (e.g. indigo/blue) and use it consistently. Use only Tailwind utility classes — no separate CSS files beyond `app.css`.

---

## 11. Docker & hot reloading

The app runs entirely inside a container; source is bind-mounted so edits on the host hot-reload in the browser.

### `Dockerfile.dev`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### `docker-compose.yml`
```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app                 # bind-mount source for hot reload
      - /app/node_modules      # anonymous volume: keep container's deps, don't clobber with host
    environment:
      - CHOKIDAR_USEPOLLING=true          # reliable file watching inside Docker
      - VITE_API_BASE_URL=http://localhost:8080
    command: npm run dev -- --host 0.0.0.0
```

### `vite.config.ts` (server section — required for HMR in Docker)
```ts
server: {
  host: true,          // bind 0.0.0.0 so the host machine can reach it
  port: 5173,
  strictPort: true,
  watch: { usePolling: true }   // needed for bind-mounted file changes to trigger HMR
  // If HMR fails to connect in the browser, also set: hmr: { clientPort: 5173 }
}
```

### `.dockerignore`
```
node_modules
.git
.svelte-kit
build
.env
```

**Notes for the implementer:**
- The anonymous `/app/node_modules` volume is essential — without it the host bind-mount hides the deps installed during the image build.
- `usePolling` + `CHOKIDAR_USEPOLLING` make file watching reliable across macOS/Windows/Linux Docker Desktop.
- SvelteKit's dev server (Vite) provides HMR; no extra config beyond the above.

---

## 12. How to run

```bash
docker compose up --build
```
Then open **http://localhost:5173**. Editing any file under `src/` should hot-reload the browser without a manual refresh.

---

## 13. Build order (do this sequentially)

1. Scaffold a SvelteKit + TypeScript project (Svelte 5). Use the official Svelte CLI (`npx sv create`), selecting the TypeScript and Tailwind (v4) options; if the Tailwind option isn't offered, add it via `npx sv add tailwindcss`. Confirm `src/app.css` contains `@import "tailwindcss";` and Tailwind is wired through `@tailwindcss/vite`.
2. Configure the SPA + dev-server settings: `+layout.ts` (`ssr = false`, `prerender = false`) and the `vite.config.ts` `server` block from §11.
3. Add `src/lib/types/user.ts` (§4).
4. Add the API client: `client.ts` then `users.ts` (§5).
5. Build shared components (§7): `Nav`, `LoadingState`, `ErrorBanner`, `EmptyState`, `UserTable`, `UserForm`.
6. Build `+layout.svelte` with the nav bar, then the Home page.
7. Build the four operation pages in order: `/create`, `/read`, `/update`, `/delete` (§6).
8. Apply Tailwind styling per §10.
9. Add `Dockerfile.dev`, `docker-compose.yml`, `.dockerignore`, `.env.example`, and `.env` (§11).
10. Run `docker compose up --build`, verify all 5 routes render and hot reload works. API calls will error until the backend exists — confirm each page shows a graceful error state rather than crashing.

---

## 14. Optional (only if trivial)

- One smoke test that the API client builds the correct URL/method per operation.
- Skip if it adds meaningful complexity — tests are not a requirement.

---

## 15. Definition of done (acceptance criteria)

- [ ] `docker compose up --build` starts the app; it's reachable at `http://localhost:5173`.
- [ ] Editing a `src/` file hot-reloads the browser with no manual refresh.
- [ ] All 5 routes exist and render: `/`, `/create`, `/read`, `/update`, `/delete`.
- [ ] The nav bar appears on every page and highlights the active route.
- [ ] `/create` validates input and calls `POST /users`.
- [ ] `/read` calls `GET /users` and shows loading, data, empty, and error states.
- [ ] `/update` lists users, loads a selected user into the form, and calls `PUT /users/:id`.
- [ ] `/delete` lists users and calls `DELETE /users/:id` behind a confirmation.
- [ ] Every API call routes through the typed client and reads the base URL from `VITE_API_BASE_URL`.
- [ ] With the backend absent, no page crashes or shows a blank screen — each shows a clear error state.
- [ ] TypeScript is strict; there are no `any` types and no type errors.
- [ ] Styling is Tailwind-only and consistent across pages.
- [ ] No Vue, no mock data, no backend code is present.