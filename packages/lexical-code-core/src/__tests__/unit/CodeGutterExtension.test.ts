/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeExtension} from '@lexical/code';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {$createLineBreakNode, $getRoot} from 'lexical';
import {describe, expect, it} from 'vitest';

import {CodeGutterExtension} from '../../CodeGutterExtension';
import {$createCodeHighlightNode} from '../../CodeHighlightNode';

function readDOM(rootElement: HTMLElement): {
  code: HTMLElement;
  lineStarters: {tag: string; text: string; number: string | null}[];
} {
  const code = rootElement.querySelector('code') as HTMLElement;
  const lineStarters: {
    tag: string;
    text: string;
    number: string | null;
  }[] = [];
  for (const child of Array.from(code.children) as HTMLElement[]) {
    const number = child.getAttribute('data-line-number');
    if (number !== null) {
      lineStarters.push({
        number,
        tag: child.tagName.toLowerCase(),
        text: child.textContent ?? '',
      });
    }
  }
  return {code, lineStarters};
}

describe('CodeGutterExtension', () => {
  it('decorates each text line first node with data-line-number', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('line1'),
          $createLineBreakNode(),
          $createCodeHighlightNode('line2'),
          $createLineBreakNode(),
          $createCodeHighlightNode('line3'),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, CodeGutterExtension, RichTextExtension],
      name: '[root]',
    });

    using editor = buildEditorFromExtensions(ext);
    const rootElement = document.createElement('div');
    editor.setRootElement(rootElement);
    editor.read(() => {
      const {code, lineStarters} = readDOM(rootElement);
      expect(code.hasAttribute('data-lexical-code-gutter-active')).toBe(true);
      expect(lineStarters).toEqual([
        {number: '1', tag: 'span', text: 'line1'},
        {number: '2', tag: 'span', text: 'line2'},
        {number: '3', tag: 'span', text: 'line3'},
      ]);
    });
  });

  it('wraps empty-line LineBreakNodes and assigns line numbers to the wrap', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('line1'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createCodeHighlightNode('line3'),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, CodeGutterExtension, RichTextExtension],
      name: '[root]',
    });

    using editor = buildEditorFromExtensions(ext);
    const rootElement = document.createElement('div');
    editor.setRootElement(rootElement);
    editor.read(() => {
      const {lineStarters} = readDOM(rootElement);
      expect(lineStarters).toEqual([
        {number: '1', tag: 'span', text: 'line1'},
        {number: '2', tag: 'span', text: ''},
        {number: '3', tag: 'span', text: 'line3'},
      ]);
    });
  });

  it('numbers a leading empty line via the first LineBreakNode wrap', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createLineBreakNode(),
          $createCodeHighlightNode('line2'),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, CodeGutterExtension, RichTextExtension],
      name: '[root]',
    });

    using editor = buildEditorFromExtensions(ext);
    const rootElement = document.createElement('div');
    editor.setRootElement(rootElement);
    editor.read(() => {
      const {lineStarters} = readDOM(rootElement);
      expect(lineStarters).toEqual([
        {number: '1', tag: 'span', text: ''},
        {number: '2', tag: 'span', text: 'line2'},
      ]);
    });
  });

  it('marks the last LineBreakNode wrap with data-line-number-trailing for the placeholder line', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('line1'),
          $createLineBreakNode(),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, CodeGutterExtension, RichTextExtension],
      name: '[root]',
    });

    using editor = buildEditorFromExtensions(ext);
    const rootElement = document.createElement('div');
    editor.setRootElement(rootElement);
    editor.read(() => {
      const code = rootElement.querySelector('code') as HTMLElement;
      const trailingWraps = code.querySelectorAll(
        '[data-line-number-trailing]',
      );
      expect(trailingWraps.length).toBe(1);
      expect(trailingWraps[0].getAttribute('data-line-number-trailing')).toBe(
        '2',
      );
    });
  });

  it('does not set data-line-number on non-line-starter children', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('foo'),
          $createCodeHighlightNode('bar'),
          $createLineBreakNode(),
          $createCodeHighlightNode('baz'),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, CodeGutterExtension, RichTextExtension],
      name: '[root]',
    });

    using editor = buildEditorFromExtensions(ext);
    const rootElement = document.createElement('div');
    editor.setRootElement(rootElement);
    editor.read(() => {
      const code = rootElement.querySelector('code') as HTMLElement;
      const decorated = code.querySelectorAll('[data-line-number]');
      expect(decorated.length).toBe(2);
      expect(decorated[0].textContent).toBe('foo');
      expect(decorated[1].textContent).toBe('baz');
    });
  });
});
