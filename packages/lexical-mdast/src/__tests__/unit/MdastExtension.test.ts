/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getExtensionOutput,
  buildEditorFromExtensions,
} from '@lexical/extension';
import {ListNode} from '@lexical/list';
import {$isHeadingNode, HeadingNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  defineExtension,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExportExtension,
  MdastExtension,
  MdastHeadingExtension,
  MdastImportExtension,
  MdastListExtension,
  MdastShortcutsExtension,
} from '../../index';
import {$assertNodeType} from './utils';

describe('@lexical/mdast extensions', () => {
  it('feature extensions ship the nodes their rules need', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastCommonMarkExtension, MdastExportExtension],
        name: '[root]',
      }),
    );
    expect(editor.hasNode(HeadingNode)).toBe(true);
    expect(editor.hasNode(ListNode)).toBe(true);

    editor.update(
      () => {
        $convertFromMarkdownString('# Title\n\n- a\n- b');
      },
      {discrete: true},
    );
    const out = editor.read(() => $convertToMarkdownString());
    expect(out).toBe('# Title\n\n- a\n- b');
  });

  it('exposes the Markdown API through extension outputs', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastCommonMarkExtension, MdastExportExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $getExtensionOutput(MdastImportExtension).$convertFromMarkdownString(
          '## Hi',
        );
      },
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $getExtensionOutput(MdastExportExtension).$convertToMarkdownString(),
      ),
    ).toBe('## Hi');
  });

  it('MdastExtension bundles import and export', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastCommonMarkExtension, MdastExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $convertFromMarkdownString('# Both directions');
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      '# Both directions',
    );
  });

  it('wires up streaming shortcuts via MdastShortcutsExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastHeadingExtension, MdastShortcutsExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    for (const chunk of ['#', ' ']) {
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(chunk);
          }
        },
        {discrete: true},
      );
    }
    editor.read(() => {
      $assertNodeType($getRoot().getFirstChild(), $isHeadingNode);
    });
  });

  it('block shortcuts only fire for features in the editor', () => {
    // Lists but no headings: `# ` must stay literal text instead of
    // materializing an unregistered HeadingNode.
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastListExtension, MdastShortcutsExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    for (const chunk of ['#', ' ']) {
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(chunk);
          }
        },
        {discrete: true},
      );
    }
    editor.read(() => {
      const first = $assertNodeType(
        $getRoot().getFirstChild(),
        $isParagraphNode,
      );
      expect(first.getTextContent()).toBe('# ');
    });
  });
});
