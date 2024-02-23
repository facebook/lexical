/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeNode} from '@lexical/code';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$getRoot, $insertNodes} from 'lexical';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  LINK,
  TextMatchTransformer,
  TRANSFORMERS,
} from '../..';

describe('Markdown', () => {
  type Input = Array<{
    html: string;
    md: string;
    skipExport?: true;
    skipImport?: true;
  }>;

  const URL = 'https://lexical.dev';

  const IMPORT_AND_EXPORT: Input = [
    {
      html: '<h1><span style="white-space: pre-wrap;">Hello world</span></h1>',
      md: '# Hello world',
    },
    {
      html: '<h2><span style="white-space: pre-wrap;">Hello world</span></h2>',
      md: '## Hello world',
    },
    {
      html: '<h3><span style="white-space: pre-wrap;">Hello world</span></h3>',
      md: '### Hello world',
    },
    {
      html: '<h4><span style="white-space: pre-wrap;">Hello world</span></h4>',
      md: '#### Hello world',
    },
    {
      html: '<h5><span style="white-space: pre-wrap;">Hello world</span></h5>',
      md: '##### Hello world',
    },
    {
      html: '<h6><span style="white-space: pre-wrap;">Hello world</span></h6>',
      md: '###### Hello world',
    },
    {
      // Multiline paragraphs
      html: '<p><span style="white-space: pre-wrap;">Hello</span><br><span style="white-space: pre-wrap;">world</span><br><span style="white-space: pre-wrap;">!</span></p>',
      md: ['Hello', 'world', '!'].join('\n'),
    },
    {
      html: '<blockquote><span style="white-space: pre-wrap;">Hello</span><br><span style="white-space: pre-wrap;">world!</span></blockquote>',
      md: '> Hello\n> world!',
    },
    {
      // Miltiline list items
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world</span><br><span style="white-space: pre-wrap;">!</span><br><span style="white-space: pre-wrap;">!</span></li></ul>',
      md: '- Hello\n- world\n!\n!',
    },
    {
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world</span></li></ul>',
      md: '- Hello\n- world',
    },
    {
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Level 1</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 2</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 3</span></li></ul></li></ul></li></ul><p><span style="white-space: pre-wrap;">Hello world</span></p>',
      md: '- Level 1\n    - Level 2\n        - Level 3\n\nHello world',
    },
    {
      // Import only: export will use "-" instead of "*"
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Level 1</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 2</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 3</span></li></ul></li></ul></li></ul><p><span style="white-space: pre-wrap;">Hello world</span></p>',
      md: '* Level 1\n    * Level 2\n        * Level 3\n\nHello world',
      skipExport: true,
    },
    {
      html: '<ol><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world</span></li></ol>',
      md: '1. Hello\n2. world',
    },
    {
      html: '<ol start="25"><li value="25"><span style="white-space: pre-wrap;">Hello</span></li><li value="26"><span style="white-space: pre-wrap;">world</span></li></ol>',
      md: '25. Hello\n26. world',
    },
    {
      html: '<p><i><em style="white-space: pre-wrap;">Hello</em></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '*Hello* world',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Hello</strong></b><span style="white-space: pre-wrap;"> world</span></p>',
      md: '**Hello** world',
    },
    {
      html: '<p><i><b><strong style="white-space: pre-wrap;">Hello</strong></b></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '***Hello*** world',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>Hello</span></code><span style="white-space: pre-wrap;"> world</span></p>',
      md: '`Hello` world',
    },
    {
      html: '<p><s><span style="white-space: pre-wrap;">Hello</span></s><span style="white-space: pre-wrap;"> world</span></p>',
      md: '~~Hello~~ world',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>hello$</span></code></p>',
      md: '`hello$`',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>$$hello</span></code></p>',
      md: '`$$hello`',
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world</span></p>',
      md: '[Hello](https://lexical.dev) world',
    },
    {
      html: '<p><a href="https://lexical.dev" title="Hello world"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world</span></p>',
      md: '[Hello](https://lexical.dev "Hello world") world',
    },
    {
      html: '<p><a href="https://lexical.dev" title="Title with \\&quot; escaped character"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world</span></p>',
      md: '[Hello](https://lexical.dev "Title with \\" escaped character") world',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">Hello </span><s><i><b><strong style="white-space: pre-wrap;">world</strong></b></i></s><span style="white-space: pre-wrap;">!</span></p>',
      md: 'Hello ~~***world***~~!',
    },
    {
      html: '<p><i><em style="white-space: pre-wrap;">Hello </em></i><i><b><strong style="white-space: pre-wrap;">world</strong></b></i><i><em style="white-space: pre-wrap;">!</em></i></p>',
      md: '*Hello **world**!*',
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><i><em style="white-space: pre-wrap;">Hello</em></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '_Hello_ world',
      skipExport: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><b><strong style="white-space: pre-wrap;">Hello</strong></b><span style="white-space: pre-wrap;"> world</span></p>',
      md: '__Hello__ world',
      skipExport: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><i><b><strong style="white-space: pre-wrap;">Hello</strong></b></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '___Hello___ world',
      skipExport: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><span style="white-space: pre-wrap;">Hello </span><s><i><b><strong style="white-space: pre-wrap;">world</strong></b></i></s><span style="white-space: pre-wrap;">!</span></p>',
      md: 'Hello ~~__*world*__~~!',
      skipExport: true,
    },
    {
      html: '<pre spellcheck="false"><span style="white-space: pre-wrap;">Code</span></pre>',
      md: '```\nCode\n```',
    },
    {
      // Import only: extra empty lines will be removed for export
      html: '<p><span style="white-space: pre-wrap;">Hello</span></p><p><span style="white-space: pre-wrap;">world</span></p>',
      md: ['Hello', '', '', '', 'world'].join('\n'),
      skipExport: true,
    },
    {
      // Import only: multiline quote will be prefixed with ">" on each line during export
      html: '<blockquote><span style="white-space: pre-wrap;">Hello</span><br><span style="white-space: pre-wrap;">world</span><br><span style="white-space: pre-wrap;">!</span></blockquote>',
      md: '> Hello\nworld\n!',
      skipExport: true,
    },
    {
      // Import only: ensures that left side of splitText is processed for text match transformers
      html: '<p><span style="white-space: pre-wrap;">Hello </span><a href="https://lexical.dev"><span style="white-space: pre-wrap;">world</span></a><span style="white-space: pre-wrap;">! Hello </span><mark style="white-space: pre-wrap;"><span>$world$</span></mark><span style="white-space: pre-wrap;">! </span><a href="https://lexical.dev"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world! Hello </span><mark style="white-space: pre-wrap;"><span>$world$</span></mark><span style="white-space: pre-wrap;">!</span></p>',
      md: `Hello [world](${URL})! Hello $world$! [Hello](${URL}) world! Hello $world$!`,
      skipExport: true,
    },
    {
      // Export only: import will use $...$ to transform <span /> to <mark /> due to HIGHLIGHT_TEXT_MATCH_IMPORT
      html: "<p><span style='white-space: pre-wrap;'>$$H$&e$`l$'l$o$</span></p>",
      md: "$$H$&e$`l$'l$o$",
      skipImport: true,
    },
  ];

  const HIGHLIGHT_TEXT_MATCH_IMPORT: TextMatchTransformer = {
    ...LINK,
    importRegExp: /\$([^$]+?)\$/,
    replace: (textNode) => {
      textNode.setFormat('highlight');
    },
  };

  for (const {html, md, skipImport} of IMPORT_AND_EXPORT) {
    if (skipImport) {
      continue;
    }

    it(`can import "${md.replace(/\n/g, '\\n')}"`, () => {
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
        () =>
          $convertFromMarkdownString(md, [
            ...TRANSFORMERS,
            HIGHLIGHT_TEXT_MATCH_IMPORT,
          ]),
        {
          discrete: true,
        },
      );

      expect(
        editor.getEditorState().read(() => $generateHtmlFromNodes(editor)),
      ).toBe(html);
    });
  }

  for (const {html, md, skipExport} of IMPORT_AND_EXPORT) {
    if (skipExport) {
      continue;
    }

    it(`can export "${md.replace(/\n/g, '\\n')}"`, () => {
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
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
        },
        {
          discrete: true,
        },
      );

      expect(
        editor
          .getEditorState()
          .read(() => $convertToMarkdownString(TRANSFORMERS)),
      ).toBe(md);
    });
  }
});
