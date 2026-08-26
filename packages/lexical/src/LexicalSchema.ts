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
 * arbitrary that generates example values, or to emit a JSON Schema document. The data
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
  | {readonly kind: 'object'; readonly fields: SerializationSchemaFields}
  | {
      readonly kind: 'aliased';
      readonly inner: AnySerializationSchema;
      /** Legacy input spellings, mapped to the value each denotes. */
      readonly aliases: {readonly [alias: string]: unknown};
    };

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
   * the base {@link LexicalNode.updateFromJSON} walks a node's serialization
   * schema. When omitted, the setter name defaults to `set<Prop>` for the
   * property this
   * schema is bound to in an {@link objectValue} (e.g. `foo` → `setFoo`). Use
   * {@link withAccessors} to record a name that doesn't follow that convention
   * (e.g. TextNode's `text` → `setTextContent`), or a {@link SchemaField} to
   * write the value straight to a node field.
   */
  readonly setter?: SchemaSetterAccessor;
  /**
   * The name of the node getter that reads this property's value when the base
   * {@link LexicalNode.exportJSON} walks a node's serialization schema. When
   * omitted, the getter name defaults to `get<Prop>` (e.g. `foo` → `getFoo`).
   * Use
   * {@link withAccessors} to record a name that doesn't follow that convention
   * (e.g. TextNode's `text` → `getTextContent`), or a {@link SchemaField} to
   * read the value straight from a node field. A getter that returns
   * `undefined` omits the property from the exported JSON.
   */
  readonly getter?: SchemaGetterAccessor;
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
  /**
   * Whether `value` is in this schema's domain, for {@link unionValue} deciding
   * which member a value belongs to.
   *
   * A schema is total — it always returns a value — so membership normally has
   * to be inferred from the parse: landing anywhere but the default means the
   * value was recognized. That inference cannot see a value the schema
   * *normalizes into* its own default, which is why a schema that accepts more
   * than its own value type says so directly.
   */
  accepts?(value: unknown): boolean;
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
 * Declares that a serialized property *is* a node field, read and written
 * directly rather than through an accessor method. The kind is stated rather
 * than inferred from the name: a field and a method are different things to
 * reach for, and deciding between them by looking at the string would make a
 * node's field naming part of this API's contract.
 */
export interface SchemaFieldBase {
  readonly field: string;
  /**
   * The accessor method this direct field access stands in for. Naming it keeps
   * a subclass in charge of its own property: if any class between the one that
   * declared this field and the node's own class overrides that method, the
   * field access is abandoned and the method is called instead.
   *
   * Name it whenever the property already had an accessor before it had a
   * schema — every core node's, since overriding `getTextContent()` or
   * `setStyle()` on a TextNode subclass is ordinary — so that migrating the
   * property to a field is not a behavior change for anyone who did. Leave it
   * out for a property that is only ever the field.
   */
  readonly method?: string;
}

/** A node field read directly on export. */
export interface SchemaGetterField extends SchemaFieldBase {
  /**
   * The name of a node predicate that decides whether this property is written
   * at all. Naming it keeps the property on the direct-field path: without it,
   * a conditionally-persisted property needs an accessor method, and a method
   * is a call plus a `getLatest()` on every export of every node.
   *
   * The property is written only when its value differs from the schema
   * default *and* the predicate returns true — the default is what parsing
   * would restore anyway, so writing it says nothing, and testing it first is
   * what keeps the predicate off the common path. ElementNode's `textFormat`
   * and `textStyle` are the motivating case: both are persisted only for an
   * element with no TextNode child.
   *
   * The predicate must be a pure, zero-argument method: it is called once per
   * export by the walk for each property that names it, and once in total by
   * generated code, which hoists a predicate that several properties share.
   */
  readonly when?: string;
  /**
   * A lookup table from the stored field value to the serialized one, for a
   * property whose two representations differ — TextNode stores `mode` as a
   * bitmask and serializes it as a name.
   *
   * Without this such a property needs an accessor method, and a method is a
   * call plus, by convention, a `getLatest()`. Stating the mapping keeps the
   * property on the direct-read path: the table is a plain object of
   * primitives, so it is as inlinable by a code generator as the field read is.
   *
   * The export direction's table; {@link SchemaSetterField.encode} is its
   * import mirror. Each is declared only on the direction that reads it, so
   * naming the wrong one is a type error rather than a silently ignored
   * property.
   */
  readonly decode?: {readonly [key: string]: unknown};
}

/** A node field written directly on import. */
export interface SchemaSetterField extends SchemaFieldBase {
  /**
   * A lookup table from the serialized value to the stored one — the inverse of
   * {@link SchemaGetterField.decode}, for the import direction. The parsed
   * value is the key, so the schema still owns the domain: only a value the
   * schema admitted is ever looked up.
   */
  readonly encode?: {readonly [key: string]: unknown};
}

/**
 * A node field in whichever direction it was declared for. Prefer the
 * direction-specific types when the direction is known — this union admits
 * both tables, so it cannot reject the one that does not belong.
 */
export type SchemaField = SchemaGetterField | SchemaSetterField;

/**
 * One direction of a {@link SerializationSchema} field: a method name, a
 * {@link SchemaField} naming a node field, or `null` for a direction that is
 * deliberately unsupported.
 */
export type SchemaAccessor = string | SchemaField | null;

/** How the export direction reaches a property. */
export type SchemaGetterAccessor = string | SchemaGetterField | null;

/** How the import direction reaches a property. */
export type SchemaSetterAccessor = string | SchemaSetterField | null;

/**
 * Both directions of a property that *is* a node field, as {@link withField}
 * takes them: the field name, the two value tables (each used by the one
 * direction it names), and the accessor each direction stands in for.
 */
export interface FieldOptions {
  readonly field: string;
  /** @see {@link SchemaGetterField.decode} */
  readonly decode?: {readonly [key: string]: unknown};
  /** @see {@link SchemaSetterField.encode} */
  readonly encode?: {readonly [key: string]: unknown};
  /** The getter this field read stands in for; see {@link SchemaFieldBase.method}. */
  readonly getter?: string;
  /** The setter this field write stands in for; see {@link SchemaFieldBase.method}. */
  readonly setter?: string;
}

/**
 * The node accessors a {@link SerializationSchema} field is applied through.
 *
 * A string resolves to a method on the node; `{field}` resolves to one of the
 * node's own fields. `null` states that the direction is deliberately
 * unsupported — an export-only property computed from others (`setter: null`,
 * as ListNode's `tag` is derived from `listType`) or an import-only one
 * (`getter: null`). Leaving a direction undefined uses the conventional
 * `get<Prop>`/`set<Prop>` name, which must exist: a name that resolves to
 * nothing would silently drop the property, so it fails at registration.
 *
 * The two directions are independent, and a node may reasonably mix them:
 * TableCellNode reads `headerState` straight off the field but applies it
 * through `setHeaderStyles`, which supplies a default mask.
 */
export interface SchemaAccessors {
  readonly getter?: SchemaGetterAccessor;
  readonly setter?: SchemaSetterAccessor;
}

/**
 * Whether an accessor names a node field rather than a method.
 *
 * Generic in the field type so it narrows to the direction it was handed:
 * given a {@link SchemaGetterAccessor} it yields a {@link SchemaGetterField},
 * whose `decode` is then the only table in scope.
 */
export function isSchemaField<T extends SchemaFieldBase>(
  accessor: string | T | null | undefined,
): accessor is T {
  return typeof accessor === 'object' && accessor !== null;
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
  defaultValue?: T,
  isEqual?: (a: T, b: T) => boolean,
  accepts?: (value: unknown) => boolean,
): SerializationSchema<T> {
  const derived = defaultValue === undefined;
  const resolved: T = derived ? parse(undefined) : defaultValue;
  if (derived) {
    // The default is metadata every parse shares, and StateConfig hands it
    // straight to $getState for a node that has none of its own. Freezing it
    // turns "mutate one node's default and corrupt every node in the process"
    // into a loud error; a parsed value is a fresh object and is untouched.
    // Only a default this call derived: one the caller passed in is theirs.
    deepFreeze(resolved);
  }
  return Object.assign(parse, {
    accepts,
    defaultValue: resolved,
    getter: accessors.getter,
    isEqual,
    meta,
    setter: accessors.setter,
  });
}

/**
 * Freeze a derived default and everything reachable from it. Freezing only the
 * outer value would leave an array or object *nested* in an {@link objectValue}
 * default writable, and a nested value is shared by every node that has none of
 * its own exactly as the outer one is — so it is the same hazard one level
 * down. Already-frozen values are skipped, which also terminates a cycle.
 */
function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return;
  }
  Object.freeze(value);
  for (const inner of Object.values(value)) {
    deepFreeze(inner);
  }
}

/**
 * `source` is untrusted parsed JSON, whose prototype is `Object.prototype`: a
 * plain `key in source` (or `source[key]`) would report an inherited member —
 * `toString`, `constructor` — as a present value and hand it to a node setter.
 *
 * A type predicate rather than a `boolean`, so a caller reads the value off the
 * narrowed `source` instead of casting an unindexable `object`.
 */
function isRecord(value: unknown): value is {readonly [key: string]: unknown} {
  return typeof value === 'object' && value !== null;
}

/**
 * Carry `inner`'s equality onto a wrapper that adds a nil to its domain: the
 * two describe the same property, and identity already answers the nil cases.
 */
function liftIsEqual<T>(
  inner: SerializationSchema<T>,
): undefined | ((a: T | null | undefined, b: T | null | undefined) => boolean) {
  const {isEqual} = inner;
  return isEqual === undefined
    ? undefined
    : (a, b) => (a == null || b == null ? a === b : isEqual(a, b));
}

/**
 * Carry `inner`'s domain membership onto a wrapper that adds a nil to its
 * domain, declared only when `inner` declares one — the same convention as
 * {@link aliasedValue} — since without it a union's parse-inference reads the
 * wrapper as well as it reads the inner schema.
 *
 * `isNil` is the wrapper's own nil test, not `== null` for both: `nullable`
 * maps `null` *and* `undefined` to null, while `optional` maps only
 * `undefined` and hands `null` to `inner`. Claiming to accept a value the
 * wrapper then delegates is what makes wrapping change a union's answer —
 * `unionValue([optional(numberValue()), enumValue(['inherit'])], 'inherit')`
 * would commit to the optional member for `null` and return `inner`'s
 * fallback `0`, where the unwrapped member correctly declines it.
 */
function liftAccepts<T>(
  inner: SerializationSchema<T>,
  isNil: (value: unknown) => boolean,
): undefined | ((value: unknown) => boolean) {
  const {accepts} = inner;
  return accepts === undefined
    ? undefined
    : value => isNil(value) || accepts(value);
}

/**
 * Whether `source` carries `key` as its own property.
 *
 * A type predicate rather than a `boolean`, so a caller can read the value off
 * the narrowed `source` instead of casting an unindexable `object`.
 *
 * `Object.prototype.hasOwnProperty.call` rather than `Object.hasOwn`, which is
 * newer than the browser baseline these packages are linted against. Lives here
 * rather than in LexicalUtils because this module imports nothing from the rest
 * of the core, so it is the one the other direction can reach.
 *
 * @internal
 */
export function hasOwnKey<K extends string>(
  source: object,
  key: K,
): source is {readonly [P in K]: unknown} {
  return Object.prototype.hasOwnProperty.call(source, key);
}

/**
 * {@link isRecord} narrowed to what an {@link objectValue} describes. An array
 * is an object too, and comparing one field-wise against an object default
 * would report `[]` and `{}` as the same value.
 */
function isPlainRecord(
  value: unknown,
): value is {readonly [key: string]: unknown} {
  return isRecord(value) && !Array.isArray(value);
}

/** Whether `source` carries an own key that `fields` does not describe. */
function hasUndeclaredKey(
  source: {readonly [key: string]: unknown},
  fields: object,
): boolean {
  for (const key of Object.keys(source)) {
    if (!hasOwnKey(fields, key)) {
      return true;
    }
  }
  return false;
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
 * The JSON number grammar, anchored, for reading a stringified number back as
 * the number it spells. `Number()` alone is far more permissive than JSON:
 * it reads `'0x10'` as 16, `'0b11'` as 3, `'Infinity'` as `Infinity`, `''` and
 * `'  '` as 0, and ignores surrounding whitespace. None of those are shapes a
 * JSON encoder produces, so none of them are evidence of a number that was
 * stringified — they are out-of-domain input, and fall back to the default.
 */
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Build a {@link SerializationSchema} that returns `value` when it is a finite `number`,
 * otherwise returns `defaultValue` (`0` by default). `NaN`, `Infinity`, and
 * `-Infinity` are all treated as out of domain since they can not be
 * round-tripped through JSON.
 *
 * A string spelled as a JSON number is accepted and converted, so a document
 * that stored `"120"` where Lexical writes `120` — a hand-authored fixture, a
 * converter, or a backend that stringified its numbers — keeps its value
 * instead of silently falling back to the default. The domain is still
 * numbers: that is what the schema reports and what parsing returns, a string
 * is only an input encoding of it. Only the JSON grammar is read, so notations
 * that JSON itself can not produce (`"0x10"`, `"1_000"`, `"+1"`, `"Infinity"`)
 * stay out of domain.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function numberValue(
  defaultValue = 0,
  options: NumberValueOptions = {},
): SerializationSchema<number> {
  const {min, max, integer} = options;
  const coerce = (value: unknown): unknown =>
    typeof value === 'string' && JSON_NUMBER.test(value)
      ? Number(value)
      : value;
  const inDomain = (parsed: unknown): parsed is number =>
    typeof parsed === 'number' &&
    Number.isFinite(parsed) &&
    (min === undefined || parsed >= min) &&
    (max === undefined || parsed <= max) &&
    (!integer || Number.isInteger(parsed));
  return makeSchema(
    value => {
      const parsed = coerce(value);
      return inDomain(parsed) ? parsed : defaultValue;
    },
    {integer, kind: 'number', max, min},
    undefined,
    undefined,
    undefined,
    // Declared because this domain spans two value types: a union member has
    // no other way to tell `'0'` — a stringified number, in domain, which
    // parsing normalizes to the default — from `'banana'`, which is out of
    // domain and lands on the default too.
    value => inDomain(coerce(value)),
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
    // `undefined` is checked before membership even when it is one of the
    // values: an absent JSON property parses as `undefined`, so reading it as
    // the in-band value rather than the fallback would break
    // `schema(undefined) === schema.defaultValue` — the equality compaction
    // relies on when it drops a default-valued property expecting parsing to
    // restore it. (When `undefined` *is* the default the two agree anyway.)
    value =>
      value !== undefined && allowed.has(value) ? (value as T) : defaultValue,
    {kind: 'enum', values},
    {},
    // Passed explicitly because `undefined` may itself be the declared default,
    // which makeSchema would otherwise read as "derive it from parse".
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
 * idiom, where an empty string is not a real `rel`. Equality is `inner`'s own
 * (see {@link SerializationSchema.isEqual}), so a reference-typed default is
 * compared by content: `nullable(arrayValue(...), {defaultAsNull: true})`
 * reads an explicitly empty array as `null`.
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
    undefined,
    liftIsEqual(inner),
    // Both nils: the parse above maps `null` and `undefined` alike to null.
    liftAccepts(inner, value => value == null),
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
 * instead of being persisted as the default. Equality is `inner`'s own (see
 * {@link SerializationSchema.isEqual}), so a reference-typed default is
 * compared by content: `optional(arrayValue(...), {omitDefault: true})` omits
 * an explicitly empty array rather than persisting it.
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
    undefined,
    liftIsEqual(inner),
    // Only `undefined`: the parse above delegates `null` to `inner`, so
    // claiming to accept it would answer for a domain that is not this one's.
    liftAccepts(inner, value => value === undefined),
  );
}

/**
 * Combinator for a value whose domain is the union of several schemas, such as
 * a dimension that is either a number or the literal `'inherit'`. The domain
 * is inferred as the union of the members' value types; annotate the result
 * when you want to assert a narrower intended domain instead.
 *
 * A {@link SerializationSchema} is total — it always returns a value, falling
 * back to its own default rather than reporting a rejection — so a member is
 * considered to accept `value` when parsing it lands anywhere *other* than that
 * member's default, or when the value is itself that default (the one case a
 * total schema cannot distinguish from a fallback). The first accepting member
 * wins and the union yields what that member parsed, so a member that
 * normalizes its input — {@link numberValue} reading a stringified number —
 * composes here the same way it behaves alone. If no member accepts, the result
 * is `defaultValue` when given, otherwise the first member's default.
 *
 * The inference above is only the fallback. A member that declares its own
 * domain — every combinator but {@link arrayValue} and {@link objectValue} —
 * is asked directly, which is the only way to recognize a value it normalizes
 * *into* its own default (`numberValue()` reading `'0'`). A member whose
 * `defaultValue` lies outside its own constrained domain
 * (`numberValue(0, {min: 1})`) is therefore declined for that value rather
 * than accepting it, and the union falls through to the next member.
 *
 * The result is itself a member of the union in both respects: it declares an
 * `accepts` that asks each member in turn, so a union nested in another union
 * (or reached through a wrapper) keeps its domain, and an `isEqual` that
 * defers to whichever member recognizes the pair, so a union over a
 * reference-typed member still compares by content.
 *
 * @example
 * ```ts
 * const parseDimension = unionValue([numberValue(), enumValue(['inherit'])], 'inherit');
 * //    ^? SerializationSchema<number | 'inherit'>
 * parseDimension(640);       // 640
 * parseDimension('640');     // 640 (numberValue reads a stringified number)
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
  /**
   * The member that recognizes `value`, and what it parsed to — the one place
   * the membership rule is stated, so `accepts` cannot answer differently from
   * the parse that follows it.
   */
  const $match = (value: unknown): undefined | {parsed: T} => {
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      // A member that knows its own domain answers directly; that is the
      // only way to recognize a value it normalizes *into* its default,
      // which the inference below reads as a fallback.
      const {accepts} = member;
      if (accepts !== undefined) {
        if (accepts(value)) {
          return {parsed: member(value) as T};
        }
        continue;
      }
      const parsed = member(value);
      // Landing on the member's default is the one result that is ambiguous:
      // it means either "this value is the default" or "this value was out of
      // domain and I fell back". Comparing the *input* against the default
      // separates them for a member whose domain is a single value type, and
      // every other result is proof the member recognized the value —
      // including one it normalized, which is why the parsed value is what
      // gets returned.
      if (
        !isSchemaDefault(member, parsed) ||
        isSchemaEqual(member, value, member.defaultValue)
      ) {
        return {parsed: parsed as T};
      }
    }
    return undefined;
  };
  return makeSchema<T>(
    value => {
      if (value === undefined) {
        // A member that accepts `undefined` (an optional or raw one) would
        // otherwise win here and return it, contradicting `defaultValue` —
        // which compaction and `omitDefault` both compare against.
        return fallback;
      }
      const matched = $match(value);
      return matched === undefined ? fallback : matched.parsed;
    },
    {kind: 'union', members},
    // A union describes one property, so — like nullable/optional, and unlike
    // arrayValue, whose item describes an element — it carries its members'
    // accessor names. The first member to name one wins.
    unionAccessors(members),
    // A member that accepts `undefined` (an optional or raw one) would
    // otherwise make `undefined` the derived default, discarding `fallback`.
    fallback,
    // Deferred to whichever member recognizes the pair, so a union over a
    // reference-typed member (arrayValue/objectValue, which return a fresh
    // value per parse) still compares by content — without this such a
    // property could never equal its default and so could never compact, and
    // as a `createState` parse it would fall back to Object.is and dirty the
    // node on every write of an equal value.
    (a, b) => members.some(m => m.isEqual !== undefined && m.isEqual(a, b)),
    // Declared for the same reason every wrapper declares one: a union used as
    // a member of another union (or wrapped and then used) would otherwise be
    // read by the parse-inference above, which cannot see a value this
    // normalizes into its own default — `unionValue([numberValue(),
    // enumValue(['inherit'])])` parsing '0' to 0 would be read as a fallback
    // and the whole union skipped. `undefined` is excluded to match the parse.
    value => value !== undefined && $match(value) !== undefined,
  );
}

function unionAccessors(
  members: readonly AnySerializationSchema[],
): SchemaAccessors {
  const accessors: {
    getter?: SchemaGetterAccessor;
    setter?: SchemaSetterAccessor;
  } = {};
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
 * Combinator for a value that older documents may spell as one of a fixed set
 * of names — TextNode's `format: 'bold'` for the numeric bit it stands for.
 * A string matching one of `aliases` yields the value it names; anything else
 * is `inner`'s to validate, so the domain, the default and the equality all
 * stay `inner`'s and only the accepted *input* is wider.
 *
 * This is {@link transformValue} narrowed to the case where the normalization
 * is a lookup, and the reason to prefer it is that the lookup is data: it goes
 * into the schema's {@link SerializationSchemaMeta | meta}, where a tool can
 * see it. A `transformValue` inherits its inner's meta and keeps the function
 * to itself, so introspection describes a domain the schema does not actually
 * produce — example generation invents values the node would normalize, and a
 * code generator compiling from meta would emit a parser that stores the alias
 * where the schema stores what it names.
 *
 * @example
 * ```ts
 * const parseFormat = aliasedValue(numberValue(), TEXT_TYPE_TO_FORMAT);
 * //    ^? SerializationSchema<number>
 * parseFormat(1);      // 1
 * parseFormat('bold'); // IS_BOLD
 * parseFormat('42');   // 42 (not an alias, so numberValue reads it)
 * parseFormat('junk'); // 0  (numberValue falls back to its default)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function aliasedValue<T>(
  inner: SerializationSchema<T>,
  aliases: {readonly [alias: string]: T},
): SerializationSchema<T> {
  // hasOwnKey, not `alias in aliases` or a bare lookup: `aliases` is a plain
  // object literal, so an untrusted `'toString'` would otherwise resolve to
  // Object.prototype's method and be stored as this property's value.
  const isAlias = (value: unknown): value is string =>
    typeof value === 'string' && hasOwnKey(aliases, value);
  const {accepts} = inner;
  return makeSchema(
    value => (isAlias(value) ? (aliases[value] as T) : inner(value)),
    {aliases, inner, kind: 'aliased'},
    // One property, so the accessor names are the inner schema's, as with
    // nullable/optional.
    inner,
    // Naming an alias says nothing about which value is the default.
    inner.defaultValue,
    inner.isEqual,
    // Declared only when the inner schema declares one: without it, a union
    // infers membership from the parse, and that inference reads an aliased
    // schema exactly as well as it reads its inner.
    accepts === undefined
      ? undefined
      : value => isAlias(value) || accepts(value),
  );
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
 * (and any setter recorded with {@link withAccessors}) are inherited from
 * `inner`, so introspection describes the accepted input domain — tooling
 * that generates example JSON keeps generating the legacy forms, which is
 * exactly what a parser test wants to exercise.
 *
 * `inner`'s {@link SerializationSchema.isEqual | isEqual} is *not* inherited:
 * it compares values of `inner`'s domain, and the transformed domain may be a
 * different type entirely. Pass `{isEqual}` when the output domain is
 * reference-typed, or a transformed array/object property can never compact
 * away and, used as a `createState` parse, dirties its node on every write of
 * an equal value.
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
  options: {readonly isEqual?: (a: Out, b: Out) => boolean} = {},
): SerializationSchema<Out> {
  return makeSchema(
    value => transform(inner(value)),
    inner.meta,
    inner,
    // Derived here rather than by makeSchema calling `parse(undefined)`, which
    // is the same value: `transform` is the caller's function, so what it
    // returns is the caller's to keep — possibly a module constant it also uses
    // elsewhere — and a default makeSchema derives is one it freezes.
    transform(inner.defaultValue),
    options.isEqual,
    // Membership is about the *input* domain, and the transform maps outputs,
    // so what the inner schema admits is exactly what this admits.
    inner.accepts,
  );
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
    value => {
      if (!Array.isArray(value)) {
        return [];
      }
      // An index loop rather than `map`, which preserves the holes of a sparse
      // array: the item schema would never see them, and a property typed as
      // the item's domain would serialize them as `null`.
      const result = new Array<T>(value.length);
      for (let i = 0; i < value.length; i++) {
        result[i] = item(value[i]);
      }
      return result;
    },
    {item, kind: 'array'},
    // Deliberately not `item`: the item schema describes an element, so its
    // accessors belong to the element, not to the array-valued property.
    undefined,
    undefined,
    // A parse returns a fresh array, so identity would never match the empty
    // default and such a property could never be compacted. Compare by
    // content, element-wise through the item schema.
    // Total, not just defined on the parsed domain: the export path hands this
    // whatever the node's getter returned, which nothing validated. An index
    // loop rather than `every`, which skips the holes of a sparse array and
    // would report `new Array(3)` as equal to any three-element array.
    (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!isSchemaEqual(item, a[i], b[i])) {
          return false;
        }
      }
      return true;
    },
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
    // declared fields rather than the reference — and total, since the export
    // path hands this an unvalidated getter result. A value carrying keys this
    // schema does not declare is *not* equal to the default: those keys say
    // something, and reporting equality would drop them from the export.
    (a, b) =>
      isPlainRecord(a) &&
      isPlainRecord(b) &&
      !hasUndeclaredKey(a, fields) &&
      !hasUndeclaredKey(b, fields) &&
      entries.every(([key, schema]) => isSchemaEqual(schema, a[key], b[key])),
  );
}

/**
 * Return a copy of `schema` that declares the serialized property to *be* a
 * node field rather than a pair of accessor methods.
 *
 * This is the fast path in both directions: exporting reads the field, and
 * importing assigns it, with no method call on either side — and no version
 * resolution either way, since the node being parsed into is writable by
 * construction and the node being exported is one the walk already resolved
 * from the EditorState. Because the name is recorded on the schema, an introspecting
 * tool (a codegen pass emitting a specialized parser for a hot node type) can
 * see that a property is a plain field and compile it to a direct assignment.
 * Use {@link withAccessors} with a `{field}` on one side only when the two
 * directions differ — reading the field but writing through a method that
 * normalizes, as TableCellNode's `headerState` does.
 *
 * The trade-off is that a field access is exactly that: normalization,
 * validation or bookkeeping a `set<Prop>` method would do is skipped, and a
 * subclass override of that method is not consulted. Use it when the property
 * really is the field — which is also what makes it safe to compile away.
 *
 * `getter`/`setter` name the accessor this field access stands in for. Name
 * them whenever the property has one — which is nearly always, since a node
 * that predates its schema already has `get<Prop>`/`set<Prop>` — so that a
 * subclass overriding either still decides; see {@link SchemaField.method}.
 * Leave them out only for a property that is *only* ever the field, which
 * bypasses any accessor a subclass may define. `decode`/`encode` declare a
 * property whose stored and serialized forms differ
 * ({@link SchemaField.decode} / {@link SchemaField.encode}).
 *
 * @example
 * ```ts
 * objectValue({
 *   // TextNode's own field in both directions, but getStyle/setStyle still
 *   // win for a subclass that overrides either.
 *   style: withField(stringValue(), {
 *     field: '__style',
 *     getter: 'getStyle',
 *     setter: 'setStyle',
 *   }),
 *   // A property that is only ever the field: exported as node.__id,
 *   // imported as `writable.__id = value`, deferring to nothing.
 *   id: withField(stringValue(), {field: '__id'}),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export function withField<T>(
  schema: SerializationSchema<T>,
  field: FieldOptions,
): SerializationSchema<T> {
  // `decode`/`encode` and the two method names are each one direction's, so
  // the single options object is split into the two accessors here rather
  // than making every caller write both out.
  return withAccessors(schema, {
    getter: {decode: field.decode, field: field.field, method: field.getter},
    setter: {encode: field.encode, field: field.field, method: field.setter},
  });
}

/**
 * Return a copy of `schema` that records both accessor names at once, which is
 * the common case for a property whose node methods do not follow the default
 * `get<Prop>`/`set<Prop>` naming. Either direction may be omitted to keep the
 * default (or an already recorded) name for that one.
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
    // Naming an accessor says nothing about the domain, so the copy keeps the
    // original's default, equality and membership rather than re-deriving
    // them. This is also the one place that copy is built: withField
    // delegates here.
    schema.defaultValue,
    schema.isEqual,
    schema.accepts,
  );
}
