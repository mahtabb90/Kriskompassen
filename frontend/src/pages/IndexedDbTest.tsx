import { useState } from "react"
import { db } from "../db/db"

/**
 * Development-only page for manually verifying that IndexedDB reads, writes and deletes work.
 *
 * Available at /dev/indexeddb in development builds, outside the public navigation.
 */
function IndexedDbTest() {
  const [message, setMessage] = useState("")

  async function saveTestData() {
    await db.crisisItems.put({
      id: "test-1",
      title: "Testinformation",
      description: "Det här är ett test",
      content: "Sparad lokalt i IndexedDB",
      source: "Test",
      fetchedAt: new Date().toISOString(),
      savedOffline: true,
    })

    setMessage("Data sparad")
  }

  async function readTestData() {
    const item = await db.crisisItems.get("test-1")

    if (item) {
      setMessage(`Hittade: ${item.content}`)
    } else {
      setMessage("Ingen data hittades")
    }
  }

  async function deleteTestData() {
    await db.crisisItems.delete("test-1")
    setMessage("Testdata borttagen")
  }

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="mb-6 text-3xl font-bold text-blue-900">
        IndexedDB-test
      </h1>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={saveTestData}
          className="min-h-12 rounded-lg bg-green-800 px-4 py-3 text-white"
        >
          Spara
        </button>

        <button
          onClick={readTestData}
          className="min-h-12 rounded-lg bg-blue-900 px-4 py-3 text-white"
        >
          Läs
        </button>

        <button
          onClick={deleteTestData}
          className="min-h-12 rounded-lg bg-red-800 px-4 py-3 text-white"
        >
          Ta bort
        </button>
      </div>

      <p role="status" className="mt-6">
        {message}
      </p>
    </section>
  )
}

export default IndexedDbTest
