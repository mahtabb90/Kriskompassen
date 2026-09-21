# KrisKompassen

KrisKompassen är en webbapp för krisinformation som ska kunna användas både online och offline. Användaren ska kunna spara viktig information lokalt i webbläsaren och komma åt den även utan internetanslutning.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Dexie
- IndexedDB
- vite-plugin-pwa

## PWA / offline

KrisKompassen byggs som en Progressive Web App (PWA).

Det innebär att appen kan installeras på mobil eller dator och fungera mer som en vanlig app. Appen använder en Service Worker för att cacha appens filer så att själva appen kan starta även utan internetanslutning.

Service Workern genereras och hanteras med `vite-plugin-pwa`.

Krisinformation som användaren väljer att spara offline lagras lokalt i IndexedDB via Dexie.

Kortfattat:

- Service Worker cachar appens filer för offline-användning.
- `vite-plugin-pwa` hjälper till att skapa och hantera Service Workern.
- IndexedDB lagrar krisinformation lokalt i webbläsaren.
- Dexie används för att arbeta enklare med IndexedDB.
- När internet finns kan information hämtas och uppdateras från externa källor.