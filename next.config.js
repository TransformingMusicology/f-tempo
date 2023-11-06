/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

import { withSentryConfig } from "@sentry/nextjs";

const sentryNextConfig = withSentryConfig(
  nextConfig,
  {
    // Suppresses source map uploading logs during build
    silent: true,
    org: "alastair-corp",
    project: "f-tempo",
  },
  {
    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,
    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: false,
    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",
    // Hides source maps from generated client bundles
    hideSourceMaps: true,
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);

export default sentryNextConfig;
