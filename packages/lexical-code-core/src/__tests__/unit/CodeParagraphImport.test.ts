/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode, CodeExtension} from '@lexical/code-core';
import {buildEditorFromExtensions, configExtension} from '@lexical/extension';
import {
  $generateNodesFromDOMViaExtension,
  type AnyDOMImportRule,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {$createQuoteNode, RichTextExtension} from '@lexical/rich-text';
import {TableExtension} from '@lexical/table';
import {JSDOM} from 'jsdom';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  defineExtension,
  type LexicalNode,
  ParagraphNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

class SemanticParagraphNode extends ParagraphNode {
  $config() {
    return this.config('semantic-paragraph', {extends: ParagraphNode});
  }

  getTextContent(): string {
    return `[${super.getTextContent()}]`;
  }

  getTextContentSize(): number {
    return this.getTextContent().length;
  }
}

class InlineSemanticParagraphNode extends SemanticParagraphNode {
  $config() {
    return this.config('inline-semantic-paragraph', {
      extends: SemanticParagraphNode,
    });
  }

  isInline(): boolean {
    return true;
  }
}

function buildEditor(rules: AnyDOMImportRule[] = []) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        RichTextExtension,
        TableExtension,
        CodeExtension,
        configExtension(DOMImportExtension, {rules}),
      ],
      name: '[code-paragraph-import]',
      nodes: () => [SemanticParagraphNode, InlineSemanticParagraphNode],
      theme: {tableScrollableWrapper: 'table-wrapper'},
    }),
  );
}

function parse(html: string): Document {
  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window
    .document;
}

function githubTable(contents: string): string {
  return `<table class="js-file-line-container">${contents}</table>`;
}

const CASES: {name: string; html: string; text: string}[] = [
  {
    html: '<pre><div>alpha</div><div>beta</div></pre>',
    name: 'PRE with two nonempty DIV lines',
    text: 'alpha\nbeta',
  },
  {
    html: '<pre><p><br></p></pre>',
    name: 'PRE with an explicitly empty paragraph',
    text: '',
  },
  {
    html: '<pre><p><br></p><p><br></p><p><br></p></pre>',
    name: 'PRE with consecutive empty paragraphs',
    text: '\n\n',
  },
  {
    html: '<pre><p><br></p><p>alpha</p></pre>',
    name: 'PRE with a leading empty paragraph',
    text: '\nalpha',
  },
  {
    html: '<pre><p>alpha</p><p><br></p><p>beta</p></pre>',
    name: 'PRE with an empty paragraph between lines',
    text: 'alpha\n\nbeta',
  },
  {
    html: '<pre><p>alpha</p><p><br></p></pre>',
    name: 'PRE with a trailing empty paragraph',
    text: 'alpha\n',
  },
  {
    html: '<pre>alpha<p>beta</p>gamma</pre>',
    name: 'PRE with mixed inline and block segments',
    text: 'alpha\nbeta\ngamma',
  },
  {
    html: '<pre><section><div>alpha</div><div>beta</div></section><p>gamma</p></pre>',
    name: 'PRE with nested transparent block wrappers',
    text: 'alpha\nbeta\ngamma',
  },
  {
    html: '<code><div>alpha<br></div><div>beta</div></code>',
    name: 'multiline CODE with DIV lines',
    text: 'alpha\nbeta',
  },
  {
    html: '<code><p>alpha</p><p><br></p><p>beta</p></code>',
    name: 'multiline CODE with an empty paragraph',
    text: 'alpha\n\nbeta',
  },
  {
    html: '<div style="font-family: monospace"><section>alpha</section><section>beta</section></div>',
    name: 'monospace DIV with SECTION lines',
    text: 'alpha\nbeta',
  },
  {
    html: '<div style="font-family: monospace"><p>alpha</p><p><br></p><p>beta</p></div>',
    name: 'monospace DIV with an empty paragraph',
    text: 'alpha\n\nbeta',
  },
  {
    html: githubTable(
      '<tr><td class="js-file-line"><div>alpha</div></td></tr>' +
        '<tr><td class="js-file-line"><div>beta</div></td></tr>',
    ),
    name: 'GitHub code table with DIV lines in separate rows',
    text: 'alpha\nbeta',
  },
  {
    html: githubTable(
      '<tr><td class="js-file-line"><p>alpha</p><p><br></p><p>beta</p></td></tr>',
    ),
    name: 'GitHub code table with an empty paragraph between lines',
    text: 'alpha\n\nbeta',
  },
  {
    html: githubTable('<tr><td class="js-file-line"><p><br></p></td></tr>'),
    name: 'GitHub code table with an explicitly empty paragraph',
    text: '',
  },
  {
    html: '<pre>\talpha\nbeta</pre>',
    name: 'PRE with flat text tabs and linebreaks stays unchanged',
    text: '\talpha\nbeta',
  },
];

describe('code import normalizes paragraph boundaries', () => {
  test.each(CASES)('$name', ({html, text}) => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generateNodesFromDOMViaExtension(parse(html));
        expect(nodes).toHaveLength(1);
        const [node] = nodes;
        assert($isCodeNode(node));
        expect
          .soft(node.getChildren().every(child => !$isElementNode(child)))
          .toBe(true);
        expect.soft(node.getTextContent()).toBe(text);
      },
      {discrete: true},
    );
  });

  test.each([
    ['code', '<pre>a<code>alpha\nbeta</code><p>after</p>b</pre>', 'code'],
    [
      'table',
      '<pre><table><tr><td>alpha</td><td>beta</td></tr></table><p>after</p></pre>',
      'table',
    ],
  ])(
    'preserves the existing %s node alongside an ordinary paragraph',
    (tag, html, type) => {
      const imported: LexicalNode[] = [];
      using editor = buildEditor([
        defineImportRule({
          $import: (_ctx, _el, $next) => {
            const nodes = $next();
            imported.push(...nodes);
            return nodes;
          },
          match: tag === 'code' ? sel.tag('code', 'p') : sel.tag('table', 'p'),
          name: 'observe-preserved-code-child',
        }),
      ]);
      editor.update(
        () => {
          const [node] = $generateNodesFromDOMViaExtension(parse(html));
          assert($isCodeNode(node));
          expect(imported.map(child => child.getType())).toEqual([
            type,
            'paragraph',
          ]);
          const blocks = node.getChildren().filter($isElementNode);
          expect(blocks).toEqual(imported);
          expect(blocks[0]).toBe(imported[0]);
          expect(blocks[1]).toBe(imported[1]);
          expect(node.getChildren().map(child => child.getType())).toEqual(
            type === 'code'
              ? ['text', 'code', 'paragraph', 'text']
              : ['table', 'paragraph'],
          );
        },
        {discrete: true},
      );
    },
  );

  test.each(['quote', 'semantic-paragraph', 'inline-semantic-paragraph'])(
    'preserves a custom %s node',
    type => {
      const imported: LexicalNode[] = [];
      using editor = buildEditor([
        defineImportRule({
          $import: () => {
            const custom = (
              type === 'quote'
                ? $createQuoteNode()
                : type === 'semantic-paragraph'
                  ? $create(SemanticParagraphNode)
                  : $create(InlineSemanticParagraphNode)
            ).append($createTextNode('kept'));
            imported.push(custom);
            if (type !== 'inline-semantic-paragraph') {
              imported.push(
                $createParagraphNode().append($createTextNode('plain')),
              );
            }
            return imported;
          },
          match: sel.tag('div').classAll('custom-block'),
          name: 'custom-code-child',
        }),
      ]);
      editor.update(
        () => {
          const [node] = $generateNodesFromDOMViaExtension(
            parse('<pre><div class="custom-block">ignored</div></pre>'),
          );
          assert($isCodeNode(node));
          expect(node.getChildren()).toEqual(imported);
          expect(node.getFirstChild()).toBe(imported[0]);
          expect(node.getLastChild()).toBe(imported[imported.length - 1]);
          expect(node.getTextContent()).toBe(
            type === 'quote'
              ? 'kept\n\nplain'
              : type === 'semantic-paragraph'
                ? '[kept]\n\nplain'
                : '[kept]',
          );
        },
        {discrete: true},
      );
    },
  );
});
