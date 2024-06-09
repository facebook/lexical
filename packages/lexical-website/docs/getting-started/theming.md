---
sidebar_position: 3
---

# Theming

Lexical tries to make theming straight-forward, by providing a way of passing a customizable theming object that maps CSS class names to the editor on creation. Here's an example of a plain-text theme:

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
};
```

In your CSS, you can then add something like:

```css
.ltr {
  text-align: left;
}

.rtl {
  text-align: right;
}

.editor-placeholder {
  color: #999;
  overflow: hidden;
  position: absolute;
  top: 15px;
  left: 15px;
  user-select: none;
  pointer-events: none;
}

.editor-paragraph {
  margin: 0 0 15px 0;
  position: relative;
}
```

To apply it, you need to pass it to your editor instance. If you're using a framework like React, this is done by
passing it as a property of the `initialConfig` to `<LexicalComposer>`, like shown:

```jsx
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {exampleTheme} from './exampleTheme';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';

const initialConfig = {namespace: 'MyEditor', theme: exampleTheme};

export default function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div className="editor-placeholder">Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  );
}
```

If you are using vanilla JS, you can pass it to the `createEditor()` function, like shown:

```js
import {createEditor} from 'lexical';

const editor = createEditor({
  namespace: 'MyEditor',
  theme: exampleTheme,
});
```

Many of the Lexical's core nodes also accept theming properties. Here's a more comprehensive theming object:

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listItem',
    listitemChecked: 'editor-listItemChecked',
    listitemUnchecked: 'editor-listItemUnchecked',
  },
  hashtag: 'editor-hashtag',
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-textBold',
    code: 'editor-textCode',
    italic: 'editor-textItalic',
    strikethrough: 'editor-textStrikethrough',
    subscript: 'editor-textSubscript',
    superscript: 'editor-textSuperscript',
    underline: 'editor-textUnderline',
    underlineStrikethrough: 'editor-textUnderlineStrikethrough',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};
```
