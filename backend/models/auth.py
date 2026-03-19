from pydantic import BaseModel, EmailStr
from typing import List, Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    salon_name: Optional[str] = "Il Mio Salone"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    salon_name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SettingsUpdate(BaseModel):
    salon_name: Optional[str] = None
    name: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    working_days: Optional[List[str]] = None

class SMSRequest(BaseModel):
    appointment_id: str
    message: Optional[str] = None
