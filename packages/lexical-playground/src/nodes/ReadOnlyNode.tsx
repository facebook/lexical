/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$restoreEditorState} from '@lexical/utils';
import {
  $isElementNode,
  EditorConfig,
  EditorState,
  ElementNode,
  Klass,
  LexicalNode,
  NodeKey,
  RootNode,
  SerializedElementNode,
} from 'lexical';
import {useEffect} from 'react';

export class ReadOnlyNode extends ElementNode {
  static getType(): string {
    return 'readOnly';
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  static clone(node: ReadOnlyNode): ReadOnlyNode {
    return new ReadOnlyNode(node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('span');
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  exportJSON(): SerializedElementNode {
    return {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      type: this.getType(),
      version: 1,
    };
  }
}

export function $createReadOnlyNode(): ReadOnlyNode {
  return new ReadOnlyNode();
}

export function $isReadOnlyNode(node: LexicalNode): node is ReadOnlyNode {
  return node instanceof ReadOnlyNode;
}

export function ReadOnlyPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let lastRestoredEditorState: EditorState | null = null;

    return editor.registerNodeTransform(RootNode, (rootNode: RootNode) => {
      const prevEditorState = editor.getEditorState();

      let prevTextContent = '';
      prevEditorState.read(() =>
        $getDescendantNodesOfType(rootNode, ReadOnlyNode).forEach(
          (promptNode) => {
            prevTextContent += promptNode.getTextContent();
          },
        ),
      );
      let textContent = '';
      $getDescendantNodesOfType(rootNode, ReadOnlyNode).forEach(
        (promptNode) => {
          textContent += promptNode.getTextContent();
        },
      );

      if (prevTextContent !== textContent) {
        // Restore the old editor state.
        if (lastRestoredEditorState !== prevEditorState) {
          lastRestoredEditorState = prevEditorState;
          $restoreEditorState(editor, prevEditorState);
        }
      }
    });
  });
  return null;
}

export function $getDescendantNodesOfType<T extends LexicalNode>(
  node: LexicalNode,
  klass: Klass<T>,
): T[] {
  let nodes: T[] = [];

  if (node instanceof klass) {
    nodes.push(node as T);
  } else if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      const needle = $getDescendantNodesOfType(child, klass);
      nodes = nodes.concat(needle);
    }
  }
  return nodes;
}
