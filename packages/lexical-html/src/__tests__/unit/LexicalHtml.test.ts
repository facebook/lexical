/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {CodeNode} from '@lexical/code';
import {buildEditorFromExtensions} from '@lexical/extension';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {JSDOM} from 'jsdom';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  isHTMLElement,
  ParagraphNode,
  RangeSelection,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

describe('HTML', () => {
  type Input = Array<{
    name: string;
    html: string;
    initializeEditorState: () => void;
  }>;

  const HTML_SERIALIZE: Input = [
    {
      html: '<p><br></p>',
      initializeEditorState: () => {
        $getRoot().append($createParagraphNode());
      },
      name: 'Empty editor state',
    },
    {
      // #7207: nested list should be inside parent <li>, not a separate <li>
      html: '<ol><li value="1"><span style="white-space: pre-wrap;">Canada</span></li><li value="2"><span style="white-space: pre-wrap;">USA</span><ol><li value="1"><span style="white-space: pre-wrap;">LA</span></li><li value="2"><span style="white-space: pre-wrap;">TX</span></li></ol></li><li value="3"><span style="white-space: pre-wrap;">Germany</span></li></ol>',
      initializeEditorState: () => {
        const list = $createListNode('number');
        const item1 = $createListItemNode();
        item1.append($createTextNode('Canada'));
        const item2 = $createListItemNode();
        item2.append($createTextNode('USA'));
        const nestedWrapper = $createListItemNode();
        const nestedList = $createListNode('number');
        const nested1 = $createListItemNode();
        nested1.append($createTextNode('LA'));
        const nested2 = $createListItemNode();
        nested2.append($createTextNode('TX'));
        nestedList.append(nested1, nested2);
        nestedWrapper.append(nestedList);
        const item3 = $createListItemNode();
        item3.append($createTextNode('Germany'));
        list.append(item1, item2, nestedWrapper, item3);
        $getRoot().append(list);
      },
      name: 'Nested ordered list numbering (Regression #7207)',
    },
  ];
  for (const {name, html, initializeEditorState} of HTML_SERIALIZE) {
    test(`[Lexical -> HTML]: ${name}`, () => {
      const editor = createHeadlessEditor({
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          LinkNode,
        ],
      });

      editor.update(initializeEditorState, {
        discrete: true,
      });

      expect(
        editor.getEditorState().read(() => $generateHtmlFromNodes(editor)),
      ).toBe(html);
    });
  }

  test(`[Lexical -> HTML]: Use provided selection`, () => {
    const editor = createHeadlessEditor({
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        LinkNode,
      ],
    });

    let selection: RangeSelection | null = null;

    editor.update(
      () => {
        const root = $getRoot();
        const p1 = $createParagraphNode();
        const text1 = $createTextNode('Hello');
        p1.append(text1);
        const p2 = $createParagraphNode();
        const text2 = $createTextNode('World');
        p2.append(text2);
        root.append(p1).append(p2);
        // Root
        // - ParagraphNode
        // -- TextNode "Hello"
        // - ParagraphNode
        // -- TextNode "World"
        p1.select(0, text1.getTextContentSize());
        selection = $createRangeSelection();
        selection.setTextNodeRange(text2, 0, text2, text2.getTextContentSize());
      },
      {
        discrete: true,
      },
    );

    let html = '';

    editor.update(() => {
      html = $generateHtmlFromNodes(editor, selection);
    });

    expect(html).toBe('<span style="white-space: pre-wrap;">World</span>');
  });

  test(`[Lexical -> HTML]: Default selection (undefined) should serialize entire editor state`, () => {
    const editor = createHeadlessEditor({
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        LinkNode,
      ],
    });

    editor.update(
      () => {
        const root = $getRoot();
        const p1 = $createParagraphNode();
        const text1 = $createTextNode('Hello');
        p1.append(text1);
        const p2 = $createParagraphNode();
        const text2 = $createTextNode('World');
        p2.append(text2);
        root.append(p1).append(p2);
        // Root
        // - ParagraphNode
        // -- TextNode "Hello"
        // - ParagraphNode
        // -- TextNode "World"
        p1.select(0, text1.getTextContentSize());
      },
      {
        discrete: true,
      },
    );

    let html = '';

    editor.update(() => {
      html = $generateHtmlFromNodes(editor);
    });

    expect(html).toBe(
      '<p><span style="white-space: pre-wrap;">Hello</span></p><p><span style="white-space: pre-wrap;">World</span></p>',
    );
  });

  test(`If alignment is set on the paragraph, don't overwrite from parent empty format`, () => {
    const editor = createHeadlessEditor();
    const parser = new DOMParser();
    const rightAlignedParagraphInDiv =
      '<div><p style="text-align: center;">Hello world!</p></div>';

    editor.update(
      () => {
        const root = $getRoot();
        const dom = parser.parseFromString(
          rightAlignedParagraphInDiv,
          'text/html',
        );
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      },
      {discrete: true},
    );

    let html = '';

    editor.update(() => {
      html = $generateHtmlFromNodes(editor);
    });

    expect(html).toBe(
      '<p style="text-align: center;"><span style="white-space: pre-wrap;">Hello world!</span></p>',
    );
  });

  test(`If alignment is set on the paragraph, it should take precedence over its parent block alignment`, () => {
    const editor = createHeadlessEditor();
    const parser = new DOMParser();
    const rightAlignedParagraphInDiv =
      '<div style="text-align: right;"><p style="text-align: center;">Hello world!</p></div>';

    editor.update(
      () => {
        const root = $getRoot();
        const dom = parser.parseFromString(
          rightAlignedParagraphInDiv,
          'text/html',
        );
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      },
      {discrete: true},
    );

    let html = '';

    editor.update(() => {
      html = $generateHtmlFromNodes(editor);
    });

    expect(html).toBe(
      '<p style="text-align: center;"><span style="white-space: pre-wrap;">Hello world!</span></p>',
    );
  });

  test('It should output correctly nodes whose export is DocumentFragment', () => {
    const editor = createHeadlessEditor({
      html: {
        export: new Map([
          [
            ParagraphNode,
            () => {
              const element = document.createDocumentFragment();
              return {
                element,
              };
            },
          ],
        ]),
      },
      nodes: [],
    });

    editor.update(
      () => {
        const root = $getRoot();
        const p1 = $createParagraphNode();
        const text1 = $createTextNode('Hello');
        p1.append(text1);
        const p2 = $createParagraphNode();
        const text2 = $createTextNode('World');
        p2.append(text2);
        root.append(p1).append(p2);
        // Root
        // - ParagraphNode
        // -- TextNode "Hello"
        // - ParagraphNode
        // -- TextNode "World"
      },
      {
        discrete: true,
      },
    );

    let html = '';

    editor.update(() => {
      html = $generateHtmlFromNodes(editor);
    });

    expect(html).toBe(
      '<span style="white-space: pre-wrap;">Hello</span><span style="white-space: pre-wrap;">World</span>',
    );
  });

  describe('$generateNodesFromDOM: CSS class style inlining', () => {
    test('HTML with <style> tags inlines styles by class', () => {
      const editor = buildEditorFromExtensions();
      // workaround for https://github.com/jsdom/jsdom/issues/3179 - DOMParser does not work correctly
      const dom = new JSDOM(
        `<html><head><style>.highlight { font-weight: bold; }</style></head>` +
          `<body><p><span class="highlight">Hello</span></p></body></html>`,
      ).window.document;
      expect(dom.styleSheets).toHaveLength(1);
      editor.update(
        () => {
          const root = $getRoot();
          const nodes = $generateNodesFromDOM(editor, dom);
          $insertGeneratedNodes(editor, nodes, root.select(0));
          expect(root.getTextContent()).toBe('Hello');
          const highlightSpan = dom.querySelector('span.highlight');
          assert(isHTMLElement(highlightSpan), 'span.highlight is in the dom');
          expect(highlightSpan.style.fontWeight).toBe('bold');
          const textNodes = root.getAllTextNodes();
          expect(textNodes).toHaveLength(1);
          expect(textNodes[0].hasFormat('bold')).toBe(true);
        },
        {discrete: true},
      );
    });

    test('existing inline styles are preserved after inlining pass', () => {
      const editor = createHeadlessEditor();
      const parser = new DOMParser();

      editor.update(
        () => {
          const dom = parser.parseFromString(
            `<html><head><style>.colored { color: red; }</style></head>` +
              `<body><p><span class="colored" style="color: blue;">Hello</span></p></body></html>`,
            'text/html',
          );
          $generateNodesFromDOM(editor, dom);

          // Inline style should never be overwritten
          const span = dom.querySelector('.colored');
          assert(isHTMLElement(span), '.colored is still in the dom');
          expect(span.style.color).toBe('blue');
        },
        {discrete: true},
      );
    });

    test('HTML without <style> tags works as before', () => {
      const editor = createHeadlessEditor();
      const parser = new DOMParser();

      editor.update(
        () => {
          const root = $getRoot();
          const dom = parser.parseFromString('<p>Hello world</p>', 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $insertGeneratedNodes(editor, nodes, root.select(0));
          expect(
            root
              .getAllTextNodes()
              .map(
                node =>
                  [node.getTextContent(), node.hasFormat('bold')] as const,
              ),
          ).toEqual([['Hello world', false]]);
        },
        {discrete: true},
      );
    });
  });
});
