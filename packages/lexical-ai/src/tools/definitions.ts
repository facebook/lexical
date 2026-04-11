/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AIToolDefinition} from '../types';

/**
 * Built-in editor tool definitions exposed to the LLM.
 * These are generic operations that work with any Lexical rich-text editor.
 */
export const BUILT_IN_TOOL_DEFINITIONS: AIToolDefinition[] = [
  {
    description:
      'Get the full document structure as a JSON array of nodes with their type, text content, and hierarchy. Use this to understand the current document state before making edits.',
    input_schema: {
      properties: {},
      type: 'object',
    },
    name: 'get_document',
  },
  {
    description:
      'Get the currently selected text in the editor. Returns null if nothing is selected.',
    input_schema: {
      properties: {},
      type: 'object',
    },
    name: 'get_selected_text',
  },
  {
    description:
      'Find and replace text in the document. Searches all text nodes for the exact match and replaces with new text.',
    input_schema: {
      properties: {
        all: {
          description:
            'Replace all occurrences (default: false, replaces first match only)',
          type: 'boolean',
        },
        replace: {
          description: 'The replacement text',
          type: 'string',
        },
        search: {
          description: 'The exact text to search for in the document',
          type: 'string',
        },
      },
      required: ['search', 'replace'],
      type: 'object',
    },
    name: 'replace_text',
  },
  {
    description:
      'Insert a new paragraph or heading after the paragraph containing the specified text.',
    input_schema: {
      properties: {
        after_text: {
          description: 'Text contained in the paragraph after which to insert',
          type: 'string',
        },
        new_text: {
          description: 'The text content of the new paragraph',
          type: 'string',
        },
        type: {
          description:
            'Node type: "paragraph" (default), "h1", "h2", "h3", "h4", "h5", "quote"',
          type: 'string',
        },
      },
      required: ['after_text', 'new_text'],
      type: 'object',
    },
    name: 'insert_paragraph_after',
  },
  {
    description:
      'Insert a new paragraph or heading before the paragraph containing the specified text.',
    input_schema: {
      properties: {
        before_text: {
          description: 'Text contained in the paragraph before which to insert',
          type: 'string',
        },
        new_text: {
          description: 'The text content of the new paragraph',
          type: 'string',
        },
        type: {
          description:
            'Node type: "paragraph" (default), "h1", "h2", "h3", "h4", "h5", "quote"',
          type: 'string',
        },
      },
      required: ['before_text', 'new_text'],
      type: 'object',
    },
    name: 'insert_paragraph_before',
  },
  {
    description: 'Delete the paragraph that contains the specified text.',
    input_schema: {
      properties: {
        containing_text: {
          description: 'Text contained in the paragraph to delete',
          type: 'string',
        },
      },
      required: ['containing_text'],
      type: 'object',
    },
    name: 'delete_paragraph',
  },
  {
    description:
      'Apply inline formatting (bold, italic, underline, strikethrough, code) to specific text within a paragraph.',
    input_schema: {
      properties: {
        containing_text: {
          description:
            'Text contained in the paragraph to find the target paragraph',
          type: 'string',
        },
        format: {
          description:
            'The format to apply: "bold", "italic", "underline", "strikethrough", "code"',
          type: 'string',
        },
        text_to_format: {
          description:
            'The exact text within the paragraph to apply formatting to',
          type: 'string',
        },
      },
      required: ['containing_text', 'text_to_format', 'format'],
      type: 'object',
    },
    name: 'format_text',
  },
  {
    description: 'Wrap specific text within a paragraph in a hyperlink.',
    input_schema: {
      properties: {
        containing_text: {
          description:
            'Text contained in the paragraph to find the target paragraph',
          type: 'string',
        },
        text_to_link: {
          description: 'The exact text to turn into a link',
          type: 'string',
        },
        url: {
          description: 'The URL for the link',
          type: 'string',
        },
      },
      required: ['containing_text', 'text_to_link', 'url'],
      type: 'object',
    },
    name: 'insert_link',
  },
  {
    description:
      'Change the type of a block node (e.g., convert a paragraph to a heading or quote).',
    input_schema: {
      properties: {
        containing_text: {
          description: 'Text contained in the block to change',
          type: 'string',
        },
        type: {
          description:
            'The target block type: "paragraph", "h1", "h2", "h3", "h4", "h5", "quote"',
          type: 'string',
        },
      },
      required: ['containing_text', 'type'],
      type: 'object',
    },
    name: 'set_paragraph_type',
  },
  {
    description:
      'Insert an ordered, unordered, or checklist after the paragraph containing the specified text.',
    input_schema: {
      properties: {
        after_text: {
          description:
            'Text contained in the paragraph after which to insert the list',
          type: 'string',
        },
        items: {
          description: 'Array of list item text strings',
          items: {type: 'string'},
          type: 'array',
        },
        list_type: {
          description:
            'List type: "bullet" (unordered), "number" (ordered), "check" (checklist)',
          type: 'string',
        },
      },
      required: ['after_text', 'items', 'list_type'],
      type: 'object',
    },
    name: 'insert_list',
  },
];
