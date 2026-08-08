/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
} from '@lexical/html';
import {$patchStyleText} from '@lexical/selection';
import {
  $createParagraphNode,
  $getRoot,
  $insertNodes,
  $isElementNode,
  $selectAll,
  $setSelection,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, it} from 'vitest';

import {$createMentionNode, $isMentionNode} from '../../src/nodes/MentionNode';
import {PlaygroundImportExtension} from '../../src/nodes/PlaygroundImportExtension';
import {MentionsExtension} from '../../src/plugins/MentionsExtension';

const MentionTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [PlaygroundImportExtension, MentionsExtension],
  name: '[test]',
});

function $findFirst(
  predicate: (node: LexicalNode) => boolean,
): LexicalNode | null {
  const stack: LexicalNode[] = [...$getRoot().getChildren()];
  while (stack.length > 0) {
    const node = stack.shift()!;
    if (predicate(node)) {
      return node;
    }
    if ($isElementNode(node)) {
      stack.push(...node.getChildren());
    }
  }
  return null;
}

/**
 * Insert a mention, then apply `$patchStyleText` / `formatText` to the whole
 * document the way the playground toolbar's font-size dropdown and format
 * buttons do, and return the HTML the editor exports.
 */
function exportMentionHtml(
  patch: Record<string, string> | null,
  formats: readonly ('bold' | 'italic' | 'underline' | 'strikethrough')[],
): string {
  using editor = buildEditorFromExtensions(MentionTestExtension);
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      $getRoot().clear().append(paragraph);
      paragraph.selectStart();
      $insertNodes([$createMentionNode('Luke Skywalker')]);
      const selection = $selectAll();
      if (patch !== null) {
        $patchStyleText(selection, patch);
      }
      for (const format of formats) {
        selection.formatText(format);
      }
      $setSelection(null);
    },
    {discrete: true},
  );
  return editor.read(() => $generateHtmlFromNodes(editor, null));
}

describe('MentionNode HTML export', () => {
  // Control: this passes with and without the exportDOM fix, and guards the
  // markup the `span[data-lexical-mention]` import rule matches on.
  it('exports a plain mention as a data-lexical-mention span', () => {
    expectHtmlToBeEqual(
      exportMentionHtml(null, []),
      html`
        <p><span data-lexical-mention="true">Luke Skywalker</span></p>
      `,
    );
  });

  it('exports the font-size applied to a mention (#6453)', () => {
    expectHtmlToBeEqual(
      exportMentionHtml({'font-size': '20px'}, []),
      html`
        <p>
          <span style="font-size: 20px;" data-lexical-mention="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
  });

  it('exports the text formats applied to a mention (#6453)', () => {
    expectHtmlToBeEqual(
      exportMentionHtml(null, ['bold', 'italic', 'underline']),
      html`
        <p>
          <u>
            <i>
              <b><span data-lexical-mention="true">Luke Skywalker</span></b>
            </i>
          </u>
        </p>
      `,
    );
  });

  // Control: passes with and without the exportDOM fix. It pins down that the
  // format wrappers added around the mention span do not stop the
  // `span[data-lexical-mention]` import rule from recognizing it again.
  it('still imports a formatted mention back as a MentionNode', () => {
    using editor = buildEditorFromExtensions(MentionTestExtension);
    const htmlString = exportMentionHtml({'font-size': '20px'}, ['bold']);
    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(htmlString, 'text/html');
        $insertNodes($generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );
    editor.read(() => {
      const node = $findFirst($isMentionNode);
      assert($isMentionNode(node), 'expected a MentionNode');
      expect(node.getTextContent()).toBe('Luke Skywalker');
    });
  });
});
