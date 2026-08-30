/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // This is a workaround for https://github.com/tailwindlabs/tailwindcss/issues/18418
    ...viteStaticCopy({
      targets: [
        {
          dest: './src/stackblitz-workaround/',
          src: '../../packages/lexical-tailwind/src/index.ts',
        },
        {
          dest: './src/stackblitz-workaround/',
          src: '../../packages/lexical-react/src/TreeViewExtension.tsx',
        },
      ],
    }),
    tailwindcss(),
  ],
});
