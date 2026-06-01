/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  getCodeLanguageOptions,
  getLanguageFriendlyName,
  isCodeLanguageLoaded,
  normalizeCodeLanguage,
} from '@lexical/code-prism';
import {describe, expect, test} from 'vitest';

describe('Prism code language options', () => {
  test('includes Go (#7704)', () => {
    expect(getCodeLanguageOptions()).toContainEqual(['go', 'Go']);
    expect(getLanguageFriendlyName('go')).toBe('Go');
    expect(normalizeCodeLanguage('golang')).toBe('go');
    expect(isCodeLanguageLoaded('go')).toBe(true);
  });
});
