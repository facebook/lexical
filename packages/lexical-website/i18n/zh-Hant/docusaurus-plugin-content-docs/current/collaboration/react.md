---
sidebar_position: 1
---

# React

Lexical 提供了 `LexicalCollaborationPlugin` 和 `useCollaborationContext` hook，這些工具在 `@lexical/react` 中，加速了基於 React 的協作編輯器的創建。這些工具建立在 `@lexical/yjs` 提供的 Yjs 綁定之上。

:::tip

複製 [Lexical GitHub 倉庫](https://github.com/facebook/lexical)，運行 `npm i && npm run start`，並打開 [`http://localhost:3000/split/?isCollab=true`](http://localhost:3000/split/?isCollab=true) 以啟動協作模式的 playground。

:::

## 開始使用

本指南基於 [examples/react-rich](https://github.com/facebook/lexical/tree/main/examples/react-rich) 示例。

**安裝所需的基本依賴項：**

```bash
$ npm i -S @lexical/react @lexical/yjs lexical react react-dom y-websocket yjs
```

:::note

`y-websocket` 是目前唯一官方支持的 Yjs 連接提供者。雖然其他提供者也可能運作良好。

:::

**啟動 WebSocket 服務器：**

這可以讓不同的瀏覽器窗口和不同的瀏覽器找到彼此並同步 Lexical 狀態。此外，`YPERSISTENCE` 允許你在服務器重啟之間保存 Yjs 文件，這樣客戶端可以簡單地重新連接並繼續編輯。

```bash
$ HOST=localhost PORT=1234 YPERSISTENCE=./yjs-wss-db npx y-websocket
```

**設置基本的協作 Lexical：**

```tsx
import {$getRoot, $createParagraphNode, $createTextNode} from 'lexical';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import * as Y from 'yjs';
import {$initialEditorState} from './initialEditorState';
import {WebsocketProvider} from 'y-websocket';

function Editor() {
  const initialConfig = {
    // 注意：這對於協作插件將編輯器狀態設置為 null 至關重要。
    // 這表示編輯器不應嘗試設置任何默認狀態（甚至不是空狀態），
    // 而是讓協作插件來完成這個工作
    editorState: null,
    namespace: 'Demo',
    nodes: [],
    onError: (error: Error) => {
      throw error;
    },
    theme: {},
  };

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>) => {
      const doc = getDocFromMap(id, yjsDocMap);

      return new WebsocketProvider('ws://localhost:1234', id, doc, {
        connect: false,
      });
    },
    [],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="editor-input" />}
        placeholder={
          <div className="editor-placeholder">輸入一些豐富的文本...</div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <CollaborationPlugin
        id="lexical/react-rich-collab"
        providerFactory={providerFactory}
        // 可選的初始編輯器狀態，以防協作 Y.Doc 沒有
        // 任何現有數據在服務器上。然後它將使用這個值來填充編輯器。
        // 它接受與 LexicalComposer 的 editorState prop 相同類型的值
        // （json 字符串、狀態對象或函數）
        initialEditorState={$initialEditorState}
        shouldBootstrap={true}
      />
    </LexicalComposer>
  );
}
```

## 查看效果

源代碼：[examples/react-rich-collab](https://github.com/facebook/lexical/tree/main/examples/react-rich-collab)

<iframe width="100%" height="600" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich-collab?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>

## 構建協作插件

[Lexical Playground](https://playground.lexical.dev/) 展示了一組與主要文檔集成的協作插件，這些插件通過 `useCollaborationContext()` hook 進行整合。值得注意的有：

- [`CommentPlugin`](https://github.com/facebook/lexical/tree/v0.14.5/packages/lexical-playground/src/plugins/CommentPlugin) - 使用單獨的提供者和 Yjs 房間來同步評論。
- [`ImageComponent`](https://github.com/facebook/lexical/blob/v0.14.5/packages/lexical-playground/src/nodes/ImageComponent.tsx#L390) - 使用 `LexicalNestedComposer` 配合 `CollaborationPlugin`。
- [`PollOptionComponent`](https://github.com/facebook/lexical/blob/v0.14.5/packages/lexical-playground/src/nodes/PollComponent.tsx#L78) - 展示了使用 Yjs 上下文中的 `clientID` 實現投票的功能。
- [`StickyPlugin`](https://github.com/facebook/lexical/tree/v0.14.5/packages/lexical-playground/src/plugins/StickyPlugin) - 使用 `LexicalNestedComposer` 配合 `CollaborationPlugin` 以及便條位置實時同步。

:::note

雖然這些「playground」插件還未準備好用於生產環境，但它們作為協作 Lexical 功能的極佳示例，也提供了一個良好的起點。

:::

## Yjs 提供者

設置客戶端之間的通信、管理意識信息和存儲共享數據以便離線使用是一件繁瑣的事情。提供者為你管理所有這些，並且是你協作應用的完美起點。

請參見 [Yjs 網站](https://docs.yjs.dev/ecosystem/connection-provider) 以查看官方認可的提供者列表，雖然這不是一個全面的列表。
