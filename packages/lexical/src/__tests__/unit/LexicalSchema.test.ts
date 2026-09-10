/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {QuoteNode} from '@lexical/rich-text';

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTabNode,
  $isTextNode,
  type $parseSerializedNode,
  aliasedValue,
  arrayValue,
  booleanValue,
  type CompactSerializedEditorState,
  createState,
  DecoratorNode,
  ElementNode,
  enumValue,
  getComposedSchemaFields,
  IS_BOLD,
  type Klass,
  type LexicalExportJSON,
  type LexicalNode,
  type LexicalParseJSON,
  type LexicalSchemaInput,
  type LexicalUpdateJSON,
  nodeSchema,
  type NodeSerializationSchema,
  nullable,
  numberValue,
  objectValue,
  optional,
  type ParagraphNode,
  rawValue,
  type SchemaInput,
  type SerializationSchemaValue,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type SerializedParagraphNode,
  type SerializedPartial,
  type SerializedPartialNode,
  type SerializedTextNode,
  stringValue,
  TabNode,
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
    // An empty domain admits nothing, so every value would parse to a default
    // that came from nowhere. Refused by the type...
    // @ts-expect-error - values must be a non-empty tuple
    expect(() => enumValue([])).toThrow();
    // ...and at runtime, since a type can be asserted past.
    expect(() => enumValue([] as unknown as [string, ...string[]])).toThrow(
      /must not be empty/,
    );
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
    test('defers equality to whichever member has one', () => {
      // What the equality is for: a member returning a fresh value per parse
      // would otherwise never equal the default and so never compact.
      const tags = unionValue([arrayValue(stringValue()), enumValue(['all'])]);
      expect(isSchemaEqual(tags, ['a'], ['a'])).toBe(true);
      expect(isSchemaEqual(tags, ['a'], ['b'])).toBe(false);
      // A member's equality is asked about every pair, not only the ones it
      // recognizes, so each has to be total — arrayValue's answers `false` for
      // the enum member's values rather than throwing on them.
      expect(isSchemaEqual(tags, 'all', 'all')).toBe(true);
      expect(isSchemaEqual(tags, 'all', ['a'])).toBe(false);
      // With no member to defer to the `some` is always false, leaving
      // isSchemaEqual's leading identity test as the whole comparison.
      expect(isSchemaEqual(dimension, 640, 640)).toBe(true);
      expect(isSchemaEqual(dimension, 640, 'inherit')).toBe(false);
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
    test('meta names the transform and holds the inner schema', () => {
      // Introspection still reaches the accepted input domain, so generated
      // examples keep exercising the legacy forms — but through a kind of its
      // own rather than by wearing the inner schema's. The transform is the
      // one part of a schema that cannot be described structurally, and a
      // consumer that reasons about the *output* has to be told that.
      const inner = withAccessors(stringValue(), {setter: 'setFoo'});
      const t = transformValue(inner, s => s.length);
      expect(t.meta).toEqual({inner, kind: 'transform'});
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

    test('withField splits its options into the direction each belongs to', () => {
      // Every option but `field` is one direction's, so the direction that
      // does not take it must not end up carrying it: a `when` on the setter
      // has nothing to gate, and each table is read by one side only.
      const schema = withField(numberValue(), {
        decode: {1: 'one'},
        encode: {one: 1},
        field: '__count',
        getter: 'getCount',
        setter: 'setCount',
        when: 'shouldWriteCount',
      });
      expect(schema.getter).toEqual({
        decode: {1: 'one'},
        field: '__count',
        method: 'getCount',
        when: 'shouldWriteCount',
      });
      expect(schema.setter).toEqual({
        encode: {one: 1},
        field: '__count',
        method: 'setCount',
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
  test('version is optional exactly where it is absent', () => {
    // The legacy form writes it unconditionally, so the full output type
    // promises it — relaxing it at the base would take that promise away from
    // every consumer of a legacy export to describe a case they are not in.
    expectTypeOf<SerializedLexicalNode['version']>().toEqualTypeOf<number>();
    // The compact form omits it, along with everything else parsing restores.
    expectTypeOf<
      SerializedPartial<SerializedLexicalNode>['version']
    >().toEqualTypeOf<number | undefined>();
    // a slot value is parsed by the same rules, so it relaxes the same way
    expectTypeOf<
      NonNullable<
        SerializedPartial<SerializedLexicalNode>['$slots']
      >[string]['version']
    >().toEqualTypeOf<number | undefined>();
    // Parsing drops it outright rather than relaxing it: nothing reads it.
    expectTypeOf<
      'version' extends keyof LexicalParseJSON<SerializedLexicalNode>
        ? true
        : false
    >().toEqualTypeOf<false>();
  });

  test('an element relaxes its children too', () => {
    // Every node in a compact document is compact, not just the root: a child
    // read off the array is another node written in the same form, and the
    // properties it omitted are absent there as well.
    type CompactParagraph = SerializedPartial<SerializedParagraphNode>;
    const child: NonNullable<CompactParagraph['children']>[number] = {
      type: 'text',
    };
    expectTypeOf(child.version).toEqualTypeOf<number | undefined>();
    // The legacy form still promises what it writes, at every depth.
    expectTypeOf<
      SerializedParagraphNode['children'][number]['version']
    >().toEqualTypeOf<number>();
    // A node with no children is not given one.
    expectTypeOf<
      'children' extends keyof SerializedPartial<SerializedTextNode>
        ? true
        : false
    >().toEqualTypeOf<false>();
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

    test('the compact form is typed as the partial it returns', () => {
      testEnv.editor.update(() => {
        const node = $createParagraphNode();
        // The legacy form writes every property, so it is the full type…
        expectTypeOf(
          node.exportJSON(),
        ).toEqualTypeOf<SerializedParagraphNode>();
        expectTypeOf(
          node.exportJSON(false),
        ).toEqualTypeOf<SerializedParagraphNode>();
        // …and the compact form omits them, so every one is optional. Typing
        // it as the full shape is what let `json.indent.toFixed()` compile on
        // a value the form had dropped.
        expectTypeOf(node.exportJSON(true)).toEqualTypeOf<
          SerializedPartial<SerializedParagraphNode>
        >();
        expectTypeOf(node.exportJSON(true).indent).toEqualTypeOf<
          number | undefined
        >();
        // A flag whose value is not known statically cannot promise either
        // form, so it resolves to the one that admits both.
        const compact: boolean = Math.max(0, 1) > 0;
        expectTypeOf(node.exportJSON(compact)).toEqualTypeOf<
          SerializedPartial<SerializedParagraphNode>
        >();
        // LexicalExportJSON still describes the legacy form, which is the one
        // that writes everything — it reads the first overload, not the last.
        expectTypeOf<
          LexicalExportJSON<ParagraphNode>['indent']
        >().toEqualTypeOf<number>();
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
        json: nodeSchema<FieldNode>()({
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
          json: nodeSchema<TagsNode>()({
            tags: withField(arrayValue(stringValue()), {field: '__tags'}),
          }),
        });
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
    const root = editor.read(() => editor.getEditorState().toJSON(true).root);
    const [emptyJSON, fullJSON] = root.children!;
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

describe('a clone carries the fields the schema declares', () => {
  /** Whether this exact class carries a method, rather than inheriting one. */
  function hasOwnAfterCloneFrom(klass: Klass<LexicalNode>): boolean {
    return Object.prototype.hasOwnProperty.call(
      klass.prototype,
      'afterCloneFrom',
    );
  }

  /**
   * A node is only cloned across updates: within one, `$setNodeKey` has put it
   * in `_cloneNotNeeded` and `getWritable()` hands back the same object, so a
   * single-update test would never reach `afterCloneFrom` at all.
   */
  function writeThenRewrite<T extends ElementNode>(
    editor: ReturnType<typeof buildEditorFromExtensions>,
    klass: Klass<T>,
    write: (node: T) => void,
  ): T {
    let key = '';
    editor.update(
      () => {
        const node = $create(klass);
        write(node);
        $getRoot().clear().append(node);
        key = node.getKey();
      },
      {discrete: true},
    );
    let cloned!: T;
    editor.update(
      () => {
        cloned = $getRoot().getFirstChild()!.getWritable() as T;
        expect(cloned.getKey()).toBe(key);
      },
      {discrete: true},
    );
    return cloned;
  }

  test('a node that declares only fields needs no afterCloneFrom', () => {
    // The node the docs teach: three properties, each declared as a field, and
    // no clone boilerplate. Before the schema carried them, every one of them
    // reverted to its constructor default on the first edit after the node was
    // created.
    class CalloutNode extends ElementNode {
      __label: string = '';
      __level: number = 1;
      __tone: 'info' | 'warning' | 'danger' = 'info';
      $config() {
        return this.config('callout', {
          extends: ElementNode,
          json: nodeSchema<CalloutNode>()({
            label: withField(stringValue(), {field: '__label'}),
            level: withField(numberValue(1, {integer: true, max: 3, min: 1}), {
              field: '__level',
            }),
            tone: withField(enumValue(['info', 'warning', 'danger']), {
              field: '__tone',
            }),
          }),
        });
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[callout-clone]',
        nodes: [CalloutNode],
      }),
    );
    const cloned = writeThenRewrite(editor, CalloutNode, node => {
      node.__label = 'Heads up';
      node.__level = 3;
      node.__tone = 'danger';
    });
    editor.read(() =>
      expect(cloned.exportJSON()).toMatchObject({
        label: 'Heads up',
        level: 3,
        tone: 'danger',
      }),
    );
  });

  test('each class carries its own fields and delegates the rest', () => {
    class BaseNode extends ElementNode {
      __base: string = '';
      $config() {
        return this.config('carry-base', {
          extends: ElementNode,
          json: nodeSchema<BaseNode>()({
            base: withField(stringValue(), {field: '__base'}),
          }),
        });
      }
    }
    class DerivedNode extends BaseNode {
      __derived: string = '';
      $config() {
        return this.config('carry-derived', {
          extends: BaseNode,
          json: nodeSchema<DerivedNode>()({
            derived: withField(stringValue(), {field: '__derived'}),
          }),
        });
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[carry-chain]',
        nodes: [BaseNode, DerivedNode],
      }),
    );
    const cloned = writeThenRewrite(editor, DerivedNode, node => {
      node.__base = 'from the base';
      node.__derived = 'from the subclass';
    });
    expect(cloned.__base).toBe('from the base');
    expect(cloned.__derived).toBe('from the subclass');
  });

  test('a hand-written afterCloneFrom is left alone', () => {
    // A property declared through accessor methods names no field, so nothing
    // is derived for it and the class stays responsible — as MarkNode's `ids`
    // is. The counter proves the class's own method is what ran.
    let calls = 0;
    class AccessorNode extends ElementNode {
      __ids: readonly string[] = [];
      $config() {
        return this.config('carry-accessor', {
          extends: ElementNode,
          json: nodeSchema<AccessorNode>()({
            ids: withAccessors(arrayValue(stringValue()), {
              getter: 'getIds',
              setter: 'setIds',
            }),
          }),
        });
      }
      afterCloneFrom(prevNode: this): void {
        super.afterCloneFrom(prevNode);
        calls += 1;
        this.__ids = prevNode.__ids;
      }
      getIds(): readonly string[] {
        return this.getLatest().__ids;
      }
      setIds(ids: readonly string[]): this {
        const self = this.getWritable();
        self.__ids = ids;
        return self;
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[carry-accessor]',
        nodes: [AccessorNode],
      }),
    );
    const cloned = writeThenRewrite(editor, AccessorNode, node => {
      node.__ids = ['a', 'b'];
    });
    expect(cloned.__ids).toEqual(['a', 'b']);
    expect(calls).toBeGreaterThan(0);
  });

  test('a re-declared field is assigned once, by the class that owns it', () => {
    // Re-declaring an inherited property changes how it is serialized, not
    // where it is stored, and the ancestor's afterCloneFrom has already
    // assigned it by the time the subclass's would. TabNode is the in-tree
    // case: it restates TextNode's `text`, `detail` and `mode`.
    class StoreNode extends ElementNode {
      __shared: string = '';
      $config() {
        return this.config('assign-once-base', {
          extends: ElementNode,
          json: nodeSchema<StoreNode>()({
            shared: withField(stringValue(), {field: '__shared'}),
          }),
        });
      }
    }
    class RestateNode extends StoreNode {
      $config() {
        return this.config('assign-once-derived', {
          extends: StoreNode,
          json: nodeSchema<RestateNode>()({
            shared: withField(stringValue('other'), {field: '__shared'}),
          }),
        });
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[assign-once]',
        nodes: [StoreNode, RestateNode],
      }),
    );
    // Only the class that declared it first gets a method; the subclass has
    // nothing left of its own and inherits that one.
    expect(hasOwnAfterCloneFrom(StoreNode)).toBe(true);
    expect(hasOwnAfterCloneFrom(RestateNode)).toBe(false);
    // Same rule, applied to the real pair.
    expect(hasOwnAfterCloneFrom(TextNode)).toBe(true);
    expect(hasOwnAfterCloneFrom(TabNode)).toBe(false);

    editor.update(
      () => {
        const node = $create(RestateNode);
        const writes: string[] = [];
        let stored = node.__shared;
        Object.defineProperty(node, '__shared', {
          configurable: true,
          get: () => stored,
          set: (value: string) => {
            writes.push(value);
            stored = value;
          },
        });
        const prev = $create(RestateNode);
        prev.__shared = 'carried';
        node.afterCloneFrom(prev);
        expect(writes).toEqual(['carried']);
      },
      {discrete: true},
    );
  });

  test('what a base class carries does not depend on registration order', () => {
    // The subclass re-declares the base's field, so it owns that key in every
    // composition that contains it. Registering the subclass must not leave the
    // base with a method that has stopped copying its own field, which is what
    // deriving each class's list from the registered class's view would do.
    class ReBaseNode extends ElementNode {
      __shared: string = '';
      $config() {
        return this.config('order-base', {
          extends: ElementNode,
          json: nodeSchema<ReBaseNode>()({
            shared: withField(stringValue(), {field: '__shared'}),
          }),
        });
      }
    }
    class ReDerivedNode extends ReBaseNode {
      $config() {
        return this.config('order-derived', {
          extends: ReBaseNode,
          json: nodeSchema<ReDerivedNode>()({
            shared: withField(stringValue('fallback'), {field: '__shared'}),
          }),
        });
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[order-independence]',
        // The subclass first, so the base is only ever reached through it.
        nodes: [ReDerivedNode, ReBaseNode],
      }),
    );
    expect(
      writeThenRewrite(editor, ReBaseNode, node => {
        node.__shared = 'base value';
      }).__shared,
    ).toBe('base value');
    expect(
      writeThenRewrite(editor, ReDerivedNode, node => {
        node.__shared = 'derived value';
      }).__shared,
    ).toBe('derived value');
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

describe('a schema tracks what it accepts, not only what it parses to', () => {
  // The two differ wherever a schema reads more than it writes, and the
  // difference is not decoration: `nodeArbitrary` generates the legacy
  // spellings an `aliasedValue` accepts, so a type that describes only the
  // parsed output is wrong about the values that actually reach a parser.

  test('a primitive accepts what it parses, except where it reads more', () => {
    expectTypeOf<
      SchemaInput<ReturnType<typeof stringValue>>
    >().toEqualTypeOf<string>();
    expectTypeOf<
      SchemaInput<ReturnType<typeof booleanValue>>
    >().toEqualTypeOf<boolean>();
    // numberValue also reads a number spelled as a string.
    expectTypeOf<SchemaInput<ReturnType<typeof numberValue>>>().toEqualTypeOf<
      number | string
    >();
  });

  test('an alias table widens the accepted input, not the output', () => {
    const format = aliasedValue(numberValue(), {bold: 1, italic: 2});
    expectTypeOf<
      SerializationSchemaValue<typeof format>
    >().toEqualTypeOf<number>();
    expectTypeOf<SchemaInput<typeof format>>().toEqualTypeOf<
      number | string | 'bold' | 'italic'
    >();
    // and the values really are accepted
    expect(format('bold')).toBe(1);
    expect(format('2')).toBe(2);
  });

  test('the wrappers widen their inner the way they widen its output', () => {
    const s = stringValue();
    expect(s('x')).toBe('x');
    expectTypeOf<
      SchemaInput<ReturnType<typeof optional<string>>>
    >().toEqualTypeOf<string | undefined>();
    expectTypeOf<SchemaInput<typeof s>>().toEqualTypeOf<string>();
    expectTypeOf<
      SchemaInput<ReturnType<typeof nullable<string>>>
    >().toEqualTypeOf<string | null | undefined>();
    // an array of whatever the item accepts
    expectTypeOf<
      SchemaInput<ReturnType<typeof arrayValue<number>>>
    >().toEqualTypeOf<readonly number[]>();
  });

  test('a union accepts what any member accepts', () => {
    const dimension = unionValue(
      [numberValue(), enumValue(['inherit'])],
      'inherit',
    );
    expectTypeOf<SerializationSchemaValue<typeof dimension>>().toEqualTypeOf<
      number | 'inherit'
    >();
    expectTypeOf<SchemaInput<typeof dimension>>().toEqualTypeOf<
      number | string | 'inherit'
    >();
    expect(dimension('640')).toBe(640);
  });

  test('a node schema keeps the input of the fields it was given', () => {
    // What the currying is for. `nodeSchema<N>` has to take `N` explicitly,
    // and TypeScript will not infer the field types alongside a type argument
    // that was written out — so with both on one call the fields were widened
    // to the index signature and their input went with them. Split in two, the
    // node is explicit on the first and the fields are inferred on the second.
    class InputNode extends ElementNode {
      __format = 0;
      __label = '';
    }
    const schema = nodeSchema<InputNode>()({
      format: withField(aliasedValue(numberValue(), {bold: 1}), {
        field: '__format',
      }),
      label: withField(stringValue(), {field: '__label'}),
    });
    expectTypeOf<SchemaInput<typeof schema>>().toEqualTypeOf<{
      readonly format?: number | string;
      readonly label?: string;
    }>();
    // and the alias really parses, which is what the type is describing
    expect(schema({format: 'bold'})).toMatchObject({format: 1});
  });

  test('a node composes the input it accepts across its config chain', () => {
    // ParagraphNode declares no schema of its own, so everything here is
    // ElementNode's — reached by following each config's `extends`, which is
    // why every config in the tree names one even though the runtime defaults
    // it to the superclass.
    expectTypeOf<keyof LexicalSchemaInput<ParagraphNode>>().toEqualTypeOf<
      'direction' | 'format' | 'indent' | 'textFormat' | 'textStyle'
    >();
    // TextNode's are its own, and `format` accepts the legacy spellings its
    // aliasedValue declares as well as the number it stores.
    expectTypeOf<LexicalSchemaInput<TextNode>['format']>().toEqualTypeOf<
      number | string | undefined
    >();
  });

  test('a chain deeper than any bound resolves, base included', () => {
    // Twenty links, which is past the fixed slot count an earlier
    // hand-rolled fold here allowed: the walk resolves the chain to a tuple
    // and the fold over it is tail-recursive, so ancestors do not quietly
    // stop contributing at a depth nothing names. Only the two ends declare
    // a schema — the assertion reads those, and the eighteen links between
    // them are what makes it a depth test, so paying `nodeSchema`'s
    // per-member obligation check on each of them buys nothing.
    class Deep1 extends ElementNode {
      __p1 = '';
      $config() {
        return this.config('deep-1', {
          extends: ElementNode,
          json: nodeSchema<Deep1>()({
            p1: withField(stringValue(), {field: '__p1'}),
          }),
        });
      }
    }
    class Deep2 extends Deep1 {
      $config() {
        return this.config('deep-2', {extends: Deep1});
      }
    }
    class Deep3 extends Deep2 {
      $config() {
        return this.config('deep-3', {extends: Deep2});
      }
    }
    class Deep4 extends Deep3 {
      $config() {
        return this.config('deep-4', {extends: Deep3});
      }
    }
    class Deep5 extends Deep4 {
      $config() {
        return this.config('deep-5', {extends: Deep4});
      }
    }
    class Deep6 extends Deep5 {
      $config() {
        return this.config('deep-6', {extends: Deep5});
      }
    }
    class Deep7 extends Deep6 {
      $config() {
        return this.config('deep-7', {extends: Deep6});
      }
    }
    class Deep8 extends Deep7 {
      $config() {
        return this.config('deep-8', {extends: Deep7});
      }
    }
    class Deep9 extends Deep8 {
      $config() {
        return this.config('deep-9', {extends: Deep8});
      }
    }
    class Deep10 extends Deep9 {
      $config() {
        return this.config('deep-10', {extends: Deep9});
      }
    }
    class Deep11 extends Deep10 {
      $config() {
        return this.config('deep-11', {extends: Deep10});
      }
    }
    class Deep12 extends Deep11 {
      $config() {
        return this.config('deep-12', {extends: Deep11});
      }
    }
    class Deep13 extends Deep12 {
      $config() {
        return this.config('deep-13', {extends: Deep12});
      }
    }
    class Deep14 extends Deep13 {
      $config() {
        return this.config('deep-14', {extends: Deep13});
      }
    }
    class Deep15 extends Deep14 {
      $config() {
        return this.config('deep-15', {extends: Deep14});
      }
    }
    class Deep16 extends Deep15 {
      $config() {
        return this.config('deep-16', {extends: Deep15});
      }
    }
    class Deep17 extends Deep16 {
      $config() {
        return this.config('deep-17', {extends: Deep16});
      }
    }
    class Deep18 extends Deep17 {
      $config() {
        return this.config('deep-18', {extends: Deep17});
      }
    }
    class Deep19 extends Deep18 {
      $config() {
        return this.config('deep-19', {extends: Deep18});
      }
    }
    class Deep20 extends Deep19 {
      $config() {
        return this.config('deep-45', {extends: Deep19});
      }
    }
    class Deep21 extends Deep20 {
      $config() {
        return this.config('deep-21', {extends: Deep20});
      }
    }
    class Deep22 extends Deep21 {
      $config() {
        return this.config('deep-22', {extends: Deep21});
      }
    }
    class Deep23 extends Deep22 {
      $config() {
        return this.config('deep-23', {extends: Deep22});
      }
    }
    class Deep24 extends Deep23 {
      $config() {
        return this.config('deep-24', {extends: Deep23});
      }
    }
    class Deep25 extends Deep24 {
      $config() {
        return this.config('deep-25', {extends: Deep24});
      }
    }
    class Deep26 extends Deep25 {
      $config() {
        return this.config('deep-26', {extends: Deep25});
      }
    }
    class Deep27 extends Deep26 {
      $config() {
        return this.config('deep-27', {extends: Deep26});
      }
    }
    class Deep28 extends Deep27 {
      $config() {
        return this.config('deep-28', {extends: Deep27});
      }
    }
    class Deep29 extends Deep28 {
      $config() {
        return this.config('deep-29', {extends: Deep28});
      }
    }
    class Deep30 extends Deep29 {
      $config() {
        return this.config('deep-30', {extends: Deep29});
      }
    }
    class Deep31 extends Deep30 {
      $config() {
        return this.config('deep-31', {extends: Deep30});
      }
    }
    class Deep32 extends Deep31 {
      $config() {
        return this.config('deep-32', {extends: Deep31});
      }
    }
    class Deep33 extends Deep32 {
      $config() {
        return this.config('deep-33', {extends: Deep32});
      }
    }
    class Deep34 extends Deep33 {
      $config() {
        return this.config('deep-34', {extends: Deep33});
      }
    }
    class Deep35 extends Deep34 {
      $config() {
        return this.config('deep-35', {extends: Deep34});
      }
    }
    class Deep36 extends Deep35 {
      $config() {
        return this.config('deep-36', {extends: Deep35});
      }
    }
    class Deep37 extends Deep36 {
      $config() {
        return this.config('deep-37', {extends: Deep36});
      }
    }
    class Deep38 extends Deep37 {
      $config() {
        return this.config('deep-38', {extends: Deep37});
      }
    }
    class Deep39 extends Deep38 {
      $config() {
        return this.config('deep-39', {extends: Deep38});
      }
    }
    class Deep40 extends Deep39 {
      $config() {
        return this.config('deep-40', {extends: Deep39});
      }
    }
    class Deep41 extends Deep40 {
      $config() {
        return this.config('deep-41', {extends: Deep40});
      }
    }
    class Deep42 extends Deep41 {
      $config() {
        return this.config('deep-42', {extends: Deep41});
      }
    }
    class Deep43 extends Deep42 {
      $config() {
        return this.config('deep-43', {extends: Deep42});
      }
    }
    class Deep44 extends Deep43 {
      $config() {
        return this.config('deep-44', {extends: Deep43});
      }
    }
    class Deep45 extends Deep44 {
      __p45 = '';
      $config() {
        return this.config('deep-20', {
          extends: Deep44,
          json: nodeSchema<Deep45>()({
            p45: withField(stringValue(), {field: '__p45'}),
          }),
        });
      }
    }
    // Exact, not assignable-to: a fold that dropped the base would still
    // satisfy `const k: keyof ... = 'p20'`, which is the whole failure being
    // guarded against.
    expectTypeOf<keyof LexicalSchemaInput<Deep45>>().toEqualTypeOf<
      | 'p1'
      | 'p45'
      | 'direction'
      | 'format'
      | 'indent'
      | 'textFormat'
      | 'textStyle'
    >();
    // and the runtime walk reaches just as far, which is what the type is
    // claiming to describe. (Type assertions are erased by the test runner,
    // so without this the case would pass under `test-unit` either way.)
    expect(Object.keys(getComposedSchemaFields(Deep45)).sort()).toEqual([
      'direction',
      'format',
      'indent',
      'p1',
      'p45',
      'textFormat',
      'textStyle',
    ]);
  });

  test('a node that omits extends keeps its own schema', () => {
    // Its superclass declares no `$config()`, so the record carries no
    // accessor and the walk has nothing to follow — but the node's own
    // declaration is still there to be read, by type as it is at runtime.
    class CaptionNode extends DecoratorNode<null> {
      __caption = '';
      $config() {
        return this.config('caption-no-extends', {
          json: nodeSchema<CaptionNode>()({
            caption: withField(stringValue(), {field: '__caption'}),
          }),
        });
      }
      decorate(): null {
        return null;
      }
    }
    const key: keyof LexicalSchemaInput<CaptionNode> = 'caption';
    expect(key).toBe('caption');
  });

  test('a re-declared property is the subclass’s, not the intersection', () => {
    // `composeSchema` resolves a re-declared key to one winning schema, most
    // derived first, so a subclass that widens a domain really does accept the
    // wider one. Intersecting the two would report the ancestor's.
    class TagBase extends ElementNode {
      __tag: 'a' | 'b' | 'c' = 'a';
      $config() {
        return this.config('tag-base', {
          extends: ElementNode,
          json: nodeSchema<TagBase>()({
            tag: withField(enumValue(['a']), {field: '__tag'}),
          }),
        });
      }
    }
    class TagSub extends TagBase {
      $config() {
        return this.config('tag-sub', {
          extends: TagBase,
          json: nodeSchema<TagSub>()({
            tag: withField(enumValue(['a', 'b', 'c']), {field: '__tag'}),
          }),
        });
      }
    }
    const widened: LexicalSchemaInput<TagSub>['tag'] = 'c';
    expect(widened).toBe('c');
    // and the runtime agrees, which is what makes the type worth pinning
    expect(getComposedSchemaFields(TagSub).tag('c')).toBe('c');
    expect(getComposedSchemaFields(TagBase).tag('c')).toBe('a');
  });

  test('a node composes its flat NodeState too', () => {
    // `getComposedSchemaFields` folds flat NodeState in beside the schema's
    // own properties, and `nodeArbitrary` generates from that — so a type
    // describing what a node accepts has to carry those keys or it denies
    // values the generator really produces. QuoteNode's `shadowRoot` is the
    // in-tree case.
    const key: keyof LexicalSchemaInput<QuoteNode> = 'shadowRoot';
    expect(key).toBe('shadowRoot');
  });

  test('an object accepts each property’s input, any of them absent', () => {
    const point = objectValue({label: stringValue(), x: numberValue()});
    expect(point({x: '3'})).toEqual({label: '', x: 3});
    expectTypeOf<SchemaInput<typeof point>>().toEqualTypeOf<{
      readonly label?: string;
      readonly x?: number | string;
    }>();
  });
});

describe('the parse shape accepts what a parser actually accepts', () => {
  initializeUnitTest(testEnv => {
    test('a legacy alias and a stringified number type-check as input', () => {
      testEnv.editor.update(
        () => {
          const node = $createTextNode('hi');
          // Both are values TextNode's schema accepts and normalizes. Before
          // the parse shape was widened, each was a type error at the call
          // site while working perfectly at runtime — the type described what
          // the parser produces rather than what it takes.
          node.updateFromJSON({detail: 'directionless', format: 'bold'});
          expect(node.getFormat()).toBe(IS_BOLD);
          expect(node.isDirectionless()).toBe(true);
        },
        {discrete: true},
      );
    });

    test('a property the node does not have is still refused', () => {
      testEnv.editor.update(
        () => {
          const node = $createTextNode('hi');
          node.updateFromJSON({
            // @ts-expect-error -- widening the values keeps the names checked
            frmat: 'bold',
          });
        },
        {discrete: true},
      );
    });
  });
});

describe('a schema is bound to the node it was checked against', () => {
  class Alpha extends ElementNode {
    __alpha = '';
    getAlpha(): string {
      return this.getLatest().__alpha;
    }
    setAlpha(alpha: string): this {
      const self = this.getWritable();
      self.__alpha = alpha;
      return self;
    }
  }
  class Beta extends ElementNode {
    __beta = '';
  }
  const alphaSchema = nodeSchema<Alpha>()({
    alpha: withField(stringValue(), {field: '__alpha'}),
  });

  test('it installs on the node it names, and on a subclass of it', () => {
    class AlphaNode extends Alpha {
      $config() {
        return this.config('bound-alpha', {
          extends: ElementNode,
          json: alphaSchema,
        });
      }
    }
    expect(typeof AlphaNode).toBe('function');
    expectTypeOf(alphaSchema).toMatchTypeOf<NodeSerializationSchema<Alpha>>();
  });

  test('it does not install on an unrelated node', () => {
    // Asserted on `config()` directly rather than inside a `$config()`
    // override: a rejected call has the error type for a return type, which
    // would fail the override check too and report twice for one mistake.
    // Declared, never called: the assertion is the compile error below.
    const _refused = (beta: Beta) =>
      // @ts-expect-error -- alphaSchema was checked against Alpha, whose
      // members Beta does not have: "Type 'Beta' is missing the following
      // properties from type 'Alpha': __alpha, getAlpha, setAlpha"
      beta.config('bound-beta', {extends: ElementNode, json: alphaSchema});
    expect(typeof _refused).toBe('function');
  });

  test('a schema that names nothing installs anywhere', () => {
    // objectValue names no node member, so it was checked against nothing and
    // is not bound to anything either.
    class AnyNode extends Beta {
      $config() {
        return this.config('bound-any', {
          extends: ElementNode,
          json: objectValue({label: rawValue()}),
        });
      }
    }
    expect(typeof AnyNode).toBe('function');
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

  test('an alias whose target is the inner default is still that member', () => {
    // The same ambiguity one level down, and the reason an aliased schema
    // always declares `accepts`: `stringValue` declares none, so membership
    // would be inferred from a parse that lands on the default — which the
    // inference reads as "did not recognize it" — and the union would fall
    // back for a value its only member does accept.
    const legacy = aliasedValue(stringValue(), {none: ''});
    expect(legacy('none')).toBe('');
    expect(unionValue([legacy], 'fallback')('none')).toBe('');
    // A value no member accepts still falls back.
    expect(unionValue([legacy], 'fallback')(42)).toBe('fallback');
  });

  test('a comparator never sees values its own member did not produce', () => {
    // A custom isEqual is arbitrary code written for one domain, and a union
    // cannot know which member produced a value — it selects by what each
    // member *accepts*, and a transform accepts one domain and produces
    // another. So it defers to no member and compares by content, which is
    // what arrayValue and objectValue's own comparators do anyway.
    const byId = transformValue(
      objectValue({id: numberValue(), tag: stringValue()}),
      value => value,
      {isEqual: (a, b) => a.id === b.id},
    );
    const plain = objectValue({v: numberValue()});
    const union = unionValue([byId, plain]);
    expect(union.isEqual!({v: 1} as never, {v: 2} as never)).toBe(false);
    // The custom rule is not consulted, so two values it would call equal are
    // reported as different. That is the safe direction: it costs a property
    // its compaction, where the reverse would drop the difference.
    expect(
      union.isEqual!({id: 1, tag: 'a'} as never, {id: 1, tag: 'b'} as never),
    ).toBe(false);
    // And the member's own comparator is untouched outside the union.
    expect(isSchemaEqual(byId, {id: 1, tag: 'a'}, {id: 1, tag: 'b'})).toBe(
      true,
    );
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
    const ok = nodeSchema<NamedNode>()({
      gated: withAccessors(stringValue(), {
        getter: {field: '__label', method: 'getLabel', when: 'shouldWrite'},
      }),
      label: withField(stringValue(), {field: '__label'}),
    });
    expect(typeof ok).toBe('function');

    nodeSchema<NamedNode>()({
      // @ts-expect-error -- __lable is not a field of NamedNode
      label: withField(stringValue(), {field: '__lable'}),
    });
    nodeSchema<NamedNode>()({
      // @ts-expect-error -- getLabl is not a method of NamedNode
      label: withField(stringValue(), {field: '__label', getter: 'getLabl'}),
    });
    nodeSchema<NamedNode>()({
      // @ts-expect-error -- shouldWrit is not a method of NamedNode
      label: withAccessors(stringValue(), {
        getter: {field: '__label', when: 'shouldWrit'},
      }),
    });
    nodeSchema<NamedNode>()({
      // @ts-expect-error -- withField declares a predicate the same way
      label: withField(stringValue(), {field: '__label', when: 'shouldWrit'}),
    });
  });

  test('nodeSchema rejects a name used in the wrong position', () => {
    // Every name below is a real member. What is wrong is the position it was
    // written in, which a check that only asks "does the node have this?"
    // cannot see: the walk resolves the method, calls it, and quietly does
    // something other than what was declared.
    class RoleNode extends ElementNode {
      __label = '';
      getLabel(): string {
        return this.getLatest().__label;
      }
      setLabel(label: string): this {
        const self = this.getWritable();
        self.__label = label;
        return self;
      }
      describe(): string {
        return `label=${this.__label}`;
      }
      gated(flag: boolean): boolean {
        return flag;
      }
      shouldWrite(): boolean {
        return true;
      }
    }
    // The correct positions still compile.
    expect(
      typeof nodeSchema<RoleNode>()({
        label: withAccessors(stringValue(), {
          getter: {field: '__label', method: 'getLabel', when: 'shouldWrite'},
          setter: 'setLabel',
        }),
      }),
    ).toBe('function');

    nodeSchema<RoleNode>()({
      // @ts-expect-error -- setLabel needs an argument the walk does not pass
      label: withField(stringValue(), {field: '__label', getter: 'setLabel'}),
    });
    nodeSchema<RoleNode>()({
      // @ts-expect-error -- getLabel takes nothing, so it cannot apply a value
      label: withField(stringValue(), {field: '__label', setter: 'getLabel'}),
    });
    nodeSchema<RoleNode>()({
      // @ts-expect-error -- describe() returns a string, not a boolean
      label: withField(stringValue(), {field: '__label', when: 'describe'}),
    });
    nodeSchema<RoleNode>()({
      // @ts-expect-error -- gated() takes an argument; a predicate takes none
      label: withField(stringValue(), {field: '__label', when: 'gated'}),
    });
  });

  test('nodeSchema rejects a type the node member cannot hold', () => {
    // Every name here resolves and is used in the right position. What is
    // wrong is the type behind it, which nothing checked: the parser wrote a
    // string into a numeric field, and the schema's default and equality were
    // string-shaped, so the property could never compact and nothing failed.
    class TypedNode extends ElementNode {
      __count = 0;
      __ids: readonly string[] = [];
      getCount(): number {
        return this.getLatest().__count;
      }
      setCount(count: number): this {
        const self = this.getWritable();
        self.__count = count;
        return self;
      }
      getIds(): readonly string[] {
        return this.getLatest().__ids;
      }
    }
    // The types line up, so this compiles.
    expect(
      typeof nodeSchema<TypedNode>()({
        count: withField(numberValue(), {field: '__count'}),
        // `readonly` is a property of the reference, not of the JSON, so a
        // readonly array satisfies an arrayValue property.
        ids: withAccessors(arrayValue(stringValue()), {getter: 'getIds'}),
      }),
    ).toBe('function');

    nodeSchema<TypedNode>()({
      // @ts-expect-error -- __count holds a number, not a string
      count: withField(stringValue(), {field: '__count'}),
    });
    nodeSchema<TypedNode>()({
      // @ts-expect-error -- getCount() returns a number, not a string
      count: withAccessors(stringValue(), {getter: 'getCount'}),
    });
    nodeSchema<TypedNode>()({
      // @ts-expect-error -- setCount() takes a number, not a string
      count: withAccessors(stringValue(), {setter: 'setCount'}),
    });
  });

  test('a value table declares that the two forms differ', () => {
    // A field whose stored and serialized forms differ says so with a table,
    // and the table is that declaration — so the field is not held to the
    // schema's type. TextNode's `mode` is the in-tree case: a bitmask stored,
    // a name serialized. Without this carve-out it would fail its own check.
    const MODES = {normal: 0, segmented: 2, token: 1} as const;
    const NAMES = {0: 'normal', 1: 'token', 2: 'segmented'} as const;
    class ModeNode extends ElementNode {
      __mode: 0 | 1 | 2 = 0;
    }
    expect(
      typeof nodeSchema<ModeNode>()({
        mode: withField(enumValue(['normal', 'token', 'segmented']), {
          decode: NAMES,
          encode: MODES,
          field: '__mode',
        }),
      }),
    ).toBe('function');
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

describe('objectValue refuses a __proto__ field in every build', () => {
  test('because the parse would reparent its result instead of writing it', () => {
    // A computed key, since `{__proto__: x}` in a literal sets the prototype
    // rather than creating an own property — which is the same hazard one
    // level up.
    expect(() => objectValue({['__proto__']: stringValue()})).toThrow(
      /__proto__/,
    );
    // What it prevents: `result['__proto__'] = value` invokes the inherited
    // setter, so the parse would return an object without the property it
    // declared, having reparented itself instead.
    // Through a variable, exactly as the parse assigns it: written as a
    // literal, dot-notation and no-proto rewrite and then reject it, and
    // neither is what the parse actually does.
    const key = '__proto__';
    const result: {[key: string]: unknown} = {};
    result[key] = {reparented: true};
    expect(Object.keys(result)).toEqual([]);
  });
});

describe('a schema does not take back an override the node already had', () => {
  class PlainBlock extends ElementNode {
    $config() {
      return this.config('schema-plain-block', {extends: ElementNode});
    }
    createDOM(): HTMLElement {
      return document.createElement('div');
    }
    updateDOM(): boolean {
      return false;
    }
  }
  class StyledBlock extends PlainBlock {
    $config() {
      return this.config('schema-styled-block', {extends: PlainBlock});
    }
    getTextFormat(): number {
      return IS_BOLD;
    }
    getTextStyle(): string {
      return 'color: red;';
    }
  }
  class MigratingText extends TextNode {
    $config() {
      return this.config('schema-migrating-text', {extends: TextNode});
    }
    updateFromJSON(json: LexicalUpdateJSON<SerializedTextNode>): this {
      return super.updateFromJSON(json).setStyle('color: red;');
    }
  }

  test('an overridden getTextFormat/getTextStyle still decides the export', () => {
    // ElementNode's schema reads both from `__textFormat`/`__textStyle`
    // through `getSerializedTextFormat`/`getSerializedTextStyle`. Those
    // wrappers are new; `getTextFormat`/`getTextStyle` are what a subclass has
    // always overridden, and what exportJSON called before the schema existed.
    // A field read that ignored them would export the stored 0/'' instead.
    const editor = buildEditorFromExtensions(
      defineExtension({
        name: '[root]',
        nodes: [PlainBlock, StyledBlock],
      }),
    );
    editor.update(
      () => {
        expect($create(StyledBlock).exportJSON()).toMatchObject({
          textFormat: IS_BOLD,
          textStyle: 'color: red;',
        });
        // The class that overrides nothing keeps the direct-field path, so the
        // guard costs it nothing: both are at their defaults and omitted.
        const plain = $create(PlainBlock).exportJSON() as Record<
          string,
          unknown
        >;
        expect(plain.textFormat).toBeUndefined();
        expect(plain.textStyle).toBeUndefined();
      },
      {discrete: true},
    );
    editor.dispose();
  });

  test('a synthesized importJSON calls an overridden updateFromJSON', () => {
    // The synthesized importJSON applies the schema directly, skipping the
    // getWritable() a fresh node does not need. That shortcut is only the base
    // updateFromJSON when the node has not replaced it — a node that migrates
    // an older payload there would otherwise be silently skipped on import
    // while still running everywhere else.
    const editor = buildEditorFromExtensions(
      defineExtension({name: '[root]', nodes: [MigratingText]}),
    );
    editor.update(
      () => {
        const imported = MigratingText.importJSON({
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text: 'hi',
          type: 'schema-migrating-text',
          version: 1,
        });
        assert($isTextNode(imported));
        expect(imported.getStyle()).toBe('color: red;');
        expect(imported.getTextContent()).toBe('hi');
      },
      {discrete: true},
    );
    editor.dispose();
  });
});

describe('a wrapper answers for its inner schema’s domain', () => {
  test('a union picks the wrapper whose inner schema recognizes the value', () => {
    // `''` is stringValue's default, so `defaultAsNull` reads it as null — the
    // wrapper's own default. Inferring membership from *that* reads a value the
    // schema recognized as one it fell back on, and the union moves on to a
    // member whose domain does not contain it at all.
    const schema = unionValue(
      [nullable(stringValue(), {defaultAsNull: true}), enumValue(['auto'])],
      'auto',
    );
    expect(schema('')).toBe(null);
    expect(schema('left')).toBe('left');
    expect(schema('auto')).toBe('auto');
    // A value neither member's domain contains still falls back.
    expect(schema(42)).toBe('auto');
  });

  test('the same holds for optional and for a transformed domain', () => {
    const opt = unionValue(
      [optional(stringValue(), {omitDefault: true}), enumValue(['auto'])],
      'auto',
    );
    expect(opt('')).toBeUndefined();

    // The transform leaves the inner domain entirely, so inferring membership
    // from its output compares a parsed array against a string input — with the
    // caller's own comparator, which is written for arrays.
    const toArray = transformValue(stringValue(), value => value.split(','), {
      isEqual: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
    });
    const union = unionValue([toArray, enumValue(['auto'])], 'auto');
    expect(union('')).toEqual(['']);
    expect(union('a,b')).toEqual(['a', 'b']);
  });

  test('a wrapper still declines what its inner schema declines', () => {
    // The guard the unconditional `accepts` must not give up: `null` is not
    // `optional`'s nil, so it goes to `inner`, which does not recognize it —
    // and the union must reach the member that does.
    const schema = unionValue(
      [optional(numberValue()), enumValue([null])],
      null,
    );
    // `0` here would mean the optional member claimed `null` and handed it to
    // numberValue, which falls back.
    expect(schema(null)).toBe(null);
    expect(schema(7)).toBe(7);
  });
});

describe('a schema declares the domain it reads, and only that', () => {
  // `accepts` is a predicate on a schema's serialized *input*; `defaultValue`
  // is one of its parsed *values*. An earlier version had `makeSchema` OR in
  // `value === schema.defaultValue` around every declared predicate, to spare
  // each combinator from restating "a schema recognizes its own default" —
  // which conflated the two domains and cost more than it bought. These pin
  // both halves: the shapes whose predicate really was wrong, fixed where they
  // are declared, and the ones that must keep declining.

  test('a raw value validates nothing, so it declines nothing', () => {
    // Was `value !== undefined`, which read as "an absent property is not
    // mine" — but an absent property is exactly what a raw field holds when it
    // has no value. `objectValue` asks this of every declared key the input
    // carries, so one `{note: undefined}` took the whole enclosing object out
    // of a union and lost every sibling property with it.
    const raw = rawValue<string>();
    expect(raw.accepts!(undefined)).toBe(true);
    expect(raw.accepts!('hi')).toBe(true);

    const union = unionValue(
      [objectValue({note: raw, title: stringValue()}), enumValue(['auto'])],
      'auto',
    );
    expect(union({note: undefined, title: 'keep me'})).toEqual({
      note: undefined,
      title: 'keep me',
    });
  });

  test('an enum listing undefined recognizes it, when it is the default', () => {
    // The documented spelling for defaulting to `undefined`, which
    // `TableCellNode`'s `verticalAlign` uses. The parse reads `undefined` as
    // "absent" before it checks membership, so claiming it is only honest when
    // the default is `undefined` too.
    expect(enumValue([undefined, 'top']).accepts!(undefined)).toBe(true);
    // Listed but not the default: the parse answers `'top'`, so a union that
    // committed here would be handed a value it never asked for.
    expect(enumValue(['top', undefined]).accepts!(undefined)).toBe(false);
    // And a default outside the listed values stays out of the domain.
    expect(
      enumValue(['top', 'middle'], 'unset' as 'top').accepts!('unset'),
    ).toBe(false);

    const union = unionValue(
      [
        objectValue({align: enumValue([undefined, 'top']), id: stringValue()}),
        enumValue(['auto']),
      ],
      'auto',
    );
    expect(union({align: undefined, id: 'x'})).toEqual({
      align: undefined,
      id: 'x',
    });
    expect(union({align: 'sideways', id: 'x'})).toBe('auto');
  });

  test('a constrained member still declines its own out-of-domain default', () => {
    // What `unionValue`'s docblock promises, and what the blanket escape took
    // away: a member whose `defaultValue` sits outside its own constraints is
    // saying "this value is not mine", and the union must fall through.
    expect(numberValue(0, {min: 1}).accepts!(0)).toBe(false);
    expect(
      unionValue([numberValue(0, {min: 1}), enumValue(['auto'])], 'auto')(0),
    ).toBe('auto');
    // The same for an enum whose default is not one of its values: the later
    // member owns that value, and answers with its own type.
    expect(
      unionValue(
        [enumValue(['a', 'b'], '42' as 'a'), numberValue()],
        0 as never,
      )('42'),
    ).toBe(42);
  });

  test('a transform describes what it reads, not what it writes', () => {
    // Its default is an output, so asking whether it "accepts its own default"
    // is asking an input predicate about a value from the other side of the
    // transform. The escape answered yes and a union then handed a caller
    // `'n0'` where the member produces numbers.
    const prefixed = transformValue(numberValue(), value => `n${value}`);
    expect(prefixed.accepts!('n0')).toBe(false);
    expect(prefixed.accepts!(0)).toBe(true);
    expect(
      unionValue(
        [prefixed, aliasedValue(numberValue(), {n0: 42})],
        0 as never,
      )('n0'),
    ).toBe(42);
  });
});

describe('a strict match never claims what the schema itself declines', () => {
  // The first pass is a *strengthening* of `accepts`, not a second opinion:
  // it asks the lenient predicate first, so every guard that one carries
  // applies, and a schema that says "not mine" is never handed the value.

  test('so a union and its own accepts cannot disagree', () => {
    const inner = unionValue(
      [optional(numberValue()), enumValue(['auto'])],
      'auto' as never,
    );
    const shape = objectValue({title: stringValue(), x: inner});
    const value = {title: 't', x: undefined};
    const outer = unionValue([shape, enumValue(['none'])], 'none' as never);
    // Whatever the answer, the two halves agree — the strict pass used to be
    // *more* permissive than the lenient one here, so `accepts` said no while
    // the parse committed to that member.
    expect(shape.accepts!(value)).toBe(false);
    expect(outer(value)).toBe('none');
  });

  test('and wrapping a member does not change the union’s answer', () => {
    // `optional` around a non-nil value is a no-op, so it must not decide
    // membership. Each wrapper now forwards to `inner` except for the nil it
    // owns; treating all three alike made a `null` a whole match for an
    // `optional` without `inner` ever being asked.
    const member = objectValue({
      note: unionValue([optional(numberValue()), stringValue()], 0 as never),
      title: stringValue(),
    });
    const value = {note: undefined, title: 'keep me'};
    const answers = [
      member,
      optional(member),
      nullable(member),
      transformValue(member, x => x),
    ].map(m =>
      unionValue([m as never, enumValue(['LOST'])], 'LOST' as never)(value),
    );
    expect(new Set(answers.map(a => JSON.stringify(a))).size).toBe(1);
  });

  test('and a schema carrying no meta is asked, not walked', () => {
    // The interface is public and `makeSchema` is not exported, so a
    // hand-rolled schema is how a consumer adds one — and reading `meta.kind`
    // off it threw where the parse used to work.
    const handRolled = Object.assign((value: unknown) => value, {
      accepts: () => false,
      defaultValue: 0,
    }) as never;
    expect(unionValue([handRolled, stringValue()], 'x' as never)('hi')).toBe(
      'hi',
    );
  });

  test('and a union recognizes the value it defaults to', () => {
    // The clause `enumValue` got and `unionValue` did not: a union whose
    // fallback is `undefined` parses `undefined` to `undefined`, so declining
    // it is a schema refusing its own output — and an `objectValue` holding an
    // absent union-typed field then declined the object it had just produced.
    const u = unionValue(
      [optional(stringValue()), numberValue()],
      undefined as never,
    );
    expect(u.accepts!(undefined)).toBe(true);
    const shape = objectValue({note: u, title: stringValue()});
    expect(shape.accepts!(shape({title: 'x'} as never))).toBe(true);
    expect(
      unionValue([shape, enumValue(['LOST'])], 'LOST' as never)({title: 'x'}),
    ).toEqual({note: undefined, title: 'x'});
  });
});

describe('an array schema keeps what it can rather than falling back', () => {
  test('one malformed element does not discard the good ones', () => {
    // Asking `every` cost the whole array where the parse would have coerced a
    // single element — and through an enclosing object, every sibling property
    // with it.
    expect(
      unionValue(
        [arrayValue(stringValue()), enumValue(['none'])],
        'none',
      )(['a', 1]),
    ).toEqual(['a', '']);

    const shape = objectValue({
      label: stringValue(),
      tags: arrayValue(numberValue()),
    });
    expect(
      unionValue(
        [shape, enumValue(['auto'])],
        'auto',
      )(JSON.parse('{"label":"keep me","tags":[1,null]}')),
    ).toEqual({label: 'keep me', tags: [1, 0]});
  });

  test('an array no element of which matches keeps its enclosing object', () => {
    // The half the `some` form missed: asking the elements at all meant an
    // array with nothing in the item domain was refused, and because
    // `objectValue` asks each declared field, the refusal took the whole
    // object — a legacy document whose array holds the pre-migration element
    // type lost every sibling property with it.
    const shape = objectValue({
      label: stringValue(),
      tags: arrayValue(numberValue()),
    });
    expect(
      unionValue(
        [shape, enumValue(['auto'])],
        'auto',
      )(JSON.parse('{"label":"keep me","tags":["banana"]}')),
    ).toEqual({label: 'keep me', tags: [0]});

    // The same refusal hit an element carrying a key a newer version added,
    // which is the shape schema evolution is supposed to survive.
    const doc = objectValue({
      items: arrayValue(objectValue({id: stringValue()})),
      title: stringValue(),
    });
    expect(
      unionValue(
        [doc, enumValue(['auto'])],
        'auto',
      )({
        items: [{extra: 1, id: 'a'}],
        title: 'T',
      } as never),
    ).toEqual({items: [{id: 'a'}], title: 'T'});

    // And an array over a transform, whose elements on disk are the
    // transform's *outputs* while the item's domain is the inner *input* — so
    // it declined the very array it had written, one reload later.
    const rows = arrayValue(transformValue(numberValue(), v => `n${v}`));
    expect(
      unionValue([rows, enumValue(['none'])], 'none' as never)(['n1', 'n2']),
    ).toEqual(['n0', 'n0']);
  });

  test('and a catch-all member never outranks one that owns the value', () => {
    // `rawValue` validates nothing, so it accepts everything — which made it a
    // *complete* match for every value and let it win the first pass ahead of
    // a typed member that would have coerced. The value then reached a setter
    // declared `number[]` holding a string.
    expect(
      unionValue(
        [arrayValue(numberValue()), rawValue()],
        [] as never,
      )([1, 'x']),
    ).toEqual([1, 0]);
    expect(rawValue().accepts!('anything')).toBe(true);
  });

  test('an absent element says nothing either way', () => {
    // A hole is filled from the item's own default exactly as `objectValue`
    // fills an absent field, so an array of nothing else has nothing to
    // contradict — as the empty array has nothing to contradict.
    expect(arrayValue(stringValue()).accepts!(new Array(2))).toBe(true);
    expect(arrayValue(stringValue()).accepts!([undefined])).toBe(true);
    expect(arrayValue(stringValue()).accepts!([])).toBe(true);
  });

  test('a complete match beats a partial one, whichever comes first', () => {
    // A container answers "mine" for a value it would only partly coerce, so
    // the first accepting member is not always the member the value belongs
    // to. `'42'` is a number spelled as a string, which made `['red', '42']`
    // look like an array of numbers — and `'red'` was coerced away.
    expect(
      unionValue(
        [arrayValue(numberValue()), arrayValue(stringValue())],
        [] as never,
      )(['red', '42']),
    ).toEqual(['red', '42']);

    // The same shape as a NodeState value: two object variants where one is
    // the other plus an optional property. Saving a plain tag beside a
    // coloured one and reading it back dropped the colour, because the plain
    // variant accepted the array on the strength of its first element.
    const tags = unionValue(
      [
        arrayValue(objectValue({label: stringValue()})),
        arrayValue(
          objectValue({color: optional(stringValue()), label: stringValue()}),
        ),
      ],
      [] as never,
    );
    expect(tags([{label: 'a'}, {color: 'red', label: 'b'}] as never)).toEqual([
      {label: 'a'},
      {color: 'red', label: 'b'},
    ]);
  });

  test('and still picks the variant whose items match', () => {
    // The selection this predicate exists for, undamaged by the leniency:
    // nothing in these arrays is in the other member's item domain.
    expect(
      unionValue(
        [arrayValue(numberValue()), arrayValue(stringValue())],
        [] as never,
      )(['red', 'blue']),
    ).toEqual(['red', 'blue']);
    expect(
      unionValue(
        [
          arrayValue(objectValue({x: numberValue()})),
          arrayValue(objectValue({y: numberValue()})),
        ],
        [] as never,
      )([{y: 1}]),
    ).toEqual([{y: 1}]);
    // Through an enclosing object too — the strict pass is what declines here,
    // not the array's own `accepts`, which stays permissive on purpose.
    expect(
      unionValue(
        [
          objectValue({tags: arrayValue(numberValue())}),
          objectValue({tags: arrayValue(stringValue())}),
        ],
        'none' as never,
      )({tags: ['red', 'blue']}),
    ).toEqual({tags: ['red', 'blue']});
  });
});

describe('a union compares by content, not by a member’s comparator', () => {
  // The transform leaves the string domain entirely, so nothing about what the
  // member accepts says anything about the arrays it produces.
  const toArray = transformValue(stringValue(), value => value.split(','), {
    isEqual: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
  });

  test('a transformed output compares by content', () => {
    const union = unionValue([toArray], ['']);
    // Two equal arrays, from two parses, are the same value. Falling back to
    // identity here reports every parse as a change.
    expect(isSchemaEqual(union, union('a,b'), union('a,b'))).toBe(true);
    expect(isSchemaEqual(union, union('a,b'), union('a,c'))).toBe(false);
  });

  test('through nullable and optional, whose default is a nil', () => {
    // A wrapper's default is `null`/`undefined`, so nothing about it describes
    // the arrays the member underneath produces.
    for (const member of [nullable(toArray), optional(toArray)]) {
      const union = unionValue([member], null as never);
      expect(isSchemaEqual(union, ['a', 'b'], ['a', 'b'])).toBe(true);
      expect(isSchemaEqual(union, ['a', 'b'], ['a', 'c'])).toBe(false);
    }
  });

  test('so a wrapper around it can still recognize its own default', () => {
    // `omitDefault` asks the inner schema whether the parse *is* the default,
    // which for a union is that comparison. Without it `''` parses to the
    // default array and is written out as one anyway.
    const schema = optional(unionValue([toArray], ['']), {omitDefault: true});
    expect(schema('')).toBeUndefined();
    expect(schema('a,b')).toEqual(['a', 'b']);
  });

  test('and two members’ values are never confused for each other', () => {
    // The failure a shape test could not rule out: an id comparator handed two
    // plain strings reads two `undefined` ids and calls them equal, and equal
    // is the answer that discards an update.
    const toIds = transformValue(
      stringValue(),
      value => value.split(',').map(id => ({id: Number(id)})),
      {
        isEqual: (a, b) =>
          a.length === b.length && a.every((x, i) => x.id === b[i].id),
      },
    );
    const union = unionValue([toIds, arrayValue(stringValue())], []);
    expect(isSchemaEqual(union, ['red'], ['blue'])).toBe(false);
    expect(isSchemaEqual(union, ['red'], ['red'])).toBe(true);
    // Same key count, different property types — the other way a shape test
    // sent values to a comparator written for something else.
    const byId = transformValue(
      objectValue({id: numberValue(), tag: stringValue()}),
      value => value,
      {isEqual: (a, b) => a.id === b.id},
    );
    const numeric = unionValue(
      [byId, objectValue({id: numberValue(), tag: numberValue()})],
      {id: 0, tag: 0},
    );
    expect(isSchemaEqual(numeric, {id: 1, tag: 5}, {id: 1, tag: 9})).toBe(
      false,
    );
  });

  test('a value with its own prototype compares by identity', () => {
    // Own keys do not describe what a Map carries, so content equality has
    // nothing to say and identity is the honest answer.
    const union = unionValue([rawValue<unknown>()], null);
    const map = new Map([['a', 1]]);
    expect(isSchemaEqual(union, map, map)).toBe(true);
    expect(isSchemaEqual(union, map, new Map([['a', 1]]))).toBe(false);
  });
});

describe('an object schema answers only for its own shape', () => {
  const point = objectValue({x: numberValue()});
  const label = objectValue({label: stringValue()});
  const union = unionValue([point, label]);

  test('a union falls through to the variant whose keys match', () => {
    // Accepting every object would let the first variant answer for all of
    // them: `{label: 'hello'}` would read as `{x: 0}`, losing the property —
    // and as a flat NodeState that parse equals the default, so exporting
    // drops the state entirely.
    expect(union({label: 'hello'} as never)).toEqual({label: 'hello'});
    expect(union({x: 5} as never)).toEqual({x: 5});
  });

  test('and declines what belongs to neither', () => {
    // An out-of-domain value for a declared key, an array, a string: none is
    // either variant's, so the union falls back rather than committing.
    for (const value of [{x: 'banana'}, [1, 2], 'str']) {
      expect(union(value as never)).toEqual(union.defaultValue);
    }
  });

  test('an empty object belongs to every variant', () => {
    // Every field is optional on the way in, so `{}` is in the domain — and it
    // is a shape an object schema produces, since one whose fields are all
    // `optional({omitDefault})` serializes to `{}`. The first variant answers,
    // as it does for anything two members both accept.
    expect(union({} as never)).toEqual({x: 0});
  });

  test('which is what lets a nested empty object survive a round trip', () => {
    // The check recurses, so rejecting `{}` took the enclosing object with it:
    // this parsed to `'auto'`, losing `label` outright.
    const nested = unionValue([
      enumValue(['auto']),
      objectValue({
        label: stringValue(),
        options: objectValue({
          color: optional(stringValue(), {omitDefault: true}),
        }),
      }),
    ]);
    const parsed = nested({label: 'hello', options: {color: ''}} as never);
    expect(parsed).toEqual({label: 'hello', options: {color: undefined}});
    // What JSON.stringify leaves of it, reparsed.
    expect(nested(JSON.parse(JSON.stringify(parsed)))).toEqual({
      label: 'hello',
      options: {color: undefined},
    });
  });

  test('membership is the same question the parse asks', () => {
    expect(point.accepts!({x: 1})).toBe(true);
    expect(point.accepts!({label: 'hello'})).toBe(false);
    expect(point.accepts!({label: 'hello', x: 1})).toBe(false);
    // In the domain: a parse fills what is missing.
    expect(point.accepts!({})).toBe(true);
    expect(point.accepts!([])).toBe(false);
  });
});

describe('a value is parsed once per traversal', () => {
  // Deciding which member or field a value belongs to used to go through the
  // parse, so a nested value was read once to decide and again to keep it —
  // compounding, since each level asked the same of the one below. Ten levels
  // of unionValue/objectValue reached 59,049 parses of a single leaf.
  let parses = 0;
  const leaf = () =>
    transformValue(stringValue(), value => {
      parses++;
      return value;
    });

  function count(schema: (json: unknown) => unknown, value: unknown): number {
    parses = 0;
    schema(value);
    return parses;
  }

  test('through an object, a union, and the wrappers', () => {
    expect(count(objectValue({a: leaf()}), {a: 'x'})).toBe(1);
    expect(
      count(unionValue([enumValue(['auto']), objectValue({a: leaf()})]), {
        a: 'x',
      }),
    ).toBe(1);
    expect(count(nullable(objectValue({a: leaf()})), {a: 'x'})).toBe(1);
    expect(
      count(optional(unionValue([objectValue({a: leaf()})])), {a: 'x'}),
    ).toBe(1);
    expect(count(aliasedValue(objectValue({a: leaf()}), {}), {a: 'x'})).toBe(1);
  });

  test('once per element of an array, not once per element per element', () => {
    expect(count(arrayValue(leaf()), ['a', 'b', 'c'])).toBe(3);
  });

  test('and stays linear as unions nest', () => {
    let schema: unknown = objectValue({a: leaf()});
    let value: unknown = {a: 'x'};
    for (let i = 0; i < 10; i++) {
      schema = unionValue([
        enumValue(['auto']),
        objectValue({inner: schema as never}),
      ]);
      value = {inner: value};
    }
    expect(count(schema as never, value)).toBe(1);
  });
});

describe('a compact document relaxes at every depth', () => {
  test('a nested element carries its own children', () => {
    // The outer type is refinable — you know what you asked for — and its
    // children are not: a node cannot declare what kind of children it takes,
    // so any node may appear under any element. Naming them
    // `SerializedPartial<SerializedLexicalNode>` said only what every node has,
    // which left a nested element unable to carry the children it does have.
    const compact: SerializedPartial<SerializedElementNode> = {
      children: [
        {
          children: [{type: 'text'}],
          type: 'paragraph',
        },
      ],
      type: 'root',
    };
    expect(compact.children).toHaveLength(1);
    expect(compact.children?.[0].children).toHaveLength(1);
  });

  test('and the whole document does', () => {
    const state: CompactSerializedEditorState = {
      root: {children: [{type: 'paragraph'}], type: 'root'},
    };
    expect(state.root.children).toHaveLength(1);
  });

  test('and a declared interface reaches the parse entry point', () => {
    // An interface gets no implicit index signature in TypeScript, so a real
    // serialized type extending another was not assignable to a type that has
    // one — and the index signature is what keeps a document writable as a
    // literal. The parameter names both, so each form is checked against the
    // member it fits.
    interface SerializedCustomText extends SerializedTextNode {
      tag: string;
    }
    const declared: SerializedCustomText = {
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      tag: 'x',
      text: 'hi',
      type: 'text',
      version: 1,
    };
    // Plain assignments, so a regression reads as "not assignable to parameter"
    // rather than as a failed constraint on a matcher's type argument.
    const fromInterface: Parameters<typeof $parseSerializedNode>[0] = declared;
    // And a literal carrying node data still goes through, at any depth.
    const fromLiteral: Parameters<typeof $parseSerializedNode>[0] = {
      children: [{text: 'hi', type: 'text'}],
      type: 'paragraph',
    };
    expect(fromInterface.type).toBe('text');
    expect(fromLiteral.type).toBe('paragraph');
  });

  test('a child property is unknown until it is narrowed', () => {
    // There is no type to read a child's own properties from, so they arrive
    // as `unknown` rather than as a promise the value may not keep — and a
    // document stays writable as a literal, which closing the type took away.
    expectTypeOf<SerializedPartialNode['text']>().toEqualTypeOf<unknown>();
    // What every node does have keeps its type, at every depth.
    expectTypeOf<SerializedPartialNode['type']>().toEqualTypeOf<string>();
    expectTypeOf<SerializedPartialNode['children']>().toEqualTypeOf<
      SerializedPartialNode[] | undefined
    >();
    // And a child really can carry a node's own data, which is the whole point
    // of a compact document being something you can write down.
    const doc: SerializedPartial<SerializedElementNode> = {
      children: [{children: [{text: 'hi', type: 'text'}], type: 'paragraph'}],
      type: 'root',
    };
    expect(doc.children?.[0].children).toHaveLength(1);
  });
});

describe('an array schema answers only for its own element domain', () => {
  test('a union falls through to the array variant whose items match', () => {
    // "Is an array" is true of every array, so the first array-typed member
    // would otherwise answer for all of them and coerce the elements into its
    // own item domain — losing the data the later member describes exactly.
    const union = unionValue([
      arrayValue(numberValue()),
      arrayValue(stringValue()),
    ]);
    expect(union(['red', 'blue'] as never)).toEqual(['red', 'blue']);
    expect(union([1, 2] as never)).toEqual([1, 2]);

    const objects = unionValue([
      arrayValue(objectValue({x: numberValue()})),
      arrayValue(objectValue({y: numberValue()})),
    ]);
    expect(objects([{y: 1}] as never)).toEqual([{y: 1}]);
  });

  test('and an enclosing object still picks the variant its items fit', () => {
    // An array schema's own `accepts` is deliberately just "is an array": it
    // answers "could this member coerce the value at all", and declining
    // there cost the whole enclosing object rather than one element. Telling
    // two array variants apart is the *strict* question, which the union asks
    // first — so the selection this guards still happens, one level up.
    const strings = objectValue({tags: arrayValue(stringValue())});
    const numbers = objectValue({tags: arrayValue(numberValue())});
    expect(strings.accepts!({tags: [1, 2]})).toBe(true);
    expect(
      unionValue([numbers, strings], 'none' as never)({tags: ['a', 'b']}),
    ).toEqual({tags: ['a', 'b']});
    expect(
      unionValue([strings, numbers], 'none' as never)({tags: [1, 2]}),
    ).toEqual({tags: [1, 2]});
    // And a value neither variant owns outright is still coerced by the first
    // that can take it, rather than discarded.
    expect(strings({tags: [1, 2]})).toEqual({tags: ['', '']});
  });

  test('an empty array belongs to every array schema', () => {
    // No element to disagree about, and it is a shape every array parse
    // produces.
    expect(arrayValue(numberValue()).accepts!([])).toBe(true);
    expect(arrayValue(objectValue({x: numberValue()})).accepts!([])).toBe(true);
  });
});
