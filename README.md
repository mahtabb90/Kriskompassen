<p align="center">
  <img src="frontend/public/ed80a672-8822-462b-b059-99cbfd843e2b.png" alt="Kriskompassen" width="300">
</p>

<h1 align="center">KrisKompassen</h1>

<p align="center">
  <strong>Clear guidance when it matters most — online and offline.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20development-F4C95D?style=flat-square&amp;labelColor=0B2B45" alt="Status: In development">
  <img src="https://img.shields.io/badge/Workflow-Scrum-8DCEF0?style=flat-square&amp;labelColor=0B2B45" alt="Workflow: Scrum">
  <img src="https://img.shields.io/badge/Approach-PWA-8DCEF0?style=flat-square&amp;labelColor=0B2B45" alt="Approach: Progressive Web App">
</p>

---

## 🧭 About the project

KrisKompassen is a web application in development, designed to help people quickly find clear and relevant local information during emergencies and major disruptions.

Our goal is to bring local crisis information together in one place, helping people answer three essential questions:

- **What has happened?**
- **What should I do?**
- **Where should I go?**

The planned scope includes Swedish public warning messages (VMA) and local information about situations such as floods, gas leaks and contaminated drinking water.

A key goal is to let users save important information locally and access it even when an internet connection is unavailable.

## 🚧 Project status

The project is in an early stage of development.

Our initial focus is to establish the project structure and a working development-to-deployment workflow. Features, including offline support, will be developed incrementally based on priorities and feedback.

The frontend currently includes a home page, a crisis preparedness information list and shared
navigation. The list uses the local dataset; crisis detail pages and live alerts are not implemented.

## 🛠️ Tech stack

| Technology | Purpose |
| --- | --- |
| React | Building the user interface |
| React Router | Client-side routes and shared navigation |
| TypeScript | Adding static typing to the application |
| Vite | Development server and production builds |
| Tailwind CSS | Styling the user interface |
| IndexedDB | Storing saved crisis information locally in the browser |
| Dexie | Simplifying access to IndexedDB |
| vite-plugin-pwa | PWA integration and service worker generation |

## Navigation and routes

| URL | Page |
| --- | --- |
| `/` | Home, with a link to crisis information |
| `/crisis` | Crisis information from the existing local dataset |
| `/dev/indexeddb` | Manual storage test, available only with the development server |
| Any other URL | A Swedish not-found page with links back to Home and crisis information |

The crisis cards already link to `/crisis/:id`. Those detail routes are not implemented yet, so
they currently display the not-found page. The development storage URL also displays the
not-found page in production builds and is never included in public navigation.

The same primary links appear at the bottom of mobile screens and above the page content on
wider screens. Bottom positioning applies below `48rem` viewport width and from `30rem` viewport
height. Shorter viewports use normal document flow to keep content accessible in landscape and
at high zoom. The layout measures the bar's actual height, including wrapped text and safe-area
padding, and reserves space for it.

### Extending navigation

1. Add the page component under `frontend/src/pages/` and register its route as a child of
   `AppLayout` in `frontend/src/App.tsx`.
2. Give the page exactly one `h1` with `id="page-heading"` and `tabIndex={-1}`. Use a descriptive
   Swedish heading. The shared layout uses its text for the document title and focuses it after
   pathname changes, including browser back/forward navigation. It scrolls only when needed to
   reveal the heading, keeping the header and navigation in place when the heading is visible.
   It preserves focus on initial loads and hash-only changes. The layout already supplies the
   `main` landmark.
3. For a public navigation destination, add `{ to, label, end }` to the typed `navigationItems`
   list in `frontend/src/components/BottomNavigation.tsx`. Keep Swedish labels and exact matching
   (`end: true`) unless the new route structure explicitly needs section matching.
4. Repeat the navigation, keyboard, reflow, screen-reader and offline checks below. Keep one
   navigation element across breakpoints so reading order stays consistent.

### Accessibility and manual verification

The implementation targets WCAG 2.2 AA with additional large navigation targets and strong focus
outlines. It includes a skip link, named navigation, current-page indication, a single main
landmark and route focus management. This is an implementation target, not a conformance claim;
actual screen-reader output and device behaviour must be checked manually.

Run these commands from `frontend/`:

```sh
npm run lint
npx tsc -b
npm run build
npm run dev
```

Automated unit/component and E2E test runners are not configured yet. Record browser, operating
system, assistive technology and versions alongside each manual result; leave unavailable checks
explicitly unverified.

- Navigate between **Hem** and **Krisinformation** without a full reload. Check exact active-link
  matching, direct URL entry, reload, browser back/forward and the home page's content link.
- On desktop, switch repeatedly between both navigation links using the mouse and keyboard.
  When the page heading is already visible, the scroll position must stay unchanged. Check that
  the links keep their width when the active style changes and that content keeps its horizontal
  position when a route needs a scrollbar.
- Open an unknown URL and a crisis card. Confirm that the not-found page provides working
  recovery links and no navigation link is marked current. Confirm `/dev/indexeddb` opens only
  in development.
- Test widths of 320, 390, 768, 1024 and 1440 CSS pixels, portrait and landscape, and viewport
  heights on either side of 480 CSS pixels. Check that labels wrap, the page does not scroll
  horizontally and the navigation never hides content or focus. Check an installed mobile PWA's
  safe areas on a real device when available.
- Test 200% text enlargement, 400% browser zoom and increased text spacing (1.5 line height,
  2em paragraph spacing, 0.12em letter spacing and 0.16em word spacing). Check that content and
  controls remain readable and operable. Also check forced colours/high contrast.
- With only Tab, Shift+Tab and Enter, use **Hoppa till huvudinnehållet**, both navigation links,
  recovery links and every crisis card. Verify the 3px focus outline and unobscured focus,
  especially near the bottom of the list. Initial loading must not steal focus; pathname changes
  should focus the new page heading once, while hash changes preserve the browser's behaviour.
- Using VoiceOver with Safari, find **Huvudnavigation** via landmarks, identify the current page,
  navigate using both links and verify that the new heading is announced after each route change.
  Repeat back/forward navigation and the not-found recovery flow. Test mobile VoiceOver when a
  device is available. DOM/accessibility-tree inspection alone does not verify spoken output.
- Verify navigation text contrast of at least 4.5:1, focus/state indicators of at least 3:1 and
  navigation targets of at least 48 by 48 CSS pixels. Active links use an underline and bold text
  in addition to colour.

For offline verification, run `npm run build` followed by `npm run preview`. Visit the production
preview online, wait for the service worker to activate and reload so it controls the page. Then
disable network access in browser developer tools and verify navigation and reloads at both `/`
and `/crisis`. Confirm `/dev/indexeddb` shows the not-found page in this build. A production host
must serve `index.html` for client-side routes; hosting configuration is outside this change.

Known offline limitation: the current PWA configuration does not precache
`public/kriskompassen-logo.png`. Navigation and text content can load from the service worker
while the header logo may be unavailable. Track adding that asset to the offline cache as a
separate PWA task; it requires approval before changing the service worker configuration.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/),
[React Router accessibility](https://reactrouter.com/how-to/accessibility).

## 📱 PWA and offline access

KrisKompassen is being developed as a **Progressive Web App (PWA)**, with installation and offline access as core goals.

On supported browsers and devices, users will be able to install the app on their phone or computer.

The planned offline approach separates the app itself from the information users choose to save:

### Application files

A **service worker**, generated and managed with `vite-plugin-pwa`, caches the files needed to run the app. This enables the app to open offline after those files have been cached during an online visit.

### Saved crisis information

Information that users choose to save offline is stored locally in the browser using **IndexedDB**. **Dexie** provides a simpler way to read and manage that data.

### Online updates

When an internet connection is available, information can be retrieved and refreshed from external sources.

Offline access is limited to previously cached app files and saved information. New information and updates require an internet connection.

## 👥 Team

KrisKompassen is developed by:

- Viktor
- Mahtab
- Nicklas
- Victoria
- Patrik

## 🔄 How we work

We follow an agile approach using Scrum, shared sprint goals and regular feedback.

Our workflow includes:

- **Sprint planning** — agreeing on the sprint goal and planned work.
- **Jira backlog** — tracking and prioritising upcoming work.
- **Daily stand-ups** — sharing progress and identifying blockers.
- **Feature branches and pull requests** — reviewing changes before merging them into `dev`.
- **Sprint demos** — presenting progress and gathering feedback.
- **Retrospectives** — improving how we work together.

We use English for documentation, commit messages, issues, pull requests and discussions on GitHub.

## 📁 Repository

This repository is the home for the project's source code and documentation.

`dev` is the team's shared development branch during the initial phase.

---

*Documentation is updated as the project evolves.*
