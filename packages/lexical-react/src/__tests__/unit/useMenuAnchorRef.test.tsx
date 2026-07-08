/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createTestEditor} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {useMenuAnchorRef} from '../../shared/LexicalMenu';

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [createTestEditor()],
}));

// Only force CAN_USE_DOM; keep every other real `lexical` export so modules
// pulled in transitively (e.g. @lexical/extension's defineExtension) still work.
vi.mock('lexical', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical')>()),
  CAN_USE_DOM: false,
}));

describe('useMenuAnchorRef', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if CAN_USE_DOM is false', async () => {
    let anchorElementRef;

    function App() {
      const resolution = null;
      const setResolution = vi.fn();
      const anchorClassName = 'some-class';
      const parent = undefined;
      const shouldIncludePageYOffset__EXPERIMENTAL = true;

      anchorElementRef = useMenuAnchorRef(
        resolution,
        setResolution,
        anchorClassName,
        parent,
        shouldIncludePageYOffset__EXPERIMENTAL,
      );

      return null;
    }

    await act(async () => {
      reactRoot.render(<App />);
    });

    expect(anchorElementRef!.current).toBeNull();
  });
});
