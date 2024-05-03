/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {packagesManager} = require('../shared/packagesManager');
const npmToWwwName = require('./npmToWwwName');
const {t, transform} = require('hermes-transform');
const prettier = require('prettier');

const wwwMappings = Object.fromEntries(
  packagesManager
    .getPublicPackages()
    .flatMap((pkg) =>
      pkg.getExportedNpmModuleNames().map((npm) => [npm, npmToWwwName(npm)]),
    ),
);

const prettierConfig = prettier.resolveConfig('./').then((cfg) => cfg || {});

/**
 * Add a statement to the end of the code so the comments don't
 * disappear. This is a workaround for a hermes transform issue.
 *
 * @param {string} code
 */
function wrapCode(code) {
  return [code, 'export {};\n'].join('\n');
}

/**
 * The inverse transform of wrapCode, removes the added statement.
 *
 * @param {string} code
 */
function unwrapCode(code) {
  return code.replace(/\n+export {};\n?$/, '\n');
}

/**
 * It would be nice to use jscodeshift for this but the flow sources are using
 * ast features that are not supported in ast-types (as of 2024-04-11) so it's
 * not possible to traverse the tree and replace the imports & comments.
 *
 * It might be possible going straight to flow-parser, but it was a slew of
 * hardcoded regexps before and now it's at least automated based on the
 * exports.
 *
 * @param {string} source
 * @returns {Promise<string>} transformed source
 */
module.exports = async function transformFlowFileContents(source) {
  return unwrapCode(
    await transform(
      wrapCode(source),
      (context) => ({
        ImportDeclaration(node) {
          const value = wwwMappings[node.source.value];
          if (value) {
            context.replaceNode(node.source, t.StringLiteral({value}));
          }
        },
        Program(node) {
          if (
            node.docblock &&
            node.docblock.comment &&
            node.docblock.comment.value.includes('@flow strict')
          ) {
            // This is mutated in-place because I couldn't find a mutation that
            // did not fail for replacing the Program node.
            node.docblock.comment.value = node.docblock.comment.value.replace(
              / \* @flow strict/g,
              ' * @flow strict\n * @generated\n * @oncall lexical_web_text_editor',
            );
            // We need the mutations array to be non-empty, so remove something
            // that is not there. The AST traversals use object identity in a
            // Set so we don't have to worry about some other line changing.
            context.removeComments(t.LineComment({value: ''}));
          }
        },
      }),
      await prettierConfig,
    ),
  );
};
