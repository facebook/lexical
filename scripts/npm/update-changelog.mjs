#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {exec} from '../shared/childProcess.mjs';

// The npm_package_version environment variable is set by npm/pnpm when this
// script is run via a package.json script, so it is required to be present.
const npmPackageVersion = /** @type {string} */ (
  process.env.npm_package_version
);

const isPrerelease = npmPackageVersion.indexOf('-') !== -1;

async function updateChangelog() {
  const date = (await exec(`git show --format=%as | head -1`)).stdout.trim();
  const header = `## v${npmPackageVersion} (${date})`;
  const changelogContent = (
    await exec(
      `git --no-pager log --oneline ${process.env.LATEST_RELEASE}...HEAD~1 --pretty=format:"- %s %an"`,
    )
  ).stdout
    .replace(/[^a-zA-Z0-9()\n \-,.#]/g, '')
    .trim();
  const tmpFilePath = './changelog-tmp';
  await exec(`echo "${header}\n" >> ${tmpFilePath}`);
  await exec(`echo "${changelogContent}\n" >> ${tmpFilePath}`);
  await exec(
    `cat ./CHANGELOG.md >> ${tmpFilePath} && mv ${tmpFilePath} ./CHANGELOG.md`,
  );
}

if (!isPrerelease) {
  updateChangelog();
}
