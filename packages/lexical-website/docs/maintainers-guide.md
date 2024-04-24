# Maintainers' Guide

This is the grimoire of arcane knowledge covering the overall organization
of the Lexical monorepo, including its conventions, quirks, and
configurations.

## Monorepo Organization

### Workspaces

The top-level `package.json` uses
[npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) to
configure the monorepo. This mostly means that all packages share a
top-level `package-lock.json` and `npm run {command} -w {package}` is often
used to run a command from a nested package's package.json.

### Private

Some packages in the monorepo do not get published to npm, for example:

* `packages/lexical-devtools` - browser extension for working with Lexical
  sites
* `packages/lexical-playground` - the
  [playground.lexical.dev](https://playground.lexical.dev/) demo site
* `packages/lexical-website` - the [lexical.dev](https://lexical.dev/)
  docusaurus website that you may even be reading right now
* `packages/shared` - internal code that is used by more than one repository
  but should not be a public API

It is required that these packages, and any other package that should not be
published to npm, have a `"private": true` property in their `package.json`.
If you have an in-progress package that will eventually be public, but is
not ready for consumption, it should probably still be set to
`"private": true` otherwise the tooling will find it and publish it.

## Package naming conventions

### Overall

| Usage | Convention |
| -- | -- |
| Directory name | `packages/lexical-package-name` |
| Entrypoint | `packages/lexical-package-name/src/index.{ts,tsx}` |
| Flow types | `packages/lexical-package/flow/LexicalPackageName.js.flow` |
| package.json name | `@lexical/package-name` |
| Documentation | `packages/lexical-package-name/README.md` |
| Unit Tests | `packages/lexical-package-name/src/__tests__/unit/LexicalPackageName.test.{ts,tsx}` |
| dist (gitignore'd build product) | `packages/lexical-package-name/dist` |
| npm (gitignore'd prerelease product) | `packages/lexical-package-name/npm` |
| www entrypoint | `packages/lexical-package-name/LexicalPackageName.js` |

### Multiple module export (@lexical/react)

Instead of having a single module, some packages may have many modules
(currently only `@lexical/react`) that are each exported separately.
In that scenario, there should be no `index.ts` entrypoint file and every module
at the top-level should be an entrypoint. All entrypoints should be a
TypeScript file, not a subdirectory containing an index.ts file.

The [update-packages](#npm-run-update-packages) script will ensure that the
exports match the files on disk.

## Creating a new package

The first step in creating a new package is to create the workspace, there
is a [npm-init](https://docs.npmjs.com/cli/v10/commands/npm-init) template
that will fill in some of the defaults for you based on conventions.

The example we will use is the steps that were used to create the
`lexical-eslint-plugin`, which will be published to npm as
`@lexical/eslint-plugin`.

### Create the workspace

```
npm init -w packages/lexical-eslint-plugin
```

This only automates the first step, creating a single file:

<details><summary>

`packages/lexical-eslint-plugin/package.json`
</summary>

```json
{
  "name": "@lexical/eslint-plugin",
  "description": "",
  "keywords": [
    "lexical",
    "editor"
  ],
  "version": "0.14.3",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/facebook/lexical.git",
    "directory": "packages/lexical-eslint-plugin"
  },
  "main": "LexicalEslintPlugin.js",
  "types": "index.d.ts",
  "bugs": {
    "url": "https://github.com/facebook/lexical/issues"
  },
  "homepage": "https://github.com/facebook/lexical#readme"
}
```
</details>

Some next steps for this package.json before moving on:

- Update the description
- Add appropriate keywords

### Create the initial source file

```
mkdir -p packages/lexical-eslint-plugin/src
code packages/lexical-eslint-plugin/src/index.ts
```

Here are some minimal examples of those files that you might start out with.
I've elided the license header, the eslint header/header fixer will help you
with that!

<details><summary>

`packages/lexical-eslint-plugin/src/index.ts`
</summary>

```typescript
import {name, version} from '../package.json';

const plugin = {
  meta: {name, version},
  rules: {},
};

export default plugin;
```
</details>

### Run update-packages to generate boilerplate docs & config

```
npm run update-packages
```

This will set up the tsconfig, flow, etc. configuration to recognize your
new module. It will also create an initial README.md using only the
description from the package.json.


### Create an initial unit test

```
mkdir -p packages/lexical-eslint-plugin/src/__tests__/unit
code packages/lexical-eslint-plugin/src/__tests__/unit/LexicalEslintPlugin.test.ts
```


<details><summary>

`packages/lexical-eslint-plugin/src/__tests__/unit/LexicalEslintPlugin.test.ts`
</summary>

```typescript
import plugin from '@lexical/eslint-plugin';

describe('LexicalEslintPlugin', () => {
  it('exports a plugin with meta and rules', () => {
    expect(Object.keys(plugin).sort()).toMatchObject(['meta', 'rules']);
  });
});
```
</details>


## Scripts for development

### npm run update-packages

This script runs: update-version, update-tsconfig, update-flowconfig,
create-docs, and create-www-stubs. This is safe to do at any time and will
ensure that package.json files are all at the correct versions, paths are
set up correctly for module resolution of all public exports, and that
various defaults are filled in.

These scripts can be run individually, but unless you're working on one
of these scripts you might as well run them all.

### npm run prepare-release

This runs all of the pre-release steps and will let you inspect the artifacts
that would be uploaded to npm. Each public package will have a npm directory, e.g.
`packages/lexical/npm` that contains those artifacts.

### npm run ci-check

Check flow, TypeScript, prettier and eslint for issues. A good command to run
after committing (which will auto-fix most prettier issues) and before pushing
a PR.

### npm run flow

Check the Flow types

### npm run tsc

Check the TypeScript types

### npm run tsc-extension

Check the TypeScript types of the lexical-devtools extension

### npm run test-unit

Run the unit tests

### npm run lint

Run eslint

## Scripts for release managers

### npm run increment-version

Increment the monorepo version. Make sure to run `npm run update-packages`
after this.

### npm run extract-codes

Extract error codes for the production build. Essential to run before a release.

### npm run changelog

Update the changelog from git history.

### npm run release

*Prerequisites:* all of the previous release manager scripts,
plus creating a tag in git, and likely other steps.

Runs prepare-release to do a full build and then uploads to npm.
