import { useState } from "react"
import { db } from "../db/db"

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
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">
        IndexedDB Test
      </h1>

      <div className="flex gap-3">
        <button
          onClick={saveTestData}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          Spara
        </button>

        <button
          onClick={readTestData}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Läs
        </button>

        <button
          onClick={deleteTestData}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Ta bort
        </button>
      </div>

      <p className="mt-6">{message}</p>
    </main>
  )
}

export default IndexedDbTest