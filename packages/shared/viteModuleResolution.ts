/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ModuleExportEntry,
  PackageMetadata,
} from '../../scripts/shared/PackageMetadata';

import {packagesManager} from '../../scripts/shared/packagesManager';

function toAlias(pkg: PackageMetadata, entry: ModuleExportEntry) {
  return {
    find: entry.name,
    replacement: pkg.resolve('src', entry.sourceFileName),
  };
}

const moduleResolution = [
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

export default moduleResolution;
