import { BrowserRouter, Route, Routes } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import DetailedCrisisCard from "./components/DetailedCrisisCard"
import { ModeProvider } from "./context/ModeProvider"
import CrisisInfoPage from "./pages/CrisisInfoPage"
import HomePage from "./pages/HomePage"
import IndexedDbTest from "./pages/IndexedDbTest"
import NotFoundPage from "./pages/NotFoundPage"

/**
 * Registers public pages and the development-only storage test within the shared layout.
 *
 * `/crisis` and `/crisis/:id` render different data depending on the selected online/offline
 * mode from `ModeProvider`, rather than having separate offline routes.
 */
function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/crisis" element={<CrisisInfoPage />} />
            <Route path="/crisis/:id" element={<DetailedCrisisCard />} />
            {import.meta.env.DEV && <Route path="/dev/indexeddb" element={<IndexedDbTest />} />}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  )
}

export default App
