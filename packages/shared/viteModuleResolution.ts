/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ModuleExportEntry,
  NpmModuleExportEntry,
  PackageMetadata,
} from '../../scripts/shared/PackageMetadata';
import type {Alias} from 'vite';

import * as fs from 'node:fs';
import {createRequire} from 'node:module';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const {packagesManager} =
  require('../../scripts/shared/packagesManager') as typeof import('../../scripts/shared/packagesManager');

/**
 * Escape a string for exact match in a RegExp
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function entryFindRegExp(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}$`);
}

function resolveSource(
  pkg: PackageMetadata,
  sourceFileName: string,
  isSsrBuild = false,
): string {
  if (!isSsrBuild) {
    const browserSourceFileName = pkg.resolve(
      'src',
      sourceFileName.replace(/(\.tsx?)$/, '.browser$1'),
    );
    if (fs.existsSync(browserSourceFileName)) {
      return browserSourceFileName;
    }
  }
  return pkg.resolve('src', sourceFileName);
}

const sourceModuleResolution = (isSsrBuild = false) => {
  function toAlias(pkg: PackageMetadata, entry: ModuleExportEntry) {
    return {
      find: entryFindRegExp(entry.name),
      replacement: resolveSource(pkg, entry.sourceFileName, isSsrBuild),
    };
  }

  return [
    ...packagesManager
      .getPublicPackages()
      .flatMap((pkg) =>
        pkg.getExportedNpmModuleEntries().map(toAlias.bind(null, pkg)),
      ),
    ...['shared']
      .map((name) => packagesManager.getPackageByDirectoryName(name))
      .flatMap((pkg) =>
        pkg.getPrivateModuleEntries().map(toAlias.bind(null, pkg)),
      ),
  ];
};

const distModuleResolution = (
  environment: 'development' | 'production',
  isSsrBuild = false,
) => {
  return [
    ...packagesManager.getPublicPackages().flatMap((pkg) =>
      pkg
        .getNormalizedNpmModuleExportEntries()
        .map((entry: NpmModuleExportEntry) => {
          const [name, moduleExports] = entry;
          const replacements = ([environment, 'default'] as const).flatMap(
            (condition) =>
              [
                !isSsrBuild &&
                  moduleExports.browser &&
                  moduleExports.browser[condition],
                moduleExports.import[condition],
              ].flatMap((fn) => (fn ? [pkg.resolve('dist', fn)] : [])),
          );
          const replacement = replacements.find(fs.existsSync.bind(fs));
          if (!replacement) {
            throw new Error(
              `ERROR: Missing ./${path.relative(
                '../..',
                replacements[1],
              )}. Did you run \`npm run build\` in the monorepo first?`,
            );
          }
          return {
            find: entryFindRegExp(name),
            replacement,
          };
        }),
    ),
    ...[packagesManager.getPackageByDirectoryName('shared')].flatMap(
      (pkg: PackageMetadata) =>
        pkg.getPrivateModuleEntries().map((entry: ModuleExportEntry) => {
          return {
            find: entryFindRegExp(entry.name),
            replacement: pkg.resolve('src', entry.sourceFileName),
          };
        }),
    ),
  ];
};

export default function moduleResolution(
  environment: 'source' | 'development' | 'production',
  isSsrBuild = false,
): Alias[] {
  return environment === 'source'
    ? sourceModuleResolution(isSsrBuild)
    : distModuleResolution(environment, isSsrBuild);
}
