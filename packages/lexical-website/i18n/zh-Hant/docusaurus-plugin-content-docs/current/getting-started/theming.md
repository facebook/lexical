---
sidebar_position: 3
---

# 主題設定

Lexical 嘗試讓主題設定變得簡單明瞭，提供了一種傳遞可自定義主題對象的方法，該對象在創建時將 CSS 類名映射到編輯器。以下是一個純文本主題的例子：

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
};
```

在你的 CSS 中，你可以加入類似以下的內容：

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

要應用它，你需要將其傳遞給你的編輯器實例。如果你使用像 React 這樣的框架，可以通過將其作為 `initialConfig` 的屬性傳遞給 `<LexicalComposer>` 來完成，如下所示：

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
        placeholder={
          <div className="editor-placeholder">Enter some text...</div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  );
}
```

如果你使用的是純 JavaScript，你可以將其傳遞給 `createEditor()` 函數，如下所示：

```js
import {createEditor} from 'lexical';

const editor = createEditor({
  namespace: 'MyEditor',
  theme: exampleTheme,
});
```

Lexical 的許多核心節點也接受主題屬性。以下是一個更全面的主題對象：

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
