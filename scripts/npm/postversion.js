#!/usr/bin/env bash

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {spawn} = require('child-process-promise');

const {npm_package_version, CHANNEL, GIT_REPO, GITHUB_OUTPUT} = process.env;

// Previously this script was defined directly in package.json as the
// following (in one line):
//
//   git checkout -b ${npm_package_version}__release && \
//   npm run update-version && \
//   npm install && \
//   npm run update-packages && \
//   npm run extract-codes && \
//   npm run update-changelog && \
//   git add -A && \
//   git commit -m v${npm_package_version} && \
//   git tag -a v${npm_package_version} -m v${npm_package_version}
//
async function main() {
  // CHANNEL should already be validated by increment-version which calls this (indirectly)
  for (const [k, v] of Object.entries({
    CHANNEL,
    GIT_REPO,
    npm_package_version,
  })) {
    if (!v) {
      console.error(`Expecting ${k} to be set in the environment`);
      process.exit(1);
    }
  }
  const commands = [
    // Create or force update the channel branch to build the docs site from
    ['git', 'checkout', '-B', `${CHANNEL}__release`],
    // Update all package.json versions in the monorepo
    `npm run update-version`,
    // Update package-lock.json
    `npm install`,
    // Fix up all package.json files
    `npm run update-packages`,
    // Extract error codes and update changelog, but only in production
    ...(CHANNEL === 'latest'
      ? [`npm run extract-codes`, `npm run update-changelog`]
      : []),
    `git add -A`,
    ['git', 'commit', '-m', `v${npm_package_version}`],
    [
      'git',
      'tag',
      '-a',
      `v${npm_package_version}`,
      '-m',
      `v${npm_package_version}`,
    ],
  ];
  const refs = [
    `refs/tags/v${npm_package_version}`,
    `refs/heads/${CHANNEL}__release`,
  ];
  if (CHANNEL !== 'nightly') {
    // Create or force update the remote version branch for creating a PR
    refs.push(
      `refs/heads/${CHANNEL}__release:refs/heads/${npm_package_version}__release`,
    );
  }
  commands.push([
    'git',
    'push',
    ...(process.env.DRY_RUN === '1' ? ['--dry-run'] : []),
    GIT_REPO,
    ...refs.map((ref) => `+${ref}`),
  ]);
  if (GITHUB_OUTPUT) {
    commands.push(
      `echo "version=${npm_package_version}" >> '${GITHUB_OUTPUT}'`,
    );
    commands.push(`echo "tag-ref=${refs[0]}" >> '${GITHUB_OUTPUT}'`);
  }
  for (const command of commands) {
    const commandArr = Array.isArray(command)
      ? command
      : ['bash', '-c', command];
    console.log(commandArr.join(' '));
    await spawn(commandArr[0], commandArr.slice(1), {stdio: 'inherit'});
  }
}
main();
