/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'node:path';
import {describe, expect, it, test} from 'vitest';

import {packagesManager} from '../../shared/packagesManager';
import npmToWwwName from '../../www/npmToWwwName';

const monorepoPackageJson = (
  await import('../../shared/readMonorepoPackageJson')
).default();

const publicNpmNames = new Set(
  packagesManager.getPublicPackages().map((pkg) => pkg.getNpmName()),
);

describe('public package.json audits (`pnpm run update-packages` to fix most issues)', () => {
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    const packageJson = pkg.packageJson;
    describe(npmName, () => {
      const sourceFiles = fs
        .readdirSync(pkg.resolve('src'))
        .filter((str) => /\.tsx?/.test(str))
        .map((str) => str.replace(/\.tsx?$/, ''))
        .sort();
      const exportedModules = pkg.getExportedNpmModuleNames().sort();
      const {dependencies = {}, peerDependencies = {}} = packageJson;
      if (packageJson.main) {
        it('should only export the main module with main set', () => {
          expect(exportedModules).toEqual([npmName]);
        });
      }
      it('has *.flow types', () => {
        expect(
          glob.sync(pkg.resolve('flow', '*.flow'), {
            windowsPathsNoEscape: true,
          }),
        ).not.toEqual([]);
      });
      it('uses the expected directory/npm naming convention', () => {
        expect(npmName.replace(/^@/, '').replace('/', '-')).toBe(
          pkg.getDirectoryName(),
        );
      });
      it('matches monorepo version', () => {
        expect(packageJson.version).toBe(monorepoPackageJson.version);
      });
      it('must not have a direct dependency on react or react-dom', () => {
        expect(dependencies).not.toContain('react');
        expect(dependencies).not.toContain('react-dom');
      });
      it('must not have monorepo peerDependencies', () => {
        expect(
          Object.keys(peerDependencies).filter((dep) =>
            publicNpmNames.has(dep),
          ),
        ).toEqual([]);
      });
      it('monorepo dependencies must use the exact monorepo version', () => {
        Object.entries(dependencies).forEach(([dep, version]) => {
          if (publicNpmNames.has(dep)) {
            expect([dep, version]).toEqual([dep, monorepoPackageJson.version]);
          }
        });
      });
      it('must export at least one module', () => {
        expect(exportedModules.length).toBeGreaterThanOrEqual(1);
      });
      test.each(exportedModules)(
        `should have a source file for exported module %s`,
        (exportedModule) => {
          expect(sourceFiles).toContain(
            exportedModule.slice(npmName.length + 1) || 'index',
          );
        },
      );
      if (!sourceFiles.includes('index')) {
        it('must not export a top-level module without an index.tsx?', () => {
          expect(exportedModules).not.toContain(npmName);
        });
        test.each(sourceFiles)(
          `%s.tsx? must have an exported module`,
          (sourceFile) => {
            expect(exportedModules).toContain(`${npmName}/${sourceFile}`);
          },
        );
      }
    });
  });
});

describe('documentation audits (`pnpm run update-packages` to fix most issues)', () => {
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    describe(npmName, () => {
      const root = pkg.resolve('..', '..');
      const docPath = pkg.resolve('README.md');
      describe(path.relative(root, docPath), () => {
        it('exists', () => expect(fs.existsSync(docPath)).toBe(true));
        if (path.basename(docPath) === 'README.md') {
          it('does not have the TODO description', () => {
            expect(fs.readFileSync(docPath, 'utf8')).not.toContain(
              'TODO: This package needs a description!',
            );
          });
        }
      });
    });
  });
});

describe('www public package audits (`pnpm run update-packages` to fix most issues)', () => {
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    const wwwEntrypoint = `${npmToWwwName(npmName)}.js`;
    describe(npmName, () => {
      it('has *.flow types', () => {
        expect(
          glob.sync(pkg.resolve('flow', '*.flow'), {
            windowsPathsNoEscape: true,
          }),
        ).not.toEqual([]);
      });
      // Only worry about the entrypoint stub if it has a single module export
      if (pkg.getExportedNpmModuleNames().every((name) => name === npmName)) {
        it(`has a packages/${pkg.getDirectoryName()}/${wwwEntrypoint}`, () => {
          expect(fs.existsSync(pkg.resolve(wwwEntrypoint))).toBe(true);
        });
      }
    });
  });
});
