---
id: 'lexical_history'
title: '模組: @lexical/history'
custom_edit_url: null
---

## 類型別名

### HistoryState

Ƭ **HistoryState**: `Object`

#### 類型聲明

| 名稱        | 類型                                                                  |
| :---------- | :-------------------------------------------------------------------- |
| `current`   | `null` \| [`HistoryStateEntry`](lexical_history.md#historystateentry) |
| `redoStack` | [`HistoryStateEntry`](lexical_history.md#historystateentry)[]         |
| `undoStack` | [`HistoryStateEntry`](lexical_history.md#historystateentry)[]         |

#### 定義於

[packages/lexical-history/src/index.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-history/src/index.ts#L41)

---

### HistoryStateEntry

Ƭ **HistoryStateEntry**: `Object`

#### 類型聲明

| 名稱          | 類型                                                   |
| :------------ | :----------------------------------------------------- |
| `editor`      | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `editorState` | [`EditorState`](../classes/lexical.EditorState.md)     |

#### 定義於

[packages/lexical-history/src/index.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical-history/src/index.ts#L37)

## 函數

### createEmptyHistoryState

▸ **createEmptyHistoryState**(): [`HistoryState`](lexical_history.md#historystate)

創建一個空的歷史狀態。

#### 返回值

[`HistoryState`](lexical_history.md#historystate)

- 空的歷史狀態，作為一個物件。

#### 定義於

[packages/lexical-history/src/index.ts:495](https://github.com/facebook/lexical/tree/main/packages/lexical-history/src/index.ts#L495)

---

### registerHistory

▸ **registerHistory**(`editor`, `historyState`, `delay`): () => `void`

註冊必要的監聽器來管理撤銷/重做歷史堆疊和相關的編輯器命令。
它返回一個 `unregister` 回調函數，用來清理所有監聽器，並應在編輯器卸載時調用。

#### 參數

| 名稱           | 類型                                                   | 說明                                                                                 |
| :------------- | :----------------------------------------------------- | :----------------------------------------------------------------------------------- |
| `editor`       | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器。                                                                     |
| `historyState` | [`HistoryState`](lexical_history.md#historystate)      | 歷史狀態，包含當前狀態和撤銷/重做堆疊。                                              |
| `delay`        | `number`                                               | 編輯器應延遲生成新歷史堆疊的時間（以毫秒為單位），而不是將當前更改合併到當前堆疊中。 |

#### 返回值

`fn`

監聽器清理回調函數。

▸ (): `void`

##### 返回值

`void`

#### 定義於

[packages/lexical-history/src/index.ts:389](https://github.com/facebook/lexical/tree/main/packages/lexical-history/src/index.ts#L389)
