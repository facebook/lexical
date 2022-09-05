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
const {LEXICAL_PKG, DEFAULT_PKGS, SHARED_PKG} = require('./packages');
const argv = require('minimist')(process.argv.slice(2));
const increment = argv.i;
const validIncrements = new Set(['minor', 'patch', 'prerelease']);
if (!validIncrements.has(increment)) {
  console.error(`Invalid value for increment: ${increment}`);
  process.exit(1);
}

const packages = [LEXICAL_PKG, ...DEFAULT_PKGS, SHARED_PKG];

async function incrementVersion(increment) {
  const preId = increment === 'prerelease' ? '--preid next' : '';
  const workspaces = packages.map((pkg) => `-w packages/${pkg}`).join(' ');
  const command = `npm version ${increment} --include-workspace-root true ${preId} ${workspaces}`;
  await exec(command);
}

incrementVersion(increment);
