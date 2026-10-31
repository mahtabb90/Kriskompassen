# Backend API and information sources

The FastAPI backend fetches VMA from Sveriges Radio's dedicated v3 API through a short shared
in-memory cache. The frontend service validates public Swedish CAP records and maps them to a
shared presentation model. A shared banner shows the most recent active warning. The frontend
polls our backend while the app is open; VMA is not stored persistently.
Curated preparedness articles are served from a bundled JSON file through their own API,
and shelter information is served from a bundled snapshot of MCF's register. A backend database
is deferred for now and may be reconsidered in the future. The user has confirmed working live
VMA integration; the verification record below distinguishes that result from active-warning
rendering.

## Separate information sources

| Information | Provider | Integration status |
| --- | --- | --- |
| VMA warnings, updates and cancellations | Sveriges Radio VMA API v3 | Implemented through the backend and frontend service |
| Preparedness articles | Manually maintained summaries attributed to Krisinformation.se | File-backed article API; no automatic source fetching |
| Civil-defense shelters | Myndigheten för civilt försvar (MCF), open OGC API Features | File-backed snapshot API and browser-local offline cache; refreshed by a manual script, no automatic daily sync yet |
| General crisis news | Krisinformation.se news API v3 | Chosen source for future work; no news fetching service or route is implemented |

Do not feed news records into the VMA validator or silently fall back to news if VMA fetching fails.
The former assumption that Krisinformation VMA records have the news format is no longer used.
The [Krisinformation open-data page](https://www.krisinformation.se/om-krisinformation.se/oppen-data/)
documents general news. Its [publication policy](https://www.krisinformation.se/om-krisinformation/publiceringsdokument-for-krisinformation.se/)
says its own VMA information is updated through an API from Sveriges Radio.

## Storage and shelter caching

The current backend uses static deployment files for curated content and the shelter snapshot,
and on-demand requests for VMA and geocoding. There is no backend database, database connection
configuration, migration step or writable server-side shelter store. Database integration is
deferred and can be reconsidered in future work. This does not change the frontend's existing IndexedDB
storage or the account-free product decision.

- **Curated content:** `src/data/crisis.json` is shipped with the backend and read on demand.
  Content updates follow the file-review and deployment process below; runtime requests never
  write to this file.
- **Shelter lookups:** `GET /api/v1/shelters/nearest?lat=&lon=` ranks the bundled
  `src/data/shelters.json` snapshot by distance and returns the five nearest as
  `{shelters, source, bboxRadiusMetersUsed}`, without contacting MCF. `scripts/fetch_shelters.py`
  refreshes the file manually; there is no scheduled synchronization and the register is not
  imported into a database. See [Civil-defense shelters](#civil-defense-shelters).
- **In-memory snapshot:** `LocalShelterStore` keeps the parsed snapshot in memory after its first
  successful load. State is per instance and is lost on cold start, when the unchanged file is
  loaded again. Browser responses use `Cache-Control: no-store`; this is separate from the app's
  explicit IndexedDB cache.
- **Device-local shelter cache:** the frontend validates fetched shelter data and writes the
  shelter records to `shelterCache` in IndexedDB, adding `fetchedAt`. A later fetch overwrites
  an existing record with the same ID. Only fetched records are cached; there is no download of
  the complete register, automatic expiry or periodic synchronization of this local cache.
  Online lookups rank the five nearest records from the current response; offline lookups
  rank records cached from previous searches. Results are limited to previously fetched areas,
  so offline results do not establish complete coverage or current source data. `fetchedAt` is
  when the device received the record, not the snapshot's age.
- **Address-save prefetch:** saving an address with coordinates starts a best-effort online
  shelter lookup and writes its result to the same local cache. A failed prefetch never blocks
  or fails the address save.
- **Saved shelters:** bookmarks are stored separately in IndexedDB's `savedShelters` table,
  with ID, fallback location/coordinates, save time and an optional short comment. Shelter
  detail views read `shelterCache` by ID; there is no single-shelter backend endpoint. Local
  bookmarks do not create a server record or sync to an account.

The browser-local schema is version 5 in `frontend/src/db/db.ts`: `crisisItems`,
`crisisKitItems`, `savedAddresses`, `shelterCache` and `savedShelters`. See `AGENTS.md` §9 for
local personal-data rules and §10 before changing this schema or revisiting a backend database.
VMA and geocoding also use temporary per-instance caches, described in their sections below.

## Curated preparedness articles

`src/data/crisis.json` is the single runtime source for preparedness articles. It is a UTF-8
array in display order. `src/services/crisis.py` reads it relative to the service module,
validates the whole array and rejects duplicate IDs on every request. The synchronous FastAPI
routes run this file I/O in the worker thread pool. Imports and application startup do not read
the file, so a data error does not disable unrelated API endpoints. No external service or
database is involved in article retrieval, and no runtime endpoint writes this file.

Each article has string fields `id`, `title`, `description`, `content`, `source`, `fetchedAt`
and an optional `sourceUrl`. Required text is nonblank. IDs contain only letters, digits,
underscores and hyphens; retain existing IDs so saved offline copies continue to match.
Links must be absolute HTTP(S) URLs without credentials, whitespace or backslashes.
`fetchedAt` is a valid UTC timestamp in `YYYY-MM-DDTHH:mm:ss.sssZ` format recording when the
content was compiled. Serving an article does not verify the source again or change that time.
The file rejects unknown fields, including `savedOffline` and `savedAt`; those belong only to
the user's device. An absent source link is omitted from API responses.

`GET /api/v1/crisis` returns the complete array, including full article text so list cards can
save offline copies without another request. `GET /api/v1/crisis/{id}` returns one article.
A valid empty array gives `200 []`; an unknown ID after successful full-source validation gives
`404 {"error":{"code":"crisis_not_found","message":"Den informationen hittades inte."}}`.
Unreadable/missing files, invalid UTF-8/JSON, invalid fields and duplicate IDs give
`500 {"error":{"code":"crisis_data_unavailable","message":"Krisinformationen kunde inte läsas."}}`.
All article responses use `Cache-Control: no-store`, including errors, and retain the app's
existing exact-origin CORS policy. Responses and warning logs never expose file paths or content.

The frontend validates the list/detail shape and source links independently and rejects
duplicate list IDs or a detail whose ID differs from the request. Only the documented detail
404 is treated as a missing article; HTML or unrelated 404 responses remain retryable failures.
Its per-request deadline covers both headers and body, including a stalled error body.
Mode/ID changes abort requests and discard older results; returning online fetches anew.
Offline mode reads IndexedDB only. Existing local copies, including those without `savedAt`,
remain readable and are never automatically overwritten by online responses.

### Updating and publishing article content

1. Edit `src/data/crisis.json` using independently worded Swedish summaries. Retain stable IDs,
   source attribution and the meaning of the source's advice, quantities and safety qualifications.
   Check each article against its current source and the linked responsible authority where
   clarification is needed. Record the URLs, review date and checked facts in the review table below.
   Update `fetchedAt` only when compiling/verifying the content again; do not set it per request.
2. Run the backend checks from this guide and inspect list/detail responses in `/docs`.
3. Publish the backend through the team's existing manual process. The JSON file is part of the
   backend source deployment; no database, file upload or new environment setting is needed.
4. For the initial API migration, publish backend **before frontend**. Verify both article
   endpoints at the deployed backend, then publish the frontend and check its browser requests
   and CORS. This repository change does not establish production verification.
5. After a content-only publication, a fresh online visit/mode entry retrieves the new articles.
   Saved offline copies retain their saved content until explicitly removed and saved again.

### Preparedness article source review

The six Swedish summaries were rewritten and checked on 2026-10-20. Their shared compilation/
review timestamp is `2026-10-20T12:37:11.000Z`; IDs, titles, display order and Krisinformation.se
attribution are retained. This is a dated editorial check, not automatic ongoing source validation.
The language review distinguishes preparations made in advance from conditional advice for an
actual disruption. It also replaces ambiguous food/radio instructions, uses consistent reader
address and explains the prescription exclusions in shorter sentences.

The former `/forbered-dig/hemberedskap/...` URLs now redirect to Krisinformation.se's new structure.
The public source links use the current Hemberedskap page for five articles and the specific
internet/telephony article for communication. The relevant Hemberedskap sections and supporting
authority pages checked for each article are listed below. The authority pages clarify safety
qualifications that must also survive summarisation.

| Article ID | Reviewed on | Krisinformation.se source | Supporting authority sources | Checked facts and qualifications |
| --- | --- | --- | --- | --- |
| `food-in-crisis` | 2026-10-20 | [Hemberedskap, introduction and Mat](https://www.krisinformation.se/din-beredskap/hemberedskap/) | [Myndigheten för civilt försvar: Tillgång till mat i kris](https://www.mcf.se/sv/rad-till-privatpersoner/hemberedskap---preppa-for-en-vecka/mat/tillgang-till-mat-i-kris/) | At least one week's household food; energy, room-temperature storage, quick or no cooking, little preparation water and gradual stocking. |
| `drinking-water-in-crisis` | 2026-10-20 | [Hemberedskap, Dricksvatten](https://www.krisinformation.se/din-beredskap/hemberedskap/) | [Myndigheten för civilt försvar: Tillgång till vatten i kris](https://www.mcf.se/sv/rad-till-privatpersoner/hemberedskap---preppa-for-en-vecka/vatten/tillgang-till-vatten-i-kris/), [Livsmedelsverket: Kokning av dricksvatten](https://www.livsmedelsverket.se/livsmedel-och-innehall/dricksvatten/nar-du-maste-koka-dricksvattnet/kokning-av-dricksvatten---faktablad-teckensprak/), [Livsmedelsverket: Information vid kvalitetsproblem, När ska man rekommendera kokning?](https://kontrollwiki.livsmedelsverket.se/artikel/391/information-vid-kvalitetsproblem) | Three to five litres per adult/day including basic hygiene, following the more specific MCF wording (Krisinformation.se says per person). Additional pet needs; clean, sealed drinking-water containers, cool/dark storage and municipal collection. Follow local water notices; boiling addresses microorganisms and does not make chemically contaminated water safe. |
| `medication-in-crisis` | 2026-10-20 | [Hemberedskap, Läkemedel](https://www.krisinformation.se/din-beredskap/hemberedskap/) | [Socialstyrelsen: Om rekommendationen](https://www.socialstyrelsen.se/medicin-for-en-manad/om-rekommendationen/), [Socialstyrelsen: Frågor och svar](https://www.socialstyrelsen.se/medicin-for-en-manad/fragor-och-svar/) | One month's reserve for long-term prescriptions and prescribed consumables; oldest medicines first. Retain all listed exclusions, including non-prescribed consumables and medical restrictions on advance dispensing. A reserve is not a cap on stock immediately after a regular prescription collection. Contact the prescriber when individual planning is needed. |
| `heating-in-crisis` | 2026-10-20 | [Hemberedskap, Värme](https://www.krisinformation.se/din-beredskap/hemberedskap/) | [Myndigheten för civilt försvar: Tillgång till värme i kris](https://www.mcf.se/sv/rad-till-privatpersoner/hemberedskap---preppa-for-en-vecka/tillgang-till-varme-i-kris/) | Share a room, limit draughts, use layers and insulating bedding. Keep escape routes and ventilation usable; follow heater instructions, ventilate regularly, prevent fires and avoid stove/candle use during sleep. |
| `communication-in-crisis` | 2026-10-20 | [Om internet och telefoni går ner](https://www.krisinformation.se/din-beredskap/kommunikation/om-internet-och-telefoni-gar-ner/) | [Myndigheten för civilt försvar: Tillgång till kommunikation i kris](https://www.mcf.se/sv/rad-till-privatpersoner/hemberedskap---preppa-for-en-vecka/tillgang-till-kommunikation-i-kris/) | Local P4 information, radios independent of mains power, car radio, spare batteries, written telephone numbers, charged powerbank and car charging. |
| `hygiene-in-crisis` | 2026-10-20 | [Hemberedskap, Toalett och hygien](https://www.krisinformation.se/din-beredskap/hemberedskap/) | [Myndigheten för civilt försvar: Tvätt och toalett i kris](https://www.mcf.se/sv/rad-till-privatpersoner/hemberedskap---preppa-for-en-vecka/vatten/hygien-tvatt-och-toalett/) | Prioritise drinking/cooking water; prepare hygiene supplies and a covered bucket. Preserve hand hygiene and municipality-specific toilet-waste handling rather than assuming one disposal method applies everywhere. |

The Python runtime includes project files in its function bundle; see
[Vercel's Python bundling documentation](https://vercel.com/docs/functions/runtimes/python#controlling-what-gets-bundled).
Do not add runtime writes to this deployment file as a substitute for durable database storage.

## Civil-defense shelters

MVP decision: `src/data/shelters.json` is a single static, committed snapshot of MCF's full
national shelter register (civil-defense shelters, "skyddsrum") — the same deployment-bundled
file pattern as `crisis.json` above, not a live call per search. `src/services/shelters.py`
reads it once per process (`LocalShelterStore`, cached in memory after the first successful
load - unlike `crisis.py`, which re-reads its small file every request, because this snapshot
has 60,000+ records, too expensive to re-parse every call) and ranks shelters by Haversine
distance from the requested position. `GET /api/v1/shelters/nearest?lat=&lon=` returns the five
closest. `GET /api/v1/shelters/within-bounds?north=&south=&east=&west=` backs the frontend's
"Kartan" page instead - a plain per-axis range filter (`shelters_within_bounds`) over the same
in-memory list, returning every shelter inside one rectangular map viewport rather than a fixed
count. Deliberately no server-side clustering or result cap: the frontend fetches only the
current viewport (debounced as the user pans/zooms, and skipped entirely below a minimum zoom -
see `MIN_ZOOM_FOR_SHELTERS` in `frontend/src/components/AllSheltersMap.tsx`) and clusters
client-side via MapLibre's own `GeoJSONSource`, so this endpoint never needs to reason about
clustering or payload size itself. Imports and application startup do not read the file, so a
data error does not disable unrelated API endpoints; a missing or invalid snapshot raises
`500 {"error":{"code":"shelters_data_unavailable","message":"Skyddsrumsdata kunde inte läsas."}}`
rather than falling back to a live MCF call. No database or runtime write is involved.

**There is no automatic refresh yet.** The snapshot is refreshed by running
`backend/scripts/fetch_shelters.py` manually and committing the result — this is a deliberate,
scoped-down MVP decision, not an oversight; building a scheduled daily sync is separate, planned
future work (see the team's backlog item "Uppdatering av lokal skyddsrumsfil" for the research
already done: pagination, CSV format, Vercel Blob vs. a committed file + GitHub Action). The data
visibly ages between manual runs; `src/data/shelters.meta.json` (also written by the script, not
read by the app) records `fetchedAt`, `count` and `sourceUrl` for traceability. The team decided
this staleness does not need to be surfaced to end users for the MVP.

The script pages through MCF's open [OGC API Features collection](https://inspire.mcf.se/skyddsrum/ogc/features/v1/collections/US_civilProtectionSite/items)
(the modern counterpart to the WFS endpoint the earlier live lookup used) using `startIndex`,
since the server caps each page at roughly 10,000 features regardless of the requested `limit`.
It requests the `text/csv` output format rather than JSON/GeoJSON: a 10,000-feature page reliably
completes as CSV, but the same page size as JSON intermittently aborts mid-response — a
server-side quirk observed directly against this endpoint, not a client issue. The dataset's
[Geodataportalen metadata record](https://www.geodata.se/geodataportalen/srv/swe/catalog.search#/metadata/6341813c-bfa3-45df-8234-13cf583bf533)
states no access or reuse restrictions apply. The script's fetch/mapping logic is written to be
reused as-is by the future scheduled-sync job, not thrown away.

### Refreshing the shelter snapshot

1. `cd backend && python scripts/fetch_shelters.py` (needs network access to `inspire.mcf.se`;
   takes roughly 15-30 seconds for the whole national register).
2. Confirm `src/data/shelters.json` and `src/data/shelters.meta.json` both updated.
3. Run the backend checks from this guide (tests, Ruff) and spot-check a few coordinates against
   `GET /api/v1/shelters/nearest` in `/docs`.
4. Commit both files together, mentioning the new `fetchedAt` date in the commit message.

## Official VMA API and verification

```text
GET https://vmaapi.sr.se/api/v3/alerts
Accept: application/json
```

References: [interactive API documentation](https://vmaapi.sr.se/index.html),
[OpenAPI schema](https://vmaapi.sr.se/swagger/v3.0/swagger.json),
[release notes](https://vmaapi.sr.se/releasenotes),
[CAP 1.2 semantics](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html).

The response is an object with `timestamp` and `alerts`, not a top-level list. A successful empty
response still has an empty `alerts` array. Fetching all areas requires no geocode parameter.
The frontend selects `sv-SE` info blocks. The separate
[static examples endpoint](https://vmaapi.sr.se/testapi/v3/examples/data) supplies six scenarios:
two Actual alerts, an Actual cancellation, two technical test messages and an exercise.
The examples are development data, not live warnings. Their dates must not be interpreted as
current just because a request succeeded.

On 2026-10-05, both production and static examples returned HTTP 200 without API keys, cookies
or authorization. Production returned zero alerts; the examples returned six. Neither response
included `Access-Control-Allow-Origin` for `Origin: http://localhost:5173`. Retain the backend
proxy: an open API is not automatically readable by browser JavaScript across origins.

### Use and attribution review

Evidence checked on 2026-10-05:

- SR's [public-service report for 2015, section 7.10.2](https://www.sverigesradio.se/diverse/appdata/isidor/files/3113/b6743f9f-4bf7-4bf3-b2f8-94f0249195f4.pdf)
  explicitly describes the VMA API as free and intended for crisis actors to publish warnings on
  their websites. This is historical evidence of intended use, not a current comprehensive licence.
- SR's [public-service report for 2024, section 3.11](https://www.sverigesradio.se/diverse/appdata/isidor/files/3113/7b579da6-e1d9-49c5-b07e-b773efff47b7.pdf)
  describes API distribution to other actors and external publication of VMA translations.
- The current VMA documentation provides public production and test endpoints. Its OpenAPI
  document does not specify a licence, terms URL, authentication requirement or numeric rate limit.
- SR's [general open-API terms](https://www.sverigesradio.se/artikel/api-villkor) require clear
  attribution and restrict modification, storage and uses beyond linking/streaming. They link to
  `api.sr.se` and focus on radio material. It has not been established that these are the complete
  applicable terms for the separate VMA text API; do not present them as a verified VMA licence.
- The release notes recommend v3 for production while Swagger retains pilot-project wording.
  Clarify the intended scope of that wording with SR before relying on long-term availability.

The published evidence supports the intended use of VMA for onward public information. It does
not establish unrestricted copying, archiving, offline storage or all current usage conditions.
**Current VMA-specific terms remain unconfirmed.** Obtain clarification from SR before public
release, especially before adding persistent/offline VMA storage. The contact on the general API
terms page is `simon.taubert@sr.se`; ask for the team responsible for `vmaapi.sr.se`. No contact
has been sent and no special permission has been obtained by this implementation.

The backend contacts SR on demand only, when a request arrives and its cache period has expired.
It keeps the latest feed in process memory only, for one cache period or as a stale fallback during
an SR outage, and stores no VMA persistently. It preserves source message text and supplies
attribution for the UI. These choices do not themselves prove legal permission.

Team decision: the frontend may poll our backend, and the backend cache limits calls to SR to at
most one per 60 seconds and instance, regardless of the number of clients (see
[Shared VMA cache](#shared-vma-cache)). Do not add background or scheduled SR fetching, CDN
caching, persistent VMA storage, long-term fixtures containing real warnings, or logo usage on the
assumption that public HTTP access grants unrestricted reuse.

## Geocoding (Nominatim) integration

The backend reverse-geocodes a latitude/longitude pair into a readable Swedish address through
[Nominatim](https://nominatim.org/), OpenStreetMap's public geocoder:

```text
GET https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=..&lon=..&zoom=18&addressdetails=1&accept-language=sv
Accept: application/json
User-Agent: KrisKompassen/0.1 (+https://github.com/mahtabb90/Kriskompassen)
```

Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) requires an
identifying `User-Agent` (a stock HTTP-library default is not accepted) and caps traffic at
roughly one request per second; this integration does on-demand lookups only, no polling or bulk
geocoding. The policy itself does not require a contact address in the `User-Agent` — only that
it identify the application — but we include the project's GitHub URL anyway, per Nominatim's
politeness recommendation, so OSMF can reach us instead of only banning us if something misbehaves
under real traffic. Data is licensed under [ODbL](https://www.openstreetmap.org/copyright); the
frontend must show the OpenStreetMap attribution wherever a reverse-geocoded address is displayed.

A coordinate Nominatim cannot resolve, or a response that cannot be read as a complete address,
is reported as a normal `200 {"found": false, "message": "...", "source": {...}}` — **not** an
`UpstreamError`. `upstream_invalid_response` is reserved for JSON that fails to decode at all.
Missing or out-of-range `lat`/`lon` query parameters are rejected by FastAPI itself with its own
`422 {"detail": [...]}` shape, which does not match the `{"error": {...}}` envelope used for every
other failure documented below — this is a deliberate FastAPI validation-layer behavior, not a bug.
This response contract is unchanged by the cache and throttle described next.

### Shared geocode cache and throttle

`src/services/geocode_cache.py` holds one `GeocodeCache` per application instance
(`app.state.geocode_cache`, injected through `get_geocode_cache`), backed by one shared
`NominatimThrottle`. Unlike `VMA_CACHE_TTL_SECONDS` below, both periods are plain settings
(`KRISKOMPASSEN_GEOCODE_CACHE_TTL_SECONDS`, default 300 seconds, and
`KRISKOMPASSEN_GEOCODE_MIN_INTERVAL_SECONDS`, default 1 second) so they can be tuned under real
Nominatim load without a code change.

- **Keyed by exact coordinate.** The cache key is the `(lat, lon)` pair as received, not a
  rounded or snapped position. Only a genuine repeat of the same coordinate — e.g. a retry, or a
  re-render with an unchanged position — is served without contacting Nominatim.
- **On demand only.** Nominatim is contacted when a lookup misses the cache; there is no
  background job or scheduler.
- **Single flight per coordinate.** One `asyncio.Lock` serializes every cache miss. Concurrent
  identical lookups collapse into one Nominatim call; concurrent lookups for different
  coordinates queue behind the same lock and each pay the shared throttle's wait, so they cannot
  reach Nominatim faster than the configured interval between them, no matter how many clients
  are asking at once.
- **Throttle, not a queue limit.** `NominatimThrottle` delays a caller until its turn rather than
  rejecting it; it never returns an error of its own.
- **Errors are never cached.** A failed fetch (`UpstreamError`) is raised exactly as documented
  above and is not stored, so the next request for the same coordinate tries again immediately
  rather than waiting out the TTL. Only a successful response — `found: true` or `found: false`
  — is cached.
- **No stale fallback.** Unlike the VMA cache below, an expired entry is simply treated as a miss
  and re-fetched; a cached entry is never served as fresh past its TTL. Expired entries are
  purged lazily on the next miss so memory does not grow from one-off coordinates.
- **Per instance, in memory.** State resets on cold start, same as the VMA cache.
- **Bounded queue.** `KRISKOMPASSEN_GEOCODE_MAX_QUEUE_DEPTH` (default 10) caps how many misses
  may be waiting on or fetching through the lock at once. A real crisis mostly produces
  *distinct* positions (every user has their own GPS fix), so the cache above barely reduces
  load in that scenario — most requests queue behind the throttle regardless. Without this cap,
  that queue (and each caller's wait) could grow without bound. A lookup arriving once the queue
  is full fails immediately with `503 {"error": {"code": "geocode_queue_full", ...}}` instead of
  joining it, bounding the worst-case wait to roughly `max_queue_depth *
  KRISKOMPASSEN_GEOCODE_MIN_INTERVAL_SECONDS`. The frontend's own request already gives up after
  its own deadline and falls back to manual address entry, which never calls this endpoint; this
  cap mainly keeps the backend's own queue (and memory) bounded and gives a fast, honest failure
  instead of a slow one.

### Verification against the live endpoint

On 2026-10-12, a manual request through the backend's default configuration (no environment
overrides) to `GET /api/v1/geocode?lat=59.3326&lon=18.0649` (Sergels torg, Stockholm) returned
`200` with `found: true`, `address: "Sergelfontänen, Sergels Torg, Klara, Norrmalm, ...,
Stockholm, Stockholms kommun, Stockholms län, 111 51, Sverige"`, `municipality: "Stockholms
kommun"` and `county: "Stockholms län"`. The real Nominatim endpoint accepted the configured
`User-Agent: KrisKompassen/0.1` without rejecting the request. This confirms the live upstream
shape matches `UpstreamGeocodeResult` and the municipality/county mapping for at least one real
Swedish address; it does not establish behavior for every address, for Nominatim's documented
no-result case against a real (non-synthetic) coordinate, or for sustained request volume beyond
Nominatim's ~1 request/second usage policy.

A second live check exercised the full chain end-to-end through the running frontend and a
browser-injected real coordinate (59.3268, 18.0717, the Royal Palace, Stockholm): a real
`fetch()` from `AddressSection` reached this backend, which reached the real Nominatim endpoint,
and correctly rendered "Inre borggården, Gamla stan, ..., Stockholm, Stockholms kommun,
Stockholms län, ..." with the approximate-position badge and OSM attribution. Confirmed via both
the browser's network log and this server's access log.

A third check used the user's own device (Firefox on Linux, no GPS hardware) with a genuinely
granted permission. The first attempt returned the browser's own `TIMEOUT`, correctly surfaced as
the documented Swedish message. A retry succeeded but resolved to an address roughly 15-20 km
from the user's actual location (Upplands Väsby instead of Viksjö, Järfälla) — a real example of
the browser's own network-based position estimate being inaccurate, not a backend or Nominatim
fault; reverse-geocoding the (wrong) coordinate was itself correct. This is why an automatically
fetched address is always labelled approximate and correctable rather than presented as exact.

## Local setup

Use Python 3.13, recorded in `.python-version`. From `backend/`:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn src.app:app --reload --port 8000
```

Ensure `python3` selects Python 3.13. On Windows PowerShell, create and activate the environment
with `py -3.13 -m venv .venv` and `.venv\Scripts\Activate.ps1`; installation and server commands
are the same. The existing local `.venv` can be reused; Anaconda is not required.

Run `npm run dev` from `frontend/` in another terminal. Use `http://localhost:5173` or
`http://127.0.0.1:5173` for the default CORS configuration. Configure a different exact origin
if Vite selects another port. The shared app layout requests VMA once when it mounts and displays
the most recent active warning. Without an available backend it shows an explicit status notice
and a retry button; a failed request is never treated as a successful empty response.

## Configuration

Settings read process environment variables, not `.env` files. `.env.example` lists names only.

| Setting | Default | Meaning |
| --- | --- | --- |
| `KRISKOMPASSEN_VMA_API_URL` | `https://vmaapi.sr.se/api/v3/alerts` | SR-compatible feed endpoint |
| `KRISKOMPASSEN_VMA_TIMEOUT_SECONDS` | `8` | Total upstream deadline, including the response body |
| `KRISKOMPASSEN_GEOCODE_API_URL` | `https://nominatim.openstreetmap.org/reverse` | Nominatim-compatible reverse-geocoding endpoint |
| `KRISKOMPASSEN_GEOCODE_TIMEOUT_SECONDS` | `8` | Total upstream deadline for one reverse-geocode lookup |
| `KRISKOMPASSEN_GEOCODE_USER_AGENT` | `KrisKompassen/0.1 (+https://github.com/mahtabb90/Kriskompassen)` | Identifying User-Agent sent to Nominatim, including a reachable contact per its politeness recommendation |
| `KRISKOMPASSEN_GEOCODE_CACHE_TTL_SECONDS` | `300` | How long a cached reverse-geocode result for one exact coordinate is served without a new Nominatim call |
| `KRISKOMPASSEN_GEOCODE_MIN_INTERVAL_SECONDS` | `1` | Minimum spacing enforced between Nominatim calls, shared across all coordinates |
| `KRISKOMPASSEN_GEOCODE_MAX_QUEUE_DEPTH` | `10` | Max misses waiting on or fetching through the geocode cache's lock at once; a lookup beyond this fails fast with `503 geocode_queue_full` |
| `KRISKOMPASSEN_CORS_ORIGINS` | `["http://localhost:5173","http://127.0.0.1:5173"]` | Exact allowed browser origins |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Public backend base URL |

The frontend's `src/config/apiConfig.ts` configures `/api/v1/crisis`, `/api/v1/vmas`,
`/api/v1/geocode`, `/api/v1/geocode/search` and `/api/v1/shelters/nearest`, with a 10,000 ms
total deadline per request.
The shorter upstream deadline leaves time to return a controlled backend error. Credentials are
not needed for SR; do not add them. CORS permits GET with Accept, without browser credentials.

An existing environment override pointing at Krisinformation must be unset or changed by the
operator. The new validator intentionally rejects the old list-shaped contract.

For a one-off local check with the official static examples, start the backend with:

```sh
KRISKOMPASSEN_VMA_API_URL='https://vmaapi.sr.se/testapi/v3/examples/data' uvicorn src.app:app --reload --port 8000
```

The returned `source.apiUrl` identifies the test endpoint accurately. Stop that server and restart
with the production default afterwards. Never deploy a configuration pointing at static examples.

### Deployed setup

Vercel uses two projects: `frontend/` with the Vite preset, Node from `.nvmrc`, `npm run build`
and output directory `dist`; `backend/` with the FastAPI preset, Python 3.13 and entrypoint
`src/app.py`. The backend deployment was configured in Vercel to install from `requirements.txt`
because the tools-only `pyproject.toml` is not a dependency manifest. Preserve that dashboard
setting when recreating the project. `frontend/vercel.json` provides the frontend SPA fallback.

Set `VITE_API_BASE_URL` on the frontend project to the backend HTTPS base URL, without
`/api/v1/vmas`. On the backend project, set `KRISKOMPASSEN_CORS_ORIGINS` to a JSON array of exact
frontend origins, for example `["https://frontend.example","http://127.0.0.1:5173"]`. Replace the
example domain with the real frontend origin; retain local origins only when testing locally.
Origins include scheme, hostname and optional port, with no page path or wildcard.

Apply settings to the deployment's environment (Production or Preview), including any branch
override. Redeploy the affected project after changes; Vite embeds `VITE_API_BASE_URL` at build
time. If missing, it falls back to `http://localhost:8000` even in a deployed build.
[Vercel environment variables](https://vercel.com/docs/environment-variables),
[Vite environment variables](https://vite.dev/guide/env-and-mode).

The backend must accept browser requests without a Vercel login: the frontend sends
`credentials: "omit"`. For 401/403 responses or login HTML, check deployment protection.
For CORS errors, check the exact frontend origin. CORS does not provide authentication, and
a successful `curl` request alone does not prove that a browser can read the response.

To test the local frontend against the deployed backend, run this from `frontend/`:

```sh
VITE_API_BASE_URL='https://kriskompassen.vercel.app' npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The backend must allow `http://127.0.0.1:5173`. In the browser's Network panel, verify the request
uses the intended HTTPS backend and returns JSON. `/health` should return `200 {"status":"ok"}`;
`/api/v1/vmas` should return `data` (with `timestamp`, `alerts` and `source`), `checkedAt` and
`stale`, with `Cache-Control: max-age=<0-60>` (`no-store` when stale) and
`Access-Control-Allow-Origin` matching the frontend. A successful empty feed hides the
banner; request failures must remain explicit. After frontend deployments, also check direct
route reloads and that static assets and `/sw.js` return their own files rather than HTML.

## Backend contract

`src/app.py` owns the application factory and shared lifespan-managed HTTPX client. Upstream I/O
and JSON decoding remain in `src/services/`; Pydantic envelope validation remains in `src/models/`.
The router adds attribution from backend configuration, ignoring any upstream `source` field.

| Route | Response |
| --- | --- |
| `GET /api/v1/crisis` | `200` array of complete articles, including full text |
| `GET /api/v1/crisis/{id}` | `200` article, documented `404 crisis_not_found`, or `500 crisis_data_unavailable` |
| `GET /health` | `200 {"status":"ok"}`, without contacting SR |
| `GET /api/v1/vmas` | `200 {"data":{"timestamp":"...","alerts":[],"source":{...}},"checkedAt":"...","stale":false}` |
| `GET /api/v1/geocode?lat=&lon=` | `200 {"found":true\|false,"address":"...","municipality":"...","county":"...","lat":...,"lon":...,"message":"...","source":{...}}` |
| `GET /api/v1/shelters/nearest?lat=&lon=` | `200 {"shelters":[],"source":{...},"bboxRadiusMetersUsed":...}` from the bundled snapshot, or `500 shelters_data_unavailable` |
| `GET /docs` | Interactive backend API documentation |
| `GET /openapi.json` | Backend API schema |

The Pydantic model requires a timezone-bearing feed timestamp and a strict `list[JsonValue]`
alerts container. It preserves malformed individual entries for frontend validation so valid
peers are not lost. Extra upstream envelope fields are ignored. This is an intentional contract
change from the previous top-level array; no existing UI consumes that old service contract.

`checkedAt` is the backend's wall-clock time of the last successful SR check. `stale` is `true`
when the latest SR attempt failed and that earlier feed is returned instead. A fresh response uses
`Cache-Control: max-age=<remaining cache period>`; stale and error responses use `no-store`.
Failures never become successful empty feeds. Without a cached feed, a failure returns:

| Failure | HTTP | `error.code` |
| --- | --- | --- |
| Network failure | 502 | `upstream_network_error` |
| Unsuccessful HTTP response | 502 | `upstream_http_error` |
| Invalid JSON, non-finite JSON numbers or invalid envelope | 502 | `upstream_invalid_response` |
| Timeout before headers or during body reading | 504 | `upstream_timeout` |

Errors retain the Swedish `{"error":{"code":"...","message":"..."}}` envelope without exposing
upstream bodies. The configured API address in attribution strips credentials, query parameters
and fragments. It is a public endpoint reference, not a reproduction of sensitive configuration.
Only override the URL with an SR-compatible feed; changing provider requires its own adapter
and attribution change.

### Shared VMA cache

`src/services/vma_cache.py` holds one `VmaCache` per application instance (`app.state.vma_cache`,
injected through `get_vma_cache`). Its period is `VMA_CACHE_TTL_SECONDS = 60` in
`src/core/config.py`, the only place to change it. The value is a team decision because SR
documents no rate limit; it is not configurable through the environment.

- **On demand only.** SR is contacted when a request arrives and the latest attempt is at least
  one period old. There is no background job or scheduler, so no requests means no SR calls.
- **Periods start at every attempt.** Successful and failed attempts both start a new period, so
  an SR outage causes at most one SR call per period and instance, not one per client request.
- **Single flight.** An `asyncio.Lock` serializes refreshes. Concurrent requests during a refresh
  wait and reuse its outcome, so they produce exactly one SR call.
- **Empty is valid.** A successful feed with no alerts is cached like any other result.
- **SR failure.** With a cached feed, the response is that feed with `stale: true`, unchanged
  `checkedAt` and `no-store`. Without one, the documented 502/504 error is returned until the
  next attempt is due.
- **Browser reuse.** A fresh response sets `max-age` to the remaining period, rounded down and at
  least 0. `s-maxage` is never set, to avoid an additional Vercel CDN cache layer.
- **Clocks.** A monotonic clock measures cache age so wall-clock adjustments do not affect the
  period; the wall clock only supplies `checkedAt`. Both are injectable for tests.

On Vercel, the cache is per function instance and is lost on cold start. Separate instances may
each call SR once per period; a shared cache between instances (Redis/CDN) is out of scope.

## Frontend validation and mapping

| Function | Responsibility |
| --- | --- |
| `fetchVmaResponse()` | Fetch and decode JSON without structural interpretation |
| `validateVmaResponse()` | Validate the cache wrapper, envelope, attribution and consumed CAP fields; report partial failures |
| `mapVmaMessage()` | Map one validated record at an explicit evaluation time |
| `mapVmaMessages()` | Also apply Update/Cancel references within the current feed |
| `reevaluateVmaMessages()` | Reapply the same lifecycle rules to the complete mapped feed at a later time, without I/O |
| `fetchVmas()` | Compose the steps, returning `VmaResult` with an evaluation timestamp |

`VmaResult` always contains `source`, `feedUpdatedAt`, `checkedAt`, `stale`, `evaluatedAt`,
`messages`, `issues`, `rejectedCount` and `excludedCount`. `checkedAt` and `stale` are passed
through from the backend; the banner does not present them yet. An empty successful upstream feed has zero records and counts.
An invalid envelope or a non-empty feed of only malformed entries throws
`VmaResponseValidationError`. Excluded-only or partially invalid feeds retain their diagnostics;
consumers must not label these as a verified absence of warnings without considering the counts.

Only Actual/Public Alert, Update and Cancel records are exposed. Technical tests, exercises,
drafts, system/private/restricted messages and Ack/Error records are excluded. In particular,
Actual does not by itself mean active. Non-Swedish-only records are excluded; all valid `sv-SE`
blocks are retained without substituting translations. Optional malformed URLs, instructions,
areas, geocodes and references are omitted with issues; valid messages survive. The validator
checks the subset used by this integration, not complete CAP compliance.

| Frontend model | SR field / meaning |
| --- | --- |
| `id` | `identifier`, the unique CAP message ID; updates have their own IDs |
| `incidentIds` | `incidents`, connecting records about the same incident |
| `messageType` | Alert, Update or Cancel |
| `title` | Swedish `info.event` values, not an assumed news headline |
| `content` | Complete Swedish descriptions and available instructions, separated by blank lines |
| `sentAt` | CAP `sent`; do not call it the original incident publication time |
| `details` | Swedish info blocks with individual expiry, sender, safe web link and geographic data |
| `areas` | `areaDesc` plus string geocodes; missing geography does not mean all Sweden |
| `references` | Parsed sender/identifier/sent tuples pointing to previous messages |
| `source` | Provider and API metadata added by our backend |

A Cancel may have `info: null`. It remains a valid cancellation with no invented title/content,
empty details/areas, and references that a future consumer can use. Never require a cancellation
to look like a full warning article.

### Lifecycle rules

- A current validated Actual/Public Alert or Update is active while its Swedish info blocks
  have not expired. Status is evaluated at `evaluatedAt`, not automatically refreshed later.
- Expired blocks make the message inactive when all have expired. Expiry is a message validity
  limit, not proof that an incident has ended. Mixed expiry or a future sent time yields unknown.
- A Cancel is inactive. A matching Cancel reference marks an earlier message inactive/cancelled;
  Update marks it inactive/superseded. Matching uses the entire sender/identifier/sent tuple,
  never incident IDs alone or input array order. Future/chronologically invalid replacements
  cannot supersede a current message.
- There is no cross-request history. Standalone cancellations retain references but cannot
  restore missing article text. Missing references do not justify guessing which earlier record
  ended. Feed disappearance alone is not recorded as a cancellation.
- The banner selects `status === "active"` and handles unknown, errors and partial data explicitly.
  React renders upstream text as plain text, never `dangerouslySetInnerHTML`.

### Attribution in the UI

Source metadata is available on both the result and every message, including cancellations:

```json
{
  "name": "Sveriges Radio",
  "url": "https://www.sverigesradio.se/",
  "apiName": "Sveriges Radios VMA-API",
  "apiVersion": "3",
  "apiDocumentationUrl": "https://vmaapi.sr.se/index.html",
  "apiUrl": "https://vmaapi.sr.se/api/v3/alerts"
}
```

The banner shows **Källa: Sveriges Radio**, linked through `source.url`. Selecting its title
opens a native modal with the same source attribution, complete Swedish descriptions/instructions,
issuers, areas and CAP sent time. Alert uses `Meddelandet utfärdat`; Update uses
`Meddelandet uppdaterat`. Neither feed time nor references is an original publication date.
`details[].senderName` identifies the issuer; `details[].web`
may be a general explanation of VMA and must not be labelled as the original article unless
that is actually what the link contains. The dialog labels validated message links
`Mer information hos Sveriges Radio` and announces new-tab navigation. API metadata remains
available in the model, without adding technical API details to the public warning.
If no message link remains, the information action uses `source.url`. The frontend also excludes
SR's unavailable `/vma` address, including its trailing-slash/query/fragment variants. Other
validated API links are retained; the UI does not probe external pages for availability or mutate
the CAP data. Do not invent `/vma` as a fallback or as a working link in manual test data.

### Frontend banner behavior and verification without a backend

`AppLayout` owns `useVmaBanner()`, which runs one `vmaUpdateService` per layout. It fetches on
start when the device is online, then polls our backend at `apiConfig.vmaPollIntervalMs`, counted
from the end of the previous attempt, including failed ones. Requests never overlap; StrictMode
replays and manual retry share the in-flight request. Polling pauses offline and in hidden tabs,
fetches immediately on reconnection, and fetches on becoming visible when the interval has
elapsed. The browser may answer a poll from its HTTP cache within the backend's `max-age`; that
response carries the same `checkedAt` and is a success. The backend's shared cache limits calls
to SR (see [Shared VMA cache](#shared-vma-cache)).

`selectVmaBanner()` returns every displayable active message once per CAP ID, ordered by
`compareVmaMessages()`: latest CAP `sentAt` first (the update time for an Update), equal
timestamps by ascending CAP ID. That comparator is the single place to change the display order,
for example to rank local messages first; it does not filter by location today. A CAP ID repeated
with identical content is listed once; differing copies keep the first-ranked copy and mark the
data as incomplete. The title is `VmaMessage.title` (CAP `info.event`), which may be a general VMA
label, not an incident-specific news headline, so each headline in a multi-message banner is
paired with its area names and sent/updated time.

When several messages are active, the banner shows the count, the newest headline and a collapsed
disclosure list of the others. Every title button opens its own CAP message in a dialog; there is
no detail route or additional request. The dialog keeps the opened snapshot if the message leaves
the banner, and takes its validity from the banner's listed copy before the complete feed.

The presentation distinguishes these states:

- Loading without a successful result: `Kontrollerar VMA…`. Background polls and manual retry
  with retained data do not change the banner; a manual retry disables its button as
  `Kontrollerar…`.
- Successful result with no active or uncertain data: no visible notice and no all-clear claim.
- No successful result: `VMA-information inte tillgänglig.` (plus `Ingen internetanslutning.`
  offline), with `Försök igen` while online.
- Backend `stale: true`, a failed request or offline with retained data: the feed stays visible
  with `VMA-informationen kan vara inaktuell. Senast kontrollerad kl. {time}.` (date added when
  not today, plus `Ingen internetanslutning.` offline).
- Rejected/excluded records, validation issues or unknown validity: an incomplete-information
  notice, with any usable active message still shown. Exclusion counts do not distinguish
  technical tests from other excluded records, so the UI treats them conservatively.
- An open message missing from a successful feed: `Meddelandet är inte längre aktivt.` in the
  dialog.

The hook re-evaluates the entire retained feed at the next `sentAt`/expiry boundary and when a
tab becomes visible again. This reuses the mapper's expiry and same-feed Update/Cancel rules.
`lastCheckedAt` is the backend's `checkedAt`, the last successful SR check. A failed request
keeps the previous value, and local time checks cannot make data appear freshly fetched. Expiry
never means that the underlying incident is over.

The sticky notice occupies normal layout space and at most 40dvh. Complete long titles can be
scrolled inside its keyboard-focusable region. Its measured height updates top scroll padding,
while the existing mobile navigation measurement reserves bottom space. A stable alert region
announces a new message; route changes preserve it. Actual screen-reader announcements require
manual verification, not just DOM assertions.

Run `npm run test` from `frontend/` without a backend. Component/hook tests use React Testing
Library and jsdom; other unit tests retain the Node environment. Tests replace `fetch`, use the
real validator/mapper where relevant and freeze time. jsdom 27.4.0 is pinned to preserve the
project's existing Node requirements. There is no in-app test page or production mock mode.

For manual frontend checks, use temporary browser response fixtures matching the backend
envelope. Verify active/empty/error/retry/multiple/long-title/expiry cases at desktop and mobile
sizes, including short landscape screens, keyboard focus, reflow and screen-reader output.
Remove the temporary fixture setup afterward. It must not be committed or included in a build.
When the real backend is available, repeat the request/CORS/error checks with fixtures disabled
and verify an actual active warning if one exists. Report those integration results separately
from simulated frontend verification.

## Verification

From `frontend/`:

```sh
npm run test
npm run lint
npm run format:check
npx tsc -b
npm run build
```

From `backend/` with the environment active:

```sh
pytest
ruff check .
ruff format --check .
```

The same three backend commands run in `.github/workflows/backend-ci.yml` on pull requests into
`dev` or `main` and on pushes to `dev`, whenever `backend/` or the workflow file changed.

On 2026-10-05, a manual check passed the production and example feeds through the backend route
and the actual frontend validator/mapper. Production produced an empty successful result. The six
examples produced two expired warnings and one cancellation; three technical-test/exercise records
were excluded. Both checks had zero rejected records or validation issues. Source metadata correctly
identified the production and example endpoints. No production warning was available to inspect.

On 2026-10-07, the user reported successful empty-feed handling from the local frontend against
`https://kriskompassen.vercel.app`, with the banner disappearing as expected, and then confirmed
that the integration also works from the deployed frontend. These are user-reported checks;
the live frontend URL and deployment commit were not supplied. A real active warning, deployed
failure/retry behavior and actual screen-reader output were not verified by this report.

Tests use synthetic SR-shaped fixtures and deterministic times, never live emergency content.
They cover valid/empty/mixed/invalid feeds, optional fields, Swedish blocks, exclusions,
cancellations, supersession, expiry, provenance, safe links, transport failures and timeouts.
Backend tests use HTTPX MockTransport and ASGITransport without contacting SR. Cache tests inject
monotonic and wall clocks instead of sleeping, and hold a mocked SR fetch on an `asyncio.Event`
while concurrent requests run through `asyncio.gather`. CORS integration
tests load the origin list from a process environment variable and verify browser-readable
successes and gateway failures, plus allowed and rejected preflights. No dependencies
were added for the provider switch. Existing Vitest and pytest tooling is reused.

For manual checking, open `http://localhost:8000/docs` and execute GET `/api/v1/vmas`. Confirm
`data.alerts` and `data.source`, including the configured production or test API address, and
`checkedAt`/`stale`.

To check the cache, start the backend from `backend/` with Python INFO logging enabled. Uvicorn
does not log outgoing requests by default; with this command, HTTPX logs one line per SR call.

Git Bash (on macOS/Linux, activate with `source .venv/bin/activate`):

```sh
source .venv/Scripts/activate
python -c "import logging, uvicorn; logging.basicConfig(level=logging.INFO); uvicorn.run('src.app:app', port=8000)"
```

PowerShell:

```powershell
.venv\Scripts\Activate.ps1
python -c "import logging, uvicorn; logging.basicConfig(level=logging.INFO); uvicorn.run('src.app:app', port=8000)"
```

In another terminal, run this in Git Bash or another POSIX shell:

```sh
for i in 1 2 3 4; do
  curl -s -i http://localhost:8000/api/v1/vmas | grep -ioE '^cache-control: .*|"checkedAt":"[^"]*"'
  sleep 5
done
```

PowerShell alternative:

```powershell
1..4 | ForEach-Object {
  $r = Invoke-WebRequest http://localhost:8000/api/v1/vmas
  $r.Headers['Cache-Control']; ($r.Content | ConvertFrom-Json).checkedAt; Start-Sleep 5
}
```

Within one period, `max-age` decreases (for example 59, 54, 49, 44) while `checkedAt` stays the
same, showing that every response came from the single SR check. The backend terminal shows exactly
one `HTTP Request: GET https://vmaapi.sr.se/api/v3/alerts` line per period. After 60 seconds
without a request, the next request gives a new `checkedAt`, a `max-age` close to 60 again and one
new SR log line.

With Vite running, the browser console can also invoke the development module once:

```js
const { fetchVmas } = await import('/src/services/vmaService.ts')
console.log(await fetchVmas())
```

Inspect metadata, diagnostics and statuses. Static examples may have expired relative to today's
date; do not alter their dates to suggest they are live. Real production messages, when available,
still merit an end-to-end check. The banner can be verified with simulated responses without a
backend; keep those results separate from the user-reported live integration check above.
Repeat the connection checks in [Deployed setup](#deployed-setup) after deployment changes.
Offline VMA storage remains outside this implementation.
