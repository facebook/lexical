/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$generateNodesFromDOMViaExtension} from '@lexical/html';
import {$dfs} from '@lexical/utils';
import {
  $getRoot,
  $insertNodes,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {$isDateTimeNode} from '../../src/nodes/DateTimeNode/DateTimeNode';
import {PlaygroundImportExtension} from '../../src/nodes/PlaygroundImportExtension';
import {DateTimeExtension} from '../../src/plugins/DateTimeExtension';

const DateTimeImportTestExtension = /* @__PURE__ */ defineExtension({
  $initialEditorState: null,
  dependencies: [PlaygroundImportExtension, DateTimeExtension],
  name: '[test-datetime-import]',
});

type ImportResult = {
  hasDateTimeNode: boolean;
  serializes: boolean;
  text: string;
};

function importHtml(html: string): ImportResult {
  using editor: LexicalEditor & Disposable = buildEditorFromExtensions(
    DateTimeImportTestExtension,
  );
  editor.update(
    () => {
      $getRoot().clear().select();
      const dom = new DOMParser().parseFromString(html, 'text/html');
      $insertNodes($generateNodesFromDOMViaExtension(dom));
    },
    {discrete: true},
  );

  let serializes = true;
  try {
    editor.getEditorState().toJSON();
  } catch {
    serializes = false;
  }

  return editor.read(() => ({
    hasDateTimeNode: $dfs().some(({node}) => $isDateTimeNode(node)),
    serializes,
    text: $getRoot().getTextContent(),
  }));
}

describe('DateTime HTML import', () => {
  it('keeps the element content when the date cannot be parsed', () => {
    const result = importHtml(
      '<p><span data-lexical-datetime="not a date">some text</span></p>',
    );

    expect(result.hasDateTimeNode).toBe(false);
    expect(result.text).toBe('some text');
    expect(result.serializes).toBe(true);
  });

  it('still imports a parseable date', () => {
    const result = importHtml(
      '<p><span data-lexical-datetime="2026-05-29T00:00:00.000Z">May 29</span></p>',
    );

    expect(result.hasDateTimeNode).toBe(true);
    expect(result.serializes).toBe(true);
  });

  it('matches how the Google Docs rule already handles an unparseable date', () => {
    const result = importHtml(
      '<p><span data-rich-links=\'{"type":"date","dat_df":{"dfie_dt":"nope"}}\'>gd text</span></p>',
    );

    expect(result.hasDateTimeNode).toBe(false);
    expect(result.text).toBe('gd text');
    expect(result.serializes).toBe(true);
  });
});
