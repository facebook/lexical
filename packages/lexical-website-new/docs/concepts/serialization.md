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



### Copy and Paste


## JSON (Unstable)
