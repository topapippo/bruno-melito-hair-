from routes.auth import router as auth_router
from routes.operators import router as operators_router
from routes.clients import router as clients_router
from routes.services import router as services_router
from routes.appointments import router as appointments_router
from routes.cards import router as cards_router
from routes.stats import router as stats_router
from routes.reminders import router as reminders_router
from routes.loyalty import router as loyalty_router
from routes.expenses import router as expenses_router
from routes.promotions import router as promotions_router
from routes.notifications import router as notifications_router
from routes.public import router as public_router
from routes.push import router as push_router
from routes.blocked_slots import router as blocked_slots_router

all_routers = [
    auth_router,
    operators_router,
    clients_router,
    services_router,
    appointments_router,
    cards_router,
    stats_router,
    reminders_router,
    loyalty_router,
    expenses_router,
    promotions_router,
    notifications_router,
    public_router,
    push_router,
    blocked_slots_router,
]
