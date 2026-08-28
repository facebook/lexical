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
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getState,
  $isElementNode,
  $isParagraphNode,
  $setState,
  createEditor,
  createState,
  IS_BOLD,
  type LexicalNode,
  LineBreakNode,
  NODE_STATE_KEY,
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
import {LexicalNode as LexicalNodeClass} from '../../LexicalNode';
import {$writeJSONGetters, getStaticNodeConfig} from '../../LexicalUtils';
import {initializeUnitTest, invariant} from '../utils';

const REPO = join(import.meta.dirname, '..', '..', '..', '..', '..');

/**
 * The JSON the schema-driven walk produces, which the generated exporter has to
 * reproduce exactly — same values, same key order.
 *
 * This is `LexicalNode.exportJSON`'s body with the generated-exporter dispatch
 * removed, which is the only way to reach the walk for a class that has one.
 */
function $walkExportJSON(
  node: LexicalNode,
  compact: boolean,
): {[key: string]: unknown} {
  const json: {[key: string]: unknown} = $isElementNode(node)
    ? {children: []}
    : {};
  $writeJSONGetters(node, json, compact);
  json.type = node.getType();
  if (!compact) {
    json.version = 1;
  }
  return json;
}

/**
 * What the generated code alone produces for `node`, with any `exportJSON`
 * override bypassed.
 *
 * ParagraphNode's override composes with the generated literal by calling
 * `super.exportJSON(compact)`, so calling the override would compare its
 * back-filled output against a walk that never runs it. Going straight to the
 * base implementation reaches the generated code the same way `super` does.
 */
function $generatedOnly(
  node: LexicalNode,
  compact: boolean,
): {[key: string]: unknown} {
  return LexicalNodeClass.prototype.exportJSON.call(
    node,
    compact,
  ) as unknown as {
    [key: string]: unknown;
  };
}

describe('generated exportJSON', () => {
  test('the checked-in outputs are what the generator produces', () => {
    // A schema change that nobody regenerated for would otherwise ship
    // specialized code describing the previous schema.
    //
    // Generated somewhere else and compared, rather than regenerated in place:
    // the files under test are source modules other workers in this run
    // import, and rewriting one — first with the generator's phase-one stub,
    // then with the real output — makes whichever of them happens to be
    // loading it fail. The generator writes its repo-relative layout under the
    // directory plus a manifest listing every file, so this covers every
    // package it generates for without keeping a second copy of that list.
    const out = mkdtempSync(join(tmpdir(), 'lexical-codegen-'));
    execFileSync(
      'npx',
      ['tsx', join(REPO, 'scripts', 'generate-node-json.mjs'), out],
      {
        cwd: REPO,
        stdio: 'pipe',
      },
    );
    const manifest: string[] = JSON.parse(
      readFileSync(join(out, 'manifest.json'), 'utf8'),
    );
    expect(manifest).toContain('packages/lexical/src/LexicalGeneratedJSON.ts');
    for (const file of manifest) {
      expect({content: readFileSync(join(out, file), 'utf8'), file}).toEqual({
        content: readFileSync(join(REPO, file), 'utf8'),
        file,
      });
    }
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
            $createTextNode('tok').setMode('token').setDetail('directionless'),
            $createLineBreakNode(),
            $createTabNode(),
            // ParagraphNode belongs here most of all: it is the only element
            // among them, so the only one whose generated code has to lead with
            // `children`, and the only one whose properties are a mix of fields
            // and methods. Its own exportJSON is bypassed below rather than
            // skipped — that override back-fills #7971 on top of the generated
            // literal, so calling it would compare the override's output
            // against a walk that does not run it.
            $createParagraphNode().setDirection('rtl').setIndent(3),
            $createParagraphNode(),
            // Both arms of the `when` gate, which the paragraphs above leave
            // at their defaults and so never enter: the generated code hoists
            // one shared `shouldSerializeTextStyles` where the walk tests the
            // default and calls the predicate per property, so agreeing when
            // the property is trivially omitted proves nothing about either.
            $createParagraphNode()
              .setTextFormat(IS_BOLD)
              .setTextStyle('color: red'),
            // Predicate false with a non-default value — the case the two
            // decide differently if the hoist ever stops mirroring the walk.
            $createParagraphNode()
              .setTextFormat(IS_BOLD)
              .setTextStyle('color: red')
              .append($createTextNode('x')),
          ];
          for (const node of nodes) {
            // Both forms: each is generated separately, so each has to agree
            // with the walk separately.
            for (const compact of [false, true]) {
              const generated = $generatedOnly(node, compact);
              const walked = $walkExportJSON(node, compact);
              expect({compact, json: generated}).toEqual({
                compact,
                json: walked,
              });
              // Key order too: a document round-tripped through JSON.stringify
              // should be byte-identical either way.
              expect(Object.keys(generated)).toEqual(Object.keys(walked));
            }
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
          // And the generated literal underneath it is intact. The literal
          // writes every schema key unconditionally — textFormat/textStyle as
          // undefined when the getters have nothing to say — so the override's
          // back-fill assigns into keys that already exist, and they sit at
          // their schema position rather than trailing after `version`.
          expect(json.type).toBe('paragraph');
          expect(Object.keys(json)).toEqual([
            'children',
            'direction',
            'format',
            'indent',
            'textFormat',
            'textStyle',
            'type',
            'version',
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

describe('the compact form is generated too', () => {
  // Which properties the compact form drops depends on a node's values, but the
  // rule does not: each is a comparison against a default the schema states. So
  // it generates the same way the legacy form does, and the `compact` argument
  // picks between two straight-line functions rather than branching inside one.
  test('a class that has one gets a second, distinct function', () => {
    // Not asserted for every target: a class whose default has no faithful
    // literal keeps the walk for this form, which is a supported outcome
    // rather than a regression, so pinning all four here would turn adding
    // such a property into a failure pointing at this line.
    expect(GENERATED_TEXT.exportCompactJSON).toBeDefined();
    expect(GENERATED_TEXT.exportCompactJSON).not.toBe(
      GENERATED_TEXT.exportJSON,
    );
  });

  initializeUnitTest(testEnv => {
    test('it omits what parsing restores, and nothing else', () => {
      testEnv.editor.update(
        () => {
          // Every property at its default: the compact form is the type alone.
          expect($createTextNode('').exportJSON(true)).toEqual({type: 'text'});
          // And a property that differs is kept, with `version` still dropped.
          expect(
            $createTextNode('hi').setMode('token').exportJSON(true),
          ).toEqual({mode: 'token', text: 'hi', type: 'text'});
        },
        {discrete: true},
      );
    });
  });
});

describe('a generated exporter is installed on its class', () => {
  // Resolved once at registration rather than looked up per node: the literal
  // is small enough that finding it cost more than running it.
  test('the class that declared it gets it on its prototype', () => {
    expect(
      Object.prototype.hasOwnProperty.call(TextNode.prototype, 'exportJSON'),
    ).toBe(true);
  });

  test('a class that writes its own exportJSON keeps it', () => {
    // ParagraphNode's override is where the #7971 back-fill lives, and it
    // reaches its generated literal through super — so nothing may displace it.
    expect(
      Object.prototype.hasOwnProperty.call(
        ParagraphNode.prototype,
        'exportJSON',
      ),
    ).toBe(true);
    const paragraph = ParagraphNode.prototype.exportJSON;
    expect(paragraph).not.toBe(TextNode.prototype.exportJSON);
  });

  test('a subclass that inherits the declaration defers to the base', () => {
    // No `$config` of its own, so it inherits TextNode's — the node type and
    // the generated code with it — while overriding an accessor that code
    // compiled away. It inherits the installed method too, whose guard is the
    // only thing standing between it and TextNode's literal.
    class InheritsEverything extends TextNode {
      getStyle(): string {
        return `${super.getStyle()};extra`;
      }
    }
    const editor = createEditor({
      namespace: '',
      nodes: [InheritsEverything],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot().clear();
        const node = $create(InheritsEverything).setStyle('color: red');
        // Nothing was installed on the subclass, and the inherited method
        // recognizes it is not the class it was generated for.
        expect(
          Object.prototype.hasOwnProperty.call(
            InheritsEverything.prototype,
            'exportJSON',
          ),
        ).toBe(false);
        expect(node.exportJSON().style).toBe('color: red;extra');
        // Which is what the schema-driven walk says too.
        const walked: {[key: string]: unknown} = {};
        $writeJSONGetters(node, walked, false);
        expect(walked.style).toBe('color: red;extra');
      },
      {discrete: true},
    );
  });
});

describe('the synthesized importJSON closes over its generated parser', () => {
  // Narrower than the export side's fast path: it wants a node that is exactly
  // this class and JSON with no NodeState, because the generated parser writes
  // neither a subclass's properties nor state.
  const probeState = createState('probeFlag', {
    parse: v => (typeof v === 'string' ? v : ''),
  });

  class StatefulText extends TextNode {
    $config() {
      return this.config('stateful-text', {
        extends: TextNode,
        stateConfigs: [{flat: false, stateConfig: probeState}],
      });
    }
  }

  class ReplacedText extends TextNode {
    $config() {
      return this.config('replaced-text', {extends: TextNode});
    }
  }

  test('JSON carrying NodeState takes the general path', () => {
    const editor = createEditor({
      namespace: '',
      nodes: [StatefulText],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        const node = $create(StatefulText);
        node.setTextContent('hi');
        $setState(node, probeState, 'kept');
        $getRoot().clear().append($createParagraphNode().append(node));
      },
      {discrete: true},
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).toContain(`"${NODE_STATE_KEY}"`);
    editor.parseEditorState(json).read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      invariant($isParagraphNode(paragraph), 'expected a paragraph');
      expect($getState(paragraph.getFirstChildOrThrow(), probeState)).toBe(
        'kept',
      );
    });
  });

  test('a replacement of another class takes the general path', () => {
    // $applyNodeReplacement hands back a ReplacedText where the closure asked
    // for a TextNode, so TextNode's parser is not the one to run.
    const editor = createEditor({
      namespace: '',
      nodes: [
        ReplacedText,
        {
          replace: TextNode,
          with: (node: TextNode) => new ReplacedText(node.__text),
          withKlass: ReplacedText,
        },
      ],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        const node = $createTextNode('hello').setStyle('color: red');
        expect(node).toBeInstanceOf(ReplacedText);
        $getRoot().clear().append($createParagraphNode().append(node));
      },
      {discrete: true},
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());
    editor.parseEditorState(json).read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      invariant($isParagraphNode(paragraph), 'expected a paragraph');
      const node = paragraph.getFirstChildOrThrow();
      expect(node).toBeInstanceOf(ReplacedText);
      expect(node.getTextContent()).toBe('hello');
    });
  });
});

describe('generated updateFromJSON', () => {
  test('only a class the generator could compile has one', () => {
    // Every property of TextNode and of ParagraphNode has a domain the
    // compiler can state — a field write, or a set<Prop> whose return is
    // followed the way the walk follows it.
    expect(GENERATED_TEXT.updateFromJSON).toBeDefined();
    expect(GENERATED_PARAGRAPH.updateFromJSON).toBeDefined();
    // TabNode declares three of its own properties import-only, so a parser
    // would have nothing to apply; LineBreakNode declares none at all. The
    // generator says so rather than emitting one that disagrees with the walk.
    expect(GENERATED_TAB.updateFromJSON).toBeUndefined();
    expect(GENERATED_LINEBREAK.updateFromJSON).toBeUndefined();
  });

  test('a generated parser returns the node the walk would have', () => {
    // It can now apply a property through a method, and a setter is free to
    // return a different node — so the parser threads the return the way
    // $applyJSONSetters does, and hands back what it ended on.
    const updateParagraph = GENERATED_PARAGRAPH.updateFromJSON;
    invariant(updateParagraph !== undefined, 'expected a generated parser');
    const editor = createEditor({onError: e => Promise.reject(e)});
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        expect(updateParagraph(paragraph, {format: 'center', indent: 3})).toBe(
          paragraph.getLatest(),
        );
        expect(paragraph.getLatest().getFormatType()).toBe('center');
        expect(paragraph.getLatest().getIndent()).toBe(3);
        // The constrained domain is enforced by the emitted bounds, not by a
        // setter: indent is `integer, min 0`.
        updateParagraph(paragraph.getLatest(), {indent: -2});
        expect(paragraph.getLatest().getIndent()).toBe(0);
        updateParagraph(paragraph.getLatest(), {indent: 1.5});
        expect(paragraph.getLatest().getIndent()).toBe(0);
      },
      {discrete: true},
    );
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
