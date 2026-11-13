import type { NextConfig } from "next";

// GitHub Pages serves the site under /<repo>/ — CI sets NEXT_PUBLIC_BASE_PATH.
// Locally it is empty, so `npm run dev` still runs at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static export: no Node server, so auth/redirects run client-side and
  // all data access goes straight to Supabase (protected by RLS).
  output: "export",
  basePath,
  // `/study` → `out/study/index.html`, which GitHub Pages serves directly.
  trailingSlash: true,
  images: { unoptimized: true },
  // cacheComponents / partialPrefetching enable PPR, which `output: "export"`
  // rejects ("PPR cannot be enabled in export mode"). Nothing uses `use cache`.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
