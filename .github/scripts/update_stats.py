#!/usr/bin/env python3
"""Fetch live YouTube + ADSP stats and update index.html when they change."""

import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET


def fetch_youtube_stats(api_key):
    """Return subscriber, video, and view counts from YouTube Data API v3."""
    url = (
        "https://www.googleapis.com/youtube/v3/channels"
        "?part=statistics"
        "&forHandle=@code_report"
        f"&key={api_key}"
    )
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = json.loads(resp.read())
    stats = data["items"][0]["statistics"]
    return {
        "subscribers": int(stats["subscriberCount"]),
        "videos": int(stats["videoCount"]),
        "views": int(stats["viewCount"]),
    }


def fetch_adsp_episodes():
    """Count episodes in the ADSP podcast RSS feed."""
    url = "https://adspthepodcast.com/feed.xml"
    req = urllib.request.Request(url, headers={"User-Agent": "bio-stats-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        tree = ET.parse(resp)
    return len(tree.findall(".//item"))


def format_big_number(n):
    """Format a number with k/M suffix to match the existing style (62k, 3.5M)."""
    if n >= 1_000_000:
        return f"{round(n / 1_000_000, 1):g}M"
    if n >= 1_000:
        return f"{n // 1000}k"
    return str(n)


def main():
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        print("Error: YOUTUBE_API_KEY not set", file=sys.stderr)
        sys.exit(1)

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
    print(f"Current:  {old['yt_subs']} subs | {old['yt_videos']} videos | "
          f"{old['yt_views']} views | {old['adsp_episodes']} episodes")

    new = dict(old)
    errors = []

    try:
        yt = fetch_youtube_stats(api_key)
        new["yt_subs"] = format_big_number(yt["subscribers"])
        new["yt_videos"] = str(yt["videos"])
        new["yt_views"] = format_big_number(yt["views"])
    except Exception as e:
        errors.append(str(e))
        print(f"Warning: YouTube API failed: {e}", file=sys.stderr)

    try:
        new["adsp_episodes"] = str(fetch_adsp_episodes())
    except Exception as e:
        errors.append(str(e))
        print(f"Warning: ADSP RSS failed: {e}", file=sys.stderr)

    if len(errors) == 2:
        print("Error: all fetches failed", file=sys.stderr)
        sys.exit(1)

    print(f"Fetched:  {new['yt_subs']} subs | {new['yt_videos']} videos | "
          f"{new['yt_views']} views | {new['adsp_episodes']} episodes")

    if new == old:
        print("Stats are up to date -- nothing to do.")
        return

    # YouTube stat bubble
    html = html.replace(
        f"{old['yt_subs']} subs<br>{old['yt_videos']} videos<br>{old['yt_views']} views",
        f"{new['yt_subs']} subs<br>{new['yt_videos']} videos<br>{new['yt_views']} views",
    )

    # ADSP episode count only (download count is private)
    html = html.replace(
        f"{old['adsp_episodes']} episodes",
        f"{new['adsp_episodes']} episodes",
    )

    with open("index.html", "w") as f:
        f.write(html)

    print("index.html updated.")


if __name__ == "__main__":
    main()
