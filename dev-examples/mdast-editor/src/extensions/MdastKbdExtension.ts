/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastExportHandler} from '@lexical/mdast';

import {
  $distributeInlineWrapper,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {MdastHtmlExtension, MdastImportExtension} from '@lexical/mdast';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  type LexicalCommand,
} from 'lexical';

import {$createKbdNode, $isKbdNode, KbdNode} from './KbdNode';

/* -------------------------------------------------------------------------- *
 * Import: one DOM rule serves Markdown (via MdastHtmlExtension) and HTML     *
 * paste alike                                                                *
 * -------------------------------------------------------------------------- */

const KbdImportRule = defineImportRule({
  $import: (ctx, el) => {
    if (!el.textContent && el.children.length === 0) {
      return [];
    }
    // The <a> pattern: wrap the imported inline run, lifting any block
    // descendants (pasted soup) to siblings instead of nesting them.
    return $distributeInlineWrapper(ctx.$importChildren(el), $createKbdNode);
  },
  match: sel.tag('kbd'),
  name: '@lexical/dev-mdast-editor-example/kbd',
});

/* -------------------------------------------------------------------------- *
 * Export: the inline counterpart of $exportViaDOM — the children serialize  *
 * as ordinary Markdown phrasing between the raw tags                        *
 * -------------------------------------------------------------------------- */

const $exportKbd: MdastExportHandler<KbdNode> = (node, ctx) => [
  {type: 'html', value: '<kbd>'},
  ...ctx.exportInline(node),
  {type: 'html', value: '</kbd>'},
];

/* -------------------------------------------------------------------------- *
 * The extension                                                              *
 * -------------------------------------------------------------------------- */

/**
 * Toggles a keyboard key at the selection: wraps the selected text in a
 * {@link KbdNode} (a placeholder key when the selection is collapsed), or
 * unwraps the key the caret is inside.
 */
export const FORMAT_KBD_COMMAND: LexicalCommand<void> =
  createCommand('FORMAT_KBD_COMMAND');

/**
 * Wires {@link KbdNode} into the Markdown pipeline as GitHub's
 * `<kbd>Ctrl</kbd>` inline-HTML idiom. Like the collapsible there is no
 * kbd-specific Markdown importer — the one DOM rule serves Markdown import
 * and HTML paste — but the export side differs by level: block constructs
 * derive their encoding from `exportDOM` via `$exportViaDOM`, while an
 * inline construct is a phrasing sequence, so the export rule emits the
 * raw open/close tags around the children serialized as ordinary Markdown
 * (`<kbd>**Ctrl**</kbd>` round-trips with the bold intact).
 */
export const MdastKbdExtension = defineExtension({
  dependencies: [
    MdastHtmlExtension,
    configExtension(DOMImportExtension, {
      rules: [KbdImportRule],
    }),
    configExtension(MdastImportExtension, {
      exportRules: [{$export: $exportKbd, type: 'kbd'}],
    }),
  ],
  name: '@lexical/dev-mdast-editor-example/MdastKbd',
  nodes: [KbdNode],
  register: editor =>
    editor.registerCommand(
      FORMAT_KBD_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const kbd = $findMatchingParent(selection.anchor.getNode(), $isKbdNode);
        if (kbd !== null) {
          // Toggle off: replace the key with its content.
          for (const child of kbd.getChildren()) {
            kbd.insertBefore(child);
          }
          kbd.remove();
          return true;
        }
        const text = selection.getTextContent();
        selection.insertNodes([
          $createKbdNode().append($createTextNode(text === '' ? 'Key' : text)),
        ]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
});
