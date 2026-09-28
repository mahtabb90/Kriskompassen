import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      // Activates a new service worker as soon as it's ready, so users get updated
      // app files on the next load instead of being stuck on a stale offline cache.
      registerType: "autoUpdate",

      manifest: {
        name: "KrisKompassen",
        short_name: "KrisKompassen",

        description:
          "Krisinformation tillgänglig online och offline",

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