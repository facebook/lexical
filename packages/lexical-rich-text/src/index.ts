/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
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
  $getHtmlContent,
  $getLexicalContent,
  $insertDataTransferForRichText,
} from '@lexical/clipboard';
import {
  $moveCharacter,
  $shouldOverrideDefaultCharacterSelection,
} from '@lexical/selection';
import {
  $getNearestBlockElementAncestorOrThrow,
  addClassNamesToElement,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isGridSelection,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  ElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_TEXT_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  REMOVE_TEXT_COMMAND,
} from 'lexical';
import {CAN_USE_BEFORE_INPUT, IS_IOS, IS_SAFARI} from 'shared-ts/environment';

export type InitialEditorStateType = null | string | EditorState | (() => void);

// Convoluted logic to make this work with Flow. Order matters.
const options = {tag: 'history-merge'};
const setEditorOptions: {
  tag?: string;
} = options;
const updateOptions: {
  onUpdate?: () => void;
  skipTransforms?: true;
  tag?: string;
} = options;

export class QuoteNode extends ElementNode {
  static getType(): string {
    return 'quote';
  }

  static clone(node: QuoteNode): QuoteNode {
    return new QuoteNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
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

export function $isQuoteNode(
  node: LexicalNode | null | undefined,
): node is QuoteNode {
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

  constructor(tag: HeadingTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
  }

  getTag(): HeadingTagType {
    return this.__tag;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
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

  static importDOM(): DOMConversionMap | null {
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

  extractWithChild(): boolean {
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

export function $isHeadingNode(
  node: LexicalNode | null | undefined,
): node is HeadingNode {
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
    if (
      clipboardData != null &&
      ($isRangeSelection(selection) || $isGridSelection(selection))
    ) {
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
        const htmlString = $getHtmlContent(editor);
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

function handleIndentAndOutdent(
  insertTab: (node: LexicalNode) => void,
  indentOrOutdent: (block: ElementNode) => void,
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }
  const alreadyHandled = new Set();
  const nodes = selection.getNodes();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const key = node.getKey();
    if (alreadyHandled.has(key)) {
      continue;
    }
    alreadyHandled.add(key);
    const parentBlock = $getNearestBlockElementAncestorOrThrow(node);
    if (parentBlock.canInsertTab()) {
      insertTab(node);
    } else if (parentBlock.canIndent()) {
      indentOrOutdent(parentBlock);
    }
  }
}

export function registerRichText(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): () => void {
  const removeListener = mergeRegister(
    editor.registerCommand(
      CLICK_COMMAND,
      (payload) => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          selection.clear();
          return true;
        }
        return false;
      },
      0,
    ),
    editor.registerCommand<boolean>(
      DELETE_CHARACTER_COMMAND,
      (isBackward) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.deleteCharacter(isBackward);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<boolean>(
      DELETE_WORD_COMMAND,
      (isBackward) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.deleteWord(isBackward);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<boolean>(
      DELETE_LINE_COMMAND,
      (isBackward) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.deleteLine(isBackward);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<InputEvent | string>(
      INSERT_TEXT_COMMAND,
      (eventOrText) => {
        const selection = $getSelection();

        if (typeof eventOrText === 'string') {
          if ($isRangeSelection(selection)) {
            selection.insertText(eventOrText);
          } else if ($isGridSelection(selection)) {
            // TODO: Insert into the first cell & clear selection.
          }
        } else {
          if (!$isRangeSelection(selection) && !$isGridSelection(selection)) {
            return false;
          }

          const dataTransfer = eventOrText.dataTransfer;
          if (dataTransfer != null) {
            $insertDataTransferForRichText(dataTransfer, selection, editor);
          } else if ($isRangeSelection(selection)) {
            const data = eventOrText.data;
            if (data) {
              selection.insertText(data);
            }
            return true;
          }
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      REMOVE_TEXT_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.removeText();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<TextFormatType>(
      FORMAT_TEXT_COMMAND,
      (format) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.formatText(format);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<ElementFormatType>(
      FORMAT_ELEMENT_COMMAND,
      (format) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) && !$isNodeSelection(selection)) {
          return false;
        }
        const nodes = selection.getNodes();
        for (const node of nodes) {
          const element = $getNearestBlockElementAncestorOrThrow(node);
          element.setFormat(format);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<boolean>(
      INSERT_LINE_BREAK_COMMAND,
      (selectStart) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.insertLineBreak(selectStart);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.insertParagraph();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => {
        handleIndentAndOutdent(
          () => {
            editor.dispatchCommand(INSERT_TEXT_COMMAND, '\t');
          },
          (block) => {
            const indent = block.getIndent();
            if (indent !== 10) {
              block.setIndent(indent + 1);
            }
          },
        );
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      () => {
        handleIndentAndOutdent(
          (node) => {
            if ($isTextNode(node)) {
              const textContent = node.getTextContent();
              const character = textContent[textContent.length - 1];
              if (character === '\t') {
                editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
              }
            }
          },
          (block) => {
            const indent = block.getIndent();
            if (indent !== 0) {
              block.setIndent(indent - 1);
            }
          },
        );
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_LEFT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const isHoldingShift = event.shiftKey;
        if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
          event.preventDefault();
          $moveCharacter(selection, isHoldingShift, true);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const isHoldingShift = event.shiftKey;
        if ($shouldOverrideDefaultCharacterSelection(selection, false)) {
          event.preventDefault();
          $moveCharacter(selection, isHoldingShift, false);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        event.preventDefault();
        const {anchor} = selection;
        if (selection.isCollapsed() && anchor.offset === 0) {
          const element = $getNearestBlockElementAncestorOrThrow(
            anchor.getNode(),
          );
          if (element.getIndent() > 0) {
            return editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
          }
        }
        return editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_DELETE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        event.preventDefault();
        return editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent | null>(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        if (event !== null) {
          // If we have beforeinput, then we can avoid blocking
          // the default behavior. This ensures that the iOS can
          // intercept that we're actually inserting a paragraph,
          // and autocomplete, autocapitialize etc work as intended.
          // This can also cause a strange performance issue in
          // Safari, where there is a noticeable pause due to
          // preventing the key down of enter.
          if ((IS_IOS || IS_SAFARI) && CAN_USE_BEFORE_INPUT) {
            return false;
          }
          event.preventDefault();
          if (event.shiftKey) {
            return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
          }
        }
        return editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        event.preventDefault();
        return editor.dispatchCommand(
          event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
          undefined,
        );
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        editor.blur();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<DragEvent>(
      DROP_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        // TODO: Make drag and drop work at some point.
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<DragEvent>(
      DRAGSTART_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        // TODO: Make drag and drop work at some point.
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<ClipboardEvent>(
      COPY_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isGridSelection(selection)) {
          onCopyForRichText(event, editor);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<ClipboardEvent>(
      CUT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isGridSelection(selection)) {
          onCutForRichText(event, editor);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<ClipboardEvent>(
      PASTE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isGridSelection(selection)) {
          onPasteForRichText(event, editor);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  );
  initializeEditor(editor, initialEditorState);
  return removeListener;
}
