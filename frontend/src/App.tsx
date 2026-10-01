import { BrowserRouter, Route, Routes } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import DetailedCrisisCard from "./components/DetailedCrisisCard"
import CrisisInfoPage from "./pages/CrisisInfoPage"
import HomePage from "./pages/HomePage"
import IndexedDbTest from "./pages/IndexedDbTest"
import NotFoundPage from "./pages/NotFoundPage"

/**
 * Registers public pages and the development-only storage test within the shared layout.
 */
function App() {
  return (
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
  )
}

export default App
