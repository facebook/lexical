/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Here we amend original Lexical API in order for the extension JS bundle to correctly work with
 * the Lexical from the page bundle. This solves for the following issues:
 * - Lexical relies on the module variable visibility scope for the "$" prefixed APIs to work correctly.
 *   And obviously code from the extension bundle does not share the same scope as the page.
 * - "instanceof" operator does not work correctly again due to the same issue.
 * So we hijack calls to the original Lexical APIs and implement extension specific workarounds
 */
import * as lexical from 'lexicalOriginal';

export * from 'lexicalOriginal';

let activeEditorState: null | lexical.EditorState = null;
let activeEditor: null | lexical.LexicalEditor = null;
let isReadOnlyMode = false;

function getActiveEditorState(): lexical.EditorState {
  if (activeEditorState === null) {
    throw new Error(
      'Unable to find an active editor state. ' +
        'State helpers or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or editorState.read().',
    );
  }

  return activeEditorState;
}

function getActiveEditor(): lexical.LexicalEditor {
  if (activeEditor === null) {
    throw new Error(
      'Unable to find an active editor state. ' +
        'State helpers or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or editorState.read().',
    );
  }

  return activeEditor;
}

export function $getRoot(): lexical.RootNode {
  return getActiveEditorState()._nodeMap.get('root') as lexical.RootNode;
}

export function $getSelection(): null | lexical.BaseSelection {
  return getActiveEditorState()._selection;
}

export function $isElementNode(
  node: lexical.LexicalNode | null | undefined,
): node is lexical.ElementNode {
  if (node == null) {
    return false;
  }

  const editor = getActiveEditor();
  const ParagraphNode = editor._nodes.get('paragraph')!.klass;
  const ElementNode = Object.getPrototypeOf(ParagraphNode.prototype);

  // eslint-disable-next-line no-prototype-builtins
  return ElementNode.isPrototypeOf(node);
}

export function $isTextNode(
  node: lexical.LexicalNode | null | undefined,
): node is lexical.TextNode {
  if (node == null) {
    return false;
  }

  const editor = getActiveEditor();
  const TextNode = editor._nodes.get('text')!.klass;

  return node instanceof TextNode;
}

export function $isRangeSelection(x: unknown): x is lexical.RangeSelection {
  // Duck typing :P (and not instanceof RangeSelection) because extension operates
  // from different JS bundle and has no reference to the RangeSelection used on the page
  return x != null && typeof x === 'object' && 'applyDOMRange' in x;
}

export function $isNodeSelection(x: unknown): x is lexical.NodeSelection {
  // Duck typing :P (and not instanceof NodeSelection) because extension operates
  // from different JS bundle and has no reference to the NodeSelection used on the page
  return x != null && typeof x === 'object' && '_nodes' in x;
}

export function readEditorState<V>(
  editor: lexical.LexicalEditor,
  editorState: lexical.EditorState,
  callbackFn: () => V,
): V {
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;

  activeEditorState = editorState;
  isReadOnlyMode = true;
  activeEditor = editor;

  try {
    return callbackFn();
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
}
