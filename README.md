# simple_webui — user management monorepo

Three isolated targets: two web services orchestrated by Docker Compose, plus a native desktop shell.

| Directory | App | Port |
| --- | --- | --- |
| `frontend/` | SvelteKit 5 + TypeScript + Tailwind v4 SPA | 5173 |
| `backend/` | FastAPI + async SQLAlchemy (asyncpg) | 8080 |
| `desktop/` | Tauri 2 native shell around the same frontend (not Dockerized) | — |
| — | PostgreSQL 16 (`db` service, named volume `pgdata`) | 5432 |

No target shares tooling or code with another; each has its own dependency manifest, and the two web
services each have their own Dockerfile.

## Run

```bash
docker compose up --build
```

- Frontend: <http://localhost:5173>
- API docs: <http://localhost:8080/docs>
- Health: <http://localhost:8080/health>
- Postgres: `localhost:5432` (user `appuser`, password `apppassword`, db `appdb`)

Editing `frontend/src` hot-reloads the browser (Vite HMR); editing `backend/app` reloads uvicorn.

## Desktop app

```bash
docker compose up backend db      # API + database
docker compose up frontend        # dev server on :5173 (or: npm --prefix frontend run dev)
npm --prefix desktop run tauri dev
```

`npm --prefix desktop run tauri build` produces native installers. Prerequisites (Rust, Node 20+, OS
webview deps) and details are in [desktop/README.md](desktop/README.md).

## API

| Operation | Endpoint | Success |
| --- | --- | --- |
| Create | `POST /users` | `201` |
| List | `GET /users` | `200` |
| Get one | `GET /users/{id}` | `200` |
| Update (full replace) | `PUT /users/{id}` | `200` |
| Delete | `DELETE /users/{id}` | `204` |
| Health | `GET /health` | `200` |

Every failure returns one envelope:

```json
{ "error": { "message": "...", "status": 404, "code": "not_found" } }
```

Codes: `validation_error` (422), `not_found` (404), `email_conflict` (409), `internal_error` (500).

Tables are created automatically on backend startup (no migrations), with a retry loop backing up the
Compose healthcheck on `db`. There is no authentication.
