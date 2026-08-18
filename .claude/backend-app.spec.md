# BACKEND_SPEC.md — FastAPI + PostgreSQL Backend & Monorepo Restructure

## PROMPT

ok this works well as a SPA web app. great work, now lets create the backend for it
i want to create a second SDD (spec-driven-development) manifest to accomplish the following

isolate the web app tech stack into its own directory labeled frontend
create a new directory for the backend labeled backend
in the backend app i want a fast api that exposes the endpoints needed for the front-end to make the requests and return the responses the front-end expects to parse successful and failed response types
in the backend directory i also want a database connector that connects to an actual database hosted in its own docker container in the compose stack
i want hot reloading in the fastapi app
i want the database to be postgresql
at the end of this there should be 3 containers in the compose stack, the web app, the fastapi app, the postgres database
the fast api does not need any authentication at the moment
again i want the front end isolated in the codebase from the backend api (frontend, backend)
create another sdd mark down file for this.
any questions?

---

> **Purpose of this file:** A spec-driven development manifest for Claude Code, extending the existing SvelteKit frontend (see `web-app-spec.md`). It restructures the repo into `frontend/` + `backend/`, adds a FastAPI service backed by PostgreSQL, and orchestrates all three services in one Docker Compose stack. Build exactly as described. Values marked `[ASSUMPTION]` are chosen defaults — keep them unless told otherwise. Do **not** add features outside this spec (no auth, no extra endpoints beyond those listed).

---

## 1. Objective

Add a real backend for the existing frontend:

- Reorganize the codebase into two isolated top-level directories: **`frontend/`** (the existing SvelteKit app, moved unchanged) and **`backend/`** (new).
- The backend is a **FastAPI** app exposing exactly the CRUD endpoints the frontend already calls, returning the success and error response shapes the frontend expects to parse.
- The backend persists data in **PostgreSQL**, running in its own container, reached through an async database connector.
- The final Compose stack has **three containers**: `frontend`, `backend`, `db`.
- Hot reloading is enabled for both the frontend (Vite HMR, already done) and the backend (uvicorn `--reload`).
- **No authentication** at this stage.

---

## 2. Tech stack (locked — do not substitute)

| Concern | Choice |
| --- | --- |
| Language | Python 3.12 |
| Web framework | FastAPI |
| ASGI server | uvicorn (`--reload` for dev) |
| DB access | **async SQLAlchemy 2.0** (`postgresql+asyncpg` driver) |
| Validation / serialization | Pydantic v2 |
| Settings | pydantic-settings (env-driven) |
| Schema management | **Auto-create tables on startup** (`Base.metadata.create_all`) — no Alembic |
| Dependencies | **pip + `requirements.txt`** |
| Database | PostgreSQL 16 (`postgres:16-alpine`) |
| Orchestration | Docker Compose, 3 services, bind-mount volumes, hot reload |

---

## 3. Repository restructure (do this first)

Turn the current single-app repo into a monorepo:

```
.                              # repo root (only orchestration + shared config lives here)
├── docker-compose.yml         # NEW root compose — orchestrates all 3 services
├── .gitignore
├── web-app-spec.md                    # existing frontend spec
├── backend-app.spec.md            # this file
├── frontend/                  # the ENTIRE existing SvelteKit app, moved here unchanged
│   ├── Dockerfile.dev
│   ├── .dockerignore
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/ ...
│   └── ...
└── backend/                   # NEW FastAPI app
    ├── Dockerfile.dev
    ├── .dockerignore
    ├── requirements.txt
    ├── .env.example
    └── app/ ...
```

**Restructure steps:**
1. Create `frontend/` and move every existing frontend file/dir into it (all of `src/`, `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `Dockerfile.dev`, `.dockerignore`, `.env.example`, etc.). The frontend's internals do not change.
2. **Delete the old root `docker-compose.yml`** from the frontend spec — it is replaced by the new root compose in §8, whose `frontend` service is equivalent but points at `./frontend`.
3. Keep `frontend/Dockerfile.dev` exactly as-is; only the Compose `build.context` changes to `./frontend`.
4. The frontend keeps `VITE_API_BASE_URL=http://localhost:8080` — unchanged and still correct (the browser reaches the backend on the host-mapped port).

Frontend and backend must remain **fully isolated** in the codebase: no shared build tooling, no cross-imports, each with its own Dockerfile and dependency manifest.

---

## 4. API contract (must match the frontend exactly)

Base URL in the browser: `http://localhost:8080`. All endpoints are unauthenticated.

| Operation | Method & path | Request body | Success status | Response body |
| --- | --- | --- | --- | --- |
| Create | `POST /users` | `UserCreate` | `201` | `UserRead` |
| List all | `GET /users` | — | `200` | `UserRead[]` |
| Get one | `GET /users/{id}` | — | `200` | `UserRead` |
| Update | `PUT /users/{id}` | `UserUpdate` (full replace) | `200` | `UserRead` |
| Delete | `DELETE /users/{id}` | — | `204` | empty |
| Health | `GET /health` | — | `200` | `{"status": "ok"}` |

`GET /users/{id}` and `GET /health` are the only additions beyond the four CRUD verbs; `/health` is for ops/compose only and is not called by the UI.

### 4.1 Response schemas (Pydantic v2)

```python
# schemas/user.py
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field

UserRole = Literal["admin", "user", "guest"]

class UserBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    role: UserRole = "user"

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):   # PUT is a full replace — same fields as create
    pass

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: EmailStr
    role: UserRole
    # CRITICAL: DB column is created_at, but the frontend User type expects camelCase `createdAt`.
    created_at: datetime = Field(serialization_alias="createdAt")
```

**Serialization requirements (integration-critical):**
- The JSON keys returned to the frontend must be exactly `id`, `name`, `email`, `role`, `createdAt` to match the frontend `User` interface. Use `serialization_alias="createdAt"` (FastAPI serializes responses with `by_alias=True` by default).
- `id` is a UUID stored in the DB but must serialize as a **string** (matching the frontend's `id: string`).
- `created_at` serializes as an **ISO 8601** string.

### 4.2 Error response schema (the "failed response type")

Every non-2xx response — validation errors, not-found, conflicts, and unexpected errors — must return this single, consistent envelope so the frontend can parse failures uniformly:

```json
{
  "error": {
    "message": "Human-readable description",
    "status": 404,
    "code": "not_found"
  }
}
```

Error cases to implement:

| Situation | Status | `code` |
| --- | --- | --- |
| Request body fails validation | `422` | `validation_error` |
| `GET/PUT/DELETE` on unknown id | `404` | `not_found` |
| Create/update with an email that already exists | `409` | `email_conflict` |
| Any unhandled server error | `500` | `internal_error` (generic message; log the real details) |

Implement this in `app/errors.py` via:
- A custom `AppError(status: int, code: str, message: str)` exception raised by CRUD/routers.
- Exception handlers registered on the app for: `AppError`, FastAPI's `HTTPException`, Pydantic/FastAPI's `RequestValidationError`, and a catch-all `Exception` — each returning the envelope above with the correct status.

---

## 5. Data model (SQLAlchemy 2.0)

```python
# models/user.py — mapped with SQLAlchemy 2.0 typed style (Mapped / mapped_column)
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False, default="user")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

`[ASSUMPTION]` `email` is **unique** (a duplicate returns `409 email_conflict`) — this gives the frontend a meaningful non-404 failure path. `role` is stored as a plain string and validated at the Pydantic layer via `Literal`, avoiding native Postgres enum migration pain.

---

## 6. Database connector (`backend/app/db/`)

- **`base.py`** — `class Base(DeclarativeBase): ...`.
- **`session.py`**:
  - `engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)`
  - `AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)`
  - `async def get_session() -> AsyncGenerator[AsyncSession, None]:` — FastAPI dependency that yields a session and closes it.
  - `async def init_db() -> None:` — create tables:
    ```python
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    ```
    Wrap this in a short **retry loop** (e.g. up to ~10 attempts, 1s apart) so a race with Postgres startup doesn't crash the app.
  - Ensure `app.models.user` is imported before `create_all` runs so the table is registered on the metadata.

**Connection string** comes from the `DATABASE_URL` env var, e.g.
`postgresql+asyncpg://appuser:apppassword@db:5432/appdb`
(the host is the Compose service name `db`, reachable on the internal network).

---

## 7. Backend structure & app wiring

```
backend/
├── Dockerfile.dev
├── .dockerignore
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── main.py          # create app, CORS, lifespan(init_db), routers, exception handlers
    ├── config.py        # Settings(BaseSettings): DATABASE_URL, CORS_ORIGINS
    ├── errors.py        # AppError + exception handlers (envelope from §4.2)
    ├── db/
    │   ├── __init__.py
    │   ├── base.py
    │   └── session.py
    ├── models/
    │   ├── __init__.py
    │   └── user.py
    ├── schemas/
    │   ├── __init__.py
    │   └── user.py
    ├── crud/
    │   ├── __init__.py
    │   └── user.py      # async DB ops: create, list, get, update, delete
    └── routers/
        ├── __init__.py
        └── users.py     # endpoints from §4, using get_session + crud + schemas
```

**`main.py` responsibilities:**
- Create the FastAPI app with a `lifespan` context manager that calls `init_db()` on startup and disposes the engine on shutdown.
- Add `CORSMiddleware` allowing the origins in `settings.CORS_ORIGINS` (default `http://localhost:5173`), with all methods and headers.
- Register the exception handlers from `errors.py`.
- Include the `users` router and the `/health` route.

**`crud/user.py`** — async functions taking an `AsyncSession`: `create_user`, `list_users` (ordered by `created_at` desc), `get_user`, `update_user`, `delete_user`. Not-found conditions raise `AppError(404, "not_found", ...)`; duplicate-email `IntegrityError` is caught and re-raised as `AppError(409, "email_conflict", ...)`.

**`requirements.txt`:**
```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]>=2.0
asyncpg
pydantic[email]
pydantic-settings
```
(`uvicorn[standard]` pulls in `watchfiles`, needed for `--reload`.)

---

## 8. Docker & Compose (3 containers)

### `backend/Dockerfile.dev`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
```

### `backend/.dockerignore`
```
__pycache__
*.pyc
.venv
.env
```

### Root `docker-compose.yml`
```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules            # anonymous volume: preserve container deps
    environment:
      - CHOKIDAR_USEPOLLING=true
      - VITE_API_BASE_URL=http://localhost:8080
    command: npm run dev -- --host 0.0.0.0
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app               # bind-mount for uvicorn --reload
    environment:
      - DATABASE_URL=postgresql+asyncpg://appuser:apppassword@db:5432/appdb
      - CORS_ORIGINS=http://localhost:5173
      - WATCHFILES_FORCE_POLLING=true   # reliable reload over bind mounts in Docker
    command: uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppassword
      - POSTGRES_DB=appdb
    ports:
      - "5432:5432"                  # exposed for local inspection; optional
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**Networking notes (important):**
- The **browser** runs on the host, so the frontend calls the backend at `http://localhost:8080` (the host-mapped port) — not the `backend` service name.
- The **backend** container reaches Postgres at `db:5432` (the internal Compose network / service name).
- `depends_on: db: condition: service_healthy` + the DB healthcheck ensure the backend starts connecting only after Postgres is accepting connections; the `init_db` retry loop is the backstop.

`[ASSUMPTION]` DB credentials `appuser` / `apppassword` / `appdb` and Postgres port `5432` are dev-only placeholders, defined once in the Compose `db` service and referenced by `DATABASE_URL`.

---

## 9. Frontend adjustments (keep the two halves consistent)

Only two small confirmations in the existing frontend — no new features:
1. **Error parsing:** the frontend's `client.ts` must read the error message from `body.error.message` (per §4.2), falling back to the HTTP status text if the body is missing/unparseable. Its thrown `ApiError` should carry that message and `body.error.status`.
2. **`createdAt`:** confirm the frontend `User` type and table still use `createdAt` (camelCase) — the backend serializes to exactly that key (§4.1). No change expected if `SPEC.md` was followed.

No other frontend changes.

---

## 10. How to run

```bash
docker compose up --build
```
- Frontend: **http://localhost:5173**
- Backend (OpenAPI docs): **http://localhost:8080/docs**
- Postgres: `localhost:5432` (user `appuser`, db `appdb`)

Editing files under `frontend/src` hot-reloads the browser; editing files under `backend/app` reloads uvicorn automatically.

---

## 11. Build order (do this sequentially)

1. Restructure the repo per §3 (move frontend into `frontend/`, delete the old root compose).
2. Create the `backend/` skeleton: `requirements.txt`, `Dockerfile.dev`, `.dockerignore`, `.env.example`, and the `app/` package tree.
3. Add `config.py` (Settings) and `db/base.py` + `db/session.py` (engine, session, `init_db` with retry).
4. Add `models/user.py`, then `schemas/user.py` (with the `createdAt` alias), then `errors.py` (envelope + handlers).
5. Add `crud/user.py`, then `routers/users.py`.
6. Wire `main.py`: lifespan → `init_db`, CORS, exception handlers, routers, `/health`.
7. Write the root `docker-compose.yml` (§8) with all three services.
8. Apply the frontend confirmations in §9.
9. Run `docker compose up --build`; verify all three containers are healthy, `/docs` loads, and the frontend performs real CRUD end-to-end.

---

## 12. Definition of done (acceptance criteria)

- [ ] Repo is split into isolated `frontend/` and `backend/` directories with no cross-imports or shared tooling.
- [ ] `docker compose up --build` starts exactly **three** containers: `frontend`, `backend`, `db`.
- [ ] Postgres runs in its own container with a persistent named volume; the backend connects via async SQLAlchemy over `asyncpg`.
- [ ] Tables are auto-created on backend startup; startup survives a not-yet-ready DB via retry + healthcheck.
- [ ] All endpoints in §4 work: `POST/GET/GET{id}/PUT/DELETE /users` plus `/health`.
- [ ] Successful responses match the frontend `User` shape exactly, including `createdAt` (camelCase, ISO 8601) and string `id`.
- [ ] All failures return the §4.2 error envelope with correct status and `code` (validation `422`, not-found `404`, duplicate email `409`, server `500`).
- [ ] CORS allows `http://localhost:5173`; the frontend performs full CRUD against the backend from the browser with no CORS errors.
- [ ] Backend hot-reloads on edits to `backend/app`; frontend hot-reloads on edits to `frontend/src`.
- [ ] No authentication is present; no endpoints beyond those specified are added.