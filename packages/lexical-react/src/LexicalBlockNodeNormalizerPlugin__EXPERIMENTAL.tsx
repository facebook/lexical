/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */



import type {
  DecoratorNode,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {$isListItemNode, $isListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $copyNode,
  $isDecoratorNode,
  $isElementNode,
  $isParagraphNode,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

export type BlockNode<T> = ElementNode | DecoratorNode<T>;
export type BlockNodeKlass<T> = Klass<BlockNode<T>>;

const emptyFunction = () => {};

/**
 * Ensures that block nodes live at the very top of the tree.
 *
 * Experimental: we're exploring the idea of moving normalization into specific plugins, and having
 * the normalization basic built-in into the Lexical package. When this happens, this plugin will
 * be removed.
 *
 * @param blockNodes array of blockNode (aka elementNode.isInline() === false)
 * @param onError won't be fixed
 * @param onInfo
 */
export function LexicalBlockNodeNormalizerPlugin__EXPERIMENTAL({
  blockNodes,
  onError,
  onInfo,
}: {
  onError?: (message: string) => void;
  onInfo?: (message: string) => void;
  blockNodes: Array<BlockNodeKlass<JSX.Element>>;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerBlockNodeNormalizerPlugin__EXPERIMENTAL(editor, blockNodes, {
      onError,
      onInfo,
    });
  }, [editor, blockNodes, onError, onInfo]);

  return null;
}

export function registerBlockNodeNormalizerPlugin__EXPERIMENTAL<T>(
  editor: LexicalEditor,
  nodes: Array<BlockNodeKlass<T>>,
  optional: {
    onError?: (message: string) => void;
    onInfo?: (message: string) => void;
  } = {},
): () => void {
  const {onError = emptyFunction, onInfo = emptyFunction} = optional;
  let lastPasteCommand = 0;

  const nodeTransform = (node: BlockNode<T>) => {
    const parent = node.getParent<ElementNode>();

    if (parent === null || $isRootOrShadowRoot(parent)) {
      return;
    }

    if (node.isInline()) {
      // TODO throw an invariant (check internal)
      onError(
        `Node ${node.getKey()} ${
          node.constructor.name
        } is not a top level node (isInline() === true). Revise the BlockNodeNormalizer configuration`,
      );
      return;
    }

    // Valid list nesting
    if (
      ($isListItemNode(node) && $isListNode(parent)) ||
      ($isListNode(node) && $isListItemNode(parent))
    ) {
      return;
    }

    // Log structural issues only once, and then separate events if it's
    // related to copy-pasting
    const isPasting = lastPasteCommand + 250 > Date.now();
    onInfo(
      `Found top level node ${node.getKey()} ${
        node.constructor.name
      } inside ${parent.getKey()} ${parent.constructor.name}${
        isPasting ? ' (paste event)' : ''
      }`,
    );

    // For unexpected nesting within list items flatten its content by appending
    // all children of current node. It's different from other element nodes,
    // where we try to preserve nested node (e.g., p > h1 > text would unwrap
    // into h1 > text), since unwrapping lists likely will break list structure
    // itself
    if ($isListItemNode(parent)) {
      if ($isElementNode(node)) {
        for (const child of node.getChildren<LexicalNode>()) {
          node.insertBefore(child);
        }
        node.remove();
      }

      return;
    }

    // For elements other then lists it unflattens one level at a time,
    // since transformers will be called recursively to handle
    // multiple nested levels like p > p > p > text
    let lastElement = null;

    for (const child of parent.getChildren<LexicalNode>()) {
      if (
        ($isElementNode(child) || $isDecoratorNode(child)) &&
        !child.isInline()
      ) {
        // If nested nodes are mixed paragraph/non-paragraphs then prefer to keep
        // non-paragraphs to preserve blocks structure. E.g., both h1 > p > text
        // and p > h1 > text should unwrap into h1 > text. But if both parent
        // and child nodes are non-paragraphs, then keep child node, meaning
        // h1 > h2 > text would unwrap into h2 > text
        if ($isParagraphNode(child) && !$isParagraphNode(parent)) {
          const newChild = $copyNode(parent);
          parent.insertBefore(newChild);
          newChild.append(...child.getChildren<LexicalNode>());
          child.remove();
        } else {
          parent.insertBefore(child);
        }

        lastElement = null;
      } else {
        if (lastElement == null) {
          lastElement = $copyNode(parent);
          parent.insertBefore(lastElement);
        }
        lastElement.append(child);
      }
    }

    parent.remove();
  };

  let unregisterListeners = emptyFunction;
  function registerListeners() {
    unregisterListeners = mergeRegister(
      editor.registerCommand(
        PASTE_COMMAND,
        () => {
          lastPasteCommand = Date.now();
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      ...nodes.map((nodeClass) =>
        editor.registerNodeTransform(nodeClass, nodeTransform),
      ),
    );
  }
  if (editor.isEditable()) {
    registerListeners();
  }

  return mergeRegister(
    editor.registerEditableListener((editable) => {
      if (editable) {
        registerListeners();
      } else {
        unregisterListeners();
        unregisterListeners = emptyFunction;
      }
    }),
    unregisterListeners,
  );
}
