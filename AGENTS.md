# AGENTS.md

Shared instructions for all AI coding agents and AI chat assistants working on this repository.
Base every change on what is in the repo. If something is undecided, ask instead of guessing.

## 0. Keep this file up to date

The team updates the repo continuously, so this file can fall behind. **The repo is the source of truth, not this file.**

- At the start of every task, check this file against the repo: `package.json`, the lock files, config files, the folder structure, `.github/`, `.env.example` and `git branch -a`.
- If something here is outdated or missing (new scripts, dependencies, versions, folders, tools, conventions), propose the change first, wait for approval, then update AGENTS.md as part of your task. List the changes in your plan and in your final summary.
- When the repo shows that a `TODO(team)` has been decided (for example a test runner has been added), replace the TODO with what the repo shows, after approval.
- Never change the team decisions in sections 5 and 6 on your own. Only people change those.
- Do not guess. If the repo does not show the answer, leave or add a `TODO(team)`.

## 1. Project

- KrisKompassen is a Progressive Web App (PWA) that helps the general public quickly find clear local information during emergencies and major disruptions.
- It answers three questions: *What has happened? What should I do? Where should I go?*
- Planned scope: Swedish public warning messages (VMA) and local information about floods, gas leaks, contaminated drinking water, etc.
- Users can save important information locally and read it offline.
- Target users: the general public in Sweden. No login or user accounts are planned.
- Status: early development. The UI has a home page (`/`), a crisis information list (`/crisis`), a crisis detail page (`/crisis/:id`) and a not-found page. A header-level online/offline mode toggle (`ModeToggle`, backed by `ModeContext`) controls whether `/crisis` and `/crisis/:id` show the bundled mock dataset or items saved in IndexedDB — there are no separate offline routes. Shared navigation sits at the bottom on mobile and above the content on wider or short viewports. The IndexedDB test page is available only in development at `/dev/indexeddb`.
- A FastAPI backend and a reusable frontend service fetch, validate and map VMA from Sveriges Radio's documented v3 CAP API into a shared frontend model with lifecycle and source/API metadata. A shared sticky banner displays the most recent active VMA with source attribution, an indication of additional warnings and explicit error/partial-data states. Krisinformation.se is the chosen source for future general news integration; the crisis articles still use mock data. Recurring network updates and offline VMA storage are not implemented. The user has confirmed successful empty-feed handling against the deployed backend and a working live frontend integration; displaying a real active warning in production remains unverified.

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
| PWA | vite-plugin-pwa | 1.3.0 |
| Linting | ESLint + typescript-eslint 8.70.0 | 10.10.0 |
| Formatting | Prettier (+ `eslint-config-prettier` 10.1.8) | 3.9.9 |
| Unit tests | Vitest | 4.1.11 |
| Component tests | React Testing Library / DOM Testing Library | 16.3.3 / 10.4.2 |
| DOM test environment | jsdom | 27.4.0 |
| E2E tests | Playwright (Node/TypeScript) | not yet installed |
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
├── backend/             # FastAPI VMA API
│   ├── DEVELOPMENT.md  # backend and VMA integration development guide
│   ├── .python-version # Python 3.13
│   ├── .env.example    # backend variable names only
│   ├── requirements.txt / requirements-dev.txt  # pinned dependencies
│   ├── pyproject.toml  # Ruff and pytest configuration
│   ├── src/
│   │   ├── app.py      # application factory, lifespan and exported app
│   │   ├── api/        # routers and dependencies
│   │   ├── core/       # settings and upstream errors
│   │   ├── models/     # Pydantic response models
│   │   └── services/   # upstream fetching and JSON decoding
│   └── tests/          # pytest API, CORS and upstream response tests
└── frontend/            # Vite + React + TypeScript PWA
    ├── .env.example    # frontend variable names only
    ├── .nvmrc          # single source of truth for the Node.js version (24 = latest 24.x LTS), read by CI and nvm
    ├── public/          # static assets and PWA icons
    ├── e2e/             # Playwright tests (planned, not created)
    ├── index.html       # HTML entry (lang="sv")
    ├── vite.config.ts   # React, Tailwind and PWA manifest config
    ├── vercel.json      # frontend-only SPA fallback for direct React Router URLs
    ├── vitest.config.ts # Node default; component tests opt into jsdom; no application plugins or .env loading
    └── src/
        ├── components/  # AppLayout, Header, BottomNavigation, VmaBanner, CrisisCard, DetailedCrisisCard, OfflineToggle (save/remove), ModeToggle (online/offline switch), ConnectionStatus (connectivity + auto-switch notice)
        ├── config/      # central backend address and VMA request timeout
        ├── context/     # ModeProvider.tsx + modeContext.ts (context object, Mode type, useMode hook — split to satisfy react-refresh/only-export-components)
        ├── data/        # mock data (mockCrisisData.ts)
        ├── db/          # Dexie database (db.ts)
        ├── hooks/       # VMA request state and local validity scheduling; adjacent tests
        ├── pages/       # HomePage, CrisisInfoPage, NotFoundPage, IndexedDbTest and placeholders (SettingsPage)
        ├── services/    # offline storage, VMA fetching, validation, mapping and banner selection; adjacent unit tests
        └── types/       # shared crisis and VMA TypeScript types
```

- New frontend code goes under `frontend/src/` in the matching folder above.
- Frontend unit and component tests live next to the file they test: `Foo.test.tsx` beside `Foo.tsx`.
- New backend code goes under `backend/src/`: routers and dependency providers in `api/`, settings and application errors in `core/`, Pydantic models in `models/`, and upstream I/O in `services/`. Tests belong in `backend/tests/`.
- Several files in `components/` and `pages/` are empty placeholders (`SettingsPage.tsx`). Fill them in; do not delete them without asking.
- `App.tsx` wraps the router in `ModeProvider` and registers routes inside the shared `AppLayout`. There are no separate offline routes: `CrisisInfoPage` (`/crisis`) and `DetailedCrisisCard` (`/crisis/:id`) both read `useMode()` and switch data source — the bundled mock dataset in online mode, `getOfflineItems()`/`getOfflineItem(id)` in offline mode — without the URL changing. `OfflineToggle` saves and removes items in IndexedDB through `offlineService` and is used in both `CrisisCard` and `DetailedCrisisCard`. If the item shown on `/crisis/:id` is not available in the current mode (mode just switched, or the URL was opened directly), `DetailedCrisisCard` redirects to `/crisis` with an explanation passed via router location state, rather than showing an inline message. `ModeProvider` forces offline mode (with an explanation shown by `ConnectionStatus`) when the browser's `offline` event fires, and never switches back to online automatically — the user does that via `ModeToggle`, which is disabled for online mode while `navigator.onLine` is false.

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

CI: both workflows trigger on pull requests into `dev` or `main` and on pushes to `dev`. `.github/workflows/frontend-ci.yml` runs `npm ci`, `npm run lint`, `npm run format:check`, `npm run test` and `npm run build` on Node from `frontend/.nvmrc`. `.github/workflows/backend-ci.yml` runs the backend install, `ruff check .`, `ruff format --check .` and `pytest` on Python from `backend/.python-version`. Each workflow always starts (no `on: paths:`) and has three jobs: a change-detection job that diffs against the PR base branch or the previous push with `git diff` and logs the changed files, the check job that runs only when its folder or its own workflow file changed, and a gate job. If the diff cannot be computed, the checks run anyway. The gate jobs `Frontend CI result` and `Backend CI result` are the status checks to mark as required in branch protection; they fail when change detection fails or when needed checks did not succeed. PR runs are cancelled when superseded; pushes to `dev` run to completion. CI uses no third-party actions.

Vercel uses separate projects rooted at `frontend/` (Vite) and `backend/` (FastAPI). `frontend/vercel.json` supplies the SPA fallback, not an API proxy. The backend exports the supported `src/app.py` entrypoint. The user configured Vercel to install backend dependencies from `requirements.txt`; that dashboard setting is not stored in the repo. Connection settings, local testing against the deployed backend and the scope of reported live verification are documented in `backend/DEVELOPMENT.md`.

Create the backend environment with Python 3.13 using `python3 -m venv .venv` and activate it with `source .venv/bin/activate`. On Windows PowerShell, use `py -3.13 -m venv .venv` and `.venv\Scripts\Activate.ps1`. See `backend/DEVELOPMENT.md` for environment configuration and manual verification commands.

## 5. Git

**Hard rules (team decision):**

- ALL git handling (add, commit, push, merge, pull requests, etc.) is done manually by a human, NEVER by an agent.
- Branches: permanent `main` and `dev`. Work branches: feature/, bugfix/, hotfix/, docs/ in kebab-case. Examples: feature/initial-scaffold, feature/login, bugfix/login-validation, hotfix/critical-crash, docs/update-readme.
- PR flow: work branch -> pull request into dev -> approved by another developer. dev is merged into main only after the team has agreed in a meeting or in the chat. Never target main directly.

Additional rules for agents:

- Agents may run read-only git commands only: `git status`, `git log`, `git diff`, `git branch -a`.
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

- TypeScript with strict unused checks (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`).
- Use `import type` / `type` modifiers for type-only imports (for example `import Dexie, { type Table } from "dexie"`).
- Write function components declared with `function Name() {}`, followed by `export default Name`.
- Use one component per file. Component files use PascalCase (`HomePage.tsx`, `CrisisCard.tsx`).
- I/O services export named `async` functions (see `services/offlineService.ts` and `services/vmaService.ts`). Pure response validators remain synchronous.
- `fetchVmas()` returns `VmaResult`: shared messages, provider/API metadata, feed/evaluation times and validation diagnostics. Fetching, per-record validation and mapping stay separate. The source is SR's object envelope with `timestamp` and `alerts`, not the previous assumed Krisinformation news shape. Only Actual/Public Alert, Update and Cancel records are exposed; Swedish `sv-SE` blocks are selected. Technical tests and exercises are excluded.
- VMA models distinguish CAP message IDs from incident IDs and retain complete references. Cancel records may lack title/content because `info: null` is valid. Mapping applies expiry and same-feed Update/Cancel references; unknown validity is explicit. No history is merged between requests. See `backend/DEVELOPMENT.md` for lifecycle and attribution rules.
- `useVmaBanner()` belongs to the persistent `AppLayout`. It fetches once on mount and on manual retry, sharing an in-flight request during StrictMode effect replays. Failures retain the last successful feed with an explicit status notice and last-check time. Local sent/expiry timers and tab visibility re-evaluate the complete feed through the mapper; they never poll the API. No VMA is persisted.
- `selectVmaBanner()` selects the newest active `sentAt`, breaking ties by ascending CAP ID. Additional active messages get an indication, not a list or switcher. Rejected/excluded records, validation issues and unknown validity produce an incomplete-information notice alongside any usable active warning. `VmaBanner` only presents state and invokes the supplied retry callback; it does not fetch or parse data.
- Style with Tailwind utility classes in `className`. There are no separate CSS files beyond `index.css`.
- Follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for visual tokens and component patterns. VMA warning colours use the central `vma-surface`, `vma-foreground`, `vma-border` and `vma-focus` aliases in `index.css`; keep their documented contrast and focus treatment in sync with the implementation.
- Put IndexedDB access in `db/` and `services/`, not in UI components. (`IndexedDbTest.tsx` is a test page and an exception.)
- Prettier decides formatting (`frontend/.prettierrc`: no semicolons, double quotes, `printWidth` 100). `npm run format:check` must pass.
- `endOfLine` is `"auto"` because Windows clones with `core.autocrlf=true` have CRLF working trees while the repo stores LF; `"lf"` would fail the check after every checkout.
- `npm run lint` must pass.

Navigation and accessibility:

- Keep one `BrowserRouter` and one shared `AppLayout`. The layout owns the header, primary navigation, skip link, single `main` landmark, document title and route focus management.
- Each routed page supplies one `h1` with `id="page-heading"` and `tabIndex={-1}`. The layout derives the document title from that heading and focuses it on pathname changes, including back/forward navigation. Initial loads and hash-only changes preserve browser focus.
- Add public links to the typed `navigationItems` list in `BottomNavigation.tsx` and register their routes in `App.tsx`. Navigation currently uses exact matching; keep the same DOM links across screen sizes.
- The navigation is fixed at the bottom below `48rem` viewport width when the viewport is at least `30rem` high; otherwise it stays above the content in normal flow. `AppLayout` measures it with `ResizeObserver` and maintains `--navigation-height` for content and scroll spacing.
- The VMA notice is sticky above the header and limited to 40dvh, with complete text in a keyboard-scrollable region. The layout measures `--vma-banner-height`, reserves top scroll padding and reveals focused main/navigation content between the notice and any fixed bottom bar. Only the first visible region owns the top safe-area inset. VMA live announcements persist across routes; the warning never takes focus when it arrives.
- Active VMA warnings pair the red/white surface with a visible VMA label and an inline SVG warning triangle. The redundant icon inherits `currentColor`, is hidden from assistive technology and is not focusable. Loading, failure and uncertainty alone use the neutral status surface without a warning icon; they never imply an active warning or an all-clear result.
- Target WCAG 2.2 AA with at least 48 by 48 CSS pixel navigation targets, 3px focus outlines and a non-colour active indicator. Verify keyboard use, zoom/reflow and actual screen-reader output; do not infer conformance from an accessibility tree alone.
- Keep UI and accessible names in Swedish. Use English comments and documentation as specified in section 6.

Documentation audience and placement:

- `README.md` is outward-facing: write for users, external visitors and stakeholders. Describe the project's purpose, current capabilities, user-relevant limitations and high-level project context.
- Keep development guides, implementation details, component contracts, internal routes, developer commands and test/verification procedures out of README. A code change does not automatically require a README update.
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
- `GET /api/v1/vmas` returns `{timestamp, alerts, source}` from SR's VMA API. Pydantic validates the timezone-bearing timestamp and strict JSON alerts list, preserving malformed entries for frontend classification. The backend supplies source/API attribution independently of upstream data, including empty feeds. Public API metadata strips credentials, query parameters and fragments. Individual records must be validated before presentation.
- Upstream failures use the documented `error.code` / `error.message` envelope and HTTP 502 or 504. Never turn failures into a successful empty result. VMA responses use `Cache-Control: no-store`.
- Backend settings use the `KRISKOMPASSEN_` environment prefix. Frontend backend address and request timeout live in `frontend/src/config/apiConfig.ts`. See `backend/DEVELOPMENT.md` for defaults, CORS and the official API evidence.

## 8. Testing

Decided tooling:

| Layer | Tool | Location |
| --- | --- | --- |
| Frontend unit/component | Vitest + React Testing Library | `*.test.ts(x)` next to the source file |
| Dexie/IndexedDB code | Vitest + `fake-indexeddb` | same as above |
| Frontend E2E | Playwright (Node/TypeScript) | `frontend/e2e/` |
| Backend | pytest | `backend/tests/` |

- Vitest defaults to Node in `frontend/vitest.config.ts`; `npm run test` runs once. The config disables `.env` loading and is included in `tsconfig.node.json`. React Testing Library and DOM Testing Library are installed. Component/hook tests opt into jsdom with `// @vitest-environment jsdom` and explicitly clean up their renders. jsdom 27.4.0 preserves the existing Node requirements. `fake-indexeddb` and Playwright remain planned and are not installed.
- Frontend VMA tests cover validation, mapping, transport, banner selection, request state, local time transitions and shared layout integration with synthetic SR v3 fixtures and deterministic lifecycle times. Shared fixtures live in `frontend/src/services/__fixtures__/vma.ts`. Component/hook integration tests replace `fetch` while retaining real validation/mapping, so no backend is required. No test page or mock mode is bundled with the app. Backend pytest tests cover feed-envelope validation, record preservation, provenance and upstream failures. Manual browser layout checks complement these tests; jsdom does not verify real rendering or spoken screen-reader output.
- Layout integration tests mount the real `ModeProvider`, mode toggle and connectivity status alongside the VMA banner. They cover keyboard mode changes, title updates, connection loss and recovery while preserving the warning and its single request.
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
- Data in IndexedDB is readable on the user's device. Do not store sensitive personal data there.
- Treat data from external sources (VMA, etc.) as untrusted. Do not render it as raw HTML. Validate the feed envelope with Pydantic and individual records in the frontend before presentation.
- VMA responses carry provider and API attribution. The banner links to the provider; API metadata remains available for a future detail view. The usage review in `backend/DEVELOPMENT.md` supports intended onward publication, but current VMA-specific terms remain unconfirmed. Clarify terms with SR before public release or adding persistent/offline VMA storage; this integration adds no such storage.

## 10. Ask before you do any of this

- Add, remove or upgrade dependencies, or change `package-lock.json` or `requirements*.txt`.
- Scaffold the backend.
- Change the Dexie schema in `frontend/src/db/db.ts`. The current schema is `version(1)`, `crisisItems: "id, title, source, fetchedAt, savedOffline"`. Changes need a new version and a migration plan.
- Reintroduce separate online/offline routes (e.g. `/offline`, `/offline/:id`) or otherwise encode the selected mode in the URL. The team decided online/offline is a shared `ModeContext` read by `/crisis` and `/crisis/:id` instead (see §3) specifically so the URL never changes on a mode switch. If a task description points back toward separate routes, stop and ask, and remind them of this decision, rather than silently reintroducing it.
- Change the PWA or service worker config (`VitePWA` in `vite.config.ts`, manifest, caching).
- Create or change any backend database schema.
- Add or change authentication or authorization.
- Touch deploy, hosting or CI config (`frontend/vercel.json`, `.github/workflows/`). The frontend has a Vercel SPA fallback. CI workflows are `backend-ci.yml` and `frontend-ci.yml`. Project creation, environment settings and actual deployment remain account-side work.
- Delete, move or rename files.
- Change TypeScript, ESLint, Prettier, Ruff or build configuration.
- Remove or skip an existing test.
- Change this file (see section 0).

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
- README reflects changes to the outward-facing project description, capabilities and user-relevant limitations. Internal behaviour, command and structure changes are documented in `AGENTS.md` or the relevant developer documentation, not automatically in README.
- AGENTS.md matches the current state of the repo (see section 0).
- The PR targets `dev` and is approved by another developer.
