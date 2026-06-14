/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerAriaLiveRegion} from '@lexical/a11y';
import {afterEach, describe, expect, test} from 'vitest';

const ZERO_WIDTH_SPACE = '\u200B';

afterEach(() => {
  for (const region of Array.from(
    document.body.querySelectorAll('[aria-live]'),
  )) {
    region.remove();
  }
});

describe('registerAriaLiveRegion', () => {
  test('mounts a polite live region on document.body by default', () => {
    const handle = registerAriaLiveRegion();
    const regions = document.body.querySelectorAll('[aria-live]');
    expect(regions.length).toBe(1);
    const region = regions[0];
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.parentNode).toBe(document.body);
    handle.dispose();
  });

  test('respects politeness option', () => {
    const handle = registerAriaLiveRegion({politeness: 'assertive'});
    const region = document.body.querySelector('[aria-live]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('assertive');
    handle.dispose();
  });

  test('mounts inside the provided owner', () => {
    const owner = document.createElement('section');
    document.body.appendChild(owner);
    const handle = registerAriaLiveRegion({owner});
    const region = owner.querySelector('[aria-live]');
    expect(region).not.toBeNull();
    expect(region!.parentNode).toBe(owner);
    expect(document.body.querySelector('[aria-live]')).toBe(region);
    handle.dispose();
    owner.remove();
  });

  test('announce writes textContent', () => {
    const handle = registerAriaLiveRegion();
    const region = document.body.querySelector('[aria-live]') as HTMLElement;
    handle.announce('Hello');
    expect(region.textContent).toBe('Hello');
    handle.dispose();
  });

  test('announce of the same message twice appends a zero-width space', () => {
    const handle = registerAriaLiveRegion();
    const region = document.body.querySelector('[aria-live]') as HTMLElement;
    handle.announce('Same');
    expect(region.textContent).toBe('Same');
    handle.announce('Same');
    expect(region.textContent).toBe('Same' + ZERO_WIDTH_SPACE);
    handle.dispose();
  });

  test('dispose removes the live region and is idempotent', () => {
    const handle = registerAriaLiveRegion();
    expect(document.body.querySelectorAll('[aria-live]').length).toBe(1);
    handle.dispose();
    expect(document.body.querySelectorAll('[aria-live]').length).toBe(0);
    // Second dispose is a no-op.
    handle.dispose();
    // announce after dispose is a no-op (no region, no throw).
    handle.announce('ignored');
    expect(document.body.querySelectorAll('[aria-live]').length).toBe(0);
  });
});
