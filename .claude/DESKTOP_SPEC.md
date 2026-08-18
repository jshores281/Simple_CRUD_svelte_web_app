# DESKTOP_SPEC.md — Tauri 2 Desktop App

> **Purpose of this file:** A spec-driven development manifest for Claude Code, adding a **desktop** target that wraps the existing SvelteKit frontend (see `SPEC.md`) using **Tauri 2**. It lives in its own top-level `desktop/` directory alongside `frontend/` and `backend/`. It is **not** Dockerized. Build exactly as described. Values marked `[ASSUMPTION]` are chosen defaults — keep them unless told otherwise. Do **not** rewrite the frontend UI; Tauri reuses it as-is.

---

## 1. Objective

Package the existing Svelte + TypeScript + Tailwind SPA as a native desktop application for **Windows, macOS, and Linux** using Tauri 2. The desktop app:

- Renders the **same** `frontend/` build inside the OS webview (no UI rewrite).
- Calls the existing FastAPI backend over HTTP, exactly like the browser does.
- Supports hot reloading during development (Vite HMR flows through the Tauri webview).
- Produces small native bundles (a few MB), not a bundled browser.

> **Note:** Tauri 2 can target desktop and mobile from a single project. This spec intentionally scopes to **desktop only** in `desktop/`, per the requested directory layout. The mobile target is a separate spec (`MOBILE_SPEC.md`) in `mobile/`. The two share the same `frontend/` build but keep independent Tauri scaffolds.

---

## 2. Tech stack (locked — do not substitute)

| Concern | Choice |
| --- | --- |
| Desktop shell | **Tauri 2** |
| Native core language | Rust (scaffold only — you write little to no Rust) |
| Rendered content | The existing `frontend/` static build (HTML/CSS/JS) |
| Webview | OS-native (WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux) |
| Frontend framework | Unchanged (Svelte 5 / TS / Tailwind, built via Vite) |
| Containerized? | **No** — native toolchain on the host |

---

## 3. Prerequisites (host machine, not Docker)

Document these in `desktop/README.md`:

- **Rust toolchain** via `rustup` (stable). Required to build even though little Rust is written.
- **Node.js 20+** (to build the frontend and run the Tauri CLI).
- **OS webview / build dependencies:**
  - Windows: WebView2 runtime + MSVC build tools.
  - macOS: Xcode Command Line Tools.
  - Linux: `webkit2gtk`, `libayatana-appindicator`, `librsvg`, and related dev packages (per the Tauri Linux prerequisites).

The FastAPI backend + Postgres still run via `docker compose up` as defined in `BACKEND_SPEC.md`; the desktop app is a separate native process that talks to `http://localhost:8080`.

---

## 4. Directory structure

```
.
├── docker-compose.yml        # frontend, backend, db (unchanged)
├── frontend/                 # existing SvelteKit SPA (shared build source)
├── backend/                  # existing FastAPI service
└── desktop/                  # NEW — Tauri 2 desktop project
    ├── README.md             # prerequisites + run instructions
    ├── package.json          # @tauri-apps/cli v2 + scripts (tauri)
    └── src-tauri/
        ├── Cargo.toml
        ├── build.rs
        ├── tauri.conf.json   # points at ../../frontend
        ├── capabilities/
        │   └── default.json
        ├── icons/            # generated app icons
        └── src/
            ├── main.rs       # thin entry → lib::run()
            └── lib.rs        # standard Tauri builder (mobile-ready entry point)
```

`desktop/` contains only the Tauri wrapper. The UI code stays in `frontend/`.

---

## 5. Shared prerequisite (one-time, idempotent): static frontend build

Tauri bundles static assets, so the frontend must build to a static SPA. Apply this in `frontend/` **only if not already done** (the same change is required by `MOBILE_SPEC.md` — running either spec first satisfies both):

1. Install and switch to **`@sveltejs/adapter-static`** in `frontend/svelte.config.js`, configured for SPA fallback:
   ```js
   import adapter from '@sveltejs/adapter-static';
   export default {
     kit: {
       adapter: adapter({ fallback: 'index.html' }) // SPA fallback for client-side routing
     }
   };
   ```
2. The root layout already sets `export const ssr = false;` and `export const prerender = false;` (from `SPEC.md`) — keep them. That combination + the static adapter produces a pure client-rendered SPA.
3. `npm run build` in `frontend/` must emit a static site to `frontend/build/`.

This does **not** affect the Dockerized dev workflow: `npm run dev` still uses the Vite dev server regardless of adapter. The adapter only changes `npm run build` output.

---

## 6. Tauri configuration

Scaffold with the Tauri CLI (`npm create tauri-app` / `tauri init`) inside `desktop/`, then set `src-tauri/tauri.conf.json` to point at the external frontend:

```jsonc
{
  "productName": "CRUD App",
  "version": "0.1.0",
  "identifier": "com.example.crudapp.desktop",   // [ASSUMPTION] change to your reverse-domain id
  "build": {
    // Frontend runs separately; do NOT auto-start it here to avoid a :5173 port clash.
    "beforeDevCommand": "",
    "devUrl": "http://localhost:5173",
    // Build fresh static assets before bundling a release:
    "beforeBuildCommand": "npm --prefix ../../frontend run build",
    "frontendDist": "../../frontend/build"
  },
  "app": {
    "windows": [
      { "title": "CRUD App", "width": 1000, "height": 720, "resizable": true }
    ],
    "security": {
      // Allow the webview to call the backend. In dev you may relax CSP; in prod scope it tightly.
      "csp": "default-src 'self'; connect-src 'self' http://localhost:8080"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all"
  }
}
```

- `src-tauri/src/lib.rs` holds a standard `tauri::Builder` in a `run()` function annotated for mobile-readiness (`#[cfg_attr(mobile, tauri::mobile_entry_point)]`), and `main.rs` just calls it. This is default scaffold — no custom Rust logic is required for this app.
- `desktop/package.json` includes `@tauri-apps/cli` (v2) and scripts: `"tauri": "tauri"` so you can run `npm run tauri dev` / `npm run tauri build`.

`[ASSUMPTION]` App name "CRUD App", window 1000×720, bundle id `com.example.crudapp.desktop` — cosmetic; change freely.

---

## 7. Backend integration (CORS)

The desktop app runs on the same machine as the backend, so `http://localhost:8080` is reachable directly — no addressing changes needed (unlike mobile).

**However**, the Tauri webview's origin differs from a normal browser, so add the desktop webview origins to the backend's allowed CORS origins (`backend` service env `CORS_ORIGINS`, per `BACKEND_SPEC.md`):

- `http://localhost:5173` (dev, via `devUrl`) — already allowed.
- `tauri://localhost` (macOS / Linux production webview).
- `http://tauri.localhost` (Windows production webview).

Update `CORS_ORIGINS` to a comma-separated list including these, and ensure the backend's CORS middleware splits and honors them.

**Alternative (optional, not required):** use the `@tauri-apps/plugin-http` plugin so requests are made from Tauri's native (Rust) side, bypassing webview CORS entirely. This avoids the CORS additions but couples the frontend to a Tauri dependency, so it's kept optional to preserve frontend isolation. If chosen, gate it behind a Tauri runtime check in `frontend/src/lib/api/client.ts` and allowlist the backend URL in `capabilities/default.json`.

No other frontend changes.

---

## 8. Development & build

**Dev (with hot reload):**
1. Start backend + DB: `docker compose up backend db`.
2. Start the frontend dev server at `:5173` — either `docker compose up frontend` **or** `npm --prefix frontend run dev` (run only one to avoid a port clash).
3. From `desktop/`: `npm run tauri dev`. Tauri opens a native window loading `devUrl`; editing `frontend/src` hot-reloads inside the window via Vite HMR.

**Production build:**
- From `desktop/`: `npm run tauri build`. This runs `beforeBuildCommand` (static frontend build) and produces native installers/binaries under `desktop/src-tauri/target/release/bundle/`.

---

## 9. Build order (do this sequentially)

1. Apply the shared static-frontend change in §5 (skip if already done by the mobile spec).
2. Scaffold the Tauri 2 project in `desktop/` (`tauri init` / `create-tauri-app`), choosing the "use existing frontend" path.
3. Set `src-tauri/tauri.conf.json` per §6 (external `frontendDist`, `devUrl`, `beforeBuildCommand`, identifier, window, CSP).
4. Confirm `lib.rs`/`main.rs` are the standard scaffold; add no custom commands.
5. Add the desktop webview origins to the backend `CORS_ORIGINS` (§7).
6. Write `desktop/README.md` with prerequisites (§3) and run steps (§8).
7. Verify dev: backend/db up, frontend dev server up, `npm run tauri dev` opens a window doing full CRUD with hot reload.
8. Verify build: `npm run tauri build` produces a native bundle that performs CRUD against the running backend.

---

## 10. Definition of done (acceptance criteria)

- [ ] `desktop/` is a self-contained Tauri 2 project; the frontend UI is reused unchanged (no Svelte rewrite).
- [ ] The frontend builds to static assets via `adapter-static`; the Dockerized dev workflow still works.
- [ ] `npm run tauri dev` opens a native window, loads the app, and hot-reloads on `frontend/src` edits.
- [ ] The desktop app performs full CRUD against `http://localhost:8080` with no CORS errors (Tauri origins allowed on the backend).
- [ ] `npm run tauri build` produces native installers/binaries for the host OS.
- [ ] Nothing in `desktop/` is Dockerized; prerequisites are documented in `desktop/README.md`.
- [ ] No changes to backend behavior beyond the CORS origin additions; no frontend UI changes.