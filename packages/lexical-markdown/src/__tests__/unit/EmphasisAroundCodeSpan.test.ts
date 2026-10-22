/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$getRoot, $isTextNode, type TextFormatType} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

const FORMATS: TextFormatType[] = ['bold', 'italic', 'code'];

// Lists each text node of the document as its formats and text, e.g.
// `bold+code:x`.
function importTextNodes(markdown: string): string[] {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  let nodes: string[] = [];
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
      nodes = $getRoot()
        .getAllTextNodes()
        .filter($isTextNode)
        .map(node => {
          const formats = FORMATS.filter(format => node.hasFormat(format));
          return `${formats.join('+') || 'text'}:${node.getTextContent()}`;
        });
    },
    {discrete: true},
  );
  return nodes;
}

function roundTrip(markdown: string): string {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}

describe('emphasis around a code span after an earlier emphasis (#9410)', () => {
  it('imports the emphasis that wraps the later code span', () => {
    expect(importTextNodes('**a** **`x`**')).toEqual([
      'bold:a',
      'text: ',
      'bold+code:x',
    ]);
    expect(importTextNodes('_a_ _`x`_')).toEqual([
      'italic:a',
      'text: ',
      'italic+code:x',
    ]);
    expect(importTextNodes('`a` **b** **`c`**')).toEqual([
      'code:a',
      'text: ',
      'bold:b',
      'text: ',
      'bold+code:c',
    ]);
    expect(importTextNodes('[**b**](https://lexical.dev)**`x`**')).toEqual([
      'bold:b',
      'bold+code:x',
    ]);
  });

  it('round trips these lines unchanged', () => {
    expect(roundTrip('**a** **`x`**')).toBe('**a** **`x`**');
    expect(roundTrip('`a` **b** **`c`**')).toBe('`a` **b** **`c`**');
    // Italic is exported with `*`.
    expect(roundTrip('_a_ _`x`_')).toBe('*a* *`x`*');
  });

  it('leaves the cases that already worked unchanged', () => {
    expect(importTextNodes('**`x`** **a**')).toEqual([
      'bold+code:x',
      'text: ',
      'bold:a',
    ]);
    expect(importTextNodes('a **`x`**')).toEqual(['text:a ', 'bold+code:x']);
    expect(importTextNodes('*a* `b` *c*')).toEqual([
      'italic:a',
      'text: ',
      'code:b',
      'text: ',
      'italic:c',
    ]);
    // Emphasis markers inside code stay code.
    expect(importTextNodes('**a** `*x*` **b**')).toEqual([
      'bold:a',
      'text: ',
      'code:*x*',
      'text: ',
      'bold:b',
    ]);
    expect(importTextNodes('`x` **a**')).toEqual([
      'code:x',
      'text: ',
      'bold:a',
    ]);
    expect(importTextNodes('**a `x` b**')).toEqual([
      'bold:a ',
      'bold+code:x',
      'bold: b',
    ]);
    // A code span that cuts an emphasis pair still wins.
    expect(importTextNodes('**a `b** c`')).toEqual(['text:**a ', 'code:b** c']);
  });
});
