/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {domOverride} from '@lexical/html';
import {
  $isLineBreakNode,
  isHTMLElement,
  LineBreakNode,
  ParagraphNode,
  TabNode,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  ALWAYS_TRUE,
  buildTypeTree,
  precompileDOMRenderConfigOverrides,
} from '../../compileDOMRenderConfigOverrides';

describe('buildTypeTree', () => {
  test('includes basic types', () => {
    const editor = buildEditorFromExtensions();
    expect(buildTypeTree(editor._createEditorArgs!)).toMatchObject({
      linebreak: {
        klass: LineBreakNode,
        types: {
          linebreak: true,
        },
      },
      paragraph: {
        klass: ParagraphNode,
        types: {paragraph: true},
      },
      tab: {klass: TabNode, types: {tab: true}},
      text: {klass: TextNode, types: {tab: true, text: true}},
    });
  });
});

describe('precompileDOMRenderConfigOverrides', () => {
  test('precompiles with only type overrides', () => {
    class TextNodeA extends TextNode {
      $config() {
        return this.config('text-a', {extends: TextNode});
      }
    }
    const overrides = [
      domOverride([TextNode], {
        $exportDOM(node) {
          const span = document.createElement('span');
          span.append(node.getTextContent());
          return {element: span};
        },
      }),
      domOverride([TextNodeA], {
        $exportDOM(node) {
          const span = document.createElement('span');
          span.append(node.getTextContent());
          span.dataset.lexicalType = node.getType();
          return {element: span};
        },
      }),
      domOverride([TextNode], {
        $exportDOM(node, $next) {
          const r = $next();
          if (isHTMLElement(r.element)) {
            r.element.dataset.didOverride = 'true';
          }
          return r;
        },
      }),
    ];
    const prerender = precompileDOMRenderConfigOverrides(
      {nodes: [TextNode, TextNodeA]},
      overrides,
    );
    expect(prerender).toEqual({
      $createDOM: [],
      $exportDOM: [
        [
          'types',
          {
            text: [overrides[0].$exportDOM, overrides[2].$exportDOM],
            'text-a': [
              overrides[0].$exportDOM,
              overrides[1].$exportDOM,
              overrides[2].$exportDOM,
            ],
          },
        ],
      ],
      $extractWithChild: [],
      $getDOMSlot: [],
      $shouldExclude: [],
      $shouldInclude: [],
      $updateDOM: [],
    });
  });
  test('precompiles with wildcards, predicates, and type overrides', () => {
    class TextNodeA extends TextNode {
      $config() {
        return this.config('text-a', {extends: TextNode});
      }
    }
    const overrides = [
      domOverride([TextNode], {
        $exportDOM(node) {
          const span = document.createElement('span');
          span.append(node.getTextContent());
          return {element: span};
        },
      }),
      domOverride('*', {
        $exportDOM(node, $next) {
          return $next();
        },
      }),
      domOverride([TextNodeA], {
        $exportDOM(node) {
          const span = document.createElement('span');
          span.append(node.getTextContent());
          span.dataset.lexicalType = node.getType();
          return {element: span};
        },
      }),
      domOverride([TextNode], {
        $exportDOM(node, $next) {
          const r = $next();
          if (isHTMLElement(r.element)) {
            r.element.dataset.didOverride = 'true';
          }
          return r;
        },
      }),
      domOverride([$isLineBreakNode], {
        $exportDOM(node, $next) {
          return $next();
        },
      }),
    ];
    const prerender = precompileDOMRenderConfigOverrides(
      {nodes: [TextNode, TextNodeA]},
      overrides,
    );
    expect(prerender).toEqual({
      $createDOM: [],
      $exportDOM: [
        [
          'types',
          {
            text: [overrides[0].$exportDOM],
            'text-a': [overrides[0].$exportDOM],
          },
        ],
        [ALWAYS_TRUE, overrides[1].$exportDOM],
        [
          'types',
          {
            text: [overrides[3].$exportDOM],
            'text-a': [overrides[2].$exportDOM, overrides[3].$exportDOM],
          },
        ],
        [$isLineBreakNode, overrides[4].$exportDOM],
      ],
      $extractWithChild: [],
      $getDOMSlot: [],
      $shouldExclude: [],
      $shouldInclude: [],
      $updateDOM: [],
    });
  });
});
