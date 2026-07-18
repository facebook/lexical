/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {configExtension} from '@lexical/extension';
import {
  createImportState,
  defineImportRule,
  defineOverlayRules,
  type DOMImportContext,
  DOMImportExtension,
  type DOMPreprocessFn,
  ImportOverlays,
  InlineSchema,
  sel,
} from '@lexical/html';
import {
  $createListItemNode,
  $createListNode,
  type ListNode,
} from '@lexical/list';
import {defineExtension, getStyleObjectFromCSS, isHTMLElement} from 'lexical';

const WORD_LIST_CLASS_RE = /^MsoListParagraph(CxSp(First|Middle|Last))?$/;
const WORD_NUMBERED_RE = /^[A-Za-z0-9]+[.)]/;
const WORD_GENERATOR_RE = /Microsoft Word/i;

// The default `$inlineStylesFromStyleSheets` preprocess mutates each
// element's inline style through CSSStyleDeclaration.setProperty, which
// makes JSDOM (and real browsers) re-serialize the style attribute and
// drop unknown properties like `mso-list`. The Word preprocess runs
// FIRST (it's appended to the stack so it's on top), so it stashes
// `mso-list` onto a `data-*` attribute that survives the later
// stylesheet-inlining pass.
const MSO_LIST_DATA_ATTR = 'data-mso-list';

function readMsoListAttr(el: Element): string {
  return (
    el.getAttribute(MSO_LIST_DATA_ATTR) ||
    getStyleObjectFromCSS(el.getAttribute('style') || '')['mso-list'] ||
    ''
  );
}

function readWordListLevel(el: HTMLElement): number {
  const m = readMsoListAttr(el).match(/level(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function $findMarkerSpan(el: HTMLElement): HTMLElement | null {
  for (const span of Array.from(el.querySelectorAll('span'))) {
    if (readMsoListAttr(span) === 'Ignore') {
      return span;
    }
  }
  return null;
}

function $readWordMarker(el: HTMLElement): string {
  const span = $findMarkerSpan(el);
  return span ? (span.textContent || '').trim() : '';
}

function classifyWordListType(marker: string): 'number' | 'bullet' {
  return WORD_NUMBERED_RE.test(marker) ? 'number' : 'bullet';
}

function $stripWordMarker(el: HTMLElement): void {
  // The marker span is wrapped in an outer <span> directly under the
  // <p>; remove that outer wrapper.
  const inner = $findMarkerSpan(el);
  if (!inner) {
    return;
  }
  let outer: Element = inner;
  while (
    outer.parentElement &&
    outer.parentElement !== el &&
    outer.parentElement.nodeName === 'SPAN'
  ) {
    outer = outer.parentElement;
  }
  outer.remove();
}

function isWordListParagraph(node: Node): node is HTMLElement {
  return isHTMLElement(node) && WORD_LIST_CLASS_RE.test(node.className);
}

interface WordListItem {
  el: HTMLElement;
  level: number;
  marker: string;
}

function $buildWordListTree(
  ctx: DOMImportContext,
  items: readonly WordListItem[],
): ListNode {
  const root = $createListNode(classifyWordListType(items[0].marker));
  type Frame = {list: ListNode; level: number};
  const stack: Frame[] = [{level: items[0].level, list: root}];
  for (const item of items) {
    while (stack.length > 1 && stack[stack.length - 1].level > item.level) {
      stack.pop();
    }
    if (item.level > stack[stack.length - 1].level) {
      // Lexical's nested-list convention (see `$isNestedListNode` in
      // @lexical/list): a sublist lives inside its OWN ListItemNode
      // wrapper that is a sibling of the items above it, not inside
      // the previous content item. The wrapper has no own content,
      // just the sublist as its first child.
      const sub = $createListNode(classifyWordListType(item.marker));
      const wrapper = $createListItemNode();
      wrapper.append(sub);
      stack[stack.length - 1].list.append(wrapper);
      stack.push({level: item.level, list: sub});
    }
    $stripWordMarker(item.el);
    const li = $createListItemNode();
    li.splice(0, 0, ctx.$importChildren(item.el, {schema: InlineSchema}));
    stack[stack.length - 1].list.append(li);
  }
  return root;
}

/**
 * Per-import session WeakSet tracking `<p class="MsoListParagraph*">`
 * elements already absorbed by an earlier sibling's list-construction
 * pass, so the framework's normal child iteration treats them as
 * no-ops. The state's default is `null`; the rule lazily initializes
 * a fresh WeakSet into the session on first use, since
 * `createImportState`'s default factory is called once at state
 * creation and the result is shared (see ImportContext.ts).
 */
const WordListConsumed = createImportState<WeakSet<Element> | null>(
  'word/consumed-list-items',
  () => null,
);

const WordListParagraphRule = defineImportRule({
  $import: (ctx, el) => {
    let consumed = ctx.session.get(WordListConsumed);
    if (consumed === null) {
      consumed = new WeakSet();
      ctx.session.set(WordListConsumed, consumed);
    }
    if (consumed.has(el)) {
      return [];
    }
    const items: WordListItem[] = [];
    let cur: Node | null = el;
    while (cur && isWordListParagraph(cur)) {
      consumed.add(cur);
      items.push({
        el: cur,
        level: readWordListLevel(cur),
        marker: $readWordMarker(cur),
      });
      if (
        cur.classList.contains('MsoListParagraphCxSpLast') ||
        cur.className === 'MsoListParagraph'
      ) {
        break;
      }
      cur = cur.nextElementSibling;
    }
    return [$buildWordListTree(ctx, items)];
  },
  match: sel
    .tag('p')
    .classAny(
      'MsoListParagraph',
      'MsoListParagraphCxSpFirst',
      'MsoListParagraphCxSpMiddle',
      'MsoListParagraphCxSpLast',
    ),
  name: 'word/list-paragraph',
});

// <o:p> is Office's "paragraph end" marker; always produces nothing.
const WordOPRule = defineImportRule({
  $import: () => [],
  match: sel.tag('o:p'),
  name: 'word/o-p',
});

const WordPasteOverlay = defineOverlayRules([
  WordOPRule,
  WordListParagraphRule,
]);

const $installWordOverlay: DOMPreprocessFn = (dom, ctx, $next) => {
  const meta = dom.querySelector('meta[name="Generator"]');
  if (meta && WORD_GENERATOR_RE.test(meta.getAttribute('content') || '')) {
    // Snapshot `mso-list` onto data-mso-list before the later
    // stylesheet-inlining preprocess re-serializes the style attribute
    // and drops unknown CSS properties.
    for (const el of Array.from(dom.querySelectorAll('[style*="mso-list"]'))) {
      const msoList = getStyleObjectFromCSS(el.getAttribute('style') || '')[
        'mso-list'
      ];
      if (msoList) {
        el.setAttribute(MSO_LIST_DATA_ATTR, msoList);
      }
    }
    ctx.session.update(ImportOverlays, prev => [...prev, WordPasteOverlay]);
  }
  $next();
};

/**
 * Extension that registers a DOM preprocess hook: if the input
 * carries `<meta name="Generator" content="Microsoft Word…">`, push a
 * Word-specific overlay onto {@link ImportOverlays} so the rest of the
 * walk picks it up. Pastes from other sources pay nothing.
 */
export const WordPasteExtension = defineExtension({
  dependencies: [
    configExtension(DOMImportExtension, {
      preprocess: [$installWordOverlay],
    }),
  ],
  name: '@lexical/examples/word-paste',
});
