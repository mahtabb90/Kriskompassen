# Backend and VMA integration

The FastAPI backend fetches Swedish VMA messages for the whole country. A reusable frontend
service calls the backend; presentation is not connected to this service yet. There is no
polling, retry loop, persistence or deployment configuration in this implementation.

## Official upstream API

Use this HTTPS endpoint:

```text
GET https://api.krisinformation.se/v3/vmas?format=json&allcounties=true&language=sv
```

The [official open-data page](https://www.krisinformation.se/om-krisinformation.se/oppen-data/)
identifies v3 as the current API and links to the [API reference](https://api.krisinformation.se/v3).
The `vmas` resource retrieves VMA messages; the `news` example on the open-data page retrieves
general news and is not a substitute for the VMA resource.

Verification on 2026-10-05 returned HTTP 200 and `[]` from the VMA endpoint without an API key,
Authorization header or cookies. A request with `Origin: http://localhost:5173` did not receive
an `Access-Control-Allow-Origin` header. Browsers need that permission to expose a cross-origin
response to frontend JavaScript. The backend therefore makes the upstream request and grants
CORS access to the configured frontend origins. `mode: "no-cors"` would produce an unreadable
opaque response and is not a solution. CORS behavior should be checked again if direct browser
access is reconsidered.

An empty live response confirms the container but provides no evidence of individual VMA
fields. The general news response uses lowercase field names, but it does not establish a
complete VMA schema. The current validators deliberately require only a list of JSON objects.
Validate individual fields before building a presentation model; never render upstream text
as raw HTML.

When messages are later displayed, identify Krisinformation.se as the source, as requested
on its open-data page. The [API terms](https://www.krisinformation.se/globalassets/om-krisinformation.se/oppen-data/anvandarvillkor-for-krisinformations-api.pdf)
provide no numeric request quota or availability guarantee. They ask clients to avoid
unnecessary requests and permit traffic restrictions. This service only fetches on demand;
an automatic refresh or cache policy requires a separate task.

## Local setup

Use Python 3.13, recorded in `.python-version`, with the pinned requirements. From `backend/`:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn src.app:app --reload --port 8000
```

Ensure `python3` selects Python 3.13. On Windows PowerShell, create and activate the environment
with `py -3.13 -m venv .venv` and `.venv\Scripts\Activate.ps1`; the install and server commands
are the same.

In a second terminal, run `npm run dev` from `frontend/`. Use `http://localhost:5173` or
`http://127.0.0.1:5173` for the default CORS configuration. If Vite selects a different port,
configure that exact origin before checking the frontend service.

## Configuration

Backend settings read the process environment through pydantic-settings. They do not load an
`.env` file automatically. The example files list variable names only; defaults live in code.

| Setting | Default | Meaning |
| --- | --- | --- |
| `KRISKOMPASSEN_VMA_API_URL` | Official VMA URL above | Upstream URL, including query parameters |
| `KRISKOMPASSEN_VMA_TIMEOUT_SECONDS` | `8` | Total upstream request deadline in seconds |
| `KRISKOMPASSEN_CORS_ORIGINS` | `["http://localhost:5173","http://127.0.0.1:5173"]` | JSON array of exact allowed frontend origins |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Public backend base URL used by the frontend |

Set backend variables before starting Uvicorn. Set the frontend variable before starting Vite
or building the frontend. For example, from `backend/` on macOS/Linux:

```sh
KRISKOMPASSEN_CORS_ORIGINS='["http://localhost:5174"]' uvicorn src.app:app --reload --port 8000
```

The frontend's `src/config/apiConfig.ts` adds `/api/v1/vmas` to the base URL and owns the
10,000 ms request deadline, including response-body reading. The backend's 8-second deadline
leaves time for a controlled upstream error to reach the frontend. Each request owns its
timeout resources. Neither layer sends user credentials to the upstream API.

CORS permits GET requests with the Accept header and does not enable credentials. CORS
controls browser access to responses; it is not authentication for the API.

## Code and response contracts

`src/app.py` exports `app` and `create_app()`. FastAPI lifespan creates and closes one shared
HTTPX client, supplied through dependencies in `src/api/`. Configuration and upstream errors
live in `src/core/`, fetching and JSON decoding in `src/services/`, and response validation in
`src/models/`.

| Route | Response |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}`; process health, without contacting upstream |
| `GET /api/v1/vmas` | `200` JSON object array, preserving upstream fields |
| `GET /docs` | Interactive OpenAPI documentation |
| `GET /openapi.json` | Machine-readable API contract |

The VMA route has no public filter parameters. A successful empty response is `200 []`.
Upstream failures never become an empty list and do not expose upstream response bodies.
VMA success and error responses include `Cache-Control: no-store`.

```json
{"error":{"code":"upstream_timeout","message":"..."}}
```

| Failure | HTTP status | `error.code` |
| --- | --- | --- |
| Connection or other network failure | 502 | `upstream_network_error` |
| Non-successful upstream HTTP response | 502 | `upstream_http_error` |
| Invalid JSON or unexpected response structure | 502 | `upstream_invalid_response` |
| Request deadline exceeded | 504 | `upstream_timeout` |

Error messages are Swedish. The Pydantic VMA model requires a list of objects with string keys
and JSON values; it does not guarantee specific message fields, severity or lifecycle state.

The frontend exports `fetchVmaResponse(): Promise<unknown>` for fetching and JSON decoding,
`validateVmaResponse()` for pure structure validation, and `fetchVmas(): Promise<VmaRecord[]>`
for both steps. `VmaRecord` is `Record<string, unknown>`, so callers must narrow each field
before use. A `VmaRequestError` distinguishes `network`, `http`, `timeout` and `invalid_json`;
HTTP failures retain their status. Unexpected containers throw `VmaResponseValidationError`.
The service does not interpret the backend's error body or update any UI state.

## Verification

Run the frontend commands from `frontend/`:

```sh
npm run lint
npm run format:check
npx tsc -b
npm run build
```

Run the backend commands from `backend/` with the virtual environment active:

```sh
ruff check .
ruff format --check .
```

Pytest is installed and configured for `tests/`, which currently contains only a placeholder.
`pytest` therefore has no test cases to execute. The approved initial integration uses manual
scenario verification; report actual outcomes in the task report or PR. Future backend logic
must have automated tests under the repository's testing rules.

### Live and browser checks

With both development servers running, inspect `/health`, `/docs` and `/api/v1/vmas` at
`http://localhost:8000`. An empty live VMA list is a valid result and does not establish whether
non-empty messages have the expected fields.

From the browser developer console on the frontend's local origin, call the service without
adding a temporary UI component:

```js
const vma = await import("/src/services/vmaService.ts")
await vma.fetchVmas()
```

Inspect the Network panel for the backend URL, successful CORS access and `Cache-Control:
no-store`. Stop the backend and call again to inspect a network error. Restart it before
continuing. Also check a browser origin not listed in `KRISKOMPASSEN_CORS_ORIGINS`: its request
must not be exposed to JavaScript by a matching CORS allow-origin header.

### Controlled response scenarios

Use a temporary local HTTP stub outside the repository so verification does not depend on
active public alerts. Bind the stub to localhost on a separate port, for example 8765. Give
each scenario a path and return the responses below. Set `KRISKOMPASSEN_VMA_API_URL` to the
stub URL before restarting Uvicorn, then request `/api/v1/vmas`. Do not alter the production
default URL for testing.

| Stub behavior | Expected backend result |
| --- | --- |
| HTTP 200, `[]` | HTTP 200, `[]` |
| HTTP 200, `[{"id":"example","headline":"Testmeddelande"}]` | HTTP 200, unchanged object array |
| HTTP 200, malformed JSON | HTTP 502, `upstream_invalid_response` |
| HTTP 200, `{}`, `[null]`, `[[1]]` or `[1]` | HTTP 502, `upstream_invalid_response` |
| HTTP 503 with any body | HTTP 502, `upstream_http_error` |
| Refused connection or abruptly closed connection | HTTP 502, `upstream_network_error` |
| Response headers or body delayed beyond the configured deadline | HTTP 504, `upstream_timeout` |

For the frontend transport checks, point `VITE_API_BASE_URL` directly at the local stub and
restart Vite. The stub must serve `/api/v1/vmas` and allow the frontend origin via CORS. Check
the valid/empty arrays, malformed JSON (`invalid_json`), invalid structures
(`VmaResponseValidationError`), HTTP 503 (`http`, status 503), refused connections (`network`)
and a body delayed over 10 seconds (`timeout`). Verify in the Network panel that the timeout
aborts the pending request. Invoke two requests together to ensure they have independent
deadlines; after each completed request, confirm no later timeout abort occurs.

Restore the normal environment and restart both servers after these checks. No test data
should be persisted in IndexedDB or added to the UI.

## Future hosting

The planned Vercel setup uses a separate project rooted at `backend/`. Its
[FastAPI support](https://vercel.com/docs/frameworks/backend/fastapi) recognizes an `app`
instance in `src/app.py`; the [Python runtime](https://vercel.com/docs/functions/runtimes/python)
supports the selected Python 3.13 version. No hosting resources or configuration are created
here. At deployment time, set the frontend's public `VITE_API_BASE_URL` and the backend's exact
production frontend origin in `KRISKOMPASSEN_CORS_ORIGINS`, then verify the deployed request
path and CORS behavior.
