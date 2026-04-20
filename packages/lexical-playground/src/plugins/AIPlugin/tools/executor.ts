/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ToolExecutionResult} from '../types';
import type {LexicalEditor, TextNode} from 'lexical';

import {$createLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
} from 'lexical';

import {
  $findNodeContaining,
  $getSelectedText,
  $serializeDocumentForAI,
} from './helpers';

export interface ToolExecutor {
  execute(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult>;
}

export function createToolExecutor(editor: LexicalEditor): ToolExecutor {
  return {
    execute(
      toolName: string,
      input: Record<string, unknown>,
    ): Promise<ToolExecutionResult> {
      switch (toolName) {
        case 'get_document':
          return executeGetDocument(editor);
        case 'get_selected_text':
          return executeGetSelectedText(editor);
        case 'replace_text':
          return executeReplaceText(editor, input);
        case 'insert_paragraph_after':
          return executeInsertParagraph(editor, input, 'after');
        case 'insert_paragraph_before':
          return executeInsertParagraph(editor, input, 'before');
        case 'delete_paragraph':
          return executeDeleteParagraph(editor, input);
        case 'format_text':
          return executeFormatText(editor, input);
        case 'insert_link':
          return executeInsertLink(editor, input);
        case 'set_paragraph_type':
          return executeSetParagraphType(editor, input);
        case 'insert_list':
          return executeInsertList(editor, input);
        default:
          return Promise.resolve({
            message: `Unknown tool: ${toolName}`,
            success: false,
          });
      }
    },
  };
}

function executeGetDocument(
  editor: LexicalEditor,
): Promise<ToolExecutionResult> {
  return new Promise((resolve) => {
    editor.getEditorState().read(() => {
      const structure = $serializeDocumentForAI();
      resolve({
        data: structure,
        message: `Document structure with ${structure.length} top-level nodes`,
        success: true,
      });
    });
  });
}

function executeGetSelectedText(
  editor: LexicalEditor,
): Promise<ToolExecutionResult> {
  return new Promise((resolve) => {
    editor.getEditorState().read(() => {
      const text = $getSelectedText();
      resolve({
        data: text,
        message: text
          ? `Selected text: "${text.slice(0, 200)}"`
          : 'No text selected',
        success: true,
      });
    });
  });
}

function executeReplaceText(
  editor: LexicalEditor,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const search = input.search as string;
  const replace = input.replace as string;
  const replaceAll = (input.all as boolean) || false;

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();
        let count = 0;

        for (const textNode of textNodes) {
          const text = textNode.getTextContent();
          if (text.includes(search)) {
            if (replaceAll) {
              const newText = text.split(search).join(replace);
              count += text.split(search).length - 1;
              textNode.setTextContent(newText);
            } else if (count === 0) {
              const newText = text.replace(search, replace);
              if (newText !== text) {
                textNode.setTextContent(newText);
                count = 1;
              }
            }
          }
        }

        result = {
          message:
            count > 0
              ? `Replaced ${count} occurrence(s) of "${search}" with "${replace}"`
              : `Text "${search}" not found in document`,
          success: count > 0,
        };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function executeInsertParagraph(
  editor: LexicalEditor,
  input: Record<string, unknown>,
  position: 'after' | 'before',
): Promise<ToolExecutionResult> {
  const targetText =
    position === 'after'
      ? (input.after_text as string)
      : (input.before_text as string);
  const newText = input.new_text as string;
  const nodeType = (input.type as string) || 'paragraph';

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const target = $findNodeContaining(targetText);
        if (!target) {
          result = {
            message: `Paragraph containing "${targetText}" not found`,
            success: false,
          };
          return;
        }

        const newNode = $createBlockNode(nodeType);
        newNode.append($createTextNode(newText));

        if (position === 'after') {
          target.insertAfter(newNode);
        } else {
          target.insertBefore(newNode);
        }

        result = {
          message: `Inserted ${nodeType} ${position} paragraph containing "${targetText}"`,
          success: true,
        };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function executeDeleteParagraph(
  editor: LexicalEditor,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const containingText = input.containing_text as string;

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const target = $findNodeContaining(containingText);
        if (!target) {
          result = {
            message: `Paragraph containing "${containingText}" not found`,
            success: false,
          };
          return;
        }
        target.remove();
        result = {
          message: `Deleted paragraph containing "${containingText}"`,
          success: true,
        };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function executeFormatText(
  editor: LexicalEditor,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const containingText = input.containing_text as string;
  const textToFormat = input.text_to_format as string;
  const format = input.format as string;

  const formatMap: Record<string, number> = {
    bold: 1,
    code: 16,
    italic: 2,
    strikethrough: 4,
    underline: 8,
  };

  const formatFlag = formatMap[format];
  if (formatFlag === undefined) {
    return Promise.resolve({
      message: `Unknown format: "${format}". Supported: bold, italic, underline, strikethrough, code`,
      success: false,
    });
  }

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const target = $findNodeContaining(containingText);
        if (!target || !$isElementNode(target)) {
          result = {
            message: `Paragraph containing "${containingText}" not found`,
            success: false,
          };
          return;
        }

        let formatted = false;
        const textNodes = target.getAllTextNodes();
        for (const textNode of textNodes) {
          const text = textNode.getTextContent();
          const idx = text.indexOf(textToFormat);
          if (idx === -1) {
            continue;
          }

          const parts = $splitTextNodeAt(textNode, idx, textToFormat.length);
          if (parts.target) {
            parts.target.setFormat(parts.target.getFormat() | formatFlag);
            formatted = true;
          }
          break;
        }

        result = formatted
          ? {
              message: `Applied ${format} formatting to "${textToFormat}"`,
              success: true,
            }
          : {
              message: `Text "${textToFormat}" not found in paragraph`,
              success: false,
            };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function executeInsertLink(
  editor: LexicalEditor,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const containingText = input.containing_text as string;
  const textToLink = input.text_to_link as string;
  const url = input.url as string;

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const target = $findNodeContaining(containingText);
        if (!target || !$isElementNode(target)) {
          result = {
            message: `Paragraph containing "${containingText}" not found`,
            success: false,
          };
          return;
        }

        let linked = false;
        const textNodes = target.getAllTextNodes();
        for (const textNode of textNodes) {
          const text = textNode.getTextContent();
          const idx = text.indexOf(textToLink);
          if (idx === -1) {
            continue;
          }

          const parts = $splitTextNodeAt(textNode, idx, textToLink.length);
          if (parts.target) {
            const linkNode = $createLinkNode(url);
            parts.target.insertBefore(linkNode);
            linkNode.append(parts.target);
            linked = true;
          }
          break;
        }

        result = linked
          ? {
              message: `Created link to "${url}" on text "${textToLink}"`,
              success: true,
            }
          : {
              message: `Text "${textToLink}" not found in paragraph`,
              success: false,
            };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function executeSetParagraphType(
  editor: LexicalEditor,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const containingText = input.containing_text as string;
  const targetType = input.type as string;

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const target = $findNodeContaining(containingText);
        if (!target || !$isElementNode(target)) {
          result = {
            message: `Paragraph containing "${containingText}" not found`,
            success: false,
          };
          return;
        }

        const newNode = $createBlockNode(targetType);
        const children = target.getChildren();
        for (const child of children) {
          newNode.append(child);
        }
        target.replace(newNode);

        result = {
          message: `Changed block type to "${targetType}" for paragraph containing "${containingText}"`,
          success: true,
        };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function executeInsertList(
  editor: LexicalEditor,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const afterText = input.after_text as string;
  const items = input.items as string[];
  const listType = (input.list_type as string) || 'bullet';

  const lexicalListType =
    listType === 'number'
      ? 'number'
      : listType === 'check'
        ? 'check'
        : 'bullet';

  return new Promise((resolve) => {
    let result: ToolExecutionResult;

    editor.update(
      () => {
        const target = $findNodeContaining(afterText);
        if (!target) {
          result = {
            message: `Paragraph containing "${afterText}" not found`,
            success: false,
          };
          return;
        }

        const listNode = $createListNode(lexicalListType);
        for (const itemText of items) {
          const listItem = $createListItemNode();
          listItem.append($createTextNode(itemText));
          listNode.append(listItem);
        }

        target.insertAfter(listNode);

        result = {
          message: `Inserted ${listType} list with ${items.length} items after paragraph containing "${afterText}"`,
          success: true,
        };
      },
      {
        onUpdate: () => resolve(result),
      },
    );
  });
}

function $createBlockNode(
  type: string,
):
  | ReturnType<typeof $createParagraphNode>
  | ReturnType<typeof $createHeadingNode>
  | ReturnType<typeof $createQuoteNode> {
  const headingTypes: HeadingTagType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (headingTypes.includes(type as HeadingTagType)) {
    return $createHeadingNode(type as HeadingTagType);
  }
  if (type === 'quote') {
    return $createQuoteNode();
  }
  return $createParagraphNode();
}

function $splitTextNodeAt(
  textNode: TextNode,
  offset: number,
  length: number,
): {before: TextNode | null; target: TextNode | null; after: TextNode | null} {
  const text = textNode.getTextContent();
  const format = textNode.getFormat();

  let before: TextNode | null = null;
  let target: TextNode | null = null;
  let after: TextNode | null = null;

  if (offset === 0 && length === text.length) {
    target = textNode;
  } else if (offset === 0) {
    target = textNode;
    const afterText = text.slice(length);
    after = $createTextNode(afterText);
    after.setFormat(format);
    target.setTextContent(text.slice(0, length));
    target.insertAfter(after);
  } else if (offset + length === text.length) {
    before = textNode;
    const targetText = text.slice(offset);
    target = $createTextNode(targetText);
    target.setFormat(format);
    before.setTextContent(text.slice(0, offset));
    before.insertAfter(target);
  } else {
    before = textNode;
    const targetText = text.slice(offset, offset + length);
    const afterText = text.slice(offset + length);

    target = $createTextNode(targetText);
    target.setFormat(format);
    after = $createTextNode(afterText);
    after.setFormat(format);

    before.setTextContent(text.slice(0, offset));
    before.insertAfter(target);
    target.insertAfter(after);
  }

  return {after, before, target};
}
