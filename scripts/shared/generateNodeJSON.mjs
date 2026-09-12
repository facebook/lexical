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
 * where it cannot be stated the property is simply written rather than
 * omitted — the omission is the optimization, and one property that cannot
 * justify it should not cost its siblings theirs.
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
const {
  ElementNode,
  isSchemaField,
  LineBreakNode,
  ParagraphNode,
  TabNode,
  TextNode,
} = await import('lexical');
// All three are `@internal` — how a class composes its schema and which accessor a
// field stands in for are this codegen's concern and the walk's, not a public
// API to be frozen by the backwards-compatibility rule — so they are reached
// through the module that declares them rather than the package entry point.
// `paths` maps `lexical/src/*` the same way it maps `lexical`, so this is the
// same module instance the editor uses, not a second copy.
//
// Resolved together: `lexical` above is what the rest transitively need
// registered, and these five do not depend on one another, so awaiting them in
// series made this preamble cost the sum of five TypeScript transforms rather
// than the longest.
const [
  {
    getComposedSchema,
    ownSchemaFields,
    resolveGetterAccessor,
    resolveSetterAccessor,
  },
  {declaredAccepts},
  {HeadingNode, QuoteNode},
  {AutoLinkNode, LinkNode},
  {MarkNode},
] = await Promise.all([
  import('lexical/src/LexicalUtils'),
  import('lexical/src/LexicalSchema'),
  import('@lexical/rich-text'),
  import('@lexical/link'),
  import('@lexical/mark'),
]);

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
 * The lookup tables the class being generated reads, by the local name its
 * code refers to each by, each mapped to the declaration that binds it: a
 * read off the class's composed schema, which the factory emitted for the
 * class is handed when its code is attached. Reset per class by
 * {@link generatePackage}.
 *
 * Nothing about a table's contents is written into the module: the table the
 * generated code reads is the schema's own object, so the two cannot differ,
 * and a value JSON has no spelling for — `undefined`, `Infinity` — is no
 * concern of the generator's. What the module states is the table's *type*,
 * so the field a value is assigned to is checked as it would be for a
 * hand-written table.
 *
 * Every table is null-prototype, because every table can be reached by a key
 * it does not have: without it a `'toString'` would resolve to
 * Object.prototype's method rather than missing, and be stored (import) or
 * serialized (export) as the property's value. The helper each local is
 * bound through hands back a null-prototype copy of the schema's object, so
 * the `in` tests the compiled expressions use ask the same question the
 * walk's `hasOwnKey` asks of the original.
 *
 * @type {Map<string, string>}
 */
const tableLocals = new Map();

/**
 * Bind a lookup table to a local name in the class being generated, refusing
 * to bind two different declarations to one name.
 *
 * Names are derived by upper-casing the class and property, which is not
 * injective — `textFormat` and `textformat` produce the same name. Without
 * this the second binding would replace the first under a name the class's
 * emitted code is already reading, which no amount of verification downstream
 * would catch: the class compiles, and one property silently decodes through
 * the other's table.
 *
 * Exported for `generateNodeJSON.test.ts`, which is the only place the
 * collision can be provoked: the checked-in manifest has none.
 *
 * @param {string} name
 * @param {string} declaration the expression the local is bound to
 * @returns {string} `name`
 */
export function declareTable(name, declaration) {
  const existing = tableLocals.get(name);
  if (existing !== undefined && existing !== declaration) {
    throw new Error(
      `generate-node-json: two different lookup tables both want the name ${name}; rename one of the properties it was derived from`,
    );
  }
  tableLocals.set(name, declaration);
  return name;
}

/**
 * The locals the forms generated since the last class began have bound, as
 * `[name, declaration]` pairs — what {@link generatePackage} reads after a
 * class's four forms. Exported for `generateNodeJSON.test.ts`, which
 * assembles one class's factory body the same way to run its parser.
 *
 * @returns {[string, string][]}
 */
export function tableDeclarations() {
  return [...tableLocals];
}

/**
 * Begin a class: forget the locals the previous one bound. What
 * {@link generatePackage} does before each class's four forms; exported for
 * the test that assembles a factory body by hand, since the forms it calls
 * bind into the same registry as every class generated before them.
 */
export function resetTableLocals() {
  tableLocals.clear();
}

/**
 * The declaration that binds one of a property's lookup tables: a read off
 * the composed schema through the `lexical` helper for its kind, asserted to
 * the union of the table's literal values, since the helper can only say
 * `unknown` and the field the value is assigned to is narrower.
 *
 * Exported for `generateNodeJSON.test.ts`: which tables the checked-in
 * modules bind is decided by the manifest classes, so a value shape none of
 * them uses can only be driven through here.
 *
 * `encodedDefault` is the one value read rather than a table: the stored form
 * of the schema's default, which the parser stores for a key the encode
 * table does not map, asserted to the same union as the table's values since
 * it is one of them.
 *
 * @param {'decode' | 'encode' | 'alias' | 'encodedDefault'} kind
 * @param {string} key the schema property
 * @param {{readonly [key: string]: unknown}} table
 * @param {number} [index] which alias table, outermost first
 * @returns {string}
 */
export function tableDeclaration(kind, key, table, index) {
  const args = [JSON.stringify(key), ...(index === undefined ? [] : [index])];
  const type = tableValueType(table);
  return kind === 'encodedDefault'
    ? `encodedDefaultOf(fields, ${args.join(', ')}) as ${type}`
    : `${kind}TableOf(fields, ${args.join(', ')}) as {readonly [key: string]: ${type}}`;
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

/**
 * The parameter a compact exporter takes its run-time comparisons through; see
 * {@link generateCompactExport}.
 */
const COMPACT_DEFAULT_PARAM = 'isCompactDefault';

// The names the emitted functions bind themselves. A property named for one of
// these would shadow it — `const node = node.__node` — and is refused rather
// than renamed, so that what the generated code calls a thing is always what
// the schema called it.
const EMITTED_LOCALS = new Set([
  COMPACT_DEFAULT_PARAM,
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
 * @param {Set<string>} [alsoBound] further names the generated code binds in
 *   the same scope — a class's schema keys, for a `when` predicate
 * @returns {string} the name, so this can wrap an interpolation
 */
export function emittable(name, what, binds = false, alsoBound) {
  if (!IDENTIFIER.test(name)) {
    throw new NotCompilable(
      `${what} ${JSON.stringify(name)} is not a plain identifier`,
    );
  }
  if (
    binds &&
    (RESERVED.has(name) ||
      EMITTED_LOCALS.has(name) ||
      (alsoBound !== undefined && alsoBound.has(name)))
  ) {
    throw new NotCompilable(
      `${what} ${JSON.stringify(name)} collides with a name the generated code binds`,
    );
  }
  return name;
}

/**
 * Every schema key of `klass`, which the compact exporter binds as a local.
 *
 * @param {NodeClass} klass
 * @returns {Set<string>}
 */
function schemaKeysOf(klass) {
  return new Set(getComposedSchema(klass).fieldsBaseFirst.map(([key]) => key));
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
        : // Read through the local the factory binds to the schema's own
          // table; see `tableLocals`.
          `${declareTable(
            tableName(klass, key, 'DECODE'),
            tableDeclaration('decode', key, getter.decode),
          )}[node.${field}]`;
    if (getter.when === undefined) {
      return {expression: read};
    }
    // A conditionally-persisted property. The walk tests the default first
    // and then calls the predicate; here the value is already in a local, and
    // the predicate is hoisted so properties that share one call it once.
    return {
      expression: read,
      // Checked against the schema's own keys as well as the fixed locals: the
      // compact exporter binds `const <key>` for every property and
      // `hoistGatedReads` binds `const <predicate>` in the same scope, so a
      // predicate sharing a sibling's name emits two `const`s and a module
      // that does not parse — reported against generated code rather than
      // against the schema that caused it, which is the failure `EMITTED_LOCALS`
      // and `claimTableName` exist to prevent for the other name spaces.
      when: emittable(getter.when, 'when predicate', true, schemaKeysOf(klass)),
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
 * non-empty array, a non-finite number, or a literal the schema compares with
 * an equality of its own — gets `isCompactDefault(key, value)` instead, the
 * running class's own omission test, handed in by the dispatch. So the schema
 * still decides, at the one point where the schema and this code are both in
 * hand, and this form omits exactly what the walk omits.
 *
 * Passed in rather than reached for, which is the whole reason a schema was
 * ever thought unavailable here: looking one up would mean importing the node
 * class, and that is a cycle. Nothing about the schema needs importing when
 * the caller already holds it.
 *
 * The alternative was to drop the class from this form over one such property,
 * which cost every *other* property its generated code and read as a silent
 * fallback to the walk.
 *
 * Exported for `generateNodeJSON.test.ts`, like {@link emittable}: no manifest
 * class has such a property, so the checked-in output does not show what
 * happens for one.
 *
 * @param {NodeClass} klass
 * @returns {string}
 */
export function generateCompactExport(klass) {
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
    // The walk skips an undefined value before it ever looks at the default,
    // and so does this; for a default of `undefined` that is the whole test,
    // which is why the comparison is only reached when there is a default to
    // compare against.
    let test = `${key} !== undefined`;
    if (schema.defaultValue !== undefined) {
      try {
        test = `${test} && ${differsFromDefault(schema, key)}`;
      } catch (error) {
        if (!(error instanceof NotCompilable)) {
          throw error;
        }
        // Not statable as source, so the schema answers at run time instead —
        // see this function's docblock. Reported because the output alone does
        // not say which properties took this route.
        process.stdout.write(
          `${klass.name}: compact export compares "${key}" at run time, which ${error.message}\n`,
        );
        test = `${test} && !${COMPACT_DEFAULT_PARAM}(${JSON.stringify(
          key,
        )}, ${key})`;
      }
    }
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
  const body = writes.join('\n');
  // Declared only where a property compares through it, so an exporter whose
  // every comparison is source keeps the one-parameter shape it always had.
  const params = body.includes(`${COMPACT_DEFAULT_PARAM}(`)
    ? `\n  node: ${klass.name},\n  ${COMPACT_DEFAULT_PARAM}: CompactDefaultTest,\n`
    : `node: ${klass.name}`;
  return `${header}
function exportCompact${klass.name}(${params}): {[key: string]: unknown} {
${hoist.lines.length === 0 ? '' : `${hoist.lines.join('\n')}\n`}  const json: {[key: string]: unknown} = ${fixed};
${body}
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
  // `prototype instanceof`, not a walk comparing `name`: a minified or
  // duplicated class answers to a different name, and any class a user happens
  // to call `ElementNode` answered to that one.
  return (
    klass === ElementNode ||
    /** @type {{prototype: object}} */ (klass).prototype instanceof ElementNode
  );
}

// -- the import direction ----------------------------------------------------

/**
 * The first schema in `schema`'s tree whose author installed a membership
 * predicate, or `null` where none does.
 *
 * The whole tree, not just the outermost schema: `compileParse` recurses
 * through the metadata — `aliasedValue` compiles by compiling its inner schema
 * — and a wrapper derives its own predicate, so asking only the top let
 * `aliasedValue(narrowed, {...})` through and compiled the inner *combinator's*
 * parse. The emitted parser then kept a value the schema itself declines, and
 * `verifyCompiledParse` agreed, because its corpus is derived from the same
 * metadata that cannot see the narrowing.
 *
 * @param {AnySchema} schema
 * @returns {null | AnySchema}
 */
function narrowedSchema(schema) {
  if (declaredAccepts(schema) !== undefined) {
    return schema;
  }
  const meta = schema.meta;
  if (meta == null) {
    return null;
  }
  const nested = [
    ...('inner' in meta && meta.inner ? [meta.inner] : []),
    ...('item' in meta && meta.item ? [meta.item] : []),
    ...(('members' in meta && meta.members) || []),
    ...('fields' in meta && meta.fields ? Object.values(meta.fields) : []),
  ];
  for (const inner of nested) {
    const found = narrowedSchema(inner);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

/**
 * The read of one serialized property: the own-key read the schema-driven walk
 * makes (`hasOwnKey`), so a key the object only *inherits* — a polluted
 * `Object.prototype`, or a caller layering a partial update over a defaults
 * object with `Object.create` — is absent to the generated parser too, rather
 * than a value the walk treats as unset.
 *
 * Inline at each site, with the key a literal, rather than through a shared
 * `own(json, key)` helper. The helper's one `json[key]` served every key of
 * every node type and so could never stay monomorphic — measured at 5-12x the
 * cost of the bare read per node (TextNode 17 → 113 ns) — while the same test
 * written out here keeps each read's own inline cache, which is what this
 * generator exists to produce.
 *
 * @param {string} key
 * @returns {string} an expression over `json`
 */
function ownRead(key) {
  const keyLiteral = JSON.stringify(key);
  // Dot access where the key allows it, which is every key today (the compact
  // exporter binds `const <key>`, so a key that is not an identifier is
  // refused before this); the element form is only for a key that is not.
  const access = /^[A-Za-z_$][\w$]*$/.test(key)
    ? `json.${key}`
    : `json[${keyLiteral}]`;
  return `Object.prototype.hasOwnProperty.call(json, ${keyLiteral}) ? ${access} : undefined`;
}

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
 * @param {string} target the variable the statements assign through — `self`
 *   where a setter may hand back a different node, `node` otherwise. Chosen by
 *   the caller and emitted here rather than rewritten afterwards; see
 *   {@link generateUpdate}.
 * @returns {null | {key: string, needsSelf: boolean, statements: string}} `null`
 *   for a property with nothing to apply, which is what an export-only one has.
 */
function writeExpression(klass, schema, key, target) {
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
    // Declared export-only: the value is derived from other properties on the
    // way in (ListNode's `tag` follows from `listType`). `compileSetters`
    // skips such a property, so the generated parser has nothing to emit for
    // it and `null` says so. Throwing `NotCompilable` here said the *class*
    // could not be compiled, which cost TabNode its parser over `detail`,
    // `mode` and `text` while the `format` and `style` it inherits compile
    // fine — and would cost the same to any node with a derived property.
    return null;
  }
  if (narrowedSchema(schema) !== null) {
    // The compiler reads `meta` alone, and a predicate the schema's author
    // installed describes a domain no metadata records — so what it would emit
    // is the combinator's parse, not this schema's. `verifyCompiledParse`
    // samples a fixed corpus and would pass whenever the narrowing rejects
    // nothing the corpus happens to contain, so this refuses outright rather
    // than relying on it.
    throw new NotCompilable(
      `"${key}" declares a membership predicate of its own, which the metadata does not describe`,
    );
  }
  // Each alias table the parse reads is bound to a local of the class's
  // factory, numbered outermost first — the order `compileParse` meets them,
  // which is the order `aliasTableOf` counts.
  const {expression, tables: parseTables} = compileParse(
    schema.meta,
    schema.defaultValue,
    (table, index) =>
      declareTable(
        tableName(klass, key, index === 0 ? 'ALIAS' : `ALIAS_${index + 1}`),
        tableDeclaration('alias', key, table, index),
      ),
  );
  const nullPrototypeTables = parseTables.map(({name}) => name);
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
      statements: `  v = ${ownRead(key)};\n  n = ${target}.${emittable(setter, 'setter method')}(${expression});\n  ${target} = (n ?? ${target}) as ${klass.name};`,
    };
  }
  const {encode} = setter;
  // Two statements rather than one expression when a table has to be applied
  // after parsing: folding them together needs an IIFE, and a closure per
  // property per node is most of what generating this was meant to remove.
  const setterField = emittable(setter.field, 'setter field');
  let statements = `  v = ${ownRead(key)};\n  ${target}.${setterField} = ${expression};`;
  if (encode !== undefined) {
    const name = declareTable(
      tableName(klass, key, 'ENCODE'),
      tableDeclaration('encode', key, encode),
    );
    nullPrototypeTables.push(name);
    // The schema already reduced the value to its own domain, and
    // `verifyTableCoversDomain` below checks the table against it — but only
    // an enum's domain is enumerable; a bounded numeric one is sampled, and a
    // member the corpus did not reach can miss the table at run time. The
    // walk stores the encoded default for such a miss, so the parser does
    // too: the stored form of the schema's default, read off the schema when
    // the code is attached like the table itself, never written into the
    // module — read bare, the parser stored `undefined` where the walk stored
    // the default.
    const fallback = declareTable(
      tableName(klass, key, 'ENCODE_DEFAULT'),
      tableDeclaration('encodedDefault', key, encode),
    );
    const lookup = `(v as string) in ${name} ? ${name}[v as string] : ${fallback}`;
    statements = `  v = ${ownRead(key)};\n  v = ${expression};\n  ${target}.${setterField} = ${lookup};`;
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
 * Exported for `generateNodeJSON.test.ts`, like {@link emittable}: which
 * properties take a class out of this form is not visible in the checked-in
 * output, since a class that loses it silently falls back to the walk.
 *
 * @param {NodeClass} klass
 * @returns {null | string}
 */
export function generateUpdate(klass) {
  const {fieldsBaseFirst} = getComposedSchema(klass);
  const writes = [];
  for (const [key, schema] of fieldsBaseFirst) {
    try {
      const write = writeExpression(klass, schema, key, 'self');
      // `null` is "nothing to apply for this property", not "give up on the
      // class" — see `writeExpression`.
      if (write !== null) {
        writes.push(write);
      }
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
  // `self` and `n` only when a property is applied through a method: a setter
  // may return a different node, and the rest of the schema goes to whichever
  // one it returned. An all-fields class writes to `node` throughout and needs
  // neither binding.
  //
  // The name is chosen here and the statements are emitted again with it,
  // rather than emitted against `self` and rewritten to `node` afterwards. A
  // text rewrite is not lexically aware, so `\bself\.` also matched inside an
  // emitted string: a `stringValue('self.postMessage("ready")')` default, or
  // an `enumValue(['self.start'])` member, came out as `node.postMessage(...)`
  // — and because the rewrite ran after `verifyCompiledParse`, the check that
  // exists to catch a parser disagreeing with its schema could not see it.
  const needsSelf = writes.some(write => write.needsSelf);
  const target = needsSelf ? 'self' : 'node';
  const body = (
    needsSelf
      ? writes
      : fieldsBaseFirst.flatMap(([key, schema]) => {
          const write = writeExpression(klass, schema, key, target);
          return write === null ? [] : [write];
        })
  )
    .map(({statements}) => statements)
    .join('\n');
  const locals = needsSelf
    ? `  let self = node;\n  let n: unknown;\n  let v: unknown;`
    : `  let v: unknown;`;
  return `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */
function update${klass.name}(
  node: ${klass.name},
  json: {readonly [key: string]: unknown},
): ${klass.name} {
${locals}
${body}
  return ${target};
}`;
}

// -- emit --------------------------------------------------------------------

/**
 * The value type to give a lookup table: the union of its literal values,
 * however many there are.
 *
 * An encode table's value is assigned to the node's field, and a field is
 * often narrower than its primitive — TextNode's `__mode` is `0 | 1 | 2 | 3`
 * — so a table typed `number` is not assignable to it. Widening past a
 * readable size, as this once did, made the generated parser of a node with
 * nine modes fail to compile while the node and its schema type-checked; a
 * long union costs nothing but width in a file nobody edits.
 *
 * @param {{readonly [key: string]: unknown}} table
 * @returns {string}
 */
function tableValueType(table) {
  const values = [...new Set(Object.values(table))];
  // Finite numbers in numeric order, then `number` if any is not finite, then
  // everything else in text order, so a bitmask table reads `1 | 2 | 4 | 8`
  // rather than `1 | 16 | 2 | 4`. Deduplicated again as spellings: the values
  // `-0` and `0` are one type.
  const finite = values
    .filter(v => typeof v === 'number' && Number.isFinite(v))
    .map(Number)
    .sort((a, b) => a - b)
    .map(tableType);
  const wide = values.some(v => typeof v === 'number' && !Number.isFinite(v))
    ? ['number']
    : [];
  const rest = values
    .filter(v => typeof v !== 'number')
    .map(tableType)
    .sort();
  const members = [...new Set([...finite, ...wide, ...rest])];
  // An empty table — `aliasedValue(numberValue(), {})` is a valid schema —
  // has an empty union, which spelled as nothing left the module no type at
  // all: `never`, the union of no members, is the type that maps to nothing.
  return members.length === 0 ? 'never' : members.join(' | ');
}

/**
 * One table value as a type: its literal, with the two shapes JSON cannot
 * spell handled as types rather than values. A decode table may map a stored
 * value to `undefined` — that is how a stored value whose serialized form is
 * the omitted default is spelled, `{0: undefined, 1: 'special'}` — which is
 * the type `undefined`; a number JSON cannot spell (`Infinity`, `NaN`) is no
 * literal type either and is `number`, and `-0` is the type `0`. The values
 * themselves are never written into a module: the generated code reads the
 * schema's own table.
 *
 * @param {unknown} value
 * @returns {string}
 */
function tableType(value) {
  if (value === undefined) {
    return 'undefined';
  }
  return typeof value === 'number' && !Number.isFinite(value)
    ? 'number'
    : JSON.stringify(value);
}

/**
 * One package's generated module.
 *
 * @param {(typeof PACKAGES)[number]} pkg
 * @returns {string}
 */
function generatePackage(pkg) {
  // Every class is exportable: the base `exportJSON` writes exactly the
  // schema's properties plus type/version, and NodeState is appended by the
  // dispatch. A class that overrides `exportJSON` for output no schema
  // describes — ParagraphNode and its #7971 textFormat/textStyle back-fill —
  // still composes, because the override's `super.exportJSON(compact)` is what
  // reaches the generated literal.
  const generated = pkg.targets.map(({klass}) => {
    // The tables a class reads are bound in its own factory, so each class
    // starts from none and takes what its four forms declared.
    resetTableLocals();
    try {
      const afterCloneFrom = generateAfterCloneFrom(klass);
      const compact = generateCompactExport(klass);
      const exportJSON = generateExport(klass);
      const updateFromJSON = generateUpdate(klass);
      return {
        afterCloneFrom,
        compact,
        exportJSON,
        klass,
        // After all four forms, since the parser declares tables of its own.
        tables: [...tableLocals],
        updateFromJSON,
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

  // Which helpers the parsers call, so a module declares only those.
  const parsers = generated.flatMap(g =>
    g.updateFromJSON === null ? [] : [g.updateFromJSON],
  );
  // `numC` calls `num`, so a constrained domain needs both.
  const needsNumC = parsers.some(p => p.includes('numC('));
  const needsNum = needsNumC || parsers.some(p => p.includes('num('));

  /** Class names by the module that declares them. @type {Map<string, Set<string>>} */
  const typeImports = new Map();
  for (const {klass, module} of pkg.targets) {
    const names = typeImports.get(module) || new Set();
    names.add(klass.name);
    typeImports.set(module, names);
  }
  // The node classes are imported as types only: a value import of them
  // would be a cycle — they import LexicalNode, which imports this — and
  // would evaluate a class before its base was initialized. The one runtime
  // import is the table helpers, from the schema module, which imports no
  // node class. This repo's simple-import-sort config keeps every type
  // import in one group ordered by specifier and value imports after them,
  // so these are emitted the same way: one line per module, sorted.
  //
  // The helpers each class's factory calls, so a module imports only those.
  const helpers = new Set(
    generated.flatMap(g =>
      g.tables.map(([, declaration]) => declaration.replace(/\(.*$/s, '')),
    ),
  );
  if (pkg.home) {
    typeImports.set('./LexicalNode', new Set(['LexicalNode']));
    // Always: this module declares `GeneratedJSON`, whose `exportCompactJSON`
    // names it, and `GeneratedJSONFactory`, which takes a
    // `ComposedSchemaFields`, whether or not any class here reads a table.
    typeImports.set('./LexicalSchema', new Set(['ComposedSchemaFields']));
    typeImports.set('./LexicalUtils', new Set(['CompactDefaultTest']));
  } else {
    const names = new Set(['GeneratedJSONFactory']);
    // Only where an exporter takes it. No built-in node has a property whose
    // comparison cannot be stated as source, so this appears in none of the
    // checked-in output.
    if (generated.some(g => g.compact.includes(`${COMPACT_DEFAULT_PARAM}:`))) {
      names.add('CompactDefaultTest');
    }
    typeImports.set('lexical', names);
  }
  const helperModule = pkg.home ? './LexicalSchema' : 'lexical';
  // A module that reads a table imports the helpers as values, in one
  // statement with that module's types; one that reads none keeps its
  // type-only import.
  if (helpers.size > 0) {
    const types = typeImports.get(helperModule) || new Set();
    typeImports.delete(helperModule);
    for (const type of types) {
      helpers.add(`type ${type}`);
    }
  }
  const importLines = [...typeImports]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(
      ([module, names]) =>
        `import type {${[...names].sort().join(', ')}} from '${module}';`,
    );
  if (helpers.size > 0) {
    // Sorted the way simple-import-sort sorts specifiers: by the name, case
    // ignored, with a `type` modifier ignored.
    const specifiers = [...helpers].sort((a, b) => {
      const x = a.replace(/^type /, '').toLowerCase();
      const y = b.replace(/^type /, '').toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
    importLines.push(
      `\nimport {${specifiers.join(', ')}} from '${helperModule}';`,
    );
  }

  const pieces = [];
  for (const {
    afterCloneFrom,
    compact,
    exportJSON,
    klass,
    tables,
    updateFromJSON,
  } of generated) {
    // One factory per class: registration hands it the class's composed
    // schema, the tables the class reads are bound from that schema first,
    // and the four forms close over them. A class that reads no table takes
    // no parameter.
    const body = [
      ...tables.map(
        ([name, declaration]) => `  const ${name} = ${declaration};`,
      ),
      exportJSON,
      // Always: every class that has a legacy form has a compact one, since a
      // property whose default cannot be compared is written rather than
      // omitted. `exportCompactJSON` stays optional on `GeneratedJSON` — the
      // dispatch still has to answer for a hand-written or older value — but
      // nothing this generates leaves it out.
      compact,
      ...(updateFromJSON === null ? [] : [updateFromJSON]),
      ...(afterCloneFrom === null ? [] : [afterCloneFrom]),
      `  return {\n    exportJSON: export${klass.name},\n    exportCompactJSON: exportCompact${klass.name},${
        updateFromJSON === null
          ? ''
          : `\n    updateFromJSON: update${klass.name},`
      }${
        afterCloneFrom === null
          ? ''
          : `\n    afterCloneFrom: afterClone${klass.name},`
      }\n  };`,
    ];
    pieces.push(
      `/** ${klass.name}'s generated implementations, for its \`$config\`. @internal */\nexport const ${constName(klass)}: GeneratedJSONFactory = ${
        tables.length === 0 ? '()' : 'fields'
      } => {\n${body.join('\n\n')}\n};`,
    );
  }

  // The module-scope pieces a package needs, in order, joined once: the
  // output is prettier-formatted before it is written, so the blank lines
  // between them are prettier's to place, not this template's.
  const prelude = [];
  if (pkg.home) {
    prelude.push(INTERFACE_SOURCE);
  }
  if (needsNum) {
    prelude.push(NUM_COMMENT + NUM_HELPER_SOURCE);
  }
  if (needsNumC) {
    prelude.push(NUM_RANGE_HELPER_SOURCE);
  }

  return `${HEADER}
${importLines.join('\n')}

${[...prelude, ...pieces].join('\n\n')}
`;
}

// What the emitted helpers are for, as the generated module explains it. The
// helpers' source is `@lexical/compiler`'s, so an emitted module and the
// verification cannot be different functions; the reason to have one at all
// is stated here, once, where every generated module reproduces it.
const NUM_COMMENT = `// The JSON number grammar, anchored, matching numberValue: \`Number()\` alone
// reads '0x10' as 16 and '' as 0, and neither is a shape a JSON encoder
// produces. Emitted from the same source the codegen verified against, so the
// two cannot be different functions.
`;

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
