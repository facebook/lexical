/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check

import fs from 'fs-extra';
import {globSync} from 'glob';
import * as hermesParser from 'hermes-parser';
import minimist from 'minimist';

/**
 * Codemod that rewrites `Array<T>` type annotations to the shorthand `T[]`
 * syntax in the manually maintained Flow files. This is the Flow counterpart
 * of the `@typescript-eslint/array-type` ESLint rule (with its autofix) that
 * enforces the same style for TypeScript sources.
 *
 * Usage:
 *   node scripts/flow-array-type-codemod.mjs [--check] [files...]
 *
 * With no arguments it rewrites all `packages/* /flow/*.js.flow` files and
 * the Flow libdefs in `libdefs/*.js` in place. With `--check` it reports the
 * files that would change and exits non-zero instead of writing.
 */

const DEFAULT_PATTERNS = ['packages/*/flow/*.js.flow', 'libdefs/*.js'];

/**
 * Type annotation node types that can be suffixed with `[]` directly without
 * changing how the type parses. Anything else (unions, intersections,
 * nullable `?T`, function types, `typeof`, conditional types, ...) must be
 * wrapped in parentheses first, e.g. `Array<A | B>` -> `(A | B)[]`.
 */
const POSTFIX_SAFE_TYPES = new Set([
  'AnyTypeAnnotation',
  'ArrayTypeAnnotation',
  'BigIntLiteralTypeAnnotation',
  'BigIntTypeAnnotation',
  'BooleanLiteralTypeAnnotation',
  'BooleanTypeAnnotation',
  'EmptyTypeAnnotation',
  'GenericTypeAnnotation',
  'IndexedAccessType',
  'MixedTypeAnnotation',
  'NullLiteralTypeAnnotation',
  'NumberLiteralTypeAnnotation',
  'NumberTypeAnnotation',
  'ObjectTypeAnnotation',
  'OptionalIndexedAccessType',
  'StringLiteralTypeAnnotation',
  'StringTypeAnnotation',
  'SymbolTypeAnnotation',
  'TupleTypeAnnotation',
  'VoidTypeAnnotation',
]);

/**
 * @param {string} source
 * @param {string} sourceFilename
 * @returns {any} the untyped hermes-estree AST
 */
function parse(source, sourceFilename) {
  return hermesParser.parse(source, {
    enableExperimentalComponentSyntax: true,
    flow: 'all',
    sourceFilename,
    sourceType: 'module',
  });
}

/**
 * Collect every `Array<T>` GenericTypeAnnotation node in the AST.
 *
 * @param {any} ast the untyped hermes-estree AST of a Flow file
 * @returns {any[]} the matching untyped AST nodes
 */
function collectArrayTypeNodes(ast) {
  /** @type {any[]} */
  const targets = [];
  hermesParser.SimpleTraverser.traverse(ast, {
    /** @param {any} node an untyped hermes-estree AST node */
    enter: node => {
      if (
        node.type === 'GenericTypeAnnotation' &&
        node.id.type === 'Identifier' &&
        node.id.name === 'Array' &&
        node.typeParameters &&
        node.typeParameters.params.length === 1
      ) {
        targets.push(node);
      }
    },
    leave: () => {},
  });
  return targets;
}

/**
 * Rewrite every `Array<T>` annotation in a Flow source to `T[]`.
 *
 * Works innermost-first to a fixed point: each pass rewrites the `Array<T>`
 * nodes whose type argument contains no nested `Array<...>`, then re-parses
 * so the offsets of the remaining (outer) nodes are recomputed. Re-parsing
 * also guarantees the rewritten source is still syntactically valid.
 *
 * @param {string} source
 * @param {string} sourceFilename
 * @returns {string}
 */
function transformSource(source, sourceFilename) {
  for (;;) {
    const targets = collectArrayTypeNodes(parse(source, sourceFilename));
    if (targets.length === 0) {
      return source;
    }
    const innermost = targets.filter(
      outer =>
        !targets.some(
          inner =>
            inner !== outer &&
            inner.range[0] >= outer.range[0] &&
            inner.range[1] <= outer.range[1],
        ),
    );
    for (const node of innermost.sort((a, b) => b.range[0] - a.range[0])) {
      const param = node.typeParameters.params[0];
      const inner = source.slice(param.range[0], param.range[1]);
      const replacement = POSTFIX_SAFE_TYPES.has(param.type)
        ? `${inner}[]`
        : `(${inner})[]`;
      source =
        source.slice(0, node.range[0]) +
        replacement +
        source.slice(node.range[1]);
    }
  }
}

function main() {
  const argv = minimist(process.argv.slice(2), {boolean: ['check']});
  const patterns = argv._.length > 0 ? argv._.map(String) : DEFAULT_PATTERNS;
  const files = globSync(patterns).sort();
  if (files.length === 0) {
    console.error(`No files matched: ${patterns.join(' ')}`);
    process.exit(1);
  }
  /** @type {string[]} */
  const changed = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const transformed = transformSource(source, file);
    if (transformed !== source) {
      changed.push(file);
      if (!argv.check) {
        fs.writeFileSync(file, transformed);
      }
    }
  }
  if (argv.check && changed.length > 0) {
    console.error(
      `${changed.length} file(s) use Array<T> syntax instead of T[]:`,
    );
    for (const file of changed) {
      console.error(`  ${file}`);
    }
    console.error('Run `node scripts/flow-array-type-codemod.mjs` to fix.');
    process.exit(1);
  }
  for (const file of changed) {
    console.log(`Updated ${file}`);
  }
}

main();
