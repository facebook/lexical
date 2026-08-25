/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, test} from 'vitest';

import {validateUrl} from '../../utils/url';

describe('validateUrl', () => {
  // The accepted cases are the reason this is a whitespace guard rather than
  // an anchored pattern: the host class has no `:`, the path class has no
  // parentheses and the query class has no `,`, so `$` is unreachable for all
  // but the plainest URLs.
  test.each([
    'https://',
    'https://example.com',
    'http://localhost:3000',
    'https://example.com:8080/path',
    'https://en.wikipedia.org/wiki/Foo_(bar)',
    'https://example.com/#/spa/route',
    'https://example.com/?a=1,2',
    'mailto:someone@example.com',
    // Copying a URL off its own line carries the newline along with it.
    'https://example.com\n',
  ])('accepts %j', url => {
    expect(validateUrl(url)).toBe(true);
  });

  test.each([
    'check out https://example.com today',
    'see https://example.com',
    'https://example.com and then some',
    'a b',
  ])('rejects %j', url => {
    expect(validateUrl(url)).toBe(false);
  });
});
