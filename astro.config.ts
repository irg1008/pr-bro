// @ts-check
import node from "@astrojs/node";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import tunnel from "astro-tunnel";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE || "http://localhost:4321",
  base: process.env.BASE || "/",
  integrations: [
    react(),
    tunnel(),
    partytown({
      config: { forward: ["dataLayer.push"] }
    }),
    sitemap({
      filter: (page) => !page.includes("/success")
    })
  ],
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: { prefixDefaultLocale: false }
  },

  vite: {
    plugins: [tailwindcss()]
  },

  server: {
    allowedHosts: ["site.com"]
  },

  output: "server",

  adapter: node({
    mode: "standalone"
  }),

  env: {
    schema: {
      DATABASE_URL: envField.string({ context: "server", access: "secret" })
    }
  }
});
