import IndexedDbTest from "./pages/IndexedDbTest"

function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="flex items-center gap-3 text-4xl font-bold text-blue-900">
        <img
          src="/icon-512.png"
          alt=""
          className="h-10 w-10"
        />

        KrisKompassen
      </h1>

      <p className="mt-2 text-slate-600">
        Din kompass när krisen kommer.
      </p>
      <IndexedDbTest />
    </main>
  )
}

export default App