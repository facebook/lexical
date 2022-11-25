/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const fs = require('fs-extra');

const packages = {
  '@lexical/clipboard': 'lexical-clipboard',
  '@lexical/code': 'lexical-code',
  '@lexical/dragon': 'lexical-dragon',
  '@lexical/file': 'lexical-file',
  '@lexical/hashtag': 'lexical-hashtag',
  '@lexical/headless': 'lexical-headless',
  '@lexical/history': 'lexical-history',
  '@lexical/html': 'lexical-html',
  '@lexical/link': 'lexical-link',
  '@lexical/list': 'lexical-list',
  '@lexical/mark': 'lexical-mark',
  '@lexical/markdown': 'lexical-markdown',
  '@lexical/offset': 'lexical-offset',
  '@lexical/overflow': 'lexical-overflow',
  '@lexical/plain-text': 'lexical-plain-text',
  '@lexical/react': 'lexical-react',
  '@lexical/rich-text': 'lexical-rich-text',
  '@lexical/selection': 'lexical-selection',
  '@lexical/table': 'lexical-table',
  '@lexical/text': 'lexical-text',
  '@lexical/utils': 'lexical-utils',
  '@lexical/yjs': 'lexical-yjs',
  lexical: 'lexical',
  'lexical-playground': 'lexical-playground',
  shared: 'shared',
};

function updateVersion() {
  // get version from monorepo package.json version
  const basePackageJSON = fs.readJsonSync(`./package.json`);
  const version = basePackageJSON.version;
  // update individual packages
  Object.values(packages).forEach((pkg) => {
    const packageJSON = fs.readJsonSync(`./packages/${pkg}/package.json`);
    packageJSON.version = version;
    updateDependencies(packageJSON, version);
    fs.writeJsonSync(`./packages/${pkg}/package.json`, packageJSON, {
      spaces: 2,
    });
  });
}

function updateDependencies(packageJSON, version) {
  const {dependencies, peerDependencies} = packageJSON;
  if (dependencies !== undefined) {
    Object.keys(dependencies).forEach((dep) => {
      if (packages[dep] !== undefined) {
        dependencies[dep] = version;
      }
    });
  }
  if (peerDependencies !== undefined) {
    Object.keys(peerDependencies).forEach((peerDep) => {
      if (packages[peerDep] !== undefined) {
        peerDependencies[peerDep] = version;
      }
    });
  }
}

updateVersion();
