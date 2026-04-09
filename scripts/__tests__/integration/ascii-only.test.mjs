/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
import fs from 'fs-extra';
import {glob} from 'glob';
import {describe, expect, test} from 'vitest';

import {packagesManager} from '../../shared/packagesManager.js';

describe('prod ascii-only check', () => {
  for (const pkg of packagesManager.getPublicPackages()) {
    test(pkg.getNpmName(), () => {
      const files = glob.sync(pkg.resolve('npm', '*.prod.{mjs,js}'), {
        windowsPathsNoEscape: true,
      });
      expect(files).not.toHaveLength(0);
      expect(
        files.filter((fn) =>
          // eslint-disable-next-line no-control-regex
          /[^\x00-\x7f]/.test(fs.readFileSync(fn, {encoding: 'utf8'})),
        ),
      ).toHaveLength(0);
    });
  }
});
