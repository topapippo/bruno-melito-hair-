"""IP reale del client dietro il proxy di Render.

Render aggiunge l'IP del client in fondo a X-Forwarded-For. I valori precedenti
arrivano dal client e possono essere falsificati: per questo si usa l'ultimo.
"""


def get_client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[-1].strip()
        if ip:
            return ip
    return request.client.host if request.client else "unknown"
