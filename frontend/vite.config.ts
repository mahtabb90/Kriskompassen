import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

// Single place for icon paths in public/; index.html links the same favicon and apple-touch-icon.
const icons = {
  favicon: "favicon.png",
  appleTouch: "apple-touch-icon.png",
  manifest192: "icon-192.png",
  manifest512: "icon-512.png",
  headerLogo: "kriskompassen-logo.png",
} as const

export default defineConfig({
  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      // The document-scoped updater owns registration and the user's activation choice.
      registerType: "prompt",
      injectRegister: false,
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        // The app shell; public/ images are listed explicitly in includeAssets instead of globbed,
        // so unreferenced files there are not downloaded by every installation.
        globPatterns: ["**/*.{js,css,html}"],
        // Every route is rendered client-side, so offline navigations open the precached shell.
        navigateFallback: "index.html",
      },

      // Manifest icons are precached automatically; these are the other icons the shell links.
      includeAssets: [icons.favicon, icons.appleTouch, icons.headerLogo],

      manifest: {
        // Matches the default identity (start_url) so existing installations keep theirs.
        id: "/",
        name: "KrisKompassen",
        short_name: "KrisKompassen",
        lang: "sv",

        description: "Krisinformation tillgänglig online och offline",

        // White matches the header surface; the splash screen uses the page canvas colour.
        theme_color: "#FFFFFF",
        background_color: "#D7E2EF",

        display: "standalone",

        start_url: "/",
        scope: "/",

        icons: [
          {
            src: `/${icons.manifest192}`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `/${icons.manifest512}`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
})
