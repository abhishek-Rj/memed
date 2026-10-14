import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  /* config options here */
  experimental: {
    agentFeedback: true,
    useTypeScriptCli: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.join(process.cwd(), ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
