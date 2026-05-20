/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  $getImportContextValue,
  type AnyDOMImportRule,
  BlockSchema,
  contextValue,
  createImportState,
  defineImportRule,
  defineOverlayRules,
  DOMImportExtension,
  ImportSource,
  ImportTextFormat,
  InlineSchema,
  isElementOfTag,
  parseSelector,
  sel,
} from '@lexical/html';
import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {JSDOM} from 'jsdom';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $isParagraphNode,
  $isTextNode,
  $setState,
  configExtension,
  createState,
  defineExtension,
  IS_BOLD,
  IS_ITALIC,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

const idState = createState('id', {
  parse: v => (typeof v === 'string' ? v : null),
});

const sourceState = createState('source', {
  parse: v => (typeof v === 'string' ? v : null),
});

const IdAttributeRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const out = $next();
    if (out.length === 1) {
      const id = el.getAttribute('id');
      if (id) {
        $setState(out[0], idState, id);
      }
    }
    return out;
  },
  match: sel.any().attr('id', /\S/),
  name: 'test/id-decorator',
});

const AnchorRule = defineImportRule({
  $import: (ctx, el, $next) => {
    if (!el.href) {
      return $next();
    }
    const link = $createLinkNode(el.href);
    link.splice(0, 0, ctx.$importChildren(el, {schema: InlineSchema}));
    return [link];
  },
  match: sel.tag('a'),
  name: 'test/anchor',
});

const ParagraphRule = defineImportRule({
  $import: (ctx, el) => {
    const p = $createParagraphNode();
    p.splice(0, 0, ctx.$importChildren(el, {schema: InlineSchema}));
    return [p];
  },
  match: sel.tag('p'),
  name: 'test/paragraph',
});

const TextRule = defineImportRule({
  $import: (ctx, el) => {
    if (!el.data) {
      return [];
    }
    const text = $createTextNode(el.data);
    const format = ctx.get(ImportTextFormat);
    if (format) {
      text.setFormat(format);
    }
    return [text];
  },
  match: sel.text(),
  name: 'test/text',
});

const BoldRule = defineImportRule({
  $import: (ctx, el) =>
    ctx.$importChildren(el, {
      context: [
        contextValue(ImportTextFormat, ctx.get(ImportTextFormat) | IS_BOLD),
      ],
    }),
  match: sel.tag('b', 'strong'),
  name: 'test/bold',
});

const ItalicRule = defineImportRule({
  $import: (ctx, el) =>
    ctx.$importChildren(el, {
      context: [
        contextValue(ImportTextFormat, ctx.get(ImportTextFormat) | IS_ITALIC),
      ],
    }),
  match: sel.tag('em', 'i'),
  name: 'test/italic',
});

// Sibling-emitting: <figure> emits [image-paragraph, caption-paragraph]
const FigureRule = defineImportRule({
  $import: (ctx, el) => {
    const img = el.querySelector(':scope > img');
    const cap = el.querySelector(':scope > figcaption');
    const out: LexicalNode[] = [];
    if (img) {
      const imgP = $createParagraphNode();
      imgP.append($createTextNode(`[img:${img.getAttribute('alt') || ''}]`));
      out.push(imgP);
    }
    if (cap) {
      const capP = $createParagraphNode();
      capP.splice(0, 0, ctx.$importChildren(cap, {schema: InlineSchema}));
      out.push(capP);
    }
    return out;
  },
  match: sel.tag('figure'),
  name: 'test/figure',
});

// Demonstrates $next() body-refinement: only handles <pre> if a child <code>
// carries a language- class; otherwise defers.
const CodeRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const code = el.querySelector(':scope > code');
    if (!code || !/language-/.test(code.className)) {
      return $next();
    }
    const m = code.className.match(/(?:^|\s)language-(\S+)/);
    const p = $createParagraphNode();
    p.append($createTextNode(`[code:${m ? m[1] : '?'}]`));
    return [p];
  },
  match: sel.tag('pre'),
  name: 'test/code',
});

const CodeCaptureRule = defineImportRule({
  $import: ctx => {
    const lang = ctx.captures.lang[1];
    const p = $createParagraphNode();
    p.append($createTextNode(`[capture:${lang}]`));
    return [p];
  },
  match: sel.tag('pre').attr('data-language', /^(.+)$/, {capture: 'lang'}),
  name: 'test/code-capture',
});

const SourceAwareRule = defineImportRule({
  $import: (ctx, el) => {
    const p = $createParagraphNode();
    p.splice(0, 0, ctx.$importChildren(el, {schema: InlineSchema}));
    $setState(p, sourceState, ctx.get(ImportSource));
    return [p];
  },
  match: sel.tag('div'),
  name: 'test/source-aware',
});

function buildTestEditor(extraRules: AnyDOMImportRule[]) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [configExtension(DOMImportExtension, {rules: extraRules})],
      name: 'test-host',
      nodes: [LinkNode],
    }),
  );
}

function $generate(
  editor: LexicalEditor,
  html: string,
  options?: Parameters<
    ReturnType<
      typeof getExtensionDependencyFromEditor<typeof DOMImportExtension>
    >['output']['$generateNodesFromDOM']
  >[1],
): LexicalNode[] {
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return dep.output.$generateNodesFromDOM(dom.window.document, options);
}

function $importInto(
  editor: LexicalEditor,
  html: string,
  options?: Parameters<typeof $generate>[2],
): void {
  editor.update(
    () => {
      const nodes = $generate(editor, html, options);
      $getRoot().clear().splice(0, 0, nodes);
    },
    {discrete: true},
  );
}

function $rootParagraphs(): ParagraphNode[] {
  return $getRoot().getChildren().filter($isParagraphNode);
}

describe('DOMImportExtension', () => {
  test('basic anchor import + id decorator', () => {
    using editor = buildTestEditor([
      IdAttributeRule,
      AnchorRule,
      ParagraphRule,
      TextRule,
    ]);
    $importInto(editor, '<p><a id="x" href="https://example.com">link</a></p>');
    editor.read(() => {
      const [para] = $rootParagraphs();
      const link = para.getFirstChild();
      assert($isLinkNode(link), 'expected LinkNode');
      expect($getState(link, idState)).toBe('x');
      // The test AnchorRule reads el.href (the resolved URL property), which
      // JSDOM normalizes; getAttribute('href') would return the raw value.
      expect(link.getURL()).toBe('https://example.com/');
      const text = link.getFirstChild();
      assert($isTextNode(text), 'expected TextNode');
      expect(text.getTextContent()).toBe('link');
    });
  });

  test('text format propagation via ImportTextFormat context', () => {
    using editor = buildTestEditor([
      BoldRule,
      ItalicRule,
      ParagraphRule,
      TextRule,
    ]);
    $importInto(editor, '<p>plain <b>bold <i>italicbold</i></b></p>');
    editor.read(() => {
      const texts = $getRoot().getAllTextNodes();
      expect(texts).toHaveLength(3);
      const find = (s: string) => {
        const t = texts.find(n => n.getTextContent() === s);
        assert(t !== undefined, `no TextNode ${JSON.stringify(s)}`);
        return t;
      };
      expect(find('plain ').getFormat()).toBe(0);
      expect(find('bold ').hasFormat('bold')).toBe(true);
      expect(find('bold ').hasFormat('italic')).toBe(false);
      expect(find('italicbold').hasFormat('bold')).toBe(true);
      expect(find('italicbold').hasFormat('italic')).toBe(true);
    });
  });

  test('RootSchema wraps stray inline runs in paragraphs', () => {
    using editor = buildTestEditor([ParagraphRule, TextRule, BoldRule]);
    $importInto(editor, 'orphan <b>inlines</b> at root');
    editor.read(() => {
      const root = $getRoot();
      expect(root.getChildrenSize()).toBe(1);
      const [para] = $rootParagraphs();
      expect(para.getTextContent()).toBe('orphan inlines at root');
    });
  });

  test('sibling-emitting rule (<figure> -> two paragraphs)', () => {
    using editor = buildTestEditor([FigureRule, ParagraphRule, TextRule]);
    $importInto(
      editor,
      '<figure><img src="x" alt="cat"/><figcaption>A cat.</figcaption></figure>',
    );
    editor.read(() => {
      const ps = $rootParagraphs();
      expect(ps).toHaveLength(2);
      expect(ps[0].getTextContent()).toBe('[img:cat]');
      expect(ps[1].getTextContent()).toBe('A cat.');
    });
  });

  test('$next() deferral: code rule defers to next on non-language code', () => {
    using editor = buildTestEditor([CodeRule, ParagraphRule, TextRule]);
    $importInto(
      editor,
      '<pre><code class="language-js">x</code></pre><pre><code>y</code></pre>',
    );
    editor.read(() => {
      const ps = $rootParagraphs();
      expect(ps).toHaveLength(2);
      expect(ps[0].getTextContent()).toBe('[code:js]');
      expect(ps[1].getTextContent()).toBe('y');
    });
  });

  test('regex capture is exposed on ctx.captures without re-running', () => {
    using editor = buildTestEditor([CodeCaptureRule]);
    $importInto(editor, '<pre data-language="rust">irrelevant</pre>');
    editor.read(() => {
      const [p] = $rootParagraphs();
      expect(p.getTextContent()).toBe('[capture:rust]');
    });
  });

  test('per-call context: ImportSource flows to rule body', () => {
    using editor = buildTestEditor([SourceAwareRule, TextRule]);
    $importInto(editor, '<div>x</div>', {
      context: [contextValue(ImportSource, 'paste')],
    });
    editor.read(() => {
      const [p] = $rootParagraphs();
      expect($getState(p, sourceState)).toBe('paste');
    });
    $importInto(editor, '<div>x</div>', {
      context: [contextValue(ImportSource, 'deserialize')],
    });
    editor.read(() => {
      const [p] = $rootParagraphs();
      expect($getState(p, sourceState)).toBe('deserialize');
    });
  });

  test('per-call context default is "unknown"', () => {
    using editor = buildTestEditor([SourceAwareRule, TextRule]);
    $importInto(editor, '<div>x</div>');
    editor.read(() => {
      const [p] = $rootParagraphs();
      expect($getState(p, sourceState)).toBe('unknown');
    });
  });

  test('rule priority: later-registered rule runs first; can call $next()', () => {
    using editor = buildTestEditor([
      IdAttributeRule,
      AnchorRule,
      ParagraphRule,
      TextRule,
    ]);
    $importInto(editor, '<p><a id="link-x" href="/y">click</a></p>');
    editor.read(() => {
      const link = $rootParagraphs()[0].getFirstChild();
      assert($isLinkNode(link), 'expected LinkNode');
      expect($getState(link, idState)).toBe('link-x');
    });
  });

  test('CSS parser: parseSelector("p.foo") matches as expected', () => {
    const cssRule = defineImportRule({
      $import: () => {
        const p = $createParagraphNode();
        p.append($createTextNode('[matched]'));
        return [p];
      },
      match: parseSelector('p.foo'),
      name: 'test/css-pfoo',
    });
    using editor = buildTestEditor([cssRule, ParagraphRule, TextRule]);
    $importInto(editor, '<p class="foo">x</p><p>y</p>');
    editor.read(() => {
      const ps = $rootParagraphs();
      expect(ps[0].getTextContent()).toBe('[matched]');
      expect(ps[1].getTextContent()).toBe('y');
    });
  });

  test('CSS parser via sel.css() chains with combinators', () => {
    const chained = defineImportRule({
      $import: ctx => {
        const lang = ctx.captures.lang[1];
        const p = $createParagraphNode();
        p.append($createTextNode(`[combo:${lang}]`));
        return [p];
      },
      match: sel
        .css('span.highlight')
        .attr('data-lang', /^(.+)$/, {capture: 'lang'}),
      name: 'test/css-combinator',
    });
    using editor = buildTestEditor([chained]);
    $importInto(editor, '<span class="highlight" data-lang="go">x</span>');
    editor.read(() => {
      const [p] = $rootParagraphs();
      expect(p.getTextContent()).toBe('[combo:go]');
    });
  });

  test('isElementOfTag narrows correctly without instanceof', () => {
    const dom = new JSDOM(
      '<!doctype html><html><body><a href="x"></a><p></p></body></html>',
    );
    const anchor = dom.window.document.body.firstElementChild;
    const para = dom.window.document.body.lastElementChild;
    assert(anchor !== null && para !== null, 'expected two children');
    expect(isElementOfTag(anchor, 'a')).toBe(true);
    expect(isElementOfTag(anchor, 'p')).toBe(false);
    expect(isElementOfTag(para, 'p')).toBe(true);
  });

  test('compileImportRules: unknown tags hit wildcard bucket', () => {
    using editor = buildTestEditor([IdAttributeRule, ParagraphRule, TextRule]);
    $importInto(editor, '<my-thing id="custom">z</my-thing>');
    editor.read(() => {
      // Custom element with an id — only the id decorator matches; the
      // dispatcher then hoists children (the text "z") which RootSchema
      // wraps in a paragraph. The id decorator's $next() returned a single
      // TextNode so the id ends up on the text.
      const [p] = $rootParagraphs();
      expect(p.getTextContent()).toBe('z');
      const text = p.getFirstChild();
      assert($isTextNode(text), 'expected TextNode');
      expect($getState(text, idState)).toBe('custom');
    });
  });
});

describe('BlockSchema / InlineSchema', () => {
  const BlockRule = defineImportRule({
    $import: (ctx, el) => {
      // Pretend section is a block; populate with BlockSchema so inline runs
      // get paragraph-wrapped.
      const p = $createParagraphNode();
      p.append(
        $createTextNode(
          `[section:${ctx.$importChildren(el, {schema: BlockSchema}).length}]`,
        ),
      );
      return [p];
    },
    match: sel.tag('section'),
    name: 'test/section',
  });

  test('BlockSchema wraps inline runs in paragraphs', () => {
    using editor = buildTestEditor([BlockRule, ParagraphRule, TextRule]);
    $importInto(editor, '<section>inline<p>block</p>more inline</section>');
    editor.read(() => {
      const [p] = $rootParagraphs();
      // 3 children: paragraph("inline"), paragraph("block"), paragraph("more inline")
      expect(p.getTextContent()).toBe('[section:3]');
    });
  });
});

describe('regression sanity for the existing $generateNodesFromDOM', () => {
  test('importer state does not leak between $generateNodesFromDOM calls', () => {
    using editor = buildTestEditor([BoldRule, ParagraphRule, TextRule]);
    editor.update(
      () => {
        const a = $generate(editor, '<p><b>x</b></p>');
        const b = $generate(editor, '<p>y</p>');
        $getRoot()
          .clear()
          .splice(0, 0, [...a, ...b]);
      },
      {discrete: true},
    );
    editor.read(() => {
      const [p1, p2] = $rootParagraphs();
      const t1 = p1.getFirstChild();
      const t2 = p2.getFirstChild();
      assert($isTextNode(t1) && $isTextNode(t2), 'expected text nodes');
      expect(t1.hasFormat('bold')).toBe(true);
      expect(t2.hasFormat('bold')).toBe(false);
    });
  });
});

describe('$importChildren `rules` overlay', () => {
  test('overlay rules take precedence over main rules inside the subtree, and are absent outside', () => {
    // A `<wrap>` element that, while its descendants are imported,
    // overrides the meaning of `<x>`. Outside the `<wrap>` subtree the
    // overlay isn't installed, so the cost of the overlay rule isn't
    // paid for unrelated `<x>` elements.
    let overlayHits = 0;
    const WrapRule = defineImportRule({
      $import: (ctx, el) => {
        const out: LexicalNode[] = [];
        for (const node of ctx.$importChildren(el, {rules: overlay})) {
          out.push(node);
        }
        return out;
      },
      match: sel.tag('wrap'),
      name: 'test/wrap',
    });
    const overlay = defineOverlayRules([
      defineImportRule({
        $import: () => {
          overlayHits++;
          const p = $createParagraphNode();
          p.append($createTextNode('[overlay-x]'));
          return [p];
        },
        match: sel.tag('x'),
        name: 'test/overlay-x',
      }),
    ]);
    // A second top-level `<x>` rule that produces a different marker.
    // Without the overlay it should win.
    const PlainXRule = defineImportRule({
      $import: () => {
        const p = $createParagraphNode();
        p.append($createTextNode('[main-x]'));
        return [p];
      },
      match: sel.tag('x'),
      name: 'test/main-x',
    });
    using editor = buildTestEditor([WrapRule, PlainXRule]);
    $importInto(editor, '<wrap><x></x></wrap><x></x>');
    editor.read(() => {
      const ps = $rootParagraphs();
      expect(ps.map(p => p.getTextContent())).toEqual([
        '[overlay-x]',
        '[main-x]',
      ]);
    });
    expect(overlayHits).toBe(1);
  });

  test('overlay rule `$next()` falls through to the main dispatcher', () => {
    const PlainXRule = defineImportRule({
      $import: () => {
        const p = $createParagraphNode();
        p.append($createTextNode('[main-x]'));
        return [p];
      },
      match: sel.tag('x'),
      name: 'test/main-x',
    });
    const overlay = defineOverlayRules([
      defineImportRule({
        $import: (_ctx, _el, $next) => {
          // Defer to the main rule.
          return $next();
        },
        match: sel.tag('x'),
        name: 'test/overlay-x-deferred',
      }),
    ]);
    const WrapRule = defineImportRule({
      $import: (ctx, el) => ctx.$importChildren(el, {rules: overlay}),
      match: sel.tag('wrap'),
      name: 'test/wrap',
    });
    using editor = buildTestEditor([WrapRule, PlainXRule]);
    $importInto(editor, '<wrap><x></x></wrap>');
    editor.read(() => {
      const [p] = $rootParagraphs();
      expect(p.getTextContent()).toBe('[main-x]');
    });
  });
});

describe('ImportContext helpers', () => {
  test('$getImportContextValue reads default outside an active import', () => {
    using editor = buildTestEditor([]);
    editor.read(() => {
      expect($getImportContextValue(ImportSource)).toBe('unknown');
    });
  });

  test('createImportState creates a fresh state with its own default', () => {
    const myState = createImportState<number>('test/my-state', () => 42);
    using editor = buildTestEditor([]);
    editor.read(() => {
      expect($getImportContextValue(myState)).toBe(42);
    });
  });
});
