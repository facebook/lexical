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
  $isParagraphNode,
  $isTextNode,
  $setState,
  createEditor,
  createState,
  IS_BOLD,
  LineBreakNode,
  NODE_STATE_KEY,
  ParagraphNode,
  type SerializedTextNode,
  TabNode,
  TextNode,
} from '../..';
import {
  GENERATED_LINEBREAK,
  GENERATED_PARAGRAPH,
  GENERATED_TAB,
  GENERATED_TEXT,
  type GeneratedJSON,
} from '../../LexicalGeneratedJSON';
import {$generatedExportJSON, getStaticNodeConfig} from '../../LexicalUtils';
import {$expectSameJSON, initializeUnitTest, invariant} from '../utils';

const REPO = join(import.meta.dirname, '..', '..', '..', '..', '..');

// The control classes: same schema (inherited through the config chain), same
// fields, but no `generated` in their own $config, so they export through the
// schema-driven walk — which is exactly what the generated code has to agree
// with. Only the type string differs, by construction.
class WalkTextNode extends TextNode {
  $config() {
    return this.config('walk-text', {extends: TextNode});
  }
}

class WalkParagraphNode extends ParagraphNode {
  $config() {
    return this.config('walk-paragraph', {extends: ParagraphNode});
  }
}

class WalkLineBreakNode extends LineBreakNode {
  $config() {
    return this.config('walk-linebreak', {extends: LineBreakNode});
  }
}

class WalkTabNode extends TabNode {
  $config() {
    return this.config('walk-tab', {extends: TabNode});
  }
}

describe('generated exportJSON', () => {
  test('the checked-in outputs are what the generator produces; `pnpm run generate-node-json` to fix', () => {
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

  initializeUnitTest(
    testEnv => {
      test('every generated exporter agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            const $styled = <T extends TextNode>(node: T) =>
              node.setFormat('bold').setStyle('color: red');
            $expectSameJSON(
              $styled(new TextNode('hello')),
              $styled(new WalkTextNode('hello')),
            );
            $expectSameJSON(new TextNode(''), new WalkTextNode(''));
            const $token = <T extends TextNode>(node: T) =>
              node.setMode('token').setDetail('directionless');
            $expectSameJSON(
              $token(new TextNode('tok')),
              $token(new WalkTextNode('tok')),
            );
            $expectSameJSON($createLineBreakNode(), new WalkLineBreakNode());
            $expectSameJSON($createTabNode(), new WalkTabNode());
            // ParagraphNode belongs here most of all: it is the only element
            // among them, so the only one whose generated code has to lead
            // with `children`, and the only one whose properties are a mix of
            // fields and methods. Its exportJSON override back-fills #7971 on
            // top of the generated literal; the control inherits the override
            // and back-fills on top of the walk, so the two compare like for
            // like.
            const $laidOut = <T extends ParagraphNode>(node: T) =>
              node.setDirection('rtl').setIndent(3);
            $expectSameJSON(
              $laidOut($createParagraphNode()),
              $laidOut(new WalkParagraphNode()),
            );
            $expectSameJSON($createParagraphNode(), new WalkParagraphNode());
            // Both arms of the `when` gate, which the paragraphs above leave
            // at their defaults and so never enter: the generated code hoists
            // one shared `shouldSerializeTextStyles` where the walk tests the
            // default and calls the predicate per property, so agreeing when
            // the property is trivially omitted proves nothing about either.
            const $textStyled = <T extends ParagraphNode>(node: T) =>
              node.setTextFormat(IS_BOLD).setTextStyle('color: red');
            $expectSameJSON(
              $textStyled($createParagraphNode()),
              $textStyled(new WalkParagraphNode()),
            );
            // Predicate false with a non-default value — the case the two
            // decide differently if the hoist ever stops mirroring the walk.
            $expectSameJSON(
              $textStyled($createParagraphNode()).append($createTextNode('x')),
              $textStyled(new WalkParagraphNode()).append($createTextNode('x')),
            );
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
            // Whatever a node carries is not known when the code is generated,
            // so the dispatch appends it rather than the generated literal.
            expect(node.exportJSON()).not.toHaveProperty('$');
          },
          {discrete: true},
        );
      });
    },
    {
      namespace: 'test',
      nodes: [WalkTextNode, WalkParagraphNode, WalkLineBreakNode, WalkTabNode],
      theme: {},
    },
  );
});

describe('the generated code reaches only the class it was generated for', () => {
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

  test('a subclass that inherits the declaration takes the walk', () => {
    // No `$config` of its own, so it inherits TextNode's — the node type and
    // the generated code with it — while overriding an accessor that code
    // compiled away. The generated code is refused for it, so the override is
    // honored.
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
        expect($generatedExportJSON(node, false)).toBeUndefined();
        expect(node.exportJSON().style).toBe('color: red;extra');
      },
      {discrete: true},
    );
  });

  test("a $config that passes an ancestor's generated code is refused", () => {
    // The same mistake made on purpose: TextNode's code reads TextNode's
    // fields and calls TextNode's accessors, whatever this class overrides, so
    // it is refused like the inherited case — but loudly, at registration,
    // because the class asked for it by name.
    class PassesParentGenerated extends TextNode {
      $config() {
        return this.config('passes-parent-generated', {
          extends: TextNode,
          generated: GENERATED_TEXT,
        });
      }
    }
    expect(() =>
      createEditor({
        namespace: '',
        nodes: [PassesParentGenerated],
        onError: err => {
          throw err;
        },
      }),
    ).toThrow(/passes the generated JSON code that TextNode declared/);
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

describe('the synthesized importJSON', () => {
  // Builds the node, then applies the serialized properties through the same
  // walk everything else uses — which is where a generated parser is reached,
  // and where what it leaves alone (NodeState, a replacement class) is handled
  // around it.
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

  test('NodeState in the JSON is applied', () => {
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

  test('a replacement of the class is imported as itself', () => {
    // $applyNodeReplacement hands back a ReplacedText where TextNode was asked
    // for, and the walk resolves what to run from the node it is given.
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

  // A hand-built GeneratedJSON stands in for the generator's output: each class
  // declares it in its own $config, which is all the resolution asks.
  const replacingGenerated: GeneratedJSON = {
    exportJSON: node => ({text: (node as TextNode).__text}),
    updateFromJSON: (node, json) => {
      // What a schema setter that hands back another node looks like to the
      // parser: the walk follows it, so the parser's caller must too.
      const replacement = $createTextNode(String(json.text)).setStyle(
        'swapped',
      );
      node.remove();
      return replacement;
    },
  };

  class ReplacingText extends TextNode {
    $config() {
      return this.config('replacing-text', {
        extends: TextNode,
        generated: replacingGenerated,
      });
    }
  }

  test('follows the node the generated parser returns', () => {
    const editor = createEditor({
      namespace: '',
      nodes: [ReplacingText],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        const node = ReplacingText.importJSON({
          text: 'hello',
          type: 'replacing-text',
          version: 1,
        } as SerializedTextNode);
        // $applyJSONSetters returns what the parser returned, and importJSON
        // hands that on.
        expect(node).not.toBeInstanceOf(ReplacingText);
        invariant($isTextNode(node), 'expected the replacement TextNode');
        expect(node.getStyle()).toBe('swapped');
        expect(node.getTextContent()).toBe('hello');
      },
      {discrete: true},
    );
  });

  const ctorState = createState('ctorFlag', {
    parse: v => (typeof v === 'string' ? v : ''),
  });

  const passthroughGenerated: GeneratedJSON = {
    exportJSON: node => ({text: (node as TextNode).__text}),
    updateFromJSON: node => node,
  };

  class ConstructedStateText extends TextNode {
    constructor(text = '', key?: string) {
      super(text, key);
      // A node that carries state before any property is applied, which the
      // generated parser knows nothing about.
      $setState(this, ctorState, 'from-constructor');
    }
    $config() {
      return this.config('constructed-state-text', {
        extends: TextNode,
        generated: passthroughGenerated,
      });
    }
  }

  test('state a constructor set is reset from JSON that carries none', () => {
    const editor = createEditor({
      namespace: '',
      nodes: [ConstructedStateText],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        const fresh = $create(ConstructedStateText);
        expect($getState(fresh, ctorState)).toBe('from-constructor');
        const imported = ConstructedStateText.importJSON({
          text: '',
          type: 'constructed-state-text',
          version: 1,
        } as SerializedTextNode);
        // What $updateStateFromJSON does for a node that carries state when
        // the JSON carries none: known state goes back to its default. The
        // generated parser neither writes state nor resets it, so this has to
        // happen around it.
        expect($getState(imported, ctorState)).toBe('');
      },
      {discrete: true},
    );
  });

  const flatState = createState('flatFlag', {
    parse: v => (typeof v === 'string' ? v : ''),
  });

  // A parser that applies only the schema's fields, as every generated parser
  // does: what a node carries in state is not known when code is generated.
  const fieldsOnlyGenerated: GeneratedJSON = {
    exportJSON: node => ({text: (node as TextNode).__text}),
    updateFromJSON: (node, json) => {
      (node as TextNode).__text =
        typeof json.text === 'string' ? json.text : '';
      return node;
    },
  };

  class FlatStateText extends TextNode {
    $config() {
      return this.config('flat-state-text', {
        extends: TextNode,
        generated: fieldsOnlyGenerated,
        stateConfigs: [{flat: true, stateConfig: flatState}],
      });
    }
  }

  test('flat NodeState is applied before the generated parser runs', () => {
    // The mirror of export, where the dispatch appends `__state.toJSON()`
    // around the generated literal: here the walk applies the flat state and
    // then hands the node to the parser for the fields.
    const editor = createEditor({
      namespace: '',
      nodes: [FlatStateText],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        const node = FlatStateText.importJSON({
          flatFlag: 'set',
          text: 'hello',
          type: 'flat-state-text',
          version: 1,
        } as never);
        expect($getState(node, flatState)).toBe('set');
        expect(node.getTextContent()).toBe('hello');
      },
      {discrete: true},
    );
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
