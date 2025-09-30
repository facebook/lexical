/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as babel from '@babel/core';
import prettier from '@prettier/sync';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import {describe, expect, it} from 'vitest';

import transformErrorMessages from '../../transform-error-messages';

const prettierConfig = prettier.resolveConfig(__filename) || {};

function waitTick(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

async function withCodes(
  before: Record<string, string>,
  after: Record<string, string>,
  cb: (errorCodesPath: string) => Promise<void> | void,
) {
  const tmpdir = fs.mkdtempSync('transform-error-messages');
  try {
    const errorCodesPath = path.join(tmpdir, 'codes.json');
    fs.writeJsonSync(errorCodesPath, before);
    await cb(errorCodesPath);
    await waitTick();
    expect(fs.readJsonSync(errorCodesPath)).toEqual(after);
  } finally {
    fs.removeSync(tmpdir);
  }
}

function fmt(strings: TemplateStringsArray, ...keys: unknown[]): string {
  const result = [strings[0]];
  keys.forEach((key, i) => {
    result.push(String(key), strings[i + 1]);
  });
  // Normalize some of the stuff that babel will inject so the examples are
  // stable and easier to read:
  // - use strict header
  // - @babel/helper-module-imports interop
  const before = result
    .join('')
    .replace(/.use strict.;\n/g, '')
    .replace(/var _[^;]+;\n/g, '')
    .replace(/function _interopRequireDefault\([^)]*\) {[^;]+?;[\s\n]*}\n/g, '')
    .replace(/_format(Dev|Prod)(Error|Warning)Message\d+/g, 'format$1$2Message')
    .replace(
      /\(0,\s*format(Dev|Prod)(Error|Warning)Message\.default\)/g,
      'format$1$2Message',
    )
    .trim();
  return prettier.format(before, {
    ...prettierConfig,
    filepath: 'test.js',
  });
}

const NEW_MSG = 'A new invariant';
const KNOWN_MSG = 'A %s message that contains %s';
const KNOWN_MSG_MAP = Object.fromEntries(
  [KNOWN_MSG].map((msg, i) => [String(i), msg]),
);
const NEW_MSG_MAP = Object.fromEntries(
  [KNOWN_MSG, NEW_MSG].map((msg, i) => [String(i), msg]),
);

interface ExpectTransformOptions {
  codeBefore: string;
  codeExpect: string;
  messageMapBefore: Record<string, string>;
  messageMapExpect: Record<string, string>;
  opts: Partial<
    import('../../transform-error-messages').TransformErrorMessagesOptions
  >;
}

async function expectTransform(opts: ExpectTransformOptions) {
  return await withCodes(
    opts.messageMapBefore,
    opts.messageMapExpect,
    async (errorCodesPath) => {
      const {code} = babel.transformSync(fmt`${opts.codeBefore}`, {
        configFile: false,
        plugins: [[transformErrorMessages, {errorCodesPath, ...opts.opts}]],
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: 'current',
              },
            },
          ],
        ],
      })!;
      expect(fmt`${code}`).toEqual(fmt`${opts.codeExpect}`);
    },
  );
}

describe('transform-error-messages', () => {
  describe('invariant', () => {
    describe('{extractCodes: true, noMinify: false}', () => {
      const opts = {extractCodes: true, noMinify: false};
      it('inserts known and extracts unknown message codes', async () => {
        await expectTransform({
          codeBefore: `
        invariant(condition, ${JSON.stringify(NEW_MSG)});
        invariant(condition, ${JSON.stringify(KNOWN_MSG)}, adj, noun);
        `,
          codeExpect: `
        if (!condition) {
          formatProdErrorMessage(1);
        }
        if (!condition) {
          formatProdErrorMessage(0, adj, noun);
        }`,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: NEW_MSG_MAP,
          opts,
        });
      });
    });
    describe('{extractCodes: true, noMinify: true}', () => {
      const opts = {extractCodes: true, noMinify: true};
      it('inserts known and extracts unknown message codes', async () => {
        await expectTransform({
          codeBefore: `
        invariant(condition, ${JSON.stringify(NEW_MSG)});
        invariant(condition, ${JSON.stringify(KNOWN_MSG)}, adj, noun);
        `,
          codeExpect: `
        if (!condition) {
          formatDevErrorMessage(\`A new invariant\`);
        }
        if (!condition) {
          formatDevErrorMessage(\`A \${adj} message that contains \${noun}\`);
        }`,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: NEW_MSG_MAP,
          opts,
        });
      });
    });
    describe('{extractCodes: false, noMinify: false}', () => {
      const opts = {extractCodes: false, noMinify: false};
      it('inserts known message', async () => {
        await expectTransform({
          codeBefore: `invariant(condition, ${JSON.stringify(
            KNOWN_MSG,
          )}, adj, noun)`,
          codeExpect: `
          if (!condition) {
            formatProdErrorMessage(0, adj, noun);
          }
        `,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: KNOWN_MSG_MAP,
          opts,
        });
      });
      it('inserts warning comment for unknown messages', async () => {
        await expectTransform({
          codeBefore: `invariant(condition, ${JSON.stringify(NEW_MSG)})`,
          codeExpect: `
          /*FIXME (minify-errors-in-prod): Unminified error message in production build!*/
          if (!condition) {
            formatDevErrorMessage(\`A new invariant\`);
          }
       `,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: KNOWN_MSG_MAP,
          opts,
        });
      });
    });
  });
  describe('devInvariant', () => {
    describe('{extractCodes: true, noMinify: false}', () => {
      const opts = {extractCodes: true, noMinify: false};
      it('inserts known and extracts unknown message codes', async () => {
        await expectTransform({
          codeBefore: `
        devInvariant(condition, ${JSON.stringify(NEW_MSG)});
        devInvariant(condition, ${JSON.stringify(KNOWN_MSG)}, adj, noun);
        `,
          codeExpect: `
        if (!condition) {
          formatProdWarningMessage(1);
        }
        if (!condition) {
          formatProdWarningMessage(0, adj, noun);
        }`,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: NEW_MSG_MAP,
          opts,
        });
      });
    });
    describe('{extractCodes: true, noMinify: true}', () => {
      const opts = {extractCodes: true, noMinify: true};
      it('inserts known and extracts unknown message codes', async () => {
        await expectTransform({
          codeBefore: `
        devInvariant(condition, ${JSON.stringify(NEW_MSG)});
        devInvariant(condition, ${JSON.stringify(KNOWN_MSG)}, adj, noun);
        `,
          codeExpect: `
        if (!condition) {
          formatDevErrorMessage(\`A new invariant\`);
        }
        if (!condition) {
          formatDevErrorMessage(\`A \${adj} message that contains \${noun}\`);
        }`,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: NEW_MSG_MAP,
          opts,
        });
      });
    });
    describe('{extractCodes: false, noMinify: false}', () => {
      const opts = {extractCodes: false, noMinify: false};
      it('inserts known message', async () => {
        await expectTransform({
          codeBefore: `devInvariant(condition, ${JSON.stringify(
            KNOWN_MSG,
          )}, adj, noun)`,
          codeExpect: `
          if (!condition) {
            formatProdWarningMessage(0, adj, noun);
          }
        `,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: KNOWN_MSG_MAP,
          opts,
        });
      });
      it('inserts warning comment for unknown messages', async () => {
        await expectTransform({
          codeBefore: `devInvariant(condition, ${JSON.stringify(NEW_MSG)})`,
          codeExpect: `
          /*FIXME (minify-errors-in-prod): Unminified error message in production build!*/
          if (!condition) {
            formatDevWarningMessage(\`A new invariant\`);
          }
       `,
          messageMapBefore: KNOWN_MSG_MAP,
          messageMapExpect: KNOWN_MSG_MAP,
          opts,
        });
      });
    });
  });
});
