/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import invariant from '@lexical/internal/invariant';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $getRoot, $isElementNode} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $createEquationNode,
  $isEquationNode,
  EquationNode,
} from '../../src/nodes/EquationNode';

describe('EquationNode ARIA attributes', () => {
  function makeEditor() {
    const errors: Error[] = [];
    const editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension],
      name: 'equation-aria',
      nodes: [EquationNode],
      onError: e => {
        errors.push(e);
      },
    });
    editor.setRootElement(document.createElement('div'));
    return {editor, errors};
  }

  test('createDOM sets role="math" and aria-label with the equation text', () => {
    const {editor, errors} = makeEditor();
    editor.update(
      () => {
        const root = $getRoot().clear();
        const para = $createParagraphNode();
        para.append($createEquationNode('x^2 + y^2', true));
        root.append(para);
      },
      {discrete: true},
    );
    expect(errors).toEqual([]);
    const rootElement = editor.getRootElement();
    invariant(rootElement !== null, 'root element must exist');
    const equationDOM =
      rootElement.querySelector<HTMLElement>('.editor-equation');
    invariant(equationDOM !== null, 'equation DOM must be attached');
    expect(equationDOM.getAttribute('role')).toBe('math');
    expect(equationDOM.getAttribute('aria-label')).toBe('Equation: x^2 + y^2');
  });

  test('aria-label tracks setEquation updates without recreating the DOM', () => {
    const {editor, errors} = makeEditor();
    editor.update(
      () => {
        const root = $getRoot().clear();
        const para = $createParagraphNode();
        para.append($createEquationNode('a', true));
        root.append(para);
      },
      {discrete: true},
    );
    const rootElement = editor.getRootElement();
    invariant(rootElement !== null, 'root element must exist');
    const before = rootElement.querySelector<HTMLElement>('.editor-equation');
    invariant(before !== null, 'equation DOM must be attached');
    expect(before.getAttribute('aria-label')).toBe('Equation: a');

    editor.update(
      () => {
        const para = $getRoot().getFirstChildOrThrow();
        invariant($isElementNode(para), 'paragraph');
        const equation = para.getFirstChild();
        invariant($isEquationNode(equation), 'equation node');
        equation.setEquation('a + b');
      },
      {discrete: true},
    );
    const after = rootElement.querySelector<HTMLElement>('.editor-equation');
    invariant(after !== null, 'equation DOM must remain attached');
    expect(after).toBe(before);
    expect(after.getAttribute('aria-label')).toBe('Equation: a + b');
    expect(errors).toEqual([]);
  });
});
