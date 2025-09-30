/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @ts-check
/* eslint-disable no-console */
import {spawn} from 'child-process-promise';
import {sync as globSync} from 'glob';
import minimist from 'minimist';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {gt as semverGt} from 'semver';

import {PackageMetadata} from './shared/PackageMetadata.js';

async function main() {
  const argv = minimist(process.argv.slice(2));
  const {version} = new PackageMetadata('package.json').packageJson;
  const paths =
    argv._.length > 0
      ? argv._
      : ['examples/*', 'scripts/__tests__/integration/fixtures/*'];
  for (const fn of paths.flatMap((dir) =>
    globSync(path.join(dir, 'package.json'), {windowsPathsNoEscape: true}),
  )) {
    const pkg = new PackageMetadata(fn);
    console.log(`\nUpdating example ${path.dirname(fn)}\n`);
    // assume that npm run update-packages has already updated the version and lexical deps
    const json = pkg.packageJson;
    const {lexicalUnreleasedDependencies = {}} = json;
    let hasUnreleasedDependency = false;
    for (const [k, v] of Object.entries(lexicalUnreleasedDependencies)) {
      if (semverGt(version, v)) {
        delete lexicalUnreleasedDependencies[k];
        json.dependencies[k] = version;
      } else {
        hasUnreleasedDependency = true;
      }
    }
    pkg
      .sortDependencies('dependencies')
      .sortDependencies(
        'lexicalUnreleasedDependencies',
        lexicalUnreleasedDependencies,
      )
      .writeSync();
    const npm = async (...args) => {
      console.log(['>', 'npm', ...args].join(' '));
      try {
        await spawn('npm', args, {
          cwd: pkg.resolve(),
          stdio: 'inherit',
        });
      } catch (err) {
        console.error(`\nFailed to update example ${path.dirname(fn)}`);
        process.exit(
          'code' in err && typeof err.code === 'number' ? err.code : 1,
        );
      }
    };
    await npm('i');
    if (hasUnreleasedDependency) {
      console.log(
        'Unreleased lexical dependencies required, removing local versions',
      );
      for (const dir of [
        pkg.resolve('node_modules', '{lexical,@lexical}'),
      ].flatMap((v) => globSync(v))) {
        console.log(`> rm -rf ${dir}`);
        fs.rmSync(dir, {force: true, recursive: true});
      }
    }
    await npm(
      'run',
      'build',
      ...(hasUnreleasedDependency
        ? ['--', '-c', 'vite.config.monorepo.ts']
        : []),
    );
  }
}

main();
