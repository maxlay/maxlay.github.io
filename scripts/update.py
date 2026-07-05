import asyncio
import aiohttp
import re
import time
import sys
import os
import json
import argparse
from bs4 import BeautifulSoup
from db import get_conn, init_db, get_stats

STATE_FILE = "crawl_state.json"

# Rate limiting
RATE_LIMIT = 0.2  # seconds between requests
MAX_CONCURRENT = 15

BASE = "https://123av.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"types": {}}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def clear_state(types_to_clear=None):
    """Clear state for specific types, or all if None."""
    if not os.path.exists(STATE_FILE):
        return
    if types_to_clear is None:
        os.remove(STATE_FILE)
    else:
        state = load_state()
        for t in types_to_clear:
            state.get("types", {}).pop(t, None)
        save_state(state)

def get_type_state(state, type_name):
    """Get or initialize state for a single type."""
    ts = state.setdefault("types", {}).get(type_name)
    if ts is None:
        ts = {"year_idx": 0, "page": 1}
        state["types"][type_name] = ts
    return ts

async def fetch(session, url):
    """Fetch a URL with rate limiting and retry."""
    for attempt in range(3):
        try:
            async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    return await resp.text()
                elif resp.status == 429:
                    wait = 5 * (attempt + 1)
                    print(f"  Rate limited, waiting {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"  HTTP {resp.status} for {url}")
                    return None
        except Exception as e:
            print(f"  Error fetching {url}: {e}")
            await asyncio.sleep(2 * (attempt + 1))
    return None

def extract_code_from_url(href):
    m = re.search(r'/en/v/([^/?]+)', href)
    return m.group(1) if m else None

def parse_listing_page(html):
    """Extract video codes from a listing page."""
    soup = BeautifulSoup(html, "html.parser")
    codes = []
    for card in soup.select(".card"):
        link = card.select_one(".card__link")
        if link and link.get("href"):
            code = extract_code_from_url(link["href"])
            if code:
                codes.append(code)
    return codes

def parse_detail_page(html, code):
    """Extract full video metadata from a detail page."""
    soup = BeautifulSoup(html, "html.parser")
    data = {"code": code}

    # Title
    title = soup.select_one(".watch__title")
    data["title"] = title.get_text(strip=True) if title else ""

    # Type
    type_row = soup.find("dt", string="Type")
    if type_row and type_row.parent.find("dd"):
        type_link = type_row.parent.find("dd").find("a")
        data["type"] = type_link.get_text(strip=True).lower() if type_link else ""

    # Release date
    date_row = soup.find("dt", string="Release date")
    if date_row and date_row.parent.find("dd"):
        data["release_date"] = date_row.parent.find("dd").get_text(strip=True)

    # Duration
    dur_row = soup.find("dt", string="Duration")
    if dur_row and dur_row.parent.find("dd"):
        data["duration"] = dur_row.parent.find("dd").get_text(strip=True)

    # Maker
    maker_row = soup.find("dt", string="Maker")
    if maker_row and maker_row.parent.find("dd"):
        maker_link = maker_row.parent.find("dd").find("a")
        data["maker"] = maker_link.get_text(strip=True) if maker_link else ""

    # Thumbnail
    thumb = soup.select_one(".player")
    if thumb:
        bg = thumb.get("style", "")
        m = re.search(r"url\(['\"]?([^'\")]+)", bg)
        if m:
            data["thumbnail"] = m.group(1)

    # Views
    views_el = soup.select_one(".watch__metaitem")
    if views_el:
        views_text = views_el.get_text(strip=True)
        m = re.search(r"([\d,.]+)", views_text)
        if m:
            data["views"] = int(m.group(1).replace(",", ""))

    # Description
    desc = soup.select_one(".watch__desc-text")
    if desc:
        data["description"] = desc.get_text(strip=True)

    # Genres
    genres_row = soup.find("dt", string="Genres")
    genres = []
    if genres_row and genres_row.parent.find("dd"):
        for a in genres_row.parent.find("dd").select("a.chip"):
            href = a.get("href", "")
            m = re.search(r"/en/genres/([^/]+)", href)
            if m:
                genres.append({"slug": m.group(1), "name": a.get_text(strip=True)})

    # Actresses
    cast_row = soup.find("dt", string="Cast")
    actresses = []
    if cast_row and cast_row.parent.find("dd"):
        for a in cast_row.parent.find("dd").select("a.chip"):
            href = a.get("href", "")
            m = re.search(r"/en/actresses/([^/]+)", href)
            if m:
                actresses.append({"slug": m.group(1), "name": a.get_text(strip=True)})

    # Tags
    tags_row = soup.find("dt", string="Tags")
    tags = []
    if tags_row and tags_row.parent.find("dd"):
        for a in tags_row.parent.find("dd").select("a.chip"):
            href = a.get("href", "")
            m = re.search(r"/en/tags/([^/]+)", href)
            if m:
                tags.append({"slug": m.group(1), "name": a.get_text(strip=True)})

    data["genres"] = genres
    data["actresses"] = actresses
    data["tags"] = tags
    return data

def save_batch(conn, batch_data):
    """Save a batch of video data using executemany for efficiency."""
    c = conn.cursor()

    # Videos
    video_rows = []
    genre_rows = []
    actress_rows = []
    tag_rows = []
    new_genres = []
    new_actresses = []
    new_tags = []

    for data in batch_data:
        video_rows.append((
            data["code"], data.get("title", ""), data.get("type", ""),
            data.get("release_date", ""), data.get("duration", ""),
            data.get("maker", ""), data.get("thumbnail", ""),
            data.get("views", 0), data.get("description", "")
        ))
        for g in data.get("genres", []):
            new_genres.append((g["slug"], g["name"]))
            genre_rows.append((data["code"], g["slug"]))
        for a in data.get("actresses", []):
            new_actresses.append((a["slug"], a["name"]))
            actress_rows.append((data["code"], a["slug"]))
        for t in data.get("tags", []):
            new_tags.append((t["slug"], t["name"]))
            tag_rows.append((data["code"], t["slug"]))

    c.executemany("""
        INSERT OR REPLACE INTO videos (code, title, type, release_date, duration, maker, thumbnail, views, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, video_rows)

    if new_genres:
        c.executemany("INSERT OR IGNORE INTO genres (slug, name) VALUES (?, ?)", new_genres)
    if genre_rows:
        c.executemany("INSERT OR IGNORE INTO video_genres (code, genre_slug) VALUES (?, ?)", genre_rows)
    if new_actresses:
        c.executemany("INSERT OR IGNORE INTO actresses (slug, name) VALUES (?, ?)", new_actresses)
    if actress_rows:
        c.executemany("INSERT OR IGNORE INTO video_actresses (code, actress_slug) VALUES (?, ?)", actress_rows)
    if new_tags:
        c.executemany("INSERT OR IGNORE INTO tags (slug, name) VALUES (?, ?)", new_tags)
    if tag_rows:
        c.executemany("INSERT OR IGNORE INTO video_tags (code, tag_slug) VALUES (?, ?)", tag_rows)

def get_existing_codes():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT code FROM videos")
    existing = {row[0] for row in c.fetchall()}
    conn.close()
    return existing

async def crawl_details(session, codes, existing, batch_size=100, max_videos=None, newly_crawled=0):
    """Crawl detail pages for given codes, saving in batches."""
    conn = get_conn()

    to_crawl = [code for code in codes if code not in existing]
    if max_videos:
        remaining = max(0, max_videos - newly_crawled)
        to_crawl = to_crawl[:remaining]

    if not to_crawl:
        conn.close()
        return 0

    print(f"\nDetail crawl: {len(to_crawl)} new videos to fetch ({len(existing)} already in DB)")
    print(f"Batch size: {batch_size}, Max concurrent: {MAX_CONCURRENT}")

    crawled = 0
    failed = 0
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def fetch_one(code):
        async with semaphore:
            url = f"{BASE}/en/v/{code}"
            html = await fetch(session, url)
            return (code, html)

    for i in range(0, len(to_crawl), batch_size):
        batch = to_crawl[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(to_crawl) + batch_size - 1) // batch_size
        print(f"\n--- Batch {batch_num}/{total_batches} ({len(batch)} videos) ---")

        tasks = [fetch_one(code) for code in batch]
        results = await asyncio.gather(*tasks)

        batch_data = []
        batch_failed = 0
        for code, html in results:
            if not html:
                batch_failed += 1
                failed += 1
                continue
            data = parse_detail_page(html, code)
            batch_data.append(data)

        if batch_data:
            save_batch(conn, batch_data)
            conn.commit()
            crawled += len(batch_data)

        print(f"  Batch done: {len(batch_data)} saved, {batch_failed} failed ({crawled}/{len(to_crawl)} total)")

    conn.close()
    print(f"\nDone! Crawled {crawled} videos, {failed} failed.")
    return crawled

async def crawl_year(session, type_name, year, all_codes, existing, args, state, type_state, year_idx, years):
    """Crawl all listing pages for a given type and year. Returns updated existing set."""
    page = type_state.get("page", 1)
    batch_collected = set()
    listing_batch = args.listing_batch

    while True:
        if args.max_videos and state.get("newly_crawled", 0) >= args.max_videos:
            break

        year_str = f"&year={year}" if year else ""
        url = f"{BASE}/en/{type_name}?page={page}&sort=release_date{year_str}"
        print(f"\n[{type_name}] {year or 'All'} - page {page}...")
        html = await fetch(session, url)
        if not html:
            print(f"  Failed to fetch {url}, stopping.")
            break

        codes = parse_listing_page(html)
        if not codes:
            print(f"  No codes on page {page}, stopping.")
            break

        new_codes = [c for c in codes if c not in all_codes]
        if not new_codes:
            print(f"  All {len(codes)} codes on page {page} already seen, stopping.")
            break

        all_codes.update(new_codes)
        batch_collected.update(new_codes)
        print(f"  Found {len(new_codes)} new codes (total collected: {len(all_codes)})")

        page += 1

        # Save progress
        type_state["year_idx"] = year_idx
        type_state["page"] = page
        save_state(state)

        if args.max_pages and page > args.max_pages:
            break

        # If listing_batch set, process details after each batch
        if listing_batch and batch_collected:
            to_crawl = [c for c in batch_collected if c not in existing]
            if to_crawl:
                n = await crawl_details(session, to_crawl, existing, batch_size=args.batch_size,
                                        max_videos=args.max_videos, newly_crawled=state.get("newly_crawled", 0))
                state["newly_crawled"] = state.get("newly_crawled", 0) + n
                existing = get_existing_codes()
            batch_collected = set()

    # Process remaining codes
    to_crawl = [c for c in batch_collected if c not in existing]
    if to_crawl:
        n = await crawl_details(session, to_crawl, existing, batch_size=args.batch_size,
                                max_videos=args.max_videos, newly_crawled=state.get("newly_crawled", 0))
        state["newly_crawled"] = state.get("newly_crawled", 0) + n
        existing = get_existing_codes()

    return existing

async def run(args):
    init_db()

    all_types = ["censored", "uncensored", "uncensored-leaked"]
    types = args.types or all_types

    # Year range
    if args.year_from or args.year_to:
        years = list(range(args.year_from or 1999, (args.year_to or 2026) + 1))
    else:
        years = list(range(1999, 2027))

    # Load or initialize state
    if args.reset:
        clear_state(types if args.types else None)
        print(f"Crawl state reset{' for: ' + ', '.join(types) if args.types else ' (all)'}.")
    elif args.start_page > 1:
        # Override start page for specified types
        state = load_state()
        for t in types:
            ts = get_type_state(state, t)
            ts["year_idx"] = 0
            ts["page"] = args.start_page
        save_state(state)

    state = load_state()

    # Populate all_codes from DB so duplicate detection works across restarts
    existing = get_existing_codes()
    all_codes = set(existing)
    state["newly_crawled"] = 0

    print(f"Crawling types: {types}")
    print(f"Year range: {years[0]}-{years[-1]} ({len(years)} years)")
    print(f"Listing pages per batch: {args.listing_batch or 'collect all first'}")
    print(f"Max detail pages: {args.max_videos or 'unlimited'}")
    print(f"DB save batch: {args.batch_size}")
    print(f"Concurrency: {MAX_CONCURRENT}, Rate limit: {RATE_LIMIT}s")
    print(f"Videos already in DB: {len(existing):,}")

    async with aiohttp.ClientSession() as session:
        for type_name in types:
            type_state = get_type_state(state, type_name)
            start_year_idx = type_state.get("year_idx", 0)
            start_page = type_state.get("page", 1)

            if start_year_idx > 0 or start_page > 1:
                y = years[start_year_idx] if start_year_idx < len(years) else "N/A"
                print(f"\nResuming {type_name} from year {y} page {start_page}")
            else:
                print(f"\nStarting {type_name} from scratch")

            for year_idx, year in enumerate(years):
                if year_idx < start_year_idx:
                    continue

                if args.max_videos and state.get("newly_crawled", 0) >= args.max_videos:
                    break

                # Use saved page only for the first year of this type
                page = start_page if year_idx == start_year_idx else 1
                type_state["year_idx"] = year_idx
                type_state["page"] = page
                save_state(state)

                existing = await crawl_year(
                    session, type_name, year, all_codes, existing,
                    args, state, type_state, year_idx, years
                )

            # Type complete — reset for next run (re-check for new content)
            type_state["year_idx"] = 0
            type_state["page"] = 1
            save_state(state)
            print(f"\n{type_name} complete. State reset for next run.")

    stats = get_stats()
    print(f"\nDatabase stats: {stats}")
    print("Crawl complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crawl 123AV website")
    parser.add_argument("--types", nargs="+", help="Types to crawl (censored, uncensored, uncensored-leaked)")
    parser.add_argument("--max-pages", type=int, help="Max listing pages per type/year")
    parser.add_argument("--listing-batch", type=int, default=10, help="Collect codes from N listing pages before crawling details (default: 10). Set to 0 to collect all first.")
    parser.add_argument("--max-videos", type=int, help="Max detail pages to crawl")
    parser.add_argument("--start-page", type=int, default=1, help="Start from page N (overrides saved state)")
    parser.add_argument("--reset", action="store_true", help="Reset crawl state and start from beginning")
    parser.add_argument("--year-from", type=int, help="Start from year (default: 1999)")
    parser.add_argument("--year-to", type=int, help="End at year (default: 2026)")
    parser.add_argument("--batch-size", type=int, default=100, help="Videos to save per DB batch (default: 100)")
    args = parser.parse_args()

    asyncio.run(run(args))
