/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// From: https://github.com/payloadcms/payload/blob/main/packages/eslint-plugin/customRules/no-imports-from-self.js

'use strict';

const fs = require('fs');
const path = require('node:path');

const {PackageMetadata} = require('../../../scripts/shared/PackageMetadata.js');

const packageMetadataCache = new Map();

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  create(context) {
    let packageMetadata = null;

    return {
      ImportDeclaration(node) {
        // Skip type-only imports
        if (node.importKind === 'type' || node.importKind === 'typeof') {
          return;
        }

        const importPath = node.source.value;
        if (!packageMetadata) {
          packageMetadata = getNearestPackageJsonMetadata(
            path.dirname(context.filename),
          );
        }

        // Skip if package is private
        if (!packageMetadata || packageMetadata.isPrivate()) {
          return;
        }

        // Self-import
        if (importPath === packageMetadata.packageJson.name) {
          context.report({
            message: `Package "${packageMetadata.packageJson.name}" should not import from itself. Use relative instead.`,
            node,
          });
          // Import from subpath export => only invalid if subpath export resolves to current file
        } else if (importPath.startsWith(packageMetadata.packageJson.name)) {
          // Check if this file is referenced in the package.json exports entry for the import path
          const exports = packageMetadata.getNormalizedNpmModuleExportEntries();
          const exportEntry = exports.find(([name]) => importPath === name);
          if (exportEntry) {
            const resolvedExport = exportEntry[1].import.default;

            // Resolved path of file that is trying to be imported, without extensions
            const resolvedExportPath = path.join(
              path.dirname(packageMetadata.packageJsonPath),
              'src',
              resolvedExport,
            );

            const baseResolvedExportPath = resolvedExportPath.substring(
              0,
              resolvedExportPath.lastIndexOf('.'),
            );

            const baseCurFilePath = context.filename.substring(
              0,
              context.filename.lastIndexOf('.'),
            );

            if (baseCurFilePath === baseResolvedExportPath) {
              context.report({
                message: `Package "${resolvedExport}" should not import from itself. Use relative instead.`,
                node,
              });
            }
          }
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
 * @param {string} startDir
 */
function getNearestPackageJsonMetadata(startDir) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    // Root directory check
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      if (packageMetadataCache.has(pkgPath)) {
        return packageMetadataCache.get(pkgPath);
      }

      const packageMetadata = new PackageMetadata(pkgPath);
      packageMetadataCache.set(pkgPath, packageMetadata);

      return packageMetadata;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}
