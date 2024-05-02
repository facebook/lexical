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
const path = require('node:path');
const transformErrorMessages = require('../../transform-error-messages');
const babel = require('@babel/core');
const prettier = require('prettier');

const prettierConfig = prettier.resolveConfig.sync('./') || {};

/** @returns {Promise<void>} */
function waitTick() {
  return new Promise((resolve) => queueMicrotask(resolve));
}

/**
 * @param {Record<string,string>} before
 * @param {Record<string,string>} after
 * @param {(errorCodesPath: string) => Promise<void> | void} cb
 */
async function withCodes(before, after, cb) {
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

function fmt(strings: TemplateStringsArray, ...keys: unknown[]) {
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
    .replace(/function _interopRequireDefault\(obj\) {[^;]+?;[\s\n]*}\n/g, '')
    .replace(/_formatProdErrorMessage\d+/g, 'formatProdErrorMessage')
    .replace(
      /\(0,\s*formatProdErrorMessage\.default\)/g,
      'formatProdErrorMessage',
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

/**
 * @typedef {Object} ExpectTransformOptions
 * @property {string} codeBefore
 * @property {string} codeExpect
 * @property {Record<string, string>} messageMapBefore
 * @property {Record<string, string>} messageMapExpect
 * @property {Partial<import('../../transform-error-messages').TransformErrorMessagesOptions>} opts
 */

/** @param {ExpectTransformOptions} opts */
async function expectTransform(opts) {
  return await withCodes(
    opts.messageMapBefore,
    opts.messageMapExpect,
    async (errorCodesPath) => {
      const {code} = babel.transform(fmt`${opts.codeBefore}`, {
        plugins: [[transformErrorMessages, {errorCodesPath, ...opts.opts}]],
      });
      const afterCode = fmt`${code}`;
      console.log({afterCode, code});
      expect(fmt`${code}`).toEqual(fmt`${opts.codeExpect}`);
    },
  );
}

describe('transform-error-messages', () => {
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
          {
            formatProdErrorMessage(1);
          }
        }
        if (!condition) {
          {
            formatProdErrorMessage(0, adj, noun);
          }
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
          throw Error(\`A new invariant\`);
        }
        if (!condition) {
          throw Error(\`A \${adj} message that contains \${noun}\`);
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
            {
              formatProdErrorMessage(0, adj, noun);
            }
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
            throw Error(\`A new invariant\`);
          }
       `,
        messageMapBefore: KNOWN_MSG_MAP,
        messageMapExpect: KNOWN_MSG_MAP,
        opts,
      });
    });
  });
});
