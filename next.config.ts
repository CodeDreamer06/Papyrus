import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";
import path from "path";
// @ts-ignore - Ignore type error for next-pwa due to potential version mismatch
import withPWAInit from "next-pwa";

// Initialize next-pwa
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Always disable in development to avoid conflicts with worker scripts
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Important: return the modified config
    // Fixes pdfjs worker import issues
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(
              path.dirname(require.resolve("pdfjs-dist/package.json")),
              "build/pdf.worker.min.mjs"
            ),
            to: path.join(__dirname, "public/static"),
            // Force copy even if the file exists
            force: true
          }
        ]
      })
    );
    return config;
  },
};

// @ts-ignore - Ignore type error for next-pwa due to potential version mismatch
export default withPWA(nextConfig);
