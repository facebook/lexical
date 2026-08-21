/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';

const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * A function that validates an untrusted `value` (such as a property parsed
 * from JSON) and coerces it into the expected type `T`, returning a default
 * value when `value` is not in the expected domain.
 *
 * By convention — and exactly like the `parse` of {@link StateValueConfig} —
 * calling a `Parse` with `undefined` returns its default value.
 */
export type Parse<T> = (value: unknown) => T;

/**
 * A structural, introspectable description of a {@link SerializationSchema}. It carries
 * exactly the information needed to coerce a value (which the schema closes
 * over) so that tooling can also walk it — for example to derive a `fast-check`
 * arbitrary that generates example values, or to emit a JSON schema. The data
 * here is the same domain information the parser already needs, so making it
 * available costs (almost) nothing in the production bundle.
 */
export type SerializationSchemaMeta =
  | {readonly kind: 'string'}
  | {
      readonly kind: 'number';
      /** The inclusive lower bound of the domain, when constrained. */
      readonly min?: number;
      /** The inclusive upper bound of the domain, when constrained. */
      readonly max?: number;
      /** Whether the domain is restricted to integers. */
      readonly integer?: boolean;
    }
  | {readonly kind: 'boolean'}
  | {readonly kind: 'enum'; readonly values: readonly unknown[]}
  | {readonly kind: 'array'; readonly item: AnySerializationSchema}
  | {
      readonly kind: 'nullable';
      readonly inner: AnySerializationSchema;
      /** Whether a value equal to `inner`'s default is treated as `null`. */
      readonly defaultAsNull?: boolean;
    }
  | {
      readonly kind: 'optional';
      readonly inner: AnySerializationSchema;
      /** Whether a value equal to `inner`'s default is treated as absent. */
      readonly omitDefault?: boolean;
    }
  | {
      readonly kind: 'union';
      readonly members: readonly AnySerializationSchema[];
    }
  | {readonly kind: 'raw'}
  | {readonly kind: 'object'; readonly fields: SerializationSchemaFields};

/** Domain constraints for {@link numberValue}. */
export interface NumberValueOptions {
  /** Reject values below this bound (inclusive). */
  readonly min?: number;
  /** Reject values above this bound (inclusive). */
  readonly max?: number;
  /** Reject values that are not integers. */
  readonly integer?: boolean;
}

/**
 * A `SerializationSchema` is a {@link Parse} (so it can be called directly to coerce a value
 * and dropped straight into {@link createState}'s `parse` option) that also
 * carries its recoverable {@link SerializationSchema.defaultValue | default} and an
 * introspectable {@link SerializationSchemaMeta | meta} description of its domain.
 *
 * Schemas are built with {@link stringValue}, {@link numberValue},
 * {@link booleanValue}, {@link enumValue}, {@link nullable}, and composed into
 * whole-object (node) schemas with {@link objectValue}.
 */
export interface SerializationSchema<T> {
  (value: unknown): T;
  /** The value returned for an out-of-domain input, i.e. `schema(undefined)`. */
  readonly defaultValue: T;
  /** An introspectable description of this schema's domain. */
  readonly meta: SerializationSchemaMeta;
  /**
   * The name of the node setter that applies a parsed value of this schema when
   * the base {@link LexicalNode.updateFromJSON} walks a node's `json` schema.
   * When omitted, the setter name defaults to `set<Prop>` for the property this
   * schema is bound to in an {@link objectValue} (e.g. `foo` → `setFoo`). Use
   * {@link withSetter} to record a name that doesn't follow that convention
   * (e.g. TextNode's `text` → `setTextContent`).
   */
  readonly setter?: string | null;
  /**
   * The name of the node getter that reads this property's value when the base
   * {@link LexicalNode.exportJSON} walks a node's `json` schema. When omitted,
   * the getter name defaults to `get<Prop>` (e.g. `foo` → `getFoo`). Use
   * {@link withGetter} to record a name that doesn't follow that convention
   * (e.g. TextNode's `text` → `getTextContent`). A getter that returns
   * `undefined` omits the property from the exported JSON.
   */
  readonly getter?: string | null;
  /**
   * Whether two values of this schema's domain say the same thing, for the
   * comparisons that treat a value as absent: compaction dropping a property
   * whose value is {@link SerializationSchema.defaultValue | the default}, and
   * `optional({omitDefault})` / `nullable({defaultAsNull})`.
   *
   * Absent means identity, which is right for the primitive domains but never
   * true of a reference-typed default: {@link arrayValue} and
   * {@link objectValue} return a fresh value per parse, so without this an
   * array-valued property equal to its default would still be written out.
   * Mirrors `StateValueConfig.isEqual`, which exists for the same reason.
   *
   * Declared with method syntax deliberately: TypeScript checks a method's
   * parameters bivariantly, which keeps `SerializationSchema<T>` assignable to
   * {@link AnySerializationSchema}. A property would make the type invariant
   * in `T` and every `AnySerializationSchema` position would reject it.
   */
  isEqual?(a: T, b: T): boolean;
}

/**
 * Whether two values of `schema`'s domain say the same thing: identity, unless
 * the schema declares otherwise. The identity test comes first so a primitive
 * domain — every schema but {@link arrayValue} and {@link objectValue} — costs
 * a comparison rather than a call.
 *
 * @internal
 */
export function isSchemaEqual<T>(
  schema: SerializationSchema<T>,
  a: T,
  b: T,
): boolean {
  const {isEqual} = schema;
  return a === b || (isEqual !== undefined && isEqual(a, b));
}

/**
 * Whether `value` is the one `schema` would restore for an absent property, so
 * writing it says nothing.
 *
 * @internal
 */
export function isSchemaDefault<T>(
  schema: SerializationSchema<T>,
  value: T,
): boolean {
  return isSchemaEqual(schema, value, schema.defaultValue);
}

/**
 * The node accessors a {@link SerializationSchema} field is applied through.
 *
 * A name resolves to a method on the node (or, for a getter, to the node's own
 * `__`-prefixed field). `null` states that the direction is deliberately
 * unsupported — an export-only property computed from others (`setter: null`,
 * as ListNode's `tag` is derived from `listType`) or an import-only one
 * (`getter: null`). Leaving a direction undefined uses the conventional
 * `get<Prop>`/`set<Prop>` name, which must exist: a name that resolves to
 * nothing would silently drop the property, so it fails in DEV instead.
 */
export interface SchemaAccessors {
  readonly getter?: string | null;
  readonly setter?: string | null;
}

/** A {@link SerializationSchema} for an unknown type, used where the type is not relevant. */
export type AnySerializationSchema = SerializationSchema<unknown>;

/** The value type a {@link SerializationSchema} parses to. */
export type SerializationSchemaValue<S> =
  S extends SerializationSchema<infer T> ? T : never;

/** A record of named {@link SerializationSchema}s, as used by {@link objectValue}. */
export type SerializationSchemaFields = {
  readonly [key: string]: AnySerializationSchema;
};

/** Maps an object type `T` to the record of per-property {@link SerializationSchema}s. */
export type SerializationSchemaShape<T> = {
  readonly [K in keyof T]-?: SerializationSchema<T[K]>;
};

function makeSchema<T>(
  parse: Parse<T>,
  meta: SerializationSchemaMeta,
  accessors: SchemaAccessors = {},
  // Parsing `undefined` is how most combinators name their own default, but a
  // schema whose domain *contains* `undefined` — an enum listing it, a union
  // with an optional member — would derive `undefined` and silently discard
  // the fallback its caller declared, so those pass it explicitly.
  defaultValue: T = parse(undefined),
  isEqual?: (a: T, b: T) => boolean,
): SerializationSchema<T> {
  if (defaultValue !== null && typeof defaultValue === 'object') {
    // The default is metadata every parse shares, and StateConfig hands it
    // straight to $getState for a node that has none of its own. Freezing it
    // turns "mutate one node's default and corrupt every node in the process"
    // into a loud error; a parsed value is a fresh object and is untouched.
    Object.freeze(defaultValue);
  }
  return Object.assign(parse, {
    defaultValue,
    getter: accessors.getter,
    isEqual,
    meta,
    setter: accessors.setter,
  });
}

/**
 * `source` is untrusted parsed JSON, whose prototype is `Object.prototype`: a
 * plain `key in source` (or `source[key]`) would report an inherited member —
 * `toString`, `constructor` — as a present value and hand it to a node setter.
 *
 * A type predicate rather than a `boolean`, so a caller reads the value off the
 * narrowed `source` instead of casting an unindexable `object`.
 */
function hasOwnKey<K extends string>(
  source: object,
  key: K,
): source is {readonly [P in K]: unknown} {
  return Object.prototype.hasOwnProperty.call(source, key);
}

/**
 * Build a {@link SerializationSchema} that returns `value` when it is a `string`, otherwise
 * returns `defaultValue` (the empty string by default).
 * @__NO_SIDE_EFFECTS__
 */
export function stringValue(defaultValue = ''): SerializationSchema<string> {
  return makeSchema(
    value => (typeof value === 'string' ? value : defaultValue),
    {kind: 'string'},
  );
}

/**
 * Build a {@link SerializationSchema} that returns `value` when it is a finite `number`,
 * otherwise returns `defaultValue` (`0` by default). `NaN`, `Infinity`, and
 * `-Infinity` are all treated as out of domain since they can not be
 * round-tripped through JSON.
 * @__NO_SIDE_EFFECTS__
 */
export function numberValue(
  defaultValue = 0,
  options: NumberValueOptions = {},
): SerializationSchema<number> {
  const {min, max, integer} = options;
  return makeSchema(
    value =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (min === undefined || value >= min) &&
      (max === undefined || value <= max) &&
      (!integer || Number.isInteger(value))
        ? value
        : defaultValue,
    {integer, kind: 'number', max, min},
  );
}

/**
 * Build a {@link SerializationSchema} that returns `value` when it is a `boolean`, otherwise
 * returns `defaultValue` (`false` by default).
 * @__NO_SIDE_EFFECTS__
 */
export function booleanValue(
  defaultValue = false,
): SerializationSchema<boolean> {
  return makeSchema(
    value => (typeof value === 'boolean' ? value : defaultValue),
    {kind: 'boolean'},
  );
}

/**
 * Build a {@link SerializationSchema} for a fixed set of allowed `values` (an
 * enumeration or a union of literals such as the `mode` of a TextNode). Returns
 * `value` when it is strictly equal to one of `values`, otherwise returns
 * `defaultValue`, which defaults to the first entry of `values`.
 *
 * The type parameter is `const`, so the literal types of `values` are inferred
 * directly — the caller does not need an `as const` assertion. (Pass an
 * explicit type argument, e.g. `enumValue<TextModeType>([...])`, to instead
 * assert the values against a known domain type.)
 *
 * `defaultValue` is a default parameter, so passing an explicit `undefined`
 * selects `values[0]` rather than an `undefined` default; to make `undefined`
 * the default, list it first in `values` instead.
 *
 * @example
 * ```ts
 * const parseMode = enumValue(['normal', 'token', 'segmented']);
 * //    ^? SerializationSchema<'normal' | 'token' | 'segmented'>, default 'normal'
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function enumValue<const T>(
  values: readonly T[],
  defaultValue: T = values[0],
): SerializationSchema<T> {
  const allowed = new Set<unknown>(values);
  return makeSchema(
    value => (allowed.has(value) ? (value as T) : defaultValue),
    {kind: 'enum', values},
    {},
    // `undefined` may itself be one of the values, in which case parsing it
    // returns it rather than the declared fallback.
    defaultValue,
  );
}

/**
 * Combinator that makes any {@link SerializationSchema} nullable. The returned schema yields
 * `null` when the value is `null` or `undefined` (so `null` is its recoverable
 * default) and otherwise delegates to `inner`. This guarantees a `T | null`
 * result for an untrusted value, unlike `value || null`, which can pass a
 * non-`T` (or falsy) value straight through with the wrong type.
 *
 * Pass `{defaultAsNull: true}` when an in-band value equal to `inner`'s
 * default also means "no value" — the historical `serializedNode.rel || null`
 * idiom, where an empty string is not a real `rel`. Equality is by identity,
 * so this is only meaningful for primitive-valued inner schemas.
 *
 * @example
 * ```ts
 * const parseRel = nullable(stringValue(), {defaultAsNull: true});
 * //    ^? SerializationSchema<string | null>
 * parseRel('noopener'); // 'noopener'
 * parseRel('');         // null ('' is stringValue's default)
 * parseRel(null);       // null
 * parseRel(undefined);  // null (the recoverable default)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function nullable<T>(
  inner: SerializationSchema<T>,
  options: {readonly defaultAsNull?: boolean} = {},
): SerializationSchema<T | null> {
  const {defaultAsNull} = options;
  return makeSchema(
    value => {
      if (value == null) {
        return null;
      }
      const parsed = inner(value);
      return defaultAsNull && isSchemaDefault(inner, parsed) ? null : parsed;
    },
    {defaultAsNull, inner, kind: 'nullable'},
    inner,
  );
}

/**
 * Combinator that makes any {@link SerializationSchema} optional. The returned schema yields
 * `undefined` when the value is `undefined` (so `undefined` is its recoverable
 * default) and otherwise delegates to `inner`. Use it for serialized properties
 * that may be absent and, when absent, should stay absent (an exported `T |
 * undefined` property is omitted from the JSON rather than persisted).
 *
 * Pass `{omitDefault: true}` when an in-band value equal to `inner`'s default
 * means "absent" rather than "explicitly this value" — the historical
 * `serializedNode.width || undefined` idiom, where a falsy `0` is not a real
 * width. Such a value (and any out-of-domain input, which `inner` coerces to
 * its default) yields `undefined`, so it is omitted from the exported JSON
 * instead of being persisted as the default. Equality is by identity
 * (`===`), so this is only meaningful for primitive-valued inner schemas — an
 * array or object default is a fresh value per parse and never compares equal.
 *
 * @example
 * ```ts
 * const parseWidth = optional(numberValue());
 * //    ^? SerializationSchema<number | undefined>
 * parseWidth(120);       // 120
 * parseWidth(undefined); // undefined (the recoverable default)
 *
 * const parseCellWidth = optional(numberValue(), {omitDefault: true});
 * parseCellWidth(0);     // undefined (0 is not a real width)
 * parseCellWidth('x');   // undefined (coerced to the default, then omitted)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function optional<T>(
  inner: SerializationSchema<T>,
  options: {readonly omitDefault?: boolean} = {},
): SerializationSchema<T | undefined> {
  const {omitDefault} = options;
  return makeSchema(
    value => {
      if (value === undefined) {
        return undefined;
      }
      const parsed = inner(value);
      return omitDefault && isSchemaDefault(inner, parsed) ? undefined : parsed;
    },
    {inner, kind: 'optional', omitDefault},
    inner,
  );
}

/**
 * Combinator for a value whose domain is the union of several schemas, such as
 * a dimension that is either a number or the literal `'inherit'`. The domain
 * is inferred as the union of the members' value types; annotate the result
 * when you want to assert a narrower intended domain instead.
 *
 * A {@link SerializationSchema} is total — it always returns a value — so a
 * member is considered to accept `value` when parsing leaves it unchanged
 * (`member(value) === value`). The first accepting member wins; if none does,
 * the result is `defaultValue` when given, otherwise the first member's
 * default. Membership is therefore decided by identity, which suits unions of
 * primitives (the case this exists for) but not unions of object shapes.
 *
 * Because acceptance is "parsing leaves it unchanged", a member whose
 * `defaultValue` lies outside its own constrained domain (e.g.
 * `numberValue(0, {min: 1})`) will falsely accept that default value; give
 * such members an in-domain default when combining them here.
 *
 * @example
 * ```ts
 * const parseDimension = unionValue([numberValue(), enumValue(['inherit'])], 'inherit');
 * //    ^? SerializationSchema<number | 'inherit'>
 * parseDimension(640);       // 640
 * parseDimension('inherit'); // 'inherit'
 * parseDimension('banana');  // 'inherit' (no member accepts it)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function unionValue<const M extends readonly AnySerializationSchema[]>(
  members: M,
  defaultValue?: SerializationSchemaValue<M[number]>,
): SerializationSchema<SerializationSchemaValue<M[number]>> {
  type T = SerializationSchemaValue<M[number]>;
  invariant(
    members.length > 0,
    'unionValue: at least one member schema is required',
  );
  const fallback =
    defaultValue !== undefined ? defaultValue : (members[0].defaultValue as T);
  return makeSchema<T>(
    value => {
      for (let i = 0; i < members.length; i++) {
        // Object.is, not ===, so the union accepts exactly what its members
        // accept: `enumValue([NaN])` returns NaN unchanged, and `===` would
        // read that as a rejection.
        if (Object.is(members[i](value), value)) {
          return value as T;
        }
      }
      return fallback;
    },
    {kind: 'union', members},
    // A union describes one property, so — like nullable/optional, and unlike
    // arrayValue, whose item describes an element — it carries its members'
    // accessor names. The first member to name one wins.
    unionAccessors(members),
    // A member that accepts `undefined` (an optional or raw one) would
    // otherwise make `undefined` the derived default, discarding `fallback`.
    fallback,
  );
}

function unionAccessors(
  members: readonly AnySerializationSchema[],
): SchemaAccessors {
  const accessors: {getter?: string | null; setter?: string | null} = {};
  for (const member of members) {
    if (accessors.getter === undefined) {
      accessors.getter = member.getter;
    }
    if (accessors.setter === undefined) {
      accessors.setter = member.setter;
    }
  }
  return accessors;
}

/**
 * Combinator that normalizes the value another {@link SerializationSchema} parsed, for
 * serialized properties whose accepted domain is wider than the stored one —
 * the motivating case is a legacy shorthand that older documents carry
 * (`format: 'bold'`) being folded into the stored numeric form. `inner` still
 * owns the domain: it validates the untrusted input (falling back to its
 * default as usual), and `transform` then maps every value it can produce
 * into the target domain, so the node's setter only ever sees normalized
 * values.
 *
 * `transform` must be pure and total over `inner`'s outputs: it runs once
 * when the schema is built to derive the {@link SerializationSchema.defaultValue}
 * (the transform of `inner`'s default) and once per parsed value. The `meta`
 * (and any setter recorded with {@link withSetter}) are inherited from
 * `inner`, so introspection describes the accepted input domain — tooling
 * that generates example JSON keeps generating the legacy forms, which is
 * exactly what a parser test wants to exercise.
 *
 * @example
 * ```ts
 * const parseFormat = transformValue(
 *   unionValue(
 *     [numberValue(), enumValue(Object.keys(TEXT_TYPE_TO_FORMAT) as TextFormatType[])],
 *     0,
 *   ),
 *   value => (typeof value === 'string' ? TEXT_TYPE_TO_FORMAT[value] : value),
 * );
 * //    ^? SerializationSchema<number>
 * parseFormat(1);      // 1
 * parseFormat('bold'); // IS_BOLD
 * parseFormat('junk'); // 0 (inner falls back to its default)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function transformValue<In, Out>(
  inner: SerializationSchema<In>,
  transform: (value: In) => Out,
): SerializationSchema<Out> {
  return makeSchema(value => transform(inner(value)), inner.meta, inner);
}

/**
 * Build a {@link SerializationSchema} for a value this schema deliberately does not
 * validate, because something else owns its domain — the motivating case is a
 * nested {@link SerializedEditor}, which the nested editor's own
 * `parseEditorState` validates when the property is applied.
 *
 * The value is passed through unchanged and `undefined` is the recoverable
 * default, so declaring the property still routes it through the node's setter
 * (and keeps it visible to schema-walking tooling) without pretending to
 * validate its contents.
 * @__NO_SIDE_EFFECTS__
 */
export function rawValue<T>(): SerializationSchema<T | undefined> {
  return makeSchema(value => (value === undefined ? undefined : (value as T)), {
    kind: 'raw',
  });
}

/**
 * Build a {@link SerializationSchema} for an array whose entries are each coerced by `item`.
 * A non-array value (including `undefined`) yields the empty array, which is the
 * recoverable default.
 *
 * @example
 * ```ts
 * const parseIds = arrayValue(stringValue());
 * //    ^? SerializationSchema<string[]>
 * parseIds(['a', 'b']); // ['a', 'b']
 * parseIds('nope');     // []
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function arrayValue<T>(
  item: SerializationSchema<T>,
): SerializationSchema<T[]> {
  return makeSchema(
    value => (Array.isArray(value) ? value.map(entry => item(entry)) : []),
    {item, kind: 'array'},
    // Deliberately not `item`: the item schema describes an element, so its
    // accessors belong to the element, not to the array-valued property.
    undefined,
    undefined,
    // A parse returns a fresh array, so identity would never match the empty
    // default and such a property could never be compacted. Compare by
    // content, element-wise through the item schema.
    (a, b) =>
      a.length === b.length &&
      a.every((entry, i) => isSchemaEqual(item, entry, b[i])),
  );
}

/**
 * Compose per-property {@link SerializationSchema}s into a single {@link SerializationSchema} for an
 * object — for example the serialized JSON of a node. Calling it coerces each
 * known property in turn (ignoring any extra properties), so `objectValue(...)`
 * applied to a partial or untrusted object returns a fully-populated, validated
 * object; `objectValue(...)(undefined)` returns the all-defaults object.
 *
 * The resulting schema can drive a node's `updateFromJSON` (a single source of
 * truth for every property's domain and default) and, via its
 * {@link SerializationSchemaMeta | meta}, generate example serialized nodes in tests.
 *
 * @example
 * ```ts
 * const textNodeSchema = objectValue({
 *   detail: numberValue(),
 *   format: numberValue(),
 *   mode: enumValue(['normal', 'token', 'segmented']),
 *   style: stringValue(),
 *   text: stringValue(),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function objectValue<T extends {readonly [key: string]: unknown}>(
  fields: SerializationSchemaShape<T>,
): SerializationSchema<T> {
  const entries = Object.entries(fields) as [string, AnySerializationSchema][];
  if (__DEV__) {
    for (const [key] of entries) {
      // `result[key] = ...` on a plain object would invoke Object.prototype's
      // `__proto__` setter and reparent the result instead of writing a
      // property, so this name cannot describe a serialized field.
      invariant(
        key !== '__proto__',
        'objectValue: "__proto__" is not a valid field name',
      );
    }
  }
  return makeSchema(
    value => {
      const source: object =
        value !== null && typeof value === 'object' ? value : {};
      const result: {[key: string]: unknown} = {};
      for (let i = 0; i < entries.length; i++) {
        const [key, schema] = entries[i];
        result[key] = schema(hasOwnKey(source, key) ? source[key] : undefined);
      }
      return result as T;
    },
    {fields: fields as SerializationSchemaFields, kind: 'object'},
    undefined,
    undefined,
    // As with arrayValue: a parse returns a fresh object, so compare the
    // declared fields rather than the reference.
    (a, b) =>
      entries.every(([key, schema]) =>
        isSchemaEqual(
          schema,
          (a as {readonly [k: string]: unknown})[key],
          (b as {readonly [k: string]: unknown})[key],
        ),
      ),
  );
}

/**
 * Return a copy of `schema` that records the name of the node setter used to
 * apply its parsed value when the base {@link LexicalNode.updateFromJSON} walks
 * a node's `json` schema. Use this for an {@link objectValue} field whose setter
 * does not follow the default `set<Prop>` naming.
 *
 * @example
 * ```ts
 * objectValue({
 *   // applied with node.setTextContent(...) rather than the default node.setText(...)
 *   text: withSetter(stringValue(), 'setTextContent'),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function withSetter<T>(
  schema: SerializationSchema<T>,
  setter: string | null,
): SerializationSchema<T> {
  return makeSchema(
    value => schema(value),
    schema.meta,
    {getter: schema.getter, setter},
    // Naming an accessor says nothing about the domain, so the copy keeps the
    // original's default and equality rather than re-deriving them.
    schema.defaultValue,
    schema.isEqual,
  );
}

/**
 * Return a copy of `schema` that records the name of the node getter used to
 * read its value when the base {@link LexicalNode.exportJSON} walks a node's
 * `json` schema. Use this for an {@link objectValue} field whose getter does
 * not follow the default `get<Prop>` naming.
 *
 * The getter may return `undefined` to omit the property from the exported
 * JSON entirely, which is how an optional property (or one a node only
 * persists conditionally) is expressed.
 *
 * @example
 * ```ts
 * objectValue({
 *   // read with node.getTextContent() rather than the default node.getText()
 *   text: withGetter(stringValue(), 'getTextContent'),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function withGetter<T>(
  schema: SerializationSchema<T>,
  getter: string | null,
): SerializationSchema<T> {
  return makeSchema(
    value => schema(value),
    schema.meta,
    {getter, setter: schema.setter},
    schema.defaultValue,
    schema.isEqual,
  );
}

/**
 * Return a copy of `schema` that declares the serialized property to *be* a
 * node field (always `__`-prefixed, per the convention every Lexical node
 * field follows) rather than a pair of accessor methods.
 *
 * This is the fast path in both directions: exporting reads the field, and
 * importing assigns it, with no method call on either side — and no version
 * resolution either way, since the node being parsed into is writable by
 * construction and the node being exported is one the walk already resolved
 * from the EditorState. Because the name is recorded on the schema, an introspecting
 * tool (a codegen pass emitting a specialized parser for a hot node type) can
 * see that a property is a plain field and compile it to a direct assignment;
 * the `__` prefix is what marks an accessor name as a field rather than a
 * method.
 *
 * The trade-off is that a field access is exactly that: normalization,
 * validation or bookkeeping a `set<Prop>` method would do is skipped, and a
 * subclass override of that method is not consulted. Use it when the property
 * really is the field — which is also what makes it safe to compile away.
 *
 * @example
 * ```ts
 * objectValue({
 *   // exported as node.__id, imported as `writable.__id = value`
 *   id: withField(stringValue(), '__id'),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function withField<T>(
  schema: SerializationSchema<T>,
  field: `__${string}`,
): SerializationSchema<T> {
  return withAccessors(schema, {getter: field, setter: field});
}

/**
 * Return a copy of `schema` that records both accessor names at once, which is
 * the common case for a property whose node methods do not follow the default
 * `get<Prop>`/`set<Prop>` naming. Equivalent to composing {@link withGetter}
 * and {@link withSetter}; either may be omitted to keep the default (or an
 * already recorded) name for that direction.
 *
 * @example
 * ```ts
 * objectValue({
 *   text: withAccessors(stringValue(), {
 *     getter: 'getTextContent',
 *     setter: 'setTextContent',
 *   }),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function withAccessors<T>(
  schema: SerializationSchema<T>,
  accessors: SchemaAccessors,
): SerializationSchema<T> {
  return makeSchema(
    value => schema(value),
    schema.meta,
    {
      getter: accessors.getter === undefined ? schema.getter : accessors.getter,
      setter: accessors.setter === undefined ? schema.setter : accessors.setter,
    },
    schema.defaultValue,
    schema.isEqual,
  );
}
