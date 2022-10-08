#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const chalk = require('chalk');
const build = require('../build');

const main = async () => {
  await build('firefox');

  // eslint-disable-next-line no-console
  console.log(chalk.green('\nThe Firefox extension has been built!'));
};

main();
