#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');

async function prepareOutlinePackage() {
  await exec(`rm -rf ./packages/outline/npm`);
  await exec(`mkdir ./packages/outline/npm`);
  await exec(`mkdir ./packages/outline/npm/dist`);
  await exec(
    `cp -R ./packages/outline/dist/Outline.js ./packages/outline/npm/dist/`,
  );
  await exec(`cp -R ./packages/outline/dist/*.js ./packages/outline/npm`);
  await exec(`cp -R ./packages/outline/package.json ./packages/outline/npm`);
  await exec(`cp -R LICENSE ./packages/outline/npm`);
  await exec(`cp -R ./packages/outline/README.md ./packages/outline/npm`);
}

async function prepareOutlineReactPackage() {
  await exec(`rm -rf ./packages/outline-react/npm`);
  await exec(`mkdir ./packages/outline-react/npm`);
  await exec(
    `cp -R ./packages/outline-react/dist/*.js ./packages/outline-react/npm`,
  );
  await exec(
    `cp -R ./packages/outline-react/package.json ./packages/outline-react/npm`,
  );
  await exec(`cp -R LICENSE ./packages/outline-react/npm`);
  await exec(
    `cp -R ./packages/outline-react/README.md ./packages/outline-react/npm`,
  );
}

prepareOutlinePackage();
prepareOutlineReactPackage();
