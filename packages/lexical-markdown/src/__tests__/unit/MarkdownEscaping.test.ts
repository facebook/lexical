/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isTextNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {unescapeText} from '../../utils';
import {MarkdownTestExtension} from '../utils';

const LITERALS = [
  '<b>text</b>',
  '<https://example.com>',
  '&copy;',
  '&#65;',
  '&#x41;',
  '[label](uri)',
  '[ref]: uri',
];

describe('literal Markdown text', () => {
  it.each(LITERALS)('escapes %j across styled text nodes', text => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    for (let split = 0; split <= text.length; split++) {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode(text.slice(0, split)).setStyle('color: red'),
                $createTextNode(text.slice(split)).setStyle('color: blue'),
              ),
            );
        },
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      expect(written).toBe(text.replace(/[&<[\]]/g, '\\$&'));
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    }
  });

  it.each([
    ['\\<b>text\\</b>', '<b>text</b>'],
    ['&#60;b&#62;text&#60;/b&#62;', '<b>text</b>'],
    ['\\&#65;', '&#65;'],
    ['\\&#x41;', '&#x41;'],
    ['&#38;#65;', '&#65;'],
    ['&#x26;#x41;', '&#x41;'],
    ['\\[label\\](uri)', '[label](uri)'],
    ['\\[label](uri)', '[label](uri)'],
  ])(
    'keeps imported literal text through repeated conversion: %j',
    (source, text) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      let written = source;
      for (let round = 0; round < 3; round++) {
        editor.update(() => $convertFromMarkdownString(written), {
          discrete: true,
        });
        expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
        written = editor.read(() => $convertToMarkdownString());
      }
    },
  );

  it('escapes only the selected literal content', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => {
        const text = $createTextNode('before <b>&copy; [x](u)</b> after');
        $getRoot().clear().append($createParagraphNode().append(text));
        text.select(7, text.getTextContentSize() - 6);
      },
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $convertSelectionToMarkdownString(TRANSFORMERS, $getSelection()),
      ),
    ).toBe('\\<b>\\&copy; \\[x\\](u)\\</b>');
  });

  it.each(['[label]', 'a]b', 'a[b', 'a](other)'])(
    'preserves real link label %j',
    label => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createLinkNode('uri').append($createTextNode(label)),
              ),
            ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const link = paragraph.getFirstChildOrThrow();
        assert($isLinkNode(link));
        expect(link.getURL()).toBe('uri');
        expect(link.getTextContent()).toBe(label);
      });
    },
  );

  it.each(['[\\]', '\\[x]', '[\\]`'])(
    'preserves existing backslashes in code-formatted link label %j',
    label => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createLinkNode('uri').append(
                  $createTextNode(label).toggleFormat('code'),
                ),
              ),
            ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const link = paragraph.getFirstChildOrThrow();
        assert($isLinkNode(link));
        const text = link.getFirstChildOrThrow();
        assert($isTextNode(text));
        expect(text.getTextContent()).toBe(label);
        expect(text.hasFormat('code')).toBe(true);
      });
    },
  );

  it('continues searching after an escaped link opener', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => $convertFromMarkdownString('\\[literal](a) [real](b)'),
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      const links = paragraph.getChildren().filter($isLinkNode);
      expect(links.map(link => link.getURL())).toEqual(['b']);
      expect(paragraph.getTextContent()).toBe('[literal](a) real');
    });
  });

  it('keeps the existing raw-source newline mode', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    const source = '\\&#65; \\<b> \\[x](u)';
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode(source))),
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
    ).toBe(source);
  });

  it('does not escape code or authored custom transformer output', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    const raw = '<b>&copy; [x](u)</b>';
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode(raw).toggleFormat('code'),
              $createTextNode('owned'),
            ),
          ),
      {discrete: true},
    );
    const custom: TextMatchTransformer = {
      dependencies: [],
      export: node => (node.getTextContent() === 'owned' ? raw : null),
      regExp: /$^/,
      type: 'text-match',
    };
    expect(
      editor.read(() => $convertToMarkdownString([custom, ...TRANSFORMERS])),
    ).toBe('`' + raw + '`' + raw);
  });

  it('keeps custom matchers responsible for their escape rules', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    let calls = 0;
    const custom: TextMatchTransformer = {
      dependencies: [],
      importRegExp: /@\w+/,
      regExp: /@\w+$/,
      replace: node => {
        calls++;
        node.setTextContent('seen');
      },
      type: 'text-match',
    };
    editor.update(() => $convertFromMarkdownString('\\@name', [custom]), {
      discrete: true,
    });
    expect(calls).toBe(1);
    expect(editor.read(() => $getRoot().getTextContent())).toBe('\\seen');
  });
});

describe('one-pass numeric reference decoding', () => {
  it.each([
    ['&#65;', 'A'],
    ['&#x41;', 'A'],
    ['&#X41;', 'A'],
    ['\\&#65;', '&#65;'],
    ['\\&#x41;', '&#x41;'],
    ['&#38;#65;', '&#65;'],
    ['&#x26;#x41;', '&#x41;'],
    ['\\\\&#65;', '\\A'],
    ['&copy;', '&copy;'],
    ['&#0;', '\uFFFD'],
    ['&#xD800;', '\uFFFD'],
    ['&#x110000;', '\uFFFD'],
  ])('decodes %j once', (source, expected) => {
    expect(unescapeText(source)).toBe(expected);
  });
});
