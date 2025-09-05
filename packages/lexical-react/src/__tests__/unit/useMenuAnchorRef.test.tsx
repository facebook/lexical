/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createTestEditor} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {useMenuAnchorRef} from '../../shared/LexicalMenu';

describe('useMenuAnchorRef', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    vi.mock('@lexical/react/LexicalComposerContext', () => ({
      useLexicalComposerContext: () => [createTestEditor()],
    }));

    vi.mock('shared/canUseDOM', () => ({
      CAN_USE_DOM: false,
    }));

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

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });

    expect(anchorElementRef!.current).toBeNull();
  });
});
