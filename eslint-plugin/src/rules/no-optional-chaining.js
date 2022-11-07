/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  create(context) {
    const sourceCode = context.getSourceCode();

    /**
     * Checks if the given token is a `?.` token or not.
     * @param {Token} token The token to check.
     * @returns {boolean} `true` if the token is a `?.` token.
     */
    function isQuestionDotToken(token) {
      return (
        token.value === '?.' &&
        (token.type === 'Punctuator' || // espree has been parsed well.
          // espree@7.1.0 doesn't parse "?." tokens well. Therefore, get the string from the source code and check it.
          sourceCode.getText(token) === '?.')
      );
    }

    return {
      'CallExpression[optional=true]'(node) {
        context.report({
          messageId: 'forbidden',
          node: sourceCode.getTokenAfter(node.callee, isQuestionDotToken),
        });
      },
      'MemberExpression[optional=true]'(node) {
        context.report({
          messageId: 'forbidden',
          node: sourceCode.getTokenAfter(node.object, isQuestionDotToken),
        });
      },
    };
  },
  meta: {
    docs: {
      description: 'disallow optional chaining',
      recommended: true,
    },
    messages: {
      forbidden: 'Avoid using optional chaining',
    },
    schema: [],
    type: 'problem',
  },
};
