/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createDefaultOnReposition} from '@lexical/utils';
import {describe, expect, it} from 'vitest';

describe('createDefaultOnReposition', () => {
  it('defaults the rect background to the system Highlight color', () => {
    const defaultNode = document.createElement('div');
    createDefaultOnReposition()([defaultNode]);
    const explicitNode = document.createElement('div');
    createDefaultOnReposition({background: 'Highlight'})([explicitNode]);
    expect(defaultNode.style.background).toBe(explicitNode.style.background);
  });

  it('applies a custom background color when one is given', () => {
    const node = document.createElement('div');
    createDefaultOnReposition({background: 'rgb(0, 100, 200)'})([node]);
    expect(node.style.background).toBe('rgb(0, 100, 200)');
  });

  it('keeps the margin and padding offsets regardless of color', () => {
    const node = document.createElement('div');
    createDefaultOnReposition({background: 'Highlight'})([node]);
    expect(node.style.marginTop).toBe('-1.5px');
    expect(node.style.paddingTop).toBe('4px');
    expect(node.style.paddingBottom).toBe('0px');
  });
});
