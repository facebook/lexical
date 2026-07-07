/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  getExtensionDependencyFromEditor,
  HorizontalRuleExtension,
} from '@lexical/extension';
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
  $isListItemNode,
  $isListNode,
  ListExtension,
  ListImportExtension,
  type ListItemNode,
  type ListNode,
} from '@lexical/list';
import {JSDOM} from 'jsdom';
import {
  $getEditor,
  $getRoot,
  defineExtension,
  getStyleObjectFromCSS,
  isHTMLElement,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      // ListExtension registers its own import rules (and the shared
      // CoreImportExtension baseline) — no dedicated import extension
      // required.
      dependencies: [ListExtension],
      name: 'list-host',
    }),
  );
}

function $generate(html: string): LexicalNode[] {
  const editor = $getEditor();
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return dep.output.$generateNodesFromDOM(dom.window.document);
}

function importInto(editor: LexicalEditor, html: string): void {
  editor.update(
    () => {
      const nodes = $generate(html);
      $getRoot()
        .clear()
        .append(...nodes);
    },
    {discrete: true},
  );
}

function $rootList(): ListNode {
  const node = $getRoot().getFirstChild();
  assert($isListNode(node), 'expected ListNode at root');
  return node;
}

function $items(list: ListNode): ListItemNode[] {
  return list.getChildren().filter($isListItemNode);
}

describe('ListImportExtension', () => {
  test('<ul><li>a</li><li>b</li></ul> → bullet list with two items', () => {
    using editor = buildEditor();
    importInto(editor, '<ul><li>a</li><li>b</li></ul>');
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('bullet');
      const items = $items(list);
      expect(items).toHaveLength(2);
      expect(items[0].getTextContent()).toBe('a');
      expect(items[1].getTextContent()).toBe('b');
    });
  });

  test('<ol start="3"> → number list with start=3', () => {
    using editor = buildEditor();
    importInto(editor, '<ol start="3"><li>x</li></ol>');
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('number');
      expect(list.getStart()).toBe(3);
    });
  });

  test('GitHub task-list-item → checklist item', () => {
    using editor = buildEditor();
    importInto(
      editor,
      '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked/>done</li><li class="task-list-item"><input type="checkbox"/>todo</li></ul>',
    );
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('check');
      const items = $items(list);
      expect(items).toHaveLength(2);
      expect(items[0].getChecked()).toBe(true);
      expect(items[1].getChecked()).toBe(false);
    });
  });

  test('aria-checked drives checklist state', () => {
    using editor = buildEditor();
    importInto(editor, '<ul><li aria-checked="true">a</li></ul>');
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('check');
      const items = $items(list);
      expect(items[0].getChecked()).toBe(true);
    });
  });

  test('stray text inside <ul> gets wrapped via $normalizeListChildren', () => {
    using editor = buildEditor();
    importInto(editor, '<ul>stray <li>real item</li></ul>');
    editor.read(() => {
      const list = $rootList();
      const items = $items(list);
      // The framework's flattening of unmatched <ul> child text + the legacy
      // normalize step both produce list items; the real item must survive.
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some(i => i.getTextContent().includes('real item'))).toBe(
        true,
      );
    });
  });

  test('deprecated ListImportExtension alias still imports lists', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [ListImportExtension],
        name: 'list-alias-host',
      }),
    );
    importInto(editor, '<ul><li>a</li></ul>');
    editor.read(() => {
      expect($items($rootList()).map(i => i.getTextContent())).toEqual(['a']);
    });
  });
});

// ----------------------------------------------------------------------------
// Word paste example
//
// MS Word produces HTML where "lists" are actually flat runs of
// <p class="MsoListParagraph*"> with a marker like "1." or "·" inside a
// nested <span style='mso-list:Ignore'>...</span>. There are no <ol>/<ul>
// or <li> elements. The <p>'s carry style='mso-list:l<N> level<M> lfo<X>'
// where <N> identifies the list and <M> the nesting depth.
//
// The trick is twofold:
//   (1) The preprocess only installs the Word-paste overlay when the
//       generator meta tag is present, so pastes from other sources pay
//       nothing for Word handling.
//   (2) The overlay rule walks forward through siblings to collect a
//       complete list run, uses a session-tracked WeakSet to mark the
//       siblings as consumed, and builds a nested list tree from the
//       level transitions.
// ----------------------------------------------------------------------------

const WordListConsumed = createImportState<WeakSet<Element>>(
  'word/consumed-list-items',
  () => new WeakSet(),
);

const WORD_LIST_CLASS_RE = /^MsoListParagraph(CxSp(First|Middle|Last))?$/;
const WORD_NUMBERED_RE = /^[A-Za-z0-9]+[.)]/;

function readMsoStyles(el: Element): Record<string, string> {
  // mso-* are Microsoft non-standard CSS properties; browsers and JSDOM
  // don't surface them via el.style, so parse the raw style attribute.
  return getStyleObjectFromCSS(el.getAttribute('style') || '');
}

function readWordListLevel(el: HTMLElement): number {
  // mso-list looks like "l<N> level<M> lfo<X>"; pluck the level number.
  const msoList = readMsoStyles(el)['mso-list'] || '';
  const m = msoList.match(/level(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function $findMarkerSpan(el: HTMLElement): HTMLElement | null {
  for (const span of Array.from(el.querySelectorAll('span'))) {
    if (readMsoStyles(span)['mso-list'] === 'Ignore') {
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

function $buildWordListTree(
  ctx: DOMImportContext,
  items: readonly {el: HTMLElement; level: number; marker: string}[],
): ListNode {
  const root = $createListNode(classifyWordListType(items[0].marker));
  type Frame = {list: ListNode; level: number};
  const stack: Frame[] = [{level: items[0].level, list: root}];
  for (const item of items) {
    // Close levels deeper than this one.
    while (stack.length > 1 && stack[stack.length - 1].level > item.level) {
      stack.pop();
    }
    // Open a new sublist if we just stepped deeper. Lexical's
    // nested-list convention (see `isNestedListNode` in @lexical/list):
    // a sublist lives inside its OWN ListItemNode wrapper that is a
    // sibling of the content items above it, not inside the previous
    // one. The wrapper holds the sublist as its first (and only) child.
    if (item.level > stack[stack.length - 1].level) {
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

const WordListParagraphRule = defineImportRule({
  $import: (ctx, el) => {
    const consumed = ctx.session.get(WordListConsumed);
    if (consumed.has(el)) {
      // Already collected by an earlier sibling's run.
      return [];
    }
    const items: {el: HTMLElement; level: number; marker: string}[] = [];
    let cur: Node | null = el;
    while (cur && isWordListParagraph(cur)) {
      consumed.add(cur);
      items.push({
        el: cur,
        level: readWordListLevel(cur),
        marker: $readWordMarker(cur),
      });
      // Stop at the explicitly-terminal class. The standalone
      // MsoListParagraph (no CxSp suffix) is a single-item run.
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

// <o:p> is Office's "paragraph end" marker; it always produces nothing.
const WordOPRule = defineImportRule({
  $import: () => [],
  match: sel.tag('o:p'),
  name: 'word/o-p',
});

const WordPasteOverlay = defineOverlayRules([
  WordOPRule,
  WordListParagraphRule,
]);

const WORD_GENERATOR_RE = /Microsoft Word/i;

const $installWordOverlay: DOMPreprocessFn = (dom, ctx, $next) => {
  const meta = dom.querySelector('meta[name="Generator"]');
  if (meta && WORD_GENERATOR_RE.test(meta.getAttribute('content') || '')) {
    ctx.session.update(ImportOverlays, prev => [...prev, WordPasteOverlay]);
  }
  $next();
};

function buildWordPasteEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        ListExtension,
        configExtension(DOMImportExtension, {
          preprocess: [$installWordOverlay],
        }),
      ],
      name: 'word-paste-host',
    }),
  );
}

function importHTMLDocument(editor: LexicalEditor, html: string): void {
  editor.update(
    () => {
      const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
      const dom = new JSDOM(html);
      const nodes = dep.output.$generateNodesFromDOM(dom.window.document);
      $getRoot().clear().splice(0, 0, nodes);
    },
    {discrete: true},
  );
}

const WORD_HTML_WITH_LISTS = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta name="Generator" content="Microsoft Word 15">
</head>
<body>
  <p class="MsoNormal">Body text<o:p></o:p></p>

  <p class="MsoListParagraphCxSpFirst" style="mso-list:l2 level1 lfo1">
    <span><span style="mso-list:Ignore">1.</span></span>
    Numbered List Item 1<o:p></o:p>
  </p>
  <p class="MsoListParagraphCxSpMiddle" style="mso-list:l2 level1 lfo1">
    <span><span style="mso-list:Ignore">2.</span></span>
    Numbered List Item 2<o:p></o:p>
  </p>
  <p class="MsoListParagraphCxSpLast" style="mso-list:l2 level1 lfo1">
    <span><span style="mso-list:Ignore">3.</span></span>
    Numbered List Item 3<o:p></o:p>
  </p>

  <p class="MsoNormal"><o:p>&nbsp;</o:p></p>

  <p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo2">
    <span><span style="mso-list:Ignore">&middot;</span></span>
    Bullet List Item 1<o:p></o:p>
  </p>
  <p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo2">
    <span><span style="mso-list:Ignore">&middot;</span></span>
    Bullet List Item 2<o:p></o:p>
  </p>

  <p class="MsoNormal"><o:p>&nbsp;</o:p></p>

  <p class="MsoListParagraphCxSpFirst" style="mso-list:l1 level1 lfo3">
    <span><span style="mso-list:Ignore">1)</span></span>
    Outline numbered 1<o:p></o:p>
  </p>
  <p class="MsoListParagraphCxSpMiddle" style="mso-list:l1 level2 lfo3">
    <span><span style="mso-list:Ignore">a)</span></span>
    Outline numbered 1.a<o:p></o:p>
  </p>
  <p class="MsoListParagraphCxSpMiddle" style="mso-list:l1 level2 lfo3">
    <span><span style="mso-list:Ignore">b)</span></span>
    Outline numbered 1.b<o:p></o:p>
  </p>
  <p class="MsoListParagraphCxSpLast" style="mso-list:l1 level1 lfo3">
    <span><span style="mso-list:Ignore">2)</span></span>
    Outline numbered 2<o:p></o:p>
  </p>
</body>
</html>`;

describe('MS Word paste — preprocess-installed overlay', () => {
  test('converts MsoListParagraph runs into nested ListNodes', () => {
    using editor = buildWordPasteEditor();
    importHTMLDocument(editor, WORD_HTML_WITH_LISTS);
    editor.read(() => {
      const lists = $getRoot().getChildren().filter($isListNode);
      expect(lists).toHaveLength(3);

      const [numbered, bullet, outline] = lists;

      expect(numbered.getListType()).toBe('number');
      expect($items(numbered).map(li => li.getTextContent().trim())).toEqual([
        'Numbered List Item 1',
        'Numbered List Item 2',
        'Numbered List Item 3',
      ]);

      expect(bullet.getListType()).toBe('bullet');
      expect($items(bullet).map(li => li.getTextContent().trim())).toEqual([
        'Bullet List Item 1',
        'Bullet List Item 2',
      ]);

      // Outline list (Lexical convention): three top-level
      // ListItemNodes — the two content items "1" and "2" plus a
      // *wrapper* item between them whose only child is the nested
      // 2-item sublist.
      expect(outline.getListType()).toBe('number');
      const outlineItems = $items(outline);
      expect(outlineItems).toHaveLength(3);
      const firstContent = outlineItems[0].getFirstChild();
      assert(firstContent !== null, 'expected first content child');
      expect(firstContent.getTextContent().trim()).toBe('Outline numbered 1');
      const nested = outlineItems[1].getFirstChild();
      assert($isListNode(nested), 'expected nested sublist on wrapper item');
      expect(nested.getListType()).toBe('number');
      expect($items(nested).map(li => li.getTextContent().trim())).toEqual([
        'Outline numbered 1.a',
        'Outline numbered 1.b',
      ]);
      const lastContent = outlineItems[2].getFirstChild();
      assert(lastContent !== null, 'expected last content child');
      expect(lastContent.getTextContent().trim()).toBe('Outline numbered 2');
    });
  });

  test('without the Generator meta the overlay is not installed', () => {
    // Same body, no <meta name="Generator"> — the Word overlay must not
    // fire, so the MsoListParagraph elements fall through to normal
    // paragraph handling.
    using editor = buildWordPasteEditor();
    const htmlWithoutMeta = WORD_HTML_WITH_LISTS.replace(
      /<meta name="Generator"[^>]*>/,
      '',
    );
    importHTMLDocument(editor, htmlWithoutMeta);
    editor.read(() => {
      expect($getRoot().getChildren().some($isListNode)).toBe(false);
    });
  });
});

describe('ListItemNode block flattening', () => {
  function $liChildTypes(): string[] {
    const list = $getRoot().getFirstChild();
    assert($isListNode(list), 'expected a ListNode');
    const li = list.getFirstChild();
    assert($isListItemNode(li), 'expected a ListItemNode');
    return li.getChildren().map(c => `${c.getType()}:${c.getTextContent()}`);
  }

  test('keeps contiguous inlines together, breaking only at block boundaries', () => {
    using editor = buildEditor();
    importInto(editor, '<ul><li>a <b>b</b><div>c</div></li></ul>');
    editor.read(() => {
      // `a ` and `b` are inline siblings and must stay on the same line; the
      // <div> (lowered to a ParagraphNode) is the sole boundary.
      expect($liChildTypes()).toEqual([
        'text:a ',
        'text:b',
        'linebreak:\n',
        'text:c',
      ]);
    });
  });

  test('treats a non-paragraph block (<hr>) as a boundary, not inline content', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HorizontalRuleExtension, ListExtension],
        name: 'list-hr-host',
      }),
    );
    importInto(editor, '<ul><li>x<hr />y</li></ul>');
    editor.read(() => {
      // A HorizontalRuleNode is block-level but not a ParagraphNode; it must
      // still split the run rather than be spliced inline between x and y.
      expect($liChildTypes().map(s => s.split(':')[0])).toEqual([
        'text',
        'linebreak',
        'horizontalrule',
        'linebreak',
        'text',
      ]);
    });
  });

  test('preserves a nested list instead of flattening it', () => {
    using editor = buildEditor();
    importInto(editor, '<ul><li>parent<ul><li>child</li></ul></li></ul>');
    editor.read(() => {
      const findNested = (node: LexicalNode): boolean => {
        if ($isListItemNode(node)) {
          return node.getChildren().some($isListNode);
        }
        return $isListNode(node) && node.getChildren().some(findNested);
      };
      // The nested <ul> survives as a ListNode (lifted into a sibling item by
      // $normalizeListChildren), not demoted to line-break-separated text.
      const outer = $getRoot().getFirstChild();
      assert($isListNode(outer), 'expected a ListNode');
      expect(outer.getChildren().some(findNested)).toBe(true);
    });
  });
});
