/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
} from '@lexical/html';
import {
  $createParagraphNode,
  $getRoot,
  $insertNodes,
  $isElementNode,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {
  $createEquationNode,
  $isEquationNode,
} from '../../src/nodes/EquationNode';
import {PlaygroundImportExtension} from '../../src/nodes/PlaygroundImportExtension';
import {EquationsExtension} from '../../src/plugins/EquationsExtension';

const EquationHTMLTestExtension = /* @__PURE__ */ defineExtension({
  $initialEditorState: null,
  dependencies: [PlaygroundImportExtension, EquationsExtension],
  name: '[test-equation-html]',
});

function $findFirst(
  predicate: (node: LexicalNode) => boolean,
): LexicalNode | null {
  const stack: LexicalNode[] = [...$getRoot().getChildren()];
  while (stack.length > 0) {
    const node = stack.shift()!;
    if (predicate(node)) {
      return node;
    }
    if ($isElementNode(node)) {
      stack.push(...node.getChildren());
    }
  }
  return null;
}

function exportEquationHtml(equation: string, inline: boolean): string {
  using editor = buildEditorFromExtensions(EquationHTMLTestExtension);
  editor.update(
    () => {
      $getRoot().clear();
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.selectStart();
      $insertNodes([$createEquationNode(equation, inline)]);
    },
    {discrete: true},
  );
  return editor.read(() => $generateHtmlFromNodes(editor, null));
}

function importEquationHtml(htmlString: string): null | string {
  using editor = buildEditorFromExtensions(EquationHTMLTestExtension);
  editor.update(
    () => {
      $getRoot().clear().select();
      const dom = new DOMParser().parseFromString(htmlString, 'text/html');
      $insertNodes($generateNodesFromDOMViaExtension(dom));
    },
    {discrete: true},
  );
  return editor.read(() => {
    const node = $findFirst($isEquationNode);
    assert($isEquationNode(node), 'expected an EquationNode');
    return node.getEquation();
  });
}

describe('EquationNode HTML round trip', () => {
  it('exports an equation with non Latin-1 characters without throwing', () => {
    // A free-form LaTeX equation routinely carries code points above U+00FF,
    // which is exactly the range btoa() rejects.
    expect(() => exportEquationHtml('\\text{\u03b1}', true)).not.toThrow();
  });

  it('round trips an equation with non Latin-1 characters', () => {
    const equation = '\\text{\u03b1} + \\text{\u9762\u7a4d}';
    expect(importEquationHtml(exportEquationHtml(equation, false))).toBe(
      equation,
    );
  });

  it('round trips an equation outside the basic multilingual plane', () => {
    const equation = '\\text{\ud83d\ude42}';
    expect(importEquationHtml(exportEquationHtml(equation, true))).toBe(
      equation,
    );
  });

  it('still decodes an equation exported before the encoding change', () => {
    // Pure ASCII encodes byte for byte, so HTML written by older builds
    // decodes unchanged.
    const legacy = `<span data-lexical-equation="${btoa(
      'x^2 + y^2',
    )}" data-lexical-inline="true"></span>`;
    expect(importEquationHtml(legacy)).toBe('x^2 + y^2');
  });
});
