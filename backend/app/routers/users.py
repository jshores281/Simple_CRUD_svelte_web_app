from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import user as crud
from app.db.session import get_session
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, session: AsyncSession = Depends(get_session)) -> UserRead:
    return UserRead.model_validate(await crud.create_user(session, data))


@router.get("", response_model=list[UserRead])
async def list_users(session: AsyncSession = Depends(get_session)) -> list[UserRead]:
    return [UserRead.model_validate(user) for user in await crud.list_users(session)]


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: str, session: AsyncSession = Depends(get_session)) -> UserRead:
    return UserRead.model_validate(await crud.get_user(session, user_id))


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str, data: UserUpdate, session: AsyncSession = Depends(get_session)
) -> UserRead:
    return UserRead.model_validate(await crud.update_user(session, user_id, data))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, session: AsyncSession = Depends(get_session)) -> Response:
    await crud.delete_user(session, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
