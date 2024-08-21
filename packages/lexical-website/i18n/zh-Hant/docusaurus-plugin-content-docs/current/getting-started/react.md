---
sidebar_position: 2
---

# 開始使用 React

## 視頻教程

要詳細了解如何在 React 中設置基本編輯器，請參考以下視頻：

- [Lexical 和 React 的入門指南](https://www.youtube.com/watch?v=qIqxvk2qcmo)
- [主題、節點和豐富文本](https://www.youtube.com/watch?v=pIBUFYd9zJY)
- [標題、列表、工具欄](https://www.youtube.com/watch?v=5sRh_WXw0WI)
- [創建節點和插件](https://www.youtube.com/watch?v=abZNazybzvs)

請注意，有些視頻可能會部分過時，因為我們不會像文本文檔那樣頻繁地更新它們。

## 創建基本豐富文本編輯器

為了簡化 Lexical 與 React 的集成，我們提供了 `@lexical/react` 包，它用 React 組件封裝了 Lexical API，因此編輯器本身及所有插件現在都可以使用 JSX 進行輕鬆組合。此外，你可以根據需要延遲加載插件，這樣在實際使用插件之前不會付出插件的代價。

首先，安裝 `lexical` 和 `@lexical/react`：

```
npm install --save lexical @lexical/react
```

以下是使用 `lexical` 和 `@lexical/react` 的基本豐富文本編輯器示例：

```jsx
import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';

const theme = {
  // 主題樣式在此處定義
  //...
};

// 捕獲在 Lexical 更新期間發生的任何錯誤並記錄它們
// 或根據需要拋出它們。如果你不拋出它們，Lexical 將
// 嘗試優雅地恢復而不丟失用戶數據。
function onError(error) {
  console.error(error);
}

function Editor() {
  const initialConfig = {
    namespace: 'MyEditor',
    theme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>輸入一些文本...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
}
```

## 添加 UI 控制文本格式

開箱即用的 Lexical 沒有提供任何 UI，因為它不是一個現成的編輯器，而是一個用於創建自己編輯器的框架。下面是上一章中集成的一個示例，現在包括了 2 個新插件：

- `ToolbarPlugin` - 渲染控制文本格式的 UI
- `TreeViewPlugin` - 在編輯器下方渲染調試視圖，以便實時查看其狀態

然而，沒有 CSS 是無法創建 UI 的，Lexical 也不例外。請注意 `ExampleTheme.ts` 以及它在此示例中的使用方式，對應的樣式定義在 `styles.css` 中。

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>

## 儲存 Lexical 狀態

:::tip
雖然我們在此處嘗試編寫自己的插件進行演示，但在實際項目中，最好選擇 [LexicalOnChangePlugin](/docs/react/plugins#lexicalonchangeplugin)。
:::

現在我們在 React 中有了一個簡單的編輯器，接下來我們可能想要做的就是訪問編輯器的內容，例如，將其儲存在數據庫中。我們可以通過 [更新監聽器](https://lexical.dev/docs/concepts/listeners#registerupdatelistener) 來實現，每次編輯器狀態變化時，它都會執行並提供最新的狀態。在 React 中，我們通常使用插件系統來設置這樣的監聽器，因為它通過 React Context 提供了對 LexicalEditor 實例的輕鬆訪問。因此，我們來編寫自己的插件，當編輯器更新時通知我們。

```jsx
// 當編輯器變更時，你可以通過
// OnChangePlugin 獲得通知！
function MyOnChangePlugin({onChange}) {
  // 通過 LexicalComposerContext 訪問編輯器
  const [editor] = useLexicalComposerContext();
  // 將我們的監聽器包裝在 useEffect 中，以處理清理並避免過期引用。
  useEffect(() => {
    // 大多數監聽器返回一個可以調用以清理的拆解函數。
    return editor.registerUpdateListener(({editorState}) => {
      // 在這裡調用 onChange 將最新狀態傳遞給父組件。
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}
```

現在，我們可以在編輯器中實現這個功能，並將 EditorState 儲存在 React 狀態變量中：

```jsx
function MyOnChangePlugin({onChange}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    setEditorState(editorState);
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>輸入一些文本...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
      <MyOnChangePlugin onChange={onChange} />
    </LexicalComposer>
  );
}
```

好的，我們現在將 EditorState 對象儲存在 React 狀態變量中，但我們不能將 JavaScript 對象儲存到數據庫中——那麼我們如何持久化狀態以便稍後加載呢？我們需要將其序列化為儲存格式。為此，Lexical 提供了幾個序列化 API，將 EditorState 轉換為可以通過網絡傳輸並儲存到數據庫中的字符串。基於我們的示例，我們可以這樣做：

```jsx
function MyOnChangePlugin({onChange}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    // 在 EditorState 對象上調用 toJSON，生成一個序列化安全的字符串
    const editorStateJSON = editorState.toJSON();
    // 然而，我們仍然有一個 JavaScript 對象，所以我們需要使用 JSON.stringify 將其轉換為實際字符串
    setEditorState(JSON.stringify(editorStateJSON));
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/*...*/}
      <MyOnChangePlugin onChange={onChange} />
    </LexicalComposer>
  );
}
```

從這裡，將狀態從 React 狀態變量發送到服務器以儲存在數據庫中就非常簡單了。

一個重要的注意事項是：Lexical 通常是無控的，因此避免嘗試將 EditorState 重新傳遞回 Editor.setEditorState 或類似的操作。
