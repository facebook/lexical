/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the MIT license. See LICENSE file in the root directory.
 */

'use strict';

const { packagesManager } = require('../shared/packagesManager');
const npmToWwwName = require('./npmToWwwName');
const { t, transform } = require('hermes-transform');
const prettier = require('prettier');

// Generate mappings for npm module names to www equivalents
const wwwMappings = Object.fromEntries(
  packagesManager
    .getPublicPackages()
    .flatMap(pkg => pkg.getExportedNpmModuleNames().map(npm => [npm, npmToWwwName(npm)]))
);

const prettierConfig = prettier.resolveConfig('./').then(cfg => cfg || {});

/**
 * Adds a workaround statement to preserve comments during transformation.
 * @param {string} code - Source code to be wrapped.
 * @returns {string} - Wrapped code.
 */
const wrapCode = (code) => `${code}\nexport {};\n`;

/**
 * Removes the workaround statement added by wrapCode.
 * @param {string} code - Transformed code to be unwrapped.
 * @returns {string} - Unwrapped code.
 */
const unwrapCode = (code) => code.replace(/\n+export {};\n?$/, '\n');

/**
 * Transforms Flow file contents by updating imports and comments.
 * @param {string} source - Input source code.
 * @returns {Promise<string>} - Transformed source code.
 */
module.exports = async function transformFlowFileContents(source) {
  const transformedSource = await transform(
    wrapCode(source),
    (context) => ({
      ImportDeclaration(node) {
        const newValue = wwwMappings[node.source.value];
        if (newValue) {
          context.replaceNode(node.source, t.StringLiteral({ value: newValue }));
        }
      },
      Program(node) {
        if (node.docblock?.comment?.value.includes('@flow strict')) {
          // Update comments with additional metadata
          node.docblock.comment.value = node.docblock.comment.value.replace(
            / \* @flow strict/g,
            ' * @flow strict\n * @generated\n * @oncall lexical_web_text_editor'
          );
          // Ensure mutations are registered
          context.removeComments(t.LineComment({ value: '' }));
        }
      },
    }),
    await prettierConfig
  );

  return unwrapCode(transformedSource);
};
