<<<<<<< HEAD:packages/lexical-react/src/__tests__/unit/LexicalComposer.test.js
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

=======
>>>>>>> 5402c302 (Run migration script):packages/lexical-react/src/__tests__/unit/LexicalComposer.test.ts
import React from 'react';
import {createRoot} from 'react-dom/client';
import ReactTestUtils from 'react-dom/test-utils';

import {LexicalComposer} from '../../../src/LexicalComposer';
import {useLexicalComposerContext} from '../../LexicalComposerContext';
// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;
describe('LexicalNodeHelpers tests', () => {
  let container = null;
  let reactRoot;
  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });
  afterEach(() => {
    document.body.removeChild(container);
    container = null;
    jest.restoreAllMocks();
  });
  it('LexicalComposerContext', async () => {
    const theme = {};

    function TestPlugin() {
      const [, contextTheme] = useLexicalComposerContext();
      expect(contextTheme.getTheme()).toBe(theme);
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            namespace: 'PlaygroundEditor',
            nodes: [],
            theme,
          }}
        >
          <TestPlugin />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
  });
});