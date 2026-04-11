/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import react from '@vitejs/plugin-react';
import {request as httpRequest} from 'node:http';
import {createRequire} from 'node:module';
import {defineConfig, type Plugin} from 'vite';

import viteMonorepoResolutionPlugin from '../shared/lexicalMonorepoPlugin';
import viteCopyEsm from './viteCopyEsm';
import viteCopyExcalidrawAssets from './viteCopyExcalidrawAssets';

const require = createRequire(import.meta.url);

/**
 * Vite plugin that proxies /api/ai requests to a configurable target.
 *
 * Set the VITE_AI_PROXY_TARGET environment variable to enable:
 *   VITE_AI_PROXY_TARGET=https://api.anthropic.com pnpm run dev
 *
 * If the variable is not set, the plugin is a no-op.
 */
function aiProxyPlugin(): Plugin {
  const target = process.env.VITE_AI_PROXY_TARGET;
  if (!target) {
    return {name: 'ai-proxy-noop'};
  }

  const targetURL = new URL(target);

  return {
    configureServer(server) {
      server.middlewares.use('/api/ai', (req, res) => {
        const targetPath = req.url || '/';

        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          const proxyReq = httpRequest(
            {
              headers: {
                'anthropic-version':
                  (req.headers['anthropic-version'] as string) || '2023-06-01',
                'content-type':
                  (req.headers['content-type'] as string) || 'application/json',
                host: targetURL.host,
                ...(req.headers['x-api-key']
                  ? {'x-api-key': req.headers['x-api-key'] as string}
                  : {}),
              },
              hostname: targetURL.hostname,
              method: req.method,
              path: targetPath,
              port:
                targetURL.port || (targetURL.protocol === 'https:' ? 443 : 80),
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
              proxyRes.pipe(res);
            },
          );

          proxyReq.on('error', (err) => {
            res.writeHead(502);
            res.end(JSON.stringify({error: err.message}));
          });

          proxyReq.write(body);
          proxyReq.end();
        });
      });
    },
    name: 'ai-proxy',
  };
}

// https://vitejs.dev/config/
export default defineConfig(({mode}) => ({
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        split: new URL('./split/index.html', import.meta.url).pathname,
      },
    },
    ...(mode === 'production' && {
      minify: 'terser',
      terserOptions: {
        compress: {
          toplevel: true,
        },
        keep_classnames: true,
      },
    }),
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
      treeShaking: true,
    },
  },
  plugins: [
    aiProxyPlugin(),
    viteMonorepoResolutionPlugin(),
    babel({
      babelHelpers: 'bundled',
      babelrc: false,
      configFile: false,
      exclude: '**/node_modules/**',
      extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
      plugins: [
        '@babel/plugin-transform-flow-strip-types',
        ...(mode !== 'production'
          ? [
              [
                require('../../scripts/error-codes/transform-error-messages'),
                {
                  noMinify: true,
                },
              ],
            ]
          : []),
      ],
      presets: [['@babel/preset-react', {runtime: 'automatic'}]],
    }),
    react(),
    ...viteCopyExcalidrawAssets(),
    viteCopyEsm(),
    commonjs({
      // This is required for React 19 (at least 19.0.0-beta-26f2496093-20240514)
      // because @rollup/plugin-commonjs does not analyze it correctly
      strictRequires: [/\/node_modules\/(react-dom|react)\/[^/]\.js$/],
    }),
  ],
}));
