"""Polite HTTP: on-disk cache, robots.txt checks, rate limiting, honest User-Agent."""

import hashlib
import json
import threading
import time
import urllib.robotparser
from pathlib import Path
from urllib.parse import urlparse

import requests

USER_AGENT = "LeadFinderResearchBot/0.1 (small-business research; respects robots.txt)"
CACHE_DIR = Path(".leadfinder_cache")
CACHE_TTL = 7 * 24 * 3600


class Fetcher:
    def __init__(self, cache_dir=CACHE_DIR, ttl=CACHE_TTL, delay=1.0, timeout=15):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = ttl
        self.delay = delay
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        self._robots = {}
        self._robots_lock = threading.Lock()
        self._last_hit = {}
        self._host_lock = threading.Lock()

    # ---- cache ---------------------------------------------------------
    def _cache_path(self, key):
        return self.cache_dir / (hashlib.sha1(key.encode()).hexdigest() + ".json")

    def cache_get(self, key):
        p = self._cache_path(key)
        if p.exists() and time.time() - p.stat().st_mtime < self.ttl:
            try:
                return json.loads(p.read_text())
            except (OSError, ValueError):
                return None
        return None

    def cache_put(self, key, value):
        try:
            self._cache_path(key).write_text(json.dumps(value))
        except OSError:
            pass

    # ---- politeness ----------------------------------------------------
    def _throttle(self, host):
        with self._host_lock:
            wait = self._last_hit.get(host, 0) + self.delay - time.time()
            self._last_hit[host] = time.time() + max(wait, 0)
        if wait > 0:
            time.sleep(wait)

    def allowed(self, url):
        parts = urlparse(url)
        base = f"{parts.scheme}://{parts.netloc}"
        with self._robots_lock:
            rp = self._robots.get(base)
        if rp is None:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self.session.get(base + "/robots.txt", timeout=self.timeout)
                if r.status_code in (401, 403):
                    rp.disallow_all = True
                elif r.ok:
                    rp.parse(r.text.splitlines())
                else:
                    rp.allow_all = True
            except requests.RequestException:
                rp.allow_all = True
            with self._robots_lock:
                self._robots[base] = rp
        return rp.can_fetch(USER_AGENT, url)

    def get_page(self, url):
        """Fetch a web page. Returns dict(url, status, html) or None if disallowed/failed."""
        key = "page:" + url
        cached = self.cache_get(key)
        if cached is not None:
            return cached
        if not self.allowed(url):
            result = {"url": url, "status": "robots_disallowed", "html": ""}
            self.cache_put(key, result)
            return result
        self._throttle(urlparse(url).netloc)
        try:
            r = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            ctype = r.headers.get("content-type", "")
            html = r.text[:600_000] if "html" in ctype or not ctype else ""
            result = {"url": r.url, "status": r.status_code, "html": html}
        except requests.RequestException as exc:
            result = {"url": url, "status": f"error: {type(exc).__name__}", "html": ""}
        self.cache_put(key, result)
        return result
