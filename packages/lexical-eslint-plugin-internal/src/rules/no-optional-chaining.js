/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Checks if the given token is a `?.` token or not.
     * @param {Token} token The token to check.
     * @returns {boolean} `true` if the token is a `?.` token.
     */
    function isQuestionDotToken(token) {
      return (
        token.value === '?.' &&
        (token.type === 'Punctuator' || sourceCode.getText(token) === '?.')
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

export default rule;
