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
const argv = require('minimist')(process.argv.slice(2));
const increment = argv.i;
const validIncrements = new Set(['minor', 'patch', 'prerelease']);
if (!validIncrements.has(increment)) {
  console.error(`Invalid value for increment: ${increment}`);
  process.exit(1);
}

async function incrementVersion(increment) {
  const preId = increment === 'prerelease' ? '--preid next' : '';
  const workspaces = '';
  const command = `npm --no-git-tag-version version ${increment} --include-workspace-root true ${preId} ${workspaces}`;
  await exec(command);
  if (increment !== 'prelease') {
    const date = (await exec(`git show --format=%as | head -1`)).stdout.trim();
    const header = `## v${process.env.npm_package_version} (${date})`;
    const previousReleaseHash = (
      await exec(`git log -n 1 origin/latest --pretty=format:"%H"`)
    ).stdout.trim();
    const tmpFilePath = './changelog-tmp';
    await exec(`echo "${header}\n\n" >> ${tmpFilePath}`);
    await exec(
      `git --no-pager log --oneline ${previousReleaseHash}...HEAD --pretty=format:\"- %s %an\" >> ${tmpFilePath}`,
    );
    await exec(
      `cat ./CHANGELOG.md >> ${tmpFilePath} && mv ${tmpFilePath} ./CHANGELOG.md`,
    );
    await exec(`git commit --amend --no-edit`);
  }
}

incrementVersion(increment);
