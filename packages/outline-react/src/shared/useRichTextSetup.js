/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, RootNode} from 'outline';
import type {InputEvents} from 'outline-react/useOutlineEditorEvents';

import {log, getSelection, getRoot, TextNode} from 'outline';
import useLayoutEffect from './useLayoutEffect';
import useOutlineEditorEvents from '../useOutlineEditorEvents';
import {HeadingNode} from 'outline/HeadingNode';
import {ListNode} from 'outline/ListNode';
import {QuoteNode} from 'outline/QuoteNode';
import {CodeNode} from 'outline/CodeNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {ListItemNode} from 'outline/ListItemNode';
import {createParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import useOutlineDragonSupport from './useOutlineDragonSupport';
import {
  onSelectionChange,
  onKeyDownForRichText,
  onCompositionStart,
  onCompositionEnd,
  onCutForRichText,
  onCopyForRichText,
  onBeforeInputForRichText,
  onPasteForRichText,
  onDropPolyfill,
  onDragStartPolyfill,
  onTextMutation,
  onInput,
  onClick,
} from 'outline/events';
import type {ITextNode} from '../../../outline/src/core/OutlineTextNode';
import type {NodeKey} from '../../../outline/src/core/OutlineNode';
import {useEffect} from 'react';

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDownForRichText],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCutForRichText],
  ['copy', onCopyForRichText],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForRichText],
  ['input', onInput],
  ['click', onClick],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(['beforeinput', onBeforeInputForRichText]);
} else {
  events.push(['drop', onDropPolyfill]);
}

function shouldSelectParagraph(editor: OutlineEditor): boolean {
  const activeElement = document.activeElement;
  return (
    getSelection() !== null ||
    (activeElement !== null && activeElement === editor.getRootElement())
  );
}

function initParagraph(root: RootNode, editor: OutlineEditor): void {
  const paragraph = createParagraphNode();
  root.append(paragraph);
  if (shouldSelectParagraph(editor)) {
    paragraph.select();
  }
}

export function initEditor(editor: OutlineEditor): void {
  editor.update(() => {
    log('initEditor');
    const root = getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild === null) {
      initParagraph(root, editor);
    }
  });
}

function clearEditor(
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(() => {
    log('clearEditor');
    const root = getRoot();
    root.clear();
    initParagraph(root, editor);
  }, callbackFn);
}

export class CustomTextNode extends TextNode implements ITextNode {
  _custom: string;
  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__text = text;
    this.__type = 'text';
    this.__format = 0;
    this.__style = '';
    this._custom = 'custom';
  }
  static clone(node: $FlowFixMe): CustomTextNode {
    return new CustomTextNode(node.__text, node.__key);
  }
  getTextContent(): string {
    return super.getTextContent() + 'custom';
  }
}

export function useRichTextSetup(
  editor: OutlineEditor,
  init: boolean,
): (
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
) => void {
  useLayoutEffect(() => {
    // editor.registerNodeType('text', CustomTextNode);
    editor.registerNodeType('heading', HeadingNode);
    editor.registerNodeType('list', ListNode);
    editor.registerNodeType('quote', QuoteNode);
    editor.registerNodeType('code', CodeNode);
    editor.registerNodeType('paragraph', ParagraphNode);
    editor.registerNodeType('listitem', ListItemNode);
    if (init) {
      initEditor(editor);
    }

    return editor.addListener('textmutation', onTextMutation);
  }, [editor, init]);

  useOutlineEditorEvents(events, editor);
  useOutlineDragonSupport(editor);

  return clearEditor;
}
