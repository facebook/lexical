#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');

async function prepareOutlinePackage() {
  await exec(`rm -rf ./packages/outline/npm`);
  await exec(`mkdir ./packages/outline/npm`);
  await exec(`cp -R ./packages/outline/dist ./packages/outline/npm`);
  await exec(`cp -R ./packages/outline/package.json ./packages/outline/npm`);
  await exec(`cp -R LICENSE ./packages/outline/npm`);
  await exec(`cp -R README.md ./packages/outline/npm`);
}

prepareOutlinePackage();
