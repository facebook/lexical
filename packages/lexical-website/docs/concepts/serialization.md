

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

## JSON

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

### Versioning & Breaking Changes

It's important to note that you should avoid making breaking changes to existing fields in your JSON object, especially if backwards compatibility is an important part of your editor. That's why we recommend using a version field to separate the different changes in your node as you add or change functionality of custom nodes. Here's the serialized type definition for Lexical's base `TextNode` class:

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

[Rich text sandbox](https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview)

