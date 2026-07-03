from fastapi import APIRouter, Depends
from auth import get_current_user
from utils import WA_TOKEN, WA_PHONE_NUMBER_ID
import asyncio
import requests as _req

router = APIRouter()


@router.get("/settings/whatsapp-status")
async def whatsapp_status(current_user: dict = Depends(get_current_user)):
    """Verifica se il token Meta della WhatsApp Cloud API è ancora valido.
    Risponde con OK/Error + dettagli del numero collegato.
    """
    if not WA_TOKEN:
        return {
            "ok": False,
            "status": "not_configured",
            "primary_provider": "cloud_api",
            "error": "WHATSAPP_TOKEN non configurato",
            "phone_id": WA_PHONE_NUMBER_ID,
        }

    try:
        url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}"
        headers = {"Authorization": f"Bearer {WA_TOKEN}"}
        resp = await asyncio.to_thread(_req.get, url, headers=headers, timeout=10)
        rjson = {}
        try:
            rjson = resp.json()
        except Exception:
            pass

        if resp.status_code == 200 and rjson.get("id"):
            return {
                "ok": True,
                "status": "valid",
                "primary_provider": "cloud_api",
                "phone_id": rjson.get("id"),
                "display_phone_number": rjson.get("display_phone_number", ""),
                "verified_name": rjson.get("verified_name", ""),
                "quality_rating": rjson.get("quality_rating", ""),
            }

        error = rjson.get("error", {})
        return {
            "ok": False,
            "status": "invalid",
            "primary_provider": "cloud_api",
            "error": error.get("message") or resp.text[:200],
            "code": error.get("code"),
            "phone_id": WA_PHONE_NUMBER_ID,
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "error",
            "primary_provider": "cloud_api",
            "error": str(e),
            "phone_id": WA_PHONE_NUMBER_ID,
        }


@router.get("/settings/social-status")
async def social_status(current_user: dict = Depends(get_current_user)):
    """Stato aggregato Facebook / Instagram / WhatsApp per la dashboard.
    - Facebook/Instagram: OK se è configurato il webhook Make.com
    - WhatsApp: OK se token Meta valido (chiamata graph.facebook.com)
    """
    make_url = current_user.get("make_webhook_url", "")
    fb_ig_ok = bool(make_url)

    wa_info = await whatsapp_status(current_user)

    return {
        "facebook": {
            "ok": fb_ig_ok,
            "configured": fb_ig_ok,
            "provider": "make.com",
        },
        "instagram": {
            "ok": fb_ig_ok,
            "configured": fb_ig_ok,
            "provider": "make.com",
        },
        "whatsapp": {
            "ok": wa_info.get("ok", False),
            "status": wa_info.get("status"),
            "display_number": wa_info.get("display_phone_number", ""),
            "verified_name": wa_info.get("verified_name", ""),
            "error": wa_info.get("error", ""),
        },
    }


