---
id: 'lexical_rich_text.HeadingNode'
title: 'Class: HeadingNode'
custom_edit_url: null
---

[@lexical/rich-text](../modules/lexical_rich_text.md).HeadingNode

## 繼承層級

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`HeadingNode`**

## 建構子

### 建構子

• **new HeadingNode**(`tag`, `key?`): [`HeadingNode`](lexical_rich_text.HeadingNode.md)

#### 參數

| 名稱   | 類型                                                               |
| :----- | :----------------------------------------------------------------- |
| `tag`  | [`HeadingTagType`](../modules/lexical_rich_text.md#headingtagtype) |
| `key?` | `string`                                                           |

#### 回傳值

[`HeadingNode`](lexical_rich_text.HeadingNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-rich-text/src/index.ts:236](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L236)

## 函式

### collapseAtStart

▸ **collapseAtStart**(): `true`

#### 回傳值

`true`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical-rich-text/src/index.ts:383](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L383)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在對齊過程中調用此函式，以確定應該將哪些節點插入到此 Lexical Node 的 DOM 中。

此函式必須精確返回一個 HTMLElement。不支持嵌套元素。

請勿嘗試在更新生命周期的此階段更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 說明                                                    |
| :------- | :--------------------------------------------------- | :------------------------------------------------------ |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在對齊過程中訪問如 EditorTheme 等功能，以應用類別。 |

#### 回傳值

`HTMLElement`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-rich-text/src/index.ts:247](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L247)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或具有不同命名空間的 Lexical 編輯器來說非常重要，此時主要的傳輸格式是 HTML。對於透過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 進行的任何其他原因序列化為 HTML 也同樣重要。您也可以使用此函式來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-rich-text/src/index.ts:317](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L317)

---

### exportJSON

▸ **exportJSON**(): [`SerializedHeadingNode`](../modules/lexical_rich_text.md#serializedheadingnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果您要將 JSON 序列化以進行持久存儲，這也很重要。請參閱 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedHeadingNode`](../modules/lexical_rich_text.md#serializedheadingnode)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-rich-text/src/index.ts:347](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L347)

---

### extractWithChild

▸ **extractWithChild**(): `boolean`

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[extractWithChild](lexical.ElementNode.md#extractwithchild)

#### 定義於

[packages/lexical-rich-text/src/index.ts:393](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L393)

---

### getTag

▸ **getTag**(): [`HeadingTagType`](../modules/lexical_rich_text.md#headingtagtype)

#### 回傳值

[`HeadingTagType`](../modules/lexical_rich_text.md#headingtagtype)

#### 定義於

[packages/lexical-rich-text/src/index.ts:241](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L241)

---

### insertNewAfter

▸ **insertNewAfter**(`selection?`, `restoreSelection?`): [`ParagraphNode`](lexical.ParagraphNode.md) \| [`HeadingNode`](lexical_rich_text.HeadingNode.md)

#### 參數

| 名稱               | 類型                                          | 預設值      |
| :----------------- | :-------------------------------------------- | :---------- |
| `selection?`       | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 回傳值

[`ParagraphNode`](lexical.ParagraphNode.md) \| [`HeadingNode`](lexical_rich_text.HeadingNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-rich-text/src/index.ts:357](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L357)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`): `boolean`

當節點發生變化時調用此函式，並應根據需要更新 DOM，以使其與在更新過程中可能發生的任何變化對齊。

返回 "true" 會導致 Lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤更改，您需要這樣做。

#### 參數

| 名稱       | 類型                                              |
| :--------- | :------------------------------------------------ |
| `prevNode` | [`HeadingNode`](lexical_rich_text.HeadingNode.md) |
| `dom`      | `HTMLElement`                                     |

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-rich-text/src/index.ts:259](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L259)

---

### clone

▸ **clone**(`node`): [`HeadingNode`](lexical_rich_text.HeadingNode.md)

克隆此節點，創建一個具有不同 key 的新節點，並將其添加到 EditorState 中（但不附加到任何位置！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                              |
| :----- | :------------------------------------------------ |
| `node` | [`HeadingNode`](lexical_rich_text.HeadingNode.md) |

#### 回傳值

[`HeadingNode`](lexical_rich_text.HeadingNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-rich-text/src/index.ts:232](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L232)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點都必須實作此函式，並且在編輯器中註冊的節點之間必須唯一。

#### 回傳值

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-rich-text/src/index.ts:228](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L228)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

ElementNode.importDOM

#### 定義於

[packages/lexical-rich-text/src/index.ts:263](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L263)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`HeadingNode`](lexical_rich_text.HeadingNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了一個節點實現與序列化接口之間的抽象，如果您將來對節點結構進行重大更改（例如添加或移除屬性），這可能會變得非常重要。請參閱 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                             |
| :--------------- | :------------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedHeadingNode`](../modules/lexical_rich_text.md#serializedheadingnode) |

#### 回傳值

[`HeadingNode`](lexical_rich_text.HeadingNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-rich-text/src/index.ts:339](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L339)
