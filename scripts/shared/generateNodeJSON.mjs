/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Emit specialized `exportJSON`, `updateFromJSON` and `afterCloneFrom`
 * implementations for the node classes in {@link MANIFEST}, from the same
 * serialization schema those classes declare, using `@lexical/compiler`'s
 * SchemaJsonCodegen pass.
 *
 * Both schema-driven paths walk a compiled table per node: a loop, an indirect
 * call per property, and a keyed store whose key changes every iteration.
 * Everything they decide — which accessor to use, what the node's type string
 * is, what each property's domain admits — is fixed once the schema is written,
 * so it can be decided here instead and emitted as straight-line code. That is
 * what the hand-written methods this schema replaced used to be, recovered
 * without hand-writing them.
 *
 * Each package gets its own generated module beside its nodes, and each class
 * passes its own generated code to `$config`, so the association is carried by
 * the class rather than derived from its type string; a subclass whose
 * accessor tables compile the same way inherits it, which is why `type` is
 * read off the node rather than emitted as a literal. The compact form
 * compares each property against its default; a reference-typed default has no
 * literal a value could be `===`, so it gets the structural test the schema's
 * own equality reduces to where that can be stated (MarkNode's `ids`, an empty
 * array), verified against that equality the way a parse is verified, and
 * otherwise keeps the walk for that one form.
 *
 * The import direction is the untrusted-JSON boundary and has to reproduce
 * each property's validation exactly, so every emitted parser is checked here
 * against the schema it was compiled from, over a corpus derived from that
 * schema plus a fixed set of hostile values. A property whose schema this
 * cannot compile — or compiles wrongly — takes the class out of the import
 * half rather than shipping a parser that disagrees with the walk.
 *
 * `afterCloneFrom` is the third direction, and the one whose fallback is not
 * the walk: a class that declares schema fields gets one synthesized at
 * registration whether or not it is generated here, because a field is where a
 * property is stored and a clone that drops it loses the value silently. What
 * is emitted is that same field list as straight-line assignments, so a class
 * generated here pays no loop for it.
 *
 * Reading a schema needs no editor and constructs no node: `$config()` is a
 * plain method on the prototype, so this runs as an ordinary build step.
 *
 * This module is the generation itself. `scripts/generate-node-json.mjs` runs
 * it (`pnpm run generate-node-json`) after a stub phase that keeps the imports
 * loadable, and `LexicalGeneratedJSON.test.ts` runs it in-process into a
 * temporary directory and fails if any checked-in output is stale or
 * disagrees with the schema-driven path.
 */

import {
  compileDiffersFromDefault,
  compileParse,
  literal,
  NotCompilable,
  NUM_HELPER_SOURCE,
  NUM_RANGE_HELPER_SOURCE,
  verifyCompiledParse,
  verifyDiffersFromDefault,
  verifyTableCoversDomain,
} from '@lexical/compiler/SchemaJsonCodegen';
// The synchronous wrapper rather than `prettier` itself, for the same reason
// the test utilities use it: under vitest, `prettier` resolves to its browser
// build (the config resolves with the `browser` condition), which has no
// `resolveConfig`, while this runs the real one in a worker wherever it is
// loaded. Generation is not a hot path.
import prettier from '@prettier/sync';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

import {
  HEADER,
  INTERFACE_SOURCE,
  MANIFEST,
} from './generateNodeJSONManifest.mjs';

/** @typedef {import('lexical').LexicalNode} LexicalNode */
/** @typedef {import('lexical').Klass<LexicalNode>} NodeClass */
/** @typedef {import('lexical').AnySerializationSchema} AnySchema */

const REPO = join(import.meta.dirname, '..', '..');

// Bare specifiers rather than paths to the sources: tsconfig's `paths` maps
// each to its package's src for both tsx and the type checker, and a specifier
// ending in `.ts` is a type error under this repo's settings.
const {isSchemaField, LineBreakNode, ParagraphNode, TabNode, TextNode} =
  await import('lexical');
// All three are `@internal` — how a class composes its schema and which accessor a
// field stands in for are this codegen's concern and the walk's, not a public
// API to be frozen by the backwards-compatibility rule — so they are reached
// through the module that declares them rather than the package entry point.
// `paths` maps `lexical/src/*` the same way it maps `lexical`, so this is the
// same module instance the editor uses, not a second copy.
const {
  getComposedSchema,
  ownSchemaFields,
  resolveGetterAccessor,
  resolveSetterAccessor,
} = await import('lexical/src/LexicalUtils');
const {HeadingNode, QuoteNode} = await import('@lexical/rich-text');
const {AutoLinkNode, LinkNode} = await import('@lexical/link');
const {MarkNode} = await import('@lexical/mark');

/**
 * The classes each generated module serializes, in the order their code is
 * emitted, with the module each type import comes from. The list is what to
 * extend to specialize another class; everything else is derived from its
 * schema.
 *
 * @type {readonly {
 *   file: string,
 *   home?: boolean,
 *   targets: readonly {
 *     klass: NodeClass,
 *     module: string,
 *   }[],
 * }[]}
 */
const PACKAGES = [
  {
    file: 'packages/lexical/src/LexicalGeneratedJSON.ts',
    home: true,
    targets: [
      {klass: TextNode, module: './nodes/LexicalTextNode'},
      {klass: ParagraphNode, module: './nodes/LexicalParagraphNode'},
      {klass: LineBreakNode, module: './nodes/LexicalLineBreakNode'},
      {klass: TabNode, module: './nodes/LexicalTabNode'},
    ],
  },
  {
    file: 'packages/lexical-rich-text/src/LexicalRichTextGeneratedJSON.ts',
    targets: [
      {klass: HeadingNode, module: './index'},
      {klass: QuoteNode, module: './index'},
    ],
  },
  {
    file: 'packages/lexical-link/src/LexicalLinkGeneratedJSON.ts',
    targets: [
      {klass: LinkNode, module: './LexicalLinkNode'},
      {klass: AutoLinkNode, module: './LexicalLinkNode'},
    ],
  },
  {
    file: 'packages/lexical-mark/src/LexicalMarkGeneratedJSON.ts',
    targets: [{klass: MarkNode, module: './MarkNode'}],
  },
];

/** `MarkNode` → `GENERATED_MARK`. */
const constName = (/** @type {NodeClass} */ klass) =>
  `GENERATED_${klass.name.replace(/Node$/, '').toUpperCase()}`;

/**
 * Lookup tables the generated module being built needs, by the const name
 * given to each. Reset per package: tables are emitted into the module whose
 * classes need them.
 *
 * @type {Map<string, {readonly [key: string]: unknown}>}
 */
const tables = new Map();

/**
 * The name each table object was first recorded under, so a schema table two
 * classes share (TabNode's `mode` decodes through the same TEXT_TYPE_TO_MODE
 * as TextNode's) is emitted once under the first name rather than once per
 * class.
 *
 * @type {Map<{readonly [key: string]: unknown}, string>}
 */
const tableNames = new Map();

/**
 * Name and record a lookup table for the generated module.
 *
 * Every table is null-prototype, because every table can be reached by a key
 * it does not have: without it a `'toString'` would resolve to
 * Object.prototype's method rather than missing, and be stored (import) or
 * serialized (export) as the property's value. On the import side the key is
 * the parsed JSON, so it is untrusted outright; on the export side it is the
 * node's own field, which for a schema whose domain is wider than the table's
 * keys holds whatever was put there. Both are what the walk's `hasOwnKey`
 * lookups already guard against, and a miss has to be `undefined` here for the
 * same reason it is there.
 *
 * @param {string} name
 * @param {{readonly [key: string]: unknown}} table
 * @returns {string}
 */
function addTable(name, table) {
  const existing = tableNames.get(table);
  if (existing !== undefined) {
    return existing;
  }
  claimTableName(name, table);
  tableNames.set(table, name);
  return name;
}

/**
 * Record a table under a name, refusing to give two different tables the same
 * one.
 *
 * Names are derived by upper-casing the class and property, which is not
 * injective — `textFormat` and `textformat` produce the same name, as do two
 * classes whose stripped names match. Without this the second `set` would
 * replace the first table under a name the first class's emitted code is
 * already reading, which no amount of verification downstream would catch:
 * both classes compile, and one of them silently decodes through the other's
 * table.
 *
 * Exported for `generateNodeJSON.test.ts`, which is the only place the
 * collision can be provoked: the checked-in manifest has none.
 *
 * @param {string} name
 * @param {{readonly [key: string]: unknown}} table
 */
export function claimTableName(name, table) {
  const existing = tables.get(name);
  if (existing !== undefined && existing !== table) {
    throw new Error(
      `generate-node-json: two different lookup tables both want the name ${name}; rename one of the properties it was derived from`,
    );
  }
  tables.set(name, table);
}

/** @param {NodeClass} klass @param {string} key @param {string} suffix */
function tableName(klass, key, suffix) {
  return `${klass.name.replace(/Node$/, '').toUpperCase()}_${key.toUpperCase()}_${suffix}`;
}

// A plain JavaScript identifier, which is what every name below is interpolated
// into the output as — `node.<field>`, `const <key>`, `{<key>: ...}`. Anything
// else is either a syntax error the formatter would report against generated
// code rather than against the schema that caused it, or — for a name that
// happens to parse — code that reads something other than what was declared.
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// Reserved words cannot be bound, so a property named for one breaks only the
// forms that declare a local. Kept separate from IDENTIFIER for that reason.
const RESERVED = new Set(
  `await break case catch class const continue debugger default delete do else
   enum export extends false finally for function if implements import in
   instanceof interface let new null package private protected public return
   static super switch this throw true try typeof var void while with yield`.split(
    /\s+/,
  ),
);

// The names the emitted functions bind themselves. A property named for one of
// these would shadow it — `const node = node.__node` — and is refused rather
// than renamed, so that what the generated code calls a thing is always what
// the schema called it.
const EMITTED_LOCALS = new Set([
  'json',
  'n',
  'node',
  'num',
  'numC',
  'prevNode',
  'self',
  'v',
]);

/**
 * Check a name before it is interpolated into the output as an identifier.
 *
 * Exported for `generateNodeJSON.test.ts`: every name in the checked-in
 * manifest passes, so the refusals have no other way to be exercised.
 *
 * @param {string} name
 * @param {string} what how the name is used, for the message
 * @param {boolean} [binds] whether the emitted form declares a local of this
 *   name, which additionally rules out reserved words and the emitted locals
 * @returns {string} the name, so this can wrap an interpolation
 */
export function emittable(name, what, binds = false) {
  if (!IDENTIFIER.test(name)) {
    throw new NotCompilable(
      `${what} ${JSON.stringify(name)} is not a plain identifier`,
    );
  }
  if (binds && (RESERVED.has(name) || EMITTED_LOCALS.has(name))) {
    throw new NotCompilable(
      `${what} ${JSON.stringify(name)} collides with a name the generated code binds`,
    );
  }
  return name;
}

/**
 * How one property is read off `node`, or `null` for a property the walk does
 * not write. `when` names the predicate that gates it, for the caller to
 * hoist; see {@link hoistGatedReads}.
 *
 * @param {NodeClass} klass
 * @param {AnySchema} schema
 * @param {string} key
 * @returns {null | {expression: string, when?: string}}
 */
function readExpression(klass, schema, key) {
  const getter = resolveGetterAccessor(klass, key, schema);
  if (getter === null) {
    // Declared import-only, like the walk's compiled getters skip it.
    return null;
  }
  // The key names a local in the compact form and an object key in the legacy
  // one, so it has to survive both.
  emittable(key, 'schema key', true);
  if (isSchemaField(getter)) {
    const field = emittable(getter.field, 'getter field');
    const read =
      getter.decode === undefined
        ? `node.${field}`
        : // The table is plain data, so it is inlined rather than imported:
          // keeping this module free of runtime imports is what keeps it out
          // of the cycle.
          `${addTable(tableName(klass, key, 'DECODE'), getter.decode)}[node.${field}]`;
    if (getter.when === undefined) {
      return {expression: read};
    }
    // A conditionally-persisted property. The walk tests the default first
    // and then calls the predicate; here the value is already in a local, and
    // the predicate is hoisted so properties that share one call it once.
    return {
      expression: read,
      when: emittable(getter.when, 'when predicate', true),
    };
  }
  return {expression: `node.${emittable(getter, 'getter method')}()`};
}

/**
 * The properties one class's generated exporter reads, in the order the walk
 * writes them.
 *
 * The source is {@link getComposedSchema}'s `fieldsDerivedFirst`, which is what
 * the walk's own table compiles from — not `getComposedSchemaFields`, which
 * also folds in flat NodeState. NodeState is written by `node.__state.toJSON()`
 * and appended by the dispatch, so a state key here would emit a read of an
 * accessor that does not exist.
 *
 * @param {NodeClass} klass
 * @returns {{expression: string, key: string, schema: AnySchema, when?: string}[]}
 */
function schemaReads(klass) {
  const reads = [];
  for (const [key, schema] of getComposedSchema(klass).fieldsDerivedFirst) {
    const read = readExpression(klass, schema, key);
    if (read !== null) {
      reads.push({...read, key, schema});
    }
  }
  return reads;
}

/**
 * The `const` lines a class's exporters open with: one per property whose
 * value a predicate gates (so the value is read once and compared twice), and
 * one per predicate, which is why a predicate shared by several properties is
 * called once rather than once each.
 *
 * The predicate is guarded by the same default comparisons the walk makes
 * before calling it, so an element with nothing to persist — every element
 * with a TextNode child — still never reaches it.
 *
 * That comparison is the one {@link differsFromDefault} states and verifies
 * for the property's default. A gated property whose default it cannot state
 * has no generated form: the compact form can leave such a property to the
 * walk, but the legacy form writes every property, so this refuses rather than
 * emitting a comparison that means something else. No such property exists;
 * the check is here so that declaring one fails the build instead of the
 * round trip.
 *
 * @param {{expression: string, key: string, schema: AnySchema, when?: string}[]} reads
 * @returns {{lines: string[], value: (read: {expression: string, key: string, schema: AnySchema, when?: string}) => string}}
 */
function hoistGatedReads(reads) {
  // Built by hand rather than filtered, so `when` is a string in what follows.
  /** @type {{differs: string, expression: string, key: string, when: string}[]} */
  const gated = [];
  for (const read of reads) {
    if (read.when !== undefined) {
      let differs;
      try {
        differs = differsFromDefault(read.schema, read.key);
      } catch (error) {
        if (!(error instanceof NotCompilable)) {
          throw error;
        }
        throw new Error(
          `generate-node-json: "${read.key}" is gated by ${read.when}() but ${error.message}`,
        );
      }
      gated.push({...read, differs, when: read.when});
    }
  }
  if (gated.length === 0) {
    return {lines: [], value: read => read.expression};
  }
  const lines = gated.map(read => `  const ${read.key} = ${read.expression};`);
  /** @type {Map<string, string>} */
  const differsByKey = new Map();
  /** @type {Map<string, string[]>} */
  const byPredicate = new Map();
  for (const read of gated) {
    differsByKey.set(read.key, read.differs);
    byPredicate.set(read.when, [
      ...(byPredicate.get(read.when) || []),
      read.differs,
    ]);
  }
  for (const [predicate, tests] of byPredicate) {
    lines.push(
      `  const ${predicate} =\n    (${tests.join(' || ')}) && node.${predicate}();`,
    );
  }
  return {
    lines,
    value: read =>
      read.when === undefined
        ? read.expression
        : `${differsByKey.get(read.key)} && ${read.when}\n      ? ${read.key}\n      : undefined`,
  };
}

/**
 * The test that a property's value is not its default, as the compact form
 * (and a gated property) needs it: compiled from the schema's default and
 * verified against the schema's own equality, so what is emitted is what the
 * walk decides. Throws {@link NotCompilable} for a default it cannot state.
 *
 * @param {AnySchema} schema
 * @param {string} name the local holding the value
 * @returns {string}
 */
function differsFromDefault(schema, name) {
  const expression = compileDiffersFromDefault(schema, name);
  verifyDiffersFromDefault({expression, name, schema});
  return expression;
}

/**
 * The compact form of one class's export.
 *
 * The compact form omits a property whose value is the one parsing would
 * restore, a property the parser derives rather than reads, and `version`.
 * Which properties that turns out to be depends on the node's values, but the
 * *rule* does not: each is a comparison against a default the schema states,
 * which is as fixed as the accessor names are. So this generates the same way
 * the legacy form does, and the `compact` argument picks between two
 * straight-line functions rather than branching inside one.
 *
 * Each comparison is the one {@link differsFromDefault} states and verifies
 * for the property's default. A default it cannot state — an object, a
 * non-empty array, a non-finite number — takes the class out of this form
 * only: the generated module simply has no `exportCompactJSON` for it, and
 * the dispatch falls back to the walk per form.
 *
 * @param {NodeClass} klass
 * @returns {null | string}
 */
function generateCompactExport(klass) {
  const writes = [];
  const reads = schemaReads(klass);
  // The same hoist the legacy form uses, so the two call a shared predicate
  // exactly once each and stay byte-identical about what they omit.
  const hoist = hoistGatedReads(
    reads.filter(read => read.schema.setter !== null),
  );
  for (const {expression, key, schema, when} of reads) {
    if (schema.setter === null) {
      // Derived on import, so nothing will read it back: the compact form does
      // not even call the getter to find out what it would have written.
      continue;
    }
    let differs;
    try {
      differs = differsFromDefault(schema, key);
    } catch (error) {
      if (!(error instanceof NotCompilable)) {
        throw error;
      }
      process.stdout.write(
        `${klass.name}: no generated compact export, "${key}" ${error.message}\n`,
      );
      return null;
    }
    // The walk skips an undefined value before it ever looks at the default,
    // and so does this; for a default of `undefined` that is the whole test.
    const test =
      schema.defaultValue === undefined
        ? `${key} !== undefined`
        : `${key} !== undefined && ${differs}`;
    writes.push(
      when === undefined
        ? `  const ${key} = ${expression};\n  if (${test}) {\n    json.${key} = ${key};\n  }`
        : // `${key}` and the predicate are already hoisted above, so this is
          // the same test the legacy form makes plus the compact form's own
          // `!== undefined`, written as a statement. The legacy form has no
          // need of that one: it writes `undefined` into the literal, which
          // stringify omits, where an omitted key is what compaction means.
          `  if (${test} && ${when}) {\n    json.${key} = ${key};\n  }`,
    );
  }
  const isElement = isElementish(klass);
  const header = `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */`;
  // The compact form leads with `type` — it is new, so it can read type-first
  // where the legacy form keeps `type` last — and an element's `children`
  // follows, so the object is allocated on its fixed keys and the rest are
  // added as they pass their comparisons. The walk writes the same order.
  const fixed = `{type: node.__type${isElement ? ', children: []' : ''}}`;
  if (writes.length === 0) {
    // Nothing to compare, so the literal is the whole function — as in
    // generateExport, and for the same reason: an object that lands on its
    // final shape in one allocation beats one built by assignment.
    return `${header}
function exportCompact${klass.name}(node: ${klass.name}): {[key: string]: unknown} {
  return ${fixed};
}`;
  }
  return `${header}
function exportCompact${klass.name}(node: ${klass.name}): {[key: string]: unknown} {
${hoist.lines.length === 0 ? '' : `${hoist.lines.join('\n')}\n`}  const json: {[key: string]: unknown} = ${fixed};
${writes.join('\n')}
  return json;
}`;
}

/**
 * The legacy form of one class's export: a single unconditional literal.
 *
 * `undefined` is allowed in the value position — a getter with nothing to say
 * (ParagraphNode's `getSerializedTextFormat` on a default paragraph) puts
 * `undefined` there rather than omitting the key. JSON.stringify omits an
 * undefined-valued property, so the serialized bytes are identical, and the
 * object shape is the one the hand-written exporters always had: main's
 * ListItemNode writes `checked: this.getChecked()` on every non-checklist
 * item, and TableNode writes `colWidths: undefined` by explicit ternary. One
 * literal also means one object shape per class, and no guarded fast path
 * with an incremental fallback to keep in agreement with it. The walk writes
 * unconditionally too, so the two stay key-for-key identical.
 *
 * @param {NodeClass} klass
 * @returns {string}
 */
function generateExport(klass) {
  const reads = schemaReads(klass);
  // An element's JSON leads with `children`, which is structural rather than
  // schema-declared: the key order below is byte-identical to the walk's.
  const isElement = isElementish(klass);
  const hoist = hoistGatedReads(reads);
  // `type` is read off the node rather than baked in as the literal the class
  // registered under: the same code serves a subclass whose accessor tables
  // compile the same way, and its type is not this one's.
  const entries = [
    ...(isElement ? ['children: []'] : []),
    ...reads.map(read => `${read.key}: ${hoist.value(read)}`),
    'type: node.__type',
    'version: 1',
  ];
  return `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */
function export${klass.name}(node: ${klass.name}): {[key: string]: unknown} {
${hoist.lines.length === 0 ? '' : `${hoist.lines.join('\n')}\n`}  return {
    ${entries.join(',\n    ')},
  };
}`;
}

/**
 * The copy half of one class's `afterCloneFrom`, or `null` for a class whose
 * own `$config` declares no field to copy.
 *
 * Only the fields this class carries: the synthesized method delegates the rest
 * to its superclass, the way a hand-written one delegates through `super`, so
 * what is emitted here is one class's own storage and nothing above it. A field
 * an ancestor declares too belongs to the ancestor, whose `afterCloneFrom` has
 * already assigned it by the time this runs — which is why TabNode, whose
 * `text`/`detail`/`mode` restate TextNode's, gets no function at all.
 *
 * `ownSchemaFields` reads the declared field rather than the accessor
 * {@link resolveGetterAccessor} would resolve to. A clone carries storage
 * rather than serializing it, so an override that sends the export through a
 * method changes nothing about where the value lives, and a property declared
 * through accessor methods on both sides names no storage at all and is left
 * to the class — which is why MarkNode, whose `ids` is `getIDs`/`setIDs`,
 * still writes its own.
 *
 * @param {NodeClass} klass
 * @returns {null | string}
 */
function generateAfterCloneFrom(klass) {
  // The same list the synthesized method walks, from the same function, so the
  // generated form cannot copy a different set than the fallback would.
  const fields = ownSchemaFields(klass);
  if (fields.length === 0) {
    return null;
  }
  return `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */
function afterClone${klass.name}(node: ${klass.name}, prevNode: ${klass.name}): void {
${fields
  .map(field => {
    const name = emittable(field, 'schema field');
    return `  node.${name} = prevNode.${name};`;
  })
  .join('\n')}
}`;
}

/**
 * Whether a class extends ElementNode, and so leads its JSON with `children`.
 *
 * By name rather than by `instanceof` the imported class, so this stays a plain
 * walk of the constructor chain with nothing else to keep in sync.
 *
 * @param {unknown} klass
 * @returns {boolean}
 */
function isElementish(klass) {
  for (let proto = klass; proto; proto = Object.getPrototypeOf(proto)) {
    if (/** @type {{name?: string}} */ (proto).name === 'ElementNode') {
      return true;
    }
  }
  return false;
}

// -- the import direction ----------------------------------------------------

/**
 * Compile one property's parse, then prove it agrees with the schema.
 *
 * The proof runs the compiled expression rather than the emitted statements, so
 * what is verified is the expression the statements assign. The `encode` table
 * a property may end with is applied to the schema's own result instead, which
 * is what makes the two comparable without wrapping the expression in a closure
 * that the emitted code does not have.
 *
 * @param {NodeClass} klass
 * @param {AnySchema} schema
 * @param {string} key
 * @returns {{key: string, needsSelf: boolean, statements: string}}
 */
function writeExpression(klass, schema, key) {
  if (key in Object.prototype) {
    // The walk reads a property with hasOwn because its JSON came from
    // JSON.parse and so inherits Object.prototype; `json.toString` in
    // straight-line code would find the method rather than nothing. Refused
    // rather than guarded because no generated class has such a key, and the
    // verification compares values, so it would not notice.
    throw new NotCompilable(`"${key}" is also an Object.prototype member`);
  }
  emittable(key, 'schema key');
  const setter = resolveSetterAccessor(klass, key, schema);
  if (setter === null) {
    throw new NotCompilable(`"${key}" is export-only`);
  }
  const {expression, tables: parseTables} = compileParse(
    schema.meta,
    schema.defaultValue,
    tableName(klass, key, 'ALIAS'),
  );
  const nullPrototypeTables = parseTables.map(({name}) => name);
  for (const {name, table} of parseTables) {
    // Recorded under the name the compiler already wrote into `expression`,
    // so these are not shared the way addTable shares a schema's own tables.
    tables.set(name, table);
  }
  if (!isSchemaField(setter)) {
    // Applied through a method: call it and follow what it returns, which is
    // the rule $applyJSONSetters uses. A `void` setter has already mutated
    // through getWritable(), so a nullish return means unchanged.
    try {
      verifyCompiledParse({
        expression,
        nullPrototypeTables,
        schema,
        tables: parseTables,
      });
    } catch (error) {
      throw error instanceof NotCompilable
        ? new NotCompilable(`"${key}" ${error.message}`)
        : error;
    }
    return {
      key,
      needsSelf: true,
      statements: `  v = json.${key};\n  n = self.${emittable(setter, 'setter method')}(${expression});\n  self = (n || self) as ${klass.name};`,
    };
  }
  const {encode} = setter;
  // Two statements rather than one expression when a table has to be applied
  // after parsing: folding them together needs an IIFE, and a closure per
  // property per node is most of what generating this was meant to remove.
  const setterField = emittable(setter.field, 'setter field');
  let statements = `  v = json.${key};\n  self.${setterField} = ${expression};`;
  if (encode !== undefined) {
    const name = addTable(tableName(klass, key, 'ENCODE'), encode);
    nullPrototypeTables.push(name);
    // The schema already reduced the value to its own domain, so the table is
    // total over what reaches it; the guard is for a domain member with no
    // stored form, which would otherwise write undefined into the field.
    const fallback = literal(
      encode[/** @type {string} */ (schema.defaultValue)],
    );
    const lookup = `(v as string) in ${name} ? ${name}[v as string] : ${fallback}`;
    statements = `  v = json.${key};\n  v = ${expression};\n  self.${setterField} = ${lookup};`;
  }
  try {
    verifyCompiledParse({
      expression,
      nullPrototypeTables,
      schema,
      tables: parseTables,
    });
    if (encode !== undefined) {
      // The lookup above falls back for a key that is missing, so the table has
      // to have none: proving it total is what makes that fallback dead code
      // rather than a silent remapping.
      verifyTableCoversDomain({schema, table: encode});
    }
  } catch (error) {
    throw error instanceof NotCompilable
      ? new NotCompilable(`"${key}" ${error.message}`)
      : error;
  }
  return {key, needsSelf: false, statements};
}

/**
 * The import direction of one class's schema, or `null` for a class the
 * generator cannot compile faithfully.
 *
 * Fields only. A flat NodeState the class carries is applied by
 * `$applyJSONSetters` before it hands the node to this parser — the mirror of
 * the export side, where the dispatch appends `__state.toJSON()` around the
 * generated literal — so what a node carries in state, which is not known when
 * this is generated, never has to be.
 *
 * @param {NodeClass} klass
 * @returns {null | string}
 */
function generateUpdate(klass) {
  const {fieldsBaseFirst} = getComposedSchema(klass);
  const writes = [];
  for (const [key, schema] of fieldsBaseFirst) {
    try {
      writes.push(writeExpression(klass, schema, key));
    } catch (error) {
      if (!(error instanceof NotCompilable)) {
        throw error;
      }
      process.stdout.write(
        `${klass.name}: no generated parser, ${error.message}\n`,
      );
      return null;
    }
  }
  if (writes.length === 0) {
    return null;
  }
  const body = writes.map(({statements}) => statements).join('\n');
  // `self` and `n` only when a property is applied through a method: a setter
  // may return a different node, and the rest of the schema goes to whichever
  // one it returned. An all-fields class writes to `node` throughout and needs
  // neither binding.
  const needsSelf = writes.some(write => write.needsSelf);
  const locals = needsSelf
    ? `  let self = node;\n  let n: unknown;\n  let v: unknown;`
    : `  let v: unknown;`;
  return `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */
function update${klass.name}(
  node: ${klass.name},
  json: {readonly [key: string]: unknown},
): ${klass.name} {
${locals}
${needsSelf ? body : body.replace(/\bself\./g, 'node.')}
  return ${needsSelf ? 'self' : 'node'};
}`;
}

// -- emit --------------------------------------------------------------------

/**
 * The value type to give a lookup table.
 *
 * The union of its literal values when there are few enough to read, because a
 * node field is often narrower than `number` — TextNode's `__mode` is
 * `0 | 1 | 2 | 3` — and a table typed `number` would not be assignable to it.
 *
 * @param {{readonly [key: string]: unknown}} table
 * @returns {string}
 */
function tableValueType(table) {
  const values = Object.values(table);
  const distinct = [...new Set(values.map(v => JSON.stringify(v)))].sort();
  return distinct.length <= 8 ? distinct.join(' | ') : typeof values[0];
}

/**
 * One package's generated module.
 *
 * @param {(typeof PACKAGES)[number]} pkg
 * @returns {string}
 */
function generatePackage(pkg) {
  tables.clear();
  tableNames.clear();
  // Every class is exportable: the base `exportJSON` writes exactly the
  // schema's properties plus type/version, and NodeState is appended by the
  // dispatch. A class that overrides `exportJSON` for output no schema
  // describes — ParagraphNode and its #7971 textFormat/textStyle back-fill —
  // still composes, because the override's `super.exportJSON(compact)` is what
  // reaches the generated literal.
  const generated = pkg.targets.map(({klass}) => {
    try {
      return {
        afterCloneFrom: generateAfterCloneFrom(klass),
        compact: generateCompactExport(klass),
        exportJSON: generateExport(klass),
        klass,
        updateFromJSON: generateUpdate(klass),
      };
    } catch (error) {
      // The forms that have a fallback catch NotCompilable themselves and
      // return null; one that reaches here is from a form that has none — the
      // legacy export, or a name that cannot be written into the output at all
      // — so it fails the build, named for the class whose schema caused it.
      if (error instanceof NotCompilable) {
        throw new Error(`generate-node-json: ${klass.name}: ${error.message}`);
      }
      throw error;
    }
  });

  const tableSource = [...tables]
    .map(
      ([name, table]) =>
        `// Null-prototype: a key the table does not have must miss rather than\n// resolve to Object.prototype.\nconst ${name}: {readonly [key: string]: ${tableValueType(
          table,
        )}} =\n  /* @__PURE__ */ Object.assign(Object.create(null), ${JSON.stringify(
          table,
          null,
          2,
        )});`,
    )
    .join('\n\n');

  // `numC` calls `num`, so a constrained domain needs both.
  const needsNumC = generated.some(
    g => g.updateFromJSON !== null && g.updateFromJSON.includes('numC('),
  );
  const needsNum =
    needsNumC ||
    generated.some(
      g => g.updateFromJSON !== null && g.updateFromJSON.includes('num('),
    );

  /** Class names by the module that declares them. @type {Map<string, Set<string>>} */
  const typeImports = new Map();
  for (const {klass, module} of pkg.targets) {
    const names = typeImports.get(module) || new Set();
    names.add(klass.name);
    typeImports.set(module, names);
  }
  // Type-only, so this module has no runtime imports at all. A value import
  // of the node classes would be a cycle — they import LexicalNode, which
  // imports this — and would evaluate a class before its base was
  // initialized. This repo's simple-import-sort config keeps every type
  // import in one group ordered by specifier, so these are emitted the same
  // way: one line per module, sorted, no blank lines between.
  if (pkg.home) {
    typeImports.set('./LexicalNode', new Set(['LexicalNode']));
  } else {
    typeImports.set('lexical', new Set(['GeneratedJSON']));
  }
  const importLines = [...typeImports]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(
      ([module, names]) =>
        `import type {${[...names].sort().join(', ')}} from '${module}';`,
    );

  const pieces = [];
  for (const {
    afterCloneFrom,
    compact,
    exportJSON,
    klass,
    updateFromJSON,
  } of generated) {
    pieces.push(exportJSON);
    if (compact !== null) {
      pieces.push(compact);
    }
    if (updateFromJSON !== null) {
      pieces.push(updateFromJSON);
    }
    if (afterCloneFrom !== null) {
      pieces.push(afterCloneFrom);
    }
    pieces.push(
      `/** ${klass.name}'s generated implementations, for its \`$config\`. @internal */\nexport const ${constName(klass)}: GeneratedJSON = {\n  exportJSON: export${klass.name},${
        compact === null
          ? ''
          : `\n  exportCompactJSON: exportCompact${klass.name},`
      }${
        updateFromJSON === null
          ? ''
          : `\n  updateFromJSON: update${klass.name},`
      }${
        afterCloneFrom === null
          ? ''
          : `\n  afterCloneFrom: afterClone${klass.name},`
      }\n};`,
    );
  }

  return `${HEADER}
${importLines.join('\n')}
${pkg.home ? `\n${INTERFACE_SOURCE}\n` : ''}${
    needsNum
      ? `
// The JSON number grammar, anchored, matching numberValue: \`Number()\` alone
// reads '0x10' as 16 and '' as 0, and neither is a shape a JSON encoder
// produces. Emitted from the same source the codegen verified against, so the
// two cannot be different functions.
${NUM_HELPER_SOURCE}
${needsNumC ? `\n${NUM_RANGE_HELPER_SOURCE}\n` : ''}`
      : ''
  }${tableSource ? `\n${tableSource}\n` : ''}
${pieces.join('\n\n')}
`;
}

/**
 * Generate every module in {@link MANIFEST}, in place under the repo, or —
 * given `outDir` — under it with the repo-relative layout preserved and a
 * `manifest.json` listing every file written, which is how the drift check
 * regenerates without touching the modules other test workers are importing.
 *
 * Each file is formatted with the repo's prettier config, named explicitly
 * rather than resolved from the output's directory so the output is the same
 * wherever it is written: the checked-in files are both prettier-clean and
 * exactly what a regeneration produces, and the drift check compares them byte
 * for byte.
 *
 * @param {null | string} outDir
 * @returns {{path: string, target: string}[]} what was written, as
 *   repo-relative paths and the files they went to
 */
export function generateNodeJSON(outDir) {
  /** @param {string} repoRelative @returns {string} */
  const outPath = repoRelative => {
    const target =
      outDir === null ? join(REPO, repoRelative) : join(outDir, repoRelative);
    mkdirSync(dirname(target), {recursive: true});
    return target;
  };
  // Generating exactly what the CLI's first phase stubbed, or a future edit to
  // one list silently ships a stub.
  if (PACKAGES.length !== MANIFEST.length) {
    throw new Error('generate-node-json: PACKAGES and MANIFEST disagree');
  }
  const configPath = join(REPO, '.prettierrc');
  const prettierConfig = prettier.resolveConfig(configPath, {
    config: configPath,
  });
  /** @type {{path: string, target: string}[]} */
  const written = [];
  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const manifest = MANIFEST[i];
    if (pkg.file !== manifest.file) {
      throw new Error(
        `generate-node-json: manifest order mismatch ${pkg.file}`,
      );
    }
    const source = generatePackage(pkg);
    const expected = [...manifest.entries].sort();
    const emitted = pkg.targets.map(({klass}) => constName(klass)).sort();
    if (JSON.stringify(expected) !== JSON.stringify(emitted)) {
      throw new Error(
        `generate-node-json: ${pkg.file} emits [${emitted}] but the manifest stubs [${expected}]; update MANIFEST (and the $config wiring) together`,
      );
    }
    const target = outPath(pkg.file);
    writeFileSync(
      target,
      prettier.format(source, {...prettierConfig, filepath: target}),
    );
    written.push({path: pkg.file, target});
  }
  if (outDir !== null) {
    writeFileSync(
      join(outDir, 'manifest.json'),
      JSON.stringify(
        written.map(w => w.path),
        null,
        2,
      ),
    );
  }
  return written;
}
