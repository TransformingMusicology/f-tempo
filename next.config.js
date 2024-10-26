/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

import { withSentryConfig } from "@sentry/nextjs";

const sentryNextConfig = withSentryConfig(
  nextConfig,
  {
    org: "alastair-corp",
    project: "f-tempo",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,
    widenClientFileUpload: true,

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);

export default sentryNextConfig;
