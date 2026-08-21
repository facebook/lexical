/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {createBinding, createYjsBinding, type Provider} from '@lexical/yjs';
import {defineExtension} from 'lexical';
import {describe, expect, test} from 'vitest';
import {Doc, XmlText} from 'yjs';

import {type CollabElementNode} from '../../CollabElementNode';

function getRootXmlText(root: CollabElementNode): XmlText {
  return (root as unknown as {_xmlText: XmlText})._xmlText;
}

function createTestDoc(): {doc: Doc; docMap: Map<string, Doc>} {
  const doc = new Doc();
  return {doc, docMap: new Map<string, Doc>([['test', doc]])};
}

describe('createYjsBinding', () => {
  test('uses default rootName "root"', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({name: 'yjs-binding-test'}),
    );
    const {doc, docMap} = createTestDoc();

    const binding = createYjsBinding({doc, docMap, editor, id: 'test'});

    expect(binding.root).toBeDefined();
    expect(doc.get('root', XmlText)).toBe(getRootXmlText(binding.root));
  });

  test('uses custom rootName', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({name: 'yjs-binding-test'}),
    );
    const {doc, docMap} = createTestDoc();

    const binding = createYjsBinding({
      doc,
      docMap,
      editor,
      id: 'test',
      rootName: 'customRoot',
    });

    expect(binding.root).toBeDefined();
    expect(doc.get('customRoot', XmlText)).toBe(getRootXmlText(binding.root));
    expect(doc.share.has('root')).toBe(false);
  });

  test('different rootNames create independent shared types', () => {
    using editor1 = buildEditorFromExtensions(
      defineExtension({name: 'yjs-binding-test-a'}),
    );
    using editor2 = buildEditorFromExtensions(
      defineExtension({name: 'yjs-binding-test-b'}),
    );
    const {doc, docMap} = createTestDoc();

    const binding1 = createYjsBinding({
      doc,
      docMap,
      editor: editor1,
      id: 'test',
      rootName: 'editor-a',
    });

    const binding2 = createYjsBinding({
      doc,
      docMap,
      editor: editor2,
      id: 'test',
      rootName: 'editor-b',
    });

    const xmlA = getRootXmlText(binding1.root);
    const xmlB = getRootXmlText(binding2.root);
    expect(xmlA).not.toBe(xmlB);
    expect(doc.get('editor-a', XmlText)).toBe(xmlA);
    expect(doc.get('editor-b', XmlText)).toBe(xmlB);
  });
});

describe('createBinding (legacy wrapper)', () => {
  test('delegates to createYjsBinding with default rootName', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({name: 'yjs-binding-legacy'}),
    );
    const {doc, docMap} = createTestDoc();

    const binding = createBinding(
      editor,
      null as unknown as Provider,
      'test',
      doc,
      docMap,
    );

    expect(binding.root).toBeDefined();
    expect(doc.get('root', XmlText)).toBe(getRootXmlText(binding.root));
  });

  test('throws invariant when doc is null', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({name: 'yjs-binding-legacy'}),
    );
    const docMap = new Map<string, Doc>();

    expect(() =>
      createBinding(editor, null as unknown as Provider, 'test', null, docMap),
    ).toThrow('createBinding: doc is null or undefined');
  });
});
