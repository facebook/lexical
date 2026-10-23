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
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  $isParagraphNode,
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

function buildEditor(
  rules: AnyDOMImportRule[] = [],
  replaceParagraphs = false,
) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      dependencies: [
        RichTextExtension,
        CodeExtension,
        configExtension(DOMImportExtension, {rules}),
      ],
      name: '[empty-block-import-overrides]',
      nodes: () =>
        replaceParagraphs
          ? [
              SemanticParagraphNode,
              {
                replace: ParagraphNode,
                with: () => new SemanticParagraphNode(),
                withKlass: SemanticParagraphNode,
              },
            ]
          : [],
    }),
  );
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('empty block import respects application overrides', () => {
  test('BR middleware can discard the default result after calling $next', () => {
    const discarded: LexicalNode[] = [];
    using editor = buildEditor([
      defineImportRule({
        $import: (_ctx, _el, $next) => {
          discarded.push(...$next());
          return [];
        },
        match: sel.tag('br'),
        name: 'test/discard-default-br',
      }),
    ]);
    editor.update(
      () => {
        const nodes = $generateNodesFromDOMViaExtension(
          parse('<div><br></div><div>after</div>'),
        );
        expect(discarded.map(node => node.getType())).toEqual(['linebreak']);
        expect(nodes.map(node => node.getTextContent())).toEqual(['after']);
      },
      {discrete: true},
    );
  });

  test.each(['fill', 'replace'] as const)(
    'code DIV middleware can %s the synthesized empty paragraph',
    behavior => {
      let custom: ParagraphNode | undefined;
      using editor = buildEditor([
        defineImportRule({
          $import: (_ctx, _el, $next) => {
            const nodes = $next();
            expect(nodes).toHaveLength(1);
            assert($isParagraphNode(nodes[0]));
            expect(nodes[0].isEmpty()).toBe(true);
            custom = behavior === 'fill' ? nodes[0] : $createParagraphNode();
            custom.append($createTextNode('custom content'));
            return [custom];
          },
          match: sel.tag('div'),
          name: `test/${behavior}-empty-code-paragraph`,
        }),
      ]);
      editor.update(
        () => {
          const [code] = $generateNodesFromDOMViaExtension(
            parse('<pre><code>alpha\nbeta</code><div><br></div></pre>'),
          );
          assert($isCodeNode(code));
          expect(code.getChildren().every(node => !$isElementNode(node))).toBe(
            true,
          );
          expect(code.getTextContent()).toBe('alpha\nbeta\ncustom content');
          expect(custom?.getTextContent()).toBe('custom content');
        },
        {discrete: true},
      );
    },
  );

  test('monospace DIV imports leading, middle, and trailing nested DIV blanks', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const [code] = $generateNodesFromDOMViaExtension(
          parse(
            '<div style="font-family:monospace"><div><br></div><div>alpha</div><div><br></div><div>beta</div><div><br></div></div>',
          ),
        );
        assert($isCodeNode(code));
        expect(code.getChildren().every(node => !$isElementNode(node))).toBe(
          true,
        );
        expect(code.getTextContent()).toBe('\nalpha\n\nbeta\n');
      },
      {discrete: true},
    );
  });

  test.each(['root', 'code'] as const)(
    'configured paragraph replacements retain their semantics in %s import',
    destination => {
      const imported: LexicalNode[] = [];
      using editor = buildEditor(
        [
          defineImportRule({
            $import: (_ctx, _el, $next) => {
              const nodes = $next();
              imported.push(...nodes);
              return nodes;
            },
            match: sel.tag('div'),
            name: 'test/observe-replaced-paragraphs',
          }),
        ],
        true,
      );
      editor.update(
        () => {
          const html = '<div>alpha</div><div><br></div><div>beta</div>';
          const nodes = $generateNodesFromDOMViaExtension(
            parse(destination === 'code' ? `<pre>${html}</pre>` : html),
          );
          if (destination === 'code') {
            assert($isCodeNode(nodes[0]));
            expect(
              nodes[0].getChildren().every(node => !$isElementNode(node)),
            ).toBe(true);
            expect(nodes[0].getTextContent()).toBe('[alpha]\n[]\n[beta]');
            return;
          }
          const paragraphs = nodes;
          expect(paragraphs).toHaveLength(3);
          expect(
            paragraphs.every(node => node instanceof SemanticParagraphNode),
          ).toBe(true);
          expect(paragraphs.map(node => node.getTextContent())).toEqual([
            '[alpha]',
            '[]',
            '[beta]',
          ]);
          paragraphs.forEach((node, index) =>
            expect(node).toBe(imported[index]),
          );
        },
        {discrete: true},
      );
    },
  );
});
