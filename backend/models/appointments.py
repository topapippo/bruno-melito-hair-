from pydantic import BaseModel
from typing import List, Optional


class AppointmentCreate(BaseModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = ""
    service_ids: List[str]
    operator_id: Optional[str] = None
    date: str
    time: str
    notes: Optional[str] = ""
    promo_id: Optional[str] = None
    card_id: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    client_phone: Optional[str] = ""
    service_ids: List[str]
    services: List[dict]
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    operator_color: Optional[str] = None
    date: str
    time: str
    end_time: str
    total_duration: int
    total_price: float
    status: str
    notes: Optional[str] = ""
    sms_sent: Optional[bool] = False
    source: Optional[str] = "manual"
    paid: Optional[bool] = False
    promo_id: Optional[str] = None
    promo_name: Optional[str] = None
    card_id: Optional[str] = None
    card_name: Optional[str] = None
    created_at: str

class AppointmentUpdate(BaseModel):
    client_id: Optional[str] = None
    service_ids: Optional[List[str]] = None
    operator_id: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class RecurringAppointmentCreate(BaseModel):
    appointment_id: str
    repeat_weeks: int = 0
    repeat_months: int = 0
    repeat_count: int

class PublicBookingRequest(BaseModel):
    client_name: str
    client_phone: str
    service_ids: List[str]
    operator_id: Optional[str] = None
    date: str
    time: str
    notes: Optional[str] = ""

class CheckoutData(BaseModel):
    payment_method: str
    discount_type: Optional[str] = "none"
    discount_value: Optional[float] = 0
    total_paid: float
    card_id: Optional[str] = None
    loyalty_points_used: Optional[int] = 0
    promo_id: Optional[str] = None
    promo_free_service: Optional[str] = None
