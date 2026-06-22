/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  NodeSelectionDataSelectedExtension,
} from '@lexical/extension';
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

  test('mirrors a NodeSelection already committed when register() runs', () => {
    let key: NodeKey = '';
    // Registers ahead of the extension (dependency order), committing a
    // NodeSelection before the extension's register() runs — the same shape
    // as adding the extension to an already-live editor.
    const SeedExtension = defineExtension({
      name: 'seed-before-data-selected',
      register: editor => {
        const rootElement = document.createElement('div');
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        editor.update(
          () => {
            key = $appendHost($create(HostNode));
            const selection = $createNodeSelection();
            selection.add(key);
            $setSelection(selection);
          },
          {discrete: true},
        );
        return () => rootElement.remove();
      },
    });
    // Registers right after the extension, before any further update can
    // fire its update listener: the attribute observed here can only come
    // from the registration-time sync.
    let attributeAtProbeTime: string | null = null;
    const ProbeExtension = defineExtension({
      name: 'probe-after-data-selected',
      register: editor => {
        attributeAtProbeTime = editor
          .getElementByKey(key)!
          .getAttribute('data-selected');
        return () => {};
      },
    });
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          SeedExtension,
          configExtension(NodeSelectionDataSelectedExtension, {
            nodes: [HostNode],
          }),
          ProbeExtension,
        ],
        name: 'initial-sync-test',
        nodes: [HostNode, HostSubclassNode],
      }),
    );
    expect(attributeAtProbeTime).toBe('true');
    expect(editor.getElementByKey(key)!.getAttribute('data-selected')).toBe(
      'true',
    );
  });

  test('clears the attribute from still-mounted DOM on teardown', () => {
    const editor = setUpEditor();
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
    const dom = editor.getElementByKey(key)!;
    expect(dom.getAttribute('data-selected')).toBe('true');
    editor.dispose();
    // The host element outlives the editor (e.g. the extension alone is torn
    // down, or the app keeps the rendered DOM); the disposer must not leave
    // a stale selected marker on it.
    expect(dom.hasAttribute('data-selected')).toBe(false);
  });

  test('throws when a configured class is not registered on the editor', () => {
    expect(() =>
      buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            configExtension(NodeSelectionDataSelectedExtension, {
              nodes: [HostNode],
            }),
          ],
          name: 'unregistered-node-test',
          // HostNode deliberately not in `nodes`.
        }),
      ),
    ).toThrow(/not registered in editor/);
  });
});
