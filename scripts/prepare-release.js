#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const fs = require('fs');
const path = require('path');

async function prepareOutlinePackage() {
  await exec(`rm -rf ./packages/outline/npm`);
  await exec(`mkdir ./packages/outline/npm`);
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

async function prepareOutlineYjsPackage() {
  await exec(`rm -rf ./packages/outline-yjs/npm`);
  await exec(`mkdir ./packages/outline-yjs/npm`);
  await exec(
    `cp -R ./packages/outline-yjs/dist/OutlineYjs.js ./packages/outline-yjs/npm/index.js`,
  );
  await exec(
    `cp -R ./packages/outline-yjs/package.json ./packages/outline-yjs/npm`,
  );
  await exec(`cp -R LICENSE ./packages/outline-yjs/npm`);
  await exec(
    `cp -R ./packages/outline-yjs/README.md ./packages/outline-yjs/npm`,
  );
}

prepareOutlinePackage();
prepareOutlineReactPackage();
prepareOutlineYjsPackage();
