/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CommandListenerEditorPriority,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  EditorState,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  TextFormatType,
} from 'lexical';

import {
  $getLexicalContent,
  $insertDataTransferForRichText,
  getHtmlContent,
} from '@lexical/clipboard';
import {
  $moveCharacter,
  $shouldOverrideDefaultCharacterSelection,
} from '@lexical/selection';
import {addClassNamesToElement} from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isGridSelection,
  $isNodeSelection,
  $isRangeSelection,
  ElementNode,
} from 'lexical';

export type InitialEditorStateType = null | string | EditorState | (() => void);

// Convoluted logic to make this work with Flow. Order matters.
const options = {tag: 'history-merge'};
const setEditorOptions: {
  tag?: string,
} = options;
const updateOptions: {
  onUpdate?: () => void,
  skipTransforms?: true,
  tag?: string,
} = options;

export class QuoteNode extends ElementNode {
  static getType(): string {
    return 'quote';
  }

  static clone(node: QuoteNode): QuoteNode {
    return new QuoteNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('blockquote');
    addClassNamesToElement(element, config.theme.quote);
    return element;
  }
  updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newBlock = $createParagraphNode();
    const direction = this.getDirection();
    newBlock.setDirection(direction);
    this.insertAfter(newBlock);
    return newBlock;
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

export function $createQuoteNode(): QuoteNode {
  return new QuoteNode();
}

export function $isQuoteNode(node: ?LexicalNode): boolean %checks {
  return node instanceof QuoteNode;
}

export type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeadingNode extends ElementNode {
  __tag: HeadingTagType;

  static getType(): string {
    return 'heading';
  }

  static clone(node: HeadingNode): HeadingNode {
    return new HeadingNode(node.__tag, node.__key);
  }

  constructor(tag: HeadingTagType, key?: NodeKey): void {
    super(key);
    this.__tag = tag;
  }

  getTag(): HeadingTagType {
    return this.__tag;
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const theme = config.theme;
    const classNames = theme.heading;
    if (classNames !== undefined) {
      // $FlowFixMe: intentional cast
      const className = classNames[tag];
      addClassNamesToElement(element, className);
    }
    return element;
  }

  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean {
    return false;
  }

  static convertDOM(): DOMConversionMap | null {
    return {
      h1: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h2: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h3: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h4: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h5: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
    };
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newElement = $createParagraphNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement);
    return newElement;
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

function convertHeadingElement(domNode: Node): DOMConversionOutput {
  const nodeName = domNode.nodeName.toLowerCase();
  let node = null;
  if (
    nodeName === 'h1' ||
    nodeName === 'h2' ||
    nodeName === 'h3' ||
    nodeName === 'h4' ||
    nodeName === 'h5'
  ) {
    node = $createHeadingNode(nodeName);
  }
  return {node};
}

export function $createHeadingNode(headingTag: HeadingTagType): HeadingNode {
  return new HeadingNode(headingTag);
}

export function $isHeadingNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HeadingNode;
}

function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  if (initialEditorState === null) {
    return;
  } else if (initialEditorState === undefined) {
    editor.update(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();
      if (firstChild === null) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const activeElement = document.activeElement;
        if (
          $getSelection() !== null ||
          (activeElement !== null && activeElement === editor.getRootElement())
        ) {
          paragraph.select();
        }
      }
    }, updateOptions);
  } else if (initialEditorState !== null) {
    switch (typeof initialEditorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(initialEditorState);
        editor.setEditorState(parsedEditorState, setEditorOptions);
        break;
      }
      case 'object': {
        editor.setEditorState(initialEditorState, setEditorOptions);
        break;
      }
      case 'function': {
        editor.update(initialEditorState, updateOptions);
        break;
      }
    }
  }
}

function onPasteForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    const selection = $getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && $isRangeSelection(selection)) {
      $insertDataTransferForRichText(clipboardData, selection, editor);
    }
  });
}

function onCopyForRichText(event: ClipboardEvent, editor: LexicalEditor): void {
  event.preventDefault();
  editor.update(() => {
    const clipboardData = event.clipboardData;
    const selection = $getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const htmlString = getHtmlContent(editor);
        const lexicalString = $getLexicalContent(editor);
        if (htmlString !== null) {
          clipboardData.setData('text/html', htmlString);
        }
        if (lexicalString !== null) {
          clipboardData.setData('application/x-lexical-editor', lexicalString);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}

function onCutForRichText(event: ClipboardEvent, editor: LexicalEditor): void {
  onCopyForRichText(event, editor);
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.removeText();
    }
  });
}

export function registerRichText(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): () => void {
  const removeListener = editor.registerCommandListener(
    (type, payload): boolean => {
      const selection = $getSelection();
      if (type === 'click' && $isNodeSelection(selection)) {
        selection.clear();
        return true;
      }
      if ($isRangeSelection(selection)) {
        switch (type) {
          case 'deleteCharacter': {
            const isBackward: boolean = payload;
            selection.deleteCharacter(isBackward);
            return true;
          }
          case 'deleteWord': {
            const isBackward: boolean = payload;
            selection.deleteWord(isBackward);
            return true;
          }
          case 'deleteLine': {
            const isBackward: boolean = payload;
            selection.deleteLine(isBackward);
            return true;
          }
          case 'insertText': {
            const eventOrText: InputEvent | string = payload;
            if (typeof eventOrText === 'string') {
              selection.insertText(eventOrText);
            } else {
              const dataTransfer = eventOrText.dataTransfer;
              if (dataTransfer != null) {
                $insertDataTransferForRichText(dataTransfer, selection, editor);
              } else {
                const data = eventOrText.data;
                if (data) {
                  selection.insertText(data);
                }
              }
            }
            return true;
          }
          case 'removeText':
            selection.removeText();
            return true;
          case 'formatText': {
            const format: TextFormatType = payload;
            selection.formatText(format);
            return true;
          }
          case 'formatElement': {
            const format: ElementFormatType = payload;
            const node = selection.anchor.getNode();
            const element = $isElementNode(node)
              ? node
              : node.getParentOrThrow();
            element.setFormat(format);
            return true;
          }
          case 'insertLineBreak':
            const selectStart: boolean = payload;
            selection.insertLineBreak(selectStart);
            return true;
          case 'insertParagraph':
            selection.insertParagraph();
            return true;
          case 'indentContent': {
            // Handle code blocks
            const anchor = selection.anchor;
            const parentBlock =
              anchor.type === 'element'
                ? anchor.getNode()
                : anchor.getNode().getParentOrThrow();
            if (parentBlock.canInsertTab()) {
              editor.execCommand('insertText', '\t');
            } else {
              if (parentBlock.getIndent() !== 10) {
                parentBlock.setIndent(parentBlock.getIndent() + 1);
              }
            }
            return true;
          }
          case 'outdentContent': {
            // Handle code blocks
            const anchor = selection.anchor;
            const anchorNode = anchor.getNode();
            const parentBlock =
              anchor.type === 'element'
                ? anchor.getNode()
                : anchor.getNode().getParentOrThrow();
            if (parentBlock.canInsertTab()) {
              const textContent = anchorNode.getTextContent();
              const character = textContent[anchor.offset - 1];
              if (character === '\t') {
                editor.execCommand('deleteCharacter', true);
              }
            } else {
              if (parentBlock.getIndent() !== 0) {
                parentBlock.setIndent(parentBlock.getIndent() - 1);
              }
            }
            return true;
          }
          case 'keyArrowLeft': {
            const event: KeyboardEvent = payload;
            const isHoldingShift = event.shiftKey;
            if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
              event.preventDefault();
              $moveCharacter(selection, isHoldingShift, true);
              return true;
            }
            return false;
          }
          case 'keyArrowRight': {
            const event: KeyboardEvent = payload;
            const isHoldingShift = event.shiftKey;
            if ($shouldOverrideDefaultCharacterSelection(selection, false)) {
              event.preventDefault();
              $moveCharacter(selection, isHoldingShift, false);
              return true;
            }
            return false;
          }
          case 'keyBackspace': {
            const event: KeyboardEvent = payload;
            event.preventDefault();
            const {anchor} = selection;
            if (selection.isCollapsed() && anchor.offset === 0) {
              const element =
                anchor.type === 'element'
                  ? anchor.getNode()
                  : anchor.getNode().getParentOrThrow();
              if (element.getIndent() > 0) {
                return editor.execCommand('outdentContent');
              }
            }
            return editor.execCommand('deleteCharacter', true);
          }
          case 'keyDelete': {
            const event: KeyboardEvent = payload;
            event.preventDefault();
            return editor.execCommand('deleteCharacter', false);
          }
          case 'keyEnter': {
            const event: KeyboardEvent = payload;
            event.preventDefault();
            if (event.shiftKey) {
              return editor.execCommand('insertLineBreak');
            }
            return editor.execCommand('insertParagraph');
          }
          case 'keyTab': {
            const event: KeyboardEvent = payload;
            event.preventDefault();
            return editor.execCommand(
              event.shiftKey ? 'outdentContent' : 'indentContent',
            );
          }
          case 'keyEscape': {
            editor.blur();
            return true;
          }
          case 'drop':
          case 'dragstart': {
            // TODO: Make drag and drop work at some point.
            const event: DragEvent = payload;
            event.preventDefault();
            return true;
          }
        }
      }

      if ($isRangeSelection(selection) || $isGridSelection(selection)) {
        switch (type) {
          case 'copy': {
            const event: ClipboardEvent = payload;
            onCopyForRichText(event, editor);
            return true;
          }
          case 'cut': {
            const event: ClipboardEvent = payload;
            onCutForRichText(event, editor);
            return true;
          }
          case 'paste': {
            const event: ClipboardEvent = payload;
            onPasteForRichText(event, editor);
            return true;
          }
        }
      }

      return false;
    },
    (0: CommandListenerEditorPriority),
  );
  initializeEditor(editor, initialEditorState);
  return removeListener;
}
