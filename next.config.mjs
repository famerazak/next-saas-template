import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const securityHeaders = JSON.parse(
  readFileSync(new URL("./security-headers.config.json", import.meta.url), "utf-8")
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return securityHeaders.map((profile) => ({
      source: profile.matcher,
      headers: profile.headers
    }));
  }
};

export default nextConfig;
