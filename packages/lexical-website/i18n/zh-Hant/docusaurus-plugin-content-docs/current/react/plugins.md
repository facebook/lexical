---
sidebar_position: 1
---

# Lexical 插件

基於 React 的插件使用來自 `<LexicalComposer>` context 的 Lexical 編輯器實例：

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
    placeholder={<div>輸入一些文字...</div>}
  />
  <HistoryPlugin />
  <OnChangePlugin onChange={onChange} />
  ...
</LexicalComposer>;
```

> 注意：許多插件可能需要您註冊一個或多個 Lexical 節點才能使插件正常工作。您可以通過在初始編輯器配置中將節點的引用傳遞給 `nodes` 數組來實現這一點。

```jsx
const initialConfig = {
  namespace: 'MyEditor',
  theme,
  nodes: [ListNode, ListItemNode], // 在這裡傳遞節點的引用
  onError,
};
```

### `LexicalPlainTextPlugin`

`@lexical/plain-text` 的 React 包裝器，為純文字編輯添加了主要功能，包括打字、刪除和複製/粘貼

```jsx
<PlainTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>輸入一些文字...</div>}
  ErrorBoundary={LexicalErrorBoundary}
/>
```

### `LexicalRichTextPlugin`

`@lexical/rich-text` 的 React 包裝器，為富文本編輯添加了主要功能，包括打字、刪除、複製/粘貼、縮排/取消縮排以及加粗/斜體/下劃線/刪除線文字格式

```jsx
<RichTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>輸入一些文字...</div>}
  ErrorBoundary={LexicalErrorBoundary}
/>
```

### `LexicalOnChangePlugin`

當 Lexical 狀態更新時，調用 `onChange` 的插件。使用 `ignoreHistoryMergeTagChange`（默認為 `true`）和 `ignoreSelectionChange`（默認為 `false`）可以更細粒度地控制觸發 `onChange` 調用的更改

```jsx
<OnChangePlugin onChange={onChange} />
```

### `LexicalHistoryPlugin`

`@lexical/history` 的 React 包裝器，增加了歷史堆棧管理和 `撤銷` / `重做` 命令的支持

```jsx
<HistoryPlugin />
```

### `LexicalLinkPlugin`

`@lexical/link` 的 React 包裝器，增加了對鏈接的支持，包括 `$toggleLink` 命令支持，該命令可切換所選文字的鏈接

```jsx
<LinkPlugin />
```

### `LexicalListPlugin`

`@lexical/list` 的 React 包裝器，增加了對列表（有序和無序）的支持

```jsx
<ListPlugin />
```

### `LexicalCheckListPlugin`

`@lexical/list` 的 React 包裝器，增加了對檢查列表的支持。請注意，它需要一些 CSS 來渲染勾選/取消勾選標記。詳細信息請參見 PlaygroundEditorTheme.css。

```jsx
<CheckListPlugin />
```

### `LexicalTablePlugin`

`@lexical/table` 的 React 包裝器，增加了對表格的支持

```jsx
<TablePlugin />
```

### `LexicalTabIndentationPlugin`

允許與 `@lexical/rich-text` 結合使用的 Tab 縮排插件。

```jsx
<TabIndentationPlugin />
```

### `LexicalAutoLinkPlugin`

該插件將根據傳遞的匹配器列表將文本自動轉換為鏈接。在下面的示例中，每當用戶輸入類似 URL 的字符串時，它將自動將其轉換為鏈接節點

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
      // attributes: { rel: 'noreferrer', target: '_blank' }, // 可選鏈接屬性
    };
  },
];

...

<AutoLinkPlugin matchers={MATCHERS} />
```

### `LexicalClearEditorPlugin`

增加 `clearEditor` 命令支持以清除編輯器內容

```jsx
<ClearEditorPlugin />
```

### `LexicalMarkdownShortcutPlugin`

增加了對 Markdown 快捷方式的支持：標題、列表、代碼塊、引用、鏈接和內聯樣式（加粗、斜體、刪除線）

```jsx
<MarkdownShortcutPlugin />
```

### `LexicalTableOfContentsPlugin`

該插件允許您根據編輯器中的標題來渲染頁面的目錄。它會監聽這些標題的任何刪除或修改並更新目錄。此外，它能夠跟踪任何新添加的標題，並在它們被創建後將它們插入到目錄中。該插件還支持延遲加載 - 因此您可以推遲插件的添加，直到用戶需要時再加載。

要使用 `TableOfContentsPlugin`，您需要在其子元素中傳遞一個回調函數。此回調函數使您可以訪問目錄的最新數據。您可以通過回調的一個參數訪問這些數據，這些數據以數組形式表示 `[[headingKey, headingTextContent, headingTag], [], [], ...]`

`headingKey`：標題的唯一鍵標識符。
`headingTextContent`：標題的精確文本內容字符串。
`headingTag`：一個字符串，讀取值為 'h1'，'h2' 或 'h3'。

```jsx
<TableOfContentsPlugin>
  {(tableOfContentsArray) => {
    return (
      <MyCustomTableOfContentsPlugin tableOfContents={tableOfContentsArray} />
    );
  }}
</TableOfContentsPlugin>
```

### `LexicalEditorRefPlugin`

允許您在 LexicalComposer 外部獲取到底層編輯器實例的引用，這在您希望從應用程序的另一部分與編輯器交互時非常方便。

```jsx
const editorRef = useRef(null);
<EditorRefPlugin editorRef={editorRef} />;
```