#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {exec} = require('child-process-promise');
const {LEXICAL_PKG, DEFAULT_PKGS} = require('./packages');

async function prepareLexicalPackage() {
  await exec(`rm -rf ./packages/${LEXICAL_PKG}/npm`);
  await exec(`mkdir ./packages/${LEXICAL_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/dist/* ./packages/${LEXICAL_PKG}/npm`,
  );

  // Other bits
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/package.json ./packages/${LEXICAL_PKG}/npm`,
  );
  await exec(`cp -R LICENSE ./packages/${LEXICAL_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/README.md ./packages/${LEXICAL_PKG}/npm`,
  );
  // Flow Types
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/flow/*.flow ./packages/${LEXICAL_PKG}/npm`,
  );
}

async function prepareDefaultPackages() {
  for (let i = 0; i < DEFAULT_PKGS.length; i++) {
    const pkg = DEFAULT_PKGS[i];
    await exec(`rm -rf ./packages/${pkg}/npm`);
    await exec(`mkdir ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/dist/* ./packages/${pkg}/npm`);
    try {
      await exec(`cp -R ./packages/${pkg}/flow/*.flow ./packages/${pkg}/npm`);
    } catch {
      console.error(`Missing Flow type definitions for package ${pkg}`);
    }
    await exec(`cp -R ./packages/${pkg}/package.json ./packages/${pkg}/npm`);
    await exec(`cp -R LICENSE ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/README.md ./packages/${pkg}/npm`);
  }
}

prepareLexicalPackage();
prepareDefaultPackages();
