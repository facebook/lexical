/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const parser = require('@babel/parser');
const fs = require('fs-extra');
const path = require('path');
const traverse = require('@babel/traverse').default;
const evalToString = require('./evalToString');
const invertObject = require('./invertObject');

const plugins = [
  'classProperties',
  'jsx',
  'trailingFunctionCommas',
  'objectRestSpread',
  'typescript',
];

const babylonOptions = {
  // As a parser, babylon has its own options and we can't directly
  // import/require a babel preset. It should be kept **the same** as
  // the `babel-plugin-syntax-*` ones specified in
  // https://github.com/facebook/fbjs/blob/master/packages/babel-preset-fbjs/configure.js
  plugins,
  sourceType: 'module',
};

module.exports = function (opts) {
  if (!opts || !('errorMapFilePath' in opts)) {
    throw new Error(
      'Missing options. Ensure you pass an object with `errorMapFilePath`.',
    );
  }

  const errorMapFilePath = opts.errorMapFilePath;
  let existingErrorMap;
  try {
    // Using `fs.readJsonSync` instead of `require` here, because `require()`
    // calls are cached, and the cache map is not properly invalidated after
    // file changes.
    existingErrorMap = fs.readJsonSync(
      path.join(__dirname, path.basename(errorMapFilePath)),
    );
  } catch (e) {
    existingErrorMap = {};
  }

  const allErrorIDs = Object.keys(existingErrorMap);
  let currentID;

  if (allErrorIDs.length === 0) {
    // Map is empty
    currentID = 0;
  } else {
    currentID = Math.max.apply(null, allErrorIDs) + 1;
  }

  // Here we invert the map object in memory for faster error code lookup
  existingErrorMap = invertObject(existingErrorMap);

  function transform(source) {
    const ast = parser.parse(source, babylonOptions);

    traverse(ast, {
      CallExpression: {
        exit(astPath) {
          if (astPath.get('callee').isIdentifier({name: 'invariant'})) {
            const node = astPath.node;

            // error messages can be concatenated (`+`) at runtime, so here's a
            // trivial partial evaluator that interprets the literal value
            const errorMsgLiteral = evalToString(node.arguments[1]);
            addToErrorMap(errorMsgLiteral);
          }
        },
      },
    });
  }

  function addToErrorMap(errorMsgLiteral) {
    if (existingErrorMap.hasOwnProperty(errorMsgLiteral)) {
      return;
    }
    existingErrorMap[errorMsgLiteral] = '' + currentID++;
  }

  function flush(cb) {
    fs.writeJsonSync(errorMapFilePath, invertObject(existingErrorMap), {
      spaces: 2,
    });
  }

  return function extractErrors(source) {
    transform(source);
    flush();
  };
};
