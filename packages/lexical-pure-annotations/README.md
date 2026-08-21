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

## Options

| Option | Default | Description |
| --- | --- | --- |
| `functions` | `PURE_FACTORY_FUNCTIONS` | Names of the factories whose module-scope calls are annotated. Pass your own list (or `[...PURE_FACTORY_FUNCTIONS, 'myFactory']`) to cover factories of your own. |
| `include` | every `.js`/`.jsx`/`.ts`/`.tsx`/`.mjs`/`.cjs`/`.mts`/`.cts` module | `RegExp` (or array) matched against the module id with any query string removed. |
| `exclude` | none | `RegExp` (or array) of module ids to skip. |
| `enforce` | `'post'` | Vite plugin ordering. |
| `parserPlugins` | none | Extra [`@babel/parser`](https://babeljs.io/docs/babel-parser#plugins) plugins, for syntax the defaults do not cover. |
| `sourceMap` | `true` | Set to `false` to skip source map generation. |

Matching is by the name at the call site, so a factory imported under an alias
(`import {defineExtension as define}`) is not annotated. Modules that fail to
parse are passed through unchanged with a warning rather than failing the
build.

The transform is idempotent: a call that already has a `/* @__PURE__ */` (or
terser's `/* #__PURE__ */`) annotation immediately before it is left alone.
