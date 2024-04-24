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
const npmToWwwName = require('./www/npmToWwwName');

const headerTemplate = fs.readFileSync(
  path.resolve(__dirname, 'www', 'headerTemplate.js'),
  'utf8',
);

/** @param {string} filename */
function wwwStubTemplate(filename) {
  return `
${headerTemplate}

'use strict';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

module.exports = require('./dist/${filename}');
`;
}

function updateWwwStubs() {
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    // Only worry about the entrypoint stub if it has a single module export
    if (pkg.getExportedNpmModuleNames().some((name) => name !== npmName)) {
      return;
    }

    const filename = `${npmToWwwName(npmName)}.js`;
    const stubPath = pkg.resolve(filename);
    const root = pkg.resolve('..', '..');

    if (!fs.existsSync(stubPath)) {
      console.log(`Creating ${path.relative(root, stubPath)}`);
      fs.writeFileSync(stubPath, wwwStubTemplate(filename));
    }
  });
}

updateWwwStubs();
