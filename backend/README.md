# Backend — User API (FastAPI + PostgreSQL)

Async FastAPI service backing the SvelteKit frontend in [`../frontend`](../frontend). It exposes CRUD
endpoints for a single `User` entity, persisted in PostgreSQL through async SQLAlchemy 2.0 over
`asyncpg`. No authentication.

## Run

From the repo root (starts `frontend`, `backend`, and `db` together):

```bash
docker compose up --build
```

- API docs: <http://localhost:8080/docs>
- Health: <http://localhost:8080/health>

Editing anything under `app/` reloads uvicorn automatically (`--reload` + `WATCHFILES_FORCE_POLLING`).

Standalone (needs a reachable Postgres):

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

## Configuration

Environment variables (see `.env.example`; Compose sets both in the root `docker-compose.yml`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://appuser:apppassword@db:5432/appdb` | Async SQLAlchemy connection string. `db` is the Compose service name. |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of browser origins allowed to call the API. |

## Endpoints

| Operation | Method & path | Request body | Success | Response |
| --- | --- | --- | --- | --- |
| Create | `POST /users` | `UserCreate` | `201` | `UserRead` |
| List all | `GET /users` | — | `200` | `UserRead[]` (newest first) |
| Get one | `GET /users/{id}` | — | `200` | `UserRead` |
| Update | `PUT /users/{id}` | `UserUpdate` (full replace) | `200` | `UserRead` |
| Delete | `DELETE /users/{id}` | — | `204` | empty |
| Health | `GET /health` | — | `200` | `{"status": "ok"}` |

`UserCreate` / `UserUpdate` carry `name` (non-empty), `email` (validated), and `role`
(`admin` | `user` | `guest`, default `user`). `id` and `createdAt` are server-owned.

A successful response matches the frontend `User` type exactly:

```json
{
  "id": "68c23865-bba7-47d2-9ee7-39004e833598",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "admin",
  "createdAt": "2026-08-18T04:32:10.852044Z"
}
```

The DB column is `created_at`; `UserRead` serializes it as `createdAt` via `serialization_alias`, and
the UUID primary key is stringified so `id` is a plain string.

## Errors

Every non-2xx response uses one envelope:

```json
{ "error": { "message": "Human-readable description", "status": 404, "code": "not_found" } }
```

| Situation | Status | `code` |
| --- | --- | --- |
| Body fails validation | `422` | `validation_error` |
| `GET`/`PUT`/`DELETE` on an unknown (or malformed) id | `404` | `not_found` |
| Create/update with an email that already exists | `409` | `email_conflict` |
| Unhandled server error | `500` | `internal_error` (generic message; real details logged) |

Handlers live in `app/errors.py` and cover `AppError`, `HTTPException`, `RequestValidationError`, and
a catch-all `Exception`.

## Layout

```
app/
├── main.py       # app factory: lifespan(init_db), CORS, exception handlers, routers, /health
├── config.py     # Settings (DATABASE_URL, CORS_ORIGINS)
├── errors.py     # AppError + the error envelope handlers
├── db/
│   ├── base.py   # DeclarativeBase
│   └── session.py# engine, AsyncSessionLocal, get_session, init_db (with retry)
├── models/user.py  # SQLAlchemy 2.0 typed model; unique, indexed email
├── schemas/user.py # Pydantic v2 UserCreate / UserUpdate / UserRead
├── crud/user.py    # async DB operations; raises AppError for 404 / 409
└── routers/users.py# the endpoints above
```

## Schema management

Tables are created on startup with `Base.metadata.create_all` — there is no Alembic. `init_db` retries
up to 10 times, one second apart, so a race with Postgres coming up cannot crash the app; the Compose
`db` healthcheck plus `depends_on: condition: service_healthy` is the first line of defence. Data
survives restarts in the named `pgdata` volume; `docker compose down -v` wipes it.
