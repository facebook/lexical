/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * Portions Copyright (c) Payload CMS, Inc. <info@payloadcms.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// eslint-disable-next-line header/header
'use strict';

const fs = require('fs');
const path = require('node:path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  create(context) {
    let packageName = null;

    return {
      ImportDeclaration(node) {
        // Skip type-only imports
        if (node.importKind === 'type' || node.importKind === 'typeof') {
          return;
        }

        const importPath = node.source.value;
        const pkgName = getPackageName(context, packageName);
        if (pkgName && importPath.startsWith(pkgName)) {
          context.report({
            message: `Package "${pkgName}" should not import from itself. Use relative instead.`,
            node,
          });
        }
      },
    };
  },

  meta: {
    docs: {
      category: 'Best Practices',
      description:
        'Disallow a package from importing from itself, except type-only imports',
      recommended: true,
    },
    schema: [],
  },
};

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {string|undefined} packageName
 */
function getPackageName(context, packageName) {
  if (packageName) {
    return packageName;
  }

  const fileName = context.getFilename();
  const pkg = findNearestPackageJson(path.dirname(fileName));
  if (pkg) {
    return pkg.name;
  }
}

/**
 * @param {string} startDir
 */
function findNearestPackageJson(startDir) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    // Root directory check
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkgContent;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}
