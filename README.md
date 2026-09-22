<p align="center">
  <img src="frontend/public/ed80a672-8822-462b-b059-99cbfd843e2b.png" alt="Kriskompassen" width="300">
</p>

<h1 align="center">Kriskompassen</h1>

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

Kriskompassen is a web application in development, designed to help people quickly find clear and relevant local information during emergencies and major disruptions.

Our goal is to bring local crisis information together in one place, helping people answer three essential questions:

- **What has happened?**
- **What should I do?**
- **Where should I go?**

The planned scope includes Swedish public warning messages (VMA) and local information about situations such as floods, gas leaks and contaminated drinking water.

A key goal is to let users save important information locally and access it even when an internet connection is unavailable.

## 🚧 Project status

The project is in an early stage of development.

Our initial focus is to establish the project structure and a working development-to-deployment workflow. Features, including offline support, will be developed incrementally based on priorities and feedback.

## 🛠️ Tech stack

| Technology | Purpose |
| --- | --- |
| React | Building the user interface |
| TypeScript | Adding static typing to the application |
| Vite | Development server and production builds |
| Tailwind CSS | Styling the user interface |
| IndexedDB | Storing saved crisis information locally in the browser |
| Dexie | Simplifying access to IndexedDB |
| vite-plugin-pwa | PWA integration and service worker generation |

## 📱 PWA and offline access

Kriskompassen is being developed as a **Progressive Web App (PWA)**, with installation and offline access as core goals.

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

Kriskompassen is developed by:

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