/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import invariant from '@lexical/internal/invariant';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  defineExtension,
  IS_BOLD,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $buildOffsetMap,
  $replaceAllMatches,
  $replaceMatch,
  $resolveMatchToPoints,
  expandReplacement,
  findMatches,
} from '../../src/plugins/FindReplaceExtension';

const TestExtension = defineExtension({
  dependencies: [RichTextExtension, ListExtension],
  name: '[test-find-replace]',
});

describe('findMatches', () => {
  test('returns empty array for empty search term', () => {
    expect(findMatches('hello world', '', false, false)).toEqual([]);
  });

  test('returns empty array for empty text', () => {
    expect(findMatches('', 'hello', false, false)).toEqual([]);
  });

  test('finds single match with matchText', () => {
    expect(findMatches('hello world', 'world', false, false)).toEqual([
      {end: 11, matchText: 'world', start: 6},
    ]);
  });

  test('finds multiple non-overlapping matches', () => {
    expect(findMatches('foo bar foo baz foo', 'foo', false, false)).toEqual([
      {end: 3, matchText: 'foo', start: 0},
      {end: 11, matchText: 'foo', start: 8},
      {end: 19, matchText: 'foo', start: 16},
    ]);
  });

  test('case-insensitive search preserves original case in matchText', () => {
    expect(findMatches('Hello HELLO hello', 'hello', false, false)).toEqual([
      {end: 5, matchText: 'Hello', start: 0},
      {end: 11, matchText: 'HELLO', start: 6},
      {end: 17, matchText: 'hello', start: 12},
    ]);
  });

  test('case-sensitive search', () => {
    expect(findMatches('Hello HELLO hello', 'hello', true, false)).toEqual([
      {end: 17, matchText: 'hello', start: 12},
    ]);
  });

  test('regex search: basic pattern', () => {
    expect(findMatches('foo123bar456', '\\d+', false, true)).toEqual([
      {end: 6, matchText: '123', start: 3},
      {end: 12, matchText: '456', start: 9},
    ]);
  });

  test('regex search: with groups uses full match range', () => {
    expect(findMatches('2026-07-03', '(\\d{4})-(\\d{2})', false, true)).toEqual(
      [{end: 7, matchText: '2026-07', start: 0}],
    );
  });

  test('regex search: invalid regex returns empty array', () => {
    expect(findMatches('hello', '[invalid', false, true)).toEqual([]);
  });

  test('non-regex mode escapes special characters', () => {
    expect(findMatches('price is $10.00', '$10.00', false, false)).toEqual([
      {end: 15, matchText: '$10.00', start: 9},
    ]);
  });

  test('matches at string boundaries', () => {
    expect(findMatches('abc', 'abc', false, false)).toEqual([
      {end: 3, matchText: 'abc', start: 0},
    ]);
  });

  test('matches at start of string', () => {
    expect(findMatches('hello world', 'hello', false, false)).toEqual([
      {end: 5, matchText: 'hello', start: 0},
    ]);
  });

  test('no match returns empty array', () => {
    expect(findMatches('hello world', 'xyz', false, false)).toEqual([]);
  });

  test('skips zero-length regex matches', () => {
    expect(findMatches('abc', '(?=a)', false, true)).toEqual([]);
  });
});

describe('expandReplacement', () => {
  test('returns template as-is when no regex', () => {
    expect(expandReplacement('$1', 'foo', null)).toBe('$1');
  });

  test('expands $1/$2 capture groups', () => {
    expect(expandReplacement('$1-$2', '2026-07', /(\d{4})-(\d{2})/)).toBe(
      '2026-07',
    );
  });

  test('expands named capture groups with different template', () => {
    expect(expandReplacement('year=$1', '2026-07', /(\d{4})-(\d{2})/)).toBe(
      'year=2026',
    );
  });

  test('expands $& for full match', () => {
    expect(expandReplacement('[$&]', 'foo', /foo/)).toBe('[foo]');
  });

  test('swaps groups', () => {
    expect(expandReplacement('$2/$1', 'user@host', /(\w+)@(\w+)/)).toBe(
      'host/user',
    );
  });

  test('literal $1 with no groups in regex', () => {
    expect(expandReplacement('$1', 'hello', /hello/)).toBe('$1');
  });
});

describe('$buildOffsetMap', () => {
  test('maps single paragraph with one TextNode', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('hello'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    const map = editor.read(() => $buildOffsetMap());
    expect(map).toHaveLength(1);
    expect(map[0].globalStart).toBe(0);
    expect(map[0].globalEnd).toBe(5);
  });

  test('maps paragraph with multiple TextNodes (bold boundary)', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        const plain = $createTextNode('hel');
        const bold = $createTextNode('lo');
        bold.setFormat(IS_BOLD);
        p.append(plain, bold);
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    const map = editor.read(() => $buildOffsetMap());
    expect(map).toHaveLength(2);
    expect(map[0].globalStart).toBe(0);
    expect(map[0].globalEnd).toBe(3);
    expect(map[1].globalStart).toBe(3);
    expect(map[1].globalEnd).toBe(5);
  });

  test('maps across multiple paragraphs with double line break offset', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p1 = $createParagraphNode();
        p1.append($createTextNode('abc'));
        const p2 = $createParagraphNode();
        p2.append($createTextNode('def'));
        $getRoot().clear().append(p1, p2);
      },
      {discrete: true},
    );
    const map = editor.read(() => $buildOffsetMap());
    expect(map).toHaveLength(2);
    expect(map[0]).toMatchObject({globalEnd: 3, globalStart: 0});
    expect(map[1]).toMatchObject({globalEnd: 8, globalStart: 5});
  });

  test('handles empty editor', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    const map = editor.read(() => $buildOffsetMap());
    expect(map).toEqual([]);
  });

  test('accounts for LineBreakNode in offset calculation', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append(
          $createTextNode('hello'),
          $createLineBreakNode(),
          $createTextNode('world'),
        );
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    const result = editor.read(() => {
      const map = $buildOffsetMap();
      const text = $getRoot().getTextContent();
      return {map, text};
    });
    expect(result.text).toBe('hello\nworld');
    expect(result.map).toHaveLength(2);
    expect(result.map[0]).toMatchObject({globalEnd: 5, globalStart: 0});
    expect(result.map[1]).toMatchObject({globalEnd: 11, globalStart: 6});
  });

  test('handles empty paragraph between text paragraphs', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p1 = $createParagraphNode();
        p1.append($createTextNode('abc'));
        const p2 = $createParagraphNode();
        const p3 = $createParagraphNode();
        p3.append($createTextNode('def'));
        $getRoot().clear().append(p1, p2, p3);
      },
      {discrete: true},
    );
    const result = editor.read(() => {
      const map = $buildOffsetMap();
      const text = $getRoot().getTextContent();
      return {map, text};
    });
    expect(result.text).toBe('abc\n\n\n\ndef');
    expect(result.map).toHaveLength(2);
    expect(result.map[0]).toMatchObject({globalEnd: 3, globalStart: 0});
    expect(result.map[1]).toMatchObject({globalEnd: 10, globalStart: 7});
  });

  test('maps list items without extra offset for parent→child', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('before'));
        const list = $createListNode('bullet');
        list.append(
          $createListItemNode().append($createTextNode('aaa')),
          $createListItemNode().append($createTextNode('bbb')),
        );
        $getRoot().clear().append(p, list);
      },
      {discrete: true},
    );
    const result = editor.read(() => {
      const map = $buildOffsetMap();
      const text = $getRoot().getTextContent();
      return {map, text};
    });
    expect(result.text).toBe('before\n\naaa\n\nbbb');
    expect(result.map).toHaveLength(3);
    expect(result.map[0]).toMatchObject({globalEnd: 6, globalStart: 0});
    expect(result.map[1]).toMatchObject({globalEnd: 11, globalStart: 8});
    expect(result.map[2]).toMatchObject({globalEnd: 16, globalStart: 13});
  });
});

describe('$resolveMatchToPoints', () => {
  test('single-node match returns correct points with format', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        const text = $createTextNode('hello world');
        text.setFormat(IS_BOLD);
        p.append(text);
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    const result = editor.read(() => {
      const map = $buildOffsetMap();
      return $resolveMatchToPoints({end: 5, matchText: 'hello', start: 0}, map);
    });
    invariant(result !== null, 'expected non-null match points');
    expect(result.anchorKey).toBe(result.focusKey);
    expect(result.anchorOffset).toBe(0);
    expect(result.focusOffset).toBe(5);
    expect(result.format).toBe(IS_BOLD);
  });

  test('cross-node match returns different keys with format 0', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        const plain = $createTextNode('hel');
        const bold = $createTextNode('lo');
        bold.setFormat(IS_BOLD);
        p.append(plain, bold);
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    const result = editor.read(() => {
      const map = $buildOffsetMap();
      return $resolveMatchToPoints({end: 5, matchText: 'hello', start: 0}, map);
    });
    invariant(result !== null, 'expected non-null match points');
    expect(result.anchorKey).not.toBe(result.focusKey);
    expect(result.anchorOffset).toBe(0);
    expect(result.focusOffset).toBe(2);
    expect(result.format).toBe(0);
  });

  test('match falling in paragraph boundary gap returns null', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p1 = $createParagraphNode();
        p1.append($createTextNode('abc'));
        const p2 = $createParagraphNode();
        p2.append($createTextNode('def'));
        $getRoot().clear().append(p1, p2);
      },
      {discrete: true},
    );
    const result = editor.read(() => {
      const map = $buildOffsetMap();
      return $resolveMatchToPoints(
        {end: 5, matchText: 'c\n\nd', start: 3},
        map,
      );
    });
    expect(result).toBeNull();
  });
});

describe('$replaceMatch', () => {
  test('single-node replace preserves text format', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        const text = $createTextNode('hello world');
        text.setFormat(IS_BOLD);
        p.append(text);
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const map = $buildOffsetMap();
        const points = $resolveMatchToPoints(
          {end: 5, matchText: 'hello', start: 0},
          map,
        );
        invariant(points !== null, 'expected non-null match points');
        $replaceMatch(points, 'goodbye');
      },
      {discrete: true},
    );
    editor.read(() => {
      const text = $getRoot().getTextContent();
      expect(text).toBe('goodbye world');
      const p = $getRoot().getFirstChild();
      invariant($isElementNode(p), 'expected ElementNode');
      const firstChild = p.getFirstChild();
      invariant($isTextNode(firstChild), 'expected TextNode');
      expect(firstChild.getFormat()).toBe(IS_BOLD);
    });
  });

  test('multi-node replace produces plain text', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        const plain = $createTextNode('hel');
        const bold = $createTextNode('lo');
        bold.setFormat(IS_BOLD);
        p.append(plain, bold);
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const map = $buildOffsetMap();
        const points = $resolveMatchToPoints(
          {end: 5, matchText: 'hello', start: 0},
          map,
        );
        invariant(points !== null, 'expected non-null match points');
        $replaceMatch(points, 'hi');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('hi');
    });
  });

  test('replace with empty string deletes match', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('hello world'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const map = $buildOffsetMap();
        const points = $resolveMatchToPoints(
          {end: 6, matchText: 'hello ', start: 0},
          map,
        );
        invariant(points !== null, 'expected non-null match points');
        $replaceMatch(points, '');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('world');
    });
  });

  test('regex capture group replacement with $1/$2', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('user@host'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const map = $buildOffsetMap();
        const match = {end: 9, matchText: 'user@host', start: 0};
        const points = $resolveMatchToPoints(match, map);
        invariant(points !== null, 'expected non-null match points');
        $replaceMatch(points, '$2/$1', match, /(\w+)@(\w+)/);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('host/user');
    });
  });

  test('non-regex mode ignores $1 in replacement', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('hello world'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const map = $buildOffsetMap();
        const match = {end: 5, matchText: 'hello', start: 0};
        const points = $resolveMatchToPoints(match, map);
        invariant(points !== null, 'expected non-null match points');
        $replaceMatch(points, '$1');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('$1 world');
    });
  });
});

describe('$replaceAllMatches', () => {
  test('replaces all matches in reverse order', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('foo bar foo'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const map = $buildOffsetMap();
        const matches = findMatches('foo bar foo', 'foo', false, false);
        const count = $replaceAllMatches(matches, map, 'baz');
        expect(count).toBe(2);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('baz bar baz');
    });
  });

  test('replaces all with shorter replacement', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('foo bar foo'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const text = $getRoot().getTextContent();
        const map = $buildOffsetMap();
        const matches = findMatches(text, 'foo', false, false);
        const count = $replaceAllMatches(matches, map, 'x');
        expect(count).toBe(2);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('x bar x');
    });
  });

  test('replaces all with longer replacement', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('foo bar foo'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const text = $getRoot().getTextContent();
        const map = $buildOffsetMap();
        const matches = findMatches(text, 'foo', false, false);
        const count = $replaceAllMatches(matches, map, 'quxxx');
        expect(count).toBe(2);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('quxxx bar quxxx');
    });
  });

  test('replaces all with regex capture groups', () => {
    using editor = buildEditorFromExtensions(TestExtension);
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('a@b and c@d'));
        $getRoot().clear().append(p);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const text = $getRoot().getTextContent();
        const map = $buildOffsetMap();
        const matches = findMatches(text, '(\\w+)@(\\w+)', false, true);
        const regex = /(\w+)@(\w+)/;
        const count = $replaceAllMatches(matches, map, '$2/$1', regex);
        expect(count).toBe(2);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('b/a and d/c');
    });
  });
});
