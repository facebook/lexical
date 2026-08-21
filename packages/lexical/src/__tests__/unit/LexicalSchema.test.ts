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
  nullable,
  numberValue,
  objectValue,
  optional,
  rawValue,
  type SerializedLexicalNode,
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
import {assert, describe, expect, expectTypeOf, test} from 'vitest';

import {isSchemaDefault} from '../../LexicalSchema';
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
      expect(withGetter(derived, 'getFoo').setter).toBeNull();
    });
  });

  describe('withSetter propagation through combinators', () => {
    test('optional and nullable keep the inner setter name', () => {
      // A field like `language: optional(nullable(stringValue()))` must apply
      // through the setter recorded anywhere inside the combinator stack.
      // arrayValue is deliberately excluded: it wraps an *element*, so the
      // element's accessors are not the array property's.
      const inner = withSetter(stringValue(), 'setFoo');
      expect(optional(inner).setter).toBe('setFoo');
      expect(nullable(inner).setter).toBe('setFoo');
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
  test('version is required on export and optional on parse', () => {
    // exportJSON always writes it, and downstream code reads it off an
    // exported node (`if (node.version < 2)`), so narrowing it there would
    // break every such consumer. Parsing ignores it, and compact JSON omits
    // it, so the parse shape relaxes it.
    expectTypeOf<SerializedLexicalNode['version']>().toEqualTypeOf<number>();
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
        json: objectValue({
          label: withField(stringValue('default'), '__label'),
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
    const schema = withField(stringValue(), '__label');
    expect(schema.getter).toBe('__label');
    expect(schema.setter).toBe('__label');
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
          json: objectValue({
            tags: withField(arrayValue(stringValue()), '__tags'),
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
