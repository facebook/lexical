/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';
// @ts-check

const fs = require('fs-extra');
const ErrorMap = require('./ErrorMap');
const evalToString = require('./evalToString');
const helperModuleImports = require('@babel/helper-module-imports');
const prettierSync = require('@prettier/sync');

/** @type {Map<string, ErrorMap>} */
const errorMaps = new Map();
/**
 * Get a module-global ErrorMap instance so that all instances of this
 * plugin are working with the same data structure. Typically there is
 * at most one entry in this map (`${__dirname}/codes.json`).
 *
 * @param {string} filepath
 * @returns {ErrorMap}
 */
function getErrorMap(filepath) {
  let errorMap = errorMaps.get(filepath);
  if (!errorMap) {
    const prettierConfig = {
      ...(prettierSync.resolveConfig('./') || {}),
      filepath,
    };
    errorMap = new ErrorMap(fs.readJsonSync(filepath), (newErrorMap) =>
      fs.writeFileSync(
        filepath,
        prettierSync.format(JSON.stringify(newErrorMap), prettierConfig),
      ),
    );
    errorMaps.set(filepath, errorMap);
  }
  return errorMap;
}

/**
 * @typedef {Object} TransformErrorMessagesOptions
 * @property {string} errorCodesPath
 * @property {boolean} extractCodes
 * @property {boolean} noMinify
 */

/**
 * @param {import('@babel/core')} babel
 * @param {Partial<TransformErrorMessagesOptions>} opts
 * @returns {import('@babel/core').PluginObj}
 */
module.exports = function (babel, opts) {
  const t = babel.types;
  const errorMap = getErrorMap(
    (opts && opts.errorCodesPath) || `${__dirname}/codes.json`,
  );
  return {
    visitor: {
      CallExpression(path, file) {
        const node = path.node;
        const {extractCodes, noMinify} =
          /** @type Partial<TransformErrorMessagesOptions> */ (file.opts);
        if (path.get('callee').isIdentifier({name: 'invariant'})) {
          // Turns this code:
          //
          // invariant(condition, 'A %s message that contains %s', adj, noun);
          //
          // into something equivalent to this:
          //
          // if (!condition) {
          //   if (__DEV__ || ERR_CODE === undefined) {
          //     formatDevErrorMessage(`A ${adj} message that contains ${noun}`);
          //   } else {
          //     formatProdErrorMessage(ERR_CODE, adj, noun)
          //   };
          // }
          //
          // where ERR_CODE is an error code: a unique identifier (a number
          // string) that references a verbose error message. The mapping is
          // stored in `scripts/error-codes/codes.json`.
          const condition = node.arguments[0];
          const errorMsgLiteral = evalToString(node.arguments[1]);
          const errorMsgExpressions = Array.from(node.arguments.slice(2));
          const errorMsgQuasis = errorMsgLiteral
            .split('%s')
            .map((raw) => t.templateElement({cooked: String.raw({raw}), raw}));

          // Outputs:
          //   `A ${adj} message that contains ${noun}`;
          const devMessage = t.templateLiteral(
            errorMsgQuasis,
            errorMsgExpressions,
          );

          const parentStatementPath = path.parentPath;
          if (parentStatementPath.type !== 'ExpressionStatement') {
            throw path.buildCodeFrameError(
              'invariant() cannot be called from expression context. Move ' +
                'the call to its own statement.',
            );
          }

          // We extract the prodErrorId even if we are not using it
          // so we can extractCodes in a non-production build.
          let prodErrorId = errorMap.getOrAddToErrorMap(
            errorMsgLiteral,
            extractCodes,
          );

          /** @type {babel.types.CallExpression} */
          let callExpression;
          if (noMinify || prodErrorId === undefined) {
            // Error minification is disabled for this build.
            //
            // Outputs:
            //   if (!condition) {
            //     formatDevErrorMessage(`A ${adj} message that contains ${noun}`);
            //   }
            const formatDevErrorMessageIdentifier =
              helperModuleImports.addDefault(
                path,
                'shared/formatDevErrorMessage',
                {
                  nameHint: 'formatDevErrorMessage',
                },
              );
            callExpression = t.callExpression(formatDevErrorMessageIdentifier, [
              devMessage,
            ]);
          } else {
            // Error minification enabled for this build.
            //
            // Outputs:
            // if (!condition) {
            //   formatProdErrorMessage(ERR_CODE, adj, noun)
            // }

            // Import ReactErrorProd
            const formatProdErrorMessageIdentifier =
              helperModuleImports.addDefault(
                path,
                'shared/formatProdErrorMessage',
                {
                  nameHint: 'formatProdErrorMessage',
                },
              );

            // Outputs:
            //   formatProdErrorMessage(ERR_CODE, adj, noun);
            callExpression = t.callExpression(
              formatProdErrorMessageIdentifier,
              [t.numericLiteral(prodErrorId), ...errorMsgExpressions],
            );
          }

          parentStatementPath.replaceWith(
            t.ifStatement(
              t.unaryExpression('!', condition),
              t.blockStatement([t.expressionStatement(callExpression)]),
            ),
          );

          if (!noMinify && prodErrorId === undefined) {
            // There is no error code for this message. Add an inline comment
            // that flags this as an unminified error. This allows the build
            // to proceed, while also allowing a post-build linter to detect it.
            //
            // Outputs:
            //   /* FIXME (minify-errors-in-prod): Unminified error message in production build! */
            //   if (!condition) {
            //     formatDevErrorMessage(`A ${adj} message that contains ${noun}`);
            //   }
            parentStatementPath.addComment(
              'leading',
              'FIXME (minify-errors-in-prod): Unminified error message in production build!',
            );
          }
        }
      },
    },
  };
};
