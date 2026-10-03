/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {TableExtension} from '@lexical/table';
import {defineExtension, type LexicalEditor} from 'lexical';
import {describe, expect, it, onTestFinished} from 'vitest';

import {
  getBaseOptions,
  getDynamicOptions,
} from '../../plugins/ComponentPickerPlugin';
import {PageBreakExtension} from '../../plugins/PageBreakExtension';
import {PageCounterNodesExtension} from '../../plugins/PagesExtension/PageCounterNodes';

const showModal = () => {};

function titles(editor: LexicalEditor): string[] {
  return getBaseOptions(editor, showModal).map(option => option.title);
}

describe('ComponentPicker options', () => {
  it('offers only what the editor registers', () => {
    const document = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RichTextExtension, TableExtension, PageBreakExtension],
        name: 'ComponentPickerOptions.document',
      }),
    );
    const header = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RichTextExtension, PageCounterNodesExtension],
        name: 'ComponentPickerOptions.header',
      }),
    );
    onTestFinished(() => {
      document.dispose();
      header.dispose();
    });

    const documentTitles = titles(document);
    expect(documentTitles).toContain('Page Break');
    expect(documentTitles).toContain('Table');
    expect(documentTitles).not.toContain('Page Number');
    expect(documentTitles).not.toContain('Image');
    expect(getDynamicOptions(document, '3x3')).toHaveLength(1);

    const headerTitles = titles(header);
    expect(headerTitles).toContain('Page Number');
    expect(headerTitles).toContain('Page Count');
    expect(headerTitles).toContain('Heading 1');
    expect(headerTitles).not.toContain('Page Break');
    expect(headerTitles).not.toContain('Table');
    expect(getDynamicOptions(header, '3x3')).toEqual([]);
  });
});
