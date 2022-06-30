/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const parser = require('@babel/parser');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const traverse = require('@babel/traverse').default;
const evalToString = require('./evalToString');
const invertObject = require('./invertObject');

const errorMapFilePath = 'scripts/error-codes/codes.json';
const docusaurusFolderPath = 'packages/lexical-website-new/src/pages/error';
const docusaurusTemplate = `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* @generated */

import ErrorCodePage from '@site/src/components/ErrorCodePage';
import React from 'react';

export default function ErrorCode() {
  return <ErrorCodePage errorCode={%errorCode%} errorDescription={%errorDescription%} />;
}
`;
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

module.exports = function () {
  let existingErrorMap;
  try {
    // Using `fs.readFileSync` instead of `require` here, because `require()`
    // calls are cached, and the cache map is not properly invalidated after
    // file changes.
    existingErrorMap = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, path.basename(errorMapFilePath)),
        'utf8',
      ),
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

  function flushJson() {
    fs.writeFileSync(
      errorMapFilePath,
      JSON.stringify(invertObject(existingErrorMap), null, 2) + '\n',
      'utf-8',
    );
  }

  function flushDocusaurus() {
    if (fs.existsSync(docusaurusFolderPath)) {
      fs.rmSync(docusaurusFolderPath, {recursive: true});
    }
    fs.mkdirSync(docusaurusFolderPath);
    fs.writeFileSync(
      path.join(docusaurusFolderPath, 'index.js'),
      docusaurusTemplate
        .replace(/%errorCode%/, 'undefined')
        .replace(/%errorDescription%/, 'undefined'),
      'utf-8',
    );
    for (const [errorDescription, errorCode] of Object.entries(
      existingErrorMap,
    )) {
      fs.mkdirSync(path.join(docusaurusFolderPath, errorCode));
      fs.writeFileSync(
        path.join(docusaurusFolderPath, errorCode, 'index.js'),
        docusaurusTemplate
          .replace(/%errorCode%/, JSON.stringify(errorCode))
          .replace(/%errorDescription%/, JSON.stringify(errorDescription)),
        'utf-8',
      );
    }
    childProcess.execSync(
      `node node_modules/prettier/bin-prettier.js --write ${docusaurusFolderPath}`,
    );
  }

  return function extractErrors(source) {
    transform(source);
    flushJson();
    flushDocusaurus();
  };
};
