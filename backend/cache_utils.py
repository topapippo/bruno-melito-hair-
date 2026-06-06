import time
import logging

logger = logging.getLogger(__name__)

_website_cache = {"data": None, "ts": 0}
_WEBSITE_CACHE_TTL = 3600  # 1 hour

def invalidate_website_cache():
    global _website_cache
    _website_cache["data"] = None
    _website_cache["ts"] = 0
    logger.info("Cache sito pubblico invalidata")

def get_cached_website():
    global _website_cache
    now = time.time()
    if _website_cache["data"] and now - _website_cache["ts"] < _WEBSITE_CACHE_TTL:
        return _website_cache["data"]
    return None

def set_cached_website(data):
    global _website_cache
    _website_cache["data"] = data
    _website_cache["ts"] = time.time()
