# `@lexical/headless`

This package allows you to use interact with Lexical in a headless environment (one that does not rely on DOM, e.g. for Node.js environment), and use its
main features like editor.update(), editor.registerNodeTransform(), editor.registerUpdateListener()
to create, update or traverse state.

```js
const { createHeadlessEditor } = require('@lexical/headless');

const editor = createHeadlessEditor({
  nodes: [],
  onError: () => {},
});

editor.update(() => {
  $getRoot().append(
    $createParagraphNode().append(
      $createTextNode('Hello world')
    )
  )
});
```

Any plugins that do not rely on DOM could also be used. Here's an example of how
you can convert lexical editor state to markdown on server:
```js
const { createHeadlessEditor } = require('@lexical/headless');
const { $convertToMarkdownString, TRANSFORMERS } = require('@lexical/markdown');

app.get('article/:id/markdown', await (req, res) => {
  const editor = createHeadlessEditor({
    nodes: [],
    onError: () => {},
  });

  const articleEditorStateJSON = await loadArticleBody(req.query.id);
  editor.setEditorState(editor.parseEditorState(articleEditorStateJSON));  

  editor.update(() => {
    const markdown = $convertToMarkdownString(TRANSFORMERS);
    res.send(markdown);
  });
});

```

# HTML
This package also exports utility functions for converting `Lexical` -> `HTML` and `HTML` -> `Lexical`. These same functions are also used in the `lexical-clipboard` package for copy and paste.

### Exporting
```js
// When converting to HTML you can pass in a selection object to narrow it
// down to a certain part of the editor's contents.
const htmlString = $generateHtmlFromNodes(editor, selection | null);
```

### Importing
```js
// In the browser you can use the native DOMParser API to parse the HTML string.
const parser = new DOMParser();
const dom = parser.parseFromString(htmlString, textHtmlMimeType);

// In a headless environment you can use a package such as JSDom to parse the HTML string.
const dom = new JSDOM(htmlString);

const nodes = $generateNodesFromDOM(editor, dom);

// Once you have the lexical nodes you can initialize an editor instance with the parsed nodes.
const editor = createEditor({ ...config, nodes });

// Or insert them at a selection.
const selection = $getSelection();
selection.insertNodes(nodes);
```