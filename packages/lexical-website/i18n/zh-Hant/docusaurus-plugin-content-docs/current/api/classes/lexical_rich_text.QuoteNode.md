---
id: 'lexical_rich_text.QuoteNode'
title: 'Class: QuoteNode'
custom_edit_url: null
---

[@lexical/rich-text](../modules/lexical_rich_text.md).QuoteNode

## 繼承結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`QuoteNode`**

## 建構子

### 建構子

• **new QuoteNode**(`key?`): [`QuoteNode`](lexical_rich_text.QuoteNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 回傳值

[`QuoteNode`](lexical_rich_text.QuoteNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-rich-text/src/index.ts:127](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L127)

## 函式

### canMergeWhenEmpty

▸ **canMergeWhenEmpty**(): `true`

確定當此節點為空時，是否可以與正在插入的節點合併。

此函式在 [RangeSelection.insertNodes](lexical.RangeSelection.md#insertnodes) 中被特別呼叫，以確定節點插入期間的合併行為。

#### 回傳值

`true`

**`範例`**

```ts
// 在 ListItemNode 或 QuoteNode 實作中:
canMergeWhenEmpty(): true {
 return true;
}
```

#### 覆寫

[ElementNode](lexical.ElementNode.md).[canMergeWhenEmpty](lexical.ElementNode.md#canmergewhenempty)

#### 定義於

[packages/lexical-rich-text/src/index.ts:206](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L206)

---

### collapseAtStart

▸ **collapseAtStart**(): `true`

#### 回傳值

`true`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical-rich-text/src/index.ts:198](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L198)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在對此 Lexical 節點進行對比過程中，決定要插入 DOM 的節點。

此函式必須回傳確切的一個 HTMLElement。嵌套元素不被支援。

在此更新生命週期階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 說明                                                      |
| :------- | :--------------------------------------------------- | :-------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在對比過程中訪問 EditorTheme 等內容（用於應用類別）。 |

#### 回傳值

`HTMLElement`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-rich-text/src/index.ts:133](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L133)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於在 Lexical 與非 Lexical 編輯器之間進行複製和粘貼，或不同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要，此時主要的傳輸格式是 HTML。如果您以其他原因序列化為 HTML（例如通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes)），這也很重要。您還可以使用此函式構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-rich-text/src/index.ts:151](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L151)

---

### exportJSON

▸ **exportJSON**(): [`SerializedElementNode`](../modules/lexical.md#serializedelementnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果您將 JSON 序列化到某處的持久性儲存中，這也很重要。請參閱 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedElementNode`](../modules/lexical.md#serializedelementnode)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-rich-text/src/index.ts:181](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L181)

---

### insertNewAfter

▸ **insertNewAfter**(`_`, `restoreSelection?`): [`ParagraphNode`](lexical.ParagraphNode.md)

#### 參數

| 名稱                | 類型                                          |
| :------------------ | :-------------------------------------------- |
| `_`                 | [`RangeSelection`](lexical.RangeSelection.md) |
| `restoreSelection?` | `boolean`                                     |

#### 回傳值

[`ParagraphNode`](lexical.ParagraphNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-rich-text/src/index.ts:190](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L190)

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`): `boolean`

當節點發生變化時會呼叫此函式，應根據需要更新 DOM，以使其與更新過程中發生的任何變更保持一致。

如果此函式返回 "true"，Lexical 將解除掛載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生更改，則需要這樣做。

#### 參數

| 名稱       | 類型                                          |
| :--------- | :-------------------------------------------- |
| `prevNode` | [`QuoteNode`](lexical_rich_text.QuoteNode.md) |
| `dom`      | `HTMLElement`                                 |

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-rich-text/src/index.ts:138](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L138)

---

### clone

▸ **clone**(`node`): [`QuoteNode`](lexical_rich_text.QuoteNode.md)

複製此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState 中（但不將其附加到任何地方！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                          |
| :----- | :-------------------------------------------- |
| `node` | [`QuoteNode`](lexical_rich_text.QuoteNode.md) |

#### 回傳值

[`QuoteNode`](lexical_rich_text.QuoteNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-rich-text/src/index.ts:123](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L123)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點都必須實現此函式，且它必須在編輯器中註冊的節點中保持唯一。

#### 回傳值

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-rich-text/src/index.ts:119](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L119)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

ElementNode.importDOM

#### 定義於

[packages/lexical-rich-text/src/index.ts:142](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L142)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`QuoteNode`](lexical_rich_text.QuoteNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板程式碼，但提供了節點實作與序列化介面之間的抽象，在您對節點結構進行重大更改時（例如添加或移除屬性）可能會很重要。請參閱 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                         |
| :--------------- | :--------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedQuoteNode`](../modules/lexical_rich_text.md#serializedquotenode) |

#### 回傳值

[`QuoteNode`](lexical_rich_text.QuoteNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-rich-text/src/index.ts:173](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L173)
