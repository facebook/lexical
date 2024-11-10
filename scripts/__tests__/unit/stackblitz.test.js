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

const STACKBLITZ_RE = /:\/\/stackblitz.com\/github\/([^?"']+)/g;

describe('stackblitz doc url audits', () => {
  glob
    .sync(['packages/*/README.md', 'packages/lexical-website/docs/**/*.md'], {
      ignore: 'packages/lexical-website/docs/api/**',
    })
    .forEach((fn) =>
      describe(fn, () =>
        it('Does not have incorrect stackblitz URLs', () => {
          const contents = fs.readFileSync(fn, 'utf8');
          for (const [, githubPath] of contents.matchAll(STACKBLITZ_RE)) {
            expect(githubPath).toMatch(
              /^facebook\/lexical\/tree\/main\/examples\//,
            );
          }
        }),
      ),
    );
});
