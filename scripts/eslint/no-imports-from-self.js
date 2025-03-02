/**
 * From: https://github.com/payloadcms/payload/blob/main/packages/eslint-plugin/customRules/no-imports-from-self.js
 *
 * MIT License
 *
 * Copyright (c) 2018-2025 Payload CMS, Inc. <info@payloadcms.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';

const fs = require('fs');
const path = require('node:path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  create(context) {
    let packageName = null;

    return {
      ImportDeclaration(node) {
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
      description: 'Disallow a package from importing from itself',
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
