/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {Plugin} from 'vite';

import {createRequire} from 'node:module';
import * as path from 'node:path';
import {normalizePath} from 'vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';

const require = createRequire(import.meta.url);

export default function viteCopyExcalidrawAssets(): Plugin[] {
  return [
    {
      config() {
        return {
          define: {
            'process.env.EXCALIDRAW_ASSET_PATH': JSON.stringify('/'),
          },
        };
      },
      name: 'viteCopyExcalidrawAssets',
    },
    ...viteStaticCopy({
      targets: [
        {
          dest: `./`,
          src: normalizePath(
            path.join(require.resolve('@excalidraw/excalidraw'), '..', 'fonts'),
          ),
        },
      ],
    }),
  ];
}
