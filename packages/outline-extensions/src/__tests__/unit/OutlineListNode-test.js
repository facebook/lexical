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
import {createListNode, isListNode} from '../../OutlineListNode';
import {createListItemNode} from '../../OutlineListItemNode';

const editorThemeClasses = Object.freeze({
  list: {
    ul: 'my-list-ul-class',
  },
});

describe('OutlineListNode tests', () => {
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
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    await update((view) => {
      const listNode = createListNode('ul');
      const listItemNode = createListItemNode();
      const listItemNode2 = createListItemNode();
      listNode.append(listItemNode);
      listNode.append(listItemNode2);
      view.getRoot().append(listNode);
    });
  }

  test('clone()', async () => {
    await update((view) => {
      const listNode = view.getRoot().getFirstChild();
      const clone = listNode.clone();
      expect(clone).not.toBe(listNode);
      expect(isListNode(clone)).toBe(true);
      expect(clone.getChildren()).toHaveLength(2);
    });
  });

  test('getTag()', async () => {
    await update(() => {
      expect(createListNode('ol').getTag()).toBe('ol');
      expect(createListNode('ul').getTag()).toBe('ul');
    });
  });

  test('createDOM()', async () => {
    await update((view) => {
      const listNode = view.getRoot().getFirstChild();
      const element = listNode.createDOM(editorThemeClasses);
      expect(element.outerHTML).toBe('<ul class="my-list-ul-class"></ul>');
    });
  });

  test('updateDOM()', async () => {
    await update((view) => {
      const listNode = view.getRoot().getFirstChild();
      const element = listNode.createDOM(editorThemeClasses);

      const newListNode = createListNode('ul');
      const result = newListNode.updateDOM(listNode, element);
      expect(result).toBe(false);
    });
  });
});
