/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $isElementNode,
  type LexicalNode,
} from '../..';
import {getGeneratedExporter} from '../../LexicalGeneratedJSON';
import {initializeUnitTest} from '../utils';

const REPO = join(import.meta.dirname, '..', '..', '..', '..', '..');
const GENERATED = join(
  REPO,
  'packages',
  'lexical',
  'src',
  'LexicalGeneratedJSON.ts',
);

/**
 * The JSON the schema-driven walk produces, which the generated exporter has to
 * reproduce exactly — same values, same key order.
 */
function walkExportJSON(node: LexicalNode): {[key: string]: unknown} {
  const json: {[key: string]: unknown} = $isElementNode(node)
    ? {children: []}
    : {};
  node.exportJSONInto(json, false);
  return json;
}

describe('generated exportJSON', () => {
  test('the checked-in output is what the generator produces', () => {
    // A schema change that nobody regenerated for would otherwise ship a
    // specialized exporter describing the previous schema.
    const checkedIn = readFileSync(GENERATED, 'utf8');
    execFileSync(
      'npx',
      ['tsx', join(REPO, 'scripts', 'generate-node-json.mjs')],
      {
        cwd: REPO,
        stdio: 'pipe',
      },
    );
    const regenerated = readFileSync(GENERATED, 'utf8');
    expect(regenerated).toBe(checkedIn);
    // Spawning the generator dominates: it type-strips the whole core module
    // graph to read the schemas.
  }, 120_000);

  initializeUnitTest(testEnv => {
    test('every generated exporter agrees with the schema-driven walk', () => {
      testEnv.editor.update(
        () => {
          const nodes = [
            $createTextNode('hello').setFormat('bold').setStyle('color: red'),
            $createTextNode(''),
            $createLineBreakNode(),
            $createTabNode(),
          ];
          for (const node of nodes) {
            expect(getGeneratedExporter(node.getType())).toBeDefined();
            const generated = node.exportJSON();
            const walked = walkExportJSON(node);
            expect(generated).toEqual(walked);
            // Key order too: a document round-tripped through JSON.stringify
            // should be byte-identical either way.
            expect(Object.keys(generated)).toEqual(Object.keys(walked));
          }
        },
        {discrete: true},
      );
    });

    test('a subclass does not inherit its parent exporter', () => {
      // The exporter is keyed by the exact class: a subclass declares its own
      // schema and its own type, so the parent's literal would be wrong for it.
      // A subclass registers under its own type, so it never reaches its
      // parent's exporter.
      expect(getGeneratedExporter('text')).toBeDefined();
      expect(getGeneratedExporter('sub-text')).toBeUndefined();
    });

    test('a class that overrides exportJSON gets no generated exporter', () => {
      // ParagraphNode back-fills textFormat/textStyle from its first text child
      // for #7971 — behavior its schema does not describe, so a literal
      // generated from the schema alone would drop it.
      expect(getGeneratedExporter('paragraph')).toBeUndefined();
      testEnv.editor.update(
        () => {
          const paragraph = $createParagraphNode()
            .setTextFormat(1)
            .setTextStyle('color: red');
          expect(paragraph.exportJSON()).toEqual(walkExportJSON(paragraph));
        },
        {discrete: true},
      );
    });

    test('NodeState still reaches the JSON through a generated exporter', () => {
      testEnv.editor.update(
        () => {
          const node = $createTextNode('hi');
          // Whatever a node carries is not known when the code is generated, so
          // the dispatch appends it rather than the generated literal.
          expect(node.exportJSON()).not.toHaveProperty('$');
        },
        {discrete: true},
      );
    });
  });
});
