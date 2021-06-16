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

import {createEditor} from 'outline';
import {createImageNode, ImageNode} from 'outline/ImageNode';

const editorThemeClasses = Object.freeze({
  image: 'my-image-class',
});

describe('OutlineImageNode tests', () => {
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
    const editor = React.useMemo(() => createEditor(), []);

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
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    await update((view) => {
      const imageNode = createImageNode('logo.jpg', 'Alt Text');
      view.getRoot().append(imageNode);
    });
  }

  test('clone()', async () => {
    await update((view) => {
      const imageNode = view.getRoot().getFirstChild();
      const clone = imageNode.clone();
      expect(clone).not.toBe(imageNode);
      expect(clone instanceof ImageNode).toBe(true);
    });
  });

  test('isImage()', async () => {
    await update((view) => {
      expect(view.getRoot().getFirstChild().isImage()).toBe(true);
    });
  });

  test('createDOM()', async () => {
    await update((view) => {
      const element = view
        .getRoot()
        .getFirstChild()
        .createDOM(editorThemeClasses);
      expect(element.outerHTML).toBe(
        '<div class="my-image-class"><img src="logo.jpg" alt="Alt Text"></div>',
      );
    });
  });

  test('updateDOM()', async () => {
    await update((view) => {
      const imageNode = view.getRoot().getFirstChild();
      const element = imageNode.createDOM(editorThemeClasses);

      const newImageNode = createImageNode('new-logo.jpg', 'New Alt Text');
      const result = newImageNode.updateDOM(imageNode, element);
      expect(result).toBe(false);
      expect(element.outerHTML).toBe(
        '<div class="my-image-class"><img src="new-logo.jpg" alt="New Alt Text"></div>',
      );
    });
  });
});
