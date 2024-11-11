/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
// Not using packagesManager since it will cache package.json files
const {PackageMetadata} = require('../../../../scripts/shared/PackageMetadata');

/**
 * @typedef {Object} PackageDocsPluginOptions
 * @property {string} baseDir
 * @property {editUrl} editUrl
 * @property {string} targetDir
 * @property {Record<string, string>} packageFrontMatter
 */

/**
 * Watch all public monorepo packages/{project}/README.md files and
 * copy them to docs/packages/{project}.md
 *
 * @param {import('@docusaurus/types').LoadContext} context
 * @param {PackageDocsPluginOptions} options
 * @returns {import('@docusaurus/types').Plugin}
 */
module.exports = async function (context, options) {
  return {
    getPathsToWatch: () => [`${options.baseDir}/*/{README.md,package.json}`],
    loadContent: () => {
      fs.mkdirSync(options.targetDir, {recursive: true});
      const oldTargets = new Set(
        glob.sync(path.resolve(options.targetDir, '*.md'), {
          windowsPathsNoEscape: true,
        }),
      );
      for (const srcPath of glob.sync(`${options.baseDir}/*/README.md`, {
        windowsPathsNoEscape: true,
      })) {
        const jsonPath = path.resolve(path.dirname(srcPath), 'package.json');
        if (!fs.existsSync(jsonPath)) {
          continue;
        }
        const metadata = new PackageMetadata(jsonPath);
        if (metadata.isPrivate()) {
          continue;
        }
        const folderName = metadata.getDirectoryName();
        const targetPath = path.resolve(options.targetDir, `${folderName}.md`);
        /** @type {string|undefined} */
        const frontMatter = [
          `# Do not edit! Generated from ${path.relative(
            path.dirname(targetPath),
            srcPath,
          )}`,
          options.packageFrontMatter[folderName],
          `custom_edit_url: ${options.editUrl.replace(
            /\/$/,
            '',
          )}/${folderName}/README.md`,
        ]
          .filter(Boolean)
          .map((s) => s.trim())
          .join('\n');
        fs.writeFileSync(
          targetPath,
          `---\n${frontMatter}\n---\n\n${fs.readFileSync(srcPath, 'utf-8')}`,
        );
        oldTargets.delete(targetPath);
      }
      for (const oldPath of oldTargets) {
        fs.unlinkSync(oldPath);
      }
    },
    name: 'package-docs',
  };
};
