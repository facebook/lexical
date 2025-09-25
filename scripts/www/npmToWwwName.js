/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

/**
 * Converts a package name in the npm name convention to the www
 * convention, e.g.:
 * '@lexical/rich-text' -> 'LexicalRichText'
 * '@lexical/react/LexicalComposer' -> 'LexicalComposer'
 * '@lexical/react/useLexicalEditor' -> 'useLexicalEditor'
 *
 * @param {string} name the npm or directory name of a package
 * @param {boolean} [forTypes] true to match the name that typescript will produce
 * @returns {string} the name of the package in www format
 */
module.exports = function npmToWwwName(name, forTypes = false) {
  let parts = name.replace(/^@/, '').split(/\//g);

  // Handle the @lexical/react/FlatNameSpace scenario
  if (name.startsWith('@lexical/react/')) {
    const lastPart = parts[parts.length - 1];
    if (forTypes) {
      parts = [lastPart];
    } else if (lastPart.match(/^(use)?lexical/i)) {
      parts = [lastPart];
    } else if (lastPart.startsWith('use')) {
      parts = ['useLexical', lastPart.replace(/^use/, '')];
    } else {
      parts = ['lexical', lastPart];
    }
  }
  return parts
    .flatMap((part) => part.split('-'))
    .map((part) =>
      /^use[A-Z]/.test(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
};
