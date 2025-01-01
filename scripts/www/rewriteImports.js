/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the MIT license. See LICENSE file in the root directory.
 */

'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const path = require('node:path');
const { packagesManager } = require('../shared/packagesManager');
const transformFlowFileContents = require('./transformFlowFileContents');

/**
 * Modernizes Flow definition modules by adapting imports for www compatibility.
 *
 * Key Enhancements:
 * - Converts 'lexical' -> 'Lexical' imports.
 * - Standardizes package references:
 *   'lexical/Foo' -> 'LexicalFoo'
 *   '@lexical/react/LexicalFoo' -> 'LexicalFoo'
 * - Outputs polished files to 'dist' for streamlined deployment.
 */
async function rewriteImports() {
  const packages = packagesManager.getPackages();

  for (const pkg of packages) {
    const flowFiles = glob.sync(pkg.resolve('flow', '*.flow'), {
      windowsPathsNoEscape: true,
    });

    await Promise.all(flowFiles.map(async (flowFile) => {
      const sourceCode = fs.readFileSync(flowFile, 'utf8');
      const transformedCode = await transformFlowFileContents(sourceCode);
      const outputPath = pkg.resolve('dist', path.basename(flowFile));

      fs.writeFileSync(outputPath, transformedCode, 'utf8');
    }));
  }
}

// Execute the transformation process
rewriteImports().catch(err => {
  console.error('Failed to rewrite imports:', err);
});
