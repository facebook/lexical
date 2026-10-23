/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertDataTransferForRichText,
  ClipboardDOMImportExtension,
} from '@lexical/clipboard';
import {$isCodeNode, CodeExtension} from '@lexical/code-core';
import {buildEditorFromExtensions, configExtension} from '@lexical/extension';
import {
  $generateNodesFromDOMViaExtension,
  type AnyDOMImportRule,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {$isLinkNode, LinkExtension} from '@lexical/link';
import {$isListItemNode, $isListNode, ListExtension} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {$isTableCellNode, TableExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor(rules: AnyDOMImportRule[] = []) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      dependencies: [
        RichTextExtension,
        ListExtension,
        TableExtension,
        CodeExtension,
        LinkExtension,
        ClipboardDOMImportExtension,
        configExtension(DOMImportExtension, {rules}),
      ],
      name: '[empty-block-import-extension]',
      theme: {tableScrollableWrapper: 'table-wrapper'},
    }),
  );
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function $expectParagraphs(nodes: LexicalNode[], text: string[]): void {
  expect.soft(nodes.every($isParagraphNode)).toBe(true);
  expect(nodes.map(node => node.getTextContent())).toEqual(text);
}

const ROOT_CASES: {name: string; html: string; text: string[]}[] = [
  {
    html: '<div><br></div><div>after</div>',
    name: 'leading DIV',
    text: ['', 'after'],
  },
  {
    html: '<div>before</div><div><br></div><div>after</div>',
    name: 'middle DIV',
    text: ['before', '', 'after'],
  },
  {
    html: '<div>before</div><div><br></div>',
    name: 'trailing DIV',
    text: ['before', ''],
  },
  {
    html: '<div><br></div><div><br></div>',
    name: 'consecutive DIVs',
    text: ['', ''],
  },
  {
    html: '<section><br></section><section>after</section>',
    name: 'leading SECTION',
    text: ['', 'after'],
  },
  {
    html: '<section>before</section><section><br></section><section><br></section>',
    name: 'consecutive trailing SECTIONs',
    text: ['before', '', ''],
  },
  {
    html: '<div><section>before</section><section><br></section><section>after</section></div>',
    name: 'nested transparent containers',
    text: ['before', '', 'after'],
  },
];

const LIST_CASES: {name: string; html: string; text: string}[] = [
  {
    html: '<div><br></div><div>after</div>',
    name: 'leading empty DIV',
    text: '\nafter',
  },
  {
    html: '<div><br></div><div><br></div>',
    name: 'all-empty DIVs',
    text: '\n',
  },
  {
    html: '<div>before</div><div><br></div><div>after</div>',
    name: 'middle empty DIV',
    text: 'before\n\nafter',
  },
  {
    html: '<div>before</div><div><br></div>',
    name: 'trailing empty DIV',
    text: 'before\n',
  },
  {
    html: '<p><br></p><p>after</p>',
    name: 'leading explicit paragraph independently of transparent blocks',
    text: '\nafter',
  },
];

const CODE_CASES = [
  ['PRE', '<pre><div>alpha</div><div><br></div><div>beta</div></pre>'],
  [
    'multiline CODE',
    '<code><div>alpha</div><div><br></div><div>beta</div></code>',
  ],
  [
    'monospace DIV with SECTION children',
    '<div style="font-family:monospace"><section>alpha</section><section><br></section><section>beta</section></div>',
  ],
  [
    'GitHub code table',
    '<table class="js-file-line-container"><tr><td class="js-file-line"><div>alpha</div><div><br></div><div>beta</div></td></tr></table>',
  ],
];

// The structure from #4830, omitting Gmail's unrelated font/color styles.
const GMAIL_HTML =
  '<div dir="ltr">Text' +
  '<div><b><br></b></div>' +
  '<div><b>Te<i>xt 2</i></b></div>' +
  '<div><b><i><br></i></b></div>' +
  '<div><b><i><br></i></b></div>' +
  '<div><b><i><u>Text 3</u></i></b></div></div>' +
  '<div class="gmail_quote"><div><br></div><div><br></div>' +
  '<div>Text 4\u00a0</div><div>\u00a0</div>' +
  '<div><a href="http://google.com/" target="_blank">google</a></div></div>';

describe('modern import preserves authored blank block boundaries', () => {
  test.each(ROOT_CASES)('root: $name', ({html, text}) => {
    using editor = buildEditor();
    editor.update(
      () => {
        $expectParagraphs($generateNodesFromDOMViaExtension(parse(html)), text);
      },
      {discrete: true},
    );
  });

  test.each(LIST_CASES)('list item: $name', ({html, text}) => {
    using editor = buildEditor();
    editor.update(
      () => {
        const [list] = $generateNodesFromDOMViaExtension(
          parse(`<ul><li>${html}</li></ul>`),
        );
        assert($isListNode(list));
        const item = list.getFirstChild();
        assert($isListItemNode(item));
        expect
          .soft(item.getChildren().every(child => !$isElementNode(child)))
          .toBe(true);
        expect(item.getTextContent()).toBe(text);
      },
      {discrete: true},
    );
  });

  test.each(['td', 'th'])('%s retains separate blank paragraphs', tag => {
    using editor = buildEditor();
    editor.update(
      () => {
        const [table] = $generateNodesFromDOMViaExtension(
          parse(
            `<table><tr><${tag}><div>before</div><div><br></div><div>after</div></${tag}></tr></table>`,
          ),
        );
        assert($isElementNode(table));
        const row = table.getFirstChild();
        assert($isElementNode(row));
        const cell = row.getFirstChild();
        assert($isTableCellNode(cell));
        $expectParagraphs(cell.getChildren(), ['before', '', 'after']);
      },
      {discrete: true},
    );
  });

  test.each(CODE_CASES)(
    '%s retains an empty transparent block as a code line',
    (_name, html) => {
      using editor = buildEditor();
      editor.update(
        () => {
          const [code] = $generateNodesFromDOMViaExtension(parse(html));
          assert($isCodeNode(code));
          expect
            .soft(code.getChildren().every(child => !$isElementNode(child)))
            .toBe(true);
          expect(code.getTextContent()).toBe('alpha\n\nbeta');
        },
        {discrete: true},
      );
    },
  );

  test('retains exactly one paragraph for an explicitly empty P', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        $expectParagraphs(
          $generateNodesFromDOMViaExtension(parse('<p><br></p>')),
          [''],
        );
      },
      {discrete: true},
    );
  });

  test('does not turn a trailing BR sentinel into another paragraph', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        $expectParagraphs(
          $generateNodesFromDOMViaExtension(
            parse('<div>before<br></div><div>after</div>'),
          ),
          ['before', 'after'],
        );
      },
      {discrete: true},
    );
  });

  test.each(['delete', 'replace'])(
    'respects a higher-priority block %s rule',
    behavior => {
      using editor = buildEditor([
        defineImportRule({
          $import: () =>
            behavior === 'delete'
              ? []
              : [$createParagraphNode().append($createTextNode('replacement'))],
          match: sel.tag('div').attr('data-custom', 'true'),
          name: `test/custom-block-${behavior}`,
        }),
      ]);
      editor.update(
        () => {
          $expectParagraphs(
            $generateNodesFromDOMViaExtension(
              parse('<div data-custom="true"><br></div><div>after</div>'),
            ),
            behavior === 'delete' ? ['after'] : ['replacement', 'after'],
          );
        },
        {discrete: true},
      );
    },
  );

  test('does not resurrect a BR intentionally deleted by an import rule', () => {
    using editor = buildEditor([
      defineImportRule({
        $import: () => [],
        match: sel.tag('br'),
        name: 'test/drop-br',
      }),
    ]);
    editor.update(
      () => {
        $expectParagraphs(
          $generateNodesFromDOMViaExtension(
            parse('<div><br></div><div>after</div>'),
          ),
          ['after'],
        );
      },
      {discrete: true},
    );
  });

  test.each([
    ['leading', '<div><br></div><code>alpha\nbeta</code>', '\nalpha\nbeta'],
    [
      'middle',
      '<code>alpha\nbeta</code><div><br></div><p>after</p>',
      'alpha\nbeta\n\nafter',
    ],
    ['trailing', '<code>alpha\nbeta</code><div><br></div>', 'alpha\nbeta\n'],
  ])(
    'retains a %s blank alongside nested code content',
    (_name, html, text) => {
      using editor = buildEditor();
      editor.update(
        () => {
          const [code] = $generateNodesFromDOMViaExtension(
            parse(`<pre>${html}</pre>`),
          );
          assert($isCodeNode(code));
          expect(
            code.getChildren().every(child => !$isElementNode(child)),
          ).toBe(true);
          expect(code.getTextContent()).toBe(text);
        },
        {discrete: true},
      );
    },
  );

  test('Gmail clipboard import preserves eleven paragraphs, formatting, and link', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.select();
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/html', GMAIL_HTML);
        $insertDataTransferForRichText(dataTransfer, selection, editor);
      },
      {discrete: true},
    );
    editor.read(() => {
      const nodes = $getRoot().getChildren();
      expect
        .soft(nodes.map(node => node.getTextContent()))
        .toEqual([
          'Text',
          '',
          'Text 2',
          '',
          '',
          'Text 3',
          '',
          '',
          'Text 4\u00a0',
          '\u00a0',
          'google',
        ]);
      const formattedParagraph = nodes.find(
        node => node.getTextContent() === 'Text 3',
      );
      assert($isParagraphNode(formattedParagraph));
      const formattedText = formattedParagraph.getFirstChild();
      assert($isTextNode(formattedText));
      expect(formattedText.hasFormat('bold')).toBe(true);
      expect(formattedText.hasFormat('italic')).toBe(true);
      expect(formattedText.hasFormat('underline')).toBe(true);
      const last = nodes[nodes.length - 1];
      assert($isParagraphNode(last));
      const link = last.getFirstChild();
      assert($isLinkNode(link));
      expect(link.getURL()).toBe('http://google.com/');
    });
  });
});
