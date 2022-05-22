---
sidebar_position: 9
---

# Serialization/Deserialization

Internally, Lexical maintains the state of a given editor in memory, updating it in response to user inputs. Sometimes, it's useful to convert this state into a serialized format in order to transfer it between editors or store it for retrieval at some later time. In order to make this process easier, Lexical provides some APIs that allow Nodes to specify how they should be represented in common serialized formats.

## HTML

Currently, HTML serialiaztion is primarily used to transfer data between Lexical and non-Lexical editors (such as Google Docs or Quip) via the copy & paste functionality in @lexical/clipboard. In the future, we plan to add top-level APIs to simply output HTML based on the current editor state

The serialization to HTML for a given Node is controlled by the exportDOM API:

```
exportDOM(editor: LexicalEditor): DOMExportOutput
```

When transforming an editor state into HTML, we simply traverse the current editor state (or the selected subset thereof) and call the exportDOM method for each Node in order to convert it to an HTMLElement.

Sometimes, it's necessary of useful to do some post-processing after a node has been converted to HTML. For this, we expose the "after" API on DOMExportOutput, which allows exportDOM to specify a function that should be run after the conversion to an HTMLElement has happened.

```
export type DOMExportOutput = {
  after?: (generatedElement: ?HTMLElement) => ?HTMLElement,
  element?: HTMLElement | null,
};
```

If the element property is null in the return value of exportDOM, that Node will not be represented in the serialized output.

Deserialization from HTML is controlled by the importDOM API:

```
static importDOM(): DOMConversionMap | null;
```
The return value of importDOM is a map of the lower case (DOM) [Node.nodeName](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeName) property to an object that specifies a conversion function and a priority for that conversion. This allows Lexical Nodes to specify which type of DOM nodes they can convert and what the relative priority of their conversion should be. This is useful in cases where a DOM Node with specific attributes should be interpreted as one type of LexicalNode, and otherwise it should be represented as another type of Lexical Node.

```
export type DOMConversionMap = {
  [NodeName]: (node: Node) => DOMConversion | null,
};

export type DOMConversion = {
  conversion: DOMConversionFn,
  priority: 0 | 1 | 2 | 3 | 4,
};

export type DOMConversionFn = (
  element: Node,
  parent?: Node,
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

@lexical/code provides a good example of the usefulness of this design. GitHub uses HTML /<table> elements to represent the structure of copied code in HTML. If we interpreted all HTML /<table> elements as literal tables, then code pasted from GitHub would appear in Lexical as a Lexical TableNode. Instead, CodeNode specifies that it can handle /<table> elements too:

```
class CodeNode extends ElementNode {
    ...
static importDOM(): DOMConversionMap | null {
    return {
     ...
      table: (node: Node) => {
        const table = node;
        // domNode is a <table> since we matched it by nodeName
        if (isGitHubCodeTable(table as HTMLTableElement)) {
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

If the imported /<table> doesn't align with the expected GitHub code HTML, then we return null and allow the node to be handled by lower priority conversions.

Much like exportDOM, importDOM exposes APIs to allow for post-processing of converted Nodes. The conversion function returns a DOMConversionOutput which can specify a function to run for each converted child (forChild) or on all the child nodes after the conversion is complete (after). The key difference here is that ```forChild``` runs for every deeply nested child node of the current node, whereas ```after``` will run only once after the transformation of the node and all its children is complete.

```
export type DOMConversionFn = (
  element: Node,
  parent?: Node,
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
