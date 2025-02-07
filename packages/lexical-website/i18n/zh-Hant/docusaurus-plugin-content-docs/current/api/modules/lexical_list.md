---
id: 'lexical_list'
title: '模組: @lexical/list'
custom_edit_url: null
---

## 類別

- [ListItemNode](../classes/lexical_list.ListItemNode.md)
- [ListNode](../classes/lexical_list.ListNode.md)

## 類型別名

### ListType

Ƭ **ListType**: `"number"` \| `"bullet"` \| `"check"`

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:49](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L49)

---

### SerializedListItemNode

Ƭ **SerializedListItemNode**: [`Spread`](lexical.md#spread)\<\{ `checked`: `boolean` \| `undefined` ; `value`: `number` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L45)

---

### SerializedListNode

Ƭ **SerializedListNode**: [`Spread`](lexical.md#spread)\<\{ `listType`: [`ListType`](lexical_list.md#listtype) ; `start`: `number` ; `tag`: `ListNodeTagType` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L40)

## 變數

### INSERT_CHECK_LIST_COMMAND

• `Const` **INSERT_CHECK_LIST_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical-list/src/index.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/index.ts#L45)

---

### INSERT_ORDERED_LIST_COMMAND

• `Const` **INSERT_ORDERED_LIST_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical-list/src/index.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/index.ts#L42)

---

### INSERT_UNORDERED_LIST_COMMAND

• `Const` **INSERT_UNORDERED_LIST_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical-list/src/index.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/index.ts#L40)

---

### REMOVE_LIST_COMMAND

• `Const` **REMOVE_LIST_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical-list/src/index.ts:48](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/index.ts#L48)

## 函數

### $createListItemNode

▸ **$createListItemNode**(`checked?`): [`ListItemNode`](../classes/lexical_list.ListItemNode.md)

建立一個新的 List Item 節點，傳入 true/false 會將其轉換為複選框輸入。

#### 參數

| 名稱       | 類型      | 說明                                                                                                        |
| :--------- | :-------- | :---------------------------------------------------------------------------------------------------------- |
| `checked?` | `boolean` | List Item 是否為複選框，如果是，是否已勾選？ undefined/null: 不是複選框，true/false 分別表示已勾選/未勾選。 |

#### 回傳

[`ListItemNode`](../classes/lexical_list.ListItemNode.md)

新的 List Item。

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:540](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L540)

---

### $createListNode

▸ **$createListNode**(`listType`, `start?`): [`ListNode`](../classes/lexical_list.ListNode.md)

建立一個 ListNode，類型為 listType。

#### 參數

| 名稱       | 類型                                   | 預設值      | 說明                                                     |
| :--------- | :------------------------------------- | :---------- | :------------------------------------------------------- |
| `listType` | [`ListType`](lexical_list.md#listtype) | `undefined` | 要建立的列表類型。可以是 'number'、'bullet' 或 'check'。 |
| `start`    | `number`                               | `1`         | 有序列表的起始計數，若未指定則為 1。                     |

#### 回傳

[`ListNode`](../classes/lexical_list.ListNode.md)

新的 ListNode。

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:354](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L354)

---

### $getListDepth

▸ **$getListDepth**(`listNode`): `number`

檢查 listNode 從根節點的深度。

#### 參數

| 名稱       | 類型                                              | 說明                |
| :--------- | :------------------------------------------------ | :------------------ |
| `listNode` | [`ListNode`](../classes/lexical_list.ListNode.md) | 要檢查的 ListNode。 |

#### 回傳

`number`

ListNode 的深度。

#### 定義於

[packages/lexical-list/src/utils.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/utils.ts#L27)

---

### $handleListInsertParagraph

▸ **$handleListInsertParagraph**(): `boolean`

嘗試在選取範圍內插入一個 ParagraphNode 並選擇新節點。選取範圍必須包含一個 ListItemNode 或一個尚未包含文本的節點。如果其祖父節點為根節點/陰影根節點，則將獲取 ListNode（應為父節點）並將 ParagraphNode 插入為 ListNode 的兄弟節點。如果 ListNode 嵌套在 ListItemNode 中，則會在祖父 ListItemNode 之後添加 ParagraphNode。如果選取範圍不是 ListNode 的子節點，則會拋出不變性異常。

#### 回傳

`boolean`

若 ParagraphNode 成功插入則為 true，若無選取範圍或選取範圍不包含 ListItemNode 或節點已包含文本則為 false。

#### 定義於

[packages/lexical-list/src/formatList.ts:473](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/formatList.ts#L473)

---

### $isListItemNode

▸ **$isListItemNode**(`node`): node is ListItemNode

檢查節點是否為 ListItemNode。

#### 參數

| 名稱   | 類型                                                                        | 說明           |
| :----- | :-------------------------------------------------------------------------- | :------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) | 要檢查的節點。 |

#### 回傳

node is ListItemNode

若節點是 ListItemNode 則為 true，否則為 false。

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:549](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L549)

---

### $isListNode

▸ **$isListNode**(`node`): node is ListNode

檢查節點是否為 ListNode。

#### 參數

| 名稱   | 類型                                                                        | 說明           |
| :----- | :-------------------------------------------------------------------------- | :------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) | 要檢查的節點。 |

#### 回傳

node is ListNode

若節點是 ListNode 則為 true，否則為 false。

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:363](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L363)

---

### insertList

▸ **insertList**(`editor`, `listType`): `void`

插入一個新的 ListNode。如果選取範圍的錨點節點為空的 ListItemNode 且是根節點/陰影根節點的子節點，它將用 ListNode 替換 ListItemNode 及舊的 ListItemNode。否則

，它會用新的 ListNode 替換其父節點，並重新插入 ListItemNode 和任何先前的子節點。如果選取範圍的錨點節點不是空的 ListItemNode，則會添加一個新的 ListNode 或合併現有的 ListNode，除非該節點為葉節點，在這種情況下，它會嘗試在樹枝上找到 ListNode 並用新的 ListNode 替換它，或者在最近的根節點/陰影根節點處創建新的 ListNode。

#### 參數

| 名稱       | 類型                                                   | 說明                                        |
| :--------- | :----------------------------------------------------- | :------------------------------------------ |
| `editor`   | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器。                            |
| `listType` | [`ListType`](lexical_list.md#listtype)                 | 列表類型，"number" \| "bullet" \| "check"。 |

#### 回傳

`void`

#### 定義於

[packages/lexical-list/src/formatList.ts:65](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/formatList.ts#L65)

---

### removeList

▸ **removeList**(`editor`): `void`

搜尋最近的祖先 ListNode 並將其刪除。如果選取範圍是空的 ListItemNode，它將刪除整個列表，包括 ListItemNode。對於 ListNode 中的每個 ListItemNode，removeList 也會在刪除的 ListNode 位置生成新的 ParagraphNodes。任何在 ListItemNode 中的子節點都會附加到新的 ParagraphNodes。

#### 參數

| 名稱     | 類型                                                   | 說明             |
| :------- | :----------------------------------------------------- | :--------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器。 |

#### 回傳

`void`

#### 定義於

[packages/lexical-list/src/formatList.ts:227](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/formatList.ts#L227)
