/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const messages = require('./messages.js');
const t = require('@babel/types');

function replaceStringWithMemberExpression(arg, varName) {
  if (arg.isNullLiteral()) {
    return arg.node;
  }
  if (arg.isIdentifier()) {
    return t.memberExpression(
      t.identifier(varName),
      t.identifier(arg.node.name),
    );
  }
  if (arg.isStringLiteral()) {
    return t.memberExpression(
      t.identifier(varName),
      t.identifier(arg.node.value),
    );
  }
  if (arg.isLogicalExpression({operator: '&&'})) {
    return t.logicalExpression(
      '&&',
      arg.get('left').node,
      replaceStringWithMemberExpression(arg.get('right'), varName),
    );
  }
  if (arg.isConditionalExpression()) {
    return t.conditionalExpression(
      arg.get('test').node,
      replaceStringWithMemberExpression(arg.get('consequent'), varName),
      replaceStringWithMemberExpression(arg.get('alternate'), varName),
    );
  }
  throw arg.buildCodeFrameError(messages.UNEXPECTED_ARGUMENT);
}

function factoryCallToStylexCall(path) {
  if (!path.isCallExpression()) {
    throw path.buildCodeFrameError(messages.EXPECTED_FUNCTION_CALL);
  }

  if (!path.get('callee').isIdentifier()) {
    throw path.buildCodeFrameError(messages.EXPECTED_FUNCTION_CALL);
  }

  const varName = path.get('callee').node.name;

  const args = path.get('arguments');
  const newArgs = [];
  for (const arg of args) {
    if (arg.isObjectExpression()) {
      for (const prop of arg.get('properties')) {
        if (!prop.isObjectProperty() || !prop.get('key').isIdentifier()) {
          throw prop.buildCodeFrameError(messages.UNKNOWN_NAMESPACE);
        }
        const key = prop.get('key').node;
        const value = prop.get('value');
        if (value.isBooleanLiteral({value: true})) {
          newArgs.push(t.memberExpression(t.identifier(varName), key));
        } else {
          newArgs.push(
            t.conditionalExpression(
              value.node,
              t.memberExpression(t.identifier(varName), key),
              t.nullLiteral(),
            ),
          );
        }
      }
    } else {
      newArgs.push(replaceStringWithMemberExpression(arg, varName));
    }
  }

  // console.log('using these args:', newArgs);
  path.replaceWith(t.callExpression(t.identifier('stylex'), newArgs));
}

module.exports = {factoryCallToStylexCall};
