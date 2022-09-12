#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const isPrerelease = process.env.npm_package_version.indexOf('-') !== -1;

if (!isPrerelease) {
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
