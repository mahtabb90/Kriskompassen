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

- Kriskompassen is a Progressive Web App (PWA) that helps the general public quickly find clear local information during emergencies and major disruptions.
- It answers three questions: *What has happened? What should I do? Where should I go?*
- Planned scope: Swedish public warning messages (VMA) and local information about floods, gas leaks, contaminated drinking water, etc.
- Users can save important information locally and read it offline.
- Target users: the general public in Sweden. No login or user accounts are planned.
- Status: early development. The UI currently shows a title and an IndexedDB test page (`frontend/src/pages/IndexedDbTest.tsx`).

## 2. Tech stack

Frontend versions are taken from `frontend/package-lock.json`.

| Area | Technology | Version |
| --- | --- | --- |
| UI | React / React DOM | 19.3.0 |
| Language | TypeScript | 6.0.3 |
| Build/dev server | Vite (+ `@vitejs/plugin-react` 6.1.1) | 8.3.0 |
| Styling | Tailwind CSS (via `@tailwindcss/vite`) | 4.3.3 |
| Local storage | Dexie (IndexedDB) | 4.4.6 |
| PWA | vite-plugin-pwa | 1.3.0 |
| Linting | ESLint + typescript-eslint 8.70.0 | 10.10.0 |
| Formatting | Prettier | not yet installed |
| Unit/component tests | Vitest + React Testing Library | not yet installed |
| E2E tests | Playwright (Node/TypeScript) | not yet installed |
| Runtime | Node.js (required by Vite) | ^20.19.0 or >=22.12.0 |

Backend (decided, not yet scaffolded):

| Area | Technology | Version |
| --- | --- | --- |
| Language | Python | set at scaffold time: the version the pinned FastAPI and Pydantic releases require; record it here and in `.python-version` |
| Framework | FastAPI | latest stable at scaffold time, pinned |
| Dependencies | `pip` + `requirements.txt` / `requirements-dev.txt` | pinned versions |
| Tests | pytest | |
| Lint/format | Ruff | |

- `backend/` is empty today. Do not scaffold it without an explicit task for it.

## 3. Repository structure

```
.
├── AGENTS.md            # this file
├── README.md            # project overview (English)
├── backend/             # FastAPI (planned)
│   ├── src/             # empty placeholder (.gitkeep); new backend code goes here
│   └── tests/           # pytest tests (planned)
└── frontend/            # Vite + React + TypeScript PWA
    ├── public/          # static assets and PWA icons
    ├── e2e/             # Playwright tests (planned)
    ├── index.html       # HTML entry (lang="sv")
    ├── vite.config.ts   # React, Tailwind and PWA manifest config
    └── src/
        ├── components/  # reusable UI components
        ├── data/        # mock data (mockCrisisData.ts)
        ├── db/          # Dexie database and CrisisItem type (db.ts)
        ├── pages/       # page-level components
        ├── services/    # data/storage logic (offlineService.ts)
        └── types/       # shared TypeScript types
```

- New frontend code goes under `frontend/src/` in the matching folder above.
- Frontend unit and component tests live next to the file they test: `Foo.test.tsx` beside `Foo.tsx`.
- New backend code goes under `backend/src/`, tests under `backend/tests/`. TODO(team): the internal layout of `backend/src/` is decided when the backend is scaffolded.
- Several files in `components/`, `pages/` and `types/` are empty placeholders. Fill them in; do not delete them without asking.

## 4. Commands

Run frontend commands from `frontend/`, backend commands from `backend/` with the virtual environment active. Use only commands listed here. Commands marked *planned* do not work until the tool is set up; do not run them before then.

| Task | Frontend | Backend |
| --- | --- | --- |
| Install | `npm ci` (use the lock file) | `pip install -r requirements.txt -r requirements-dev.txt` *(planned)* |
| Dev server | `npm run dev` | `uvicorn` *(planned; exact command set at scaffold time)* |
| Lint | `npm run lint` | `ruff check .` *(planned)* |
| Format | `npm run format` *(planned, Prettier)* | `ruff format .` *(planned)* |
| Typecheck | `npx tsc -b` (also runs as part of `build`) | n/a |
| Test | `npm run test` *(planned, Vitest)* | `pytest` *(planned)* |
| E2E | `npm run test:e2e` *(planned, Playwright)* | n/a |
| Build | `npm run build` | n/a |
| Preview build | `npm run preview` | n/a |

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
- [ ] Lint, typecheck and build pass
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
- Use `import type` / `type` modifiers for type-only imports (for example `import { db, type CrisisItem }`).
- Write function components declared with `function Name() {}`, followed by `export default Name`.
- Use one component per file. Component files use PascalCase (`HomePage.tsx`, `CrisisCard.tsx`).
- Services export named `async` functions (see `services/offlineService.ts`).
- Style with Tailwind utility classes in `className`. There are no separate CSS files beyond `index.css`.
- Put IndexedDB access in `db/` and `services/`, not in UI components. (`IndexedDbTest.tsx` is a test page and an exception.)
- Formatting is decided by Prettier once it is set up. Until then, follow the dominant style: no semicolons, double quotes.
- `npm run lint` must pass.

Backend conventions (apply once the backend exists):

- Type hints on all functions. Docstrings on public functions, classes and modules.
- Pydantic models for request and response bodies.
- Ruff decides formatting and lint rules. `ruff check .` and `ruff format --check .` must pass.

## 8. Testing

Decided tooling:

| Layer | Tool | Location |
| --- | --- | --- |
| Frontend unit/component | Vitest + React Testing Library | `*.test.ts(x)` next to the source file |
| Dexie/IndexedDB code | Vitest + `fake-indexeddb` | same as above |
| Frontend E2E | Playwright (Node/TypeScript) | `frontend/e2e/` |
| Backend | pytest | `backend/tests/` |

- None of the tools are installed yet. Until they are, new code must at least pass `npm run lint` and `npm run build`. Describe how it was checked manually.
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
- Do not read, print or edit `.env` files. Document new variables by name only in `.env.example`, which does not exist yet.
- Anything in the frontend (including `VITE_*` env vars) ends up in the public bundle. Never put API keys or secrets there.
- Data in IndexedDB is readable on the user's device. Do not store sensitive personal data there.
- Treat data from external sources (VMA, etc.) as untrusted. Do not render it as raw HTML. Validate it in the backend with Pydantic before passing it on.

## 10. Ask before you do any of this

- Add, remove or upgrade dependencies, or change `package-lock.json` or `requirements*.txt`.
- Scaffold the backend.
- Change the Dexie schema in `frontend/src/db/db.ts`. The current schema is `version(1)`, `crisisItems: "id, title, source, fetchedAt, savedOffline"`. Changes need a new version and a migration plan.
- Change the PWA or service worker config (`VitePWA` in `vite.config.ts`, manifest, caching).
- Create or change any backend database schema.
- Add or change authentication or authorization.
- Touch deploy, hosting or CI config. None exists yet.
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
4. Before saying you are done, run lint, build and the tests that exist. Do not mark an item done if it failed or was skipped.

**When finished: the result as a checklist.** Every item from the plan appears again, ticked or explicitly not done, plus what the human needs next:

```
## Done
- [x] <each plan item, ticked or marked "not done: reason">
- [x] Lint: <actual result>
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
- Lint, typecheck and build pass. Tests pass once a runner exists.
- Existing tests for the changed code are updated and pass. New logic has tests once a test runner is set up.
- No secrets, no stray debug code, no unused files.
- Code comments and docs are in English. UI text is in Swedish.
- Docs (README or this file) are updated if behaviour, commands or structure changed.
- AGENTS.md matches the current state of the repo (see section 0).
- The PR targets `dev` and is approved by another developer.