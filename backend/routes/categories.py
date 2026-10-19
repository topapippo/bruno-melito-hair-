"""Categorie dei servizi, modificabili dal gestionale (Servizi -> Gestisci categorie).

Le categorie vivono nella collezione `service_categories` (una per utente). Finche' l'utente
non ne modifica nessuna, l'elenco e' quello predefinito (identico a quello storico del
frontend) e non viene scritto nulla nel database.

Il campo `value` (es. "colore") e' l'identificativo stabile salvato nei servizi e negli
appuntamenti: non cambia mai. Rinominare una categoria cambia solo `label`/`color`, quindi
planning, statistiche, sito pubblico e prenotazioni si aggiornano da soli.
"""
import logging
import re
import unicodedata
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user
from cache_utils import invalidate_website_cache
from database import db

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    {"value": "taglio", "label": "Styling", "color": "#0EA5E9", "bg": "#E0F2FE", "text": "#0369A1"},
    {"value": "trattamento", "label": "Trattamenti", "color": "#F59E0B", "bg": "#FEF3C7", "text": "#92400E"},
    {"value": "colore", "label": "Colore", "color": "#10B981", "bg": "#D1FAE5", "text": "#065F46"},
    {"value": "permanente", "label": "Permanente", "color": "#8B5CF6", "bg": "#EDE9FE", "text": "#5B21B6"},
    {"value": "stiratura", "label": "Stiratura", "color": "#EC4899", "bg": "#FCE7F3", "text": "#9D174D"},
    {"value": "abbonamento", "label": "Abbonamenti", "color": "#6366F1", "bg": "#E0E7FF", "text": "#3730A3"},
    {"value": "altro", "label": "Altro", "color": "#64748B", "bg": "#F1F5F9", "text": "#334155"},
]

# Usate dal codice (checkout colore, vendita abbonamenti, categoria di ripiego): non eliminabili.
PROTECTED_VALUES = {"colore", "abbonamento", "altro"}
FALLBACK_VALUE = "altro"

_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
_VALUE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,39}$")


# ── utilita' ────────────────────────────────────────────────────────────────
def _mix(hex_color: str, other: str, ratio: float) -> str:
    """Mescola due colori #RRGGBB: ratio e' la quota di `other` (0..1)."""
    a = [int(hex_color[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x * (1 - ratio) + y * ratio):02X}" for x, y in zip(a, b))


def tints(color: str) -> dict:
    """Sfondo chiaro e testo scuro derivati dal colore della categoria."""
    return {"bg": _mix(color, "#FFFFFF", 0.86), "text": _mix(color, "#000000", 0.5)}


def slugify_value(label: str) -> str:
    s = unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode("ascii").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:40].strip("-") or "categoria"


def _clean_label(label: str) -> str:
    label = re.sub(r"\s+", " ", (label or "")).strip()
    if not label:
        raise HTTPException(status_code=400, detail="Inserisci il nome della categoria")
    if len(label) > 40:
        raise HTTPException(status_code=400, detail="Il nome della categoria e' troppo lungo (massimo 40 caratteri)")
    return label


def _clean_color(color: Optional[str]) -> str:
    color = (color or "#64748B").strip()
    if not _HEX_RE.match(color):
        raise HTTPException(status_code=400, detail="Colore non valido")
    return color.upper()


def _public_item(c: dict) -> dict:
    return {k: c[k] for k in ("value", "label", "color", "bg", "text")}


async def load_categories(uid: str) -> List[dict]:
    """Categorie dell'utente in ordine; se non ne ha di salvate, quelle predefinite."""
    docs = await db.service_categories.find({"user_id": uid}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    if docs:
        return docs
    return [{**c, "id": None, "user_id": uid, "sort_order": i} for i, c in enumerate(DEFAULT_CATEGORIES)]


async def public_categories(uid: Optional[str]) -> List[dict]:
    """Elenco minimo per il sito pubblico (nessun id, nessun conteggio)."""
    if not uid:
        return [dict(c) for c in DEFAULT_CATEGORIES]
    return [_public_item(c) for c in await load_categories(uid)]


async def category_exists(uid: str, value: str) -> bool:
    return any(c["value"] == value for c in await load_categories(uid))


async def _ensure_seeded(uid: str) -> None:
    """Alla prima modifica scrive le categorie predefinite nel database."""
    if await db.service_categories.count_documents({"user_id": uid}) > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    await db.service_categories.insert_many([
        {"id": str(uuid.uuid4()), "user_id": uid, **c, "sort_order": i, "created_at": now}
        for i, c in enumerate(DEFAULT_CATEGORIES)
    ])


async def _service_counts(uid: str) -> Counter:
    rows = await db.services.find({"user_id": uid}, {"_id": 0, "category": 1}).to_list(5000)
    return Counter((r.get("category") or FALLBACK_VALUE) for r in rows)


# ── modelli ─────────────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    label: str = Field(..., max_length=80)
    color: Optional[str] = "#64748B"
    value: Optional[str] = None  # solo per "registrare" una categoria gia' usata dai servizi


class CategoryUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=80)
    color: Optional[str] = None


class CategoryReorder(BaseModel):
    order: List[str]


# ── rotte ───────────────────────────────────────────────────────────────────
@router.get("/service-categories")
async def list_service_categories(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    cats = await load_categories(uid)
    counts = await _service_counts(uid)
    known = {c["value"] for c in cats}

    items = [
        {**_public_item(c), "sort_order": c.get("sort_order", i),
         "protected": c["value"] in PROTECTED_VALUES,
         "service_count": counts.get(c["value"], 0), "legacy": False}
        for i, c in enumerate(cats)
    ]
    # Valori usati dai servizi ma non presenti nell'elenco: si possono "registrare" dalla finestra.
    for value, n in sorted(counts.items()):
        if value not in known:
            items.append({
                "value": value, "label": value, "color": "#64748B",
                **tints("#64748B"), "sort_order": 999, "protected": False,
                "service_count": n, "legacy": True,
            })
    return {"categories": items}


@router.post("/service-categories")
async def create_service_category(data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    label = _clean_label(data.label)
    color = _clean_color(data.color)

    await _ensure_seeded(uid)
    existing = await db.service_categories.find({"user_id": uid}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    if any(c["label"].lower() == label.lower() for c in existing):
        raise HTTPException(status_code=400, detail="Esiste gia' una categoria con questo nome")
    taken = {c["value"] for c in existing}

    if data.value:
        value = data.value.strip().lower()
        if not _VALUE_RE.match(value):
            raise HTTPException(status_code=400, detail="Identificativo categoria non valido")
        if value in taken:
            raise HTTPException(status_code=400, detail="Questa categoria esiste gia'")
    else:
        base = slugify_value(label)
        value, n = base, 2
        while value in taken:
            value = f"{base}-{n}"
            n += 1

    # La nuova categoria va prima di "Altro" (se presente), che resta in fondo all'elenco.
    altro = next((c for c in existing if c["value"] == FALLBACK_VALUE), None)
    if altro is not None:
        position = altro["sort_order"]
        await db.service_categories.update_many(
            {"user_id": uid, "sort_order": {"$gte": position}}, {"$inc": {"sort_order": 1}})
    else:
        position = (existing[-1]["sort_order"] + 1) if existing else 0

    doc = {
        "id": str(uuid.uuid4()), "user_id": uid, "value": value, "label": label,
        "color": color, **tints(color), "sort_order": position,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.service_categories.insert_one(dict(doc))
    invalidate_website_cache()
    return _public_item(doc)


@router.put("/service-categories/{value}")
async def update_service_category(value: str, data: CategoryUpdate, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    await _ensure_seeded(uid)
    cat = await db.service_categories.find_one({"user_id": uid, "value": value}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria non trovata")

    update = {}
    if data.label is not None:
        label = _clean_label(data.label)
        others = await db.service_categories.find({"user_id": uid, "value": {"$ne": value}}, {"_id": 0, "label": 1}).to_list(500)
        if any(o["label"].lower() == label.lower() for o in others):
            raise HTTPException(status_code=400, detail="Esiste gia' una categoria con questo nome")
        update["label"] = label
    if data.color is not None:
        color = _clean_color(data.color)
        update.update({"color": color, **tints(color)})
    if not update:
        raise HTTPException(status_code=400, detail="Nessuna modifica")

    await db.service_categories.update_one({"user_id": uid, "value": value}, {"$set": update})
    invalidate_website_cache()
    return _public_item({**cat, **update})


@router.post("/service-categories/reorder")
async def reorder_service_categories(data: CategoryReorder, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    await _ensure_seeded(uid)
    existing = await db.service_categories.find({"user_id": uid}, {"_id": 0, "value": 1}).sort("sort_order", 1).to_list(500)
    current = [c["value"] for c in existing]
    wanted = [v for v in data.order if v in current]
    # Le categorie non nominate restano in coda nel loro ordine attuale.
    final = wanted + [v for v in current if v not in wanted]
    for position, value in enumerate(final):
        await db.service_categories.update_one({"user_id": uid, "value": value}, {"$set": {"sort_order": position}})
    invalidate_website_cache()
    return {"order": final}


@router.delete("/service-categories/{value}")
async def delete_service_category(
    value: str,
    move_to: Optional[str] = Query(None, description="Categoria in cui spostare i servizi esistenti"),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    if value in PROTECTED_VALUES:
        raise HTTPException(status_code=400, detail="Questa categoria e' usata dal gestionale e non si puo' eliminare")
    await _ensure_seeded(uid)
    cat = await db.service_categories.find_one({"user_id": uid, "value": value}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria non trovata")

    in_use = (await _service_counts(uid)).get(value, 0)
    if in_use:
        if not move_to or move_to == value:
            raise HTTPException(status_code=400, detail=f"{in_use} servizi usano questa categoria: scegli dove spostarli")
        if not await db.service_categories.find_one({"user_id": uid, "value": move_to}, {"_id": 0, "value": 1}):
            raise HTTPException(status_code=400, detail="La categoria di destinazione non esiste")
        await db.services.update_many({"user_id": uid, "category": value}, {"$set": {"category": move_to}})

    # Gli appuntamenti e gli incassi gia' registrati portano una copia della categoria dentro ogni servizio:
    # si aggiornano cosi' colori e statistiche dello storico restano coerenti.
    if move_to:
        for collection in (db.appointments, db.payments):
            await collection.update_many(
                {"user_id": uid, "services.category": value},
                {"$set": {"services.$[s].category": move_to}},
                array_filters=[{"s.category": value}],
            )

    await db.service_categories.delete_one({"user_id": uid, "value": value})
    invalidate_website_cache()
    return {"deleted": value, "moved_services": in_use, "moved_to": move_to if in_use else None}
