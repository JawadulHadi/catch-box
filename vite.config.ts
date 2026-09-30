import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  server: { port: 8080 },
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  plugins: [
    tailwindcss(),
    // src/server.ts wraps TanStack Start's handler with our SSR error page.
    tanstackStart({ server: { entry: "server" } }),
    // Builds the deployable server. Nitro detects Vercel during a Vercel build and
    // writes .vercel/output; anywhere else it builds a Node server in .output.
    command === "build" && nitro(),
    viteReact(),
  ],
}));
