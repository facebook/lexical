/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getBlockById,
  $getBlockHandle,
  $getBlockId,
  $isRootChildBlock,
  $resolveBlockHandle,
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
  BLOCK_HANDLE_ATTRIBUTE,
  BLOCK_ID_ATTRIBUTE,
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
import {assert, describe, expect, test} from 'vitest';

function counter(prefix = 'b') {
  let n = 0;
  return () => `${prefix}${++n}`;
}

function withIds(ids: string[], then: () => string): () => string {
  let i = 0;
  return () => (i < ids.length ? ids[i++] : then());
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
    /** Ids that `generateId` hands out first, before the counter. */
    ids?: string[];
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
          generateId: withIds(options.ids || [], counter(options.prefix)),
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

describe("BlockIdHTMLExtension: export: 'handle'", () => {
  const IDS = [
    'V1StGXR8_Z5jdHi6B-myT',
    '9xQeLm2Pq0aK7cTb_wYuA',
    'Rk8pZc41Uo-HsVd2NnFjB',
    'V1StQ9mWc0-bE3rT7yLpA',
    'u7NnPz2Kq0aK7cTb_wYuA',
  ];

  test('exports data-block-handle instead of data-block-id', () => {
    using editor = build({html: {export: 'handle'}, ids: IDS});
    append(
      editor,
      parseFixture(
        '<h2>Q3 plan</h2><p>Revenue grew 4% in Q3.</p><ul><li>a</li><li>b</li></ul>',
      ),
    );
    expect(exportHTML(editor)).toBe(
      [
        '<h2 data-block-handle="V1StG"><span style="white-space: pre-wrap;">Q3 plan</span></h2>',
        '<p data-block-handle="9xQe"><span style="white-space: pre-wrap;">Revenue grew 4% in Q3.</span></p>',
        '<ul data-block-handle="Rk8p">',
        '<li value="1" data-block-handle="V1StQ"><span style="white-space: pre-wrap;">a</span></li>',
        '<li value="2" data-block-handle="u7Nn"><span style="white-space: pre-wrap;">b</span></li>',
        '</ul>',
      ].join(''),
    );
    expect(BLOCK_HANDLE_ATTRIBUTE).toBe('data-block-handle');
    expect(BLOCK_ID_ATTRIBUTE).toBe('data-block-id');
  });

  test('export: true and export: false are unchanged', () => {
    const fixture =
      '<h2>Q3 plan</h2><p>Revenue grew 4% in Q3.</p><ul><li>a</li><li>b</li></ul>';
    const html: Record<string, string> = {};
    for (const [name, config] of [
      ['default', {}],
      ['true', {export: true}],
      ['false', {export: false}],
      ['without', false],
    ] as const) {
      using editor = build({html: config, ids: IDS});
      append(editor, parseFixture(fixture));
      html[name] = exportHTML(editor);
    }
    expect(html.true).toBe(html.default);
    expect(html.true).toBe(
      [
        '<h2 data-block-id="V1StGXR8_Z5jdHi6B-myT"><span style="white-space: pre-wrap;">Q3 plan</span></h2>',
        '<p data-block-id="9xQeLm2Pq0aK7cTb_wYuA"><span style="white-space: pre-wrap;">Revenue grew 4% in Q3.</span></p>',
        '<ul data-block-id="Rk8pZc41Uo-HsVd2NnFjB">',
        '<li value="1" data-block-id="V1StQ9mWc0-bE3rT7yLpA"><span style="white-space: pre-wrap;">a</span></li>',
        '<li value="2" data-block-id="u7NnPz2Kq0aK7cTb_wYuA"><span style="white-space: pre-wrap;">b</span></li>',
        '</ul>',
      ].join(''),
    );
    expect(html.false).toBe(html.without);
    expect(html.false).not.toContain('data-block');
  });

  test('import never reads data-block-handle as an id', () => {
    using editor = build({ids: ['abcdEFGH', 'V1StGXR8_Z5jdHi6B-myT']});
    append(editor, parseFixture('<p>existing</p>'));
    expect(tree(editor)).toEqual(['paragraph:abcdEFGH']);
    append(
      editor,
      parseFixture(
        // A handle of a block of this document, a handle that looks like a
        // whole id, and a handle next to a real id.
        '<p data-block-handle="abcd">handle of existing</p>' +
          '<p data-block-handle="kept-if-read-as-id">no id</p>' +
          '<h3 data-block-handle="zzzz" data-block-id="real-id">with id</h3>',
      ),
    );
    expect(tree(editor)).toEqual([
      'paragraph:abcdEFGH',
      'paragraph:V1StGXR8_Z5jdHi6B-myT',
      'paragraph:b1',
      'heading:real-id',
    ]);
    // With the import on, as by default, and an export of handles.
    using handles = build({html: {export: 'handle'}});
    append(handles, parseFixture('<p data-block-handle="from-html">a</p>'));
    expect(tree(handles)).toEqual(['paragraph:b1']);
  });

  test('round trip: export handles, edit by handle, resolve', () => {
    using editor = build({html: {export: 'handle'}, ids: IDS});
    append(
      editor,
      parseFixture(
        '<h2>Q3 plan</h2><p>Revenue grew 4% in Q3.</p><p>Hiring is on track.</p>',
      ),
    );
    // 1. What the model reads.
    const exported = exportDocument(editor);
    const elements = Array.from(
      exported.querySelectorAll(`[${BLOCK_HANDLE_ATTRIBUTE}]`),
    );
    expect(exported.querySelectorAll(`[${BLOCK_ID_ATTRIBUTE}]`)).toHaveLength(
      0,
    );
    expect(
      elements.map(element => element.getAttribute(BLOCK_HANDLE_ATTRIBUTE)),
    ).toEqual(['V1St', '9xQe', 'Rk8p']);
    // 2. What the model answers.
    const revenue = elements.find(element =>
      element.textContent!.startsWith('Revenue'),
    )!;
    const ops = [
      {
        block: revenue.getAttribute(BLOCK_HANDLE_ATTRIBUTE)!,
        op: 'replace',
        text: 'Revenue grew 6%.',
      },
      {block: '9xQf', op: 'replace', text: 'a typo'},
      {block: 'Rk8p', op: 'delete', text: ''},
    ];
    // 3. Applied by the app, one update per operation.
    const statuses: string[] = [];
    for (const op of ops) {
      editor.update(
        () => {
          const result = $resolveBlockHandle(op.block);
          statuses.push(result.status);
          if (result.status !== 'found') {
            return;
          }
          if (op.op === 'delete') {
            result.node.remove();
          } else {
            result.node.replace(
              $createParagraphNode().append($createTextNode(op.text)),
            );
          }
        },
        {discrete: true},
      );
    }
    expect(statuses).toEqual(['found', 'not-found', 'found']);
    editor.read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map(node => [$getBlockHandle(node), node.getTextContent()]),
      ).toEqual([
        ['V1St', 'Q3 plan'],
        ['9xQe', 'Revenue grew 6%.'],
      ]);
      // The replacement kept the id that the handle was derived from.
      const block = $getBlockById(IDS[1]);
      assert(block !== null);
      expect(block.getTextContent()).toBe('Revenue grew 6%.');
    });
    expect(exportHTML(editor)).toBe(
      [
        '<h2 data-block-handle="V1St"><span style="white-space: pre-wrap;">Q3 plan</span></h2>',
        '<p data-block-handle="9xQe"><span style="white-space: pre-wrap;">Revenue grew 6%.</span></p>',
      ].join(''),
    );
  });
});
