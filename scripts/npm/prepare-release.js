#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

const {exec} = require('child-process-promise');
const {LEXICAL_PKG, DEFAULT_PKGS} = require('./packages');

async function prepareLexicalPackage() {
  await exec(`rm -rf ./packages/${LEXICAL_PKG}/npm`);
  await exec(`mkdir ./packages/${LEXICAL_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/dist/*.js ./packages/${LEXICAL_PKG}/npm`,
  );

  // Remap the node extensions to their short versions
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalQuoteNode.js ./packages/${LEXICAL_PKG}/npm/QuoteNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalLinkNode.js ./packages/${LEXICAL_PKG}/npm/LinkNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalHeadingNode.js ./packages/${LEXICAL_PKG}/npm/HeadingNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalAutoLinkNode.js ./packages/${LEXICAL_PKG}/npm/AutoLinkNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalOverflowNode.js ./packages/${LEXICAL_PKG}/npm/OverflowNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNodes.js ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNode.js`,
  );
  // Other bits
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/package.json ./packages/${LEXICAL_PKG}/npm`,
  );
  await exec(`cp -R LICENSE ./packages/${LEXICAL_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/README.md ./packages/${LEXICAL_PKG}/npm`,
  );
  // TypeScript Types
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/*.d.ts ./packages/${LEXICAL_PKG}/npm`,
  );
  // Flow Types
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/flow/*.flow ./packages/${LEXICAL_PKG}/npm`,
  );
  // Remap Flow Types
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalCodeNode.js.flow ./packages/${LEXICAL_PKG}/npm/CodeNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalQuoteNode.js.flow ./packages/${LEXICAL_PKG}/npm/QuoteNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalLinkNode.js.flow ./packages/${LEXICAL_PKG}/npm/LinkNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalHeadingNode.js.flow ./packages/${LEXICAL_PKG}/npm/HeadingNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalAutoLinkNode.js.flow ./packages/${LEXICAL_PKG}/npm/AutoLinkNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalCodeHighlightNode.js.flow ./packages/${LEXICAL_PKG}/npm/CodeHighlightNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalOverflowNode.js.flow ./packages/${LEXICAL_PKG}/npm/OverflowNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNodes.js.flow ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNode.js.flow`,
  );
}

async function prepareDefaultPackages() {
  for (let i = 0; i < DEFAULT_PKGS.length; i++) {
    const pkg = DEFAULT_PKGS[i];
    await exec(`rm -rf ./packages/${pkg}/npm`);
    await exec(`mkdir ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/dist/*.js ./packages/${pkg}/npm`);
    try {
      await exec(`cp -R ./packages/${pkg}/flow/*.flow ./packages/${pkg}/npm`);
    } catch {
      console.error(`Missing Flow type definitions for package ${pkg}`);
    }
    try {
      await exec(`cp -R ./packages/${pkg}/*.d.ts ./packages/${pkg}/npm`);
    } catch {
      console.error(`Missing TypeScript type definitions for package ${pkg}`);
    }
    await exec(`cp -R ./packages/${pkg}/package.json ./packages/${pkg}/npm`);
    await exec(`cp -R LICENSE ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/README.md ./packages/${pkg}/npm`);
  }
}

prepareLexicalPackage();
prepareDefaultPackages();
