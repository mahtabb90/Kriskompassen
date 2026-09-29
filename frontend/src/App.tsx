import { BrowserRouter, Route, Routes } from "react-router-dom"
import CrisisInfoPage from "./pages/CrisisInfoPage"
import IndexedDbTest from "./pages/IndexedDbTest"

/**
 * Renders the application root and provides routing support.
 *
 * Currently renders the IndexedDB test harness in place of the planned page layout.
 */
function App() {
  return (

    <BrowserRouter>
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="flex items-center gap-3 text-4xl font-bold text-blue-900">
          <img
            src="/kriskompassen-logo.png"
            alt="Kriskompassen logo"
            className="h-12 w-auto sm:h-16"
          />

          KrisKompassen
        </h1>

        <p className="mt-2 text-slate-600">
          Din kompass när krisen kommer.
        </p>

        <Routes>
          <Route path="/" element={<IndexedDbTest />} />
          <Route path="/crisis" element={<CrisisInfoPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App