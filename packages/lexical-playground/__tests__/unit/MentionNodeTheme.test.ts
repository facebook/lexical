/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $isTextNode,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {$createMentionNode, MentionNode} from '../../src/nodes/MentionNode';

const MentionThemeTestExtension = /* @__PURE__ */ defineExtension({
  $initialEditorState: null,
  dependencies: [RichTextExtension],
  name: '[test-mention-theme]',
  nodes: [MentionNode],
  // Only underline gets a class: bold changes the HTML tag instead, which is
  // what forces the element to be rebuilt through createDOM.
  theme: {text: {underline: 'theme-underline'}},
});

function makeEditor(): [LexicalEditor & Disposable, HTMLElement] {
  const editor = buildEditorFromExtensions(MentionThemeTestExtension);
  const rootElement = document.createElement('div');
  editor.setRootElement(rootElement);
  return [editor, rootElement];
}

function mentionClasses(rootElement: HTMLElement): string[] {
  const dom = rootElement.querySelector<HTMLElement>('[data-lexical-text]');
  assert(dom !== null, 'mention DOM');
  return Array.from(dom.classList).sort();
}

describe('MentionNode theme classes', () => {
  it('keeps the theme class of the format it was created with', () => {
    const [editor, rootElement] = makeEditor();
    using _ = editor;
    editor.update(
      () => {
        const mention = $createMentionNode('Luke').setFormat('underline');
        $getRoot().clear().append($createParagraphNode().append(mention));
      },
      {discrete: true},
    );

    expect(mentionClasses(rootElement)).toEqual(['mention', 'theme-underline']);
  });

  it('keeps the theme class when a format change rebuilds the element', () => {
    const [editor, rootElement] = makeEditor();
    using _ = editor;
    editor.update(
      () => {
        const mention = $createMentionNode('Luke');
        $getRoot().clear().append($createParagraphNode().append(mention));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const mention = $getRoot().getLastDescendant();
        assert($isTextNode(mention), 'mention node');
        mention.setFormat('underline');
      },
      {discrete: true},
    );
    expect(mentionClasses(rootElement)).toEqual(['mention', 'theme-underline']);

    // Bold changes the tag, so TextNode.updateDOM returns true and the
    // reconciler rebuilds the element through createDOM.
    editor.update(
      () => {
        const mention = $getRoot().getLastDescendant();
        assert($isTextNode(mention), 'mention node');
        mention.toggleFormat('bold');
      },
      {discrete: true},
    );

    expect(
      editor.read(() => {
        const mention = $getRoot().getLastDescendant();
        assert($isTextNode(mention), 'mention node');
        return mention.hasFormat('underline');
      }),
    ).toBe(true);
    expect(mentionClasses(rootElement)).toEqual(['mention', 'theme-underline']);
  });
});
