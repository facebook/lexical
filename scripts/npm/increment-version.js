#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {spawn} = require('child-process-promise');
const argv = require('minimist')(process.argv.slice(2));

const increment = argv.i || process.env.INCREMENT;
const channel = argv.channel || process.env.CHANNEL;

const validChannels = new Set(['next', 'latest', 'nightly', 'dev']);
if (!validChannels.has(channel)) {
  console.error(`Invalid value for channel: ${channel}`);
  process.exit(1);
}

const validIncrements = new Set(['minor', 'patch', 'prerelease']);
if (
  !validIncrements.has(increment) ||
  (channel === 'nightly' && increment !== 'prerelease')
) {
  console.error(
    `Invalid value for increment in ${channel} channel: ${increment}`,
  );
  process.exit(1);
}

function incrementArgs() {
  return [
    ...(increment === 'prerelease'
      ? [
          '--preid',
          channel === 'nightly'
            ? `${channel}.${new Date()
                .toISOString()
                .split('T')[0]
                .replaceAll('-', '')}`
            : channel,
        ]
      : []),
    increment,
  ];
}

async function incrementVersion() {
  const commandArr = [
    'npm',
    'version',
    '--no-git-tag-version',
    '--include-workspace-root',
    'true',
    ...incrementArgs(),
  ];
  console.log(commandArr.join(' '));
  await spawn(commandArr[0], commandArr.slice(1), {stdio: 'inherit'});
}

incrementVersion();
