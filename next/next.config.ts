import type { NextConfig } from "next";

/**
 * Static export configuration for GitHub Pages hosting.
 *
 * See ADR-3 in the repo root README: the Next.js port uses static
 * export. Any future addition of a server route or server action is a
 * deliberate break of ADR-1 (no server) and must come with updated
 * hosting paperwork.
 *
 * basePath targets the GitHub Pages URL path for this repo:
 *   https://<user>.github.io/DRRS-P-Level-tool/
 */
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd ? "/DRRS-P-Level-tool" : "",
  // Static export cannot run the Image Optimization API.
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
