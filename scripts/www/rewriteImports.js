/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const path = require('node:path');
const {packagesManager} = require('../shared/packagesManager');
const transformFlowFileContents = require('./transformFlowFileContents');

// This script attempts to find all Flow definition modules, and makes
// them compatible with www. Specifically, it finds any imports that
// reference lower case 'lexical' -> 'Lexical' and package references,
// such as 'lexical/Foo' -> 'LexicalFoo' and '@lexical/react/LexicalFoo' ->
// 'LexicalFoo'. Lastly, it creates these files in the 'dist' directory
// for each package so they can easily be copied to www.
async function rewriteImports() {
  for (const pkg of packagesManager.getPackages()) {
    for (const flowFile of glob.sync(pkg.resolve('flow', '*.flow'), {
      windowsPathsNoEscape: true,
    })) {
      const data = fs.readFileSync(flowFile, 'utf8');
      const result = await transformFlowFileContents(data);
      fs.writeFileSync(
        pkg.resolve('dist', path.basename(flowFile)),
        result,
        'utf8',
      );
    }
  }
}

rewriteImports();
