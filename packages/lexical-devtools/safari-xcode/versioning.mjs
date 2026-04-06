/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs';
import path from 'path';

const version = JSON.parse(
  fs
    .readFileSync(
      path.resolve(import.meta.dirname, '../.output/safari-mv2/manifest.json'),
    )
    .toString(),
).version;

// Print to STDERR for user to see
console.error(`Using version: ${version}`);
// Print to STDOUT for scripts to pick up
// eslint-disable-next-line no-console
console.log(`${version}`);

fs.writeFileSync(
  path.resolve(
    import.meta.dirname,
    'Lexical Developer Tools/VersioningConfig.xcconfig',
  ),
  `VERSION=${version}\nBUILD_VERSION=${version}\n`,
  {encoding: 'utf8', flag: 'w'},
);
