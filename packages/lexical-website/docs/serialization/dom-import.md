# DOMImportExtension

:::warning Experimental

`DOMImportExtension` and everything described on this page are marked
`@experimental` and may change between any two Lexical releases —
including breaking renames, signature changes, or behavior changes —
until the API stabilizes. We track issues and proposals in the
[GitHub repo](https://github.com/facebook/lexical); breaking changes
will be called out in release notes. Apps that depend on this
pipeline should pin their Lexical version and treat upgrades as
intentional.

The legacy static `importDOM` machinery and `$generateNodesFromDOM`
entry are unchanged and remain the supported default for production
apps that don't want to track an experimental API.

:::

The DOM import system in `@lexical/html` lets you convert any HTML or
DOM tree into Lexical nodes. The legacy entry — the static
`importDOM` declared on each node class — still works, but for new
code we offer an extension-based pipeline (`DOMImportExtension`) with
typed selectors, middleware-style rules, structural schemas,
configurable whitespace handling, and a dedicated context system. It's
designed for performance, ergonomics, and composability across
extensions.

The new pipeline ships side-by-side with the legacy one in
`@lexical/html`; the default `$generateNodesFromDOM` is unchanged. To
opt in, depend on `DOMImportExtension` (or a higher-level bundle like
`CoreImportExtension` / `RichTextImportExtension` / etc.) and read the
imported nodes from the extension's `$generateNodesFromDOM` output.

## Quick start

The smallest editor that imports HTML through the extension pipeline:

```ts
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  CoreImportExtension,
  DOMImportExtension,
} from '@lexical/html';
import {$getRoot, defineExtension} from 'lexical';

const editor = buildEditorFromExtensions(
  defineExtension({
    name: 'app',
    dependencies: [CoreImportExtension],
  }),
);

const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
editor.update(() => {
  const dom = new DOMParser().parseFromString(
    '<p>Hello <strong>world</strong></p>',
    'text/html',
  );
  const nodes = dep.output.$generateNodesFromDOM(dom);
  $getRoot().clear().splice(0, 0, nodes);
});
```

`CoreImportExtension` ships the rules that cover `<p>`, `<span>`,
inline format tags (`<b>`, `<strong>`, `<em>`, `<i>`, `<code>`,
`<mark>`, `<s>`, `<sub>`, `<sup>`, `<u>`), `<br>`, and `#text` —
everything the core lexical package's legacy `importDOM` machinery
handled. Higher-level bundles you can drop in alongside:

| Extension | Provides |
| --- | --- |
| `CoreImportExtension` (`@lexical/html`) | `<p>`, `<span>`, inline format tags, `<br>`, `#text` |
| `HorizontalRuleImportExtension` (`@lexical/html`) | `<hr>` |
| `RichTextImportExtension` (`@lexical/rich-text`) | `<h1>`–`<h6>`, `<blockquote>`, Google Docs 26pt-title heuristic |
| `ListImportExtension` (`@lexical/list`) | `<ol>`, `<ul>` (incl. checklist detection), `<li>`, GitHub task list, Joplin checkbox |
| `LinkImportExtension` (`@lexical/link`) | `<a>` |
| `TableImportExtension` (`@lexical/table`) | `<table>`, `<tr>`, `<td>`, `<th>` |
| `CodeImportExtension` (`@lexical/code-core`) | `<pre>`, multi-line `<code>`, monospace `<div>`, GitHub raw-file-view tables |

Each bundle depends on `CoreImportExtension` (the inline-format rules
are nearly always wanted) and on the corresponding node-providing
extension where possible, so you only have to list the import
extension in your editor's dependency tree.

:::tip

The legacy entry `$generateNodesFromDOM(editor, dom)` and the new
extension's `dep.output.$generateNodesFromDOM(dom)` both live in
`@lexical/html`. Tell them apart by signature: the legacy takes the
editor first, the new one takes only the DOM (plus optional
`{context, preprocess}`).

:::

## Rules

A rule is the unit of work in the extension. Each rule is built with
`defineImportRule`:

```ts
import {defineImportRule, sel} from '@lexical/html';
import {$createParagraphNode} from 'lexical';

const ParagraphRule = defineImportRule({
  name: '@app/p',
  match: sel.tag('p'),
  $import: (ctx, el) => {
    const p = $createParagraphNode();
    p.splice(0, 0, ctx.$importChildren(el));
    return [p];
  },
});
```

A rule has three parts:

1. **`match`** — an opaque `CompiledSelector` produced by `sel.*`. The
   dispatcher buckets rules by tag at compile time so the per-node
   dispatch cost is bounded by the number of rules registered for
   that tag (typically one or two).
2. **`$import`** — middleware-style function `(ctx, node, $next) =>
   readonly LexicalNode[]`. The element type of `node` is narrowed by
   the selector (e.g. `sel.tag('a')` gives `HTMLAnchorElement`,
   `sel.text()` gives `Text`). Return `[]` to drop the element, or
   call `$next()` to defer to the next-lower matching rule.
3. **`name`** (optional) — surfaces in dev-mode warnings and error
   traces. Convention: `'@scope/package/rule-id'`.

### Dispatch order

When multiple rules match the same element, the one registered LATER
wins (higher priority). `mergeConfig` prepends `partial.rules` to the
existing list, so an extension's rules run before the rules its
dependencies contributed. Within a single extension's `rules` array,
the first entry has highest priority.

```ts
configExtension(DOMImportExtension, {
  rules: [
    // Tries this first
    SpecificParagraphRule,
    // Falls back to this via $next()
    GenericParagraphRule,
  ],
})
```

Calling `$next()` from a rule walks the chain — the next-lower
matching rule fires; if none, the framework's catch-all
`DefaultHoistRule` descends into the element's children. Returning
`[]` from a rule short-circuits: nothing else runs and the element is
dropped.

### `$next()` as a wrapper

The middleware shape is strictly more powerful than the legacy
numeric `priority`. A rule can call `$next()`, inspect the result,
and transform it — perfect for cross-cutting decorators:

```ts
const IdAttributeRule = defineImportRule({
  name: '@app/id-decorator',
  match: sel.any().attr('id', /\S/),
  $import: (ctx, el, $next) => {
    const out = $next();
    if (out.length === 1) {
      $setState(out[0], idState, el.getAttribute('id')!);
    }
    return out;
  },
});
```

Registered late (i.e. early in your `rules` array), this rule fires
for every styled element BEFORE the tag-specific rule, calls `$next()`
to get the produced node, and tags it with state. No tag-specific
machinery needs to know about `id`.

## Selectors

Build selectors with the combinator API:

```ts
sel.any()                                       // any HTMLElement
sel.tag('a')                                    // <a> only (typed as HTMLAnchorElement)
sel.tag('h1', 'h2', 'h3', 'h4', 'h5', 'h6')     // typed as HTMLHeadingElement
sel.text()                                      // text nodes
sel.comment()                                   // comment nodes
sel.tag('li').classAll('task-list-item')        // <li class="task-list-item …">
sel.tag('span').classAny('hl', 'mark')          // <span class="hl|mark …">
sel.tag('a').attr('href', /^https:/)            // <a href> matching a regex
sel.tag('a').attr('target', 'true')             // attribute present
sel.tag('a').attr('href', '/wiki')              // exact value
sel.tag('span').styleAny('fontSize', /^(\d+)pt/) // inline-style match
```

A CSS-subset parser is also available for terse selectors:

```ts
sel.css('p.google-docs-title')      // tag + class
sel.css('h1, h2, h3, h4, h5, h6')   // tag list
sel.css('img[src]')                 // attribute presence
sel.css('a[href="/wiki"]')          // attribute equality
```

`sel.css` covers the basics (tag, `.class`, `#id`, `[attr]`,
`[attr="val"]`, comma-separated lists, `*`). For anything outside that
subset (regex attribute, inline-style match, capturing), chain
combinator methods off the result:

```ts
sel.css('pre').attr('class', /(?:^|\s)language-(\S+)/, {capture: 'lang'})
```

The grammar deliberately excludes descendant combinators (`>`, ` `)
and `:not` — see [Context](#context) below for the idiomatic
replacements.

### Captured matches

Pass `{capture: 'name'}` to `attr` or `styleAny` and the
`RegExpMatchArray` for the successful match is surfaced on
`ctx.captures.name`, fully typed:

```ts
const CodeBlockRule = defineImportRule({
  name: '@app/pre-code',
  match: sel
    .tag('pre')
    .attr('class', /(?:^|\s)language-(\S+)/, {capture: 'lang'}),
  $import: (ctx, el) => {
    // ctx.captures.lang: RegExpMatchArray
    const language = ctx.captures.lang[1];
    const node = $createCodeNode(language);
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
  },
});
```

The selector's element type and captures map both flow into `$import`'s
signature, so you never need to cast `el` or re-run the regex inside
the rule body.

:::tip

If your selector becomes a runtime function (a `(node) => boolean`
guard), the rule lands in the wildcard bucket and is consulted for
every element — expensive. Push as much as possible into the selector
itself; do the remaining refinement inside the rule body, calling
`$next()` to defer when the body decides not to handle the element.

```ts
defineImportRule({
  match: sel.tag('img'),  // tag bucket — cheap
  $import: (ctx, el, $next) => {
    if (!el.src || el.src.startsWith('data:')) {
      return $next();      // body refinement
    }
    return [$createImageNode({src: el.src, alt: el.alt})];
  },
});
```

:::

## Schemas

A rule's `$import` body uses `ctx.$importChildren(parent, {schema})`
to recursively import children. The schema enforces what node types
are allowed in this position and how to package non-conforming runs:

```ts
interface ChildSchema {
  accepts(child: LexicalNode, parent: LexicalNode | null): boolean;
  packageRun?(rejected: LexicalNode[], ...): LexicalNode[];
  onReject?: 'hoist' | 'drop';
  finalize?(children: LexicalNode[], ...): LexicalNode[];
}
```

Built-ins, all from `@lexical/html`:

| Schema | Accepts | Rejected runs |
| --- | --- | --- |
| `BlockSchema` | Block ElementNodes and block DecoratorNodes | Wrapped in a fresh `ParagraphNode` (preserves `text-align`) |
| `RootSchema` | Same as `BlockSchema` — aliased for clarity at the entry point | Same |
| `InlineSchema` | Inline ElementNodes, TextNodes, inline DecoratorNodes | Dropped |
| `NestedBlockSchema` | Block nodes | Inline runs pass through unchanged (no extra paragraph wrapping) |

Per-package schemas:

| Schema | Accepts | Rejected runs |
| --- | --- | --- |
| `ListSchema` (`@lexical/list`) | `ListItemNode`, nested `ListNode` | Wrapped in a paragraph inside a synthetic `ListItemNode` |
| `TableSchema` (`@lexical/table`) | `TableRowNode` | If all cells, wrapped in a synthetic `TableRowNode`; else dropped |
| `TableRowSchema` (`@lexical/table`) | `TableCellNode` | Dropped |

A rule typically passes a schema when it knows its children's
allowed type — the legacy `wrapContinuousInlines` and
`ArtificialNode__DO_NOT_USE` cases are now `BlockSchema` and
`NestedBlockSchema` respectively:

```ts
const HeadingRule = defineImportRule({
  match: sel.tag('h1', 'h2', 'h3', 'h4', 'h5', 'h6'),
  $import: (ctx, el) => {
    const node = $createHeadingNode(el.nodeName.toLowerCase() as HeadingTagType);
    node.splice(0, 0, ctx.$importChildren(el, {schema: InlineSchema}));
    return [node];
  },
});
```

Custom schemas implement `ChildSchema` directly. Both `accepts` and
the optional `packageRun` are pure functions — no editor state
required.

## Context

`ImportContext` is the per-rule environment exposed as `ctx` to
`$import`. It provides:

- `ctx.editor` — the active `LexicalEditor`.
- `ctx.captures` — typed regex captures from this rule's selector.
- `ctx.get(cfg)` — read an `ImportStateConfig` value.
- `ctx.$importChildren(parent, opts)` — recurse into children.
- `ctx.$importOne(node, opts)` — recurse into one node.
- `ctx.session` — per-import mutable store (see [Sessions](#sessions)).

### State configs and `ctx.get`

`createImportState` mints a typed key, similar to `createState` for
node state but scoped to the import pipeline:

```ts
import {createImportState} from '@lexical/html';

const ImportMode = createImportState<'paste' | 'deserialize'>(
  'app/importMode',
  () => 'paste',
);
```

Rules read it with `ctx.get(ImportMode)`. The value is supplied
either as a `contextDefaults` entry on the extension config (sticks
for every import call) or as a per-call `context` override on
`$generateNodesFromDOM`:

```ts
dep.output.$generateNodesFromDOM(dom, {
  context: [contextValue(ImportMode, 'deserialize')],
});
```

A nested `$importChildren` can also branch context for its descendants
via `opts.context`:

```ts
ctx.$importChildren(el, {
  context: [contextValue(ImportTextFormat, ctx.get(ImportTextFormat) | IS_BOLD)],
});
```

Branched values are restored on the way back out — siblings outside
the branched subtree see the unchanged inherited value.

### Built-in states

`@lexical/html` ships several states out of the box:

- **`ImportSource`** (`'paste' | 'drop' | 'deserialize' | 'headless' | 'unknown'`)
  — identifies how this import started. Rules can branch on it to
  adapt behavior (be lenient on `'deserialize'`, preserve whitespace
  on `'paste'`).
- **`ImportTextFormat`** (`number`, a `TextFormatType` bitmask) —
  used by the inline-format rules (`<b>`, `<strong>`, `<em>`, …) to
  propagate format bits to descendant TextNodes. Replaces the legacy
  `forChild` chain that the inline tags previously used. Build your
  own format propagation by branching this state.
- **`ImportWhitespaceConfig`** — controls text-node whitespace
  handling (which DOM elements preserve whitespace, which count as
  inline siblings). See below.

### `ImportWhitespaceConfig`

The text-node whitespace handler walks DOM siblings to decide
whether trailing/leading spaces should be preserved (the neighbor is
inline text) or collapsed (the neighbor is a block boundary). Two
predicates govern this:

```ts
interface WhitespaceImportConfig {
  preservesWhitespace: (node: Node) => boolean;
  isInline: (node: Node) => boolean;
}
```

The defaults match the legacy behavior: an element preserves
whitespace if its `nodeName` is `'PRE'` or its inline `style.whiteSpace`
starts with `'pre'`; an element is inline if its inline `style.display`
starts with `'inline'` or its tag name is in the standard inline-tag
set used by lexical core's `isInlineDomNode` / `isBlockDomNode`
helpers (`a`, `abbr`, `acronym`, `b`, `cite`, `code`, `del`, `em`,
`i`, `ins`, `kbd`, `label`, `mark`, `output`, `q`, `ruby`, `s`,
`samp`, `span`, `strong`, `sub`, `sup`, `time`, `u`, `tt`, `var`).
The canonical list lives in `packages/lexical/src/LexicalUtils.ts` —
see the `INLINE_TAG_RE` / `BLOCK_TAG_RE` exports if you want to
inspect or extend the defaults.

To recognize custom tags (e.g. a custom `<tooltip>` that should be
treated as inline so the spaces around it survive), override the
predicate:

```ts
import {
  contextValue,
  defaultIsInline,
  defaultPreservesWhitespace,
  ImportWhitespaceConfig,
} from '@lexical/html';
import {isHTMLElement} from 'lexical';

configExtension(DOMImportExtension, {
  contextDefaults: [
    contextValue(ImportWhitespaceConfig, {
      isInline: (node) =>
        defaultIsInline(node) ||
        (isHTMLElement(node) && node.nodeName === 'TOOLTIP'),
      preservesWhitespace: defaultPreservesWhitespace,
    }),
  ],
})
```

This is the declarative replacement for setting `display: inline` on
the element from inside an extended TextNode importer.

## Sessions

`ImportSession` is a mutable, document-order-shared store on `ctx`.
Use it to make information from a node visited earlier in the
document available to nodes visited later — e.g. a `<style>` /
`<meta>` tag at the top of the document influencing how later
elements are interpreted.

```ts
import {createImportSessionState} from '@lexical/html';

const Stylesheets = createImportSessionState<string[]>(
  'app/stylesheets',
  () => [],
);

const CollectStyleSheetsRule = defineImportRule({
  match: sel.tag('style'),
  $import: (ctx, el) => {
    ctx.session.update(Stylesheets, (prev) => [
      ...prev,
      el.textContent ?? '',
    ]);
    return [];
  },
});

const ConsumesStyleSheetsRule = defineImportRule({
  match: sel.tag('article'),
  $import: (ctx, el) => {
    const sheets = ctx.session.get(Stylesheets);
    // ... use the collected stylesheet text however the app needs
  },
});
```

A fresh `ImportSession` is created for every top-level
`$generateNodesFromDOM` call. Compare with
`ImportStateConfig` (which is **immutable** and **scoped** —
`branch` to a child via `opts.context`, automatically restored on
return) versus `ImportSession` (which is **mutable** and
**flat** — write once, read anywhere in this import call).

## Preprocessors

Before walking begins, `DOMImportExtension` runs a stack of
preprocessors against the input DOM. They're middleware-shaped:

```ts
type DOMPreprocessFn = (
  dom: Document | ParentNode,
  ctx: DOMPreprocessContext,
  next: () => void,
) => void;
```

Each step can:

- Mutate the DOM in place (e.g. inline stylesheet rules onto
  matching elements, strip unsafe nodes, normalize attributes,
  resolve relative URLs).
- Write to `ctx.session` (same session the walk will see on
  `ctx.session`).
- Call `ctx.setContext(cfg, value)` to install a context value for
  the entire walk.
- Call `next()` to defer to the next-lower preprocessor (top of stack
  runs first); skip the call to short-circuit.

The default config registers
[`inlineStylesFromStyleSheets`](#inlinestylesfromstylesheets) — the
same Excel-flavored CSS preprocess the legacy
`$generateNodesFromDOM` uses. Apps append more preprocessors via
`DOMImportConfig.preprocess` or per-call via
`GenerateNodesFromDOMOptions.preprocess`.

```ts
const StripScripts: DOMPreprocessFn = (dom, _ctx, next) => {
  const root = 'body' in dom ? dom.body : (dom as ParentNode);
  for (const el of Array.from(root.querySelectorAll('script'))) {
    el.remove();
  }
  next();
};

configExtension(DOMImportExtension, {
  preprocess: [StripScripts],
})
```

### Reading meta tags into context

A common pattern: a preprocess step inspects a `<meta>` tag (or any
DOM marker), then layers a typed context value the rest of the walk
can branch on.

```ts
import {createImportState} from '@lexical/html';

const DocumentLanguage = createImportState<string>(
  'app/documentLanguage',
  () => 'unknown',
);

const ReadMetaLang: DOMPreprocessFn = (dom, ctx, next) => {
  const root = 'body' in dom ? dom.body : (dom as ParentNode);
  const meta = root.querySelector('meta[name="content-language"]');
  if (meta && meta.getAttribute('content')) {
    ctx.setContext(DocumentLanguage, meta.getAttribute('content')!);
  }
  next();
};
```

### `inlineStylesFromStyleSheets`

The default preprocessor resolves CSS rules from `<style>` tags onto
matching elements as inline styles, so the rest of the pipeline can
read those styles via plain `el.style.foo`. Apps like Excel paste
HTML in this shape; the preprocess collapses the indirection so rule
selectors and bodies don't need to chase stylesheets themselves.
Re-exported as a `DOMPreprocessFn` for apps that want to compose
their own preprocess pipeline:

```ts
import {inlineStylesFromStyleSheets} from '@lexical/html';

configExtension(DOMImportExtension, {
  preprocess: [
    // Run before the default — useful if your custom preprocess
    // expects the styles to already be inlined.
    inlineStylesFromStyleSheets,
    AppPreprocess,
  ],
});
```

## `$importChildren` rules overlay

`ctx.$importChildren(parent, {rules: [...]})` installs an **overlay**
dispatcher active only for the duration of that children traversal
(and nested `$importChildren` calls that don't push their own
overlay). Overlay rules are checked BEFORE the main dispatcher;
calling `$next()` from an overlay rule falls through to the next
overlay-or-main rule.

This lets you scope cost-bearing rules to the subtrees where they
apply, rather than paying the predicate cost on every paste. The
GitHub raw-file-view code-table rule in `@lexical/code-core` uses
the overlay to unwrap `<tr>` / `<td>` only while processing a code
table:

```ts
const GitHubCodeTableOverlayRules = [
  defineImportRule({
    match: sel.tag('tr', 'td'),
    $import: (ctx, el) => ctx.$importChildren(el),
    name: '@lexical/code/github-code-table/unwrap',
  }),
];

const GitHubCodeTableRule = defineImportRule({
  match: sel.tag('table').classAll('js-file-line-container'),
  $import: (ctx, el) => {
    const node = $createCodeNode();
    node.splice(
      0,
      0,
      ctx.$importChildren(el, {rules: GitHubCodeTableOverlayRules}),
    );
    return [node];
  },
});
```

Outside the code table, the `tr` / `td` rule from `@lexical/table` is
the only one consulted; the overlay's unwrap rule isn't even compiled
unless we enter a code-table subtree.

## ClipboardImportExtension

The clipboard's paste handler (`$insertDataTransferForRichText`)
delegates to `ClipboardImportExtension`. Its output owns the full
paste-side iteration: it walks a per-MIME-type priority list, reads
the corresponding `DataTransfer` slot, and invokes that MIME type's
handler stack.

`ClipboardImportConfig` mirrors `GetClipboardDataExtension`:

```ts
export interface ClipboardImportConfig {
  $importMimeType: ImportMimeTypeConfig;
  priority: ImportMimeTypePriority;
}
```

- `$importMimeType` — per-MIME-type stack of middleware functions
  `(data, selection, editor, next) => boolean`. Top of stack runs
  first; `next()` defers to the next-lower; return `true` to claim
  the data.
- `priority` — a per-MIME-type weight map (`Record<string, number>`,
  lower runs first). Composable: each extension contributes weights
  for its own MIME types without coordinating with others.

```ts
configExtension(ClipboardImportExtension, {
  $importMimeType: {
    'application/vnd.myapp+json': [
      (data, selection, editor) => {
        const nodes = parseMyAppFormat(data);
        $insertGeneratedNodes(editor, nodes, selection);
        return true;
      },
    ],
  },
  // Slot between 'application/x-lexical-editor' (0) and 'text/html' (10).
  priority: {'application/vnd.myapp+json': 5},
})
```

### Routing pastes through `DOMImportExtension`

Pair `ClipboardImportExtension` with
`$generateNodesFromDOMViaExtension` to send pasted HTML through the
new pipeline:

```ts
import {
  ClipboardImportExtension,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import {
  $generateNodesFromDOMViaExtension,
  contextValue,
  CoreImportExtension,
  DOMImportExtension,
  ImportSource,
} from '@lexical/html';

defineExtension({
  name: 'app',
  dependencies: [
    CoreImportExtension,
    configExtension(ClipboardImportExtension, {
      $importMimeType: {
        'text/html': [
          (html, selection, editor) => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, 'text/html');
            const nodes = $generateNodesFromDOMViaExtension(editor, dom, {
              context: [contextValue(ImportSource, 'paste')],
            });
            $insertGeneratedNodes(editor, nodes, selection);
            return true;
          },
        ],
      },
    }),
  ],
});
```

Apps that don't configure `ClipboardImportExtension` keep the legacy
behavior — `$insertDataTransferForRichText` falls back to the same
defaults the legacy code path uses, including the legacy
`$generateNodesFromDOM` for HTML.

## Migrating from `importDOM`

The legacy `static importDOM(): DOMConversionMap` declaration on each
node class still works; the new pipeline is opt-in. When you're
ready to move a custom node, the translation is mechanical:

| Legacy concept | New equivalent |
| --- | --- |
| `static importDOM(): DOMConversionMap` returning `{tag: () => ({conversion, priority})}` | One or more `defineImportRule({match, $import})` entries |
| Numeric `priority` (0–4) | Rule registration order (later-registered runs first) plus `$next()` for deferring |
| `forChild(node, parent)` | `ctx.$importChildren(el, {context: [...], $onChild})` |
| `after(children)` | `ctx.$importChildren(el, {$after})` |
| `wrapContinuousInlines` (block ancestor case) | `ctx.$importChildren(el, {schema: BlockSchema})` |
| `ArtificialNode__DO_NOT_USE` (nested block) | `ctx.$importChildren(el, {schema: NestedBlockSchema})` |
| Cross-tag setup via shared state | `createImportState` + `ctx.get`, or `createImportSessionState` + `ctx.session` |
| Mutating the DOM before walking | `DOMPreprocessFn` in `DOMImportConfig.preprocess` |
| `html: {import: ...}` field on a node-providing extension | `configExtension(DOMImportExtension, {rules: […]})` |

A migrated rule typically replaces a forChild chain with explicit
context propagation (clearer + survives across rule boundaries), and
an `after` callback with either `$after` (when the post-processing
runs on this rule's children) or a schema's `packageRun` / `finalize`
(when the same logic belongs to anything appending to this kind of
parent).

## Capabilities

Current:

- Typed selectors with element-narrowing through to `$import`'s
  signature; no instanceof or cast boilerplate.
- Middleware `$next()` chain replaces numeric priority.
- Per-rule capture map (`ctx.captures`) avoids re-running regex
  inside the rule body.
- `ChildSchema` enforces structural invariants (block/inline/list/
  table/code) without per-importer wrapping logic.
- Per-call context (`ImportSource`), persistent context state
  (`ImportTextFormat`, `ImportWhitespaceConfig`, app-defined).
- Mutable session store for document-order-shared info.
- DOM preprocess middleware (default: stylesheet inlining).
- Subtree-scoped `rules` overlay for cost-bearing predicates.
- Clipboard pipeline owns the whole `DataTransfer` iteration via
  `ClipboardImportExtension`; per-MIME-type priority weights compose
  across extensions.

Future:

- The default pipeline (`$generateNodesFromDOM` and the static
  `importDOM` methods on lexical-core node classes) still works
  side-by-side. There is no plan in this iteration to flip the
  default — both will coexist while ecosystem migrates.
