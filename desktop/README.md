# Desktop — Tauri 2 shell

Packages the existing SvelteKit SPA in [`../frontend`](../frontend) as a native desktop app for
Windows, macOS, and Linux. There is **no UI code here** — the webview renders the same frontend the
browser does, and talks to the FastAPI backend at `http://localhost:8080` over plain HTTP.

Nothing in this directory is Dockerized; it builds with the native toolchain on your machine.

## Prerequisites

- **Rust (stable)** via [rustup](https://rustup.rs) — required even though this project contains
  almost no Rust of its own.
- **Node.js 20+** — builds the frontend and runs the Tauri CLI.
- **OS webview / build dependencies:**
  - **Windows:** [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/)
    (preinstalled on Windows 11) and the MSVC build tools (Visual Studio Build Tools with the
    "Desktop development with C++" workload).
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`).
  - **Linux:** `webkit2gtk-4.1`, `libayatana-appindicator3`, `librsvg2`, plus `build-essential`,
    `curl`, `wget`, `file`, `libssl-dev` — see the
    [Tauri Linux prerequisites](https://tauri.app/start/prerequisites/).

Install this project's Node dependencies once:

```bash
npm install
```

## Development (hot reload)

Run these from the repo root unless noted:

1. Start the API and database:
   ```bash
   docker compose up backend db
   ```
2. Start the frontend dev server on `:5173` — **one** of these, never both (port clash):
   ```bash
   docker compose up frontend        # containerized
   npm --prefix frontend run dev     # on the host
   ```
3. Launch the desktop window:
   ```bash
   npm --prefix desktop run tauri dev
   ```

Tauri opens a native window pointed at `devUrl` (`http://localhost:5173`), so editing anything under
`frontend/src` hot-reloads inside the window through Vite HMR. `beforeDevCommand` is intentionally
empty so Tauri does not start a second dev server.

## Production build

```bash
npm run tauri build
```

This runs `beforeBuildCommand` (`npm --prefix ../../frontend run build`, which emits the static SPA to
`frontend/build/` via `@sveltejs/adapter-static`), compiles the Rust binary, and writes installers and
executables to `src-tauri/target/release/bundle/`:

- Windows: `bundle/msi/*.msi`, `bundle/nsis/*-setup.exe`
- macOS: `bundle/dmg/*.dmg`, `bundle/macos/*.app`
- Linux: `bundle/deb/*.deb`, `bundle/appimage/*.AppImage`, `bundle/rpm/*.rpm`

The bundled app still needs the backend running (`docker compose up backend db`) — it is a client, not
a server.

## Backend CORS

The webview's origin is not `http://localhost:5173` in a production build, so the backend allows all
three origins via `CORS_ORIGINS` in the root `docker-compose.yml`:

| Origin | When |
| --- | --- |
| `http://localhost:5173` | development (`devUrl`) |
| `tauri://localhost` | production webview on macOS and Linux |
| `http://tauri.localhost` | production webview on Windows |

## Configuration notes

Everything lives in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json):

- `frontendDist: "../../frontend/build"` — the desktop shell consumes the shared frontend build
  rather than owning a copy.
- `identifier: "com.example.crudapp.desktop"` — change to your own reverse-domain id before shipping.
- Window: 1000×720, resizable, titled "CRUD App".
- CSP: `connect-src` allows `http://localhost:8080` so the webview can reach the API. `script-src` and
  `style-src` include `'unsafe-inline'` because SvelteKit's static output bootstraps from an inline
  `<script>` and the page uses inline `style` attributes; without it the production window renders
  blank. Tighten it if you switch to a hashed/nonced bootstrap.

`src-tauri/src/main.rs` and `src-tauri/src/lib.rs` are the stock scaffold — `main.rs` calls
`app_lib::run()`, and `run()` is annotated with `#[cfg_attr(mobile, tauri::mobile_entry_point)]`. No
custom Tauri commands are defined.
