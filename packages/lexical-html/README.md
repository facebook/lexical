# `@lexical/html`

# HTML
This package exports utility functions for converting `Lexical` -> `HTML` and `HTML` -> `Lexical`. These same functions are also used in the `lexical-clipboard` package for copy and paste.

[Full documentation can be found here.](https://lexical.dev/docs/concepts/serialization)

### Exporting
```js
// When converting to HTML you can pass in a selection object to narrow it
// down to a certain part of the editor's contents.
const htmlString = $generateHtmlFromNodes(editor, selection | null);
```

### Importing
First we need to parse the HTML string into a DOM instance.
```js
// In the browser you can use the native DOMParser API to parse the HTML string.
const parser = new DOMParser();
const dom = parser.parseFromString(htmlString, textHtmlMimeType);

// In a headless environment you can use a package such as JSDom to parse the HTML string.
const dom = new JSDOM(htmlString);
```
And once you have the DOM instance.
```js
const nodes = $generateNodesFromDOM(editor, dom);

// Once you have the lexical nodes you can initialize an editor instance with the parsed nodes.
const editor = createEditor({ ...config, nodes });

// Or insert them at a selection.
$insertNodes(nodes);
```