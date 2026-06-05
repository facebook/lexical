/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $create,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
  configExtension,
  defineExtension,
  ElementNode,
  type NodeKey,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {NodeSelectionDataSelectedExtension} from '../../NodeSelectionDataSelectedExtension';

class HostNode extends ElementNode {
  $config() {
    return this.config('test-selectable-host', {extends: ElementNode});
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
}

class HostSubclassNode extends HostNode {
  $config() {
    return this.config('test-selectable-host-sub', {extends: HostNode});
  }
}

function setUpEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(NodeSelectionDataSelectedExtension, {
          nodes: [HostNode],
        }),
      ],
      name: 'node-selection-data-selected-test',
      nodes: [HostNode, HostSubclassNode],
      register: editor => {
        const rootElement = document.createElement('div');
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        return () => rootElement.remove();
      },
    }),
  );
}

function $appendHost(node: HostNode): NodeKey {
  node.append($createParagraphNode().append($createTextNode('x')));
  $getRoot().append(node);
  return node.getKey();
}

describe('NodeSelectionDataSelectedExtension', () => {
  test('mirrors NodeSelection onto the configured node host', () => {
    using editor = setUpEditor();
    let key: NodeKey = '';
    editor.update(
      () => {
        key = $appendHost($create(HostNode));
        const selection = $createNodeSelection();
        selection.add(key);
        $setSelection(selection);
      },
      {discrete: true},
    );
    expect(editor.getElementByKey(key)!.getAttribute('data-selected')).toBe(
      'true',
    );
  });

  test('matches a registered subclass of the configured node', () => {
    using editor = setUpEditor();
    let key: NodeKey = '';
    editor.update(
      () => {
        key = $appendHost($create(HostSubclassNode));
        const selection = $createNodeSelection();
        selection.add(key);
        $setSelection(selection);
      },
      {discrete: true},
    );
    // HostSubclassNode.getType() !== HostNode.getType(), so this only passes
    // because init expands the match set along the prototype chain.
    expect(editor.getElementByKey(key)!.getAttribute('data-selected')).toBe(
      'true',
    );
  });

  test('removes the attribute when the node leaves the selection', () => {
    using editor = setUpEditor();
    let key: NodeKey = '';
    editor.update(
      () => {
        key = $appendHost($create(HostSubclassNode));
        const selection = $createNodeSelection();
        selection.add(key);
        $setSelection(selection);
      },
      {discrete: true},
    );
    editor.update(() => $setSelection(null), {discrete: true});
    expect(editor.getElementByKey(key)!.hasAttribute('data-selected')).toBe(
      false,
    );
  });
});
