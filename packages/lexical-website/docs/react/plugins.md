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
/>
```

### `LexicalRichTextPlugin`

React wrapper for `@lexical/rich-text` that adds major features for rich text editing, including typing, deletion, copy/pasting, indent/outdent and bold/italic/underline/strikethrough text formatting

```jsx
<RichTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>Enter some text...</div>}
/>
```

### `LexicalOnChangePlugin`

Plugin that calls `onChange` whenever Lexical state is updated. Using `ignoreInitialChange` (`true` by default) and `ignoreSelectionChange` (`false` by default) can give more granular control over changes that are causing `onChange` call

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

### `LexicalAutoLinkPlugin`

Plugin will convert text into links based on passed matchers list. In example below whenever user types url-like string it will automaticaly convert it into a link node

```jsx
const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const MATCHERS = [
  (text) => {
    const match = URL_MATCHER.exec(text);
    return (
      match && {
        index: match.index,
        length: match[0].length,
        text: match[0],
        url: match[0],
      }
    );
  },
];

...

<AutoLinkPlugin matchers=[MATCHERS] />
```

### `LexicalAutoScrollPlugin`

Lexical auto-scrolls its contenteditable container while typing. This plugin can be used for cases when other element up in a DOM tree needs to be scrolled (e.g. when editor is rendered within dialog with limited height):

```jsx
<div ref={containerWithScrollRef}>
  <LexicalComposer>
    ...
    <AutoScrollPlugin scrollRef={containerWithScrollRef} />
  </LexicalComposer>
</div>
```

### `LexicalClearEditorPlugin`

Adds `clearEditor` command support to clear editor's content

### `LexicalMarkdownShortcutPlugin`

Adds markdown shortcut support: headings, lists, code blocks, quotes, links and inline styles (bold, italic, strikethrough)
