# `@lexical/headless`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_headless)

This package allows you to interact with Lexical in a headless environment (one that does not rely on DOM, e.g. for Node.js environment), and use its
main features like editor.update(), editor.registerNodeTransform(), editor.registerUpdateListener()
to create, update or traverse state.

Install `@lexical/headless`:

```
npm install --save @lexical/headless
```

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
