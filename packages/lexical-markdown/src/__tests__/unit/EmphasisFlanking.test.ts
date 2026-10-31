/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// #9660: a run of tags with punctuation on one side and a letter or digit on
// the other cannot close (`**Hello,**world`) or open (`x*(beta)*`) by
// CommonMark's flanking rules, so the exported Markdown imported again kept
// the asterisks as text and lost the format. The export now writes that
// letter or digit as a numeric character reference (`**Hello,**&#119;orld`),
// punctuation to the run and the same character once imported.

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type TextFormatType,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {MarkdownTestExtension} from '../utils';

type Part = [string, TextFormatType[]];

const FORMATS: TextFormatType[] = [
  'bold',
  'italic',
  'strikethrough',
  'highlight',
  'code',
];

function editor() {
  return buildEditorFromExtensions({
    dependencies: [MarkdownTestExtension],
    name: 'test',
    onError: e => {
      throw e;
    },
  });
}

/** Each character of the paragraph with the formats it has, in order. */
function characters(parts: Part[]): string[] {
  return parts.flatMap(([text, formats]) =>
    [...text].map(c => `${c}:${[...formats].sort().join('+')}`),
  );
}

/** Export `parts` as one paragraph and import the Markdown again. */
function roundTrip(parts: Part[]): {after: string[]; markdown: string} {
  const e = editor();
  e.update(
    () => {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append(
            ...parts.map(([text, formats]) => {
              const node = $createTextNode(text);
              for (const format of formats) {
                node.toggleFormat(format);
              }
              return node;
            }),
          ),
        );
    },
    {discrete: true},
  );
  const markdown = e.read(() => $convertToMarkdownString(TRANSFORMERS));
  e.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
    discrete: true,
  });
  const after = e.read(() =>
    characters(
      $getRoot()
        .getAllTextNodes()
        .map(n => [
          n.getTextContent(),
          FORMATS.filter(format => n.hasFormat(format)),
        ]),
    ),
  );
  e.dispose();
  return {after, markdown};
}

describe('#9660: formatted text that ends or starts with punctuation next to a letter', () => {
  for (const [parts, markdown] of [
    [
      [
        ['Hello,', ['bold']],
        ['world', []],
      ],
      '**Hello,**&#119;orld',
    ],
    [
      [
        ['Note:', ['bold']],
        ['see', []],
      ],
      '**Note:**&#115;ee',
    ],
    [
      [
        ['x', []],
        ['(beta)', ['italic']],
      ],
      '&#120;*(beta)*',
    ],
    [
      [
        ['a.', ['italic']],
        ['b', []],
      ],
      '*a.*&#98;',
    ],
    [
      [
        ['(', ['bold']],
        ['b', []],
      ],
      '**(**&#98;',
    ],
    [
      [
        ['*', ['bold']],
        ['b', []],
      ],
      '**\\***&#98;',
    ],
    [
      [
        ['x', []],
        ['tag', ['bold', 'code']],
      ],
      '&#120;**`tag`**',
    ],
    [
      [
        ['€', ['italic']],
        ['5', []],
      ],
      '*€*&#53;',
    ],
    [
      [
        ['a,', ['bold']],
        ['b', ['italic']],
      ],
      '**a,***&#98;*',
    ],
  ] as [Part[], string][]) {
    test(`${JSON.stringify(parts)} exports as ${markdown} and imports the same`, () => {
      const result = roundTrip(parts);
      expect(result.markdown).toBe(markdown);
      expect(result.after).toEqual(characters(parts));
    });
  }
  // Controls: nothing to encode.
  for (const [parts, markdown] of [
    [
      [
        ['Hello,', ['bold']],
        [' world', []],
      ],
      '**Hello,** world',
    ],
    [
      [
        ['Hello', ['bold']],
        ['world', []],
      ],
      '**Hello**world',
    ],
    [
      [
        ['Hello,', ['bold']],
        ['!', []],
      ],
      '**Hello,**!',
    ],
    [
      [
        ['x ', []],
        ['(beta)', ['italic']],
      ],
      'x *(beta)*',
    ],
    [
      [
        ['Hello,', ['bold']],
        ['world', ['bold']],
      ],
      '**Hello,world**',
    ],
  ] as [Part[], string][]) {
    test(`control: ${JSON.stringify(parts)} exports as ${markdown}`, () => {
      const result = roundTrip(parts);
      expect(result.markdown).toBe(markdown);
      expect(result.after).toEqual(characters(parts));
    });
  }
});

/** A seeded random integer below `n`. */
function random(seed: number) {
  let state = seed >>> 0 || 1;
  return (n: number) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % n;
  };
}

// Any paragraph of two to four text nodes, each of letters, digits,
// punctuation (ASCII and not) and spaces with any of bold, italic,
// strikethrough, highlight and code, exports as Markdown that imports as the
// same characters with the same formats, where a run of tags sits between
// a word character and punctuation. Shapes the export cannot write as
// Markdown for other reasons stay out (see `skip`).
describe('#9660: export and import keep every character and its formats', () => {
  const CHUNKS = [
    'a',
    'Bc',
    '7',
    ',',
    '.',
    '(',
    ')',
    ':',
    '!',
    '€',
    '—',
    'é',
    ' ',
  ];
  const SEEDS = Number(process.env.LEXICAL_MARKDOWN_SEEDS || 1500);
  test(`${SEEDS} random paragraphs`, () => {
    const failures: string[] = [];
    let checked = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rnd = random(seed * 7919);
      const parts: Part[] = [];
      const count = 2 + rnd(3);
      for (let i = 0; i < count; i++) {
        let text = '';
        const size = 1 + rnd(3);
        for (let j = 0; j < size; j++) {
          text += CHUNKS[rnd(CHUNKS.length)];
        }
        const formats = FORMATS.filter(() => rnd(3) === 0);
        parts.push([text, formats]);
      }
      if (skip(parts)) {
        continue;
      }
      checked++;
      const {after, markdown} = roundTrip(parts);
      if (JSON.stringify(after) !== JSON.stringify(characters(parts))) {
        failures.push(`seed ${seed} ${JSON.stringify(parts)} -> ${markdown}`);
      }
    }
    expect(checked).toBeGreaterThan(SEEDS / 8);
    expect(failures).toEqual([]);
  });
});

/**
 * Shapes this property leaves out, which the export cannot write for reasons
 * other than flanking: a node whose text starts or ends with white space
 * inside a format (the tags go inside the white space, so the space loses
 * the format), code with any other format next to text that has none of
 * them, and two neighbours that share some of their formats but not all (the
 * export closes and opens tags in an order the import reads differently).
 */
function skip(parts: Part[]): boolean {
  for (let i = 0; i < parts.length; i++) {
    const [text, formats] = parts[i];
    if (formats.length > 0 && (/^\s|\s$/.test(text) || text.trim() === '')) {
      return true;
    }
    if (formats.includes('code') && formats.length > 1) {
      return true;
    }
    if (i > 0) {
      const prev = parts[i - 1][1];
      const shared = formats.filter(f => prev.includes(f));
      if (
        shared.length > 0 &&
        (shared.length !== formats.length || shared.length !== prev.length)
      ) {
        return true;
      }
    }
  }
  return false;
}
