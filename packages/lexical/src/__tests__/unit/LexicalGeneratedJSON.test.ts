/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $isElementNode,
  type LexicalNode,
  LineBreakNode,
  ParagraphNode,
  TabNode,
  TextNode,
} from '../..';
import {
  GENERATED_LINEBREAK,
  GENERATED_PARAGRAPH,
  GENERATED_TAB,
  GENERATED_TEXT,
} from '../../LexicalGeneratedJSON';
import {$writeJSONGetters, getStaticNodeConfig} from '../../LexicalUtils';
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
    //
    // Generated somewhere else and compared, rather than regenerated in place:
    // the file under test is a source module other workers in this run import,
    // and rewriting it — first with the generator's phase-one stub, then with
    // the real output — makes whichever of them happens to be loading it fail.
    const out = join(mkdtempSync(join(tmpdir(), 'lexical-codegen-')), 'out.ts');
    execFileSync(
      'npx',
      ['tsx', join(REPO, 'scripts', 'generate-node-json.mjs'), out],
      {
        cwd: REPO,
        stdio: 'pipe',
      },
    );
    expect(readFileSync(out, 'utf8')).toBe(readFileSync(GENERATED, 'utf8'));
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

    test('an exportJSON override composes with its generated exporter', () => {
      // ParagraphNode writes textFormat/textStyle computed from its first text
      // child (#7971) — output no schema describes. It keeps doing that in an
      // ordinary exportJSON override: the override calls super, super is where
      // the generated literal comes from, and the override then adjusts it.
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

describe('the generated code reaches the class it was generated for', () => {
  // Handed over through `$config` rather than looked up by node type, so there
  // is no second derivation that could stop matching the first — the check is
  // that each class named its own.
  test.each([
    ['text', TextNode, GENERATED_TEXT],
    ['paragraph', ParagraphNode, GENERATED_PARAGRAPH],
    ['linebreak', LineBreakNode, GENERATED_LINEBREAK],
    ['tab', TabNode, GENERATED_TAB],
  ])('%s', (_type, klass, generated) => {
    const {ownNodeConfig} = getStaticNodeConfig(klass);
    expect(ownNodeConfig && ownNodeConfig.generated).toBe(generated);
  });
});

describe('generated updateFromJSON', () => {
  test('only a class the generator could compile has one', () => {
    // TextNode's every property is one of its own fields with a domain stated
    // as data. ParagraphNode applies its properties through set<Prop>, and
    // TabNode declares three of its own import-only, so neither is generated —
    // and the generator says so rather than emitting a parser that disagrees.
    expect(GENERATED_TEXT.updateFromJSON).toBeDefined();
    expect(GENERATED_PARAGRAPH.updateFromJSON).toBeUndefined();
    expect(GENERATED_TAB.updateFromJSON).toBeUndefined();
    expect(GENERATED_LINEBREAK.updateFromJSON).toBeUndefined();
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
