---
sidebar_position: 3
---

# Theming

Lexical tries to make theming straight-forward, by proving a way of passing a customizable theming object that maps CSS class names to the editor on creation. Here's an example of a plain-text theme:

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
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
it as a property of the `initialConfig` to `<LexicalComposer>`, like shown:

```jsx
import LexicalComposer from '@lexical/react/LexicalComposer';
import {exampleTheme} from './exampleTheme';

const initialConfig = {theme: exampleTheme};

export default function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container">...</div>
    </LexicalComposer>
  );
}
```

If you are using vanilla JS, you can pass it to the `createEditor()` function, like shown:

```js
import {createEditor} from 'lexical';

const editor = createEditor({
  theme: exampleTheme,
});
```

Many of the Lexical's core nodes also accept theming properies. Here's a more comprehensive theming object:

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    overflowed: 'editor-text-overflowed',
    hashtag: 'editor-text-hashtag',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
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
