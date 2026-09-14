/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isBlockLevel,
  $propagateTextAlignToBlockChildren,
  type ChildSchema,
  defineImportRule,
  type DOMImportContext,
  isElementOfTag,
  sel,
} from '@lexical/html';
import {
  $createLineBreakNode,
  $isBlockElementNode,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $setDirectionFromDOM,
  $setFormatFromDOM,
  type LexicalNode,
} from 'lexical';

import {
  $createListItemNode,
  $isListItemNode,
  type ListItemNode,
} from './LexicalListItemNode';
import {$createListNode, $isListNode, type ListNode} from './LexicalListNode';

/**
 * Mirrors the legacy `isDomChecklist` heuristic from
 * `@lexical/list`.
 */
function isDomChecklist(domNode: HTMLElement): boolean {
  return (
    domNode.matches(
      '[__lexicallisttype="check"], .contains-task-list, [data-is-checklist="1"]',
    ) || domNode.querySelector(':scope > [aria-checked]') !== null
  );
}

/**
 * True for a block that its children cannot leave — a `TableNode`, say.
 * Unwrapping it the way {@link $flattenListItemBlocks} unwraps a paragraph
 * would orphan them, so it is hoisted out of the list instead.
 */
function $isStructuralBlock(node: LexicalNode): boolean {
  return $isBlockElementNode(node) && node.isShadowRoot();
}

/** `hoisted` nodes are emitted by the caller as siblings of the list. */
interface NormalizedListChildren {
  hoisted: LexicalNode[];
  items: ListItemNode[];
}

/**
 * Lift nested `ListNode`s out of `ListItemNode`s into sibling
 * `ListItemNode`s (the legacy `$normalizeChildren` shape). Also wraps any
 * non-`ListItemNode` children in a new `ListItemNode`, and hoists
 * {@link $isStructuralBlock} children out of the list entirely.
 *
 * The wrapper items come from `listNode.createListItemNode()` — the same
 * subclass hook the legacy `$normalizeChildren` uses — so a `ListNode`
 * subclass gets its own item type here too.
 */
function $normalizeListChildren(
  children: LexicalNode[],
  listNode: ListNode,
): NormalizedListChildren {
  const items: ListItemNode[] = [];
  const hoisted: LexicalNode[] = [];
  for (const child of children) {
    if ($isListItemNode(child)) {
      const innerChildren = child.getChildren();
      for (const inner of innerChildren) {
        if ($isStructuralBlock(inner)) {
          // The line break $flattenListItemBlocks put before it.
          const separator = inner.getPreviousSibling();
          if ($isLineBreakNode(separator)) {
            separator.remove();
          }
          inner.remove();
          hoisted.push(inner);
        }
      }
      // An emptied item would render as a stray bullet.
      if (child.getChildrenSize() > 0) {
        items.push(child);
      }
      if (innerChildren.length > 1) {
        for (const inner of innerChildren) {
          if ($isListNode(inner)) {
            items.push(listNode.createListItemNode().append(inner));
          }
        }
      }
    } else if ($isStructuralBlock(child)) {
      hoisted.push(child);
    } else {
      items.push(listNode.createListItemNode().append(child));
    }
  }
  return {hoisted, items};
}

const ListRule = defineImportRule({
  $import: (ctx, el) => {
    let node;
    if (isElementOfTag(el, 'ol')) {
      node = $createListNode('number', el.start);
    } else if (isDomChecklist(el)) {
      node = $createListNode('check');
    } else {
      node = $createListNode('bullet');
    }
    $setDirectionFromDOM(node, el);
    // Propagate the list's `text-align` onto each `ListItemNode` child
    // (legacy `wrapContinuousInlines` did the same), so pasting
    // `<ul style="text-align: left"><li>…</li></ul>` ends up with the
    // alignment on the list items where the reconciler renders it as
    // `style="text-align: left"`.
    const {items, hoisted} = $normalizeListChildren(
      ctx.$importChildren(el),
      node,
    );
    return [
      node.splice(0, 0, $propagateTextAlignToBlockChildren(items, el)),
      ...hoisted,
    ];
  },
  match: sel.tag('ol', 'ul'),
  name: '@lexical/list/list',
});

/**
 * Apply formatting from the first child paragraph of `<li>` to the list
 * item itself, then unwrap that paragraph (Google Docs sets the alignment
 * of the `<p>` inside the `<li>`). Mirrors the legacy
 * `setFormatFromChildren`.
 */
function $liftFormatFromSingleParagraph(
  listItemNode: ListItemNode,
  children: LexicalNode[],
): LexicalNode[] {
  if (children.length !== 1) {
    return children;
  }
  const firstChild = children[0];
  if (
    $isParagraphNode(firstChild) &&
    !listItemNode.getFormatType() &&
    firstChild.getFormatType()
  ) {
    listItemNode.setFormat(firstChild.getFormatType());
    return firstChild.getChildren();
  }
  return children;
}

/**
 * Collapse block children of a `<li>` into inline-with-line-break form: a
 * `ListItemNode` is an inline-level container, so any block child marks a
 * boundary. Contiguous inline siblings are kept together as a single run and
 * one {@link $createLineBreakNode} is inserted between runs — reproducing the
 * legacy `wrapContinuousInlines` + `$unwrapArtificialNodes` shape
 * (`<li>1<div>2</div>3</li>` → `1<br>2<br>3`) without the
 * `ArtificialNode__DO_NOT_USE` marker.
 *
 * Boundaries are detected with {@link $isBlockLevel}, NOT `$isParagraphNode`:
 * the `<div>`/`<section>`/… `TransparentBlockRule` happens to emit
 * `ParagraphNode`s, but a `<blockquote>` (`QuoteNode`), heading
 * (`HeadingNode`), or block decorator (`HorizontalRuleNode`, …) is just as
 * much a block boundary and must not be silently spliced into the list item
 * as-is. A nested `ListNode` is the one deliberate exception — it is a valid
 * list-item child that {@link $normalizeListChildren} lifts into a sibling,
 * so it is preserved here rather than unwrapped, as is a
 * {@link $isStructuralBlock}.
 */
function $flattenListItemBlocks(children: LexicalNode[]): LexicalNode[] {
  const $isBoundary = (node: LexicalNode): boolean =>
    $isBlockLevel(node) && !$isListNode(node);
  if (!children.some($isBoundary)) {
    return children;
  }
  // Partition into segments — each maximal run of inline siblings, and each
  // boundary's own content — then join the segments with a single line break.
  const segments: LexicalNode[][] = [];
  let inlineRun: LexicalNode[] = [];
  const flushInlineRun = () => {
    if (inlineRun.length > 0) {
      segments.push(inlineRun);
      inlineRun = [];
    }
  };
  for (const child of children) {
    if ($isBoundary(child)) {
      flushInlineRun();
      // Unwrap a block ElementNode to its inline content; a childless
      // block DecoratorNode or structural block stands on its own line.
      segments.push(
        $isElementNode(child) && !$isStructuralBlock(child)
          ? child.getChildren()
          : [child],
      );
    } else {
      inlineRun.push(child);
    }
  }
  flushInlineRun();
  const out: LexicalNode[] = [];
  for (const segment of segments) {
    if (out.length > 0) {
      out.push($createLineBreakNode());
    }
    out.push(...segment);
  }
  return out;
}

const ListItemRule = defineImportRule({
  $import: (ctx, el) => {
    const ariaChecked = el.getAttribute('aria-checked');
    const checked =
      ariaChecked === 'true'
        ? true
        : ariaChecked === 'false'
          ? false
          : undefined;
    const node = $createListItemNode(checked);
    $setFormatFromDOM(node, el);
    $setDirectionFromDOM(node, el);
    return [
      node.splice(
        0,
        0,
        // Lift a sole wrapping paragraph's format onto the item *before*
        // flattening, otherwise the paragraph would already be unwrapped and
        // its alignment lost.
        $flattenListItemBlocks(
          $liftFormatFromSingleParagraph(node, ctx.$importChildren(el)),
        ),
      ),
    ];
  },
  match: sel.tag('li'),
  name: '@lexical/list/li',
});

function $buildChecklistItem(
  ctx: DOMImportContext,
  el: HTMLElement,
  checkboxOwner: Element,
): LexicalNode[] {
  const checkboxInput = isElementOfTag(checkboxOwner, 'input')
    ? checkboxOwner
    : checkboxOwner.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!checkboxInput || checkboxInput.getAttribute('type') !== 'checkbox') {
    return [];
  }
  const checked = checkboxInput.hasAttribute('checked');
  const node = $createListItemNode(checked);
  $setFormatFromDOM(node, el);
  $setDirectionFromDOM(node, el);
  return [
    node.splice(
      0,
      0,
      $flattenListItemBlocks(
        $liftFormatFromSingleParagraph(node, ctx.$importChildren(el)),
      ),
    ),
  ];
}

const TaskListItemRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const input = el.querySelector(':scope > input[type="checkbox"]');
    if (!input) {
      return $next();
    }
    return $buildChecklistItem(ctx, el, input);
  },
  match: sel.tag('li').classAll('task-list-item'),
  name: '@lexical/list/li-task-list-item',
});

const JoplinChecklistItemRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const wrapper = el.querySelector(':scope > .checkbox-wrapper');
    if (!wrapper) {
      return $next();
    }
    const input = wrapper.querySelector(':scope > input[type="checkbox"]');
    if (!input) {
      return $next();
    }
    return $buildChecklistItem(ctx, el, input);
  },
  match: sel.tag('li').classAll('joplin-checkbox'),
  name: '@lexical/list/li-joplin-checkbox',
});

/**
 * A {@link ChildSchema} that enforces ListNode invariants: only
 * `ListItemNode` and (immediately-nested) `ListNode` children are
 * accepted; runs of other children get wrapped in a fresh
 * `ListItemNode`.
 *
 * @experimental
 */
export const ListSchema: ChildSchema = {
  $accepts: child => $isListItemNode(child) || $isListNode(child),
  // Inline runs inside a `<ul>`/`<ol>` (e.g. text between two `<li>`s)
  // become the children of a synthetic `ListItemNode`. `ListItemNode`
  // is itself a block-level container of inlines, so no intermediate
  // `ParagraphNode` is needed (and the demoted-paragraph normalization
  // would strip one anyway).
  $packageRun: run => [$createListItemNode().splice(0, 0, run)],
  name: 'ListSchema',
};

/**
 * Import rules for {@link ListNode} and {@link ListItemNode}, including
 * GitHub task-list and Joplin checkbox heuristics.
 *
 * Registered by {@link ListExtension} itself (together with
 * `CoreImportExtension`), so any editor that uses the list extension can
 * import these tags through the `DOMImportExtension` pipeline without
 * further configuration.
 *
 * @experimental
 */
export const ListImportRules = [
  // More specific rules (class-restricted) must precede the generic `li`
  // rule so they win the dispatch race (lower array index = higher
  // priority).
  TaskListItemRule,
  JoplinChecklistItemRule,
  ListRule,
  ListItemRule,
];
