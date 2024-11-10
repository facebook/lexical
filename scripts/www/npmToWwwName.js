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
 * @returns {string} the name of the package in www format
 */
module.exports = function npmToWwwName(name) {
  const parts = name.replace(/^@/, '').split(/\//g);
  // Handle the @lexical/react/FlatNameSpace scenario
  if (parts.length > 2) {
    parts.splice(0, parts.length - 1);
  }
  return parts
    .flatMap((part) => part.split('-'))
    .map((part) =>
      part.startsWith('useLexical')
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
};
