/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      "playwright",
      "playwright-core",
      "@anthropic-ai/sdk",
      "apify-client",
      "@libsql/client",
      "drizzle-orm",
      "node-cron",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externalPackages = [
        "playwright",
        "playwright-core",
        "@playwright/test",
        "apify-client",
        "node-cron",
        "chromium-bidi",
      ];

      const nodeBuiltins = [
        "path", "fs", "crypto", "os", "child_process", "readline",
        "stream", "util", "events", "http", "https", "http2", "net",
        "tls", "zlib", "url", "querystring", "buffer", "electron",
        "worker_threads", "perf_hooks", "async_hooks",
      ];

      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        ({ request }, callback) => {
          if (
            nodeBuiltins.includes(request) ||
            externalPackages.some((pkg) => request === pkg || request.startsWith(pkg + "/"))
          ) {
            return callback(null, "commonjs " + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
