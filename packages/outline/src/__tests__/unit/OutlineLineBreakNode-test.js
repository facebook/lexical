/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import Outline from 'outline';

describe('OutlineLineBreakNode tests', () => {
  let container = null;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  function useOutlineEditor(editorElementRef) {
    const editor = React.useMemo(() => Outline.createEditor(), []);

    React.useEffect(() => {
      const editorElement = editorElementRef.current;

      editor.setEditorElement(editorElement);
    }, [editorElementRef, editor]);

    return editor;
  }

  let editor = null;

  async function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      editor.addErrorListener(error => {
        throw error
      })
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });
  }

  test('constructor', async () => {
    await update(() => {
      const lineBreakNode = Outline.createLineBreakNode();
      expect(lineBreakNode.getTextContent()).toBe('\n');
    });
  });

  test('createDOM()', async () => {
    await update(() => {
      const lineBreakNode = Outline.createLineBreakNode();
      const element = lineBreakNode.createDOM({});
      expect(element.outerHTML).toBe('<br>');
    });
  });

  test('updateDOM()', async () => {
    await update(() => {
      const lineBreakNode = Outline.createLineBreakNode();
      expect(lineBreakNode.updateDOM()).toBe(false);
    });
  });
});
