/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const path = require('node:path');
const {packagesManager} = require('../../shared/packagesManager');

const monorepoPackageJson = require('../../shared/readMonorepoPackageJson')();

const publicNpmNames = new Set(
  packagesManager.getPublicPackages().map((pkg) => pkg.getNpmName()),
);

describe('public package.json audits (`npm run update-version` to fix most issues)', () => {
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    const packageJson = pkg.packageJson;
    describe(npmName, () => {
      const sourceFiles = fs
        .readdirSync(pkg.resolve('src'))
        .filter((str) => /\.tsx?/.test(str))
        .map((str) => str.replace(/\.tsx?$/, '', str))
        .sort();
      const exportedModules = pkg.getExportedNpmModuleNames().sort();
      const {dependencies = {}, peerDependencies = {}} = packageJson;
      if (packageJson.main) {
        it('should only export the main module with main set', () => {
          expect(exportedModules).toEqual([npmName]);
        });
      }
      it('has *.flow types', () => {
        expect(glob.sync(pkg.resolve('flow', '*.flow'))).not.toEqual([]);
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

describe('documentation audits (`npm run update-docs` to fix most issues)', () => {
  const webPkg = packagesManager.getPackageByDirectoryName('lexical-website');
  packagesManager.getPublicPackages().forEach((pkg) => {
    const npmName = pkg.getNpmName();
    describe(npmName, () => {
      const root = pkg.resolve('..', '..');
      [
        pkg.resolve('README.md'),
        webPkg.resolve('docs', 'packages', `${pkg.getDirectoryName()}.md`),
      ].forEach((docPath) => {
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
});
