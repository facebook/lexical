/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {Plugin} from 'vite';

import {createRequire} from 'node:module';
import {Target, viteStaticCopy} from 'vite-plugin-static-copy';

const require = createRequire(import.meta.url);

export default function viteCopyExcalidrawAssets(): Plugin[] {
  const targets: Target[] = [
    'excalidraw-assets',
    'excalidraw-assets-dev',
  ].flatMap((assetDir) => {
    const srcDir = `${require.resolve(
      '@excalidraw/excalidraw',
    )}/../dist/${assetDir}`;
    return [
      {
        dest: `${assetDir}/`,
        src: [`${srcDir}/*.js`, `${srcDir}/*.woff2`],
      },
      {
        dest: `${assetDir}/locales/`,
        src: [`${srcDir}/locales/*.js`],
      },
    ];
  });
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
      targets,
    }),
  ];
}
