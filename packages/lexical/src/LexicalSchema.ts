/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
  | {readonly kind: 'number'}
  | {readonly kind: 'boolean'}
  | {readonly kind: 'enum'; readonly values: readonly unknown[]}
  | {readonly kind: 'array'; readonly item: AnySerializationSchema}
  | {readonly kind: 'nullable'; readonly inner: AnySerializationSchema}
  | {readonly kind: 'optional'; readonly inner: AnySerializationSchema}
  | {readonly kind: 'object'; readonly fields: SerializationSchemaFields};

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
  readonly setter?: string;
}

/** A {@link SerializationSchema} for an unknown type, used where the type is not relevant. */
export type AnySerializationSchema = SerializationSchema<unknown>;

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
  setter?: string,
): SerializationSchema<T> {
  return Object.assign(
    parse,
    setter === undefined
      ? {defaultValue: parse(undefined), meta}
      : {defaultValue: parse(undefined), meta, setter},
  ) as SerializationSchema<T>;
}

/**
 * Build a {@link SerializationSchema} that returns `value` when it is a `string`, otherwise
 * returns `defaultValue` (the empty string by default).
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
 */
export function numberValue(defaultValue = 0): SerializationSchema<number> {
  return makeSchema(
    value =>
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : defaultValue,
    {kind: 'number'},
  );
}

/**
 * Build a {@link SerializationSchema} that returns `value` when it is a `boolean`, otherwise
 * returns `defaultValue` (`false` by default).
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
 * @example
 * ```ts
 * const parseMode = enumValue(['normal', 'token', 'segmented']);
 * //    ^? SerializationSchema<'normal' | 'token' | 'segmented'>, default 'normal'
 * ```
 */
export function enumValue<const T>(
  values: readonly T[],
  defaultValue: T = values[0],
): SerializationSchema<T> {
  const allowed = new Set<unknown>(values);
  return makeSchema(
    value => (allowed.has(value) ? (value as T) : defaultValue),
    {kind: 'enum', values},
  );
}

/**
 * Combinator that makes any {@link SerializationSchema} nullable. The returned schema yields
 * `null` when the value is `null` or `undefined` (so `null` is its recoverable
 * default) and otherwise delegates to `inner`. This guarantees a `T | null`
 * result for an untrusted value, unlike `value || null`, which can pass a
 * non-`T` (or falsy) value straight through with the wrong type.
 *
 * @example
 * ```ts
 * const parseRel = nullable(stringValue());
 * //    ^? SerializationSchema<string | null>
 * parseRel('noopener'); // 'noopener'
 * parseRel(null);       // null
 * parseRel(undefined);  // null (the recoverable default)
 * ```
 */
export function nullable<T>(
  inner: SerializationSchema<T>,
): SerializationSchema<T | null> {
  return makeSchema(value => (value == null ? null : inner(value)), {
    inner,
    kind: 'nullable',
  });
}

/**
 * Combinator that makes any {@link SerializationSchema} optional. The returned schema yields
 * `undefined` when the value is `undefined` (so `undefined` is its recoverable
 * default) and otherwise delegates to `inner`. Use it for serialized properties
 * that may be absent and, when absent, should stay absent (an exported `T |
 * undefined` property is omitted from the JSON rather than persisted).
 *
 * @example
 * ```ts
 * const parseWidth = optional(numberValue());
 * //    ^? SerializationSchema<number | undefined>
 * parseWidth(120);       // 120
 * parseWidth(undefined); // undefined (the recoverable default)
 * ```
 */
export function optional<T>(
  inner: SerializationSchema<T>,
): SerializationSchema<T | undefined> {
  return makeSchema(value => (value === undefined ? undefined : inner(value)), {
    inner,
    kind: 'optional',
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
 */
export function arrayValue<T>(
  item: SerializationSchema<T>,
): SerializationSchema<T[]> {
  return makeSchema(
    value => (Array.isArray(value) ? value.map(entry => item(entry)) : []),
    {item, kind: 'array'},
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
 */
export function objectValue<T extends {readonly [key: string]: unknown}>(
  fields: SerializationSchemaShape<T>,
): SerializationSchema<T> {
  const entries = Object.entries(fields) as [string, AnySerializationSchema][];
  return makeSchema(
    value => {
      const source: {readonly [key: string]: unknown} =
        value != null && typeof value === 'object'
          ? (value as {readonly [key: string]: unknown})
          : {};
      const result: {[key: string]: unknown} = {};
      for (let i = 0; i < entries.length; i++) {
        const [key, schema] = entries[i];
        result[key] = schema(source[key]);
      }
      return result as T;
    },
    {fields: fields as SerializationSchemaFields, kind: 'object'},
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
 */
export function withSetter<T>(
  schema: SerializationSchema<T>,
  setter: string,
): SerializationSchema<T> {
  return makeSchema(value => schema(value), schema.meta, setter);
}
