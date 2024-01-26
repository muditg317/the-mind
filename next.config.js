/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  compiler: {
    styledComponents: true
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "https://ideal-space-tribble-q49v64jg492gw4-3000.app.github.dev",
        "https://ideal-space-tribble-q49v64jg492gw4-*.app.github.dev",
      ]
    }
  }
};

export default config;
