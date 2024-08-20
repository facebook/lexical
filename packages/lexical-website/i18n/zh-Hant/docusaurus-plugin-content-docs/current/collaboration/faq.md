---
sidebar_position: 2
---

# 合作常見問題解答

## 真實來源：Lexical State、Yjs 和應用程式的資料庫

建議將 Yjs 模型視為真實來源。您可以將文檔存儲到資料庫中以進行索引。但如果可能，您應該永遠記住 Yjs 模型，因為這是唯一可以讓沒有網路連接的客戶端可靠地加入並與伺服器同步的方法。

您也可以將資料庫視為真實來源。這可以通過以下方式實現：

- 客戶端在連接到伺服器時會收到一個 `sessionId`
- 當客戶端在沒有現有 `sessionId` 的情況下連接時，從資料庫中獲取內容並創建一個 `sessionId`
- 當所有客戶端斷開連接時，伺服器在某個超時後（例如 1 小時）忘記房間內容和 `sessionId`
- 當客戶端重新連接時，使用伺服器上的內容。此外，從客戶端獲取 `sessionId`
- 當兩個擁有不同 `sessionId` 的客戶端重新連接時，應該有一個客戶端忘記房間內容。_在這種情況下，客戶端會丟失內容_ - 雖然如果您將忘記超時（見第 2 點）設置得非常高，這種情況是不太可能發生的。

或者，有一種更簡單的方法：

- 當客戶端連接到伺服器時，伺服器如果房間內容為空，則填充房間內容
- 當所有客戶端斷開連接時，伺服器在某個超時後（例如 1 小時）忘記房間內容
- 當客戶端無法在 40 分鐘內重新連接時，客戶端必須忘記其本地更新並重新開始（這應由伺服器強制執行）

當資料庫是唯一真實來源時，如果您希望能夠忘記 Yjs 模型，您將總是遇到客戶端無法提交更改的情況。這在大多數項目中不會太糟糕。這會在某種程度上限制您，因為您不能使用 y-indexeddb 在客戶端緩存文檔。另一方面，這樣維護起來更容易，也更容易進行 Yjs 升級。此外，大多數人會說 SQL 比 Yjs 更可靠。

_\* 基於 Yjs 作者 [Kevin Jahns](https://github.com/yjs/yjs/issues/82#issuecomment-328365015) 的建議_

## 從 Yjs 文檔初始化 `EditorState`

可以通過利用無頭 Lexical 和 Yjs 的 no-op 提供者來實現：

<details>
  <summary>createHeadlessCollaborativeEditor.ts</summary>

```typescript
import type {Binding, Provider} from '@lexical/yjs';
import type {
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
  SerializedEditorState,
  SerializedLexicalNode,
} from 'lexical';

import {createHeadlessEditor} from '@lexical/headless';
import {
  createBinding,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from '@lexical/yjs';
import {type YEvent, applyUpdate, Doc, Transaction} from 'yjs';

export default function headlessConvertYDocStateToLexicalJSON(
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
  yDocState: Uint8Array,
): SerializedEditorState<SerializedLexicalNode> {
  return withHeadlessCollaborationEditor(nodes, (editor, binding) => {
    applyUpdate(binding.doc, yDocState, {isUpdateRemote: true});
    editor.update(() => {}, {discrete: true});

    return editor.getEditorState().toJSON();
  });
}

/**
 * 創建無頭協作編輯器，並使用 no-op 提供者（因為它不會連接到消息分發基礎設施）和綁定。它還設置了 yDoc 和編輯器之間的雙向同步。
 */
function withHeadlessCollaborationEditor<T>(
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
  callback: (editor: LexicalEditor, binding: Binding, provider: Provider) => T,
): T {
  const editor = createHeadlessEditor({
    nodes,
  });

  const id = 'main';
  const doc = new Doc();
  const docMap = new Map([[id, doc]]);
  const provider = createNoOpProvider();
  const binding = createBinding(editor, provider, id, doc, docMap);

  const unsubscribe = registerCollaborationListeners(editor, provider, binding);

  const res = callback(editor, binding, provider);

  unsubscribe();

  return res;
}

function registerCollaborationListeners(
  editor: LexicalEditor,
  provider: Provider,
  binding: Binding,
): () => void {
  const unsubscribeUpdateListener = editor.registerUpdateListener(
    ({
      dirtyElements,
      dirtyLeaves,
      editorState,
      normalizedNodes,
      prevEditorState,
      tags,
    }) => {
      if (tags.has('skip-collab') === false) {
        syncLexicalUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        );
      }
    },
  );

  const observer = (events: Array<YEvent<any>>, transaction: Transaction) => {
    if (transaction.origin !== binding) {
      syncYjsChangesToLexical(binding, provider, events, false);
    }
  };

  binding.root.getSharedType().observeDeep(observer);

  return () => {
    unsubscribeUpdateListener();
    binding.root.getSharedType().unobserveDeep(observer);
  };
}

function createNoOpProvider(): Provider {
  const emptyFunction = () => {};

  return {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: emptyFunction,
      on: emptyFunction,
      setLocalState: emptyFunction,
    },
    connect: emptyFunction,
    disconnect: emptyFunction,
    off: emptyFunction,
    on: emptyFunction,
  };
}
```

</details>
