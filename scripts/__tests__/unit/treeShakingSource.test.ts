/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Plugin} from 'esbuild';

import * as fs from 'node:fs';
import * as path from 'node:path';
import {describe, expect, test} from 'vitest';

import {transformPureAnnotations} from '../../../packages/lexical-compiler/src/passes/pureAnnotations.mjs';
import {bareImportResidue} from '../../shared/bareImportResidue.mjs';
import {packagesManager} from '../../shared/packagesManager.mjs';

/**
 * Entries whose bare import is expected to retain code, with the reason. An
 * entry belongs here only when the retained code is the module's purpose —
 * not when a definition happens to be written in a way a bundler cannot see
 * through, which is what the test exists to catch.
 */
const KNOWN_SIDE_EFFECTS = new Map([
  [
    '@lexical/code-prism',
    'registers its language grammars on the global Prism object when imported',
  ],
]);

/**
 * Load the TypeScript sources through @lexical/compiler, as the monorepo's
 * Vite plugin and a consumer of the `source` export condition do, so that the
 * factory calls carry the annotations the build would give them.
 */
const lexicalCompiler: Plugin = {
  name: 'lexical-compiler',
  setup(build) {
    build.onLoad({filter: /\.[cm]?[jt]sx?$/}, args => {
      const code = fs.readFileSync(args.path, 'utf8');
      const result = transformPureAnnotations(code, {
        filename: args.path,
        inline: true,
      });
      return {
        contents: result === null ? code : result.code,
        loader: /\.[cm]?js$/.test(args.path)
          ? 'js'
          : args.path.endsWith('x')
            ? 'tsx'
            : 'ts',
      };
    });
  },
};

/**
 * The npm module names of every published package with the source file that
 * its `source` export condition resolves to.
 */
function sourceEntries(): [string, string][] {
  const entries: [string, string][] = [];
  for (const pkg of packagesManager.getPublicPackages()) {
    for (const [name, exports] of pkg.getNormalizedNpmModuleExportEntries()) {
      const source = (exports as {source?: unknown}).source;
      if (typeof source === 'string' && /\.[cm]?[jt]sx?$/.test(source)) {
        entries.push([name, pkg.resolve(source)]);
      }
    }
  }
  return entries;
}

// The source-level counterpart of scripts/__tests__/integration/tree-shaking:
// it needs no build, so it runs on every change, and it covers what a
// consumer of the `source` export condition bundles. A consumer that imports
// one thing from a Lexical package should pay for that thing alone, which
// holds only when a bare import of the module retains nothing — every
// module-scope statement a bundler cannot prove side-effect free is kept,
// together with everything it references (#9120). A failure prints what was
// kept; the first statement in it is usually the culprit (a module-scope
// property read, an unannotated call, a spread, an `in` test, a `try`, a
// mutation, or a computed class member). Move the work into a function
// declared `@__NO_SIDE_EFFECTS__` so the build annotates the call, or
// annotate a call to a builtin by hand; see AGENTS.md.
describe('a bare import of a package source entry retains nothing', () => {
  for (const [name, file] of sourceEntries()) {
    const reason = KNOWN_SIDE_EFFECTS.get(name);
    test(`${name} (${path.relative(process.cwd(), file)})`, async () => {
      const residue = await bareImportResidue(file, {
        plugins: [lexicalCompiler],
      });
      if (reason !== undefined) {
        // The exception has to keep earning its place.
        expect(residue, `${name} ${reason}`).not.toBe('');
      } else {
        expect(residue).toBe('');
      }
    });
  }
});
