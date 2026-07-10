/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  defineImportRule,
  DOMImportExtension,
  domOverride,
  DOMRenderExtension,
  sel,
} from '@lexical/html';
import {
  $exportViaDOM,
  MdastHtmlExtension,
  MdastImportExtension,
} from '@lexical/mdast';
import {$insertNodeToNearestRoot, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $getSlot,
  $getSlotFrame,
  $getSlotHost,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  configExtension,
  createCommand,
  defineExtension,
  type ElementNode,
  INSERT_PARAGRAPH_COMMAND,
  isHTMLElement,
  type LexicalCommand,
  type LexicalNode,
} from 'lexical';

import {
  $createCollapsibleNode,
  $isCollapsibleNode,
  CollapsibleNode,
} from './CollapsibleNode';

/* -------------------------------------------------------------------------- *
 * Import: one DOM rule serves Markdown (via MdastHtmlExtension) and HTML     *
 * paste alike                                                                *
 * -------------------------------------------------------------------------- */

/** Appends `nodes` to `target` flattened to inline content (a single-line
 * field): block elements contribute their children, block decorators and
 * line breaks are dropped. */
function $appendInline(target: ElementNode, nodes: LexicalNode[]): void {
  for (const node of nodes) {
    if ($isElementNode(node) && !node.isInline()) {
      $appendInline(target, node.getChildren());
    } else if (
      !$isLineBreakNode(node) &&
      !($isDecoratorNode(node) && !node.isInline())
    ) {
      target.append(node);
    }
  }
}

/** Wraps stray inline runs in paragraphs so the result is block-level,
 * dropping whitespace-only runs (formatting whitespace between the raw
 * HTML tags). */
function $wrapInlineInBlocks(nodes: LexicalNode[]): LexicalNode[] {
  const blocks: LexicalNode[] = [];
  let pending: LexicalNode[] = [];
  const flushPending = () => {
    const significant = pending.some(
      node => !($isTextNode(node) && node.getTextContent().trim() === ''),
    );
    if (significant) {
      blocks.push($createParagraphNode().append(...pending));
    }
    pending = [];
  };
  for (const node of nodes) {
    if (($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline()) {
      flushPending();
      blocks.push(node);
    } else {
      pending.push(node);
    }
  }
  flushPending();
  return blocks;
}

const DetailsImportRule = defineImportRule({
  $import: (ctx, el) => {
    const collapsible = $createCollapsibleNode(el.hasAttribute('open'));
    // Drop the seeded body paragraph; imported content replaces it (and the
    // node-level transform re-seeds one if the body came out empty).
    collapsible.clear();
    const summary = $getSlot(collapsible, 'summary');
    const body: LexicalNode[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (isHTMLElement(child) && child.tagName === 'SUMMARY') {
        if ($isElementNode(summary)) {
          $appendInline(summary, ctx.$importChildren(child));
        }
      } else {
        body.push(...ctx.$importOne(child));
      }
    }
    return [collapsible.append(...$wrapInlineInBlocks(body))];
  },
  match: sel.tag('details'),
  name: '@lexical/dev-mdast-editor-example/details',
});

/* -------------------------------------------------------------------------- *
 * The extension                                                              *
 * -------------------------------------------------------------------------- */

export const INSERT_COLLAPSIBLE_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_COLLAPSIBLE_COMMAND',
);

// Enter inside the summary slot is a core no-op (the slot value is a bare
// paragraph, a single-line field); map it to "open the section and move the
// caret to the body", mirroring how the playground's collapsible treats
// Enter in its title.
function $handleSummaryEnter(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }
  const frame = $getSlotFrame(selection.anchor.getNode());
  if (frame === null) {
    return false;
  }
  const host = $getSlotHost(frame);
  if (!$isCollapsibleNode(host)) {
    return false;
  }
  host.setOpen(true);
  const firstBlock = host.getFirstChild();
  if ($isElementNode(firstBlock)) {
    firstBlock.selectStart();
  }
  return true;
}

/**
 * Wires {@link CollapsibleNode} into the Markdown pipeline using the
 * GFM-style `<details><summary>…</summary>…</details>` encoding, with
 * Markdown syntax inside the construct working in both directions the way
 * it does on GitHub. There is no details-specific Markdown importer or
 * serializer: {@link MdastHtmlExtension} routes raw HTML blocks (and the
 * Markdown text inside them) through the editor's DOM import rules, so the
 * one `<details>` rule here serves Markdown import and HTML paste alike,
 * and `$exportViaDOM` derives the Markdown encoding from the node's own
 * `exportDOM` shell — the summary phrasing and body blocks embed as
 * ordinary Markdown between the raw tags.
 *
 * The summary line is edited in the node's named `summary` slot, revealed
 * in-lexical with a `$getSlotTargetElement` render override (the Card
 * pattern from the playground — no React chrome).
 */
export const MdastCollapsibleExtension = defineExtension({
  dependencies: [
    MdastHtmlExtension,
    configExtension(DOMImportExtension, {
      rules: [DetailsImportRule],
    }),
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([CollapsibleNode], {
          $getSlotTargetElement: (_node, _slotName, hostDom) =>
            hostDom.querySelector<HTMLElement>(
              ':scope > .collapsible-summary-row',
            ),
        }),
      ],
    }),
    configExtension(MdastImportExtension, {
      // Export is fully generic: $exportViaDOM renders CollapsibleNode's own
      // exportDOM shell and embeds the summary slot and body children as
      // Markdown — no construct-specific serialization at all.
      exportRules: [{$export: $exportViaDOM, type: 'collapsible'}],
    }),
  ],
  name: '@lexical/dev-mdast-editor-example/MdastCollapsible',
  nodes: [CollapsibleNode],
  register: editor =>
    mergeRegister(
      editor.registerCommand(
        INSERT_COLLAPSIBLE_COMMAND,
        () => {
          const collapsible = $createCollapsibleNode();
          $insertNodeToNearestRoot(collapsible);
          const summary = $getSlot(collapsible, 'summary');
          if ($isElementNode(summary)) {
            summary.selectStart();
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        $handleSummaryEnter,
        COMMAND_PRIORITY_LOW,
      ),
    ),
});
