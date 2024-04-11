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
| Entrypoint | `packages/lexical-package-name/index.ts` |
| Flow types | `packages/lexical-package/flow/LexicalPackage.js.flow` |
| package.json name | `@lexical/package-name` |

### Multiple module export (@lexical/react)

Instead of having a single module, some packages may have many modules
(currently only `@lexical/react`) that are each exported separately.
In that scenario, there should be no `index.ts` file and every module
at the top-level should be an entrypoint. All entrypoints should be a
TypeScript file, not a subdirectory containing an index.ts file.

The [update-packages](#npm-run-update-packages) script will ensure that the exports match the files
on disk.

## Scripts for development

### npm run update-packages

This script runs: update-version, update-tsconfig, update-flowconfig, and
update-docs. This is safe to do at any time and will ensure that package.json
files are all at the correct versions, paths are set up correctly for module
resolution of all public exports, and that various defaults are filled in.

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
