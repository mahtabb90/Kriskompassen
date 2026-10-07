# Vercel integration handoff

Use this guide when account access becomes available. It prepares the existing separate frontend
and backend projects for integration; it does not record a successful deployment. Work on
`feature/vma-banner` until the team's normal PR process merges it. Git operations remain manual.

## Information to bring back

Fill in this template from the projects and the specific deployments being tested. URLs and the
configuration values below are public application settings. Do not paste account passwords,
tokens, cookies, protection bypass secrets or entire environment files.

```text
Backend project dashboard link:
Backend base URL to call (https://..., without /api/v1/vmas):
Backend deployment environment (Production / Preview / custom):
Backend deployment URL, Git branch and commit:
Backend root directory / framework preset / Python version:
Backend protection on that exact URL (public / Vercel login / other):

Frontend project dashboard link (if deployed):
Frontend URL(s) we will open in the browser:
Frontend deployment environment, Git branch and commit (or local):
Frontend root directory / framework preset:

VITE_API_BASE_URL: value and environment/branch scope:
KRISKOMPASSEN_CORS_ORIGINS: JSON value and environment scope:
KRISKOMPASSEN_VMA_API_URL: unset/default, or configured public endpoint:
KRISKOMPASSEN_VMA_TIMEOUT_SECONDS: unset/default, or configured value:

GET /health: HTTP status and JSON (or login/HTML):
GET /api/v1/vmas: HTTP status, content-type and any error.code:
If a deployment failed: relevant build/runtime error excerpt, with secrets removed:
Who can change settings/redeploy after temporary access ends:
```

The minimum needed to start is the backend base URL, frontend origin(s), deployment environment
for each project, deployed branch/commit and protection status. Collect the remaining settings
while access is available so another account session is not needed just to inspect them.

## Identify Production and Preview explicitly

Read the environment label on the actual deployment and the scope of each environment variable.
Also record the project's configured production branch. Do not infer these from a URL ending in
`.vercel.app`, the word `dev` in a Git branch, or a successful local production build.

Vercel documents that a new project's **first deployment is Production even from another branch**.
Later Git deployments normally use Production for the configured production branch and Preview
for other branches. Preview variables can have branch-specific overrides. Verify the selected
deployment before applying settings. [Vercel environments](https://vercel.com/docs/deployments/environments)

Both Vercel Preview and Production normally run `npm run build`. Vite's production build mode is
therefore not evidence of the Vercel environment. `VITE_*` values are embedded at build time.
[Vite environment variables and modes](https://vite.dev/guide/env-and-mode)

## Project settings for this repository

| Setting | Backend project | Frontend project |
| --- | --- | --- |
| Root Directory | `backend` | `frontend` |
| Framework Preset | FastAPI | Vite |
| Entrypoint | Existing `src/app.py`, exported `app` (`src.app:app`) | Existing `index.html` |
| Runtime | Python 3.13 from `.python-version` | A supported Node version meeting the repo's Vite requirement |
| Dependencies | Existing pinned `requirements.txt`; development requirements are for checks | `npm ci` |
| Build Command | Use the framework default; no custom application build is needed | `npm run build` |
| Output Directory | Use the framework default; not `dist` | `dist` |

Vercel supports the existing FastAPI entrypoint and lifespan. There is no need to move it into a
new `api/` directory or run a persistent Uvicorn process as a build command.
[FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
The Python runtime supports the existing `.python-version` and `requirements.txt` setup.
[Python runtime](https://vercel.com/docs/functions/runtimes/python)

`frontend/vercel.json` supplies the SPA fallback to `index.html`, so fresh requests to `/crisis`
and `/crisis/:id` can reach React Router. It is scoped to the frontend project; it is not a
backend proxy. The routing still needs verification on Vercel, including static assets and
`/sw.js`. [Vite SPA routing on Vercel](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas)

## Connection settings

Configure each value on the correct **project and environment**. If testing this branch as a
Preview, inspect any override for `feature/vma-banner` as well.

| Variable | Project | Value to use |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Frontend | The backend's reachable HTTPS base URL, without `/api/v1/vmas` |
| `KRISKOMPASSEN_CORS_ORIGINS` | Backend | JSON array of the exact frontend origins being used |
| `KRISKOMPASSEN_VMA_API_URL` | Backend | Leave unset for `https://vmaapi.sr.se/api/v3/alerts`; remove an old news or static-example override |
| `KRISKOMPASSEN_VMA_TIMEOUT_SECONDS` | Backend | Leave unset for the current 8-second deadline |

For example, replace these reserved example domains with the actual URLs before saving:

```text
VITE_API_BASE_URL = https://backend.example
KRISKOMPASSEN_CORS_ORIGINS = ["https://frontend.example","http://localhost:5173","http://127.0.0.1:5173"]
```

Keep localhost entries only in the backend environment intended for local integration testing.
An origin consists of scheme, host and optional port, with no route or query. The browser's
actual origin must match: `www`, a different preview hostname or a different port is a different
origin. Wildcards such as `https://*.vercel.app` are rejected by this backend. If a stable branch
URL is available, use that exact frontend URL consistently during testing.

The frontend appends `/api/v1/vmas` and permits 10 seconds for the whole request. If its variable
is missing, it falls back to `http://localhost:8000`, including in a deployed build. The browser's
Network panel must therefore show the intended HTTPS backend, not localhost or a doubled API path.

After changing environment variables, create a new deployment of the affected project; existing
deployments keep their previous values. Rebuild the frontend when its backend URL changes.
[Vercel environment variables](https://vercel.com/docs/environment-variables)

## Deployment protection and browser access

The frontend intentionally sends `credentials: "omit"` and no authorization header. The selected
backend URL must serve this public feed to that kind of request. Opening it while logged into
Vercel does not prove the app can fetch it. Deployment Protection can restrict generated URLs
even when a production domain is publicly reachable; record the exact URL and protection scope.
[Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)

If the backend redirects to a login or returns 401/403, resolve the access arrangement with the
project owner before treating it as a CORS bug. Do not put bypass secrets in `VITE_*` or browser
code. CORS is a browser read policy, not authentication; `curl` can receive a response even when
a browser origin is not allowed.

## Verification during the access window

1. Confirm both deployments contain the intended code and record their environment labels.
2. Apply the connection settings to those environments and redeploy the affected projects.
3. Check the backend directly, then with the real frontend origin, using the commands below.
4. Test locally against that deployed backend if the frontend project is not ready yet.
5. Test the deployed frontend in a fresh browser session. Inspect the VMA request URL, HTTP
   status, JSON envelope and CORS header. Open and reload `/crisis` and an existing detail URL
   directly; verify assets and the service worker return their own files rather than HTML.
6. Save the working URLs, commit IDs, environment scopes and results before access ends. Verify
   who can redeploy or change CORS later. No API key is part of this integration.

Run these zsh/bash commands with real public URLs. They send no login credentials and deliberately
do not follow redirects, so a protection/login redirect remains visible:

```sh
VMA_BACKEND_URL='https://backend.example'
VMA_FRONTEND_ORIGIN='https://frontend.example'

curl --silent --show-error --max-time 15 -i "$VMA_BACKEND_URL/health"
curl --silent --show-error --max-time 15 -i \
  -H 'Accept: application/json' \
  -H "Origin: $VMA_FRONTEND_ORIGIN" \
  "$VMA_BACKEND_URL/api/v1/vmas"
```

Expected: `/health` returns `200 {"status":"ok"}`. The VMA request returns `200` JSON containing
`timestamp`, `alerts` and `source`; `source.apiUrl` names the production SR endpoint. It includes
`Cache-Control: no-store` and `Access-Control-Allow-Origin` matching the origin supplied above.
A health check does not test SR connectivity, response mapping or browser access.

For an explicit preflight diagnostic (the current simple GET does not normally need preflight):

```sh
curl --silent --show-error --max-time 15 -i -X OPTIONS \
  -H "Origin: $VMA_FRONTEND_ORIGIN" \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: accept' \
  "$VMA_BACKEND_URL/api/v1/vmas"
```

Expect `200`, the matching allowed origin and GET in `Access-Control-Allow-Methods`. Backend
tests cover exact allowed origins, successful empty responses, readable 502/504 errors and
rejected preflights. They cannot verify Vercel's gateway or the account's settings.

To run only the local frontend against the deployed backend, stop any existing frontend dev
server and run this from `frontend/`, substituting the actual backend URL:

```sh
VITE_API_BASE_URL='https://backend.example' npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. That exact origin must be in the target backend's CORS list. This
command uses a process variable and does not require reading or editing a local `.env` file.
It does not change the settings of an already deployed frontend.

## Interpret results without guessing

| Observation | Next check |
| --- | --- |
| `/health` returns 404 or an unrelated page | Backend Root Directory, framework, entrypoint, URL and deployed commit |
| 401/403 or redirect/login HTML | Protection on the exact backend URL; record it before changing CORS |
| `/health` succeeds but VMA returns 502/504 | JSON `error.code`, runtime logs, configured SR URL and upstream deadline |
| `curl` succeeds but the browser fails | Exact browser origin, CORS response header, HTTPS, protection and the built frontend URL |
| Browser calls localhost or an old backend | Frontend variable environment/branch override; rebuild and reload the current deployment |
| VMA response is HTML | Wrong host/path, frontend SPA fallback or a login redirect; not a valid empty feed |
| Fresh `/crisis` URL returns 404 | Frontend Root Directory and whether this commit's `vercel.json` was deployed |
| Valid `200` with `alerts: []` and the banner disappears | Successful empty feed; active-warning rendering is still not verified live |
| A warning is returned but absent from the banner | Check frontend validation diagnostics, Swedish info blocks and active/expiry status |

A request failure must show `VMA-status kunde inte kontrolleras.`; it must not become an all-clear
message. An empty live feed is a useful integration result, but does not prove that a live active
warning renders. Synthetic active-warning coverage remains separate. Do not switch a deployed
feed to SR's static examples to manufacture an active warning.

Remaining release constraints are documented in [DEVELOPMENT.md](DEVELOPMENT.md): SR's current
VMA-specific usage terms still need clarification before public release. Recurring updates and
persistent/offline VMA storage are separate work.
