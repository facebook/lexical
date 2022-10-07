#!/usr/bin/env node
/* eslint-disable header/header */

'use strict';

const chalk = require('chalk');
const build = require('../build');

const main = async () => {
  await build('chrome');

  // eslint-disable-next-line no-console
  console.log(chalk.green('\nThe Chrome extension has been built!'));
};

main();
