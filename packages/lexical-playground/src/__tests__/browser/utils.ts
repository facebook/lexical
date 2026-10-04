/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createParagraphNode,
  $getRoot,
  type AnyLexicalExtensionArgument,
  defineExtension,
  IS_APPLE,
} from 'lexical';
import {expect, onTestFinished} from 'vitest';
import {userEvent} from 'vitest/browser';

import theme from '../../themes/PlaygroundEditorTheme';

export function setupEditor(dependencies: AnyLexicalExtensionArgument[]) {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.style.whiteSpace = 'pre-wrap';
  document.body.append(root);
  const editor = buildEditorFromExtensions(
    defineExtension({dependencies, name: '[browser-test]', theme}),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
    window.getSelection()?.removeAllRanges();
  });
  editor.update(
    () => {
      $getRoot().clear().append($createParagraphNode());
      $getRoot().selectEnd();
    },
    {discrete: true},
  );
  window.focus();
  root.focus();
  return {editor, root};
}

export async function typeText(text: string) {
  await userEvent.keyboard(text.replace(/[{[]/g, '$&$&'));
}

export async function press(chord: string, count = 1) {
  const keys = chord.split('+');
  const key = keys.pop()!;
  const modifiers = keys.map(modifier =>
    modifier === 'ControlOrMeta' ? (IS_APPLE ? 'Meta' : 'Control') : modifier,
  );
  const input =
    modifiers.map(modifier => `{${modifier}>}`).join('') +
    (key.length === 1 ? key : `{${key}}`) +
    [...modifiers]
      .reverse()
      .map(modifier => `{/${modifier}}`)
      .join('');
  for (let i = 0; i < count; i++) {
    await userEvent.keyboard(input);
  }
}

export const undo = () => press('ControlOrMeta+z');
export const redo = () => press(IS_APPLE ? 'Meta+Shift+z' : 'Control+y');

export function html(strings: TemplateStringsArray, ...values: unknown[]) {
  return strings.reduce(
    (result, part, i) => result + part + (i < values.length ? values[i] : ''),
    '',
  );
}

// Like the E2E HTML assertions, ignore indentation and boundary whitespace,
// but compare every element, attribute, and non-whitespace text node.
function normalizeHTML(value: string): string {
  const template = document.createElement('template');
  template.innerHTML = value;
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
  );
  while (walker.nextNode()) {
    walker.currentNode.textContent = walker.currentNode.textContent!.trim();
  }
  for (const element of template.content.querySelectorAll('*')) {
    const attributes = Array.from(element.attributes).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const attribute of attributes) {
      element.removeAttribute(attribute.name);
    }
    for (const {name, value: attributeValue} of attributes) {
      element.setAttribute(name, attributeValue);
    }
  }
  return template.innerHTML;
}

export async function assertHTML(root: HTMLElement, expected: string) {
  await expect
    .poll(() => normalizeHTML(root.innerHTML))
    .toBe(normalizeHTML(expected));
}

interface SelectionExpectation {
  anchorOffset: number;
  anchorPath: number[];
  focusOffset: number;
  focusPath: number[];
}

export async function assertSelection(
  root: HTMLElement,
  expected: SelectionExpectation,
) {
  const path = (node: Node | null) => {
    const result: number[] = [];
    while (node !== root && node?.parentNode) {
      result.unshift(
        Array.from(node.parentNode.childNodes).indexOf(node as ChildNode),
      );
      node = node.parentNode;
    }
    return node === root ? result : null;
  };
  await expect
    .poll(() => {
      const selection = window.getSelection();
      return (
        selection && {
          anchorOffset: selection.anchorOffset,
          anchorPath: path(selection.anchorNode),
          focusOffset: selection.focusOffset,
          focusPath: path(selection.focusNode),
        }
      );
    })
    .toEqual(expected);
}
