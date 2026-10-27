/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'node:path';
import {rollup} from 'rollup';
import {expect, it} from 'vitest';

import {namedReferenceBrowserResolver} from '../../shared/namedReferenceBrowserResolver.mjs';

it('selects native reference decoding while retaining unrelated dependency bundling', async () => {
  const input = path.resolve('packages/lexical-markdown/src/decoder-probe.js');
  const bundle = await rollup({
    input,
    plugins: [
      {
        load: id =>
          id === input
            ? "export {decodeNamedCharacterReference} from 'decode-named-character-reference'; export {parse} from 'semver';"
            : null,
        name: 'decoder-test-entry',
        resolveId: id => (id === input ? input : null),
      },
      namedReferenceBrowserResolver(['.js']),
      nodeResolve(),
      commonjs(),
    ],
  });
  try {
    const {output} = await bundle.generate({format: 'es'});
    const chunk = output[0];
    expect(chunk.type).toBe('chunk');
    if (chunk.type !== 'chunk') throw new Error('Expected JavaScript output');
    const modules = Object.keys(chunk.modules);
    expect(
      modules.some(id =>
        id.endsWith('/decode-named-character-reference/index.dom.js'),
      ),
    ).toBe(true);
    expect(modules.some(id => id.includes('/character-entities/'))).toBe(false);
    expect(modules.some(id => id.includes('/semver/'))).toBe(true);
    expect(chunk.imports).not.toContain('semver');
  } finally {
    await bundle.close();
  }
});
