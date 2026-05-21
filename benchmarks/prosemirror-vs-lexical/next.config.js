const path = require('path');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const reactRoot = path.dirname(require.resolve('react/package.json'));
const reactDomRoot = path.dirname(require.resolve('react-dom/package.json'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  typescript: {
    // The benchmark mixes React 18 with @types/react that pnpm hoists to 19
    // via lexical-react's transitive deps. The runtime is React 18 — skip the
    // type-check during next build so the perf run isn't blocked by it.
    ignoreBuildErrors: true,
  },
  webpack: config => {
    // The @lexical/* packages live in this monorepo's packages/<pkg>/npm
    // directories and are consumed via pnpm's link: protocol. Webpack
    // resolves symlinks to their real path by default, which then walks up
    // looking for node_modules from packages/<pkg>/npm rather than the
    // benchmark's own node_modules — breaking transitive resolutions and
    // duplicating React. Disable symlink resolution and pin react to a
    // single copy so hooks share one dispatcher instance across @lexical
    // and the app.
    config.resolve.symlinks = false;
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: reactRoot,
      'react-dom': reactDomRoot,
      'react/jsx-runtime': path.join(reactRoot, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(reactRoot, 'jsx-dev-runtime.js'),
    };
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
