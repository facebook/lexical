---
sidebar_position: 9
---

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

#### `LexicalNode.importDOM()`
You can control how an `HTMLElement` is represented in `Lexical` by adding an `importDOM()` method to your `LexicalNode`.

```js
static importDOM(): DOMConversionMap | null;
```
The return value of `importDOM` is a map of the lower case (DOM) [Node.nodeName](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeName) property to an object that specifies a conversion function and a priority for that conversion. This allows `LexicalNodes` to specify which type of DOM nodes they can convert and what the relative priority of their conversion should be. This is useful in cases where a DOM Node with specific attributes should be interpreted as one type of `LexicalNode`, and otherwise it should be represented as another type of `LexicalNode`.

```js
export type DOMConversionMap = {
  [NodeName]: <T: HTMLElement>(node: T) => DOMConversion | null,
};

export type DOMConversion = {
  conversion: DOMConversionFn,
  priority: 0 | 1 | 2 | 3 | 4,
};

export type DOMConversionFn = (
  element: Node,
  parent?: Node,
  preformatted?: boolean,
) => DOMConversionOutput;

export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>,
  forChild?: DOMChildConversion,
  node: LexicalNode | null,
};

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
) => LexicalNode | null | void;
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
          priority: 4,
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

Much like `exportDOM`, `importDOM` exposes APIs to allow for post-processing of converted Nodes. The conversion function returns a `DOMConversionOutput` which can specify a function to run for each converted child (forChild) or on all the child nodes after the conversion is complete (after). The key difference here is that ```forChild``` runs for every deeply nested child node of the current node, whereas ```after``` will run only once after the transformation of the node and all its children is complete. Finally, `preformatted` flag indicates that nested text content is preformatted (similar to `<pre>` tag) and all newlines and spaces should be preserved as is.

```js
export type DOMConversionFn = (
  element: Node,
  parent?: Node,
  preformatted?: boolean,
) => DOMConversionOutput;

export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>,
  forChild?: DOMChildConversion,
  node: LexicalNode | null,
};

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null;
```


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

You can control how a `LexicalNode` is represented as JSON by adding an `exportJSON()` method. It's important to ensure your serialized JSON node has a `type` field and a `children` field if it's an `ElementNode`.

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
    type: 'heading';
    version: 1;
  },
  SerializedElementNode
>;

exportJSON(): SerializedHeadingNode {
  return {
    ...super.exportJSON(),
    tag: this.getTag(),
    type: 'heading',
    version: 1,
  };
}
```

#### `LexicalNode.importJSON()`

You can control how a `LexicalNode` is serialized back into a node from JSON by adding an `importJSON()` method.

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

importJSON(jsonNode: SerializedLexicalNode): LexicalNode
```

This method works in the opposite way to how `exportJSON` works. Lexical uses the `type` field on the JSON object to determine what Lexical node class it needs to map to, so keeping the `type` field consistent with the `getType()` of the LexicalNode is essential.

Here's an example of `importJSON` for the `HeadingNode`:

```js
static importJSON(serializedNode: SerializedHeadingNode): HeadingNode {
  const node = $createHeadingNode(serializedNode.tag);
  node.setFormat(serializedNode.format);
  node.setIndent(serializedNode.indent);
  node.setDirection(serializedNode.direction);
  return node;
}
```

### Versioning & Breaking Changes

It's important to note that you should avoid making breaking changes to existing fields in your JSON object, especially if backwards compatibility is an important part of your editor. That's why we recommend using a version field to separate the different changes in your node as you add or change functionality of custom nodes. Here's the serialized type definition for Lexical's base `TextNode` class:

```js
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

If we wanted to make changes to the above `TextNode`, we should be sure to not remove or change an existing property, as this can cause data corruption. Instead, opt to add the functionality as a new property field instead, and use the version to determine how to handle the differences in your node.

```js
export type SerializedTextNodeV1 = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
    version: 1,
  },
  SerializedLexicalNode
>;

export type SerializedTextNodeV2 = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
    // Our new field we've added
    newField: string,
    // Notice the version is now 2
    version: 2,
  },
  SerializedLexicalNode
>;

export type SerializedTextNode = SerializedTextNodeV1 | SerializedTextNodeV2;
```
