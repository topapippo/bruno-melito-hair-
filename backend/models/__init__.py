# Re-export all models for backward compatibility
# Routes can continue to use: from models import ModelName

from models.auth import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    SettingsUpdate, SMSRequest,
)
from models.business import (
    OperatorCreate, OperatorResponse, OperatorUpdate,
    ClientCreate, ClientResponse, ClientUpdate, ClientBulkImport,
    ServiceCreate, ServiceResponse, ServiceUpdate,
)
from models.appointments import (
    AppointmentCreate, AppointmentResponse, AppointmentUpdate,
    RecurringAppointmentCreate, PublicBookingRequest, CheckoutData,
)
from models.loyalty import (
    PrepaidCardCreate, PrepaidCardResponse, PrepaidCardUpdate,
    CardTransaction, LoyaltyRedeemRequest,
    LOYALTY_POINTS_PER_EURO, DEFAULT_LOYALTY_REWARDS, get_loyalty_rewards,
)
