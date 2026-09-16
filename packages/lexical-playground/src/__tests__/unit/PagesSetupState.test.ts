/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {describe, expect, it} from 'vitest';

import {
  DEFAULT_PAGE_SETUP,
  DEFAULT_SLOT_SETUP,
  pageSetupState,
} from '../../plugins/PagesExtension';

describe('pageSetupState', () => {
  it('fills header and footer defaults for documents written before them', () => {
    const parsed = pageSetupState.parse({
      margins: {bottom: 1, left: 1, right: 1, top: 1},
      orientation: 'landscape',
      pageSize: 'Letter',
    });
    expect(parsed).toEqual({
      footer: DEFAULT_SLOT_SETUP,
      header: DEFAULT_SLOT_SETUP,
      margins: {bottom: 1, left: 1, right: 1, top: 1},
      orientation: 'landscape',
      pageSize: 'Letter',
    });
  });

  it('parses slot settings and ignores junk', () => {
    const parsed = pageSetupState.parse({
      footer: 'nope',
      header: {
        differentEvenPages: 'yes',
        differentFirstPage: true,
        enabled: true,
      },
      pageSize: 'A4',
    });
    expect(parsed?.header).toEqual({
      differentEvenPages: false,
      differentFirstPage: true,
      enabled: true,
    });
    expect(parsed?.footer).toEqual(DEFAULT_SLOT_SETUP);
  });

  it('returns null for non-objects', () => {
    expect(pageSetupState.parse(null)).toBeNull();
    expect(pageSetupState.parse([])).toBeNull();
    expect(pageSetupState.parse('A4')).toBeNull();
  });

  it('compares slot settings in isEqual', () => {
    const withHeader = {
      ...DEFAULT_PAGE_SETUP,
      header: {...DEFAULT_SLOT_SETUP, enabled: true},
    };
    expect(pageSetupState.isEqual(DEFAULT_PAGE_SETUP, withHeader)).toBe(false);
    expect(
      pageSetupState.isEqual(withHeader, {
        ...withHeader,
        header: {...withHeader.header},
      }),
    ).toBe(true);
    expect(pageSetupState.isEqual(null, null)).toBe(true);
    expect(pageSetupState.isEqual(null, DEFAULT_PAGE_SETUP)).toBe(false);
  });
});
