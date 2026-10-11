/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {assert, describe, expect, test} from 'vitest';

import {
  fixOffset,
  getPathFromNodeToEditor,
} from '../../plugins/TestRecorderPlugin';

// The recorder writes the selection as the e2e tests assert it, which leaves
// out the zero-size anchor the reconciler renders before a leading inline
// decorator on WebKit and desktop Chromium (#7158) and outside a leading or
// trailing block decorator (#8922).

function parseRoot(markup: string): HTMLElement {
  const root = new DOMParser().parseFromString(
    `<div contenteditable="true">${markup}</div>`,
    'text/html',
  ).body.firstElementChild;
  assert(root instanceof HTMLElement, 'Expected the root element');
  return root;
}

const ANCHOR = '<img data-lexical-decorator-boundary="true">';
const INLINE = '<span data-lexical-decorator="true"></span>';
const LINE_BREAK =
  '<img data-lexical-managed-linebreak="true"><br data-lexical-managed-linebreak="true">';

describe('TestRecorderPlugin selection offsets', () => {
  test('a paragraph that starts and ends with an inline decorator', () => {
    const root = parseRoot(
      `<p>${ANCHOR}${INLINE}<span>abc</span>${INLINE}${LINE_BREAK}</p>`,
    );
    const paragraph = root.firstChild;
    assert(paragraph !== null, 'Expected the paragraph');
    const text = paragraph.childNodes[2].firstChild;
    assert(text !== null, 'Expected the text');
    expect(getPathFromNodeToEditor(text, root)).toEqual([0, 1, 0]);
    // Before and after the first decorator.
    expect(fixOffset(paragraph, 1)).toBe(0);
    expect(fixOffset(paragraph, 2)).toBe(1);
    // After the last decorator, and at the br of the line break after it,
    // which the tests assert at its img.
    expect(fixOffset(paragraph, 4)).toBe(3);
    expect(fixOffset(paragraph, 5)).toBe(3);
  });

  test('the root around a leading block decorator', () => {
    const root = parseRoot(
      `${ANCHOR}<div data-lexical-decorator="true"></div><p><span>abc</span></p>`,
    );
    const text = root.childNodes[2].firstChild?.firstChild;
    assert(text != null, 'Expected the text');
    expect(getPathFromNodeToEditor(text, root)).toEqual([1, 0, 0]);
    expect(fixOffset(root, 2)).toBe(1);
  });

  test('a text node is left as it is', () => {
    const root = parseRoot(`<p><span>abc</span></p>`);
    const text = root.firstChild?.firstChild?.firstChild;
    assert(text != null, 'Expected the text');
    expect(fixOffset(text, 2)).toBe(2);
  });
});
