import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { installPromptService } from "./services/installPromptService"
import { pwaUpdateService } from "./services/pwaUpdateService"

// The install event can fire before React mounts, so its listener starts first.
installPromptService.start()
pwaUpdateService.start()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
