/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const fs = require('fs-extra');
const path = require('node:path');
const {packagesManager} = require('./shared/packagesManager');

const webPkg = packagesManager.getPackageByDirectoryName('lexical-website');

function sidebarTemplate(npmName, readmePath) {
  return (
    `
---
title: ''
sidebar_label: '${npmName}'
---

{@import ${readmePath}}
`.trim() + '\n'
  );
}

function readmeTemplate(npmName, directoryName, description) {
  const apiModuleName = directoryName.replace(/-/g, '_');
  return (
    `
    # \`${npmName}\`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/${apiModuleName})

${description}
`.trim() + '\n'
  );
}

function updateDocs() {
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    const directoryName = pkg.getDirectoryName();
    const root = pkg.resolve('..', '..');
    const readmePath = pkg.resolve('README.md');
    const sidebarPath = webPkg.resolve(
      'docs',
      'packages',
      `${directoryName}.md`,
    );
    if (!fs.existsSync(readmePath)) {
      console.log(`Creating ${path.relative(root, readmePath)}`);
      fs.writeFileSync(
        readmePath,
        readmeTemplate(
          npmName,
          directoryName,
          pkg.packageJson.description ||
            'TODO: This package needs a description!',
        ),
      );
    }
    if (!fs.existsSync(sidebarPath)) {
      console.log(`Creating ${path.relative(root, sidebarPath)}`);
      fs.writeFileSync(
        sidebarPath,
        sidebarTemplate(
          npmName,
          path.relative(path.dirname(sidebarPath), readmePath),
        ),
      );
    }
  });
}

updateDocs();
