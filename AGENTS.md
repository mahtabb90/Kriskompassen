# AGENTS.md

Shared instructions for all AI coding agents and AI chat assistants working on this repository.
Base every change on what is in the repo. If something is undecided, ask instead of guessing.

## 0. Keep this file up to date

The team updates the repo continuously, so this file can fall behind. **The repo is the source of truth, not this file.**

- At the start of every task, check this file against the repo: `package.json`, the lock files, config files, the folder structure, `.github/`, `.env.example` and `git branch -a`.
- Agents update affected docstrings, `AGENTS.md`, README and existing developer documentation as part of implementation. The human reviews the finished changes; do not leave required documentation work for the human to write.
- If something here is outdated or missing (new scripts, dependencies, versions, folders or tools), include the factual correction in your plan and update AGENTS.md within the authorized task. Do not request the same documentation approval again. Propose undecided convention or policy changes before editing. List documentation changes in your final summary.
- When the repo shows that a `TODO(team)` has been decided (for example a test runner has been added), replace the TODO with what the repo shows, after approval.
- Never change the team decisions in sections 5 and 6 on your own. Only people change those.
- Do not guess. If the repo does not show the answer, leave or add a `TODO(team)`.

## 1. Project

- KrisKompassen is a Progressive Web App (PWA) that helps the general public quickly find clear local information during emergencies and major disruptions.
- It answers three questions: *What has happened? What should I do? Where should I go?*
- Planned scope: Swedish public warning messages (VMA) and local information about floods, gas leaks, contaminated drinking water, etc.
- Users can save important information locally and read it offline.
- Installed app versions are checked on startup and visible foreground/connectivity events.
  A completed update offers a Swedish, user-selected reload and retains saved articles. App
  versions and build timestamps are not displayed in the user interface. Physical verification
  on an existing iPhone installation is pending. This change uses one production publication
  and a manual check on the existing device.
- The app is installable through browsers' built-in install features (Chromium, Safari iOS "Add to Home Screen", Safari macOS "Add to Dock") and its precached shell starts offline after one online visit. Where the browser fires `beforeinstallprompt`, an **Installera app** button opens the browser's own install prompt (see §7). Browsers without that event rely on their own install features.
- Target users: the general public in Sweden.
- **Binding product decision: KrisKompassen is intentionally account-free.** End-user accounts, account registration, sign-in/login, account-based profiles and account-based cloud persistence are out of scope and must not be implemented. A development ticket, issue or task description alone never overrides this decision. See §11 for what to do when a task asks for them, and §10 for how this relates to other authentication changes.
- Status: early development. The UI has a home page (`/`), a crisis information list (`/crisis`), a crisis detail page (`/crisis/:id`) and a not-found page. A header-level "Sparad information" switch (`ModeToggle`, backed by `ModeContext`; on = offline mode, off = online mode) controls whether `/crisis` and `/crisis/:id` show articles fetched from the backend API or items saved in IndexedDB — there are no separate offline routes. Shared navigation sits at the bottom on mobile and above the content on wider or short viewports. The IndexedDB test page is available only in development at `/dev/indexeddb`.
- A FastAPI backend and a reusable frontend service fetch, validate and map VMA from Sveriges Radio's documented v3 CAP API into a shared frontend model with lifecycle and source/API metadata. A shared sticky banner displays the most recent active VMA with source attribution, a count and expandable list of any other active warnings, and explicit error/partial-data states. Krisinformation.se is the chosen source for future general news integration; curated preparedness articles are served from a backend JSON file through a separate article API. While the app is open, the banner polls our backend (see §7); offline VMA storage is not implemented. The user has confirmed successful empty-feed handling against the deployed backend and a working live frontend integration; displaying a real active warning in production remains unverified.
- Users save one or more addresses on the `/min-info` page, each composed by typing it or by fetching the device's position through the browser's Geolocation API (permission requested only on that button click). The backend reverse-geocodes fetched coordinates through OpenStreetMap Nominatim and returns a normalized `{found, address, municipality, county, lat, lon, source}` shape; `found: false` is a resolvable-but-unknown result, not an upstream error. Each saved address carries a label (`hem`, `arbete`, or `annan` with free text) and is persisted in IndexedDB (`savedAddresses` table; see §9's documented exception for storing this personal data locally). Exactly one saved address is active at a time — the one other features (e.g. future shelter search) use as the starting point; saving the first address activates it automatically, and `AddressIndicator` shows the active one as a discreet link in the header once one exists. **A manually typed address is never forward-geocoded or validated** — composing it only resolves the typed/fetched text, with coordinates present solely for a geolocated result; forward-geocoding/validating manual text is separate future work. **Exception:** typed/pasted text that is shaped like a latitude/longitude pair (decimal degrees, separated by a comma and/or whitespace, e.g. copied from another map service) is range-validated client-side (`frontend/src/utils/coordinates.ts`) and, if within range, reverse-geocoded through the same backend endpoint as a device position, producing `source: "coordinates"` — approximate and re-lookupable like `"geolocated"`, but with no `accuracy`. Out-of-range text shows an inline error before any network call; text not shaped like coordinates falls through to the normal manual path unchanged.
- The banner title opens the full selected warning in an accessible native dialog with complete
  Swedish text, instructions, source, CAP issue/update time and available affected areas. Closing
  returns to the previous view. Local tests/browser checks do not establish live iPhone or spoken
  VoiceOver verification.

## 2. Tech stack

Frontend versions are taken from `frontend/package-lock.json`.

| Area | Technology | Version |
| --- | --- | --- |
| UI | React / React DOM | 19.3.0 |
| Routing | React Router (`react-router-dom`) | 7.18.4 |
| Language | TypeScript | 6.0.3 |
| Build/dev server | Vite (+ `@vitejs/plugin-react` 6.1.1) | 8.3.0 |
| Styling | Tailwind CSS (via `@tailwindcss/vite`) | 4.3.3 |
| Local storage | Dexie (IndexedDB) | 4.4.6 |
| Maps | MapLibre GL JS (no React wrapper), OpenFreeMap tiles (free, key-less) | 6.16.0 |
| PWA | vite-plugin-pwa | 1.3.0 |
| Linting | ESLint + typescript-eslint 8.70.0 | 10.10.0 |
| Formatting | Prettier (+ `eslint-config-prettier` 10.1.8) | 3.9.9 |
| Unit tests | Vitest | 4.1.11 |
| Component tests | React Testing Library / DOM Testing Library | 16.3.3 / 10.4.2 |
| DOM test environment | jsdom | 27.4.0 |
| E2E tests | Playwright (Node/TypeScript) | planned, not installed |
| Runtime | Node.js (required by Vite) | ^20.19.0 or >=22.12.0 |

Backend versions are pinned in `backend/requirements.txt` and `backend/requirements-dev.txt`:

| Area | Technology | Version |
| --- | --- | --- |
| Language | Python | 3.13 (`backend/.python-version`) |
| Framework | FastAPI | 0.142.2 |
| Validation | Pydantic | 2.13.5 |
| Configuration | pydantic-settings | 2.15.0 |
| HTTP client | HTTPX | 0.28.1 |
| ASGI server | Uvicorn | 0.54.0 |
| Dependencies | `pip` + `requirements.txt` / `requirements-dev.txt` | pinned versions |
| Tests | pytest | 9.1.1 |
| Lint/format | Ruff | 0.16.10 |

- Backend setup, API contracts, configuration, Vercel connection settings and manual verification are documented in `backend/DEVELOPMENT.md`.

## 3. Repository structure

```
.
├── AGENTS.md            # this file
├── README.md            # outward-facing project overview (English)
├── DESIGN_SYSTEM.md     # visual tokens, component patterns and accessibility rules
├── documentation-baseline.md  # JSDoc and code comment rules for frontend/TypeScript code
├── .github/
│   └── workflows/
│       ├── backend-ci.yml   # backend Ruff and pytest when backend/ changes; PRs into dev/main and pushes to dev
│       └── frontend-ci.yml  # frontend lint, format check, tests and build when frontend/ changes; same triggers
├── backend/             # FastAPI articles, VMA and geocoding API
│   ├── DEVELOPMENT.md  # backend and VMA integration development guide
│   ├── .python-version # Python 3.13
│   ├── .env.example    # backend variable names only
│   ├── requirements.txt / requirements-dev.txt  # pinned dependencies
│   ├── pyproject.toml  # Ruff and pytest configuration
│   ├── scripts/        # fetch_shelters.py: one-off manual MCF sync, not run by the app or CI
│   ├── src/
│   │   ├── app.py      # application factory, lifespan and exported app
│   │   ├── api/        # routers and dependencies
│   │   ├── core/       # settings, upstream and article/shelter-data errors
│   │   ├── data/       # curated articles (crisis.json) and the shelter snapshot (shelters.json, shelters.meta.json), published with the backend
│   │   ├── models/     # Pydantic response models
│   │   └── services/   # article and shelter-snapshot file reading, upstream fetching and the shared VMA/geocode caches
│   └── tests/          # pytest API, CORS and upstream response tests
└── frontend/            # Vite + React + TypeScript PWA
    ├── .env.example    # frontend variable names only
    ├── .nvmrc          # single source of truth for the Node.js version (24 = latest 24.x LTS), read by CI and nvm
    ├── public/          # static assets and PWA icons
    ├── e2e/             # Playwright tests (planned, not created)
    ├── index.html       # HTML entry (lang="sv")
    ├── vite.config.ts   # React, Tailwind and PWA manifest config
    ├── vercel.json      # frontend-only SPA fallback for direct React Router URLs and Cache-Control headers
    ├── vitest.config.ts # Node default; component tests opt into jsdom; no application plugins or .env loading
    └── src/
        ├── components/  # shared layout/header/navigation (desktop `BottomNavigation`, mobile `MobileMenu`, shared `navigationItems`), VMA banner/dialog, AddressSection, AddressIndicator, PwaUpdateNotice, InstallAppButton, crisis/offline controls, ShelterMap.tsx (nearest-shelters list's map; markers, popups, selection sync, same-coordinate clustering) and ShelterLocationMap.tsx (ShelterDetailPage's simpler single-shelter map, no popups/selection) - both plain maplibre-gl, no React wrapper, mirroring the sister project IntresseKlubben's LocationPickerMap.jsx pattern; both lazy-loaded via `React.lazy` (the only lazy-loaded components in the app) and mocked with `vi.mock` in tests, since the real map is verified manually
        ├── config/      # backend address, article/VMA/geocode endpoints, request timeout, and mapConfig.ts (OpenFreeMap style URL - free, key-less vector tiles, no quota)
        ├── context/     # ModeProvider.tsx + modeContext.ts and AddressProvider.tsx + addressContext.ts (context object, hook — split to satisfy react-refresh/only-export-components)
        ├── data/        # predefined emergency-kit recommendations (recommendedCrisisKit.ts)
        ├── db/          # Dexie database (db.ts)
        ├── hooks/       # keyed article requests (useCrisisResource), VMA state/validity, address composition (useAddress), saved-addresses list/active state (useSavedAddresses) and shared PWA update and install prompt subscriptions; adjacent tests
        ├── pages/       # HomePage, CrisisInfoPage, CrisisKitPage, MyInfoPage (/min-info), NotFoundPage, IndexedDbTest and placeholders (SettingsPage)
        ├── services/    # article transport/validation, offline storage, PWA updates and install prompts, VMA, geocoding, geolocation and address storage; adjacent unit tests (addressStorageService has none yet — see §8)
        ├── types/       # shared crisis/VMA/address/PWA types
        └── utils/       # small pure presentational and validation helpers (e.g. describeAddressLabel, parseCoordinates, shelterMapIcons.ts's inline-SVG marker elements for maplibre-gl)
```

- New frontend code goes under `frontend/src/` in the matching folder above.
- Frontend unit and component tests live next to the file they test: `Foo.test.tsx` beside `Foo.tsx`.
- New backend code goes under `backend/src/`: routers and dependency providers in `api/`, settings and application errors in `core/`, Pydantic models in `models/`, and upstream I/O in `services/`. Tests belong in `backend/tests/`.
- Several files in `components/` and `pages/` are empty placeholders (`SettingsPage.tsx`). Fill them in; do not delete them without asking.
- `App.tsx` wraps the router in `ModeProvider` and registers routes inside the shared `AppLayout`. There are no separate offline routes: `CrisisInfoPage` (`/crisis`) and `DetailedCrisisCard` (`/crisis/:id`) both read `useMode()` and switch data source — articles fetched from the backend API in online mode, `getOfflineItems()`/`getOfflineItem(id)` in offline mode — without the URL changing. `OfflineToggle` saves and removes items in IndexedDB through `offlineService` and is used in both `CrisisCard` and `DetailedCrisisCard`. If a successful lookup finds that the item shown on `/crisis/:id` is not available in the current mode (mode just switched, or the URL was opened directly), `DetailedCrisisCard` redirects to `/crisis` with an explanation passed via router location state, rather than showing an inline message. `ModeProvider` forces offline mode (with an explanation shown by `ConnectionStatus`) when the browser's `offline` event fires, and never switches back to online automatically — the user does that via `ModeToggle`. `ModeToggle` is one native `<button role="switch" aria-checked>` containing the visible label (its accessible name) and the decorative track, so clicking either toggles the mode and Space/Enter work natively. A help text below it, linked with `aria-describedby`, explains the current mode. While `navigator.onLine` is false the switch cannot be turned off: it keeps focus with `aria-disabled="true"` (not `disabled`), only the track is dimmed, and the help text explains the restriction.

- Crisis detail redirects carry `notice` and `noticeMode` in router location state. The crisis
  list derives the visible notice from the current mode, so an offline-access explanation
  disappears immediately in online mode, including reloads with retained browser history state.

## 4. Commands

Run frontend commands from `frontend/`, backend commands from `backend/` with the virtual environment active. Use only commands listed here. Commands marked *planned* do not work until the tool is set up; do not run them before then.

| Task | Frontend | Backend |
| --- | --- | --- |
| Install | `npm ci` (use the lock file) | `pip install -r requirements.txt -r requirements-dev.txt` |
| Dev server | `npm run dev` | `uvicorn src.app:app --reload --port 8000` |
| Lint | `npm run lint` | `ruff check .` |
| Format | `npm run format` (check only: `npm run format:check`) | `ruff format .` (check only: `ruff format --check .`) |
| Typecheck | `npx tsc -b` (also runs as part of `build`) | n/a |
| Test | `npm run test` (Vitest, single run) | `pytest` |
| E2E | `npm run test:e2e` *(planned, Playwright)* | n/a |
| Build | `npm run build` | n/a |
| Preview build | `npm run preview` | n/a |

CI: both workflows trigger on pull requests into `dev` or `main` and on pushes to `dev`. `.github/workflows/frontend-ci.yml` runs `npm ci`, `npm run lint`, `npm run format:check`, `npm run test` and `npm run build` on Node from `frontend/.nvmrc`. `.github/workflows/backend-ci.yml` runs the backend install, `ruff check .`, `ruff format --check .` and `pytest` on Python from `backend/.python-version`. Each workflow always starts (no `on: paths:`) and has three jobs: a change-detection job that diffs against the PR base branch or the previous push with `git diff` and logs the changed files, the check job that runs only when its folder or its own workflow file changed, and a gate job. The check job runs as a matrix on `ubuntu-latest`, `windows-latest` and `macos-latest` (`fail-fast: false`, `defaults.run.shell: bash`, 15-minute timeout, OS in the job name, e.g. `Frontend lint, tests and build (windows-latest)`). Change detection and the gate jobs stay on Ubuntu only. The gate aggregates all matrix variants, so one failing OS fails it, and a skipped matrix still counts as skipped. Do not mark the per-OS jobs as required checks. If the diff cannot be computed, the checks run anyway. The gate jobs `Frontend CI result` and `Backend CI result` are the status checks to mark as required in branch protection; they fail when change detection fails or when needed checks did not succeed. PR runs share one concurrency group per pull request and are cancelled when superseded; each push to `dev` gets its own group (`github.run_id`), so push runs are never queued behind, or cancelled by, a later push and always run to completion. CI uses no third-party actions.

Vercel uses separate projects rooted at `frontend/` (Vite) and `backend/` (FastAPI). `frontend/vercel.json` supplies the SPA fallback, not an API proxy. The backend exports the supported `src/app.py` entrypoint. The user configured Vercel to install backend dependencies from `requirements.txt`; that dashboard setting is not stored in the repo. Connection settings, local testing against the deployed backend and the scope of reported live verification are documented in `backend/DEVELOPMENT.md`. `frontend/vercel.json` sets `Cache-Control: no-cache` for `/sw.js`, `/manifest.webmanifest` and `/index.html`, and `public, max-age=31536000, immutable` for `/assets/*`. `vite preview` ignores these headers; verify them on a Vercel deployment.

Create the backend environment with Python 3.13 using `python3 -m venv .venv` and activate it with `source .venv/bin/activate`. On Windows PowerShell, use `py -3.13 -m venv .venv` and `.venv\Scripts\Activate.ps1`. See `backend/DEVELOPMENT.md` for environment configuration and manual verification commands.

## 5. Git

**Hard rules (team decision):**

- ALL git handling (add, commit, push, merge, pull requests, etc.) is done manually by a human, NEVER by an agent.
- Branches: permanent `main` and `dev`. Work branches: feature/, bugfix/, hotfix/, docs/ in kebab-case. Examples: feature/initial-scaffold, feature/crisis-search, bugfix/address-validation, hotfix/critical-crash, docs/update-readme.
- PR flow: work branch -> pull request into dev -> approved by another developer. dev is merged into main only after the team has agreed in a meeting or in the chat. Never target main directly.

Additional rules for agents:

- Agents may run read-only git commands only: `git status`, `git log`, `git diff`, `git branch -a`.
- Agents never add their own temporary files to the repo: screenshots or other images, measurement or verification scripts, logs or other scratch files. Keep them in the agent's scratchpad or another directory outside the working tree.
- Agents never install temporary tools or packages in the project (`package.json`, `package-lock.json`, `requirements*.txt`) for their own measurements or verification. Install them outside the repo.
- Screenshots for a PR are attached by the human directly in GitHub, not committed to the repo.
- At the end of a task, the agent suggests a commit message and, when the task is complete, a PR title and description in the formats below. The human decides whether to use them and posts them manually.

**Commit message format** (Conventional Commits with a detailed body):

```
<type>(<scope>): <summary in imperative mood, max 72 characters>

What: what changed.
Why: the reason for the change.
How tested: commands run and their result.

Refs: #<issue number>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`. Scope is the area, e.g. `frontend`, `backend`, `db`, `pwa`.

**PR title and description:** title in the same format as a commit summary. When a task completes a piece of work, the agent returns a suggested PR description in the format below. The human copies, edits and posts it when creating the PR. Agents never tick a checkbox and never fill in test results they did not produce; those rows are left for the human.

```markdown
## Summary
<!-- What does this PR do, in 2–4 sentences? -->
Closes #

## Why
<!-- The problem or need behind the change. -->

## Changes
- **Frontend:**
- **Backend:**
- **Docs / config:**

## How to test manually
1.
2.

## Test results
<!-- Paste the summary line from each command you ran. Write "not run" and the reason if skipped. -->
| Check               | Command             | Result |
| ------------------- | ------------------- | ------ |
| Frontend lint       | `npm run lint`      |        |
| Frontend format     | `npm run format:check` |     |
| Frontend typecheck  | `npx tsc -b`        |        |
| Frontend unit tests | `npm run test`      |        |
| E2E tests           | `npm run test:e2e`  |        |
| Frontend build      | `npm run build`     |        |
| Backend lint        | `ruff check .`      |        |
| Backend tests       | `pytest`            |        |

## Screenshots
<!-- For UI changes. Delete otherwise. -->

## AI usage
<!-- Which tool was used, what it produced, and what you verified by hand. -->

## Checklist
Ticked by the human before the PR is posted, never by an agent.
- [ ] Branch follows the naming convention and the PR targets `dev`
- [ ] I have read every changed line and can explain it
- [ ] Lint, format check, typecheck and build pass
- [ ] Unit and component tests pass, and new logic has tests
- [ ] E2E tests pass, or the change does not affect a user flow
- [ ] The feature works offline, or offline does not apply
- [ ] No secrets, `.env` contents or personal data in the code or in this PR
- [ ] No new dependencies, or they are listed and motivated under Changes
- [ ] Dexie schema unchanged, or version bumped with a migration
- [ ] README, docstrings and `AGENTS.md` updated where needed
- [ ] All git commands for this PR were run manually by me
```

## 6. Language

- Code comments and docstrings in English. GitHub, commit messages and PRs in English.
- Documentation (README, this file) is in English.
- User-facing UI text is Swedish only (`<html lang="sv">`). No i18n. Do not add translation libraries or English UI strings.

## 7. Code standards

Frontend conventions visible in the existing code:

- Crisis preparedness articles use `GET /api/v1/crisis` (full array) and
  `GET /api/v1/crisis/{id}` (single article). The backend reads and validates the complete
  `backend/src/data/crisis.json` file on demand in FastAPI's worker thread pool. Article IDs
  and order stay stable. Text uses KrisKompassen's own Swedish wording with source attribution;
  each article's source checks and review date are recorded in `backend/DEVELOPMENT.md`.
  The summaries distinguish advance preparations from conditional actions during a disruption.
  `fetchedAt` identifies the content edition's compilation/review time and changes only when
  that content is compiled or verified again, never when an API request is served. These
  routes use `Cache-Control: no-store`; missing articles return `404 crisis_not_found`,
  while file/JSON/schema/duplicate-ID failures return `500 crisis_data_unavailable` in the
  `{error: {code, message}}` envelope. A broken source never becomes an empty list or 404.
- `CrisisArticle` contains public content only; `CrisisItem` retains the existing IndexedDB
  shape with local `savedOffline` and optional `savedAt`. Frontend article services validate
  complete responses, reject duplicate/mismatched IDs and unsafe source links, discard remote
  saving metadata and apply a 10-second total deadline including the body. Only the documented
  detail 404 is a missing article; generic deployment/router 404s remain fetch failures.
- `useCrisisResource` keys article state by mode/resource and attempt, cancels obsolete requests
  and ignores late results even if cancellation is not supported. Each online entry loads
  afresh; offline reads only IndexedDB. Retries are explicit. No article response updates an
  offline copy automatically. `CrisisLoadFeedback` presents Swedish loading/errors and a retry
  control that stays mounted and uses `aria-disabled` while retrying. If that control still
  owns focus when feedback disappears, focus returns to the stable page heading.
  `DetailedCrisisCard` keeps one heading node across asynchronous states and also checks links
  from older saved copies. Missing/invalid saved timestamps use the existing Swedish fallback.

- TypeScript with strict unused checks (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`).
- Use `import type` / `type` modifiers for type-only imports (for example `import Dexie, { type Table } from "dexie"`).
- Write function components declared with `function Name() {}`, followed by `export default Name`.
- Use one component per file. Component files use PascalCase (`HomePage.tsx`, `CrisisCard.tsx`).
- I/O services export named `async` functions (see `services/offlineService.ts` and `services/vmaService.ts`). Pure response validators remain synchronous.
- `fetchVmas()` returns `VmaResult`: shared messages, provider/API metadata, feed/evaluation times, the backend's `checkedAt`/`stale` and validation diagnostics. Fetching, per-record validation and mapping stay separate. The source is our backend's `{data, checkedAt, stale}` wrapper around SR's object envelope with `timestamp` and `alerts`, not the previous assumed Krisinformation news shape. Only Actual/Public Alert, Update and Cancel records are exposed; Swedish `sv-SE` blocks are selected. Technical tests and exercises are excluded.
- VMA models distinguish CAP message IDs from incident IDs and retain complete references. Cancel records may lack title/content because `info: null` is valid. Mapping applies expiry and same-feed Update/Cancel references; unknown validity is explicit. No history is merged between requests. See `backend/DEVELOPMENT.md` for lifecycle and attribution rules.
- `useVmaBanner()` belongs to the persistent `AppLayout` and owns one `vmaUpdateService` instance. The service fetches on start when `ModeProvider` reports `isOnline`, then polls our backend at `apiConfig.vmaPollIntervalMs`, counted from the end of the previous attempt, including failed ones. It keeps one timer and one in-flight request, shared by StrictMode effect replays and manual retry. Polling pauses while offline or while the tab is hidden; reconnecting fetches immediately, and becoming visible fetches when the interval has elapsed. Loading is shown only while no successful result exists; background polls and manual retry never hide retained warnings. A successful empty response clears previous warnings. Backend `stale: true`, a failed request or an offline device marks the retained feed as possibly outdated with the backend's `checkedAt`; without a successful result the banner states that VMA information is unavailable. Status text comes from `vmaStatusLines()` and changes only with the derived state. Local sent/expiry timers and tab visibility re-evaluate validity without changing `checkedAt`. The browser may reuse a fresh response within its `max-age`. No VMA is persisted.
- `selectVmaBanner()` returns the displayable active messages once per CAP ID, ordered by `compareVmaMessages()` (newest `sentAt`, ties by ascending CAP ID); change the display order only there. A repeated CAP ID with differing content keeps the first-ranked copy and marks the data uncertain. When several are active, the banner shows a count and a collapsed disclosure list of the others. Rejected/excluded records, validation issues and unknown validity produce an incomplete-information notice alongside any usable active warning. `VmaBanner` only presents state and invokes supplied retry/detail callbacks; it does not fetch or parse data.
- Selecting the banner title or a listed title opens `VmaMessageDialog` through `AppLayout`. The
  layout retains the selected CAP snapshot and takes its validity from the banner's listed copy,
  falling back to the complete evaluated feed. A message missing from a successful feed is shown as no longer active. The dialog renders all Swedish descriptions, instructions, issuers and areas as text,
  preserving paragraph/line breaks and escaping markup. CAP `sentAt` labels distinguish an issued
  message from an Update; neither feed time nor references invent an original publication date.
  Validated message links use a neutral SR information label because they may be general VMA pages.
  Missing links and SR's unavailable `/vma` path fall back to `source.url`; other validated API
  links are retained without availability probes or changes to the source data.
  Opening performs no I/O and introduces no persistence or additional route.
- `pwaUpdateService` owns native service worker registration and lifecycle listeners outside React.
  `usePwaUpdate()` subscribes to its stable snapshot; `PwaUpdateNotice` presents it. Checks run on
  startup and visible foreground/connectivity events, coalesce in flight and have a 10-second
  logical deadline. Signals during a check queue one follow-up so a newer publication is not lost.
  Network-check failures are silent. A completed waiting version remains an
  offer, including offline; explicit activation uses `SKIP_WAITING`, waits for control and reloads
  the current document at most once. A 15-second activation timeout removes reload authorization
  and offers retry. Another tab's activation never automatically reloads this document.
- `installPromptService` owns the `beforeinstallprompt` and `appinstalled` listeners outside React:
  - `main.tsx` starts it before the first render, because the event can fire before React mounts.
  - It calls `preventDefault()` and retains the latest event. `canInstall` is true only while an
    event is retained and `(display-mode: standalone)` does not match.
  - Feature detection only: no user-agent sniffing or browser lists.
  - `promptInstall()` clears the event and calls `prompt()` synchronously, within the click's user
    activation. A decline or `appinstalled` hides the offer until the browser fires a new event.
  - `useInstallPrompt()` subscribes to it; `InstallAppButton` renders nothing while `canInstall`
    is false. Placement and focus follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) §6.6.
- PWA generation uses `generateSW`, `registerType: "prompt"`, `injectRegister: false`,
  `skipWaiting: false` and `clientsClaim: true`, retaining `/sw.js`, scope `/` and manifest identity.
  Bootstrap starts registration only in secure production builds. The updater never accesses
  IndexedDB or clears storage. Workbox precache revisions identify changed app files; no
  displayed or compiled build timestamp is required. Older installations without this client
  updater adopt the release through an online opening and a full close/reopen after the new worker
  downloads; the new prompt requires the new
  app code to be loaded. Do not require a separate A/B test publication or clear local storage.
- Manifest, iOS meta tags and precache (app shell, `assets/` images/fonts, `includeAssets` icons; `navigateFallback` `index.html`) are configured in `vite.config.ts` and `index.html`, with icon paths in one constant. A maskable icon is pending. `getServiceWorkerContainer()` treats a blocked `navigator.serviceWorker` as unsupported so the app still renders. User-facing behaviour: README "PWA and offline access".
- Style with Tailwind utility classes in `className`. There are no separate CSS files beyond `index.css`.
- Follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for visual tokens and component patterns. VMA warning colours use the central `vma-surface`, `vma-foreground`, `vma-border` and `vma-focus` aliases in `index.css`; keep their documented contrast and focus treatment in sync with the implementation.
- Put IndexedDB access in `db/` and `services/`, not in UI components. (`IndexedDbTest.tsx` is a test page and an exception.)
- Prettier decides formatting (`frontend/.prettierrc`: no semicolons, double quotes, `printWidth` 100). `npm run format:check` must pass.
- `endOfLine` is `"auto"` because Windows clones with `core.autocrlf=true` have CRLF working trees while the repo stores LF; `"lf"` would fail the check after every checkout.
- `npm run lint` must pass.

Cross-platform (CI runs on Ubuntu, Windows and macOS, see section 4):

- Import paths must match the exact filename casing on disk. Windows and macOS are case-insensitive by default, Linux is not.
- Never add files whose names differ only by case.
- Avoid filenames that are invalid on Windows: reserved names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`), the characters `<>:"/\|?*`, and trailing dots or spaces.
- npm scripts must not depend on POSIX-only commands or syntax (`rm -rf`, `cp`, `VAR=x cmd`). Use Node-based or cross-platform tools.
- Backend code builds file paths with `pathlib.Path`, not string concatenation or hard-coded separators.
- Python text file operations pass `encoding="utf-8"` explicitly.
- When documentation shows a shell command whose syntax differs between POSIX shells and PowerShell, include a PowerShell alternative. This applies to documentation written from now on; existing documentation is not rewritten for it.

Navigation and accessibility:

- Keep one `BrowserRouter` and one shared `AppLayout`. The layout owns the header, primary navigation, skip link, single `main` landmark, document title and route focus management.
- From `48rem`, the header uses two shrinkable columns. Its right control group is capped at
  `20rem`, independently of help-text length. The switch track and active address align with the
  cards' right edge; the label and help text share a left edge. The active address follows the
  switch help. `Installera app` sits beside the connectivity status in the left column, outside
  its live region, and wraps below it when needed. The connection-loss notice stays below that
  row. Status/installation and the address share the final desktop grid row and align by their
  first text baseline. A flexible row above them accommodates longer switch help without spreading
  the brand and tagline apart. Below `48rem`, header content stacks on the left and installation
  stays in the menu.
  See `DESIGN_SYSTEM.md` sections 6.5–6.6 for padding, spacing and target details.
- Each routed page supplies one `h1` with `id="page-heading"` and `tabIndex={-1}`. The layout derives the document title from that heading and focuses it on pathname changes, including back/forward navigation. Initial loads and hash-only changes preserve browser focus.
- Add public links to the typed `navigationItems` list in `components/navigationItems.ts` and register their routes in `App.tsx`. Navigation currently uses exact matching. The desktop `BottomNavigation` and the mobile `MobileMenu` both render that one list; never duplicate labels or paths.
- From `48rem` viewport width the navigation (`BottomNavigation`) stays in normal flow beneath the header with wrapping links. Below `48rem`, regardless of viewport height, it is hidden (`display: none`) and `MobileMenu` shows one fixed, horizontally centred **Meny** button (hamburger icon plus visible text, `bottom: max(0.75rem, env(safe-area-inset-bottom))`) instead.
- `MobileMenu` opens a full-screen native modal `<dialog>` (`showModal()`) named **Meny** with a **Stäng menyn** button and the shared links in list order; the current route has `aria-current="page"` plus a non-colour cue. The button has `aria-expanded`/`aria-controls`. The modal makes the page inert, locks root/body scroll, wraps Tab at its boundaries and scrolls its link list internally, so it works on short screens and with enlarged text. It covers the VMA notice by design. Closed, it is out of the tab order and accessibility tree.
- Menu focus: Escape or **Stäng menyn**, or selecting the current route, returns focus to the **Meny** button. Selecting another route closes the menu without focusing anything; the `AppLayout` pathname effect stays the only route-focus owner and focuses `#page-heading`. Crossing `48rem` while open closes the menu without focusing the hidden button and moves focus to `#page-heading` (without scrolling or navigating).
- `AppLayout` measures the **Meny** button (distance from its top to the viewport bottom, 0 while it is `display: none`) with `ResizeObserver` and maintains `--navigation-height` for content and scroll spacing and for revealing focused content above the button. ResizeObserver notifications defer layout measurement to an animation frame.
- The VMA notice is sticky above the header and limited to 40dvh, with complete text in a keyboard-scrollable region. The layout measures `--vma-banner-height`, reserves top scroll padding and reveals focused main/navigation content between the notice and the fixed mobile menu button. Only the first visible region owns the top safe-area inset. VMA live announcements persist across routes; the warning never takes focus when it arrives.
- The banner heading contains a 48px underlined button with `aria-haspopup="dialog"` and a pointer
  cursor; the dialog's close button also uses a pointer cursor. The native
  modal sits outside `main`, uses `showModal()` and initially focuses its labelled heading. Its
  close row remains outside scrolling content; safe-area-aware bounds fit short/mobile viewports.
  Tab/Shift+Tab wrap at boundary controls. Stäng/Escape close it; backdrop clicks do not.
  Root/body overflow is restored on close/unmount. Focus returns to the trigger only if it still
  represents the same CAP ID, otherwise to the page heading. Validity and request notices never
  replace the selected content or imply an all-clear.
- The app-update slot precedes routed content. At heights of at least `40rem` it sticks below VMA
  and its region is limited to `25dvh` with keyboard scrolling; lower viewports use normal flow.
  `AppLayout` measures `--pwa-update-height` for scroll/focus spacing. The update's persistent,
  polite `Appuppdatering` status does not take focus or reannounce on route changes.
- Active VMA warnings pair the red/white surface with a visible VMA label and an inline SVG warning triangle. The redundant icon inherits `currentColor`, is hidden from assistive technology and is not focusable. Loading, failure and uncertainty alone use the neutral status surface without a warning icon; they never imply an active warning or an all-clear result.
- Target WCAG 2.2 AA with at least 48 by 48 CSS pixel navigation targets, 3px focus outlines and a non-colour active indicator. Verify keyboard use, zoom/reflow and actual screen-reader output; do not infer conformance from an accessibility tree alone.
- Keep UI and accessible names in Swedish. Use English comments and documentation as specified in section 6.

Documentation audience and placement:

- `README.md` is outward-facing: write for users, external visitors and stakeholders. Describe the project's purpose, current capabilities, user-relevant limitations and high-level project context. It also includes a newcomer quick start for running the app locally: runtime requirements, dependency installation and starting both servers on macOS/Linux and Windows PowerShell.
- Keep detailed development guides, implementation details, component contracts, internal routes, advanced configuration and test/verification procedures out of README. Local installation/start commands belong in its quick start; link to existing developer documentation for further details. A code change does not automatically require a README update.
- Put development instructions and conventions in `AGENTS.md` or an existing developer-facing document. Keep code contracts and implementation rationale in JSDoc and comments according to `documentation-baseline.md`. Record task-specific verification steps and results in the task report or PR description.
- Update README when the public description of the project or its user-facing behaviour changes. Update the relevant developer documentation when internal behaviour, commands or structure change.

Documentation (frontend/TypeScript):

- All frontend code must follow `documentation-baseline.md` (JSDoc and code comments). Key rules:
  - JSDoc is required on exported functions, components, services and types whose purpose or contract is not obvious from the name and signature. Describe purpose, `@param`, `@returns`, side effects and `@throws` as relevant.
  - Do not repeat TypeScript types in JSDoc: write `@param name Description`, not `@param {string} name`.
  - Inline comments explain why, not what. No filler comments, commented-out code, author tags, dates, or ticket references/IDs (also not in TODOs).
  - Comments describe current behaviour. Update or remove them in the same change as the code they describe.
- The baseline does not apply to the backend. Backend code follows the backend conventions below.

Backend conventions:

- Type hints on all functions. Docstrings on public functions, classes and modules.
- Pydantic models for request and response bodies.
- Ruff decides formatting and lint rules. `ruff check .` and `ruff format --check .` must pass.
- The application factory in `src/app.py` creates a shared HTTPX client through FastAPI lifespan. Routers obtain it through dependency injection; upstream fetching and response validation remain separate.
- `GET /api/v1/vmas` returns `{data, checkedAt, stale}`, where `data` is `{timestamp, alerts, source}` from SR's VMA API. `checkedAt` is the last successful SR check; `stale` is true when the latest SR attempt failed and that earlier feed is returned instead. Pydantic validates the timezone-bearing timestamp and strict JSON alerts list, preserving malformed entries for frontend classification. The backend supplies source/API attribution independently of upstream data, including empty feeds. Public API metadata strips credentials, query parameters and fragments. Individual records must be validated before presentation.
- `GET /api/v1/geocode?lat=&lon=` reverse-geocodes one position through OpenStreetMap Nominatim and returns `{found, address, municipality, county, lat, lon, message, source}`. `found: false` (Nominatim has no result, or its response cannot be read as a complete address) is a normal `200`, not an `UpstreamError`; `upstream_invalid_response` is reserved for JSON that fails to decode. Missing/out-of-range `lat`/`lon` get FastAPI's own `422 {"detail": [...]}` shape, which intentionally differs from the `{"error": {...}}` envelope used for upstream failures. Geocode responses always use `Cache-Control: no-store` to the browser regardless of the server-side cache below. See `backend/DEVELOPMENT.md` for the Nominatim usage policy and attribution requirement.
- `GeocodeCache` (`src/services/geocode_cache.py`) is the shared per-instance cache behind `GET /api/v1/geocode`, backed by a shared `NominatimThrottle`:
  - Keyed by the exact `(lat, lon)` pair received, not a rounded position; only an identical repeat lookup is served from memory.
  - `KRISKOMPASSEN_GEOCODE_CACHE_TTL_SECONDS` (default 300s) and `KRISKOMPASSEN_GEOCODE_MIN_INTERVAL_SECONDS` (default 1s, matching Nominatim's usage policy) are environment-configurable, unlike `VMA_CACHE_TTL_SECONDS`.
  - A single `asyncio.Lock` serializes cache misses: identical concurrent lookups collapse into one Nominatim call; distinct concurrent lookups queue behind the same lock and each pay the throttle's wait, so the backend never exceeds the configured interval between Nominatim calls regardless of client count.
  - A failed fetch (`UpstreamError`) is never cached and is raised exactly as before; the next request for the same coordinate retries immediately. Only a successful response (`found: true` or `found: false`) is cached.
  - No stale fallback: an expired entry is a miss, not a stale hit. Expired entries are purged lazily on the next miss.
  - Per instance, in memory; resets on cold start, same as `VmaCache`.
  - `KRISKOMPASSEN_GEOCODE_MAX_QUEUE_DEPTH` (default 10) caps how many misses may be waiting on or fetching through the lock at once. A real crisis mostly produces distinct positions (every user has their own GPS fix), so the TTL cache barely helps there — most requests queue behind the throttle regardless. A lookup arriving once the queue is full fails fast with `UpstreamError("geocode_queue_full", ..., status_code=503)` instead of growing the queue and the wait without bound.
- Upstream failures use the documented `error.code` / `error.message` envelope and HTTP 502 or 504. Never turn failures into a successful empty result.
- `VmaCache` (`src/services/vma_cache.py`) is the shared cache behind `GET /api/v1/vmas`:
  - `VMA_CACHE_TTL_SECONDS` (60 s, a team decision because SR documents no rate limit) is set only in `src/core/config.py`.
  - SR is contacted on demand, at most once per TTL and instance, counted from the latest attempt, successful or failed. There is no background refresh.
  - Concurrent requests share one SR call through an `asyncio.Lock`.
  - The cache is per instance and resets on cold start.
  - A failure without a cached feed returns the error envelope with HTTP 502 or 504, never a successful empty result. With a cached feed, it returns that feed with `stale: true` and unchanged `checkedAt`.
  - Fresh responses use `Cache-Control: max-age=<remaining TTL>`; stale and error responses use `no-store`. Never set `s-maxage`. `/api/v1/geocode` has its own, differently-shaped server-side cache (`GeocodeCache`, see above) but always sends `no-store` to the browser.
  - Cache age uses an injectable monotonic clock; `checkedAt` uses an injectable wall clock.
- Backend settings use the `KRISKOMPASSEN_` environment prefix. Frontend backend address, VMA timeout and the geocode endpoint URL live in `frontend/src/config/apiConfig.ts`. See `backend/DEVELOPMENT.md` for defaults, CORS and the official API evidence.

## 8. Testing

Decided tooling:

| Layer | Tool | Location |
| --- | --- | --- |
| Frontend unit/component | Vitest + React Testing Library | `*.test.ts(x)` next to the source file |
| Dexie/IndexedDB code | Vitest + `fake-indexeddb` | same as above |
| Frontend E2E | Playwright (Node/TypeScript) | `frontend/e2e/` |
| Backend | pytest | `backend/tests/` |

- Vitest defaults to Node in `frontend/vitest.config.ts`; `npm run test` runs once. The config disables `.env` loading and is included in `tsconfig.node.json`. React Testing Library and DOM Testing Library are installed. Component/hook tests opt into jsdom with `// @vitest-environment jsdom` and explicitly clean up their renders. jsdom 27.4.0 preserves the existing Node requirements. `fake-indexeddb` and Playwright remain planned and are not installed.
- Frontend VMA tests cover validation, mapping, transport, banner selection, request state, polling (interval, overlap, offline/visibility pause and reconnection), status text, local time transitions and shared layout integration with synthetic SR v3 fixtures and deterministic lifecycle times. Shared fixtures live in `frontend/src/services/__fixtures__/vma.ts`. Component/hook integration tests replace `fetch` while retaining real validation/mapping, so no backend is required. No test page or mock mode is bundled with the app. Backend pytest tests cover feed-envelope validation, record preservation, provenance and upstream failures. Manual browser layout checks complement these tests; jsdom does not verify real rendering or spoken screen-reader output.
- Layout integration tests mount the real `ModeProvider`, "Sparad information" switch and connectivity status alongside the VMA banner. They cover mode changes from the focused switch, title updates, connection loss and recovery while preserving the warning and its single request.
- `ModeToggle` tests cover switch semantics, clicks on the switch and its label, `aria-checked`, the help text, the automatic switch on connection loss, the `aria-disabled` restriction with its explanation and the retained saved mode after reconnection. jsdom does not turn Space/Enter into a native button click, so the tests assert a native `<button>` and keyboard activation is verified manually in a browser.
- Navigation tests: `BottomNavigation` tests cover the shared list, `aria-current` and the absence of scroll controls. `MobileMenu` tests cover the closed state, `aria-expanded`/`aria-controls`, link order, `aria-current`, Stäng menyn and native-close focus return, route selection (a different route leaves focus to the layout; the current route returns it to the button), scroll lock and restoration, Tab wrapping, closing when the viewport reaches desktop width, offline navigation and cleanup. Layout tests cover the reserved space and focus reveal above the button, no reserved space while it is hidden, and route-heading focus after selecting a menu link. jsdom does not apply CSS breakpoints, inertness, Escape handling, the top layer or safe-area insets; those, touch use and spoken screen-reader output require browser/device checks.
- Article tests cover strict response validation, safe links, transport/total deadlines, cancellation, fresh loads across mode/ID changes, retries, late results and StrictMode replay. Synthetic article fixtures live in `frontend/src/services/__fixtures__/crisis.ts` and are never an app data source. Component tests retain real fetching/validation with mocked HTTP and offline storage, covering save payloads, legacy copies without `savedAt`, missing-item redirects, mode-bound notices, removal focus, stable detail headings and asynchronous document titles. Backend article tests cover the bundled file, malformed/missing/unreadable data, duplicate IDs, complete-source validation, per-request reads and CORS on success, 404 and 500. Real IndexedDB and browser checks complement these tests.
- VMA detail tests cover complete content/metadata, escaped markup, safe links, validity/request
  notices, selection retention, repeat opening and explicit focus/scroll cleanup. The adjacent
  `components/__fixtures__/dialog.ts` supplies missing jsdom open/close methods only; actual modal
  inertness, keyboard containment, Escape and screen-reader output require browser/device checks.
- Installed-PWA update verification for this change is manual on the existing iPhone after one
  production publication. Do not add simulated updater tests, A/B fixtures or a separate update
  guide for this change. Existing VMA and layout tests remain. Device migration, saved articles,
  offline reopening and actual VoiceOver output are pending live verification; local build checks
  do not establish those results.
- `pwaUpdateService.test.ts` covers registration failure only: a throwing or missing container, rejected `register`/`getRegistration`, and disabled bootstrap outside secure production builds. Update/activation flow tests remain out of scope.
- Install prompt tests cover the service, hook, `InstallAppButton` and its focus handling in `Header` and `MobileMenu` with synthetic events from `services/__fixtures__/installPrompt.ts`. The browser's real prompt and install flow require manual checks.
- The backend pytest suite runs in CI whenever `backend/` changes (see §4) and must not need network access or environment variables.
- Backend CORS tests provide their own JSON origin environment variable and mock upstream transport. They check that approved frontend origins can read successful feeds and 502/504 errors, and that unlisted origins or unsupported methods do not pass preflight.
- Once a test runner exists, new logic (services, db, utilities, API routes) must include tests.
- Keep E2E small: a few critical user flows, including at least one offline scenario.

**Hard rule (team decision): keep existing tests in sync with the code.**

- Before changing any code, find the tests that cover it (same name in a test folder, `*.test.ts(x)`, `*.spec.ts(x)`, `test_*.py`, or imports of the changed module).
- If tests exist for the code you change, update them in the same task so they match the new behaviour. Changed behaviour means changed or added test cases; a bug fix means a test that fails without the fix.
- Run the affected tests before saying you are done and report the actual result.
- Never delete, skip, comment out or weaken a test to make it pass. If a test fails and you think the test is wrong rather than the code, stop and ask.
- If you could not run the tests, say so. Never claim tests pass without running them.

## 9. Security

- Never commit secrets. `.env` and `.env.*` are git-ignored (except `.env.example`).
- Do not read, print or edit `.env` files. Document new variables by name only in `frontend/.env.example` or `backend/.env.example`. Backend settings read process environment variables and do not automatically load `.env` files.
- Anything in the frontend (including `VITE_*` env vars) ends up in the public bundle. Never put API keys or secrets there.
- Data in IndexedDB is readable on the user's device. Do not store sensitive personal data there. **Documented exception:** saved addresses (`savedAddresses` table, via `addressStorageService.ts`) are deliberately stored locally — the team approved this because the feature is pointless without persistence, the data is device-local and only ever leaves the device as coordinates sent to the geocode endpoint the user themselves triggered, and nothing else in the app reads or transmits this table. Do not extend this exception to other personal data without the same explicit approval. **Second documented exception:** saved shelters (a device-local bookmark list of shelter ids) are approved on the same basis — the feature is pointless without persistence, the data never leaves the device (no account, no backend sync; KrisKompassen is account-free per §1), and it stores only a shelter id, an address/coordinate fallback, and a short (50-character max) user-authored comment to help relocate the shelter (e.g. "Kommunhuset") — not a category label like "Hemma"/"Jobbet" that would reveal why it was saved. Do not extend this exception further without the same explicit approval.
- Treat data from external sources (VMA, etc.) as untrusted. Do not render it as raw HTML. Validate the feed envelope with Pydantic and individual records in the frontend before presentation.
- VMA responses carry provider and API attribution. The banner and full-message dialog link to the provider; technical API metadata stays in the model. The usage review in `backend/DEVELOPMENT.md` supports intended onward publication, but current VMA-specific terms remain unconfirmed. Clarify terms with SR before public release or adding persistent/offline VMA storage; this integration adds no such storage.

## 10. Ask before you do any of this

- Add, remove or upgrade dependencies, or change `package-lock.json` or `requirements*.txt`.
- Scaffold the backend.
- Change the Dexie schema in `frontend/src/db/db.ts`. The current schema is `version(3)`: `crisisItems: "id, title, source, fetchedAt, savedOffline"`, `crisisKitItems: "id, category, isOwned, isCustom"`, `savedAddresses: "id, isActive"`. Changes need a new version and a migration plan.
- Reintroduce separate online/offline routes (e.g. `/offline`, `/offline/:id`) or otherwise encode the selected mode in the URL. The team decided online/offline is a shared `ModeContext` read by `/crisis` and `/crisis/:id` instead (see §3) specifically so the URL never changes on a mode switch. If a task description points back toward separate routes, stop and ask, and remind them of this decision, rather than silently reintroducing it.
- Change the PWA or service worker config (`VitePWA` in `vite.config.ts`, manifest, caching).
- Create or change any backend database schema.
- Add or change authentication or authorization that is not an end-user account system (for example protecting an operational or administrative endpoint). End-user accounts, registration and login are not subject to approval: they are out of scope under the account-free decision in §1 and cannot be introduced by a ticket or by approving a plan for one.
- Touch deploy, hosting or CI config (`frontend/vercel.json`, `.github/workflows/`). The frontend has a Vercel SPA fallback. CI workflows are `backend-ci.yml` and `frontend-ci.yml`. Project creation, environment settings and actual deployment remain account-side work.
- Delete, move or rename files.
- Change TypeScript, ESLint, Prettier, Ruff or build configuration.
- Remove or skip an existing test.
- Change repository conventions or policies in this file beyond documentation updates authorized by the task (see section 0).

## 11. How to work

Every task starts with a checklist and ends with a checklist. The two are compared by the human before review.

**Before starting: the plan as a checklist.** Read the relevant code and its tests first, then present the plan as a markdown checklist and **wait for approval** before editing:

```
## Plan
- [ ] Files to change: ...
- [ ] Files to create: ...
- [ ] Existing tests to update: ...
- [ ] New tests to write: ...
- [ ] AGENTS.md / README changes: ...
- [ ] Items from section 10 that need approval: ...
- [ ] Verification: commands to run
```

**Account-free check (before planning any implementation).** If a task or ticket asks for end-user accounts, registration, login, account-based profiles or account-based cloud persistence, do not plan or implement it. The ticket does not authorize it (see §1). Stop and:

1. State explicitly that the request conflicts with the project's account-free product decision.
2. Identify the underlying user need (for example keeping settings, or keeping information available later).
3. Propose account-free alternatives that fit the existing architecture, such as device-local settings or locally saved crisis information in IndexedDB.
4. Keep every alternative within the local-storage and personal-data rules in §9. Do not propose storing personal data locally beyond what §9 already permits, and do not weaken those rules.

Wait for the human's decision before continuing.

**While working:**

1. Work on one task at a time and keep changes small and focused on that task.
2. Do not make changes that were not requested. Mention unrelated issues instead of fixing them.
3. Update the tests that cover the changed code (section 8).
4. Before saying you are done, run lint, format check, build and the tests that exist. Do not mark an item done if it failed or was skipped.

**When finished: the result as a checklist.** Every item from the plan appears again, ticked or explicitly not done, plus what the human needs next:

```
## Done
- [x] <each plan item, ticked or marked "not done: reason">
- [x] Lint: <actual result>
- [x] Format check: <actual result>
- [x] Build: <actual result>
- [x] Tests: <actual result, or "not run: reason">

## Files changed
...

## How to verify
...

## Suggested commit message
...

## Suggested PR title and description   (when the task completes a piece of work)
...
```

Anything done that was not in the plan is listed separately under "Not in plan". Anything in the plan that was not done stays unticked with a reason. Never tick an item you did not verify.

## 12. Definition of done

- The change does what the task asked, nothing more.
- The "Done" checklist matches the approved plan, and every unticked item has a reason.
- Lint, format check, typecheck and build pass. Tests pass once a runner exists.
- Existing tests for the changed code are updated and pass. New logic has tests once a test runner is set up.
- No secrets, no stray debug code, no unused files.
- Code comments and docs are in English. UI text is in Swedish.
- Frontend code follows `documentation-baseline.md`.
- README reflects changes to the outward-facing project description, capabilities, user-relevant limitations and local quick start. Internal behaviour, advanced commands and structure changes are documented in `AGENTS.md` or the relevant developer documentation, not automatically in README.
- AGENTS.md matches the current state of the repo (see section 0).
- The PR targets `dev` and is approved by another developer.
