#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const readline = require('readline');
const {exec} = require('child-process-promise');
const {LEXICAL_PKG, DEFAULT_PKGS} = require('./packages');
const argv = require('minimist')(process.argv.slice(2));
const verdaccioRegistryUrl = 'http://localhost:4873'; // Change this to your Verdaccio URL

const nonInteractive = argv['non-interactive'];
const dryRun = argv['dry-run'];
const channel = argv.channel;
const validChannels = new Set(['next', 'latest', 'nightly', 'dev']);
if (!validChannels.has(channel)) {
  console.error(`Invalid release channel: ${channel}`);
  process.exit(1);
}

const fs = require('fs');
const path = require('path');



async function publish() {
  const pkgs = [LEXICAL_PKG, ...DEFAULT_PKGS];
  if (!nonInteractive) {
    console.info(
      `You're about to publish:\n${pkgs.join('\n')}\n\nType "publish" to confirm.`,
    );
    await waitForInput();
  }

  for (let i = 0; i < pkgs.length; i++) {
    const pkgDir = `./packages/${pkgs[i]}`;
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const pkgName = pkgJson.name;

    console.info(`Publishing ${pkgName}...`);
    if (!dryRun) {
      try {
        // unpublish from local verdaccio if you want to overwrite version
        const unpublishCommand = `npm unpublish --registry ${verdaccioRegistryUrl} --tag ${channel} --access public --force`;
        const publishCommand = `npm publish --registry ${verdaccioRegistryUrl} --tag ${channel} --access public --force`;
        const unpublishResult = await exec(unpublishCommand, { cwd: pkgDir });
        const result = await exec(publishCommand, { cwd: pkgDir });
        console.info(result.stdout);
        console.info(`Successfully published ${pkgName}.`);
      } catch (error) {
        console.error(`Failed to publish ${pkgName}. Error: ${error}`);
      }
    } else {
      console.info(`Dry run - skipping publish step for ${pkgName}.`);
    }
  }
}
async function waitForInput() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', function (line) {
      if (line === 'publish') {
        rl.close();
        resolve();
      }
    });
  });
}

publish();
