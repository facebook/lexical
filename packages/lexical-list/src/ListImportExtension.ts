/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ChildSchema, DOMImportContext} from '@lexical/html';

import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {
  $createParagraphNode,
  $isParagraphNode,
  $setDirectionFromDOM,
  $setFormatFromDOM,
  configExtension,
  defineExtension,
  isHTMLElement,
  type LexicalNode,
} from 'lexical';

import {
  $createListItemNode,
  $isListItemNode,
  ListItemNode,
} from './LexicalListItemNode';
import {
  $createListNode,
  $isListNode,
  ListNode,
  type ListType,
} from './LexicalListNode';

/**
 * Mirrors the legacy `isDomChecklist` heuristic from
 * `@lexical/list`.
 */
function isDomChecklist(domNode: HTMLElement): boolean {
  if (
    domNode.getAttribute('__lexicallisttype') === 'check' ||
    domNode.classList.contains('contains-task-list') ||
    domNode.getAttribute('data-is-checklist') === '1'
  ) {
    return true;
  }
  for (const child of domNode.childNodes) {
    if (isHTMLElement(child) && child.hasAttribute('aria-checked')) {
      return true;
    }
  }
  return false;
}

/**
 * Lift nested `ListNode`s out of `ListItemNode`s into sibling
 * `ListItemNode`s (the legacy `$normalizeChildren` shape). Also wraps any
 * non-`ListItemNode` children in a new `ListItemNode`.
 */
function $normalizeListChildren(
  children: LexicalNode[],
  listType: ListType,
): ListItemNode[] {
  const out: ListItemNode[] = [];
  for (const child of children) {
    if ($isListItemNode(child)) {
      out.push(child);
      const innerChildren = child.getChildren();
      if (innerChildren.length > 1) {
        for (const inner of innerChildren) {
          if ($isListNode(inner)) {
            const wrap = $createListItemNode();
            wrap.append(inner);
            out.push(wrap);
          }
        }
      }
    } else {
      const wrap = $createListItemNode();
      wrap.append(child);
      out.push(wrap);
    }
  }
  // Read listType to keep the public signature meaningful even though the
  // legacy implementation does not vary by listType.
  void listType;
  return out;
}

const ListRule = defineImportRule({
  $import: (ctx, el) => {
    let node;
    if (el.nodeName === 'OL') {
      const start = (el as HTMLOListElement).start;
      node = $createListNode('number', start);
    } else if (isDomChecklist(el)) {
      node = $createListNode('check');
    } else {
      node = $createListNode('bullet');
    }
    $setDirectionFromDOM(node, el);
    return [
      node.splice(
        0,
        0,
        $normalizeListChildren(ctx.$importChildren(el), node.getListType()),
      ),
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
function liftFormatFromSingleParagraph(
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
        liftFormatFromSingleParagraph(node, ctx.$importChildren(el)),
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
  const checkboxInput = isElement(checkboxOwner, 'input')
    ? (checkboxOwner as HTMLInputElement)
    : (checkboxOwner.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement | null);
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
      liftFormatFromSingleParagraph(node, ctx.$importChildren(el)),
    ),
  ];
}

function isElement(node: Node, tag: string): boolean {
  return isHTMLElement(node) && node.nodeName === tag.toUpperCase();
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
  accepts: child => $isListItemNode(child) || $isListNode(child),
  name: 'ListSchema',
  packageRun(run) {
    // Inline runs inside a `<ul>`/`<ol>` (e.g. text between two `<li>`s)
    // become a paragraph inside a synthetic list item, preserving the
    // structure invariant.
    return [
      $createListItemNode().append($createParagraphNode().splice(0, 0, run)),
    ];
  },
};

/**
 * Import rules for {@link ListNode} and {@link ListItemNode}, including
 * GitHub task-list and Joplin checkbox heuristics.
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

/**
 * Bundles {@link ListImportRules} (plus {@link CoreImportExtension}) into
 * a single dependency.
 *
 * @experimental
 */
export const ListImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    configExtension(DOMImportExtension, {rules: ListImportRules}),
  ],
  name: '@lexical/list/Import',
  // Register ListNode + ListItemNode lazily so the rules can safely call
  // their $create helpers. We can't depend on ListExtension directly
  // because it's defined in this package's ./index — a module-init
  // cycle. Apps that want the full ListExtension behavior (commands,
  // transforms) should depend on it separately.
  nodes: () => [ListNode, ListItemNode],
});
