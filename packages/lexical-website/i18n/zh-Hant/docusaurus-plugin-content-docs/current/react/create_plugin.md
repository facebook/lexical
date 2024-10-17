---
sidebar_position: 2
---

# 創建 React 插件

除了使用核心庫提供的 Lexical React 插件外，你還可以創建自己的插件來擴展或修改 Lexical 的功能，以適應你的使用情況。

Lexical 的 React 插件介面很簡單——只需創建一個 React 組件並將其作為子組件添加到 `LexicalComposer` 組件中：

```jsx
 <LexicalComposer>
    <MyLexicalPlugin>
 </LexicalComposer>
```

如果插件引入了新的節點，這些節點必須在 `initialConfig.nodes` 中註冊：

```js
const initialConfig = {
  namespace: 'MyEditor',
  nodes: [MyLexicalNode],
};
```

```jsx
 <LexicalComposer initialConfig={initialConfig}>
    <MyLexicalPlugin>
 </LexicalComposer>
```

`LexicalComposer` 通過 React Context 提供對底層 `LexicalEditor` 實例的訪問：

```jsx
//MyLexicalPlugin.js

export function MyLexicalPlugin(props) {
    const [editor] = useLexicalComposerContext();
    ...
}
```

有了對編輯器的訪問，你的插件可以通過 [Commands](https://lexical.dev/docs/concepts/commands)、[Transforms](https://lexical.dev/docs/concepts/transforms) 或其他 API 來擴展 Lexical。例如，[TwitterPlugin](https://github.com/facebook/lexical/blob/0775ab929e65723433626fa8c25900941e7f232f/packages/lexical-playground/src/plugins/TwitterPlugin/index.ts#L18) 將推文嵌入編輯器，根據提供的 Tweet ID 異步從 Twitter 獲取數據：

```jsx
export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand();

export default function TwitterPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TweetNode])) {
      throw new Error('TwitterPlugin: TweetNode not registered on editor (initialConfig.nodes)');
    }

    return editor.registerCommand<string>(
      INSERT_TWEET_COMMAND,
      (payload) => {
        const tweetNode = $createTweetNode(payload);
        $insertNodeToNearestRoot(tweetNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
```

`TwitterPlugin` 只是訪問 Lexical 編輯器的 React 組件，通過 React Context（`useLexicalComposerContext`）。使用 LexicalEditor 實例，這個插件做了兩件事：

1. 驗證編輯器上是否註冊了 `TweetNode`（如果你忘記註冊節點，就無法完成 #2）
2. 註冊了一個“命令”，並傳遞一個回調函數，當該命令被調度時該回調函數會運行。命令回調函數在編輯器中創建並插入一個 `TweetNode`。

你可以在 [playground](https://github.com/facebook/lexical/blob/0775ab929e65723433626fa8c25900941e7f232f/packages/lexical-playground/src/Editor.tsx#L137) 中查看它是如何使用的。它被添加為 `LexicalComposer` 組件的子組件，這樣做的目的是提供訪問編輯器實例所需的 Context。要實際觸發這個命令回調並插入 [TweetNode](https://github.com/facebook/lexical/blob/b0fa38615c03f1c4fc7c8c5ea26412b723770e55/packages/lexical-playground/src/nodes/TweetNode.tsx#L212)，我們有一個 [按鈕](https://github.com/facebook/lexical/blob/b0fa38615c03f1c4fc7c8c5ea26412b723770e55/packages/lexical-playground/src/plugins/ToolbarPlugin.tsx#L534) 可以“調度”我們在插件中註冊的 Tweet 命令。

雖然 `TwitterPlugin` 註冊了一個插入自定義節點的命令，但這只是插件可以做的一個例子。要更好地了解可以做些什麼，請查看 [playground 中定義的插件](https://github.com/facebook/lexical/tree/0775ab929e65723433626fa8c25900941e7f232f/packages/lexical-playground/src/plugins)。
