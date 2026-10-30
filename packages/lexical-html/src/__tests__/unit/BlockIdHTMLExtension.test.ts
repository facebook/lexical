/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getBlockId,
  $isRootChildBlock,
  BlockIdExtension,
  buildEditorFromExtensions,
  configExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $generateDOMFromNodes,
  $generateHtmlFromNodes,
  DOMImportExtension,
} from '@lexical/html';
import {
  type BlockIdHTMLConfig,
  BlockIdHTMLExtension,
} from '@lexical/html/BlockIdHTMLExtension';
import {ListExtension} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
  $isElementNode,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function counter(prefix = 'b') {
  let n = 0;
  return () => `${prefix}${++n}`;
}

/**
 * The first content an empty editor gets is a load, so its blocks get
 * positional ids (tested on their own). These tests are about edits, so their
 * editors have had content once and the first blocks they add get ids from
 * `generateId`.
 */
function asEdited<T extends LexicalEditor>(editor: T): T {
  const options = {discrete: true, tag: HISTORY_MERGE_TAG} as const;
  editor.update(() => {
    $getRoot().append($createParagraphNode());
  }, options);
  editor.update(() => {
    $getRoot().clear();
  }, options);
  return editor;
}

function build(
  options: {
    /** Skip {@link asEdited}: the first content the editor gets is a load. */
    fresh?: boolean;
    html?: false | Partial<BlockIdHTMLConfig>;
    prefix?: string;
    /** Identify the root's children only. */
    rootOnly?: boolean;
  } = {},
): LexicalEditorWithDispose {
  return (
    options.fresh ? (editor: LexicalEditorWithDispose) => editor : asEdited
  )(
    buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [
        RichTextExtension,
        ListExtension,
        configExtension(BlockIdExtension, {
          generateId: counter(options.prefix),
          ...(options.rootOnly ? {$isIdentifiedBlock: $isRootChildBlock} : {}),
        }),
        ...(options.html === false
          ? []
          : [configExtension(BlockIdHTMLExtension, options.html || {})]),
      ],
      name: '[block-id-html]',
    }),
  );
}

/**
 * Parses a fixed HTML fixture. Tests never build markup from strings they
 * did not write: documents that carry other input (an exported document, an
 * attribute value) are built with DOM APIs.
 */
function parseFixture(fixture: string): Document {
  return new DOMParser().parseFromString(fixture, 'text/html');
}

/** A document whose body holds one `<p>` per entry, built with DOM APIs. */
function paragraphsDocument(
  entries: {id: string | null; tag?: string; text: string}[],
): Document {
  const doc = document.implementation.createHTMLDocument('');
  for (const {id, tag = 'p', text} of entries) {
    const element = doc.createElement(tag);
    if (id !== null) {
      element.setAttribute('data-block-id', id);
    }
    element.textContent = text;
    doc.body.append(element);
  }
  return doc;
}

function append(editor: LexicalEditor, dom: Document): void {
  editor.update(
    () =>
      $getRoot().append(
        ...getExtensionDependencyFromEditor(
          $getEditor(),
          DOMImportExtension,
        ).output.$generateNodesFromDOM(dom),
      ),
    {discrete: true},
  );
}

/** The editor's content exported as a DOM document (no HTML string). */
function exportDocument(editor: LexicalEditor): Document {
  const doc = document.implementation.createHTMLDocument('');
  editor.read(() => $generateDOMFromNodes(doc.body, null, editor));
  return doc;
}

function exportHTML(editor: LexicalEditor): string {
  return editor.read(() => $generateHtmlFromNodes(editor));
}

function tree(editor: LexicalEditor): string[] {
  return editor.read(() => {
    const out: string[] = [];
    const walk = (node: LexicalNode) => {
      if ($isElementNode(node)) {
        if (node.getType() !== 'root') {
          out.push(`${node.getType()}:${$getBlockId(node)}`);
        }
        node.getChildren().forEach(walk);
      }
    };
    walk($getRoot());
    return out;
  });
}

describe('BlockIdHTMLExtension', () => {
  test('without it, HTML carries no ids', () => {
    using editor = build({html: false});
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('one')),
        );
      },
      {discrete: true},
    );
    expect(exportHTML(editor)).not.toContain('data-block-id');
  });

  test('exports data-block-id on identified blocks only', () => {
    using editor = build();
    append(
      editor,
      parseFixture('<h1>Title</h1><p>Text</p><ul><li>a</li><li>b</li></ul>'),
    );
    expect(tree(editor)).toEqual([
      'heading:b1',
      'paragraph:b2',
      'list:b3',
      'listitem:b4',
      'listitem:b5',
    ]);
    expect(exportHTML(editor)).toBe(
      [
        '<h1 data-block-id="b1"><span style="white-space: pre-wrap;">Title</span></h1>',
        '<p data-block-id="b2"><span style="white-space: pre-wrap;">Text</span></p>',
        '<ul data-block-id="b3">',
        '<li value="1" data-block-id="b4"><span style="white-space: pre-wrap;">a</span></li>',
        '<li value="2" data-block-id="b5"><span style="white-space: pre-wrap;">b</span></li>',
        '</ul>',
      ].join(''),
    );
  });

  test('a root-only predicate exports no list item ids', () => {
    using editor = build({rootOnly: true});
    append(editor, parseFixture('<ul><li>a</li><li>b</li></ul>'));
    expect(tree(editor)).toEqual(['list:b1', 'listitem:null', 'listitem:null']);
    expect(exportHTML(editor)).toBe(
      [
        '<ul data-block-id="b1">',
        '<li value="1"><span style="white-space: pre-wrap;">a</span></li>',
        '<li value="2"><span style="white-space: pre-wrap;">b</span></li>',
        '</ul>',
      ].join(''),
    );
  });

  test('round-trips ids through HTML', () => {
    using source = build({prefix: 's'});
    append(
      source,
      parseFixture(
        '<h2>Title</h2><p>Text</p><ul><li>a</li></ul><blockquote>q</blockquote>',
      ),
    );
    const exported = exportDocument(source);
    expect(exported.querySelectorAll('[data-block-id]')).toHaveLength(5);
    using target = build({prefix: 't'});
    append(target, exported);
    expect(tree(target)).toEqual(tree(source));
    expect(tree(target)).toEqual([
      'heading:s1',
      'paragraph:s2',
      'list:s3',
      'listitem:s4',
      'quote:s5',
    ]);
  });

  test('imported ids pass through the uniqueness rule', () => {
    using editor = build();
    append(editor, parseFixture('<p>existing</p>'));
    const [existing] = tree(editor);
    const existingId = existing.slice(existing.indexOf(':') + 1);
    append(
      editor,
      paragraphsDocument([
        {id: 'x', text: 'first x'},
        {id: 'x', text: 'second x'},
        {id: existingId, text: 'clashes with the document'},
        {id: 'kept', tag: 'h3', text: 'kept'},
      ]),
    );
    const after = tree(editor);
    expect(after[0]).toBe(existing);
    expect(after[1]).toBe('paragraph:x');
    expect(after[4]).toBe('heading:kept');
    const ids = after.map(entry => entry.slice(entry.indexOf(':') + 1));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('invalid imported ids are ignored; valid foreign ids are kept', () => {
    using editor = build();
    const invalid = ['', 'z'.repeat(65), 'a b', 'line\nbreak', '"><x', 'é'];
    append(
      editor,
      paragraphsDocument([
        ...invalid.map(id => ({id, text: 'invalid'})),
        {id: 'y'.repeat(64), text: 'longest valid'},
        {id: 'bk3j9x0a2zq', text: 'an 11-character id'},
      ]),
    );
    const ids = tree(editor).map(entry => entry.slice(entry.indexOf(':') + 1));
    expect(ids.slice(-2)).toEqual(['y'.repeat(64), 'bk3j9x0a2zq']);
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
      expect(invalid).not.toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('an imported id is dropped from a block that is not identified', () => {
    using editor = build();
    append(
      editor,
      parseFixture(
        '<ul data-block-id="outer"><li data-block-id="item">a' +
          '<ul data-block-id="nested"><li>b</li></ul></li></ul>',
      ),
    );
    const outline = tree(editor);
    expect(outline[0]).toBe('list:outer');
    expect(outline[1]).toBe('listitem:item');
    // The nested list is not identified: it keeps no id.
    expect(outline).toContain('list:null');
    expect(JSON.stringify(editor.getEditorState().toJSON())).not.toContain(
      '"nested"',
    );
  });

  test('export into a document of another realm writes the attribute', () => {
    using editor = build();
    append(editor, parseFixture('<p>x</p>'));
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const doc = iframe.contentDocument!;
    expect(doc.defaultView).not.toBe(window);
    editor.read(() => $generateDOMFromNodes(doc.body, null, editor));
    expect(doc.body.querySelector('p')!.getAttribute('data-block-id')).toBe(
      editor.read(() => $getBlockId($getRoot().getFirstChildOrThrow())),
    );
    iframe.remove();
  });

  test('import: false ignores the attribute; export: false omits it', () => {
    using editor = build({html: {export: false, import: false}});
    append(editor, parseFixture('<p data-block-id="from-html">a</p>'));
    expect(tree(editor)).toEqual(['paragraph:b1']);
    expect(exportHTML(editor)).not.toContain('data-block-id');
  });
});

describe('BlockIdHTMLExtension: documents read without ids', () => {
  test('every reader exports the same data-block-id for a document stored without ids', () => {
    const html: string[][] = [];
    for (const prefix of ['x', 'y']) {
      using editor = build({fresh: true, prefix});
      // The first content of an empty editor is a load: positional ids, not
      // `generateId`'s.
      append(
        editor,
        paragraphsDocument([
          {id: null, text: 'one'},
          {id: null, tag: 'h2', text: 'two'},
        ]),
      );
      html.push(
        Array.from(
          exportDocument(editor).querySelectorAll('[data-block-id]'),
          element => element.getAttribute('data-block-id')!,
        ),
      );
      expect(
        editor.read(() => $getRoot().getChildren().map($getBlockId)),
      ).toEqual(html[html.length - 1]);
    }
    expect(html[0]).toEqual(html[1]);
    for (const id of html[0]) {
      expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    }
  });
});
