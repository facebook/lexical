/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  contextFromPairs,
  contextUpdater,
  contextValue,
  createContextState,
  getContextValue,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const TestContextSymbol: unique symbol = Symbol.for('@lexical/TestContext');

const depth = /* @__PURE__ */ createContextState(
  TestContextSymbol,
  'depth',
  () => 0,
);
const label = /* @__PURE__ */ createContextState(
  TestContextSymbol,
  'label',
  () => 'none',
);

describe('ContextRecord', () => {
  test('a child layer reads through to its parent', () => {
    const parent = contextFromPairs([contextValue(depth, 1)], undefined);
    const child = contextFromPairs([contextValue(label, 'child')], parent);
    expect(child).not.toBe(parent);
    // set here, and inherited from the parent
    expect(getContextValue(child, label)).toBe('child');
    expect(getContextValue(child, depth)).toBe(1);
    // unset anywhere: the config's default
    expect(getContextValue(undefined, depth)).toBe(0);
  });

  test('a layer that changes nothing is the parent itself', () => {
    const parent = contextFromPairs([contextValue(depth, 1)], undefined);
    expect(contextFromPairs([contextValue(depth, 1)], parent)).toBe(parent);
    expect(contextFromPairs([], parent)).toBe(parent);
  });

  test('an updater sees the value the layer resolves to', () => {
    const parent = contextFromPairs([contextValue(depth, 1)], undefined);
    const child = contextFromPairs(
      [contextUpdater(depth, prev => prev + 1)],
      parent,
    );
    expect(getContextValue(child, depth)).toBe(2);
    expect(getContextValue(parent, depth)).toBe(1);
  });

  test('a layer never mutates the parent it was built from', () => {
    const parent = contextFromPairs([contextValue(depth, 1)], undefined);
    const child = contextFromPairs(
      [contextValue(depth, 2), contextValue(label, 'child')],
      parent,
    );
    expect(getContextValue(child, depth)).toBe(2);
    expect(getContextValue(parent, depth)).toBe(1);
    expect(getContextValue(parent, label)).toBe('none');
  });
});
