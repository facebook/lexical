/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getEditor,
  $getNodeByKey,
  $getRoot,
  DecoratorNode,
  defineExtension,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

class ReactDecoratorNode extends DecoratorNode<React.ReactNode> {
  __label = 'hello';

  $config() {
    return this.config('react-decorator-portal-rev', {extends: DecoratorNode});
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    return (editor._window || window).document.createElement('div');
  }

  updateDOM(): boolean {
    return false;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__label = prevNode.__label;
  }

  setLabel(label: string): this {
    const self = this.getWritable();
    self.__label = label;
    return self;
  }

  decorate(): React.ReactNode {
    return <span data-testid="decorator-portal">{this.__label}</span>;
  }
}

function $createReactDecoratorNode(label: string): ReactDecoratorNode {
  return $applyNodeReplacement(new ReactDecoratorNode().setLabel(label));
}

function $isReactDecoratorNode(
  node: LexicalNode | null | undefined,
): node is ReactDecoratorNode {
  return node instanceof ReactDecoratorNode;
}

describe('useDecorators root remount', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
    vi.restoreAllMocks();
  });

  test('recreates decorator portals after root detach/attach without decorator map changes', async () => {
    let editor: LexicalEditor | undefined;
    let decoratorKey: NodeKey | undefined;

    function GrabEditor() {
      [editor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              const decorator = $createReactDecoratorNode('hello');
              decoratorKey = decorator.getKey();
              $getRoot().append($createParagraphNode(), decorator);
            },
            namespace: '',
            nodes: [ReactDecoratorNode],
            onError: err => {
              throw err;
            },
            theme: {},
          }}>
          <GrabEditor />
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await act(async () => {
      reactRoot.render(<App />);
    });

    expect(editor).toBeDefined();
    expect(decoratorKey).toBeDefined();
    expect(
      container!.querySelector('[data-testid="decorator-portal"]')?.textContent,
    ).toBe('hello');

    const previousRoot = editor!.getRootElement();
    expect(previousRoot).not.toBeNull();

    // Detach the root, then refresh decorators while getElementByKey is null so
    // portal creation is skipped (same race as remount-before-root-attach).
    await act(async () => {
      editor!.setRootElement(null);
    });

    await act(async () => {
      editor!.update(() => {
        const node = $getNodeByKey(decoratorKey!);
        if ($isReactDecoratorNode(node)) {
          // Force a decorator refresh without changing rendered content.
          node.setLabel('hello');
        }
      });
    });

    expect(
      container!.querySelector('[data-testid="decorator-portal"]'),
    ).toBeNull();

    const nextRoot = document.createElement('div');
    nextRoot.contentEditable = 'true';
    container!.appendChild(nextRoot);

    await act(async () => {
      editor!.setRootElement(nextRoot);
    });

    expect(editor!.getRootElement()).toBe(nextRoot);
    expect(editor!.getRootElement()).not.toBe(previousRoot);
    expect(
      container!.querySelector('[data-testid="decorator-portal"]')?.textContent,
    ).toBe('hello');
  });
});

describe('useReactDecorators root remount', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
    vi.restoreAllMocks();
  });

  test('recreates decorator portals after root detach/attach without decorator map changes', async () => {
    let editor: LexicalEditor | undefined;
    let decoratorKey: NodeKey | undefined;

    const extension = defineExtension({
      $initialEditorState: () => {
        editor = $getEditor();
        const decorator = $createReactDecoratorNode('hello');
        decoratorKey = decorator.getKey();
        $getRoot().append($createParagraphNode(), decorator);
      },
      dependencies: [RichTextExtension],
      name: '[test-useReactDecorators-root-remount]',
      nodes: [ReactDecoratorNode],
    });

    function GrabEditor() {
      [editor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalExtensionComposer extension={extension}>
          <GrabEditor />
        </LexicalExtensionComposer>
      );
    }

    await act(async () => {
      reactRoot.render(<App />);
    });

    expect(editor).toBeDefined();
    expect(decoratorKey).toBeDefined();
    expect(
      container!.querySelector('[data-testid="decorator-portal"]')?.textContent,
    ).toBe('hello');

    const previousRoot = editor!.getRootElement();
    expect(previousRoot).not.toBeNull();

    await act(async () => {
      editor!.setRootElement(null);
    });

    await act(async () => {
      editor!.update(() => {
        const node = $getNodeByKey(decoratorKey!);
        if ($isReactDecoratorNode(node)) {
          node.setLabel('hello');
        }
      });
    });

    expect(
      container!.querySelector('[data-testid="decorator-portal"]'),
    ).toBeNull();

    const nextRoot = document.createElement('div');
    nextRoot.contentEditable = 'true';
    container!.appendChild(nextRoot);

    await act(async () => {
      editor!.setRootElement(nextRoot);
    });

    expect(editor!.getRootElement()).toBe(nextRoot);
    expect(editor!.getRootElement()).not.toBe(previousRoot);
    expect(
      container!.querySelector('[data-testid="decorator-portal"]')?.textContent,
    ).toBe('hello');
  });
});
