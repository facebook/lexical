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
  defineExtension,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {
  $createRubyNode,
  $isRubyNode,
  RubyNode,
} from '../../src/plugins/RubyExtension/RubyNode';

const RubyTestExtension = /* @__PURE__ */ defineExtension({
  $initialEditorState: null,
  dependencies: [RichTextExtension],
  name: '[test-ruby]',
  nodes: [RubyNode],
  theme: {ruby: 'theme-ruby', text: {underline: 'theme-underline'}},
});

type RubyDOM = {inner: HTMLElement; wrapper: HTMLElement};

function makeEditor(): [LexicalEditor & Disposable, HTMLElement] {
  const editor = buildEditorFromExtensions(RubyTestExtension);
  const rootElement = document.createElement('div');
  editor.setRootElement(rootElement);
  return [editor, rootElement];
}

function getRubyDOM(rootElement: HTMLElement): RubyDOM {
  const wrapper = rootElement.querySelector<HTMLElement>('[role="group"]');
  assert(wrapper !== null, 'ruby wrapper');
  const inner = wrapper.firstElementChild as HTMLElement | null;
  assert(inner !== null, 'ruby inner');
  return {inner, wrapper};
}

function describeRuby({inner, wrapper}: RubyDOM) {
  return {
    innerClass: Array.from(inner.classList).sort().join(' '),
    innerStyle: inner.getAttribute('style') || '',
    wrapperClass: Array.from(wrapper.classList).sort().join(' '),
    wrapperStyle: wrapper.getAttribute('style') || '',
  };
}

/** Build a ruby node in its final state, so only createDOM runs. */
function renderFresh(style: string, format: null | TextFormatType) {
  const [editor, rootElement] = makeEditor();
  using _ = editor;
  editor.update(
    () => {
      const ruby = $createRubyNode('kanji', 'kana').setStyle(style);
      if (format) {
        ruby.setFormat(format);
      }
      $getRoot().clear().append($createParagraphNode().append(ruby));
    },
    {discrete: true},
  );
  return describeRuby(getRubyDOM(rootElement));
}

/** Build a plain ruby node and then mutate it, so updateDOM runs. */
function renderThenUpdate(style: string, format: null | TextFormatType) {
  const [editor, rootElement] = makeEditor();
  using _ = editor;
  editor.update(
    () => {
      const ruby = $createRubyNode('kanji', 'kana').setStyle('color: red');
      $getRoot().clear().append($createParagraphNode().append(ruby));
    },
    {discrete: true},
  );
  editor.update(
    () => {
      const ruby = $getRoot().getLastDescendant();
      assert($isRubyNode(ruby), 'RubyNode');
      ruby.setStyle(style);
      if (format) {
        ruby.setFormat(format);
      }
    },
    {discrete: true},
  );
  return describeRuby(getRubyDOM(rootElement));
}

describe('RubyNode.updateDOM', () => {
  it('applies a style change to the element createDOM styled', () => {
    // updateDOM returning false promises the DOM already matches what
    // createDOM would have produced for this node.
    expect(renderThenUpdate('color: blue', null)).toEqual(
      renderFresh('color: blue', null),
    );
  });

  it('applies a class-only text format to the element createDOM classed', () => {
    expect(renderThenUpdate('color: red', 'underline')).toEqual(
      renderFresh('color: red', 'underline'),
    );
  });

  it('leaves the annotation and the accessible name on the wrapper', () => {
    const [editor, rootElement] = makeEditor();
    using _ = editor;
    editor.update(
      () => {
        const ruby = $createRubyNode('kanji', 'kana');
        $getRoot().clear().append($createParagraphNode().append(ruby));
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const ruby = $getRoot().getLastDescendant();
        assert($isRubyNode(ruby), 'RubyNode');
        ruby.setAnnotation('kana2');
      },
      {discrete: true},
    );
    const {inner, wrapper} = getRubyDOM(rootElement);
    expect(inner.dataset.rubyAnnotation).toBe('kana2');
    expect(wrapper.getAttribute('aria-label')).toBe('kanji (kana2)');
  });
});
