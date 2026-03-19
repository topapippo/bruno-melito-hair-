from pydantic import BaseModel
from typing import List, Optional


class OperatorCreate(BaseModel):
    name: str
    phone: Optional[str] = ""
    color: Optional[str] = "#C58970"

class OperatorResponse(BaseModel):
    id: str
    name: str
    phone: str
    color: str
    active: bool
    created_at: str

class OperatorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None


class ClientCreate(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    notes: Optional[str] = ""
    sms_reminder: Optional[bool] = True

class ClientResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    notes: Optional[str] = ""
    sms_reminder: Optional[bool] = False
    send_sms_reminders: Optional[bool] = False
    created_at: str
    total_visits: int = 0

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    sms_reminder: Optional[bool] = None

class ClientBulkImport(BaseModel):
    clients: List[dict]


class ServiceCreate(BaseModel):
    name: str
    category: str
    duration: int
    price: float
    color: Optional[str] = None
    sort_order: Optional[int] = None

class ServiceResponse(BaseModel):
    id: str
    name: str
    category: str
    duration: int
    price: float
    color: Optional[str] = None
    sort_order: Optional[int] = None
    created_at: str

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[int] = None
    price: Optional[float] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
