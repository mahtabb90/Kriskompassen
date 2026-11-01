import { BrowserRouter, Route, Routes } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import DetailedCrisisCard from "./components/DetailedCrisisCard"
import { AddressProvider } from "./context/AddressProvider"
import { ModeProvider } from "./context/ModeProvider"
import CrisisInfoPage from "./pages/CrisisInfoPage"
import CrisisKitPage from "./pages/CrisisKitPage"
import HomePage from "./pages/HomePage"
import IndexedDbTest from "./pages/IndexedDbTest"
import MyInfoPage from "./pages/MyInfoPage"
import NotFoundPage from "./pages/NotFoundPage"
import ShelterDetailPage from "./pages/ShelterDetailPage"
import ShelterMapPage from "./pages/ShelterMapPage"
import ShelterPage from "./pages/ShelterPage"

/**
 * Registers public pages and the development-only storage test within the shared layout.
 *
 * `/crisis` and `/crisis/:id` render different data depending on the selected online/offline
 * mode from `ModeProvider`, rather than having separate offline routes.
 */
function App() {
  return (
    <ModeProvider>
      <AddressProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/crisis" element={<CrisisInfoPage />} />
              <Route path="/crisis-kit" element={<CrisisKitPage />} />
              <Route path="/crisis/:id" element={<DetailedCrisisCard />} />
              <Route path="/skyddsrum" element={<ShelterPage />} />
              <Route path="/skyddsrum/karta" element={<ShelterMapPage />} />
              <Route path="/skyddsrum/:id" element={<ShelterDetailPage />} />
              <Route path="/min-info" element={<MyInfoPage />} />
              {import.meta.env.DEV && <Route path="/dev/indexeddb" element={<IndexedDbTest />} />}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AddressProvider>
    </ModeProvider>
  )
}

export default App
