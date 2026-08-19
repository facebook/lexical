/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTabNode,
  arrayValue,
  booleanValue,
  enumValue,
  type LexicalUpdateJSON,
  nullable,
  numberValue,
  objectValue,
  optional,
  rawValue,
  type SerializedPartial,
  type SerializedTextNode,
  stringValue,
  transformValue,
  unionValue,
  withAccessors,
  withField,
  withGetter,
  withSetter,
} from 'lexical';
import {describe, expect, test} from 'vitest';

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
    // out of domain -> default
    expect(parse(undefined)).toBe(0);
    expect(parse('42')).toBe(0);
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
      const inner = withSetter(stringValue(), 'setFoo');
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
          expect(paragraph.$getSerializedTextFormat()).toBeUndefined();
          expect(paragraph.$getSerializedTextStyle()).toBeUndefined();
          // and a node that does carry them writes them out
          const styled = $createParagraphNode().setTextStyle('color: red');
          expect(styled.$getSerializedTextStyle()).toBe('color: red');
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

  describe('withSetter propagation through combinators', () => {
    test('optional, nullable, and arrayValue keep the inner setter name', () => {
      // A field like `language: optional(nullable(stringValue()))` must apply
      // through the setter recorded anywhere inside the combinator stack.
      const inner = withSetter(stringValue(), 'setFoo');
      expect(optional(inner).setter).toBe('setFoo');
      expect(nullable(inner).setter).toBe('setFoo');
      expect(arrayValue(inner).setter).toBe('setFoo');
      expect(optional(nullable(inner)).setter).toBe('setFoo');
      expect(withSetter(optional(stringValue()), 'setBar').setter).toBe(
        'setBar',
      );
    });

    test('withAccessors records both directions at once', () => {
      const schema = withAccessors(stringValue(), {
        getter: 'getFoo',
        setter: 'setFoo',
      });
      expect(schema.getter).toBe('getFoo');
      expect(schema.setter).toBe('setFoo');
      // each direction can also be layered on independently
      const layered = withGetter(withSetter(stringValue(), 'setA'), 'getA');
      expect(layered.getter).toBe('getA');
      expect(layered.setter).toBe('setA');
      // withField is a getter that reads the node's own field
      expect(withField(stringValue(), '__foo').getter).toBe('__foo');
    });
  });
});
