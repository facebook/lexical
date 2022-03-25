/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  ParagraphNode,
} from 'lexical';
import React from 'react';
import {createRoot} from 'react-dom/client';
import ReactTestUtils from 'react-dom/test-utils';

import useLexicalIsTextContentEmpty from '../../useLexicalIsTextContentEmpty';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('useLexicalIsTextContentEmpty', () => {
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

  function useLexicalEditor(rootElementRef) {
    const editor = React.useMemo(
      () =>
        createEditor({
          nodes: [ParagraphNode],
        }),
      [],
    );

    React.useEffect(() => {
      const rootElement = rootElementRef.current;

      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  test('hook works', async () => {
    const ref = React.createRef();
    let editor;
    let hasText = false;

    function TestBase() {
      editor = useLexicalEditor(ref);
      const isBlank = useLexicalIsTextContentEmpty(editor);
      expect(isBlank).toBe(!hasText);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase />);
    });

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        hasText = true;
      });
    });
  });
});
