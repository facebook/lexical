/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$isCodeNode, CodeNode} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {HeadlessExtension} from '@lexical/headless';
import {$isLinkNode, LinkNode} from '@lexical/link';
import {
  $convertFromMarkdownString,
  $generateNodesFromMarkdownString,
  CODE,
  INLINE_CODE,
  MarkdownExtension,
  type NamedCharacterReferenceDecoder,
  registerMarkdownShortcuts,
  TEXT_MATCH_TRANSFORMERS,
  type TextMatchTransformer,
} from '@lexical/markdown';
import {
  decodeFullNamedCharacterReference,
  SSRMarkdownExtension,
} from '@lexical/markdown/SSRMarkdownExtension';
import {characterEntities} from 'character-entities';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  configExtension,
  createEditor,
  defineExtension,
  type LexicalEditor,
  type TextNode,
} from 'lexical';
import {assert, describe, expect, it, vi} from 'vitest';

import {$unescapeText} from '../../utils';

const TRANSFORMERS = [CODE, INLINE_CODE, ...TEXT_MATCH_TRANSFORMERS];
const TestNodes = defineExtension({
  dependencies: [HeadlessExtension],
  name: '@lexical/markdown/decoder-test',
  nodes: () => [LinkNode, CodeNode],
});

function configuredEditor(decoder: NamedCharacterReferenceDecoder) {
  return buildEditorFromExtensions(
    TestNodes,
    configExtension(MarkdownExtension, {
      decodeNamedCharacterReference: decoder,
    }),
  );
}

function importText(editor: LexicalEditor, markdown: string) {
  editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
    discrete: true,
  });
  return editor.read(() => $getRoot().getTextContent());
}

function typeMarkdown(editor: LexicalEditor, markdown: string) {
  editor.update(
    () => {
      $getRoot().clear().append($createParagraphNode());
      $getRoot().selectEnd();
    },
    {discrete: true},
  );
  for (const character of markdown) {
    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        selection.insertText(character);
      },
      {discrete: true},
    );
  }
  editor.read(() => {});
}

describe('editor-scoped Markdown decoding', () => {
  it('uses the complete SSR decoder without a document, exactly once', () => {
    using editor = buildEditorFromExtensions(TestNodes, SSRMarkdownExtension);
    expect(typeof document).toBe('undefined');
    expect(
      getExtensionDependencyFromEditor(editor, MarkdownExtension).config
        .decodeNamedCharacterReference,
    ).toBe(decodeFullNamedCharacterReference);
    editor.read(() => {
      for (const [name, value] of Object.entries(characterEntities)) {
        expect($unescapeText('&' + name + ';'), name).toBe(value);
        expect($unescapeText('\\&' + name + ';'), name).toBe('&' + name + ';');
        expect($unescapeText('&amp;' + name + ';'), name).toBe(
          '&' + name + ';',
        );
      }
      for (const name of ['notit', 'constructor', 'toString', 'semiX', 'AMPx'])
        expect($unescapeText('&' + name + ';')).toBe('&' + name + ';');
    });
  });

  it('keeps legacy and unconfigured DOM-free editors usable without a table', () => {
    const legacy = createEditor({
      onError: error => {
        throw error;
      },
    });
    using unconfigured = buildEditorFromExtensions(HeadlessExtension);
    using native = buildEditorFromExtensions(
      HeadlessExtension,
      MarkdownExtension,
    );
    for (const editor of [legacy, unconfigured, native]) {
      editor.update(
        () => $convertFromMarkdownString('&copy; &#60; \\&copy;', []),
        {
          discrete: true,
        },
      );
      expect(editor.read(() => $getRoot().getTextContent())).toBe(
        '&copy; < &copy;',
      );
    }
  });

  it('applies configuration to text, detached import, link destinations and titles', () => {
    const decoder = vi.fn((name: string) =>
      name === 'Pick' ? '&copy;[text]' : undefined,
    );
    using editor = configuredEditor(decoder);
    editor.update(
      () => {
        $convertFromMarkdownString(
          '&Pick; [label](u&Pick; "&Pick;")',
          TRANSFORMERS,
        );
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const link = paragraph.getLastChildOrThrow();
        assert($isLinkNode(link));
        expect(paragraph.getTextContent()).toBe('&copy;[text] label');
        expect(link.getURL()).toBe('u&copy;[text]');
        expect(link.getTitle()).toBe('&copy;[text]');
        expect(
          $generateNodesFromMarkdownString('&Pick;', [])[0].getTextContent(),
        ).toBe('&copy;[text]');
      },
      {discrete: true},
    );
    expect(decoder.mock.calls).toEqual([
      ['Pick'],
      ['Pick'],
      ['Pick'],
      ['Pick'],
    ]);
  });

  it('does not call a custom decoder for escapes, numeric references, code or autolinks', () => {
    const decoder = vi.fn(() => 'changed');
    using editor = configuredEditor(decoder);
    expect(importText(editor, '\\&Pick; &#38;Pick; &#x26;Pick; `&Pick;`')).toBe(
      '&Pick; &Pick; &Pick; &Pick;',
    );
    expect(importText(editor, '```\n&Pick;\n```')).toBe('&Pick;');
    editor.read(() =>
      expect($isCodeNode($getRoot().getFirstChild())).toBe(true),
    );
    expect(importText(editor, '<https://example.com/&Pick;>')).toBe(
      'https://example.com/&Pick;',
    );
    expect(decoder).not.toHaveBeenCalled();
  });

  it('keeps decoder choices isolated and restores the outer editor after nested work', () => {
    using first = configuredEditor(() => 'first');
    using second = configuredEditor(() => 'second');
    first.update(
      () => {
        expect($unescapeText('&Pick;')).toBe('first');
        second.update(() => expect($unescapeText('&Pick;')).toBe('second'), {
          discrete: true,
        });
        expect($unescapeText('&Pick;')).toBe('first');
      },
      {discrete: true},
    );
    for (const [editor, expected] of [
      [first, 'first'],
      [second, 'second'],
    ] as const)
      expect(importText(editor, '&Pick;')).toBe(expected);
    const copiedState = JSON.stringify(first.getEditorState());
    second.setEditorState(second.parseEditorState(copiedState));
    expect(second.read(() => $getRoot().getTextContent())).toBe('first');
    expect(importText(second, '&Pick;')).toBe('second');
  });

  it('keeps nested legacy editors independent of their configured parent', () => {
    using parent = configuredEditor(() => 'parent');
    const child = createEditor({parentEditor: parent});
    expect(importText(child, '&Pick;')).toBe('&Pick;');
    expect(importText(parent, '&Pick;')).toBe('parent');
  });

  it('supports an explicit custom override of the SSR configuration', () => {
    using editor = buildEditorFromExtensions(
      TestNodes,
      SSRMarkdownExtension,
      configExtension(MarkdownExtension, {
        decodeNamedCharacterReference: () => '',
      }),
    );
    expect(importText(editor, 'a&copy;b')).toBe('ab');
  });

  it.each(['custom', 'SSR'])(
    'uses the configured %s decoder for typed link shortcuts',
    kind => {
      using editor =
        kind === 'SSR'
          ? buildEditorFromExtensions(TestNodes, SSRMarkdownExtension)
          : configuredEditor(() => 'chosen');
      const cleanup = registerMarkdownShortcuts(
        editor,
        TEXT_MATCH_TRANSFORMERS,
      );
      try {
        typeMarkdown(editor, '[label](u&copy; "&copy;")');
        editor.read(() => {
          const paragraph = $getRoot().getFirstChildOrThrow();
          assert($isElementNode(paragraph));
          const link = paragraph.getFirstChildOrThrow();
          assert($isLinkNode(link));
          expect(link.getURL()).toBe(kind === 'SSR' ? 'u©' : 'uchosen');
          expect(link.getTitle()).toBe(kind === 'SSR' ? '©' : 'chosen');
        });
      } finally {
        cleanup();
      }
    },
  );

  it('preserves custom transformer signatures and decodes retained text in the active editor', () => {
    using editor = configuredEditor(() => 'chosen');
    const replace = vi.fn((node: TextNode, _match: RegExpMatchArray) => {
      node.toggleFormat('highlight');
    });
    const custom: TextMatchTransformer = {
      dependencies: [],
      importRegExp: /@&copy;/,
      regExp: /@&copy;$/,
      replace,
      type: 'text-match',
    };
    editor.update(() => $convertFromMarkdownString('@&copy;', [custom]), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe('@chosen');
    expect(replace).toHaveBeenCalledOnce();
    expect(replace.mock.calls[0]).toHaveLength(2);
  });
});
