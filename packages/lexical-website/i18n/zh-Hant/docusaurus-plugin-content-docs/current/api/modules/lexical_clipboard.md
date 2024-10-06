---
id: 'lexical_clipboard'
title: '模組: @lexical/clipboard'
custom_edit_url: null
---

## 函數

### $generateJSONFromSelectedNodes

▸ **$generateJSONFromSelectedNodes**\<`SerializedNode`\>(`editor`, `selection`): `Object`

獲取提供的 Selection 中的節點的 Lexical JSON。

#### 類型參數

| 名稱             | 類型                        |
| :--------------- | :-------------------------- |
| `SerializedNode` | 擴展自 `BaseSerializedNode` |

#### 參數

| 名稱        | 類型                                                                | 描述                                   |
| :---------- | :------------------------------------------------------------------ | :------------------------------------- |
| `editor`    | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)              | 要從中獲取 JSON 內容的 LexicalEditor。 |
| `selection` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 要從中獲取 JSON 內容的 Selection。     |

#### 返回

`Object`

一個包含編輯器命名空間和可序列化節點列表的 JavaScript 物件。

| 名稱        | 類型               |
| :---------- | :----------------- |
| `namespace` | `string`           |
| `nodes`     | `SerializedNode`[] |

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:324](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L324)

---

### $generateNodesFromSerializedNodes

▸ **$generateNodesFromSerializedNodes**(`serializedNodes`): [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

此方法接受符合 BaseSeralizedNode 介面的物件數組，並返回包含對應 LexicalNode 類別實例的數組。通常，你會從 [$generateJSONFromSelectedNodes](lexical_clipboard.md#$generatejsonfromselectednodes) 獲取 BaseSerialized 節點數組。

#### 參數

| 名稱              | 類型                   | 描述                                     |
| :---------------- | :--------------------- | :--------------------------------------- |
| `serializedNodes` | `BaseSerializedNode`[] | 符合 BaseSerializedNode 介面的物件數組。 |

#### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)[]

一個包含 Lexical Node 物件的數組。

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:354](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L354)

---

### $getHtmlContent

▸ **$getHtmlContent**(`editor`): `string`

返回*當前選中的* Lexical 內容作為 HTML 字串，依賴於 LexicalNode 類別上的 exportDOM 方法中定義的邏輯。注意，這不會返回整個編輯器的 HTML 內容（除非所有內容都包含在當前選擇中）。

#### 參數

| 名稱     | 類型                                                   | 描述                                      |
| :------- | :----------------------------------------------------- | :---------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | 用於獲取 HTML 內容的 LexicalEditor 實例。 |

#### 返回

`string`

一個 HTML 內容的字串。

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L46)

---

### $getLexicalContent

▸ **$getLexicalContent**(`editor`): `null` \| `string`

返回*當前選中的* Lexical 內容作為 JSON 字串，依賴於 LexicalNode 類別上的 exportJSON 方法中定義的邏輯。注意，這不會返回整個編輯器的 JSON 內容（除非所有內容都包含在當前選擇中）。

#### 參數

| 名稱     | 類型                                                   | 描述                                      |
| :------- | :----------------------------------------------------- | :---------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | 用於獲取 JSON 內容的 LexicalEditor 實例。 |

#### 返回

`null` \| `string`

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:73](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L73)

---

### $insertDataTransferForPlainText

▸ **$insertDataTransferForPlainText**(`dataTransfer`, `selection`): `void`

嘗試將提供的 DataTransfer 物件中的 mime-types text/plain 或 text/uri-list 的內容插入到編輯器中指定的選擇位置。只有當 text/plain 不可用時，才使用 text/uri-list。

#### 參數

| 名稱           | 類型                                                      | 描述                                                                                                          |
| :------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `dataTransfer` | `DataTransfer`                                            | 符合 [DataTransfer 介面](https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface) 的物件。 |
| `selection`    | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 用於作為 DataTransfer 物件內容插入點的選擇。                                                                  |

#### 返回

`void`

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:99](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L99)

---

### $insertDataTransferForRichText

▸ **$insertDataTransferForRichText**(`dataTransfer`, `selection`, `editor`): `void`

嘗試將提供的 DataTransfer 物件中的 mime-types application/x-lexical-editor、text/html、text/plain 或 text/uri-list（按優先順序）內容插入到編輯器中指定的選擇位置。

#### 參數

| 名稱           | 類型                                                      | 描述                                                                                                          |
| :------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `dataTransfer` | `DataTransfer`                                            | 符合 [DataTransfer 介面](https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface) 的物件。 |
| `selection`    | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 用於作為 DataTransfer 物件內容插入點的選擇。                                                                  |
| `editor`       | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)    | 將內容插入到其中的 LexicalEditor。                                                                            |

#### 返回

`void`

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:120](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L120)

---

### $insertGeneratedNodes

▸ **$insertGeneratedNodes**(`editor`, `nodes`, `selection`): `void`

使用不同的策略將 Lexical 節點插入到編輯器中，根據一些簡單的基於選擇的啟發式方法。如果你正在尋找一種通用方式來在特定選擇點插入節點，你可能會想要 [lexical.$insertNodes](lexical.md#$insertnodes)。

#### 參數

| 名稱        | 類型                                                      | 描述                                  |
| :---------- | :-------------------------------------------------------- | :------------------------------------ |
| `editor`    | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)    | 要將節點插入到的 LexicalEditor 實例。 |
| `nodes`     | [`LexicalNode`](../classes/lexical.LexicalNode.md)[]      | 要插入的節點。                        |
| `selection` | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 要將節點插入到的選擇。                |

#### 返回

`void`

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:194](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L194)

---

### copyToClipboard

▸ **copyToClipboard**(`editor`, `event`): `Promise`\<`boolean`\>

將當前選擇的內容複製到剪貼簿中，格式為 text/plain、text/html 和 application/x-lexical-editor（Lexical JSON）。

#### 參數

| 名稱     | 類型                                                   | 描述                                  |
| :------- | :----------------------------------------------------- | :------------------------------------ |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | 要從中複製內容的 LexicalEditor 實例。 |
| `event`  | `null` \| `ClipboardEvent`                             | 要將內容添加到的                      |

瀏覽器本地 ClipboardEvent。 |

#### 返回

`Promise`\<`boolean`\>

#### 定義於

[packages/lexical-clipboard/src/clipboard.ts:383](https://github.com/facebook/lexical/tree/main/packages/lexical-clipboard/src/clipboard.ts#L383)
