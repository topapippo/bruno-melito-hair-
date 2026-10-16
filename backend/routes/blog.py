from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Optional
import uuid
import os
import re

from auth import get_current_user
from database import db

router = APIRouter(prefix="/blog", tags=["blog"])

PUBLIC_ADMIN_EMAIL = os.environ.get("PUBLIC_ADMIN_EMAIL", "admin@brunomelito.it")
MAX_PUBLIC_POSTS = 50


def slugify(text: str) -> str:
    """Genera slug SEO-friendly dal titolo"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')


async def _get_salon_owner_id() -> Optional[str]:
    """Id del titolare del salone (stesso criterio di public.py)."""
    owner = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0, "id": 1})
    return owner["id"] if owner else None


class BlogPostCreate(BaseModel):
    title: str
    excerpt: str  # Breve descrizione per SEO e preview
    content: str  # Markdown o HTML
    cover_image: Optional[str] = ""
    tags: List[str] = []
    is_published: bool = False


class BlogPostResponse(BaseModel):
    id: str
    slug: str
    title: str
    excerpt: str
    content: str
    cover_image: Optional[str] = ""
    tags: List[str]
    author: str
    is_published: bool
    published_at: Optional[str] = None
    created_at: str
    updated_at: str


@router.get("/public")
async def get_public_posts(tag: Optional[str] = None, limit: int = 20):
    """Endpoint pubblico per il blog - solo post pubblicati del titolare del salone"""
    owner_id = await _get_salon_owner_id()
    if not owner_id:
        return []
    query = {"user_id": owner_id, "is_published": True}
    if tag:
        query["tags"] = tag

    posts = await db.blog_posts.find(query, {"_id": 0, "user_id": 0}) \
        .sort("published_at", -1).to_list(min(max(limit, 1), MAX_PUBLIC_POSTS))
    return posts


@router.get("/public/{slug}")
async def get_public_post(slug: str):
    """Singolo post pubblico per SEO"""
    owner_id = await _get_salon_owner_id()
    if not owner_id:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    post = await db.blog_posts.find_one(
        {"user_id": owner_id, "slug": slug, "is_published": True},
        {"_id": 0, "user_id": 0}
    )
    if not post:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    return post


@router.get("/", response_model=List[BlogPostResponse])
async def get_all_posts(current_user: dict = Depends(get_current_user)):
    """Lista admin completa (anche bozze)"""
    posts = await db.blog_posts.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return posts


@router.post("/")
async def create_post(data: BlogPostCreate, current_user: dict = Depends(get_current_user)):
    """Crea nuovo articolo"""
    slug = slugify(data.title)

    # Verifica univocità slug
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    now = datetime.now(timezone.utc).isoformat()
    post = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "slug": slug,
        "title": data.title,
        "excerpt": data.excerpt,
        "content": data.content,
        "cover_image": data.cover_image,
        "tags": data.tags,
        "author": current_user.get("name", "Bruno Melito"),
        "is_published": data.is_published,
        "published_at": now if data.is_published else None,
        "created_at": now,
        "updated_at": now
    }
    await db.blog_posts.insert_one(post)
    return {k: v for k, v in post.items() if k != "_id"}


@router.put("/{post_id}")
async def update_post(post_id: str, data: BlogPostCreate, current_user: dict = Depends(get_current_user)):
    post = await db.blog_posts.find_one({"id": post_id, "user_id": current_user["id"]})
    if not post:
        raise HTTPException(status_code=404, detail="Articolo non trovato")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "title": data.title,
        "excerpt": data.excerpt,
        "content": data.content,
        "cover_image": data.cover_image,
        "tags": data.tags,
        "is_published": data.is_published,
        "updated_at": now,
    }

    # Se sta pubblicando per la prima volta, set published_at
    if data.is_published and not post.get("published_at"):
        update["published_at"] = now

    await db.blog_posts.update_one({"id": post_id, "user_id": current_user["id"]}, {"$set": update})
    return {"success": True}


@router.delete("/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.blog_posts.delete_one({"id": post_id, "user_id": current_user["id"]})
    return {"success": True}
