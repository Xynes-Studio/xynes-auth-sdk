import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // Ensure runtime deps used by SDK are bundled when consumed via pnpm link/workspaces,
  // so apps don't need to separately install them (e.g., Next.js resolving linked dist).
  noExternal: ["dompurify"],
  treeshake: true,
  banner: {
    js: '"use client";',
  },
});
