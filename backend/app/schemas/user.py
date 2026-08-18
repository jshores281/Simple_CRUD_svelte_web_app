from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

UserRole = Literal["admin", "user", "guest"]


class UserBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    role: UserRole = "user"


class UserCreate(UserBase):
    pass


class UserUpdate(UserBase):
    """PUT is a full replace — same fields as create."""


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: UserRole
    # The DB column is created_at; the frontend User type expects camelCase createdAt.
    created_at: datetime = Field(serialization_alias="createdAt")

    @field_validator("id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> object:
        """The DB stores a UUID; the frontend expects a plain string id."""
        return str(value) if value is not None else value
