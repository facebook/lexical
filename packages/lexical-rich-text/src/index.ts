/** @module @lexical/rich-text */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CommandPayloadType,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  SerializedElementNode,
  Spread,
  TextFormatType,
} from 'lexical';

import {
  $insertDataTransferForRichText,
  copyToClipboard__EXPERIMENTAL,
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
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DEPRECATED_$isGridSelection,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  ElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  REMOVE_TEXT_COMMAND,
} from 'lexical';
import {CAN_USE_BEFORE_INPUT, IS_IOS, IS_SAFARI} from 'shared/environment';

export type SerializedHeadingNode = Spread<
  {
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    type: 'heading';
    version: 1;
  },
  SerializedElementNode
>;

export type SerializedQuoteNode = Spread<
  {
    type: 'quote';
    version: 1;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
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

  static importDOM(): DOMConversionMap | null {
    return {
      blockquote: (node: Node) => ({
        conversion: convertBlockquoteElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedQuoteNode): QuoteNode {
    const node = $createQuoteNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: 'quote',
    };
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

export type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** @noInheritDoc */
export class HeadingNode extends ElementNode {
  /** @internal */
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
      h6: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      p: (node: Node) => {
        // domNode is a <p> since we matched it by nodeName
        const paragraph = node as HTMLParagraphElement;
        const firstChild = paragraph.firstChild;
        if (firstChild !== null && isGoogleDocsTitle(firstChild)) {
          return {
            conversion: () => ({node: null}),
            priority: 3,
          };
        }
        return null;
      },
      span: (node: Node) => {
        if (isGoogleDocsTitle(node)) {
          return {
            conversion: (domNode: Node) => {
              return {
                node: $createHeadingNode('h1'),
              };
            },
            priority: 3,
          };
        }
        return null;
      },
    };
  }

  static importJSON(serializedNode: SerializedHeadingNode): HeadingNode {
    const node = $createHeadingNode(serializedNode.tag);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedHeadingNode {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: 'heading',
      version: 1,
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

function isGoogleDocsTitle(domNode: Node): boolean {
  if (domNode.nodeName.toLowerCase() === 'span') {
    return (domNode as HTMLSpanElement).style.fontSize === '26pt';
  }
  return false;
}

function convertHeadingElement(domNode: Node): DOMConversionOutput {
  const nodeName = domNode.nodeName.toLowerCase();
  let node = null;
  if (
    nodeName === 'h1' ||
    nodeName === 'h2' ||
    nodeName === 'h3' ||
    nodeName === 'h4' ||
    nodeName === 'h5' ||
    nodeName === 'h6'
  ) {
    node = $createHeadingNode(nodeName);
  }
  return {node};
}

function convertBlockquoteElement(): DOMConversionOutput {
  const node = $createQuoteNode();
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

function onPasteForRichText(
  event: CommandPayloadType<typeof PASTE_COMMAND>,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(
    () => {
      const selection = $getSelection();
      const clipboardData =
        event instanceof InputEvent || event instanceof KeyboardEvent
          ? null
          : event.clipboardData;
      if (
        clipboardData != null &&
        ($isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection))
      ) {
        $insertDataTransferForRichText(clipboardData, selection, editor);
      }
    },
    {
      tag: 'paste',
    },
  );
}

async function onCutForRichText(
  event: CommandPayloadType<typeof CUT_COMMAND>,
  editor: LexicalEditor,
): Promise<void> {
  const selection = editor.getEditorState().read(() => $getSelection());
  if (selection == null) {
    return;
  }
  await copyToClipboard__EXPERIMENTAL(
    editor,
    event instanceof ClipboardEvent ? event : null,
  );
  editor.update(() => {
    if ($isRangeSelection(selection)) {
      selection.removeText();
    } else if ($isNodeSelection(selection)) {
      selection.getNodes().forEach((node) => node.remove());
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

function isTargetWithinDecorator(target: HTMLElement): boolean {
  const node = $getNearestNodeFromDOMNode(target);
  return $isDecoratorNode(node);
}

export function registerRichText(editor: LexicalEditor): () => void {
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
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (eventOrText) => {
        const selection = $getSelection();

        if (typeof eventOrText === 'string') {
          if ($isRangeSelection(selection)) {
            selection.insertText(eventOrText);
          } else if (DEPRECATED_$isGridSelection(selection)) {
            // TODO: Insert into the first cell & clear selection.
          }
        } else {
          if (
            !$isRangeSelection(selection) &&
            !DEPRECATED_$isGridSelection(selection)
          ) {
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
            editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, '\t');
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
      KEY_ARROW_UP_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (
          $isNodeSelection(selection) &&
          !isTargetWithinDecorator(event.target as HTMLElement)
        ) {
          // If selection is on a node, let's try and move selection
          // back to being a range selection.
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            nodes[0].selectPrevious();
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          // If selection is on a node, let's try and move selection
          // back to being a range selection.
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            nodes[0].selectNext(0, 0);
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_LEFT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          // If selection is on a node, let's try and move selection
          // back to being a range selection.
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            event.preventDefault();
            nodes[0].selectPrevious();
            return true;
          }
        }
        if (!$isRangeSelection(selection)) {
          return false;
        }
        if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
          const isHoldingShift = event.shiftKey;
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
        if (
          $isNodeSelection(selection) &&
          !isTargetWithinDecorator(event.target as HTMLElement)
        ) {
          // If selection is on a node, let's try and move selection
          // back to being a range selection.
          const nodes = selection.getNodes();
          if (nodes.length > 0) {
            event.preventDefault();
            nodes[0].selectNext(0, 0);
            return true;
          }
        }
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
        if (isTargetWithinDecorator(event.target as HTMLElement)) {
          return false;
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        event.preventDefault();
        const {anchor} = selection;
        const anchorNode = anchor.getNode();

        if (
          selection.isCollapsed() &&
          anchor.offset === 0 &&
          !$isRootNode(anchorNode)
        ) {
          const element = $getNearestBlockElementAncestorOrThrow(anchorNode);
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
        if (isTargetWithinDecorator(event.target as HTMLElement)) {
          return false;
        }
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
          // and autocomplete, autocapitalize etc work as intended.
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
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        copyToClipboard__EXPERIMENTAL(
          editor,
          event instanceof ClipboardEvent ? event : null,
        );
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      CUT_COMMAND,
      (event) => {
        onCutForRichText(event, editor);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (
          $isRangeSelection(selection) ||
          DEPRECATED_$isGridSelection(selection)
        ) {
          onPasteForRichText(event, editor);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  );
  return removeListener;
}
