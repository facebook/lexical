---
id: 'lexical_text'
title: 'Module: @lexical/text'
custom_edit_url: null
---

## 類型別名

### EntityMatch

Ƭ **EntityMatch**: `Object`

#### 類型聲明

| 名稱    | 類型     |
| :------ | :------- |
| `end`   | `number` |
| `start` | `number` |

#### 定義於

[packages/lexical-text/src/registerLexicalTextEntity.ts:19](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/registerLexicalTextEntity.ts#L19)

---

### TextNodeWithOffset

Ƭ **TextNodeWithOffset**: `Object`

#### 類型聲明

| 名稱     | 類型                                         |
| :------- | :------------------------------------------- |
| `node`   | [`TextNode`](../classes/lexical.TextNode.md) |
| `offset` | `number`                                     |

#### 定義於

[packages/lexical-text/src/index.ts:11](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/index.ts#L11)

## 函數

### $canShowPlaceholder

▸ **$canShowPlaceholder**(`isComposing`): `boolean`

確定輸入框是否應顯示佔位符。如果根節點中有內容，則不應顯示佔位符。

#### 參數

| 名稱          | 類型      | 說明                                               |
| :------------ | :-------- | :------------------------------------------------- |
| `isComposing` | `boolean` | 編輯器是否因為活動中的輸入法編輯器而處於編輯模式？ |

#### 返回

`boolean`

如果輸入框應顯示佔位符則為 true，否則為 false。

#### 定義於

[packages/lexical-text/src/canShowPlaceholder.ts:24](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/canShowPlaceholder.ts#L24)

---

### $canShowPlaceholderCurry

▸ **$canShowPlaceholderCurry**(`isEditorComposing`): () => `boolean`

返回一個執行 [$canShowPlaceholder](lexical_text.md#$canshowplaceholder) 的函數。

#### 參數

| 名稱                | 類型      | 說明                                               |
| :------------------ | :-------- | :------------------------------------------------- |
| `isEditorComposing` | `boolean` | 編輯器是否因為活動中的輸入法編輯器而處於編輯模式？ |

#### 返回

`fn`

一個根據參數執行 $canShowPlaceholder 的函數。

▸ (): `boolean`

##### 返回

`boolean`

#### 定義於

[packages/lexical-text/src/canShowPlaceholder.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/canShowPlaceholder.ts#L74)

---

### $findTextIntersectionFromCharacters

▸ **$findTextIntersectionFromCharacters**(`root`, `targetCharacters`): `null` \| \{ `node`: [`TextNode`](../classes/lexical.TextNode.md) ; `offset`: `number` }

尋找一個大小大於 targetCharacters 的 TextNode，並返回該節點及剩餘文本的長度。

#### 參數

| 名稱               | 類型                                         | 說明                          |
| :----------------- | :------------------------------------------- | :---------------------------- |
| `root`             | [`RootNode`](../classes/lexical.RootNode.md) | 根節點。                      |
| `targetCharacters` | `number`                                     | TextNode 必須大於的字符數量。 |

#### 返回

`null` \| \{ `node`: [`TextNode`](../classes/lexical.TextNode.md) ; `offset`: `number` }

找到的 TextNode 和交集偏移量，如果未找到 TextNode 則返回 null。

#### 定義於

[packages/lexical-text/src/findTextIntersectionFromCharacters.ts:17](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/findTextIntersectionFromCharacters.ts#L17)

---

### $isRootTextContentEmpty

▸ **$isRootTextContentEmpty**(`isEditorComposing`, `trim?`): `boolean`

確定根節點是否有文本內容，並在有內容時修剪任何空白。

#### 參數

| 名稱                | 類型      | 預設值      | 說明                                               |
| :------------------ | :-------- | :---------- | :------------------------------------------------- |
| `isEditorComposing` | `boolean` | `undefined` | 編輯器是否因為活動中的輸入法編輯器而處於編輯模式？ |
| `trim`              | `boolean` | `true`      | 根文本是否應修剪空白？預設為 true。                |

#### 返回

`boolean`

如果文本內容為空則為 true，若有文本或 isEditorComposing 為 true 則為 false。

#### 定義於

[packages/lexical-text/src/isRootTextContentEmpty.ts:16](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/isRootTextContentEmpty.ts#L16)

---

### $isRootTextContentEmptyCurry

▸ **$isRootTextContentEmptyCurry**(`isEditorComposing`, `trim?`): () => `boolean`

返回一個執行 [$isRootTextContentEmpty](lexical_text.md#$isroottextcontentempty) 的函數。

#### 參數

| 名稱                | 類型      | 說明                                               |
| :------------------ | :-------- | :------------------------------------------------- |
| `isEditorComposing` | `boolean` | 編輯器是否因為活動中的輸入法編輯器而處於編輯模式？ |
| `trim?`             | `boolean` | 根文本是否應修剪空白？預設為 true。                |

#### 返回

`fn`

一個根據參數執行 $isRootTextContentEmpty 的函數。

▸ (): `boolean`

##### 返回

`boolean`

#### 定義於

[packages/lexical-text/src/isRootTextContentEmpty.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/isRootTextContentEmpty.ts#L39)

---

### $rootTextContent

▸ **$rootTextContent**(): `string`

返回根節點的文本內容。

#### 返回

`string`

根節點的文本內容。

#### 定義於

[packages/lexical-text/src/rootTextContent.ts:14](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/rootTextContent.ts#L14)

---

### registerLexicalTextEntity

▸ **registerLexicalTextEntity**\<`T`\>(`editor`, `getMatch`, `targetNode`, `createNode`): () => `void`[]

返回一個元組，可以用於 mergeRegister 來清理將文本轉換為另一個節點的節點轉換監聽器，例如 HashtagNode。

#### 類型參數

| 名稱 | 類型                                              |
| :--- | :------------------------------------------------ |
| `T`  | 擴展 [`TextNode`](../classes/lexical.TextNode.md) |

#### 參數

| 名稱         | 類型                                                                         | 說明                                                   |
| :----------- | :--------------------------------------------------------------------------- | :----------------------------------------------------- |
| `editor`     | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)                       | Lexical 編輯器。                                       |
| `getMatch`   | (`text`: `string`) => `null` \| [`EntityMatch`](lexical_text.md#entitymatch) | 查找滿足正則表達式的匹配字串。                         |
| `targetNode` | [`Klass`](lexical.md#klass)\<`T`\>                                           | 包含要匹配文本的節點類型。例如 HashtagNode             |
| `createNode` | (`textNode`: [`TextNode`](../classes/lexical.TextNode.md)) => `T`            | 創建新節點以包含匹配文本的函數。例如 createHashtagNode |

#### 返回

() => `void`[]

包含純文本和反向節點轉換監聽器的數組。

**`示例`**

```ts
useEffect(() => {
  return mergeRegister(
    ...registerLexicalTextEntity(editor, getMatch, targetNode, createNode),
  );
}, [createNode, editor, getMatch, targetNode]);
```

其中 targetNode 是包含要轉換文本的節點類型（如文本輸入），然後 getMatch 使用正則表達式查找匹配文本並創建適當的節點以包含匹配文本。

#### 定義於

[packages/lexical-text/src/registerLexicalTextEntity.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical-text/src/registerLexicalTextEntity.ts#L40)
