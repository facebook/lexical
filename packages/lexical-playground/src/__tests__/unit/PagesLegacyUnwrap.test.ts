/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import {afterEach, describe, expect, it} from 'vitest';

import {
  $createPageNode,
  $setPageSetup,
  DEFAULT_PAGE_SETUP,
  PageContentNode,
  PageNode,
  PagesExtension,
} from '../../plugins/PagesExtension';

const editors: LexicalEditor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.setRootElement(null);
  }
});

function buildPagesEditor() {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension, PagesExtension],
      name: 'PagesLegacyUnwrap.test',
    }),
  );
  editors.push(editor);
  return editor;
}

/** An editor that still renders legacy page nodes, to produce old JSON. */
function buildLegacyEditor() {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension],
      name: 'PagesLegacyUnwrap.legacy',
      nodes: [PageNode, PageContentNode],
    }),
  );
  editors.push(editor);
  return editor;
}

function $populateLegacyDocument() {
  const root = $getRoot();
  root.clear();
  const page1 = $createPageNode();
  page1
    .getContentNode()
    .append(
      $createHeadingNode('h1').append($createTextNode('Foo')),
      $createParagraphNode().append($createTextNode('Hello world')),
    );
  const page2 = $createPageNode();
  page2
    .getContentNode()
    .append($createParagraphNode().append($createTextNode('Page two')));
  root.append(page1, page2);
  $setPageSetup(DEFAULT_PAGE_SETUP);
}

function $rootTypes() {
  return $getRoot()
    .getChildren()
    .map(node => node.getType());
}

describe('legacy PageNode unwrap', () => {
  it('flattens legacy pages created in an update', () => {
    const editor = buildPagesEditor();
    editor.update($populateLegacyDocument, {discrete: true});
    editor.read(() => {
      expect($rootTypes()).toEqual(['heading', 'paragraph', 'paragraph']);
      expect($getRoot().getTextContent()).toBe(
        'Foo\n\nHello world\n\nPage two',
      );
    });
  });

  it('flattens legacy pages loaded from serialized JSON', () => {
    const legacy = buildLegacyEditor();
    legacy.update($populateLegacyDocument, {discrete: true});
    const json = JSON.stringify(legacy.getEditorState().toJSON());
    expect(json).toContain('"type":"page"');
    expect(json).toContain('"type":"page-content"');

    const editor = buildPagesEditor();
    editor.setEditorState(editor.parseEditorState(json));
    editor.read(() => {
      expect($rootTypes()).toEqual(['heading', 'paragraph', 'paragraph']);
    });
    const flat = JSON.stringify(editor.getEditorState().toJSON());
    expect(flat).not.toContain('"type":"page"');
    expect(flat).not.toContain('"type":"page-content"');
    // The page setup survives on the root
    expect(flat).toContain('"pageSetup"');
  });

  it('leaves a paragraph behind when the only page was empty', () => {
    const editor = buildPagesEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createPageNode());
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($rootTypes()).toEqual(['paragraph']);
    });
  });
});
