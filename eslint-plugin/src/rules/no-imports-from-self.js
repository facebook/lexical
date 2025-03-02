/**
 * From: https://github.com/payloadcms/payload/blob/main/packages/eslint-plugin/customRules/no-imports-from-self.js
 *
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
    let packageJson = null;

    return {
      ImportDeclaration(node) {
        // Skip type-only imports
        if (node.importKind === 'type' || node.importKind === 'typeof') {
          return;
        }

        const importPath = node.source.value;
        packageJson = getPackageJson(context, packageJson);

        // Skip if package is private
        if (!packageJson || packageJson.private === true) {
          return;
        }
        if (importPath === packageJson.name) {
          context.report({
            message: `Package "${packageJson.name}" should not import from itself. Use relative instead.`,
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
 * @param {object|undefined} packageName
 *
 * @returns
 */
function getPackageJson(context, packageJson) {
  if (packageJson) {
    return packageJson;
  }

  const fileName = context.getFilename();
  const pkg = findNearestPackageJson(path.dirname(fileName));
  if (pkg) {
    return pkg;
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
