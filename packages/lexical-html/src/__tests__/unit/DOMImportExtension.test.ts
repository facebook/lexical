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
  BlockSchema,
  contextValue,
  createImportState,
  defineImportRule,
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
  ParagraphNode,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

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
    link.append(...ctx.$importChildren(el, {schema: InlineSchema}));
    return [link];
  },
  match: sel.tag('a'),
  name: 'test/anchor',
});

const ParagraphRule = defineImportRule({
  $import: (ctx, el) => {
    const p = $createParagraphNode();
    p.append(...ctx.$importChildren(el, {schema: InlineSchema}));
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
      capP.append(...ctx.$importChildren(cap, {schema: InlineSchema}));
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
    p.append(...ctx.$importChildren(el, {schema: InlineSchema}));
    $setState(p, sourceState, ctx.get(ImportSource));
    return [p];
  },
  match: sel.tag('div'),
  name: 'test/source-aware',
});

function buildTestEditor(extraRules: ReturnType<typeof defineImportRule>[]) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(DOMImportExtension, {
          rules: extraRules,
        }),
      ],
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

describe('DOMImportExtension', () => {
  test('basic anchor import + id decorator', () => {
    using editor = buildTestEditor([
      IdAttributeRule,
      AnchorRule,
      ParagraphRule,
      TextRule,
    ]);
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p><a id="x" href="https://example.com">link</a></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const root = $getRoot();
      const para = root.getFirstChild();
      expect($isParagraphNode(para)).toBe(true);
      const link = (para as ParagraphNode).getFirstChild();
      expect($isLinkNode(link)).toBe(true);
      expect($getState(link as LexicalNode, idState)).toBe('x');
      expect((link as LinkNode).getURL()).toBe('https://example.com/');
      const text = (link as LinkNode).getFirstChild();
      expect($isTextNode(text)).toBe(true);
      expect((text as TextNode).getTextContent()).toBe('link');
    });
  });

  test('text format propagation via ImportTextFormat context', () => {
    using editor = buildTestEditor([
      BoldRule,
      ItalicRule,
      ParagraphRule,
      TextRule,
    ]);
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p>plain <b>bold <i>italicbold</i></b></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const para = $getRoot().getFirstChild() as ParagraphNode;
      const texts = para.getChildren();
      expect(texts.length).toBe(3);
      expect((texts[0] as TextNode).getTextContent()).toBe('plain ');
      expect((texts[0] as TextNode).getFormat()).toBe(0);
      expect((texts[1] as TextNode).getTextContent()).toBe('bold ');
      expect((texts[1] as TextNode).hasFormat('bold')).toBe(true);
      expect((texts[1] as TextNode).hasFormat('italic')).toBe(false);
      expect((texts[2] as TextNode).getTextContent()).toBe('italicbold');
      expect((texts[2] as TextNode).hasFormat('bold')).toBe(true);
      expect((texts[2] as TextNode).hasFormat('italic')).toBe(true);
    });
  });

  test('RootSchema wraps stray inline runs in paragraphs', () => {
    using editor = buildTestEditor([ParagraphRule, TextRule, BoldRule]);
    editor.update(
      () => {
        const nodes = $generate(editor, 'orphan <b>inlines</b> at root');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const root = $getRoot();
      expect(root.getChildrenSize()).toBe(1);
      const para = root.getFirstChild() as ParagraphNode;
      expect($isParagraphNode(para)).toBe(true);
      expect(para.getTextContent()).toBe('orphan inlines at root');
    });
  });

  test('sibling-emitting rule (<figure> -> two paragraphs)', () => {
    using editor = buildTestEditor([FigureRule, ParagraphRule, TextRule]);
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<figure><img src="x" alt="cat"/><figcaption>A cat.</figcaption></figure>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const children = $getRoot().getChildren();
      expect(children.length).toBe(2);
      expect((children[0] as ParagraphNode).getTextContent()).toBe('[img:cat]');
      expect((children[1] as ParagraphNode).getTextContent()).toBe('A cat.');
    });
  });

  test('$next() deferral: code rule defers to next on non-language code', () => {
    using editor = buildTestEditor([CodeRule, ParagraphRule, TextRule]);
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<pre><code class="language-js">x</code></pre><pre><code>y</code></pre>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const children = $getRoot().getChildren();
      // The first <pre> is caught by CodeRule. The second has no language
      // class, so CodeRule's $next() falls through; with no other rule for
      // <pre>, the dispatcher hoists children (the <code>'s text "y") which
      // RootSchema wraps in a paragraph.
      expect(children.length).toBe(2);
      expect((children[0] as ParagraphNode).getTextContent()).toBe('[code:js]');
      expect((children[1] as ParagraphNode).getTextContent()).toBe('y');
    });
  });

  test('regex capture is exposed on ctx.captures without re-running', () => {
    using editor = buildTestEditor([CodeCaptureRule]);
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<pre data-language="rust">irrelevant</pre>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect(p.getTextContent()).toBe('[capture:rust]');
    });
  });

  test('per-call context: ImportSource flows to rule body', () => {
    using editor = buildTestEditor([SourceAwareRule, TextRule]);
    editor.update(
      () => {
        const nodes = $generate(editor, '<div>x</div>', {
          context: [contextValue(ImportSource, 'paste')],
        });
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect($getState(p, sourceState)).toBe('paste');
    });

    editor.update(
      () => {
        const nodes = $generate(editor, '<div>x</div>', {
          context: [contextValue(ImportSource, 'deserialize')],
        });
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect($getState(p, sourceState)).toBe('deserialize');
    });
  });

  test('per-call context default is "unknown"', () => {
    using editor = buildTestEditor([SourceAwareRule, TextRule]);
    editor.update(
      () => {
        const nodes = $generate(editor, '<div>x</div>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect($getState(p, sourceState)).toBe('unknown');
    });
  });

  test('rule priority: later-registered rule runs first; can call $next()', () => {
    using editor = buildTestEditor([
      // First in list = higher priority. The id decorator wraps the anchor
      // importer below.
      IdAttributeRule,
      AnchorRule,
      ParagraphRule,
      TextRule,
    ]);
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p><a id="link-x" href="/y">click</a></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const link = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getFirstChild();
      expect($isLinkNode(link)).toBe(true);
      expect($getState(link as LexicalNode, idState)).toBe('link-x');
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
    editor.update(
      () => {
        const nodes = $generate(editor, '<p class="foo">x</p><p>y</p>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const children = $getRoot().getChildren();
      expect((children[0] as ParagraphNode).getTextContent()).toBe('[matched]');
      expect((children[1] as ParagraphNode).getTextContent()).toBe('y');
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
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<span class="highlight" data-lang="go">x</span>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect(p.getTextContent()).toBe('[combo:go]');
    });
  });

  test('isElementOfTag narrows correctly without instanceof', () => {
    const dom = new JSDOM(
      '<!doctype html><html><body><a href="x"></a><p></p></body></html>',
    );
    const anchor = dom.window.document.body.firstElementChild!;
    const para = dom.window.document.body.lastElementChild!;
    expect(isElementOfTag(anchor, 'a')).toBe(true);
    expect(isElementOfTag(anchor, 'p')).toBe(false);
    expect(isElementOfTag(para, 'p')).toBe(true);
  });

  test('compileImportRules: unknown tags hit wildcard bucket', () => {
    using editor = buildTestEditor([IdAttributeRule, ParagraphRule, TextRule]);
    editor.update(
      () => {
        // Custom element with an id — only the id decorator matches; the
        // dispatcher then hoists children (the text "z") which RootSchema
        // wraps in a paragraph. We can't decorate the paragraph because
        // the id rule sees the result of $next() applied to the custom
        // element, which is the hoisted text only.
        const nodes = $generate(editor, '<my-thing id="custom">z</my-thing>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect(p.getTextContent()).toBe('z');
      // id decorator's $next() returned [TextNode], a single node, so the id
      // gets set on the text.
      const text = p.getFirstChild() as TextNode;
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
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<section>inline<p>block</p>more inline</section>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
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
        // First call inside <b>: format propagates.
        const a = $generate(editor, '<p><b>x</b></p>');
        // Second call outside <b>: format must NOT carry over.
        const b = $generate(editor, '<p>y</p>');
        $getRoot()
          .clear()
          .append(...a, ...b);
      },
      {discrete: true},
    );
    editor.read(() => {
      const [p1, p2] = $getRoot().getChildren() as ParagraphNode[];
      expect((p1.getFirstChild() as TextNode).hasFormat('bold')).toBe(true);
      expect((p2.getFirstChild() as TextNode).hasFormat('bold')).toBe(false);
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
