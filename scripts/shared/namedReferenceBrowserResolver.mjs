/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check

import nodeResolve from '@rollup/plugin-node-resolve';

/**
 * @param {string[]} extensions
 * @returns {import('rollup').Plugin}
 */
export function namedReferenceBrowserResolver(extensions) {
  const resolver = nodeResolve({
    exportConditions: ['browser'],
    extensions,
    preferBuiltins: false,
  });
  const hook = resolver.resolveId;
  return {
    ...resolver,
    resolveId: {
      handler(source, importer, options) {
        // resolveOnly marks other packages external. Return null instead so
        // their existing resolver and conditions remain in control.
        if (source !== 'decode-named-character-reference') return null;
        return typeof hook === 'function'
          ? hook.call(this, source, importer, options)
          : hook === undefined
            ? null
            : hook.handler.call(this, source, importer, options);
      },
      order: 'post',
    },
  };
}
