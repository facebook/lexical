# `@lexical/pure-annotations`

A build-time transform that inserts `/* @__PURE__ */` annotations before
module-scope calls to Lexical's side-effect-free factories (`defineExtension`,
`createCommand`, `createState`, `safeCast`, `defineImportRule`, …) so that
bundlers can tree-shake unused extension, command, and rule definitions out of
application bundles.

Lexical's published `dist` bundles already carry these annotations — this
package is for builds that compile Lexical from its TypeScript source:

- consumers that opt into the `source` export condition
  (`resolve.conditions: ['source', ...]`),
- a vendored copy or a git checkout of the monorepo,
- and your own application code, whose `defineExtension`/`createCommand`
  definitions get annotated the same way.

## Why the annotations are needed

The factories are annotated with `@__NO_SIDE_EFFECTS__` where they are
defined, but esbuild only honors that for calls in the same file as the
definition, and webpack/terser do not honor it at all. Bundlers do honor a
`/* @__PURE__ */` annotation at the call site, and that is what this
transform adds.

Argument-position calls matter too: a pure call is only removable when its
arguments are also side-effect-free, so an unannotated nested `safeCast(...)`
inside a `defineExtension({...})` config pins the whole definition. The
transform annotates every module-scope call, nested ones included.

Calls inside function bodies, class fields, and static blocks are left alone —
they are not evaluated when the module is initialized, so an annotation there
has no effect on tree-shaking.

## Usage

### Vite

```js
// vite.config.js
import {pureAnnotations} from '@lexical/pure-annotations';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [pureAnnotations()],
  resolve: {conditions: ['source']},
});
```

The plugin defaults to `enforce: 'post'` so it runs after Vite has compiled
TypeScript and JSX away.

### Rollup

```js
// rollup.config.js
import {pureAnnotations} from '@lexical/pure-annotations';

export default {
  plugins: [
    // ... any TypeScript/JSX plugin first
    pureAnnotations(),
  ],
};
```

### Any other bundler

`transformPureAnnotations` is the transform itself, with no bundler
integration, so it can be wrapped in a webpack loader or run as a codemod:

```js
import {transformPureAnnotations} from '@lexical/pure-annotations';

const result = transformPureAnnotations(code, {filename});
// `null` when the module needs no annotations
const annotated = result === null ? code : result.code;
```

## Which calls get annotated

A call is annotated only when the transform can establish that the function
being called really is side-effect free. It resolves the callee to its binding
in the module and annotates the call when that binding is:

- **imported from a Lexical package** — a specifier matching `lexical` or
  `@lexical/*` (configurable with `sources`). Every factory in
  `PURE_FACTORY_FUNCTIONS` is declared `@__NO_SIDE_EFFECTS__` in those
  packages, so the import is evidence enough. Aliased imports
  (`import {defineExtension as define}`) are resolved too;
- **declared in the same module with `@__NO_SIDE_EFFECTS__`** — how the
  factory modules themselves are written; or
- **imported from a relative module that declares it `@__NO_SIDE_EFFECTS__`**
  — the imported file is read and parsed to check (turn this off with
  `relativeImports: false`).

Anything else is left alone. Your own `safeCast` from `./utils`, or a
`createCommand` from some other library, will not be annotated just because it
shares a name with a Lexical factory — annotating a call that does have side
effects would let a bundler drop it. Mark your own factories
`@__NO_SIDE_EFFECTS__` (and add them to `functions`) to opt them in.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `functions` | `PURE_FACTORY_FUNCTIONS` | Names of the factories whose module-scope calls are annotated. Pass your own list (or `[...PURE_FACTORY_FUNCTIONS, 'myFactory']`) to cover factories of your own. |
| `sources` | `[/^lexical$/, /^@lexical\//]` | `RegExp` (or array) of module specifiers whose exports are trusted to be the factories without reading them. |
| `relativeImports` | `true` | Whether to read relatively imported modules to look for a `@__NO_SIDE_EFFECTS__` declaration. |
| `include` | every `.js`/`.jsx`/`.ts`/`.tsx`/`.mjs`/`.cjs`/`.mts`/`.cts` module | `RegExp` (or array) matched against the module id with any query string removed. |
| `exclude` | none | `RegExp` (or array) of module ids to skip. |
| `enforce` | `'post'` | Vite plugin ordering. |
| `parserPlugins` | none | Extra [`@babel/parser`](https://babeljs.io/docs/babel-parser#plugins) plugins, for syntax the defaults do not cover. |
| `sourceMap` | `true` | Set to `false` to skip source map generation. |

Modules that fail to parse are passed through unchanged with a warning rather
than failing the build.

The transform is idempotent: a call that already has a `/* @__PURE__ */` (or
terser's `/* #__PURE__ */`) annotation immediately before it is left alone.
