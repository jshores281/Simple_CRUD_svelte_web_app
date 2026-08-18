import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppError
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

EMAIL_CONFLICT_CODE = "email_conflict"


def _parse_id(user_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(user_id)
    except ValueError as exc:
        raise AppError(404, "not_found", f"No user with id '{user_id}'.") from exc


async def create_user(session: AsyncSession, data: UserCreate) -> User:
    user = User(name=data.name, email=data.email, role=data.role)
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise AppError(409, EMAIL_CONFLICT_CODE, f"A user with email '{data.email}' already exists.") from exc
    await session.refresh(user)
    return user


async def list_users(session: AsyncSession) -> list[User]:
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def get_user(session: AsyncSession, user_id: str) -> User:
    user = await session.get(User, _parse_id(user_id))
    if user is None:
        raise AppError(404, "not_found", f"No user with id '{user_id}'.")
    return user


async def update_user(session: AsyncSession, user_id: str, data: UserUpdate) -> User:
    user = await get_user(session, user_id)
    user.name = data.name
    user.email = data.email
    user.role = data.role
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise AppError(409, EMAIL_CONFLICT_CODE, f"A user with email '{data.email}' already exists.") from exc
    await session.refresh(user)
    return user


async def delete_user(session: AsyncSession, user_id: str) -> None:
    user = await get_user(session, user_id)
    await session.delete(user)
    await session.commit()
