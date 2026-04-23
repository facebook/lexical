/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {glob} from 'glob';
import fs from 'node:fs';
import path from 'node:path';

// Not using packagesManager since it will cache package.json files
import {PackageMetadata} from '../../../../scripts/shared/PackageMetadata.mjs';

/**
 * @typedef {Object} PackageDocsPluginOptions
 * @property {string} baseDir
 * @property {string} editUrl
 * @property {string} targetDir
 * @property {Record<string, string>} packageFrontMatter
 */

/**
 * Watch all public monorepo packages/{project}/README.md files and
 * copy them to docs/packages/{project}.md
 *
 * @type {import('@docusaurus/types').PluginModule}
 */
const packageDocsPlugin = async function (context, options) {
  const {baseDir, editUrl, packageFrontMatter, targetDir} =
    /** @type {PackageDocsPluginOptions} */ (options);
  return {
    getPathsToWatch: () => [`${baseDir}/*/{README.md,package.json}`],
    loadContent: () => {
      fs.mkdirSync(targetDir, {recursive: true});
      const oldTargets = new Set(
        glob.sync(path.resolve(targetDir, '*.md'), {
          windowsPathsNoEscape: true,
        }),
      );
      for (const srcPath of glob.sync(`${baseDir}/*/README.md`, {
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
        const targetPath = path.resolve(targetDir, `${folderName}.md`);
        const frontMatter = [
          `# Do not edit! Generated from ${path.relative(
            path.dirname(targetPath),
            srcPath,
          )}`,
          packageFrontMatter[folderName],
          `custom_edit_url: ${editUrl.replace(/\/$/, '')}/${folderName}/README.md`,
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

export default packageDocsPlugin;
