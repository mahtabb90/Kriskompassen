# Backend and VMA integration

The FastAPI backend fetches VMA from Sveriges Radio's dedicated v3 API. The frontend service
validates public Swedish CAP records and maps them to a shared presentation model. Presentation,
polling, persistent storage and deployment are separate work. The UI still uses mock crisis data.

## Separate information sources

| Information | Provider | Integration status |
| --- | --- | --- |
| VMA warnings, updates and cancellations | Sveriges Radio VMA API v3 | Implemented through the backend and frontend service |
| General crisis news | Krisinformation.se news API v3 | Chosen source for future work; no news fetching service or route is implemented |

Do not feed news records into the VMA validator or silently fall back to news if VMA fetching fails.
The former assumption that Krisinformation VMA records have the news format is no longer used.
The [Krisinformation open-data page](https://www.krisinformation.se/om-krisinformation.se/oppen-data/)
documents general news. Its [publication policy](https://www.krisinformation.se/om-krisinformation/publiceringsdokument-for-krisinformation.se/)
says its own VMA information is updated through an API from Sveriges Radio.

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

The implementation performs on-demand fetching only, stores no VMA, preserves source message text
and supplies attribution for the UI. These choices do not themselves prove legal permission.
Do not add automatic refresh intervals, long-term fixtures containing real warnings, or logo usage
on the assumption that public HTTP access grants unrestricted reuse.

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
| `KRISKOMPASSEN_CORS_ORIGINS` | `["http://localhost:5173","http://127.0.0.1:5173"]` | Exact allowed browser origins |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Public backend base URL |

The frontend's `src/config/apiConfig.ts` appends `/api/v1/vmas` and sets a 10,000 ms deadline.
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

## Backend contract

`src/app.py` owns the application factory and shared lifespan-managed HTTPX client. Upstream I/O
and JSON decoding remain in `src/services/`; Pydantic envelope validation remains in `src/models/`.
The router adds attribution from backend configuration, ignoring any upstream `source` field.

| Route | Response |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}`, without contacting SR |
| `GET /api/v1/vmas` | `200 {"timestamp":"...","alerts":[],"source":{...}}` |
| `GET /docs` | Interactive backend API documentation |
| `GET /openapi.json` | Backend API schema |

The Pydantic model requires a timezone-bearing feed timestamp and a strict `list[JsonValue]`
alerts container. It preserves malformed individual entries for frontend validation so valid
peers are not lost. Extra upstream envelope fields are ignored. This is an intentional contract
change from the previous top-level array; no existing UI consumes that old service contract.

All VMA responses use `Cache-Control: no-store`. Failures never become successful empty feeds:

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

## Frontend validation and mapping

| Function | Responsibility |
| --- | --- |
| `fetchVmaResponse()` | Fetch and decode JSON without structural interpretation |
| `validateVmaResponse()` | Validate envelope, attribution and consumed CAP fields; report partial failures |
| `mapVmaMessage()` | Map one validated record at an explicit evaluation time |
| `mapVmaMessages()` | Also apply Update/Cancel references within the current feed |
| `reevaluateVmaMessages()` | Reapply the same lifecycle rules to the complete mapped feed at a later time, without I/O |
| `fetchVmas()` | Compose the steps, returning `VmaResult` with an evaluation timestamp |

`VmaResult` always contains `source`, `feedUpdatedAt`, `evaluatedAt`, `messages`, `issues`,
`rejectedCount` and `excludedCount`. An empty successful upstream feed has zero records and counts.
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

The banner shows **Källa: Sveriges Radio**, linked through `source.url`. A future detail section
can also show **API: Sveriges Radios VMA-API, v3**, with links from the model.
`details[].senderName` identifies the issuer; `details[].web`
may be a general explanation of VMA and must not be labelled as the original article unless
that is actually what the link contains. API details can live in the source/detail section so
the warning itself stays concise.

### Frontend banner behavior and verification without a backend

`AppLayout` owns `useVmaBanner()` so route changes share one request and presentation state.
The hook calls `fetchVmas()` on mount; React StrictMode effect replays share an in-flight request.
Manual retry is guarded against concurrent calls. No route change, visibility change or timer
triggers another network request. Reload the app to fetch newly published warnings after a
successful check; recurring updates are a separate feature.

`selectVmaBanner()` chooses the active message with the latest CAP `sentAt`, breaking equal
timestamps by ascending CAP ID. It does not filter by location. The title is `VmaMessage.title`
(CAP `info.event`), which may be a general VMA label, not an incident-specific news headline.
When several messages are active the banner indicates that additional VMA exist; it provides
neither a list nor a switcher or detail route.

The presentation distinguishes these states:

- Initial loading: `Kontrollerar VMA…`.
- Successful result with no active or uncertain data: no visible notice and no all-clear claim.
- Failed request: `VMA-status kunde inte kontrolleras.` with `Försök igen`.
- Rejected/excluded records, validation issues or unknown validity: an incomplete-information
  notice, with any usable active message still shown. Exclusion counts do not distinguish
  technical tests from other excluded records, so the UI treats them conservatively.
- Retrying/failure after a successful check: retain that feed, display the status and last
  successful check time, and continue evaluating its validity. No VMA is persisted offline.

The hook re-evaluates the entire retained feed at the next `sentAt`/expiry boundary and when a
tab becomes visible again. This reuses the mapper's expiry and same-feed Update/Cancel rules.
`lastCheckedAt` remains the time of the successful request; local time checks cannot make data
appear freshly fetched. Expiry never means that the underlying incident is over.

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

On 2026-10-05, a manual check passed the production and example feeds through the backend route
and the actual frontend validator/mapper. Production produced an empty successful result. The six
examples produced two expired warnings and one cancellation; three technical-test/exercise records
were excluded. Both checks had zero rejected records or validation issues. Source metadata correctly
identified the production and example endpoints. No production warning was available to inspect.

Tests use synthetic SR-shaped fixtures and deterministic times, never live emergency content.
They cover valid/empty/mixed/invalid feeds, optional fields, Swedish blocks, exclusions,
cancellations, supersession, expiry, provenance, safe links, transport failures and timeouts.
Backend tests use HTTPX MockTransport and ASGITransport without contacting SR. No dependencies
were added for the provider switch. Existing Vitest and pytest tooling is reused.

For manual checking, open `http://localhost:8000/docs` and execute GET `/api/v1/vmas`. Confirm
`alerts` and `source`, including the configured production or test API address. With Vite running,
the browser console can also invoke the development module once:

```js
const { fetchVmas } = await import('/src/services/vmaService.ts')
console.log(await fetchVmas())
```

Inspect metadata, diagnostics and statuses. Static examples may have expired relative to today's
date; do not alter their dates to suggest they are live. Real production messages, when available,
still merit an end-to-end check. The banner can be verified with simulated responses without a
backend; its deployed backend integration remains a separate verification step. Vercel deployment,
polling and offline VMA storage remain outside this implementation.
