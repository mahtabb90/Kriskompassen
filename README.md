<p align="center">
  <img src="frontend/public/kriskompassen-logo.png"
      alt="Kriskompassen" width="220">
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

The current version includes a home page, crisis preparedness summaries and detailed articles
based on manually maintained preparedness information from Krisinformation.se. Online articles
are delivered by the project’s server; this is not an automatic news feed. Users can save and
remove articles locally for offline access, and turn on a visible, keyboard-accessible
"Sparad information" (saved information) switch to read only what is stored on the device.
Losing the internet connection turns the switch on automatically, with an explanation; turning
it off again is always a manual choice.

A banner can display an active public warning from Sveriges Radio across the app's pages.
If several warnings are active, it shows the most recent message and indicates that others exist.
Selecting the banner's title opens the full warning with instructions, affected areas, source
and the message's issue or update time. Users can close it and return to the page they were reading.
The app reports when warning information is unavailable or may be outdated, shows when it was
last checked and offers a retry. While the app is open it checks for new warnings regularly,
pauses while offline and checks again when the connection returns. Warnings are not stored for
offline use.

On the "Min info" page, users can save one or more addresses — for example home and work — by
typing each one, pasting coordinates (for example copied from another map service), or
requesting their device's position. A fetched position or a pasted coordinate pair is
reverse-geocoded into a readable address and clearly marked as approximate, and can be corrected
or looked up again at any time. Location permission is only requested when the user chooses to
use it, and a denied permission, timeout or unsupported browser leaves manual entry available
with a clear explanation.
Each saved address can be labelled (home, work, or a custom label) and one is marked as the active
address, shown as a discreet link in the header; saved addresses remain available between visits
and are the starting point for finding nearby shelters, below.

On the "Skyddsrum" page, users see the 5 civil-defense shelters nearest to their active address,
sorted closest first. Shelter data comes from Myndigheten för civilt försvar (MCF), the Swedish
authority responsible for the national shelter register, through its open WFS / OGC API Features
service (GeoJSON, delivered directly in WGS84 coordinates); the dataset's
[Geodataportalen metadata record](https://www.geodata.se/geodataportalen/srv/swe/catalog.search#/metadata/6341813c-bfa3-45df-8234-13cf583bf533)
states no access or reuse restrictions apply. The backend widens its search radius around the
active address until enough shelters are found, and shelters fetched this way are cached on the
device so a previously searched area remains available offline. Since MCF's source data has no
postal address, each shelter is shown by its free-text location description together with the
active address's municipality, worded as a location description rather than a verified address.
MCF genuinely registers several separate shelters under one shared property - sometimes with the
same coordinates and capacity too - so each shelter also shows its own official number (matching
the number physically posted at its entrance) to stay distinguishable, plus a link to its exact
position on a map, since the location description alone is not enough to actually find it.
If no address is active yet, or the active address has no coordinates (a manually typed address
is never geocoded), the page prompts the user to set one on "Min info" instead.

Saving a geolocated address also fetches and caches its nearest shelters in the background right
away, without the user needing to visit "Skyddsrum" first. This runs silently and never blocks or
fails the address save itself; it exists so that addresses saved ahead of a crisis already have
their nearby shelters available offline even if MCF's service later becomes unreachable.

## 🛠️ Tech stack

| Technology      | Purpose                                                 |
| --------------- | ------------------------------------------------------- |
| React           | Building the user interface                             |
| React Router    | Navigation between pages                                |
| TypeScript      | Adding static typing to the application                 |
| Vite            | Development server and production builds                |
| Tailwind CSS    | Styling the user interface                              |
| IndexedDB       | Storing saved crisis information locally in the browser |
| Dexie           | Simplifying access to IndexedDB                         |
| vite-plugin-pwa | PWA integration and service worker generation           |
| Python / FastAPI | Serving preparedness articles and retrieving public warnings |
| Pydantic        | Validating external API response structure              |

## Run locally

### Requirements

- Node.js **24.x** with npm (the version used by the project is recorded in `frontend/.nvmrc`).
- Python **3.13** (recorded in `backend/.python-version`).
- A modern web browser.

Download and extract the repository, or clone it, then open **two terminals in the project root**
(the folder containing `frontend/` and `backend/`). Both servers must keep running while you use
the app. No database, API key or `.env` file is needed for the default local setup.
Installing dependencies, fetching live warnings and resolving a device position require internet access.

### 1. Install and start the backend

On **macOS or Linux**, ensure `python3` selects Python 3.13, then run:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn src.app:app --reload --port 8000
```

On **Windows PowerShell**, run:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn src.app:app --reload --port 8000
```

The Windows commands use the virtual environment's Python directly, so activation is not needed.
The backend listens on port **8000**. Open [the API documentation](http://localhost:8000/docs)
to inspect its endpoints.

### 2. Install and start the frontend

In the **second terminal**, starting in the project root, run the commands for your shell.

**macOS or Linux:**

```sh
cd frontend
npm ci
VITE_API_BASE_URL=http://localhost:8000 npm run dev -- --port 5173 --strictPort
```

**Windows PowerShell:**

```powershell
cd frontend
npm ci
$env:VITE_API_BASE_URL = "http://localhost:8000"
npm run dev -- --port 5173 --strictPort
```

Open [http://localhost:5173](http://localhost:5173) to use the app. The frontend connects to the
local backend on port 8000. Port 5173 matches the backend's default allowed browser origins;
`--strictPort` stops Vite from silently choosing another port if it is already occupied.

### Stopping and starting again

Press **Ctrl+C** in each terminal to stop the servers. On later runs, reuse `.venv` and skip the
environment creation and dependency installation steps unless dependencies have changed.
On macOS/Linux, activate `.venv` again before starting the backend in a new terminal.

The development server does not install the production service worker. PWA installation and
opening the whole app offline require a production build; previously saved articles can still
be viewed by turning on the "Sparad information" switch during development.

For configuration, alternative ports and further development instructions, see the
[backend development guide](backend/DEVELOPMENT.md).

## Navigation and accessibility

The main navigation links to **Hem** (Home), **Krisinformation** (Crisis information),
**Min krislåda** (My emergency kit) and **Min info** (My information), and clearly marks the
current page. On phones, the bottom menu scrolls sideways when its links do not fit; users
can swipe or select the visible left/right arrows to reach more pages. Larger screens keep
the navigation above the page content.

Keyboard navigation includes a link to skip directly to the page content and visible focus
indicators. Pages have descriptive headings and titles.

Accessibility remains an ongoing goal. Compatibility with screen readers and other assistive
technology has not yet been fully verified.

## 📱 PWA and offline access

KrisKompassen is being developed as a **Progressive Web App (PWA)**, with installation and offline access as core goals.

On supported browsers and devices, users can install the app on their phone or computer. Where the
browser supports it, KrisKompassen shows an **Installera app** button: in the header below
**Sparad information** on wider screens and last in the **Meny** on phones. It is not shown once the
app is installed or when it already runs as an installed app. Users can also use the browser's own
install feature:

- **Chrome and Edge (desktop and Android):** the install option in the address bar or browser menu.
- **Safari on iPhone and iPad:** Share → **Add to Home Screen**.
- **Safari on macOS:** File → **Add to Dock**.

The installed app opens as KrisKompassen in its own window, without browser controls. It currently
uses the KrisKompassen logo as its icon; a maskable icon variant, which lets Android adapt the icon
to different shapes, is still pending.

Once the app has been opened online, it also starts without an internet connection. If the browser
blocks app storage, for example under strict privacy settings, the app still works online but
cannot open offline.

When connected, the app checks for new app versions when opened or brought back to the foreground.
Once an update is ready, it offers **Uppdatera appen**. Users can continue reading until they choose
to reload with the new version; saved articles remain on the device. Failed update checks do not
block use, and a fully downloaded update can be selected offline. A waiting version can also
become active after the app is completely closed.

Older installations without this update message may need an online opening followed by a full
close and reopening of the app to receive the feature. This keeps the existing installation and
saved information. The update message becomes available once the new app code has loaded.
Verification of this upgrade path on an existing iPhone installation is pending.

The planned offline approach separates the app itself from the information users choose to save:

### Application files

A **service worker**, generated and managed with `vite-plugin-pwa`, caches the files needed to run the app. This enables the app to open offline after those files have been cached during an online visit.

### Saved crisis information

Information that users choose to save offline is stored locally in the browser using **IndexedDB**. **Dexie** provides a simpler way to read and manage that data.

### Online updates

Returning to online mode fetches the current articles from the server. If they cannot be retrieved,
the app shows an explanation and offers a retry. Previously saved offline copies remain as saved;
they are not automatically replaced by online updates.

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
- **Automated checks** — linting, formatting, tests and builds run automatically on pull requests for the parts of the project that changed.
- **Sprint demos** — presenting progress and gathering feedback.
- **Retrospectives** — improving how we work together.

We use English for documentation, commit messages, issues, pull requests and discussions on GitHub.

## 📁 Repository

This repository is the home for the project's source code and documentation.

`dev` is the team's shared development branch during the initial phase.

---

_Documentation is updated as the project evolves._
