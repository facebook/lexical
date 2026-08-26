/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Emit specialized `exportJSON` and `updateFromJSON` implementations for the
 * node classes in {@link MANIFEST}, from the same serialization schema those
 * classes declare, using `@lexical/compiler`'s SchemaJsonCodegen pass.
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
 * the class rather than looked up at runtime. A class whose compact form needs
 * a schema's own equality — MarkNode's `ids`, whose default is an array — gets
 * a *factory* instead of a const: its `$config` calls the factory with the
 * schema, and the emitted comparisons close over that schema's `defaultValue`
 * and `isEqual` rather than a literal no reference value could ever be `===`.
 *
 * The import direction is the untrusted-JSON boundary and has to reproduce
 * each property's validation exactly, so every emitted parser is checked here
 * against the schema it was compiled from, over a corpus derived from that
 * schema plus a fixed set of hostile values. A property whose schema this
 * cannot compile — or compiles wrongly — takes the class out of the import
 * half rather than shipping a parser that disagrees with the walk.
 *
 * Reading a schema needs no editor and constructs no node: `$config()` is a
 * plain method on the prototype, so this runs as an ordinary build step.
 *
 * Run with `pnpm run generate-node-json`; `LexicalGeneratedJSON.test.ts` fails
 * if any checked-in output is stale or disagrees with the schema-driven path.
 */

import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  compileParse,
  literal,
  NotCompilable,
  NUM_HELPER_SOURCE,
  verifyCompiledParse,
  verifyTableCoversDomain,
} from '../packages/lexical-compiler/src/passes/schemaJsonCodegen.mjs';

/** @typedef {import('lexical').LexicalNode} LexicalNode */
/** @typedef {import('lexical').Klass<LexicalNode>} NodeClass */
/** @typedef {import('lexical').AnySerializationSchema} AnySchema */

const REPO = join(import.meta.dirname, '..');

/**
 * Everything phase one needs to write a valid stub for each output, stated
 * statically because phase one runs before anything can be imported. Phase two
 * asserts its resolved targets against this, so the two cannot drift apart
 * silently.
 *
 * `home` marks the module that declares the `GeneratedJSON` interface (the
 * others import the type from `lexical`). An entry with `factory` emits a
 * function the class's `$config` calls with its schema, rather than a const —
 * see the module docblock.
 *
 * @type {readonly {
 *   file: string,
 *   home?: boolean,
 *   entries: readonly {name: string, factory?: boolean}[],
 * }[]}
 */
const MANIFEST = [
  {
    entries: [
      {name: 'GENERATED_TEXT'},
      {name: 'GENERATED_PARAGRAPH'},
      {name: 'GENERATED_LINEBREAK'},
      {name: 'GENERATED_TAB'},
    ],
    file: 'packages/lexical/src/LexicalGeneratedJSON.ts',
    home: true,
  },
  {
    entries: [{name: 'GENERATED_HEADING'}, {name: 'GENERATED_QUOTE'}],
    file: 'packages/lexical-rich-text/src/LexicalRichTextGeneratedJSON.ts',
  },
  {
    entries: [{name: 'GENERATED_LINK'}, {name: 'GENERATED_AUTOLINK'}],
    file: 'packages/lexical-link/src/LexicalLinkGeneratedJSON.ts',
  },
  {
    entries: [{factory: true, name: 'createGeneratedMarkNode'}],
    file: 'packages/lexical-mark/src/LexicalMarkGeneratedJSON.ts',
  },
];

/**
 * Where to write. In place by default; the drift check passes a directory,
 * because regenerating in place would replace source modules other test
 * workers are importing at that moment — first with phase one's stubs, and
 * only then with the real thing. In directory mode the repo-relative layout is
 * preserved and a `manifest.json` lists every file written, so the check can
 * compare each without knowing the list itself.
 */
const OUT_DIR = process.argv[2] ? resolve(process.argv[2]) : null;

/** @param {string} repoRelative @returns {string} */
function outPath(repoRelative) {
  const target =
    OUT_DIR === null ? join(REPO, repoRelative) : join(OUT_DIR, repoRelative);
  mkdirSync(dirname(target), {recursive: true});
  return target;
}

const HEADER = `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @generated by scripts/generate-node-json.mjs from each class's \`json\`
// schema. Run \`pnpm run generate-node-json\` to regenerate; do not edit.

// Keys are emitted in the order the schema-driven walk writes them, so the two
// produce byte-identical JSON. That order is the schema's, not alphabetical.
/* eslint-disable sort-keys-fix/sort-keys-fix */
`;

const INTERFACE_SOURCE = `/**
 * The generated implementations for one node class.
 *
 * Each is handed to the class it was generated from through that class's
 * \`$config\`, so nothing has to match code to class at runtime.
 *
 * @internal
 */
export interface GeneratedJSON {
  // Method syntax, so TypeScript checks the parameter bivariantly and a
  // function generated for one class is assignable here — the same reason
  // SerializationSchema.isEqual is declared this way. The alternative is to
  // widen the parameter to 'never', which no generated function actually
  // accepts and every call site then has to cast back.
  exportJSON(node: LexicalNode): {[key: string]: unknown};
  exportCompactJSON?(node: LexicalNode): {[key: string]: unknown};
  updateFromJSON?(
    node: LexicalNode,
    json: {readonly [key: string]: unknown},
  ): void;
}`;

/**
 * A valid do-nothing module for one output, from the static manifest alone.
 *
 * @param {(typeof MANIFEST)[number]} pkg
 * @returns {string}
 */
function stubSource(pkg) {
  const lines = [HEADER];
  if (pkg.home) {
    lines.push(
      `\nimport type {LexicalNode} from './LexicalNode';\n\n${INTERFACE_SOURCE}\n`,
    );
  } else {
    lines.push(`\nimport type {GeneratedJSON} from 'lexical';\n`);
  }
  for (const entry of pkg.entries) {
    lines.push(
      entry.factory
        ? `\n/**\n * @internal\n * @__NO_SIDE_EFFECTS__\n */\nexport function ${entry.name}(..._config: unknown[]): undefined | GeneratedJSON {\n  return undefined;\n}\n`
        : `\n/** @internal */\nexport const ${entry.name}: undefined | GeneratedJSON = undefined;\n`,
    );
  }
  return lines.join('');
}

// Two phases, because reading the schemas means importing the packages, and
// each package imports the file this script writes for it. Phase one replaces
// every output with a valid do-nothing module so the imports always succeed —
// otherwise a generator run that produced broken output could never be run
// again to fix it. Phase two re-enters under tsx and writes the real thing.
if (!process.env.LEXICAL_CODEGEN_PHASE_TWO) {
  for (const pkg of MANIFEST) {
    writeFileSync(outPath(pkg.file), stubSource(pkg));
  }
  execFileSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      cwd: process.cwd(),
      env: {...process.env, LEXICAL_CODEGEN_PHASE_TWO: '1'},
      stdio: 'inherit',
    },
  );
  process.exit(0);
}

// Bare specifiers rather than paths to the sources: tsconfig's `paths` maps
// each to its package's src for both tsx and the type checker, and a specifier
// ending in `.ts` is a type error under this repo's settings.
const {isSchemaField, LineBreakNode, ParagraphNode, TabNode, TextNode} =
  await import('lexical');
// Both are `@internal` — how a class composes its schema and which accessor a
// field stands in for are this codegen's concern and the walk's, not a public
// API to be frozen by the backwards-compatibility rule — so they are reached
// through the module that declares them rather than the package entry point.
// `paths` maps `lexical/src/*` the same way it maps `lexical`, so this is the
// same module instance the editor uses, not a second copy.
const {getComposedSchema, resolveSchemaField} =
  await import('lexical/src/LexicalUtils');
const {HeadingNode, QuoteNode} = await import('@lexical/rich-text');
const {AutoLinkNode, LinkNode} = await import('@lexical/link');
const {MarkNode} = await import('@lexical/mark');

/**
 * The classes each generated module serializes, in the order their code is
 * emitted, with the module each type import comes from. The list is what to
 * extend to specialize another class; everything else is derived from its
 * schema. `factory` names the config keys whose compact comparison closes over
 * the schema — required exactly when a compact-relevant property's default is
 * reference-typed.
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

/** `MarkNode` → `GENERATED_MARK` / `createGeneratedMarkNode`. */
const constName = (/** @type {NodeClass} */ klass) =>
  `GENERATED_${klass.name.replace(/Node$/, '').toUpperCase()}`;
const factoryName = (/** @type {NodeClass} */ klass) =>
  `createGenerated${klass.name}`;

/** `foo` → `getFoo`. @param {string} key @returns {string} */
function defaultGetterName(key) {
  return `get${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

/** `foo` → `setFoo`. @param {string} key @returns {string} */
function defaultSetterName(key) {
  return `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

/**
 * Lookup tables the generated module being built needs, by the const name
 * given to each. Reset per package: tables are emitted into the module whose
 * classes need them.
 *
 * @type {Map<string, {table: {readonly [key: string]: unknown}, nullProto: boolean}>}
 */
const tables = new Map();

/**
 * Name and record a lookup table for the generated module.
 *
 * `nullProto` tables are the ones an untrusted key reaches: without it a
 * serialized `'toString'` would resolve to Object.prototype's method and be
 * stored as the property's value. The export-side tables are keyed by the
 * node's own field, so they are plain objects.
 *
 * @param {string} name
 * @param {{readonly [key: string]: unknown}} table
 * @param {boolean} nullProto
 * @returns {string}
 */
function addTable(name, table, nullProto) {
  tables.set(name, {nullProto, table});
  return name;
}

/** @param {NodeClass} klass @param {string} key @param {string} suffix */
function tableName(klass, key, suffix) {
  return `${klass.name.replace(/Node$/, '').toUpperCase()}_${key.toUpperCase()}_${suffix}`;
}

/**
 * The accessor `klass` reaches one direction of `key` through, after the
 * subclass-override guard — the same resolution the walk makes, from the same
 * function, so a generated literal cannot describe a different node.
 *
 * Split by direction rather than taking a `'getter' | 'setter'` argument so
 * each returns the field type that carries its own table: the getter's
 * `decode` and the setter's `encode` are then the only one in scope, with no
 * cast to reintroduce the other.
 *
 * @param {NodeClass} klass
 * @param {AnySchema} schema
 * @param {string} key
 * @returns {undefined | null | string | import('lexical').SchemaGetterField}
 */
function getterAccessor(klass, schema, key) {
  const declared = schema.getter;
  if (declared === null) {
    return null;
  }
  const named = declared === undefined ? defaultGetterName(key) : declared;
  return isSchemaField(named)
    ? resolveSchemaField(klass, key, named, defaultGetterName(key))
    : named;
}

/**
 * The setter mirror of {@link getterAccessor}.
 *
 * @param {NodeClass} klass
 * @param {AnySchema} schema
 * @param {string} key
 * @returns {undefined | null | string | import('lexical').SchemaSetterField}
 */
function setterAccessor(klass, schema, key) {
  const declared = schema.setter;
  if (declared === null) {
    return null;
  }
  const named = declared === undefined ? defaultSetterName(key) : declared;
  return isSchemaField(named)
    ? resolveSchemaField(klass, key, named, defaultSetterName(key))
    : named;
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
  const getter = getterAccessor(klass, schema, key);
  if (getter === null) {
    // Declared import-only, like the walk's compiled getters skip it.
    return null;
  }
  if (isSchemaField(getter)) {
    const read =
      getter.decode === undefined
        ? `node.${getter.field}`
        : // The table is plain data, so it is inlined rather than imported:
          // keeping this module free of runtime imports is what keeps it out
          // of the cycle.
          `${addTable(tableName(klass, key, 'DECODE'), getter.decode, false)}[node.${getter.field}]`;
    if (getter.when === undefined) {
      return {expression: read};
    }
    // A conditionally-persisted property. The walk tests the default first
    // and then calls the predicate; here the value is already in a local, and
    // the predicate is hoisted so properties that share one call it once.
    return {expression: read, when: getter.when};
  }
  return {expression: `node.${getter}()`};
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
 * @param {{expression: string, key: string, schema: AnySchema, when?: string}[]} reads
 * @returns {{lines: string[], value: (read: {expression: string, key: string, schema: AnySchema, when?: string}) => string}}
 */
function hoistGatedReads(reads) {
  // Built by hand rather than filtered, so `when` is a string in what follows.
  /** @type {{expression: string, key: string, schema: AnySchema, when: string}[]} */
  const gated = [];
  for (const read of reads) {
    if (read.when !== undefined) {
      gated.push({...read, when: read.when});
    }
  }
  if (gated.length === 0) {
    return {lines: [], value: read => read.expression};
  }
  const lines = gated.map(read => `  const ${read.key} = ${read.expression};`);
  /** @type {Map<string, string[]>} */
  const byPredicate = new Map();
  for (const read of gated) {
    const differs = `${read.key} !== ${literal(read.schema.defaultValue)}`;
    byPredicate.set(read.when, [
      ...(byPredicate.get(read.when) || []),
      differs,
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
        : `${read.key} !== ${literal(read.schema.defaultValue)} && ${read.when}\n      ? ${read.key}\n      : undefined`,
  };
}

/**
 * Whether `literal(value)` evaluates back to a value that is `===` this one,
 * which is what an emitted `!==` comparison needs in order to mean what the
 * walk's `value === defaultValue` means.
 *
 * True for the primitives JSON round-trips. False for an object or array — a
 * literal allocates a fresh one, never `===` the default the walk holds; those
 * compare through the schema's own equality, closed over by a factory — and
 * for a non-finite number, which `JSON.stringify` renders as `null`. `-0` is
 * rendered as `0`, which is fine: `-0 !== 0` is false either way.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function hasFaithfulLiteral(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  );
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
 * A property whose default is reference-typed has no literal a value could be
 * `===`, so its comparison goes through the schema's own default and equality
 * instead — mirroring the walk's inline compare — and the names it uses are
 * reported in `factoryKeys` for the caller to close over. A default with no
 * faithful literal and no declared equality (a non-finite number) still bails
 * the class to the walk.
 *
 * @param {NodeClass} klass
 * @returns {null | {code: string, factoryKeys: string[]}}
 */
function generateCompactExport(klass) {
  const type = klass.getType();
  const writes = [];
  /** @type {string[]} */
  const factoryKeys = [];
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
    const {defaultValue} = schema;
    if (hasFaithfulLiteral(defaultValue)) {
      // A default of `undefined` needs no second comparison: the walk skips an
      // undefined value before it ever looks at the default, and so does this.
      const isDefault =
        defaultValue === undefined
          ? ''
          : ` && ${key} !== ${literal(defaultValue)}`;
      writes.push(
        when === undefined
          ? `  const ${key} = ${expression};\n  if (${key} !== undefined${isDefault}) {\n    json.${key} = ${key};\n  }`
          : // `${key}` and the predicate are already hoisted above, so this is
            // the same test the legacy form makes, written as a statement.
            `  if (${key} !== ${literal(defaultValue)} && ${when}) {\n    json.${key} = ${key};\n  }`,
      );
      continue;
    }
    if (schema.isEqual === undefined) {
      process.stdout.write(
        `${klass.name}: no generated compact export, "${key}" has a default with no faithful literal (${String(
          defaultValue,
        )}) and no declared equality\n`,
      );
      return null;
    }
    // The walk's inline compare, verbatim, over the schema's own default and
    // equality — closed over by the surrounding factory.
    factoryKeys.push(key);
    writes.push(
      `  const ${key} = ${expression};\n  if (\n    ${key} !== undefined &&\n    ${key} !== ${key}_defaultValue &&\n    !(${key}_isEqual !== undefined && ${key}_isEqual(${key}, ${key}_defaultValue))\n  ) {\n    json.${key} = ${key};\n  }`,
    );
  }
  const isElement = isElementish(klass);
  const header = `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */`;
  const indent = factoryKeys.length > 0 ? '  ' : '';
  if (writes.length === 0) {
    // Nothing to compare, so the literal is the whole function — as in
    // generateExport, and for the same reason: an object that lands on its
    // final shape in one allocation beats one built by assignment.
    return {
      code: `${header}
function exportCompact${klass.name}(): {[key: string]: unknown} {
  return {${isElement ? 'children: [], ' : ''}type: '${type}'};
}`,
      factoryKeys,
    };
  }
  const body = `${header}
${indent}function exportCompact${klass.name}(node: ${klass.name}): {[key: string]: unknown} {
${hoist.lines.length === 0 ? '' : `${hoist.lines.map(l => l.replace(/^/gm, indent)).join('\n')}\n`}${indent}  const json: {[key: string]: unknown} = ${isElement ? '{children: []}' : '{}'};
${writes.map(w => w.replace(/^/gm, indent)).join('\n')}
${indent}  json.type = '${type}';
${indent}  return json;
${indent}}`;
  return {code: body, factoryKeys};
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
  const type = klass.getType();
  const reads = schemaReads(klass);
  // An element's JSON leads with `children`, which is structural rather than
  // schema-declared: the key order below is byte-identical to the walk's.
  const isElement = isElementish(klass);
  const hoist = hoistGatedReads(reads);
  const entries = [
    ...(isElement ? ['children: []'] : []),
    ...reads.map(read => `${read.key}: ${hoist.value(read)}`),
    `type: '${type}'`,
    'version: 1',
  ];
  return `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */
function export${klass.name}(${
    reads.length === 0 ? '' : `node: ${klass.name}`
  }): {[key: string]: unknown} {
${hoist.lines.length === 0 ? '' : `${hoist.lines.join('\n')}\n`}  return {
    ${entries.join(',\n    ')},
  };
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
 * @returns {{key: string, statements: string}}
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
  const setter = setterAccessor(klass, schema, key);
  if (setter === null) {
    throw new NotCompilable(`"${key}" is export-only`);
  }
  if (!isSchemaField(setter)) {
    // A method could be called, but then the node it returns has to be threaded
    // through the rest, and every class generated today is all-fields anyway.
    throw new NotCompilable(`"${key}" is applied through ${setter}()`);
  }
  const {expression, tables: parseTables} = compileParse(
    schema.meta,
    schema.defaultValue,
    tableName(klass, key, 'ALIAS'),
  );
  const nullPrototypeTables = parseTables.map(({name}) => name);
  for (const {name, table} of parseTables) {
    addTable(name, table, true);
  }
  const {encode} = setter;
  // Two statements rather than one expression when a table has to be applied
  // after parsing: folding them together needs an IIFE, and a closure per
  // property per node is most of what generating this was meant to remove.
  let statements = `  v = json.${key};\n  node.${setter.field} = ${expression};`;
  if (encode !== undefined) {
    const name = tableName(klass, key, 'ENCODE');
    addTable(name, encode, true);
    nullPrototypeTables.push(name);
    // The schema already reduced the value to its own domain, so the table is
    // total over what reaches it; the guard is for a domain member with no
    // stored form, which would otherwise write undefined into the field.
    const fallback = literal(
      encode[/** @type {string} */ (schema.defaultValue)],
    );
    const lookup = `(v as string) in ${name} ? ${name}[v as string] : ${fallback}`;
    statements = `  v = json.${key};\n  v = ${expression};\n  node.${setter.field} = ${lookup};`;
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
  return {key, statements};
}

/**
 * @param {NodeClass} klass
 * @returns {null | string}
 */
function generateUpdate(klass) {
  const {fieldsBaseFirst, flatStates} = getComposedSchema(klass);
  if (flatStates.length > 0) {
    process.stdout.write(
      `${klass.name}: no generated parser, it carries flat NodeState\n`,
    );
    return null;
  }
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
  return `/** Generated from ${klass.name}'s serialization schema. Do not edit by hand. */
function update${klass.name}(
  node: ${klass.name},
  json: {readonly [key: string]: unknown},
): void {
  let v: unknown;
${body}
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
  // Every class is exportable: the base `exportJSON` writes exactly the
  // schema's properties plus type/version, and NodeState is appended by the
  // dispatch. A class that overrides `exportJSON` for output no schema
  // describes — ParagraphNode and its #7971 textFormat/textStyle back-fill —
  // still composes, because the override's `super.exportJSON(compact)` is what
  // reaches the generated literal.
  const generated = pkg.targets.map(({klass}) => ({
    compact: generateCompactExport(klass),
    exportJSON: generateExport(klass),
    klass,
    updateFromJSON: generateUpdate(klass),
  }));

  const tableSource = [...tables]
    .map(([name, {nullProto, table}]) => {
      const declaration = `const ${name}: {readonly [key: string]: ${tableValueType(table)}}`;
      return nullProto
        ? `// Null-prototype: an untrusted key must never resolve to Object.prototype.\n${declaration} =\n  /* @__PURE__ */ Object.assign(Object.create(null), ${JSON.stringify(table, null, 2)});`
        : `${declaration} = ${JSON.stringify(table, null, 2)};`;
    })
    .join('\n\n');

  const needsNum = generated.some(
    g => g.updateFromJSON !== null && g.updateFromJSON.includes('num('),
  );

  /** Class names by the module that declares them. @type {Map<string, Set<string>>} */
  const typeImports = new Map();
  for (const {klass, module} of pkg.targets) {
    if (schemaReads(klass).length > 0) {
      const names = typeImports.get(module) || new Set();
      names.add(klass.name);
      typeImports.set(module, names);
    }
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
  for (const {compact, exportJSON, klass, updateFromJSON} of generated) {
    const factoryKeys = compact === null ? [] : compact.factoryKeys;
    pieces.push(exportJSON);
    if (compact !== null && factoryKeys.length === 0) {
      pieces.push(compact.code);
    }
    if (updateFromJSON !== null) {
      pieces.push(updateFromJSON);
    }
    if (factoryKeys.length === 0) {
      pieces.push(
        `/** ${klass.name}'s generated implementations, for its \`$config\`. @internal */\nexport const ${constName(klass)}: GeneratedJSON = {\n  exportJSON: export${klass.name},${
          compact === null
            ? ''
            : `\n  exportCompactJSON: exportCompact${klass.name},`
        }${
          updateFromJSON === null
            ? ''
            : `\n  updateFromJSON: update${klass.name},`
        }\n};`,
      );
    } else {
      // The factory form: the compact comparisons for these keys go through
      // the schema's own default and equality, so the class's `$config` calls
      // this with the very schemas it declared and the emitted code closes
      // over them. Everything else about the class is the const form.
      const params = factoryKeys
        .map(
          key =>
            `  ${key}: {\n    readonly defaultValue: unknown;\n    isEqual?(a: unknown, b: unknown): boolean;\n  };`,
        )
        .join('\n');
      const destructure = factoryKeys
        .map(
          key =>
            `  const ${key}_defaultValue = config.${key}.defaultValue;\n  const ${key}_isEqual = config.${key}.isEqual;`,
        )
        .join('\n');
      pieces.push(
        `/**
 * ${klass.name}'s generated implementations, for its \`$config\` — a factory,
 * because the compact comparison for ${factoryKeys
   .map(k => `\`${k}\``)
   .join(', ')} goes through the
 * schema's own default and equality (its default is reference-typed, so no
 * literal a value could be \`===\` exists). The class passes the schemas it
 * declared and the comparisons close over them.
 *
 * @internal
 * @__NO_SIDE_EFFECTS__
 */
export function ${factoryName(klass)}(config: {
${params}
}): GeneratedJSON {
${destructure}
${compact === null ? '' : compact.code}
  return {
    exportJSON: export${klass.name},${
      compact === null
        ? ''
        : `\n    exportCompactJSON: exportCompact${klass.name},`
    }${
      updateFromJSON === null
        ? ''
        : `\n    updateFromJSON: update${klass.name},`
    }
  };
}`,
      );
    }
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
`
      : ''
  }${tableSource ? `\n${tableSource}\n` : ''}
${pieces.join('\n\n')}
`;
}

// Phase two must be generating exactly what phase one stubbed, or a future
// edit to one list silently ships a stub.
if (PACKAGES.length !== MANIFEST.length) {
  throw new Error('generate-node-json: PACKAGES and MANIFEST disagree');
}
const written = [];
for (let i = 0; i < PACKAGES.length; i++) {
  const pkg = PACKAGES[i];
  const manifest = MANIFEST[i];
  if (pkg.file !== manifest.file) {
    throw new Error(`generate-node-json: manifest order mismatch ${pkg.file}`);
  }
  const source = generatePackage(pkg);
  const expected = manifest.entries.map(e => e.name).sort();
  const emitted = pkg.targets
    .map(({klass}) =>
      source.includes(`function ${factoryName(klass)}(`)
        ? factoryName(klass)
        : constName(klass),
    )
    .sort();
  if (JSON.stringify(expected) !== JSON.stringify(emitted)) {
    throw new Error(
      `generate-node-json: ${pkg.file} emits [${emitted}] but the manifest stubs [${expected}]; update MANIFEST (and the $config wiring) together`,
    );
  }
  const target = outPath(pkg.file);
  writeFileSync(target, source);
  written.push({path: pkg.file, target});
}

if (OUT_DIR !== null) {
  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify(
      written.map(w => w.path),
      null,
      2,
    ),
  );
}

// Formatted here so the checked-in files are both prettier-clean and exactly
// what a regeneration produces — the drift check compares them byte for byte.
// The config is named explicitly rather than resolved from the output's
// directory, so the output is formatted the same way wherever it is written —
// the drift check writes outside the repo, where prettier would otherwise use
// defaults and report every line as drift.
execFileSync(
  'npx',
  [
    'prettier',
    '--config',
    join(REPO, '.prettierrc'),
    '--write',
    ...written.map(w => w.target),
  ],
  {cwd: REPO, stdio: 'pipe'},
);

for (const w of written) {
  process.stdout.write(`wrote ${w.target}\n`);
}
