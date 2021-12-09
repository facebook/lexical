/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor, $createTextNode, $getRoot} from 'outline';
import {$createParagraphNode} from 'outline/ParagraphNode';
import useOutlineIsTextContentEmpty from '../../useOutlineIsTextContentEmpty';

describe('useOutlineIsTextContentEmpty', () => {
  let container = null;
  let reactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = ReactDOM.createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;

    jest.restoreAllMocks();
  });

  function useOutlineEditor(rootElementRef) {
    const editor = React.useMemo(() => createEditor(), []);

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
      editor = useOutlineEditor(ref);
      editor.addListener('error', (error) => {
        throw error;
      });
      const isBlank = useOutlineIsTextContentEmpty(editor);
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
