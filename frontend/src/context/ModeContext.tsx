import { useEffect, useRef, useState, type ReactNode } from "react"
import { ModeContext, type Mode } from "./modeContext"

/**
 * Tracks the user's selected online/offline mode separately from browser-reported network
 * connectivity.
 *
 * Starts in offline mode if the browser is already offline on load. Forces offline mode and
 * surfaces an explanation when the connection is lost while online mode was selected. Does not
 * switch back automatically when the connection returns; the user chooses that themselves.
 * Selecting online mode while offline has no effect.
 */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [mode, setModeState] = useState<Mode>(() => (navigator.onLine ? "online" : "offline"))
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null)
  const modeRef = useRef(mode)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
      if (modeRef.current === "online") {
        setModeState("offline")
        setAutoSwitchNotice("Internetanslutningen försvann, så du har växlats till offline-läge.")
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  function setMode(next: Mode) {
    if (next === "online" && !isOnline) return
    setModeState(next)
  }

  function dismissAutoSwitchNotice() {
    setAutoSwitchNotice(null)
  }

  return (
    <ModeContext.Provider
      value={{ mode, isOnline, autoSwitchNotice, setMode, dismissAutoSwitchNotice }}
    >
      {children}
    </ModeContext.Provider>
  )
}
