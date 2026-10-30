"""One-off tool: fetches MCF's full shelter register and writes the static local snapshot.

Run manually (not part of the app, CI, or tests) whenever the bundled snapshot in
backend/src/data/shelters.json needs refreshing:

    cd backend && python scripts/fetch_shelters.py

Paginates MCF's OGC API Features collection (the modern counterpart to the WFS endpoint the
live lookup used before this MVP) with startIndex, since the server caps each page at roughly
10,000 features regardless of the requested limit. Uses the CSV output format rather than
JSON/GeoJSON: a page of 10,000 features reliably completes as CSV, but the same page size as
JSON intermittently aborts mid-response (observed directly against this endpoint while
investigating this script - a server-side quirk serving large JSON pages, not a client issue).
Reuses the same property names (inspireid is not present in CSV; "id" and "name" instead,
additionallocationdescription, numberofoccupants, statustype) the old live WFS mapping already
handled, plus a WKT "MULTIPOINT ((lon lat))" geometry column instead of GeoJSON coordinates.

Also writes shelters.meta.json alongside the snapshot (fetchedAt, count, sourceUrl) - not read
by the app, just a durable, inspectable record of the snapshot's age and origin.
"""

import csv
import io
import json
import re
import sys
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode

COLLECTION_URL = (
    "https://inspire.mcf.se/skyddsrum/ogc/features/v1/collections/US_civilProtectionSite/items"
)
PAGE_SIZE = 10_000
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "shelters.json"
# Sidecar, not read by the app - a durable, inspectable record of when/where this snapshot came
# from, so its age is traceable without depending on a commit message being written well.
META_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "shelters.meta.json"
USER_AGENT = "KrisKompassen-shelter-sync/0.1 (+https://github.com/mahtabb90/Kriskompassen)"
TIMEOUT_SECONDS = 90
_MULTIPOINT_RE = re.compile(r"MULTIPOINT\s*\(\(\s*([-\d.]+)\s+([-\d.]+)\s*\)\)")


def _fetch_page_csv(start_index: int) -> list[dict[str, str]]:
    query = urlencode({"f": "text/csv", "limit": PAGE_SIZE, "startIndex": start_index})
    request = urllib.request.Request(
        f"{COLLECTION_URL}?{query}",
        headers={"Accept": "text/csv", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310
        body = response.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(body)))


def _parse_point(geom: str) -> tuple[float, float] | None:
    """Extracts (lon, lat) from a WKT "MULTIPOINT ((lon lat))" string."""
    match = _MULTIPOINT_RE.search(geom)
    if match is None:
        return None
    lon, lat = float(match.group(1)), float(match.group(2))
    return lon, lat


def _map_row(row: dict[str, str]) -> dict | None:
    """Maps one CSV row to the Shelter model's JSON shape.

    A malformed row (missing id or geometry) is skipped rather than failing the whole fetch,
    since one bad record should not discard every other shelter in the collection.
    """
    # inspireid is the INSPIRE directive's persistent external identifier for this feature -
    # the same field the old live WFS mapping used as Shelter.id - unlike the bare "id"/"FID"
    # columns, which look like internal, re-importable row numbers, not a stable identity.
    shelter_id = row.get("inspireid")
    point = _parse_point(row.get("geom", ""))
    if not shelter_id or point is None:
        return None
    lon, lat = point

    number = row.get("name") or None
    address = row.get("additionallocationdescription") or None
    capacity_raw = row.get("numberofoccupants") or ""
    shelter_type = row.get("statustype") or None
    capacity = int(capacity_raw) if capacity_raw.strip().lstrip("-").isdigit() else None
    return {
        "id": shelter_id,
        "number": number,
        "address": address,
        "lat": lat,
        "lon": lon,
        "capacity": capacity,
        "type": shelter_type,
    }


def fetch_all_shelters() -> list[dict]:
    """Pages through the whole collection by startIndex until a page returns fewer rows than
    requested - CSV carries no numberMatched field, so a short page is the end-of-data signal.
    """
    shelters_by_id: dict[str, dict] = {}
    start_index = 0
    while True:
        rows = _fetch_page_csv(start_index)
        for row in rows:
            shelter = _map_row(row)
            if shelter is not None:
                shelters_by_id[shelter["id"]] = shelter
        print(f"  startIndex={start_index}: fetched {len(rows)} rows", file=sys.stderr)
        start_index += len(rows)
        if len(rows) < PAGE_SIZE:
            break
    return list(shelters_by_id.values())


def main() -> None:
    print(f"Fetching shelters from {COLLECTION_URL} ...", file=sys.stderr)
    fetched_at = datetime.now(UTC).isoformat()
    shelters = fetch_all_shelters()
    print(f"Fetched {len(shelters)} shelters total.", file=sys.stderr)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(shelters, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"Wrote {OUTPUT_PATH}", file=sys.stderr)
    META_PATH.write_text(
        json.dumps(
            {"fetchedAt": fetched_at, "count": len(shelters), "sourceUrl": COLLECTION_URL},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {META_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
