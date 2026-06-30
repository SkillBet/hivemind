/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships modern ESM; transpile R3F ecosystem for the app compiler
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
  webpack: (config, { isServer }) => {
    // GLB/GLTF and HDR assets
    config.module.rules.push({
      test: /\.(glb|gltf|hdr|bin)$/,
      type: "asset/resource",
    });

    // Optional peer deps pulled in by the wallet SDK stack (MetaMask SDK,
    // WalletConnect logger) target react-native/pino-pretty environments we
    // don't use. Resolve them to empty modules so the browser bundle stays clean.
    const optionalExternals = [
      "@react-native-async-storage/async-storage",
      "pino-pretty",
      "react-native",
      "react-native-svg",
      "react-native-get-random-values",
    ];
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
      ...Object.fromEntries(optionalExternals.map((m) => [m, false])),
    };

    return config;
  },
  experimental: {
    // Allow server components / API routes to use Node-only crypto primitives
    serverComponentsExternalPackages: ["libsodium-wrappers"],
  },
};

export default nextConfig;
