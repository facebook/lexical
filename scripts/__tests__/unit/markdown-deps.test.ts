/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as ts from 'typescript';
import {describe, expect, test} from 'vitest';

const markdownSourceFiles = glob.sync(
  'packages/lexical-markdown/src/**/*.{ts,tsx}',
  {
    ignore: ['**/__tests__/**'],
  },
);

const FORBIDDEN_MODULE = '@lexical/code';

describe('@lexical/markdown dependency audits', () => {
  test.each(markdownSourceFiles)(
    '%s does not import @lexical/code root module',
    (filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const importedModules = ts
        .preProcessFile(source, true, true)
        .importedFiles.map(({fileName}) => fileName);
      expect(
        importedModules,
        `${filePath} should import @lexical/code/node, not @lexical/code`,
      ).not.toContain(FORBIDDEN_MODULE);
    },
  );
});
