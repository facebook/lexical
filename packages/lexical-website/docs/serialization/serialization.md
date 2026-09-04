

# Serialization & Deserialization

Internally, Lexical maintains the state of a given editor in memory, updating it in response to user inputs. Sometimes, it's useful to convert this state into a serialized format in order to transfer it between editors or store it for retrieval at some later time. In order to make this process easier, Lexical provides some APIs that allow Nodes to specify how they should be represented in common serialized formats.


## HTML

Currently, HTML serialization is primarily used to transfer data between Lexical and non-Lexical editors (such as Google Docs or Quip) via the copy & paste functionality in [`@lexical/clipboard`](https://github.com/facebook/lexical/blob/main/packages/lexical-clipboard/README.md), but we also offer generic utilities for converting `Lexical` -> `HTML` and `HTML` -> `Lexical` in our [`@lexical/html`](https://github.com/facebook/lexical/blob/main/packages/lexical-html/README.md) package.

### Lexical -> HTML
When generating HTML from an editor you can pass in a selection object to narrow it down to a certain section or pass in null to convert the whole editor.
```js
import {$generateHtmlFromNodes} from '@lexical/html';

const htmlString = $generateHtmlFromNodes(editor, selection | null);
```

:::tip

For new code, consider [`DOMRenderExtension`](./dom-render.md)
instead of (or in addition to) `exportDOM` on each node class. It lets
you declare `$exportDOM` / `$createDOM` / `$updateDOM` /
`$decorateDOM` / `$getDOMSlot` / `$shouldExclude` / `$shouldInclude` /
`$extractWithChild` overrides per node class (or globally) in a
middleware-style chain that composes cleanly across extensions. The
same declaration applies to both in-editor reconciliation and HTML
export, so you don't have to maintain two parallel code paths.

:::

#### `LexicalNode.exportDOM()`
You can control how a `LexicalNode` is represented as HTML by adding an `exportDOM()` method.

```js
exportDOM(editor: LexicalEditor): DOMExportOutput
```

When transforming an editor state into HTML, we simply traverse the current editor state (or the selected subset thereof) and call the `exportDOM` method for each Node in order to convert it to an `HTMLElement`.

Sometimes, it's necessary or useful to do some post-processing after a node has been converted to HTML. For this, we expose the "after" API on `DOMExportOutput`, which allows `exportDOM` to specify a function that should be run after the conversion to an `HTMLElement` has happened.

```js
export type DOMExportOutput = {
  after?: (generatedElement: ?HTMLElement) => ?HTMLElement,
  element?: HTMLElement | null,
};
```

If the element property is null in the return value of exportDOM, that Node will not be represented in the serialized output.

### HTML -> Lexical

:::tip

For new code, consider [`DOMImportExtension`](./dom-import.md)
instead of (or in addition to) `static importDOM()` on each node
class. It replaces the `DOMConversionMap` machinery with typed
selectors (`sel.tag(...)`, `sel.css(...)`), middleware-style rules
(`$next()` instead of numeric priority), structural schemas
(`BlockSchema` / `InlineSchema` / `ListSchema` / `TableSchema`),
configurable text whitespace handling
(`ImportWhitespaceConfig`), a DOM preprocess chain (default:
stylesheet inlining), and a typed context system for cross-rule
communication. Per-package bundles ship for rich-text, list, link,
table, code, and horizontal-rule. Pair with
[`ClipboardImportExtension`](./dom-import.md#clipboardimportextension)
to route pastes through the new pipeline.

:::

```js
import {$generateNodesFromDOM} from '@lexical/html';

editor.update(() => {
  // In the browser you can use the native DOMParser API to parse the HTML string.
  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlString, textHtmlMimeType);

  // Once you have the DOM instance it's easy to generate LexicalNodes.
  const nodes = $generateNodesFromDOM(editor, dom);

  // Select the root
  $getRoot().select();

  // Insert them at a selection.
  $insertNodes(nodes);
});
```

If you are running in headless mode, you can do it this way using JSDOM:

```js
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';

// Once you've generated LexicalNodes from your HTML you can now initialize an editor instance with the parsed nodes.
const editorNodes = [] // Any custom nodes you register on the editor
const editor = createHeadlessEditor({ ...config, nodes: editorNodes });

editor.update(() => {
  // In a headless environment you can use a package such as JSDom to parse the HTML string.
  const dom = new JSDOM(htmlString);

  // Once you have the DOM instance it's easy to generate LexicalNodes.
  const nodes = $generateNodesFromDOM(editor, dom.window.document);

  // Select the root
  $getRoot().select();

  // Insert them at a selection.
  const selection = $getSelection();
  selection.insertNodes(nodes);
});
```

:::tip

Remember that state updates are asynchronous, so executing `editor.getEditorState()` immediately afterwards might not return the expected content. To avoid it, [pass `discrete: true` in the `editor.update` method](https://dio.la/article/lexical-state-updates#discrete-updates).

:::

#### `LexicalNode.importDOM()`
You can control how an `HTMLElement` is represented in `Lexical` by adding an `importDOM()` method to your `LexicalNode`.

```js
static importDOM(): DOMConversionMap | null;
```
The return value of `importDOM` is a map of the lower case (DOM) [Node.nodeName](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeName) property to an object that specifies a conversion function and a priority for that conversion. This allows `LexicalNodes` to specify which type of DOM nodes they can convert and what the relative priority of their conversion should be. This is useful in cases where a DOM Node with specific attributes should be interpreted as one type of `LexicalNode`, and otherwise it should be represented as another type of `LexicalNode`.

```ts
type DOMConversionMap = Record<
  string,
  (node: HTMLElement) => DOMConversion | null
>;

type DOMConversion = {
  conversion: DOMConversionFn;
  priority: 0 | 1 | 2 | 3 | 4;
};

type DOMConversionFn = (element: HTMLElement) => DOMConversionOutput | null;

type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: null | LexicalNode | Array<LexicalNode>;
};

type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined;
```

@lexical/code provides a good example of the usefulness of this design. GitHub uses HTML ```<table>``` elements to represent the structure of copied code in HTML. If we interpreted all HTML ```<table>``` elements as literal tables, then code pasted from GitHub would appear in Lexical as a Lexical TableNode. Instead, CodeNode specifies that it can handle ```<table>``` elements too:

```js
class CodeNode extends ElementNode {
...
static importDOM(): DOMConversionMap | null {
  return {
    ...
    table: (node: Node) => {
      if (isGitHubCodeTable(node as HTMLTableElement)) {
        return {
          conversion: convertTableElement,
          priority: 3,
        };
      }
      return null;
    },
    ...
  };
}
...
}
```

If the imported ```<table>``` doesn't align with the expected GitHub code HTML, then we return null and allow the node to be handled by lower priority conversions.

Much like `exportDOM`, `importDOM` exposes APIs to allow for post-processing of converted Nodes. The conversion function returns a `DOMConversionOutput` which can specify a function to run for each converted child (forChild) or on all the child nodes after the conversion is complete (after). The key difference here is that ```forChild``` runs for every deeply nested child node of the current node, whereas ```after``` will run only once after the transformation of the node and all its children is complete. 

### `html` Property for Import and Export Configuration

The `html` property in `CreateEditorArgs` provides an alternate way to configure HTML import and export behavior in Lexical without subclassing or node replacement. It includes two properties:

- `import` - Similar to `importDOM`, it controls how HTML elements are transformed into `LexicalNodes`. However, instead of defining conversions directly on each `LexicalNode`, `html.import` provides a configuration that can be overridden easily in the editor setup.
  
- `export` - Similar to `exportDOM`, this property customizes how `LexicalNodes` are serialized into HTML. With `html.export`, users can specify transformations for various nodes collectively, offering a flexible override mechanism that can adapt without needing to extend or replace specific `LexicalNodes`.

#### Key Differences from `importDOM` and `exportDOM`

While `importDOM` and `exportDOM` allow for highly customized, node-specific conversions by defining them directly within the `LexicalNode` class, the `html` property enables broader, editor-wide configurations. This setup benefits situations where:

- **Consistent Transformations**: You want uniform import/export behavior across different nodes without adjusting each node individually.
- **No Subclassing Required**: Overrides to import and export logic are applied at the editor configuration level, simplifying customization and reducing the need for extensive subclassing.

#### Type Definitions

```typescript
type HTMLConfig = {
  export?: DOMExportOutputMap;  // Optional map defining how nodes are exported to HTML.
  import?: DOMConversionMap;     // Optional record defining how HTML is converted into nodes.
};
```

#### Example of a use case for the `html` Property for Import and Export Configuration:

[Rich text sandbox](https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview)

### Handling extended HTML styling

Since the TextNode is foundational to all Lexical packages, including the plain text use case. Handling any rich text logic is undesirable. This creates the need to override the TextNode to handle serialization and deserialization of HTML/CSS styling properties to achieve full fidelity between JSON \<-\> HTML. Since this is a very popular use case, below we are proving a recipe to handle the most common use cases.

You need to override the base TextNode:

```js
const initialConfig: InitialConfigType = {
    namespace: 'editor',
    theme: editorThemeClasses,
    onError: (error: any) => console.log(error),
    nodes: [
      ExtendedTextNode,
      {
        replace: TextNode,
        with: (node: TextNode) => new ExtendedTextNode(node.__text),
        withKlass: ExtendedTextNode,
      },
      ListNode,
      ListItemNode,
    ]
  };
```

and create a new Extended Text Node plugin

```js
import {
  $applyNodeReplacement,
  $isTextNode,
  DOMConversion,
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
  TextNode,
  SerializedTextNode,
  LexicalNode
} from 'lexical';

export class ExtendedTextNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  static getType(): string {
    return 'extended-text';
  }

  static clone(node: ExtendedTextNode): ExtendedTextNode {
    return new ExtendedTextNode(node.__text, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    const importers = TextNode.importDOM();
    return {
      ...importers,
      code: () => ({
        conversion: patchStyleConversion(importers?.code),
        priority: 1
      }),
      em: () => ({
        conversion: patchStyleConversion(importers?.em),
        priority: 1
      }),
      span: () => ({
        conversion: patchStyleConversion(importers?.span),
        priority: 1
      }),
      strong: () => ({
        conversion: patchStyleConversion(importers?.strong),
        priority: 1
      }),
      sub: () => ({
        conversion: patchStyleConversion(importers?.sub),
        priority: 1
      }),
      sup: () => ({
        conversion: patchStyleConversion(importers?.sup),
        priority: 1
      }),
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    return $createExtendedTextNode().updateFromJSON(serializedNode);
  }

  isSimpleText() {
    return this.__type === 'extended-text' && this.__mode === 0;
  }

  // no need to add exportJSON here, since we are not adding any new properties
}

export function $createExtendedTextNode(text: string = ''): ExtendedTextNode {
  return $applyNodeReplacement(new ExtendedTextNode(text));
}

export function $isExtendedTextNode(node: LexicalNode | null | undefined): node is ExtendedTextNode {
	return node instanceof ExtendedTextNode;
}

function patchStyleConversion(
  originalDOMConverter?: (node: HTMLElement) => DOMConversion | null
): (node: HTMLElement) => DOMConversionOutput | null {
  return (node) => {
    const original = originalDOMConverter?.(node);
    if (!original) {
      return null;
    }
    const originalOutput = original.conversion(node);

    if (!originalOutput) {
      return originalOutput;
    }

    const backgroundColor = node.style.backgroundColor;
    const color = node.style.color;
    const fontFamily = node.style.fontFamily;
    const fontWeight = node.style.fontWeight;
    const fontSize = node.style.fontSize;
    const textDecoration = node.style.textDecoration;

    return {
      ...originalOutput,
      forChild: (lexicalNode, parent) => {
        const originalForChild = originalOutput?.forChild ?? ((x) => x);
        const result = originalForChild(lexicalNode, parent);
        if ($isTextNode(result)) {
          const style = [
            backgroundColor ? `background-color: ${backgroundColor}` : null,
            color ? `color: ${color}` : null,
            fontFamily ? `font-family: ${fontFamily}` : null,
            fontWeight ? `font-weight: ${fontWeight}` : null,
            fontSize ? `font-size: ${fontSize}` : null,
            textDecoration ? `text-decoration: ${textDecoration}` : null,
          ]
            .filter((value) => value != null)
            .join('; ');
          if (style.length) {
            return result.setStyle(style);
          }
        }
        return result;
      }
    };
  };
}
```

## JSON

:::tip

If your custom node uses [`$config`](../concepts/nodes.mdx#creating-custom-nodes-with-config-and-nodestate)
with `NodeState`, `exportJSON`, `importJSON`, and `updateFromJSON` are
generated for you. Flat state keys are lifted to the top level of the
serialized node and the rest are nested under `'$'` — see
[Flat serialization with `$config`](../concepts/node-state.md#flat-serialization-with-config)
and the [legacy-property upgrade recipe](../concepts/node-state.md#upgrading-a-legacy-json-property-to-nodestate).
A `$config` node can also declare a
[declarative serialization schema](#declarative-serialization-schemas-with-config) so
parsing of its node-specific properties is generated too.

:::

### Lexical -> JSON
To generate a JSON snapshot from an `EditorState`, you can call the `toJSON()` method on the `EditorState` object.

```js
const editorState = editor.getEditorState();
const json = editorState.toJSON();
```

Alternatively, if you are trying to generate a stringified version of the `EditorState`, you can simply using `JSON.stringify` directly:

```js
const editorState = editor.getEditorState();
const jsonString = JSON.stringify(editorState);
```

#### `LexicalNode.exportJSON()`

You can control how a `LexicalNode` is represented as JSON by adding an `exportJSON()` method. It's important that you extend the serialization of the superclass by invoking `super`: e.g. `{ ...super.exportJSON(), /* your other properties */ }`.

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

exportJSON(): SerializedLexicalNode
```

When transforming an editor state into JSON, we simply traverse the current editor state and call the `exportJSON` method for each Node in order to convert it to a `SerializedLexicalNode` object that represents the JSON object for the given node. The built-in nodes from Lexical already have a JSON representation defined, but you'll need to define ones for your own custom nodes.

Here's an example of `exportJSON` for the `HeadingNode`:

```js
export type SerializedHeadingNode = Spread<
  {
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  },
  SerializedElementNode
>;

exportJSON(): SerializedHeadingNode {
  return {
    ...super.exportJSON(),
    tag: this.getTag(),
  };
}
```

#### `LexicalNode.importJSON()`

You can control how a `LexicalNode` is deserialized back into a node from JSON by adding an `importJSON()` method.

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

importJSON(jsonNode: SerializedLexicalNode): LexicalNode
```

This method works in the opposite way to how `exportJSON` works. Lexical uses the `type` field on the JSON object to determine what Lexical node class it needs to map to, so keeping the `type` field consistent with the `getType()` of the LexicalNode is essential.

You should use the `updateFromJSON` method in your `importJSON` to simplify the implementation and allow for future extension by the base classes.

Here's an example of `importJSON` for the `HeadingNode`:

```ts
static importJSON(serializedNode: SerializedHeadingNode): HeadingNode {
  return $createHeadingNode().updateFromJSON(serializedNode);
}

updateFromJSON(
  serializedNode: LexicalUpdateJSON<SerializedHeadingNode>,
): this {
  return super.updateFromJSON(serializedNode).setTag(serializedNode.tag);
}
```

#### `LexicalNode.updateFromJSON()`

`updateFromJSON` is a method introduced in Lexical 0.23 to simplify the implementation of `importJSON`, so that a base class can expose the code that it is using to set all of the node's properties based on the JSON to any subclass.

:::note

The input type used in this method is not sound in the general case, but it is safe if subclasses only add optional properties to the JSON. Even though it is not sound, the usage in this library is safe as long as your `importJSON` method does not upcast the node before calling `updateFromJSON`.

```ts
export type SerializedExtendedTextNode = Spread<
  // UNSAFE. This property is not optional
  { newProperty: string },
  SerializedTextNode
>;
```

```ts
export type SerializedExtendedTextNode = Spread<
  // SAFE. This property is not optional
  { newProperty?: string },
  SerializedTextNode
>;
```

This is because it's possible to cast to a more general type, e.g.

```ts
const serializedNode: SerializedTextNode = { /* ... */ };
const newNode: TextNode = $createExtendedTextNode();
// This passes the type check, but would fail at runtime if the updateFromJSON method required newProperty
newNode.updateFromJSON(serializedNode);
```

:::

### Declarative serialization schemas with `$config`

:::caution Experimental

The schema and export-context APIs in this section and the next are
experimental: the details may change in any release without a
deprecation period.

:::

Instead of writing `importJSON`, `updateFromJSON` and `exportJSON` by hand, a
node that uses [`$config`](../concepts/nodes.mdx#creating-custom-nodes-with-config-and-nodestate)
can declare a schema for its node-specific serialized properties with the
`json` property, built with `nodeSchema<MyNode>`. The schema is the single
source of truth for both directions:
the base `updateFromJSON` applies it automatically, the base `exportJSON`
writes from it, `$config` synthesizes `importJSON` when the constructor has no
required arguments, and every built-in node in Lexical now declares one. Most
custom nodes need no JSON serialization code at all.

```ts
import {
  $getDocument,
  ElementNode,
  enumValue,
  nodeSchema,
  numberValue,
} from 'lexical';

class CounterNode extends ElementNode {
  __count = 0;
  __variant: 'a' | 'b' = 'a';

  // Node properties live on the node, so a clone has to carry them across.
  // These two are declared through accessor methods, which name no field for
  // the schema to copy, so the class carries them itself; a property declared
  // with `withField` needs none of this. See "Carrying properties across a
  // clone" below.
  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__count = prevNode.__count;
    this.__variant = prevNode.__variant;
  }

  createDOM(): HTMLElement {
    return $getDocument().createElement('div');
  }

  updateDOM(): boolean {
    return false;
  }

  $config() {
    return this.config('counter', {
      extends: ElementNode,
      json: nodeSchema<CounterNode>({
        count: numberValue(),
        variant: enumValue(['a', 'b']),
      }),
    });
  }

  setCount(count: number): this {
    const self = this.getWritable();
    self.__count = count;
    return self;
  }

  setVariant(variant: 'a' | 'b'): this {
    const self = this.getWritable();
    self.__variant = variant;
    return self;
  }

  getCount(): number {
    return this.getLatest().__count;
  }

  getVariant(): 'a' | 'b' {
    return this.getLatest().__variant;
  }
}
```

`count` and `variant` are parsed through `setCount` and `setVariant` and
written through `getCount` and `getVariant`, so neither `updateFromJSON` nor
`exportJSON` has to be written at all — the rest of the class is the ordinary
node boilerplate the schema does not touch.

Each property's schema is built from composable helpers exported by
`lexical`:

- [`stringValue(defaultValue = '')`](/docs/api/modules/lexical#stringvalue), [`numberValue(defaultValue = 0, {min, max, integer}?)`](/docs/api/modules/lexical#numbervalue), and [`booleanValue(defaultValue = false)`](/docs/api/modules/lexical#booleanvalue) — primitive values with defaults. `numberValue` also reads a string spelled as a JSON number (`"120"` → `120`), so a document that stringified its numbers keeps them; notations JSON itself can not produce (`"0x10"`, `"+1"`, `"Infinity"`) stay out of domain, and the domain it reports is still `number`
- [`enumValue(values, defaultValue = values[0])`](/docs/api/modules/lexical#enumvalue) — one of a fixed set of values
- [`nullable(inner, {defaultAsNull}?)`](/docs/api/modules/lexical#nullable) — the property may also be `null`
- [`optional(inner, {omitDefault}?)`](/docs/api/modules/lexical#optional) — the property may be `undefined`
- [`arrayValue(item)`](/docs/api/modules/lexical#arrayvalue) — an array of `item` values. Like `objectValue`, it compares by content rather than by reference (see `isEqual` below), so an array-valued property equal to its default still compacts away
- [`unionValue(members, defaultValue)`](/docs/api/modules/lexical#unionvalue) — the first member schema whose domain contains the value wins, and the union yields what that member parsed. A member that normalizes its input composes here the same way it behaves alone, so `unionValue([numberValue(), enumValue(['inherit'])], 'inherit')` reads `"640"` as `640` and `"inherit"` as `'inherit'`
- [`transformValue(inner, transform, {isEqual}?)`](/docs/api/modules/lexical#transformvalue) — normalizes what `inner` parsed into the stored domain; introspection still describes `inner`'s accepted input domain. `inner`'s `isEqual` is not inherited, since the transformed domain may be a different type entirely — pass one when the output domain is reference-typed
- [`aliasedValue(inner, aliases)`](/docs/api/modules/lexical#aliasedvalue) — a lookup-table normalization: a string matching a key of `aliases` yields the value it names, and anything else is `inner`'s to validate, so the domain, the default and the equality all stay `inner`'s. This is `transformValue` narrowed to the case where the normalization is a lookup, and the reason to prefer it is that the lookup is *data*: it is part of the schema's introspectable `meta`, where tooling can see it — example generation produces the legacy spellings, and a code generator can compile the table instead of being unable to see inside a function. `TextNode` declares its legacy `format: 'bold'` and `detail: 'directionless'` shorthands this way
- [`rawValue()`](/docs/api/modules/lexical#rawvalue) — an escape hatch that passes the value through unparsed
- [`nodeSchema<MyNode>(fields)`](/docs/api/modules/lexical#nodeschema) — the record of properties, and what `$config`'s `json` takes. The one type argument names the node, which is what lets every `field`, accessor and `when` predicate be checked against it: a name the node does not have is a compile error at the property that declares it, with the correction suggested (`Type '"__langauge"' is not assignable to type 'MemberOf<CodeNode>'. Did you mean '"__language"'?`). Declaring the schema above the class it names is fine — a class's *type* is in scope before its definition
- [`objectValue(fields)`](/docs/api/modules/lexical#objectvalue) — the same record without the node check, for a property whose value is itself an object. A node's own schema should use `nodeSchema`, and `$config` requires it
- [`withAccessors(schema, {getter, setter})`](/docs/api/modules/lexical#withaccessors) — name the methods a property is applied and read through when they are not the conventional `set<Property>`/`get<Property>` (e.g. `text` uses `setTextContent`/`getTextContent`). Pass `null` instead of a name for a property that has no such direction: `{setter: null}` declares a *derived* property, written on export but computed rather than read on import (`ListNode`'s `tag` follows from its `listType`), and `{getter: null}` declares one that is parsed but never written. A property whose accessor cannot be resolved is an error at editor-creation time rather than a silently dropped value, so declaring `null` is how you opt out on purpose
- [`withField(schema, {field, getter?, setter?, decode?, encode?, when?})`](/docs/api/modules/lexical#withfield) — declare that the property *is* a node field, rather than a pair of accessor methods. Exporting reads the field and importing assigns it, with no method call on either side and no version resolution in either direction — the node being parsed into is already writable, and the node being exported is one the walk already resolved from the EditorState — so this is the fast path for a property stored verbatim. Because the schema records the field rather than a bare name, tooling can tell a field from a method without knowing how a node names its fields — enough for a codegen pass to emit a specialized parser for a hot node type. Each direction still *stands in for* an accessor: any class that overrides it between the declaring class and the node's own has said the field and the method are not equivalent, and it wins — the field access is abandoned and the method is called, so migrating a property to a field is not a behavior change for anyone who overrode its accessor. That accessor is the conventional `get<Prop>`/`set<Prop>` unless `getter`/`setter` name a different one, so most declarations need neither: name one only where the accessor is spelled differently, as `TextNode`'s `text` is (`getTextContent`) and `LinkNode`'s `url` is (`getURL`). A node with no such method defers to nothing, which needs no declaring either. `decode`/`encode` are lookup tables between the stored and serialized forms (`TextNode` stores `mode` as a number and serializes it as a name), keeping such a property on the direct-field path without an accessor method in between. The two directions can also be declared separately with `withAccessors(schema, {getter: {field: '__x'}, setter: 'setX'})`, which reads the field directly but writes through a method that normalizes.

A property that is only persisted in some states names the predicate that
decides, with `when`, rather than going through a hand-written getter:

```ts
textFormat: withAccessors(numberValue(), {
  getter: {
    field: '__textFormat',
    method: 'getSerializedTextFormat',
    when: 'shouldSerializeTextStyles',
  },
}),
```

The property is written only when its value differs from the schema default
*and* the predicate returns true. Testing the default first is what keeps the
predicate off the common path, so an element with nothing to persist never
calls it. The predicate must be pure and take no arguments: the walk calls it
once per property that names it, while generated code hoists a predicate that
several properties share and calls it once in total. This is how `ElementNode`
persists `textFormat` and `textStyle` only for an element with no `TextNode`
child, without either property leaving the direct-field path.

`withField(schema, {field, when})` declares the same thing for a property that
is the field in both directions. Either way, the gate belongs to the export
direction — there is nothing to gate on the way in, since a property that was
not written is simply absent — so naming `when` on a setter is a compile error,
like naming the wrong value table. And like the field read itself, the gate is
what the accessor stands in for: if a subclass overrides that accessor, the
field and the predicate are both abandoned and the method is called instead,
because a method that replaces the read replaces the decision to make it.

#### Names are checked against the node

`nodeSchema<MyNode>` takes one type argument naming the node, and that is what
lets every `field`, accessor `method` and `when` predicate be verified to
exist. A name the node does not have is a compile error at the property that
declares it, with the correction suggested:

```
Type '"__langauge"' is not assignable to type 'MemberOf<CodeNode>'.
  Did you mean '"__language"'?
```

This matters because the failure it replaces was silent. A misspelled field
name means the property simply stops round-tripping; a misspelled accessor
name means the subclass-override guard quietly stops applying. Neither throws,
and neither shows up in the exported JSON as anything but a missing property.

`$config`'s `json` requires a schema built this way, so the check cannot be
skipped by reaching for `objectValue` instead — that one is for a property
whose *value* is an object, and it does not name a node to check against.
Declaring the schema above the class it names is fine, and is what every
built-in node does: a class's *type* is in scope before its definition.

The check is TypeScript-only. Under Flow, or from JavaScript, the same
mistakes are caught when the editor registers the node — later, but before any
document is serialized — so nothing depends on the compile-time check being
the only line of defense.

A schema's default is compared by identity, which is right for the primitive
domains. `arrayValue` and `objectValue` return a fresh value per parse, so they
declare an `isEqual` that compares by content — otherwise a property equal to
its default could never be omitted, since no two parses are the same object.
The same rule drives `optional({omitDefault})` and `nullable({defaultAsNull})`,
and a schema of your own can declare `isEqual` for a domain with the same
problem. A default is also deeply frozen, since it is one value shared by every
node that has none of its own — including as `createState`'s default, which
`$getState` hands back directly.

Parsing is total: a missing or out-of-domain value falls back to the
schema's default instead of throwing, which is the domain importers actually
face (older documents predate a property; a compact export omits a property
whose value is its default). Each parsed property is applied through the
node's setter — `set<Property>`, or the name given with `withAccessors` — so
subclass overrides of those setters are honored, and a subclass schema field
with the same serialized property name overrides its ancestor's.

The same declaration drives the export direction: the base `exportJSON` writes
every declared property, reading each through its getter, so a node needs no
`exportJSON` of its own either. A getter that returns `undefined` omits its
property — absent and explicitly-`undefined` are indistinguishable once the
JSON is stringified, so that is how an optional or conditionally-persisted
property is expressed. Override `exportJSON` only for output a schema cannot
describe, and call `super.exportJSON()` when you do.

Because the node itself declares the schema, tooling can introspect it. The
`@lexical/fast-check` package derives property-based test generators
directly from a node class (`nodeArbitrary(TextNode)`), so a single
declaration powers both parsing and example generation in tests.

#### Carrying properties across a clone

A node is cloned on the first write of every update, and a property that the
clone does not carry reverts to its constructor default there — silently, since
the field still exists and still holds a valid value. Declaring a property as a
field says where it is stored, so that is where `afterCloneFrom` comes from
too: a class that declares only fields needs no `afterCloneFrom` at all, and one
that declares some gets those carried without writing them out again.

```ts
class CalloutNode extends ElementNode {
  __label: string = '';

  // No afterCloneFrom: `__label` is declared below, so it is carried.
  $config() {
    return this.config('callout', {
      extends: ElementNode,
      json: nodeSchema<CalloutNode>({
        label: withField(stringValue(), {field: '__label'}),
      }),
    });
  }
}
```

Both directions are read, so a property declared with `withAccessors` in one
direction and a field in the other is still carried, and so is one whose
accessor a subclass overrides — where the value is *stored* does not change
when the way it is serialized does.

Two cases stay the class's own, and both follow the same rule the synthesized
`clone` and `importJSON` follow — declare it yourself and you own it:

- **A property declared through accessor methods on both sides**, like
  `MarkNode`'s `ids` (`getIDs`/`setIDs`) or `CounterNode`'s above. The schema
  names no field, so there is nothing to copy, and the class writes an
  `afterCloneFrom` for it.
- **A class that defines its own `afterCloneFrom`**, which is left alone and is
  then responsible for all of its own properties. `ElementNode` is one: its
  clone also has to carry `__first`, `__last`, `__size` and its slot
  bookkeeping, none of which any schema describes.

`@lexical/fast-check` is the way to hold a node to this, whichever case it
falls into — see [Generated tests](/docs/packages/lexical-fast-check). A
hand-written fixture tends to leave properties at their defaults, and a dropped
property compares equal to its default, so the bug is invisible exactly when
the test looks like it passed.

### Compact JSON

By default `exportJSON` writes every property, producing the historical
("legacy") format, and a bare `editorState.toJSON()` does too — existing
persistence pipelines are unaffected until you opt in. With schemas declared,
Lexical can also write a *compact* form, which omits:

- any property whose value is the schema default parsing would restore,
- any property the parser derives rather than reads (declared `{setter: null}`,
  such as `ListNode`'s `tag`),
- the deprecated `version` property.

A whole document is written in the compact form by asking for it at the call
site, `editorState.toJSON(true)`, which is also what lets its return type say
which of the two shapes came back: the compact form omits properties, so it is
typed as `CompactSerializedEditorState` rather than `SerializedEditorState`.
Calling `toJSON()` with no argument writes the form of an enclosing
`$withCompactExport`, which is what keeps a nested editor (an image caption) in
the same form as the document containing it.

Anything with a call site of its own should take the form as an argument. The
exception is a schema getter: the walk calls `get<Prop>()` with no arguments —
the contract that lets `getTextContent` and `getURL` be ordinary node methods —
so a getter whose value depends on the form reads `$isCompactExport()` instead.
That reports the surrounding **walk**'s form, which `$withCompactExport`
establishes and `editorState.toJSON(compact)` therefore does too, since it uses
it internally. It is deliberately not set by a node's own
`exportJSON(compact)`: that method already takes the form as an argument, and
having it set the walk's form would report a whole document as compact when a
single node was asked to be.

Parsing restores each, so both forms describe the same document. The compact
form leads each node with `type`, where the legacy form ends with `type` and
`version`; key order is part of neither format, since parsing reads properties
by name. Compaction happens as the properties are written rather than as a
pass over the finished object, so a derived property is skipped without even
calling its getter — and a node with generated serialization code (see below)
inlines the same decisions and never consults the schema at runtime.

Know what the smaller form buys you before reaching for it. The raw JSON is
much smaller — a representative rich document compacts to well under half the
legacy byte count — which matters to consumers of the *objects*: structured
clones into IndexedDB, in-memory copies, messages between workers. After
gzip the two are typically a wash (the omitted properties are exactly the
most repetitive, most compressible bytes; the same benchmark document came
out a few percent *larger* compressed), so compact mode is not a wire-size
optimization for a pipeline that already compresses.

:::caution

The compact form is readable only by a Lexical new enough to parse it — the
omitted properties are restored from the schema, which older versions do not
have. Persisted documents outlive the code that wrote them, so keep writing the
legacy form until every reader is upgraded.

:::

An export with no `compact` argument of its own — the `@lexical/clipboard`
selection export inside a copy handler, a serialization walk you wrote, and the
nested editors either of those serializes — takes its form from an enclosing
`$withCompactExport`:

```ts
import {$generateJSONFromSelectedNodes} from '@lexical/clipboard';
import {$getSelection, $withCompactExport} from 'lexical';

const selectionJSON = $withCompactExport(true, () =>
  $generateJSONFromSelectedNodes(editor, $getSelection()),
);
```

The callback must be synchronous. The form is restored as soon as it returns,
so an `async` callback would give the form up at its first `await` and export
in whatever form is ambient when it resumes; passing one is a type error at the
call site, and a runtime error in every build.

### Generated serialization code

Because a schema states everything ahead of time — which accessor or field
each property uses, what its default is, what its domain admits — the
serialization it drives can be compiled to straight-line code instead of
interpreted from the schema at runtime. Lexical's most common built-in nodes
ship such code, generated from their own schemas at build time and producing
byte-identical JSON to the schema-driven path.

None of this changes how you write a node: it is the same JSON, faster, and a
custom node needs nothing for it — the schema-driven path serves them. If you
are working on Lexical itself, see
[the generated JSON code](/docs/maintainers-guide#pnpm-run-generate-node-json)
in the maintainers' guide.

### `exportJSON` serializes the version it is called on

One behavior changed when properties became schema declarations, and it affects
code that calls `exportJSON` directly.

A property declared with `withField` is read straight off the node. That is the
optimization the serialization walk is built on — every node the walk reaches
comes from the `EditorState`'s node map and is already the current version, so
the walk resolves nothing per node. Previously each property went through its
accessor, and every accessor resolves `getLatest()`, so a stale node reference
still exported current values.

It no longer does. If you hold a reference that a `getWritable()` — that is,
any `set<Property>` call — has since superseded, `exportJSON()` on it writes
the pre-mutation values:

```ts
const stale = node;
node.setStyle('color: red');   // clones; `stale` is now a previous version
stale.exportJSON();            // ← the old style
stale.getLatest().exportJSON(); // ← the new one
```

Call `getLatest()` first when you hold such a reference. Nothing inside Lexical
does: the walk, the `@lexical/clipboard` selection export and
`editorState.toJSON()` all start from the node map. This matters only for a
node reference you kept across a mutation and then exported by hand.

### Versioning & Breaking Changes

It's important to note that you should avoid making breaking changes to existing fields in your JSON object, especially if backwards compatibility is an important part of your editor. Lexical's own `version` property is deprecated and no longer the way to do this — it is optional in both directions, nothing reads it, and the reason it does not work is explained under [Dangers of a flat version property](#dangers-of-a-flat-version-property). Evolve your serialized type additively instead, and give each new property a default its parser can fall back to. Here's the serialized type definition for Lexical's base `TextNode` class:

```ts
import type {Spread} from 'lexical';

// Spread is a Typescript utility that allows us to spread the properties
// over the base SerializedLexicalNode type.
export type SerializedTextNode = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
  },
  SerializedLexicalNode
>;
```

If we wanted to make changes to the above `TextNode`, we should be sure to not remove or change an existing property, as this can cause data corruption. Instead, opt to add the functionality as a new optional property field instead.

```ts
export type SerializedTextNode = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
    // Our new field we've added
    newField?: string,
  },
  SerializedLexicalNode
>;
```

### Dangers of a flat version property

The `updateFromJSON` method should ignore `type` and `version`, to support subclassing and code re-use. Ideally, you should only evolve your types in a backwards compatible way (new fields are optional), and/or have a uniquely named property to store the version in your class. Generally speaking, it's best if nearly all properties are optional and the node provides defaults for each property. This allows you to write less boilerplate code and produce smaller JSON.

The reason that `version` is no longer recommended is that it does not compose with subclasses. Consider this hierarchy:

```ts
class TextNode {
  exportJSON() {
    return { /* ... */, version: 1 };
  }
}
class ExtendedTextNode extends TextNode {
  exportJSON() {
    return { ...super.exportJSON() };
  }
}
```

If `TextNode` is updated to `version: 2` then this version and new serialization will propagate to `ExtendedTextNode` via the `super.exportJSON()` call, but this leaves nowhere to store a version for `ExtendedTextNode` or vice versa. If the `ExtendedTextNode` explicitly specified a `version`, then the version of the base class will be ignored even though the representation of the JSON from the base class may change:

```ts
class TextNode {
  exportJSON() {
    return { /* ... */, version: 2 };
  }
}
class ExtendedTextNode extends TextNode {
  exportJSON() {
    // The super's layout has changed, but the version information is lost
    return { ...super.exportJSON(), version: 1 };
  }
}
```

So then you have a situation where there are possibly two JSON layouts for `ExtendedTextNode` with the same version, because the base class version changed due to a package upgrade.

If you do have incompatible representations, it's probably best to choose a new type. This is basically the only way that will force old configurations to fail, as `importJSON` implementations often don't do runtime validation and dangerously assume that the values are the correct type.

There are other schemes that would allow for composable versions, such as nesting the superclass data, or choosing a different name for a version property in each subclass. In practice, explicit versioning is generally redundant if the serialization is properly parsed, so it is recommended that you use the simpler approach with a flat representation with mostly optional properties.
