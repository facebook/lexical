/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeNode} from '@lexical/code';
import {
  $createHeadingNode,
  HeadingNode,
  QuoteNode,
  registerRichText,
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {beforeEach, describe, expect, test} from 'vitest';

import {formatCode} from '../../src/plugins/ToolbarPlugin/utils';

const editorNodes = [CodeNode, HeadingNode, QuoteNode];

/**
 * Place a non-collapsed RangeSelection on the text node `target` from
 * `start` to `end`. Helper for the tests below.
 */
const $selectTextRange = (
  target: LexicalNode,
  start: number,
  end: number,
): void => {
  const selection = $createRangeSelection();
  selection.anchor.set(target.getKey(), start, 'text');
  selection.focus.set(target.getKey(), end, 'text');
  $setSelection(selection);
};

/**
 * Render the editor state to a compact string for assertions:
 *
 *   "p:hello world|code:foo"
 *
 * Each block becomes `type:textcontent`, separated by `|`. The text
 * content uses the node's getTextContent() output.
 */
const $serializeBlocks = (): string => {
  return $getRoot()
    .getChildren()
    .map(child => {
      const tag = child.getType();
      const text = child.getTextContent();
      return `${tag}:${text}`;
    })
    .join('|');
};

const runUpdate = async (editor: LexicalEditor, fn: () => void) => {
  await editor.update(fn, {discrete: true});
};

describe('formatCode (Toolbar) — selection-aware code block conversion', () => {
  initializeUnitTest(
    testEnv => {
      let editor: LexicalEditor;

      beforeEach(() => {
        editor = testEnv.editor;
        registerRichText(editor);
      });

      test.for([
        {
          end: 'hello world'.length,
          expected: 'code:hello world',
          name: 'full',
          start: 0,
          text: 'hello world',
        },
        {
          end: 'hello'.length,
          expected: 'code:hello|paragraph: world',
          name: 'start',
          start: 0,
          text: 'hello world',
        },
        {
          end: 'before middle'.length,
          expected: 'paragraph:before |code:middle|paragraph: after',
          name: 'middle (#6324)',
          start: 'before '.length,
          text: 'before middle after',
        },
        {
          end: 'hello world'.length,
          expected: 'paragraph:hello |code:world',
          name: 'end',
          start: 'hello '.length,
          text: 'hello world',
        },
      ])('paragraph $name selection', async ({text, start, end, expected}) => {
        await runUpdate(editor, () => {
          const node = $createTextNode(text);
          const paragraph = $createParagraphNode().append(node);
          $getRoot().clear().append(paragraph);
          $selectTextRange(node, start, end);
        });

        await runUpdate(editor, () => formatCode(editor, 'paragraph'));

        expect(editor.read($serializeBlocks)).toBe(expected);
      });

      test.for([
        {
          end: 'Heading'.length,
          expected: 'code:Heading',
          headingTag: 'h1' as const,
          name: 'full from offset 0 (regression for #8446 crash)',
          start: 0,
          text: 'Heading',
        },
        {
          end: 'Section title'.length,
          expected: 'heading:Section |code:title',
          headingTag: 'h2' as const,
          name: 'partial middle',
          start: 'Section '.length,
          text: 'Section title',
        },
      ])('heading $name', async ({text, headingTag, start, end, expected}) => {
        await runUpdate(editor, () => {
          const node = $createTextNode(text);
          const heading = $createHeadingNode(headingTag).append(node);
          $getRoot().clear().append(heading);
          $selectTextRange(node, start, end);
        });

        await runUpdate(editor, () => formatCode(editor, headingTag));

        expect(editor.read($serializeBlocks)).toBe(expected);
      });

      test('Selection spanning two paragraphs converts to one code block', async () => {
        let firstText!: LexicalNode;
        let secondText!: LexicalNode;
        await runUpdate(editor, () => {
          firstText = $createTextNode('first');
          secondText = $createTextNode('second');
          $getRoot()
            .clear()
            .append($createParagraphNode().append(firstText))
            .append($createParagraphNode().append(secondText));
          const selection = $createRangeSelection();
          selection.anchor.set(firstText.getKey(), 0, 'text');
          selection.focus.set(secondText.getKey(), 'second'.length, 'text');
          $setSelection(selection);
        });

        await runUpdate(editor, () => formatCode(editor, 'paragraph'));

        const result = editor.read($serializeBlocks);
        expect(result).toBe('code:first\nsecond');
      });

      test('Selection spanning paragraph + heading converts both into one code block', async () => {
        await runUpdate(editor, () => {
          const paraText = $createTextNode('first');
          const headingText = $createTextNode('second');
          $getRoot()
            .clear()
            .append($createParagraphNode().append(paraText))
            .append($createHeadingNode('h1').append(headingText));
          const selection = $createRangeSelection();
          selection.anchor.set(paraText.getKey(), 0, 'text');
          selection.focus.set(headingText.getKey(), 'second'.length, 'text');
          $setSelection(selection);
        });

        await runUpdate(editor, () => formatCode(editor, 'paragraph'));

        const result = editor.read($serializeBlocks);
        // Block boundaries become newlines inside the code block; the
        // outer multi-block selection is replaced with a single code block.
        expect(result).toBe('code:first\nsecond');
      });

      test('Paragraph with soft line breaks splits into separate blocks before code conversion', async () => {
        // The legacy splitter was meant to keep <br>-separated lines from
        // bleeding around the new code block. Verify the selection on the
        // middle line produces three sibling blocks rather than two
        // paragraphs with stray line breaks.
        await runUpdate(editor, () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode('line1'));
          paragraph.append($createLineBreakNode());
          const middle = $createTextNode('line2');
          paragraph.append(middle);
          paragraph.append($createLineBreakNode());
          paragraph.append($createTextNode('line3'));
          $getRoot().clear().append(paragraph);
          $selectTextRange(middle, 0, 'line2'.length);
        });

        await runUpdate(editor, () => formatCode(editor, 'paragraph'));

        // line1 stays as its own paragraph, line2 becomes a code block,
        // line3 stays as its own paragraph. Empty/stray <br>-only blocks
        // are not expected.
        expect(editor.read($serializeBlocks)).toBe(
          'paragraph:line1|code:line2|paragraph:line3',
        );
      });
    },
    {namespace: 'test', nodes: editorNodes, theme: {}},
  );
});
