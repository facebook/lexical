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
  getGeneratedJSONUsage,
  type LexicalNode,
  LineBreakNode,
  ParagraphNode,
  TabNode,
  TextNode,
} from '../..';
import {getGeneratedJSON} from '../../LexicalGeneratedJSON';
import {$writeJSONGetters} from '../../LexicalUtils';
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
 *
 * This is `LexicalNode.exportJSON`'s body with the generated-exporter dispatch
 * removed, which is the only way to reach the walk for a class that has one.
 */
function $walkExportJSON(node: LexicalNode): {[key: string]: unknown} {
  const json: {[key: string]: unknown} = $isElementNode(node)
    ? {children: []}
    : {};
  $writeJSONGetters(node, json, false);
  json.type = node.getType();
  json.version = 1;
  return json;
}

describe('generated exportJSON', () => {
  test('the checked-in output is what the generator produces', () => {
    // A schema change that nobody regenerated for would otherwise ship
    // specialized code describing the previous schema.
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
            expect(getGeneratedJSON(node.getType())).toBeDefined();
            const generated = node.exportJSON();
            const walked = $walkExportJSON(node);
            expect(generated).toEqual(walked);
            // Key order too: a document round-tripped through JSON.stringify
            // should be byte-identical either way.
            expect(Object.keys(generated)).toEqual(Object.keys(walked));
          }
        },
        {discrete: true},
      );
    });

    test('a subclass with its own type does not reach its parent code', () => {
      expect(getGeneratedJSON('text')).toBeDefined();
      expect(getGeneratedJSON('sub-text')).toBeUndefined();
    });

    test('an exportJSON override composes with its generated exporter', () => {
      // ParagraphNode writes textFormat/textStyle computed from its first text
      // child (#7971) — output no schema describes. It keeps doing that in an
      // ordinary exportJSON override: the override calls super, super is where
      // the generated literal comes from, and the override then adjusts it.
      expect(getGeneratedJSON('paragraph')).toBeDefined();
      testEnv.editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode('x').setFormat('bold'));
          const json = paragraph.exportJSON();
          // The first text child's format, not the paragraph's own.
          expect(json.textFormat).toBe(1);
          expect(json.textStyle).toBe('');
          // And the generated literal underneath it is intact. The two
          // back-filled keys land after type/version because the override
          // appends them to the finished object — unchanged from before the
          // literal was generated, since the override itself did not change.
          expect(json.type).toBe('paragraph');
          expect(Object.keys(json)).toEqual([
            'children',
            'direction',
            'format',
            'indent',
            'type',
            'version',
            'textFormat',
            'textStyle',
          ]);
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

describe('the generated code is actually reached', () => {
  // The runtime derives a class's shape from its compiled tables and the
  // codegen derives it from the schema. Those are two independent derivations
  // of the same string, and if they ever disagreed nothing would fail — every
  // node would quietly go back to the walk, and the rest of this file would
  // still pass. This is the test that would not.
  test('each target class uses the code generated for it', () => {
    expect(getGeneratedJSONUsage(TextNode)).toEqual({
      exportJSON: true,
      updateFromJSON: true,
    });
    for (const klass of [ParagraphNode, LineBreakNode, TabNode]) {
      expect(getGeneratedJSONUsage(klass).exportJSON).toBe(true);
    }
  });
});

describe('generated updateFromJSON', () => {
  test('only a class the generator could compile has one', () => {
    // TextNode's every property is one of its own fields with a domain stated
    // as data. ParagraphNode applies its properties through set<Prop>, and
    // TabNode declares three of its own import-only, so neither is generated —
    // and the generator says so rather than emitting a parser that disagrees.
    expect(getGeneratedJSON('text')!.updateFromJSON).toBeDefined();
    expect(getGeneratedJSON('paragraph')!.updateFromJSON).toBeUndefined();
    expect(getGeneratedJSON('tab')!.updateFromJSON).toBeUndefined();
    expect(getGeneratedJSON('linebreak')!.updateFromJSON).toBeUndefined();
  });

  initializeUnitTest(testEnv => {
    test('a hostile key cannot reach Object.prototype through a table', () => {
      // The alias and encode tables are indexed with a value straight out of
      // the JSON, so a plain object literal would resolve 'toString' to a
      // function and store it as the node's format.
      testEnv.editor.update(
        () => {
          for (const hostile of [
            'toString',
            'constructor',
            'hasOwnProperty',
            '__proto__',
            'valueOf',
          ]) {
            const node = $createTextNode('');
            node.updateFromJSON({
              detail: hostile,
              format: hostile,
              mode: hostile,
              style: '',
              text: '',
            } as never);
            expect(node.getFormat()).toBe(0);
            expect(node.getDetail()).toBe(0);
            expect(node.getMode()).toBe('normal');
          }
        },
        {discrete: true},
      );
    });

    test('the legacy string spellings still parse', () => {
      testEnv.editor.update(
        () => {
          const node = $createTextNode('');
          node.updateFromJSON({
            detail: 'unmergeable',
            format: 'bold',
            mode: 'token',
            style: '',
            text: 'x',
          } as never);
          expect(node.getFormat()).toBe(1);
          expect(node.getDetail()).toBe(2);
          expect(node.getMode()).toBe('token');
        },
        {discrete: true},
      );
    });
  });
});
