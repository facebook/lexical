---
sidebar_position: 1
---

# Lexical Plugins

React-based plugins are using Lexical editor instance from `<LexicalComposer>` context:

```js
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
```

```jsx
const initialConfig = {
  namespace: 'MyEditor',
  theme,
  onError,
};

<LexicalComposer initialConfig={initialConfig}>
  <PlainTextPlugin
    contentEditable={<ContentEditable />}
    placeholder={<div>Enter some text...</div>}
  />
  <HistoryPlugin />
  <OnChangePlugin onChange={onChange} />
  ...
</LexicalComposer>
```

> Note: Many plugins might require you to register the one or many Lexical nodes in order for the plugin to work. You can do this by passing a reference to the node to the `nodes` array in your initial editor configuration.

```jsx
const initialConfig = {
  namespace: 'MyEditor',
  theme,
  nodes: [ListNode, ListItemNode], // Pass the references to the nodes here
  onError,
};
```

### `LexicalPlainTextPlugin`

React wrapper for `@lexical/plain-text` that adds major features for plain text editing, including typing, deletion and copy/pasting

```jsx
<PlainTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>Enter some text...</div>}
  ErrorBoundary={LexicalErrorBoundary}
/>
```

### `LexicalRichTextPlugin`

React wrapper for `@lexical/rich-text` that adds major features for rich text editing, including typing, deletion, copy/pasting, indent/outdent and bold/italic/underline/strikethrough text formatting

```jsx
<RichTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>Enter some text...</div>}
  ErrorBoundary={LexicalErrorBoundary}
/>
```

### `LexicalOnChangePlugin`

Plugin that calls `onChange` whenever Lexical state is updated. Using `ignoreHistoryMergeTagChange` (`true` by default) and `ignoreSelectionChange` (`false` by default) can give more granular control over changes that are causing `onChange` call

```jsx
<OnChangePlugin onChange={onChange} />
```

### `LexicalHistoryPlugin`

React wrapper for `@lexical/history` that adds support for history stack management and `undo` / `redo` commands

```jsx
<HistoryPlugin />
```

### `LexicalLinkPlugin`

React wrapper for `@lexical/link` that adds support for links, including `toggleLink` command support that toggles link for selected text

```jsx
<LinkPlugin />
```

### `LexicalListPlugin`

React wrapper for `@lexical/list` that adds support for lists (ordered and unordered)

```jsx
<ListPlugin />
```

### `LexicalCheckListPlugin`

React wrapper for `@lexical/list` that adds support for check lists. Note that it requires some css to render check/uncheck marks. See PlaygroundEditorTheme.css for details.

```jsx
<CheckListPlugin />
```

### `LexicalTablePlugin`

React wrapper for `@lexical/table` that adds support for tables

```jsx
<TablePlugin />
```

### `LexicalTabIndentationPlugin`

Plugin that allows tab indentation in combination with `@lexical/rich-text`.

```jsx
<TabIndentationPlugin />
```

### `LexicalAutoLinkPlugin`

Plugin will convert text into links based on passed matchers list. In example below whenever user types url-like string it will automaticaly convert it into a link node

```jsx
const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const MATCHERS = [
  (text) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
      // attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
    };
  },
];

...

<AutoLinkPlugin matchers={MATCHERS} />
```

### `LexicalClearEditorPlugin`

Adds `clearEditor` command support to clear editor's content

### `LexicalMarkdownShortcutPlugin`

Adds markdown shortcut support: headings, lists, code blocks, quotes, links and inline styles (bold, italic, strikethrough)

### `TableOfContentsPlugin`
This plugin allows you to navigate to certain sections of the page by clicking on headings that exist inside these sections. Once you load the plugin, it automatically collects and injects the headings of the page inside the table of contents, then it listens to any deletions or modifications to those headings and updates the table of contents. Additionally, it's able to track any newly added headings and inserts them in the table of contents once they are created. This plugin also supports lazy loading - so you can defer adding the plugin until when the user needs it.
```jsx
<TableOfContentsPlugin />
```
You can alternatively leverage the use of `LexicalTableOfContents` API, which provides you with all the functioanlity that `TableOfContentsPlugin` provides, but without any styling.
In order to use `LexicalTableOfContents`, you need to pass a callback function in its children. This callback function gives you access to the up-to-date data of the table of contents. You can access this data through a single parameter for the callback which comes in the form of an array of arrays `[[headingKey, headingTextContent, headingTag], [], [], ...]`
`headingKey`: Unique key that identifies the heading.`headingTextContent`: A string of the exact text of the heading.`headingTag`: A string that reads either 'h1', 'h2', or 'h3'.
```jsx
<LexicalTableOfContents>
  {(tableOfContentsArray) => {
    return <MyCustomTableOfContetsPlugin tableOfContents={tableOfContentsArray} />;
  }}
</LexicalTableOfContents>
```

### `LexicalEditorRefPlugin`

Allows you to get a ref to the underlying editor instance outside of LexicalComposer, which is convenient when you want to interact with the editor
from a separate part of your application.
```jsx
  const editorRef = useRef(null);
  <EditorRefPlugin editorRef={editorRef} />
```
