/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  composeNodeSerializationSchema,
  nodeArbitrary,
  nodeSerializationSchema,
} from '@lexical/fast-check';
import * as fc from 'fast-check';
import {
  createEditor,
  createState,
  ElementNode,
  enumValue,
  type Klass,
  type LexicalNode,
  type LexicalUpdateJSON,
  numberValue,
  objectValue,
  ParagraphNode,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type SerializedPartial,
  type Spread,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

type SerializedMergeNode = Spread<
  {variant: 'a' | 'b' | 'c'},
  SerializedElementNode
>;

const mergeNodeSchema = objectValue({
  variant: enumValue(['a', 'b', 'c']),
});

// A custom element node that declares its OWN schema field; composeNodeSerializationSchema
// must merge it with the schema it inherits from the abstract ElementNode base.
class MergeNode extends ElementNode {
  __variant: 'a' | 'b' | 'c' = 'a';
  static getType(): string {
    return 'merge-test';
  }
  static clone(node: MergeNode): MergeNode {
    const merged = new MergeNode(node.__key);
    merged.__variant = node.__variant;
    return merged;
  }
  static importJSON(
    serialized: SerializedPartial<SerializedMergeNode>,
  ): MergeNode {
    return new MergeNode().updateFromJSON(serialized);
  }
  $config() {
    return this.config('merge-test', {json: mergeNodeSchema});
  }
  updateFromJSON(
    serialized: LexicalUpdateJSON<SerializedPartial<SerializedMergeNode>>,
  ): this {
    const {variant} = mergeNodeSchema(serialized);
    return super.updateFromJSON(serialized).setVariant(variant);
  }
  exportJSON(): SerializedMergeNode {
    return {...super.exportJSON(), variant: this.__variant};
  }
  setVariant(variant: 'a' | 'b' | 'c'): this {
    const self = this.getWritable();
    self.__variant = variant;
    return self;
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): false {
    return false;
  }
}

const countState = createState('count', {parse: numberValue()});

// A node whose only own serialized property is a flat NodeState. It carries no
// updateFromJSON/exportJSON or static boilerplate: the base updateFromJSON
// applies the flat state via $setState and exportJSON flattens it. fast-check
// should still generate `count` because the flat state's value schema
// (numberValue) is introspectable.
class FlatStateNode extends ElementNode {
  $config() {
    return this.config('flat-state-test', {
      stateConfigs: [{flat: true, stateConfig: countState}],
    });
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): false {
    return false;
  }
}

type TestNodeClass = Klass<LexicalNode> & {
  importJSON(serialized: SerializedLexicalNode): LexicalNode;
};

describe('@lexical/fast-check', () => {
  const editor = createEditor({
    namespace: 'fast-check',
    nodes: [MergeNode, FlatStateNode],
    onError: error => {
      throw error;
    },
  });

  function importExport(
    klass: TestNodeClass,
    serialized: SerializedLexicalNode,
  ): Record<string, unknown> {
    let exported: Record<string, unknown> = {};
    editor.update(
      () => {
        exported = klass.importJSON(serialized).exportJSON() as Record<
          string,
          unknown
        >;
      },
      {discrete: true},
    );
    return exported;
  }

  test('TextNode publishes its own schema on $config', () => {
    expect(nodeSerializationSchema(TextNode)).toBeDefined();
  });

  test('ParagraphNode composes the schema ElementNode declares (abstract)', () => {
    // ParagraphNode declares no schema of its own; it inherits ElementNode's,
    // which ElementNode publishes under Symbol.for('ElementNode').
    expect(nodeSerializationSchema(ParagraphNode)).toBeUndefined();
    expect(
      Object.keys(composeNodeSerializationSchema(ParagraphNode)).sort(),
    ).toEqual(['direction', 'format', 'indent', 'textFormat', 'textStyle']);
  });

  test('a subclass schema merges with its abstract base schema', () => {
    // MergeNode's own `variant` is merged with the five properties it inherits
    // from ElementNode's abstract schema.
    expect(
      Object.keys(composeNodeSerializationSchema(MergeNode)).sort(),
    ).toEqual([
      'direction',
      'format',
      'indent',
      'textFormat',
      'textStyle',
      'variant',
    ]);
  });

  test('a flat node state is included with the inherited schemas', () => {
    // FlatStateNode declares no json schema, only a flat `count` state; its
    // value schema (numberValue) makes it introspectable, so it appears
    // alongside the five properties inherited from ElementNode.
    expect(
      Object.keys(composeNodeSerializationSchema(FlatStateNode)).sort(),
    ).toEqual([
      'count',
      'direction',
      'format',
      'indent',
      'textFormat',
      'textStyle',
    ]);
  });

  describe.each<[string, TestNodeClass]>([
    ['text', TextNode],
    ['paragraph', ParagraphNode],
    ['merge-test', MergeNode],
    ['flat-state-test', FlatStateNode],
  ])('%s', (type, klass) => {
    test('generated JSON imports and re-exports stably (idempotent)', () => {
      fc.assert(
        fc.property(nodeArbitrary(klass), props => {
          const once = importExport(klass, {
            ...props,
            type,
            version: 1,
          } as SerializedLexicalNode);
          // export ∘ import is a fixed point: re-importing what we exported and
          // exporting again yields the same JSON (tolerant of default-omission).
          expect(importExport(klass, once as SerializedLexicalNode)).toEqual(
            once,
          );
        }),
      );
    });
  });

  test('TextNode tolerates out-of-domain property values', () => {
    const garbage = fc.record({
      detail: fc.anything(),
      format: fc.anything(),
      mode: fc.anything(),
      style: fc.anything(),
      text: fc.anything(),
    });
    fc.assert(
      fc.property(garbage, props => {
        const exported = importExport(TextNode, {
          ...props,
          type: 'text',
          version: 1,
        } as SerializedLexicalNode);
        // parsing never throws and always lands inside each property's domain
        expect(typeof exported.text).toBe('string');
        expect(typeof exported.format).toBe('number');
        expect(typeof exported.detail).toBe('number');
        expect(typeof exported.style).toBe('string');
        expect(['normal', 'token', 'segmented']).toContain(exported.mode);
      }),
    );
  });
});
