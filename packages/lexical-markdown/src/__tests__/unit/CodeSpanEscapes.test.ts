/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  type ElementTransformer,
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

describe('a code span', () => {
  // CommonMark: backslash escapes don't work in code spans.
  it.each([
    ['`\\*`', '\\*'],
    ['**`\\*`**', '\\*'],
  ])('keeps its backslashes in %j', (markdown, text) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe(text);
      const code = $getRoot()
        .getAllTextNodes()
        .find(node => node.hasFormat('code'));
      expect($isTextNode(code)).toBe(true);
      expect($convertToMarkdownString(TRANSFORMERS)).toBe(markdown);
    });
  });

  // A reader strips only U+0020 padding, so other whitespace needs none.
  it.each([' ', '  ', '\tx\t', '\u00a0'])('round-trips %j bare', text => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode(text).toggleFormat('code'),
            ),
          ),
      {discrete: true},
    );
    const markdown = editor.read(() => $convertToMarkdownString(TRANSFORMERS));
    expect(markdown).toBe('`' + text + '`');
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
  });

  it('pads a span whose ends are line endings', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('\nx\n').toggleFormat('code'),
            ),
          ),
      {discrete: true},
    );
    // A reader turns each line ending into a space and strips one per end.
    expect(editor.read(() => $convertToMarkdownString(TRANSFORMERS))).toBe(
      '` \nx\n `',
    );
  });

  it.each(['\\*', '&#65;'])(
    'keeps %j in a line an element transformer makes code',
    text => {
      const CODE_LINE: ElementTransformer = {
        dependencies: [],
        export: () => null,
        regExp: /^CODE: /,
        replace: (_parent, children) => {
          for (const child of children) {
            if ($isTextNode(child)) {
              child.toggleFormat('code');
            }
          }
        },
        type: 'element',
      };
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () => $convertFromMarkdownString(`CODE: ${text}`, [CODE_LINE]),
        {discrete: true},
      );
      expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    },
  );

  it('leaves the text after it to read its escapes', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => $convertFromMarkdownString('`\\*` \\* &#160;', TRANSFORMERS),
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $getRoot()
          .getAllTextNodes()
          .map(node => [node.getTextContent(), node.hasFormat('code')]),
      ),
    ).toEqual([
      ['\\*', true],
      [' * \u00a0', false],
    ]);
  });
});

describe('formatted text', () => {
  // Each backslash escape is read once, in formatted text and beside a
  // text match such as a link.
  it.each([
    ['**a\\\\\\*b**', 'a\\*b'],
    ['a\\\\\\*b [x](https://y)', 'a\\*b x'],
  ])('reads %j as %j', (markdown, text) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
  });
});

describe('text a text match leaves in place', () => {
  const MENTION: TextMatchTransformer = {
    dependencies: [],
    importRegExp: /@\S+/,
    regExp: /@\S+$/,
    replace: node => {
      node.setFormat('bold');
    },
    type: 'text-match',
  };
  const $textOf = (nodes: LexicalNode[]) =>
    nodes
      .flatMap(node => ($isTextNode(node) ? [node] : []))
      .map(node => [node.getTextContent(), node.hasFormat('bold')]);

  it.each(['@a\\*b', 'x @a\\*b'])(
    'reads its escapes when the transformer edits it in place: %j',
    markdown => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(() => $convertFromMarkdownString(markdown, [MENTION]), {
        discrete: true,
      });
      expect(editor.read(() => $textOf($getRoot().getAllTextNodes()))).toEqual([
        ...(markdown.startsWith('x') ? [['x ', false]] : []),
        ['@a*b', true],
      ]);
    },
  );

  it.each(['@a\\*b', 'x @a\\*b'])(
    'reads the escapes of the text a transformer writes from its match: %j',
    markdown => {
      const UNPREFIXED: TextMatchTransformer = {
        ...MENTION,
        replace: (node, match) => {
          node.setTextContent(match[0].slice(1)).setFormat('bold');
        },
      };
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(() => $convertFromMarkdownString(markdown, [UNPREFIXED]), {
        discrete: true,
      });
      expect(editor.read(() => $textOf($getRoot().getAllTextNodes()))).toEqual([
        ...(markdown.startsWith('x') ? [['x ', false]] : []),
        ['a*b', true],
      ]);
    },
  );

  it('reads its escapes in nodes generated outside the root', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    let text;
    editor.update(
      () => {
        const [paragraph] = $generateNodesFromMarkdownString('@a\\*b', [
          MENTION,
        ]);
        text = $textOf(
          $assertNodeType(paragraph, $isParagraphNode).getChildren(),
        );
      },
      {discrete: true},
    );
    expect(text).toEqual([['@a*b', true]]);
  });
});

describe('a character reference', () => {
  it('reads one after an escaped & as text', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString('\\&#65;', TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe('&#65;');
  });

  it('round-trips one after a backslash when backslashes are kept', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('\\&#65; \\\\&#65;')),
          ),
      {discrete: true},
    );
    const markdown = editor.read(() =>
      $convertToMarkdownString(TRANSFORMERS, undefined, true),
    );
    editor.update(
      () => $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, true),
      {discrete: true},
    );
    expect(editor.read(() => $getRoot().getTextContent())).toBe(
      '\\&#65; \\\\&#65;',
    );
  });

  it.each([[['&#x41; &amp;'], '\\&#x41; \\&amp;']])(
    'escapes the & of text %j that other readers take as a reference',
    (texts, markdown) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                // Different styles keep the nodes apart.
                ...texts.map((text, i) =>
                  $createTextNode(text).setStyle(`order: ${i}`),
                ),
              ),
            ),
        {discrete: true},
      );
      expect(editor.read(() => $convertToMarkdownString(TRANSFORMERS))).toBe(
        markdown,
      );
    },
  );

  it('writes a long run of backslashes in linear time', () => {
    const slashes = '\\'.repeat(1e5);
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode(slashes))),
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString(TRANSFORMERS))).toBe(
      slashes + slashes,
    );
  });

  it('round-trips text that reads as one', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('a &#32; b'))),
      {discrete: true},
    );
    const markdown = editor.read(() => $convertToMarkdownString(TRANSFORMERS));
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe('a &#32; b');
  });
});
