import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  // Rebuilding produces a new, visible identifier even when the same commit is redeployed.
  define: { __APP_BUILD_ID__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      // The document-scoped updater owns registration and the user's activation choice.
      registerType: "prompt",
      injectRegister: false,
      workbox: { skipWaiting: false, clientsClaim: true },

      // The header logo is separate from the manifest icons cached automatically.
      includeAssets: ["kriskompassen-logo.png"],

      manifest: {
        name: "KrisKompassen",
        short_name: "KrisKompassen",

        description: "Krisinformation tillgänglig online och offline",

        theme_color: "#ffffff",
        background_color: "#ffffff",

        display: "standalone",

        start_url: "/",

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
})
