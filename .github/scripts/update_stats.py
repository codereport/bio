#!/usr/bin/env python3
"""Fetch live YouTube + ADSP stats and update index.html when they change."""

import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

YT_ABOUT_URL = "https://www.youtube.com/@code_report/about"
ADSP_FEED_URL = "https://adspthepodcast.com/feed.xml"
BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
)


def parse_yt_number(text):
    """Parse a YouTube-formatted number ('62.5K' -> 62500, '3,553,019' -> 3553019)."""
    s = text.strip().replace(",", "")
    for suffix, mult in [("B", 1e9), ("M", 1e6), ("K", 1e3)]:
        if s.upper().endswith(suffix):
            return int(float(s[:-1]) * mult)
    return int(s)


def fetch_youtube_stats():
    """Scrape channel stats from the YouTube about page (no API key needed)."""
    req = urllib.request.Request(
        YT_ABOUT_URL,
        headers={"User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.5"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode()

    subs_m = re.search(r'"subscriberCountText":"([\d,.]+[KMB]?) subscribers"', html)
    views_m = re.search(r'"viewCountText":"([\d,.]+[KMB]?) views"', html)
    videos_m = re.search(r'"videoCountText":"([\d,.]+) videos"', html)

    if not (subs_m and views_m and videos_m):
        raise RuntimeError("Could not parse YouTube stats from about page")

    return {
        "subscribers": parse_yt_number(subs_m.group(1)),
        "videos": int(videos_m.group(1).replace(",", "")),
        "views": parse_yt_number(views_m.group(1)),
    }


def fetch_adsp_episodes():
    """Get the latest episode number from the ADSP Atom feed."""
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    req = urllib.request.Request(
        ADSP_FEED_URL, headers={"User-Agent": "bio-stats-bot/1.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        tree = ET.parse(resp)

    title_el = tree.find(".//atom:entry/atom:title", ns)
    if title_el is None or title_el.text is None:
        raise RuntimeError("No entries found in ADSP feed")

    m = re.search(r"Episode (\d+)", title_el.text)
    if not m:
        raise RuntimeError(f"Could not parse episode number from: {title_el.text}")
    return int(m.group(1))


def format_big_number(n):
    """Format with k/M suffix to match existing style (62k, 3.5M)."""
    if n >= 1_000_000:
        return f"{round(n / 1_000_000, 1):g}M"
    if n >= 1_000:
        return f"{n // 1000}k"
    return str(n)


def main():
    with open("index.html") as f:
        html = f.read()

    yt_match = re.search(
        r'<span class="stat-bubble">'
        r"(\S+) subs<br>(\d+) videos<br>(\S+) views"
        r"</span>",
        html,
    )
    adsp_match = re.search(r"(\d+) episodes", html)

    if not yt_match or not adsp_match:
        print("Error: could not parse current stats from index.html", file=sys.stderr)
        sys.exit(1)

    old = {
        "yt_subs": yt_match.group(1),
        "yt_videos": yt_match.group(2),
        "yt_views": yt_match.group(3),
        "adsp_episodes": adsp_match.group(1),
    }
    print(
        f"Current:  {old['yt_subs']} subs | {old['yt_videos']} videos | "
        f"{old['yt_views']} views | {old['adsp_episodes']} episodes"
    )

    new = dict(old)
    errors = []

    try:
        yt = fetch_youtube_stats()
        new["yt_subs"] = format_big_number(yt["subscribers"])
        new["yt_videos"] = str(yt["videos"])
        new["yt_views"] = format_big_number(yt["views"])
    except Exception as e:
        errors.append(str(e))
        print(f"Warning: YouTube scrape failed: {e}", file=sys.stderr)

    try:
        new["adsp_episodes"] = str(fetch_adsp_episodes())
    except Exception as e:
        errors.append(str(e))
        print(f"Warning: ADSP feed failed: {e}", file=sys.stderr)

    if len(errors) == 2:
        print("Error: all fetches failed", file=sys.stderr)
        sys.exit(1)

    print(
        f"Fetched:  {new['yt_subs']} subs | {new['yt_videos']} videos | "
        f"{new['yt_views']} views | {new['adsp_episodes']} episodes"
    )

    if new == old:
        print("Stats are up to date -- nothing to do.")
        return

    html = html.replace(
        f"{old['yt_subs']} subs<br>{old['yt_videos']} videos<br>{old['yt_views']} views",
        f"{new['yt_subs']} subs<br>{new['yt_videos']} videos<br>{new['yt_views']} views",
    )
    html = html.replace(
        f"{old['adsp_episodes']} episodes",
        f"{new['adsp_episodes']} episodes",
    )

    with open("index.html", "w") as f:
        f.write(html)

    print("index.html updated.")


if __name__ == "__main__":
    main()
