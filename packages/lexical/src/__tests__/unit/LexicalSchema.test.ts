/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTabNode,
  $withCompactExport,
  arrayValue,
  booleanValue,
  createState,
  ElementNode,
  enumValue,
  type LexicalUpdateJSON,
  nodeSchema,
  type NodeSerializationSchema,
  nullable,
  numberValue,
  objectValue,
  optional,
  rawValue,
  type SerializedLexicalNode,
  type SerializedPartial,
  type SerializedTextNode,
  stringValue,
  TextNode,
  transformValue,
  unionValue,
  withAccessors,
  withField,
} from 'lexical';
import {assert, describe, expect, expectTypeOf, test} from 'vitest';

import {
  isSchemaDefault,
  isSchemaEqual,
  isSchemaField,
} from '../../LexicalSchema';
import {resolveSchemaField} from '../../LexicalUtils';
import {initializeUnitTest} from '../utils';

describe('LexicalSchema value schemas', () => {
  test('stringValue', () => {
    const parse = stringValue();
    expect(parse('hello')).toBe('hello');
    expect(parse('')).toBe('');
    // out of domain -> default
    expect(parse(undefined)).toBe('');
    expect(parse(null)).toBe('');
    expect(parse(42)).toBe('');
    expect(parse({})).toBe('');
    // custom default
    expect(stringValue('fallback')(undefined)).toBe('fallback');
    expect(stringValue('fallback')(42)).toBe('fallback');
  });

  test('numberValue', () => {
    const parse = numberValue();
    expect(parse(42)).toBe(42);
    expect(parse(0)).toBe(0);
    expect(parse(-1.5)).toBe(-1.5);
    // a stringified number is an input encoding of the same domain
    expect(parse('42')).toBe(42);
    // out of domain -> default
    expect(parse(undefined)).toBe(0);
    expect(parse('forty-two')).toBe(0);
    expect(parse(NaN)).toBe(0);
    expect(parse(Infinity)).toBe(0);
    expect(parse(-Infinity)).toBe(0);
    // custom default
    expect(numberValue(1)(undefined)).toBe(1);
    expect(numberValue(1)(NaN)).toBe(1);
  });

  test('booleanValue', () => {
    const parse = booleanValue();
    expect(parse(true)).toBe(true);
    expect(parse(false)).toBe(false);
    // out of domain -> default
    expect(parse(undefined)).toBe(false);
    expect(parse(0)).toBe(false);
    expect(parse('true')).toBe(false);
    // custom default
    expect(booleanValue(true)(undefined)).toBe(true);
    expect(booleanValue(true)(1)).toBe(true);
  });

  test('enumValue', () => {
    const parse = enumValue(['normal', 'token', 'segmented']);
    expect(parse('token')).toBe('token');
    // out of domain -> first value by default
    expect(parse('bogus')).toBe('normal');
    expect(parse(undefined)).toBe('normal');
    expect(parse(42)).toBe('normal');
    // explicit default
    expect(enumValue(['normal', 'token'], 'token')('bogus')).toBe('token');
    // null may be a valid member
    const direction = enumValue([null, 'ltr', 'rtl']);
    expect(direction('rtl')).toBe('rtl');
    expect(direction('bogus')).toBe(null);
    expect(direction(null)).toBe(null);
  });

  test('nullable', () => {
    const parse = nullable(stringValue());
    expect(parse('noopener')).toBe('noopener');
    expect(parse('')).toBe('');
    // null and undefined both collapse to null (the recoverable default)
    expect(parse(null)).toBe(null);
    expect(parse(undefined)).toBe(null);
    // non-null, out-of-domain values delegate to the inner schema's default
    expect(parse(42)).toBe('');
    // composes with any schema
    const parseDirection = nullable(enumValue(['ltr', 'rtl']));
    expect(parseDirection('rtl')).toBe('rtl');
    expect(parseDirection(null)).toBe(null);
    expect(parseDirection(undefined)).toBe(null);
  });

  test('optional', () => {
    const parse = optional(numberValue());
    expect(parse(120)).toBe(120);
    // only undefined collapses to undefined (the recoverable default)
    expect(parse(undefined)).toBe(undefined);
    // present-but-out-of-domain delegates to the inner schema's default
    expect(parse(null)).toBe(0);
    expect(parse('nope')).toBe(0);
    // composes with nullable for `T | null | undefined`
    const parseLanguage = optional(nullable(stringValue()));
    expect(parseLanguage(undefined)).toBe(undefined);
    expect(parseLanguage(null)).toBe(null);
    expect(parseLanguage('js')).toBe('js');
  });

  test('arrayValue', () => {
    const parse = arrayValue(stringValue());
    expect(parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(parse([])).toEqual([]);
    // each entry is coerced through the item schema
    expect(parse(['a', 42, null])).toEqual(['a', '', '']);
    // non-array (incl. undefined) -> empty array (the recoverable default)
    expect(parse(undefined)).toEqual([]);
    expect(parse('nope')).toEqual([]);
  });

  test('objectValue validates and fully populates', () => {
    const parse = objectValue({
      count: numberValue(),
      tags: arrayValue(stringValue()),
      title: stringValue(),
    });
    expect(parse({count: 2, tags: ['x'], title: 'hi'})).toEqual({
      count: 2,
      tags: ['x'],
      title: 'hi',
    });
    // missing/extra/out-of-domain properties -> per-field defaults, extras dropped
    expect(parse({count: 'bad', extra: true})).toEqual({
      count: 0,
      tags: [],
      title: '',
    });
    // the all-defaults object is recoverable
    expect(parse(undefined)).toEqual({count: 0, tags: [], title: ''});
  });

  test('the default is recoverable via parse(undefined)', () => {
    // This mirrors NodeState (StateValueConfig) and lets a future "compact"
    // exportJSON omit a key whose value equals the default.
    expect(stringValue()(undefined)).toBe('');
    expect(numberValue(7)(undefined)).toBe(7);
    expect(booleanValue(true)(undefined)).toBe(true);
    expect(enumValue(['a', 'b'], 'b')(undefined)).toBe('b');
    expect(nullable(stringValue())(undefined)).toBe(null);
  });
});

describe('updateFromJSON tolerates partial and out-of-domain JSON', () => {
  initializeUnitTest(testEnv => {
    test('TextNode applies defaults when properties are missing', () => {
      const {editor} = testEnv;
      editor.update(() => {
        const node = $createTextNode('initial');
        // A "compact" serialized node with no node-specific properties.
        node.updateFromJSON({});
        expect(node.getTextContent()).toBe('');
        expect(node.getFormat()).toBe(0);
        expect(node.getDetail()).toBe(0);
        expect(node.getMode()).toBe('normal');
        expect(node.getStyle()).toBe('');
      });
    });

    test('TextNode rejects out-of-domain values', () => {
      const {editor} = testEnv;
      editor.update(() => {
        const node = $createTextNode('initial');
        node.updateFromJSON({
          detail: 'nope',
          format: null,
          mode: 'bogus',
          style: 42,
          text: 99,
          // deliberately out of domain, so the double cast is required
        } as unknown as LexicalUpdateJSON<
          SerializedPartial<SerializedTextNode>
        >);
        expect(node.getTextContent()).toBe('');
        expect(node.getFormat()).toBe(0);
        expect(node.getDetail()).toBe(0);
        expect(node.getMode()).toBe('normal');
        expect(node.getStyle()).toBe('');
      });
    });

    test('TextNode preserves valid values', () => {
      const {editor} = testEnv;
      editor.update(() => {
        const node = $createTextNode('initial');
        node.updateFromJSON({
          detail: 0,
          format: 1,
          mode: 'token',
          style: 'color: red',
          text: 'hello',
        });
        expect(node.getTextContent()).toBe('hello');
        expect(node.getFormat()).toBe(1);
        expect(node.getMode()).toBe('token');
        expect(node.getStyle()).toBe('color: red');
      });
    });

    test('parseEditorState round-trips compact node JSON', () => {
      const {editor} = testEnv;
      const editorState = editor.parseEditorState(
        JSON.stringify({
          root: {
            children: [
              {
                // ParagraphNode missing direction/format/indent/textFormat/...
                children: [
                  // TextNode missing detail/format/mode/style
                  {text: 'hello', type: 'text', version: 1},
                ],
                type: 'paragraph',
                version: 1,
              },
            ],
            type: 'root',
            version: 1,
          },
        }),
      );
      editorState.read(() => {
        const textNodes = $getRoot().getAllTextNodes();
        expect(textNodes).toHaveLength(1);
        expect(textNodes[0].getTextContent()).toBe('hello');
        expect(textNodes[0].getFormat()).toBe(0);
        expect(textNodes[0].getDetail()).toBe(0);
        expect(textNodes[0].getMode()).toBe('normal');
        expect(textNodes[0].getStyle()).toBe('');
      });
    });

    test('TextNode accepts the legacy string names for format and detail', () => {
      // Hand-authored and older documents carry e.g. `format: 'bold'`, which
      // setFormat/setDetail have always converted from.
      const {editor} = testEnv;
      editor.update(() => {
        const node = $createTextNode('x');
        node.updateFromJSON({
          detail: 'directionless',
          format: 'bold',
        } as unknown as LexicalUpdateJSON<
          SerializedPartial<SerializedTextNode>
        >);
        expect(node.hasFormat('bold')).toBe(true);
        expect(node.isDirectionless()).toBe(true);
      });
    });

    test('TabNode ignores JSON for its fixed properties', () => {
      // text/detail/mode are derived for a tab (setTextContent normalizes, and
      // setDetail/setMode reject anything else), so a hand-authored or foreign
      // value for them must be ignored rather than reach a setter that throws.
      const {editor} = testEnv;
      for (const bad of [
        {mode: 'token'},
        {detail: 0},
        {text: 'xyz'},
        {detail: 'directionless', mode: 'segmented', text: ''},
      ]) {
        const state = editor.parseEditorState(
          JSON.stringify({
            root: {
              children: [
                {
                  children: [{type: 'tab', version: 1, ...bad}],
                  type: 'paragraph',
                  version: 1,
                },
              ],
              type: 'root',
              version: 1,
            },
          }),
        );
        state.read(() => {
          const [tab] = $getRoot().getAllTextNodes();
          expect($isTabNode(tab)).toBe(true);
          expect(tab.getTextContent()).toBe('\t');
          expect(tab.isUnmergeable()).toBe(true);
          expect(tab.getMode()).toBe('normal');
        });
      }
    });

    test('TabNode imports fully compact JSON', () => {
      // TabNode's own schema must override the inherited TextNode field
      // defaults: applying `detail: 0` or `text: ''` would throw in its
      // setters, so `{type: 'tab'}` alone must restore the canonical tab.
      const {editor} = testEnv;
      const editorState = editor.parseEditorState(
        JSON.stringify({
          root: {
            children: [
              {
                children: [
                  {type: 'tab', version: 1},
                  // Out-of-domain values fall back to the same canonical state
                  {detail: 'bogus', text: 'xyz', type: 'tab', version: 1},
                ],
                type: 'paragraph',
                version: 1,
              },
            ],
            type: 'root',
            version: 1,
          },
        }),
      );
      editorState.read(() => {
        const textNodes = $getRoot().getAllTextNodes();
        expect(textNodes).toHaveLength(2);
        for (const node of textNodes) {
          expect($isTabNode(node)).toBe(true);
          expect(node.getTextContent()).toBe('\t');
          expect(node.isUnmergeable()).toBe(true);
        }
      });
    });
  });

  describe('numberValue domain options', () => {
    test('min rejects values below the bound', () => {
      const span = numberValue(1, {min: 1});
      expect(span(3)).toBe(3);
      expect(span(0)).toBe(1);
      expect(span(-4)).toBe(1);
      expect(span(undefined)).toBe(1);
      expect(span.defaultValue).toBe(1);
    });
    test('integer rejects fractional values', () => {
      const span = numberValue(1, {integer: true, min: 1});
      expect(span(2)).toBe(2);
      expect(span(2.5)).toBe(1);
    });
    test('max rejects values above the bound', () => {
      const pct = numberValue(0, {max: 100, min: 0});
      expect(pct(100)).toBe(100);
      expect(pct(101)).toBe(0);
    });
    test('the domain is recorded on meta', () => {
      expect(numberValue(1, {integer: true, min: 1}).meta).toEqual({
        integer: true,
        kind: 'number',
        max: undefined,
        min: 1,
      });
    });
  });

  describe('optional({omitDefault})', () => {
    test('treats a default-valued input as absent', () => {
      const width = optional(numberValue(), {omitDefault: true});
      expect(width(120)).toBe(120);
      expect(width(0)).toBeUndefined();
      expect(width('nonsense')).toBeUndefined();
      expect(width(undefined)).toBeUndefined();
      expect(width.defaultValue).toBeUndefined();
    });
    test('matches the `value || undefined` idiom it replaces', () => {
      const width = optional(numberValue(), {omitDefault: true});
      for (const value of [0, 120, -3, undefined]) {
        expect(width(value)).toBe((value as number) || undefined);
      }
    });
    test('without the option a default-valued input is kept', () => {
      expect(optional(numberValue())(0)).toBe(0);
    });
  });

  describe('unionValue', () => {
    const dimension = unionValue(
      [numberValue(), enumValue(['inherit'])],
      'inherit',
    );
    test('accepts a value from either member', () => {
      expect(dimension(640)).toBe(640);
      expect(dimension('inherit')).toBe('inherit');
    });
    test('falls back when no member accepts the value', () => {
      expect(dimension('banana')).toBe('inherit');
      expect(dimension(undefined)).toBe('inherit');
      expect(dimension.defaultValue).toBe('inherit');
    });
    test('defaults to the first member default when none is given', () => {
      expect(unionValue([numberValue(7), enumValue(['x'])])(null)).toBe(7);
    });
    test('records its members on meta', () => {
      expect(dimension.meta.kind).toBe('union');
    });
  });

  describe('transformValue', () => {
    const NAME_TO_BIT: Record<string, number> = {bold: 1, italic: 2};
    // The union's domain is inferred from its members; no type argument.
    const format = transformValue(
      unionValue([numberValue(), enumValue(['bold', 'italic'])], 0),
      value => (typeof value === 'string' ? NAME_TO_BIT[value] : value),
    );
    test('normalizes accepted values into the target domain', () => {
      expect(format(4)).toBe(4);
      expect(format('bold')).toBe(1);
      expect(format('italic')).toBe(2);
      // out of domain -> inner's default, transformed
      expect(format('junk')).toBe(0);
      expect(format(undefined)).toBe(0);
    });
    test('defaultValue is the transformed inner default', () => {
      expect(format.defaultValue).toBe(0);
      const upper = transformValue(stringValue('a'), s => s.toUpperCase());
      expect(upper.defaultValue).toBe('A');
      expect(upper('bc')).toBe('BC');
    });
    test('meta and setter are inherited from the inner schema', () => {
      // Introspection describes the accepted input domain, so generated
      // examples keep exercising the legacy forms.
      const inner = withAccessors(stringValue(), {setter: 'setFoo'});
      const t = transformValue(inner, s => s.length);
      expect(t.meta).toBe(inner.meta);
      expect(t.setter).toBe('setFoo');
    });
  });

  describe('rawValue', () => {
    test('passes an unvalidated value through', () => {
      const raw = rawValue<{editorState: unknown}>();
      const value = {editorState: {root: {}}};
      expect(raw(value)).toBe(value);
      expect(raw(undefined)).toBeUndefined();
      expect(raw.defaultValue).toBeUndefined();
      expect(raw.meta.kind).toBe('raw');
    });
  });

  describe('exportJSON is written from the schema', () => {
    initializeUnitTest(testEnv => {
      test('a getter returning undefined omits its property', () => {
        const {editor} = testEnv;
        editor.update(() => {
          // ElementNode only persists textFormat/textStyle when there are no
          // TextNode children to recompute them from, which it expresses by
          // returning undefined from the getters its schema names.
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode('x').setFormat(1));
          expect(paragraph.getSerializedTextFormat()).toBeUndefined();
          expect(paragraph.getSerializedTextStyle()).toBeUndefined();
          // and a node that does carry them writes them out
          const styled = $createParagraphNode().setTextStyle('color: red');
          expect(styled.getSerializedTextStyle()).toBe('color: red');
          expect(styled.exportJSON()).toMatchObject({textStyle: 'color: red'});
        });
      });

      test('a property is read through the getter its schema names', () => {
        const {editor} = testEnv;
        editor.update(() => {
          // `text` is declared with getTextContent, not the default getText,
          // and ElementNode's `format` with getFormatType (a string) rather
          // than the numeric getFormat.
          expect($createTextNode('hi').exportJSON()).toMatchObject({
            text: 'hi',
            type: 'text',
          });
          expect($createParagraphNode().exportJSON()).toMatchObject({
            format: '',
            type: 'paragraph',
          });
        });
      });

      test('export round-trips through import for every schema property', () => {
        const {editor} = testEnv;
        editor.update(() => {
          const node = $createTextNode('round trip')
            .setFormat(1)
            .setStyle('color: red')
            .setMode('token');
          const json = node.exportJSON();
          const restored = $createTextNode('').updateFromJSON(json);
          expect(restored.exportJSON()).toEqual(json);
        });
      });
    });
  });

  describe('accessor resolution', () => {
    test('an array field does not inherit its item schema accessors', () => {
      // The item schema describes an element, so a name recorded on it belongs
      // to the element, not to the array-valued property.
      const item = withAccessors(stringValue(), {
        getter: 'getId',
        setter: 'setId',
      });
      expect(arrayValue(item).getter).toBeUndefined();
      expect(arrayValue(item).setter).toBeUndefined();
    });

    test('null states that a direction is deliberately unsupported', () => {
      const derived = withAccessors(stringValue(), {setter: null});
      expect(derived.setter).toBeNull();
      // and it survives further wrapping
      expect(optional(derived).setter).toBeNull();
      expect(withAccessors(derived, {getter: 'getFoo'}).setter).toBeNull();
    });
  });

  describe('withAccessors setter propagation through combinators', () => {
    test('optional and nullable keep the inner setter name', () => {
      // A field like `language: optional(nullable(stringValue()))` must apply
      // through the setter recorded anywhere inside the combinator stack.
      // arrayValue is deliberately excluded: it wraps an *element*, so the
      // element's accessors are not the array property's.
      const inner = withAccessors(stringValue(), {setter: 'setFoo'});
      expect(optional(inner).setter).toBe('setFoo');
      expect(nullable(inner).setter).toBe('setFoo');
      expect(optional(nullable(inner)).setter).toBe('setFoo');
      expect(
        withAccessors(optional(stringValue()), {setter: 'setBar'}).setter,
      ).toBe('setBar');
    });

    test('withAccessors records both directions at once', () => {
      const schema = withAccessors(stringValue(), {
        getter: 'getFoo',
        setter: 'setFoo',
      });
      expect(schema.getter).toBe('getFoo');
      expect(schema.setter).toBe('setFoo');
      // each direction can also be layered on independently
      const layered = withAccessors(
        withAccessors(stringValue(), {setter: 'setA'}),
        {getter: 'getA'},
      );
      expect(layered.getter).toBe('getA');
      expect(layered.setter).toBe('setA');
      // withField is a getter that reads the node's own field
      expect(withField(stringValue(), {field: '__foo'}).getter).toEqual({
        field: '__foo',
      });
    });
  });
});

describe('defaults and untrusted input', () => {
  test('a declared fallback survives a member that accepts undefined', () => {
    // `parse(undefined)` is how most combinators name their default, but here
    // `undefined` is in-domain, so deriving it would discard the fallback.
    expect(unionValue([rawValue(), numberValue()], 5).defaultValue).toBe(5);
    expect(
      unionValue([optional(numberValue()), enumValue(['inherit'])], 'inherit')
        .defaultValue,
    ).toBe('inherit');
    expect(
      enumValue([undefined, 'middle', 'bottom'], 'middle').defaultValue,
    ).toBe('middle');
  });

  test('a union accepts exactly what its members accept', () => {
    // Set membership is SameValueZero, so a member can return NaN unchanged;
    // an identity test would read that as a rejection.
    const schema = unionValue([enumValue([NaN, 1]), numberValue()], 1);
    expect(schema(NaN)).toBeNaN();
  });

  test('a union carries its members accessor names', () => {
    const schema = unionValue([
      withAccessors(numberValue(), {getter: 'getDim', setter: 'setDim'}),
      enumValue(['inherit']),
    ]);
    expect(schema.getter).toBe('getDim');
    expect(schema.setter).toBe('setDim');
  });

  test('a reference-typed default cannot be mutated into every node', () => {
    // StateConfig hands this very object to $getState for a node with no
    // state of its own, so a push here would be visible from every node.
    const schema = arrayValue(stringValue());
    expect(() => schema.defaultValue.push('leak')).toThrow();
    expect(schema.defaultValue).toEqual([]);
    // a parsed value is a fresh array and stays writable
    expect(() => schema(['a']).push('b')).not.toThrow();
  });

  test('objectValue reads own properties only', () => {
    // `source` is parsed JSON, so an inherited member would otherwise be
    // handed to a node setter for JSON that never carried the key.
    const schema = objectValue({toString: rawValue<string>()});
    expect(schema(JSON.parse('{}'))).toEqual({toString: undefined});
    expect(schema(JSON.parse('{"toString":"mine"}'))).toEqual({
      toString: 'mine',
    });
  });
});

describe('the export and parse shapes differ only where parsing is looser', () => {
  test('version is optional in both directions', () => {
    // Nothing reads it: parsing ignores it, and `exportJSON(true)` does not
    // write it, so requiring it on the export shape would promise a property
    // that is genuinely absent half the time.
    expectTypeOf<SerializedLexicalNode['version']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<
      SerializedPartial<SerializedLexicalNode>['version']
    >().toEqualTypeOf<number | undefined>();
    // a slot value is parsed by the same rules, so it relaxes the same way
    expectTypeOf<
      NonNullable<
        SerializedPartial<SerializedLexicalNode>['$slots']
      >[string]['version']
    >().toEqualTypeOf<number | undefined>();
  });

  initializeUnitTest(testEnv => {
    test('exportJSON(true) type-checks as the value it actually returns', () => {
      // The compact form omits version; while it was required, reading it off
      // the result type-checked as a number and was undefined at runtime.
      testEnv.editor.update(() => {
        const node = $createParagraphNode();
        const compact = node.exportJSON(true);
        expectTypeOf(compact.version).toEqualTypeOf<number | undefined>();
        expect(compact).not.toHaveProperty('version');
        expect(node.exportJSON()).toHaveProperty('version', 1);
      });
    });
  });
});

class CountingNode extends ElementNode {
  getLatestCalls = 0;

  getLatest(): this {
    const latest = super.getLatest();
    latest.getLatestCalls += 1;
    return latest;
  }
}

class PlainCountingNode extends CountingNode {
  $config() {
    return this.config('plain-counting', {extends: CountingNode});
  }
}

describe('withField compiles to direct field access', () => {
  class FieldNode extends CountingNode {
    __label = 'default';
    calls = 0;

    $config() {
      return this.config('field-node', {
        extends: CountingNode,
        json: nodeSchema<FieldNode>({
          label: withField(stringValue('default'), {field: '__label'}),
        }),
      });
    }

    afterCloneFrom(prevNode: this): void {
      super.afterCloneFrom(prevNode);
      this.__label = prevNode.__label;
    }

    // Present so a regression that resolved the conventional name instead of
    // the field would be observable rather than silently equivalent.
    setLabel(label: string): this {
      const self = this.getWritable();
      self.calls += 1;
      self.__label = `via-setter:${label}`;
      return self;
    }

    getLabel(): string {
      return `via-getter:${this.getLatest().__label}`;
    }
  }

  test('the field is read and written directly, not through the methods', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[with-field]',
        nodes: [FieldNode],
      }),
    );
    editor.update(
      () => {
        const node = FieldNode.importJSON({label: 'hello', type: 'field-node'});
        assert(node instanceof FieldNode);
        expect(node.__label).toBe('hello');
        expect(node.calls).toBe(0);
        expect(node.exportJSON()).toMatchObject({label: 'hello'});
      },
      {discrete: true},
    );
  });

  test('an absent property still parses to the schema default', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[with-field-default]',
        nodes: [FieldNode],
      }),
    );
    editor.update(
      () => {
        const bare = FieldNode.importJSON({type: 'field-node'});
        assert(bare instanceof FieldNode);
        expect(bare.__label).toBe('default');
      },
      {discrete: true},
    );
  });

  test('a field property adds no version resolution to an export', () => {
    // ElementNode's own properties are method-backed and each resolve the
    // latest version themselves, so the absolute count is theirs. What this
    // pins is the delta: declaring a `withField` property must add nothing,
    // because the walk already handed exportJSON the current node.
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[with-field-latest]',
        nodes: [FieldNode, PlainCountingNode],
      }),
    );
    editor.update(
      () => {
        const withFieldNode = $create(FieldNode);
        const withoutFieldNode = $create(PlainCountingNode);
        $getRoot().append(withFieldNode, withoutFieldNode);
        const [a, b] = $getRoot().getChildren();
        assert(a instanceof FieldNode && b instanceof PlainCountingNode);
        a.getLatestCalls = 0;
        b.getLatestCalls = 0;
        a.exportJSON();
        b.exportJSON();
        expect(a.getLatestCalls).toBe(b.getLatestCalls);
      },
      {discrete: true},
    );
  });

  test('the field name is introspectable, which is what makes it compilable', () => {
    // A codegen pass emitting a specialized parser reads the accessor names
    // off the schema; the `__` prefix is what marks one as a field.
    const schema = withField(stringValue(), {field: '__label'});
    // Both directions name the same field, and each says so explicitly rather
    // than leaving the kind to be inferred from the name.
    expect(schema.getter).toEqual({field: '__label'});
    expect(schema.setter).toEqual({field: '__label'});
    expect(isSchemaField(schema.getter)).toBe(true);
    // A method name is a plain string, so the two can never be confused.
    expect(
      isSchemaField(withAccessors(stringValue(), {getter: 'getLabel'}).getter),
    ).toBe(false);
  });
});

describe('a field stands in for its accessor only while nobody overrides it', () => {
  // TextNode declares every one of its properties as the field it is, naming
  // the accessor each stands in for. Before the schema existed both JSON
  // methods went through those accessors, so a subclass that overrides one
  // has to keep deciding what its own serialization says.
  class LoudTextNode extends TextNode {
    $config() {
      return this.config('loud-text', {extends: TextNode});
    }
    getStyle(): string {
      return `${super.getStyle()};loud`;
    }
    setStyle(style: string): this {
      return super.setStyle(`${style};set`);
    }
  }
  // Inherits the same schema and overrides nothing, so it keeps the field path.
  class QuietTextNode extends TextNode {
    $config() {
      return this.config('quiet-text', {extends: TextNode});
    }
  }

  function withEditor(fn: () => void): void {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[field-override]',
        nodes: [LoudTextNode, QuietTextNode],
      }),
    );
    editor.update(fn, {discrete: true});
  }

  test('an overridden accessor is consulted in both directions', () => {
    withEditor(() => {
      const node = $create(LoudTextNode).setStyle('color: red');
      // The getter override runs, so its suffix reaches the JSON — which is
      // what reading __style directly would have dropped.
      expect(node.getStyle()).toBe('color: red;set;loud');
      expect(node.exportJSON().style).toBe('color: red;set;loud');
      // And the setter override runs on the way back in.
      const parsed = $create(LoudTextNode).updateFromJSON({
        style: 'color: blue',
        text: 'x',
      });
      expect(parsed.getStyle()).toBe('color: blue;set;loud');
    });
  });

  test('a property whose accessor is not overridden keeps the field path', () => {
    withEditor(() => {
      // `text` is declared the same way as `style`; only `style` was
      // overridden, so the rest of the class is unaffected.
      const node = $create(LoudTextNode).setTextContent('hello');
      expect(node.exportJSON().text).toBe('hello');
      // And a subclass that overrides nothing behaves exactly like TextNode.
      const quiet = $create(QuietTextNode).setStyle('color: red');
      expect(quiet.exportJSON().style).toBe('color: red');
    });
  });

  test('the accessor resolves through the whole chain, not just one level', () => {
    // The override is on LoudTextNode and the schema field is declared by
    // TextNode, so nothing would catch it by looking at one class alone.
    expect(
      resolveSchemaField(
        LoudTextNode,
        'style',
        {field: '__style', method: 'setStyle'},
        'setStyle',
      ),
    ).toBe('setStyle');
    expect(
      resolveSchemaField(
        QuietTextNode,
        'style',
        {field: '__style', method: 'setStyle'},
        'setStyle',
      ),
    ).toEqual({field: '__style', method: 'setStyle'});
    // Naming no accessor defers to the conventional one for the key, which is
    // the same `setStyle` — so leaving it out is not a way to bypass an
    // override, it is just the common case spelled shorter.
    expect(
      resolveSchemaField(LoudTextNode, 'style', {field: '__style'}, 'setStyle'),
    ).toBe('setStyle');
    expect(
      resolveSchemaField(
        QuietTextNode,
        'style',
        {field: '__style'},
        'setStyle',
      ),
    ).toEqual({field: '__style'});
    // A key whose conventional accessor does not exist has nothing to defer
    // to: both prototypes resolve undefined and compare equal.
    expect(
      resolveSchemaField(LoudTextNode, 'style', {field: '__style'}, 'setNope'),
    ).toEqual({field: '__style'});
  });

  test('encode and decode carry a property whose two forms differ', () => {
    // TextNode stores `mode` as a bitmask and serializes it as a name, so it
    // stays off getMode()/setMode() only because both tables are declared.
    withEditor(() => {
      const node = $create(QuietTextNode).setMode('segmented');
      expect(node.exportJSON().mode).toBe('segmented');
      const parsed = $create(QuietTextNode).updateFromJSON({
        mode: 'token',
        text: 'x',
      });
      expect(parsed.getMode()).toBe('token');
      expect(parsed.exportJSON().mode).toBe('token');
      // Out of domain falls back to the schema default rather than writing an
      // undefined bitmask through the table.
      const bogus = $create(QuietTextNode).updateFromJSON({
        mode: 'nonsense' as 'normal',
        text: 'x',
      });
      expect(bogus.getMode()).toBe('normal');
    });
  });
});

describe('reference-typed defaults compact by content', () => {
  test('an array equal to its default is dropped, a differing one is not', () => {
    // A parse returns a fresh array, so identity alone would never match the
    // empty default and such a property could never be compacted.
    const ids = arrayValue(stringValue());
    expect(ids.isEqual!([], [])).toBe(true);
    expect(ids.isEqual!(['a'], ['a'])).toBe(true);
    expect(ids.isEqual!(['a'], ['b'])).toBe(false);
    expect(ids.isEqual!(['a'], [])).toBe(false);
  });

  test('an object compares by its declared fields', () => {
    const point = objectValue({x: numberValue(), y: numberValue()});
    expect(point.isEqual!({x: 0, y: 0}, {x: 0, y: 0})).toBe(true);
    expect(point.isEqual!({x: 1, y: 0}, {x: 0, y: 0})).toBe(false);
  });

  test('a node with an array property compacts it away when empty', () => {
    class TagsNode extends ElementNode {
      __tags: string[] = [];
      $config() {
        return this.config('tags-node', {
          extends: ElementNode,
          json: nodeSchema<TagsNode>({
            tags: withField(arrayValue(stringValue()), {field: '__tags'}),
          }),
        });
      }
      afterCloneFrom(prevNode: this): void {
        super.afterCloneFrom(prevNode);
        this.__tags = prevNode.__tags;
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[array-compaction]',
        nodes: [TagsNode],
      }),
    );
    editor.update(
      () => {
        const empty = $create(TagsNode);
        const full = $create(TagsNode);
        full.__tags = ['a'];
        $getRoot().append(empty, full);
      },
      {discrete: true},
    );
    const root = editor.read(() =>
      $withCompactExport(true, () => editor.getEditorState().toJSON().root),
    );
    const [emptyJSON, fullJSON] = root.children;
    expect(emptyJSON).not.toHaveProperty('tags');
    expect(fullJSON).toMatchObject({tags: ['a']});
    // and it still round-trips
    expect(
      editor.parseEditorState(JSON.stringify({root})).read(() =>
        $getRoot()
          .getChildren()
          .map(n => (n as TagsNode).__tags),
      ),
    ).toEqual([[], ['a']]);
  });
});

describe('review fixes', () => {
  test('a caller-supplied default is not frozen', () => {
    // Only a default this factory derived is metadata it owns; one passed in
    // still belongs to the caller.
    const shared = {cols: 2};
    enumValue([shared, null], shared);
    expect(Object.isFrozen(shared)).toBe(false);
    // a derived reference default is still frozen
    expect(Object.isFrozen(arrayValue(stringValue()).defaultValue)).toBe(true);
  });

  test('equality is total: an unvalidated getter result cannot throw', () => {
    // The export path hands isEqual whatever a node getter returned, which
    // nothing validated.
    const ids = arrayValue(stringValue());
    const point = objectValue({x: numberValue()});
    for (const value of [null, undefined, 7, 'x']) {
      expect(() => isSchemaDefault(ids, value as never)).not.toThrow();
      expect(() => isSchemaDefault(point, value as never)).not.toThrow();
    }
  });

  test('optional and nullable keep the inner content comparison', () => {
    const ids = arrayValue(stringValue());
    expect(optional(ids, {omitDefault: true})([])).toBeUndefined();
    expect(nullable(ids, {defaultAsNull: true})([])).toBeNull();
    // and the nil cases still compare by identity
    expect(optional(ids).isEqual!(undefined, undefined)).toBe(true);
    expect(optional(ids).isEqual!(undefined, [])).toBe(false);
  });

  test('a union parses undefined to the fallback it declared', () => {
    // A member that accepts undefined would otherwise win and return it,
    // contradicting defaultValue — which compaction compares against.
    const schema = unionValue(
      [optional(numberValue()), enumValue(['inherit'])],
      'inherit',
    );
    expect(schema.defaultValue).toBe('inherit');
    expect(schema(undefined)).toBe('inherit');
    expect(schema(640)).toBe(640);
  });

  test('a state built from a schema adopts its equality and default', () => {
    const idsState = createState('ids', {parse: arrayValue(stringValue())});
    expect(idsState.isEqual([], idsState.defaultValue)).toBe(true);
    expect(idsState.isEqual(['a'], [])).toBe(false);
    // and the shared default cannot be mutated into every node
    expect(() => idsState.defaultValue.push('leak')).toThrow();
  });
});

describe('numberValue accepts a stringified number', () => {
  test('a string spelled as a JSON number is converted', () => {
    // Lexical writes numbers, but a hand-authored fixture, a converter or a
    // backend that stringified its numbers can hand one back as a string.
    const parse = numberValue(0);
    expect(parse('2')).toBe(2);
    expect(parse('0')).toBe(0);
    expect(parse('1e3')).toBe(1000);
    expect(parse('1E3')).toBe(1000);
    expect(parse('1e-3')).toBe(0.001);
    expect(parse('2.5')).toBe(2.5);
    expect(parse('-4')).toBe(-4);
    expect(parse('-0.5')).toBe(-0.5);
  });

  test('only the JSON grammar is read', () => {
    // Number() would take all of these; JSON.stringify writes none of them, so
    // they are not evidence of a number that was stringified.
    const parse = numberValue(7);
    for (const value of [
      '0x10', // 16
      '0b11', // 3
      '0o17', // 15
      '1_000', // NaN, but a valid numeric literal in source
      '+1', // 1
      '05', // 5
      '.5', // 0.5
      '5.', // 5
      ' 2 ', // 2, leading/trailing whitespace ignored
      '\n2', // 2
      '2n', // NaN
    ]) {
      expect(parse(value)).toBe(7);
    }
  });

  test('anything that does not read as a finite number is out of domain', () => {
    const parse = numberValue(7);
    // blank is the absence of a value, not Number('') === 0
    for (const value of ['', '   ', 'abc', 'Infinity', 'NaN', true, null, []]) {
      expect(parse(value)).toBe(7);
    }
  });

  test('the bounds apply to the converted value', () => {
    const span = numberValue(1, {integer: true, min: 1});
    expect(span('2')).toBe(2);
    expect(span('0')).toBe(1);
    expect(span('2.5')).toBe(1);
  });

  test('the reported domain is still numbers', () => {
    // A string is an input encoding, not part of the domain tooling generates.
    expect(numberValue().meta).toMatchObject({kind: 'number'});
    expect(numberValue(3).defaultValue).toBe(3);
  });

  test('a union accepts through a converting member', () => {
    // A member accepts when parsing lands anywhere but its own default, so one
    // that normalizes its input composes here just as it behaves alone — and
    // the union yields what that member parsed, not the raw value.
    const schema = unionValue([numberValue(), enumValue(['auto'])], 'auto');
    expect(schema('2')).toBe(2);
    expect(schema(2)).toBe(2);
    expect(schema('auto')).toBe('auto');
    // Still out of every member's domain, so still the declared fallback.
    expect(schema('banana')).toBe('auto');
    expect(transformValue(schema, v => (v === 'auto' ? 0 : v))('auto')).toBe(0);
  });

  test('the union reads a stringified number for a real node property', () => {
    // TextNode's format is a union, so this is the shape the coercion has to
    // survive to reach a document that stringified its numbers.
    const format = transformValue(
      unionValue([numberValue(), enumValue(['bold', 'italic'])], 0),
      value =>
        typeof value === 'string' ? {bold: 1, italic: 2}[value] : value,
    );
    expect(format('1')).toBe(1);
    expect(format(1)).toBe(1);
    expect(format('bold')).toBe(1);
    expect(format('junk')).toBe(0);
  });
});

describe('a default is metadata, so nothing hands out a mutable one', () => {
  test('a nested reference default is frozen too, not just the outer one', () => {
    // A value nested in an objectValue default is shared by every node with
    // none of its own exactly as the outer value is, so a shallow freeze would
    // leave the same hazard one level down.
    const schema = objectValue({
      items: arrayValue(stringValue()),
      n: numberValue(),
    });
    expect(Object.isFrozen(schema.defaultValue)).toBe(true);
    expect(Object.isFrozen(schema.defaultValue.items)).toBe(true);
    expect(() => schema.defaultValue.items.push('boom')).toThrow();
  });

  test('a union yields a fresh parse rather than a member default', () => {
    // Every other combinator allocates per parse; this one used to return the
    // member's frozen defaultValue by reference for an accepted value.
    const schema = unionValue([arrayValue(stringValue())]);
    const parsed = schema(['a']);
    expect(parsed).toEqual(['a']);
    expect(Object.isFrozen(parsed)).toBe(false);
    expect(schema([])).not.toBe(schema([]));
  });

  test('transformValue does not freeze the value its transform returned', () => {
    // The transform is the caller's function, so what it produces is theirs —
    // possibly a module constant they also use elsewhere.
    const shared = {a: 1};
    transformValue(stringValue(), () => shared);
    expect(Object.isFrozen(shared)).toBe(false);
  });
});

describe('schema(undefined) is always the schema default', () => {
  test('enumValue reads an absent value as its default, not as a member', () => {
    // An absent JSON property parses as undefined. Reading that as the in-band
    // undefined would make defaultValue a value parsing never restores, and
    // compaction drops a default-valued property expecting exactly that.
    const schema = enumValue([undefined, 'middle', 'bottom'], 'middle');
    expect(schema.defaultValue).toBe('middle');
    expect(schema(undefined)).toBe('middle');
    expect(schema('bottom')).toBe('bottom');
    // Unchanged when undefined leads the list, so it is also the default.
    const leading = enumValue([undefined, 'middle']);
    expect(leading.defaultValue).toBeUndefined();
    expect(leading(undefined)).toBeUndefined();
  });
});

describe('isEqual is total over the values a getter can return', () => {
  test('an array with holes is not equal to a dense one of the same length', () => {
    const schema = arrayValue(stringValue());
    assert(schema.isEqual !== undefined);
    expect(schema.isEqual(new Array(3), ['a', 'b', 'c'])).toBe(false);
    expect(schema.isEqual(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  test('an object carrying undeclared keys is not equal to the default', () => {
    // Those keys say something; reporting equality would drop them from the
    // export, and a flat NodeState borrows this comparator to decide that.
    const schema = objectValue({x: numberValue()});
    assert(schema.isEqual !== undefined);
    expect(schema.isEqual({x: 0}, schema.defaultValue)).toBe(true);
    expect(
      schema.isEqual({extra: 'keep', x: 0} as never, schema.defaultValue),
    ).toBe(false);
    // An array is an object, but not one this schema describes.
    expect(schema.isEqual([] as never, schema.defaultValue)).toBe(false);
  });

  test('transformValue takes an isEqual for a reference-typed output', () => {
    // Not inherited from inner, whose comparator is defined on a domain the
    // transform may have left entirely.
    const plain = transformValue(arrayValue(stringValue()), value => value);
    expect(plain.isEqual).toBeUndefined();
    const compared = transformValue(arrayValue(stringValue()), value => value, {
      isEqual: (a, b) => a.join() === b.join(),
    });
    assert(compared.isEqual !== undefined);
    expect(compared.isEqual([], compared.defaultValue)).toBe(true);
  });
});

describe('a misconfigured accessor fails at registration', () => {
  class MissingSetterNode extends ElementNode {
    $config() {
      return this.config('missing-setter-node', {
        extends: ElementNode,
        // There is no setLabel() on this class.
        json: objectValue({label: stringValue()}),
      });
    }
  }

  test('and keeps failing, rather than registering in silence', () => {
    const build = () =>
      buildEditorFromExtensions(
        defineExtension({name: '[missing-setter]', nodes: [MissingSetterNode]}),
      );
    // Registration is where the error names the class that is misconfigured;
    // later it would surface from whichever autosave or copy handler happened
    // to serialize one of these nodes first. Run it twice: the per-class record
    // is dropped when compiling throws, and caching one whose tables never
    // compiled would let the second attempt succeed against a broken class.
    for (let i = 0; i < 2; i++) {
      expect(build).toThrow('has no setter setLabel()');
    }
  });
});

describe('a misspelled field name is caught in both directions', () => {
  class ImportOnlyFieldNode extends ElementNode {
    __label = '';
    $config() {
      return this.config('import-only-field-node', {
        extends: ElementNode,
        // Import-only, and the field name is a typo of __label. Because the
        // property is never exported, this declaration produces an ownField
        // entry on the setter table and none on the getter table.
        //
        // Declared through `objectValue` rather than `nodeSchema` on purpose:
        // `nodeSchema` would reject the typo at compile time, which is the
        // point of it — what is under test here is the runtime check that
        // still has to catch the same mistake for a JavaScript caller.
        json: objectValue({
          label: withAccessors(stringValue(), {
            getter: null,
            setter: {field: '__lable'},
          }),
        }) as NodeSerializationSchema,
      });
    }
  }

  const build = () =>
    buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[import-only-field]',
        nodes: [ImportOnlyFieldNode],
      }),
    );

  test('exporting reports a typo that only the import side declares', () => {
    // Whichever direction runs first validates both tables. Checking only the
    // caller's would leave this one unreported for the whole process, since
    // exporting (autosave) generally precedes importing (paste).
    using editor = build();
    editor.update(
      () => {
        const node = $create(ImportOnlyFieldNode);
        expect(() => node.exportJSON()).toThrow(
          'names a node field __lable that the node does not have',
        );
      },
      {discrete: true},
    );
  });

  test('a swallowed failure does not retire the check', () => {
    // What a serialization path throws does not always reach the caller —
    // parseEditorState routes it to the editor's onError — so the class must
    // not be marked validated until the whole pass has run.
    using editor = build();
    editor.update(
      () => {
        const node = $create(ImportOnlyFieldNode);
        for (let i = 0; i < 2; i++) {
          expect(() => node.exportJSON()).toThrow(
            'names a node field __lable that the node does not have',
          );
        }
      },
      {discrete: true},
    );
  });
});

describe('a union member knows its own domain', () => {
  const dimension = unionValue(
    [numberValue(), enumValue(['inherit'])],
    'inherit',
  );

  test('a value a member normalizes into its default is still that member', () => {
    // The ambiguous case: numberValue reads '0' as 0, which is also what it
    // returns for a value it did not recognize. Inferring membership from the
    // parse alone reads this as a fallback and skips to the next member.
    expect(dimension('0')).toBe(0);
    expect(dimension('-0')).toBe(-0);
    expect(dimension(0)).toBe(0);
    // Still not a number, so still the union's fallback.
    expect(dimension('banana')).toBe('inherit');
    expect(dimension('inherit')).toBe('inherit');
  });

  test('nodeSchema rejects a name the node does not have', () => {
    class NamedNode extends ElementNode {
      __label = '';
      getLabel(): string {
        return this.getLatest().__label;
      }
      shouldWrite(): boolean {
        return true;
      }
    }
    // Every name resolves, so this compiles.
    const ok = nodeSchema<NamedNode>({
      gated: withAccessors(stringValue(), {
        getter: {field: '__label', method: 'getLabel', when: 'shouldWrite'},
      }),
      label: withField(stringValue(), {field: '__label'}),
    });
    expect(typeof ok).toBe('function');

    nodeSchema<NamedNode>({
      // @ts-expect-error -- __lable is not a field of NamedNode
      label: withField(stringValue(), {field: '__lable'}),
    });
    nodeSchema<NamedNode>({
      // @ts-expect-error -- getLabl is not a method of NamedNode
      label: withField(stringValue(), {field: '__label', getter: 'getLabl'}),
    });
    nodeSchema<NamedNode>({
      // @ts-expect-error -- shouldWrit is not a method of NamedNode
      label: withAccessors(stringValue(), {
        getter: {field: '__label', when: 'shouldWrit'},
      }),
    });
  });

  test('each value table is declared only on the direction that reads it', () => {
    // `decode` is applied on export and `encode` on import, so naming either
    // on the other side used to type-check and then be silently ignored. They
    // are declared on the direction-specific field types now, which makes the
    // wrong pairing a compile error rather than a property that does nothing.
    const schema = withAccessors(stringValue(), {
      getter: {decode: {stored: 'serialized'}, field: '__x'},
      setter: {encode: {serialized: 'stored'}, field: '__x'},
    });
    expect(isSchemaField(schema.getter)).toBe(true);
    expect(isSchemaField(schema.setter)).toBe(true);
    assert(isSchemaField(schema.getter));
    assert(isSchemaField(schema.setter));
    // isSchemaField narrows to the direction it was handed, so each side sees
    // only its own table.
    expectTypeOf(schema.getter).toHaveProperty('decode');
    expectTypeOf(schema.setter).toHaveProperty('encode');
    // @ts-expect-error -- `encode` is the import direction's table
    withAccessors(stringValue(), {getter: {encode: {a: 1}, field: '__x'}});
    // @ts-expect-error -- `decode` is the export direction's table
    withAccessors(stringValue(), {setter: {decode: {a: 1}, field: '__x'}});
  });

  test('a wrapper carries its inner membership into the union', () => {
    // Naming an accessor, transforming the output, or admitting a nil says
    // nothing about which *inputs* the member recognizes, so every wrapper
    // forwards `accepts` — without that, ImageNode's width-or-'inherit' shape
    // reads a stringified '0' as 'inherit' the moment the member is wrapped,
    // because '0' normalizes into numberValue's own default and only
    // `accepts` can tell that apart from a fallback.
    const width = unionValue(
      [
        withAccessors(numberValue(), {getter: 'getSerializedWidth'}),
        enumValue(['inherit']),
      ],
      'inherit',
    );
    expect(width('0')).toBe(0);
    expect(width(640)).toBe(640);
    expect(width('banana')).toBe('inherit');

    const field = unionValue(
      [withField(numberValue(), {field: '__width'}), enumValue(['inherit'])],
      'inherit',
    );
    expect(field('0')).toBe(0);

    const transformed = unionValue(
      [transformValue(numberValue(), value => value), enumValue(['inherit'])],
      'inherit',
    );
    expect(transformed('0')).toBe(0);

    const nilable = unionValue(
      [nullable(numberValue()), enumValue(['inherit'])],
      'inherit',
    );
    expect(nilable('0')).toBe(0);

    const maybe = unionValue(
      [optional(numberValue()), enumValue(['inherit'])],
      'inherit',
    );
    expect(maybe('0')).toBe(0);
  });

  test('a union is itself a member, so nesting one keeps its domain', () => {
    // The chain has to close: a union that declared no `accepts` of its own
    // would be read by the parse-inference, which cannot tell a value it
    // normalized into its own default from a fallback — so the nested union
    // parsing '0' to 0 (its default) would be skipped entirely.
    const inner = unionValue([numberValue(), enumValue(['inherit'])], 0);
    expect(typeof inner.accepts).toBe('function');
    const outer = unionValue([inner, stringValue('zzz')], 'zzz');
    expect(outer('0')).toBe(0);
    expect(outer(640)).toBe(640);
    expect(outer('inherit')).toBe('inherit');
    // A value no member recognizes still falls through to the string member.
    expect(outer('banana')).toBe('banana');
    // And through a wrapper, which lifts the union's membership like any
    // other inner schema's.
    expect(unionValue([nullable(inner), stringValue('zzz')], 'zzz')('0')).toBe(
      0,
    );
  });

  test('optional lifts membership for undefined only, nullable for both', () => {
    // `optional` hands `null` to its inner schema rather than absorbing it, so
    // claiming to accept null would commit the union to a member that then
    // answers with the inner fallback — 0 — where the unwrapped member
    // correctly declines and the union reaches its own default.
    const bare = unionValue([numberValue(), enumValue(['inherit'])], 'inherit');
    const maybe = unionValue(
      [optional(numberValue()), enumValue(['inherit'])],
      'inherit',
    );
    expect(bare(null)).toBe('inherit');
    expect(maybe(null)).toBe('inherit');
    // nullable *does* absorb both nils, so it accepts null and yields it.
    expect(
      unionValue(
        [nullable(numberValue()), enumValue(['inherit'])],
        'inherit',
      )(null),
    ).toBe(null);
  });

  test('a union defers equality to the member that recognizes the pair', () => {
    // Without this a union over a reference-typed member compares by identity:
    // the property could never equal its default and so never compact, and as
    // a createState parse it would dirty the node on every equal write.
    const ids = unionValue([arrayValue(stringValue()), enumValue(['all'])]);
    expect(isSchemaDefault(ids, [])).toBe(true);
    expect(isSchemaDefault(ids, ['a'])).toBe(false);
    expect(isSchemaEqual(ids, ['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isSchemaEqual(ids, ['a'], ['b'])).toBe(false);
    // A primitive member still compares by identity through the same path.
    expect(isSchemaEqual(ids, 'all', 'all')).toBe(true);
  });

  test('a bounded member rejects what falls outside its bounds', () => {
    const span = unionValue([numberValue(1, {integer: true, min: 1})], 1);
    expect(span('4')).toBe(4);
    expect(span('0')).toBe(1);
    expect(span('1.5')).toBe(1);
  });
});

describe('a sparse array is parsed, not passed through', () => {
  test('holes go through the item schema like any other element', () => {
    // `map` preserves holes, so the item schema would never see them and a
    // string[] property would serialize them as null.
    const schema = arrayValue(stringValue());
    const parsed = schema(new Array(3));
    expect(parsed).toEqual(['', '', '']);
    expect(0 in parsed).toBe(true);
    expect(schema(['a', 42, null])).toEqual(['a', '', '']);
  });
});
