/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check

import fs from 'fs-extra';
import path from 'node:path';

export default function readMonorepoPackageJson() {
  return fs.readJsonSync(
    path.resolve(import.meta.dirname, '../../package.json'),
  );
}
