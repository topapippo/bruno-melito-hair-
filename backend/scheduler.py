import asyncio
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from database import db
import requests

logger = logging.getLogger(__name__)

# Fuso orario italiano: gestisce automaticamente il passaggio ora legale/solare
# (un offset fisso UTC+1 sbagliava di un'ora da fine marzo a fine ottobre)
ROME_TZ = ZoneInfo("Europe/Rome")

WEEKDAY_NAMES = {
    1: "martedi",
    2: "mercoledi",
    3: "giovedi",
    4: "venerdi",
    5: "sabato",
    6: "domenica",
    0: "lunedi",
}

async def publish_scheduled_posts():
    """
    Pubblica i post programmati per oggi alle 9:00 AM
    Eseguito ogni giorno dal task di background di Render
    """
    now_rome = datetime.now(ROME_TZ)
    current_hour = now_rome.hour
    current_weekday = WEEKDAY_NAMES[now_rome.weekday()]

    # Pubblica solo alle 9 AM (ora italiana)
    if current_hour != 9:
        return

    try:
        # Trova tutti i post programmati per oggi
        posts = await db.social_posts.find({
            "schedule_day": current_weekday,
            "status": {"$in": ["scheduled", "draft"]}
        }).to_list(100)

        for post in posts:
            user_id = post.get("user_id")
            user = await db.users.find_one({"id": user_id})

            if not user or not user.get("make_webhook_url"):
                logger.warning(f"Skipping post {post['id']}: utente non ha webhook")
                continue

            payload = {
                "caption": post.get("caption", ""),
                "text": post.get("caption", ""),
                "message": post.get("caption", ""),
                "image_urls": post.get("image_urls", []),
                "platforms": post.get("platforms", []),
            }

            try:
                requests.post(user["make_webhook_url"], json=payload, timeout=10)
                await db.social_posts.update_one(
                    {"id": post["id"]},
                    {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Published post {post['id']} for user {user_id}")
            except Exception as e:
                logger.error(f"Error publishing post {post['id']}: {e}")

    except Exception as e:
        logger.error(f"Error in publish_scheduled_posts: {e}")

_last_cloud_backup_date = None


async def weekly_cloud_backup():
    """Ogni domenica alle 03:00 (ora italiana) invia il backup JSON al webhook Make."""
    global _last_cloud_backup_date
    now_rome = datetime.now(ROME_TZ)
    if now_rome.weekday() != 6 or now_rome.hour != 3:
        return
    today = now_rome.date()
    if _last_cloud_backup_date == today:
        return
    _last_cloud_backup_date = today
    try:
        from routes.backup import send_backup_to_cloud
        users = await db.users.find({}, {"_id": 0, "id": 1}).to_list(100)
        for u in users:
            result = await send_backup_to_cloud(u["id"])
            if not result.get("success"):
                logger.error(f"Backup cloud settimanale fallito: {result.get('message')}")
    except Exception as e:
        logger.error(f"Error in weekly_cloud_backup: {e}")


async def run_scheduler():
    """Esegui lo scheduler ogni 10 minuti"""
    while True:
        try:
            await publish_scheduled_posts()
            await weekly_cloud_backup()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        finally:
            await asyncio.sleep(600)  # 10 minuti
