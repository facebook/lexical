---
id: 'lexical.LineBreakNode'
title: 'Class: LineBreakNode'
custom_edit_url: null
---

[lexical](../modules/lexical.md).LineBreakNode

## 繼承層級

- [`LexicalNode`](lexical.LexicalNode.md)

  ↳ **`LineBreakNode`**

## 建構子

### constructor

• **new LineBreakNode**(`key?`): [`LineBreakNode`](lexical.LineBreakNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 返回

[`LineBreakNode`](lexical.LineBreakNode.md)

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[constructor](lexical.LexicalNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:34](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L34)

## 屬性

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`LineBreakNode`](lexical.LineBreakNode.md)\>

#### 覆寫

LexicalNode.constructor

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:25](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L25)

## 函式

### createDOM

▸ **createDOM**(): `HTMLElement`

在和解過程中調用，以確定要插入到 DOM 中的節點。

此函式必須返回正好一個 `HTMLElement`。不支持嵌套元素。

在此更新生命週期階段，請勿嘗試更新 Lexical EditorState。

#### 返回

`HTMLElement`

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[createDOM](lexical.LexicalNode.md#createdom)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L42)

---

### exportJSON

▸ **exportJSON**(): [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你需要將其序列化為 JSON 以便於持久存儲，也很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[exportJSON](lexical.LexicalNode.md#exportjson)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L70)

---

### getTextContent

▸ **getTextContent**(): `"\n"`

返回節點的文本內容。為了實現應有的純文本表示（例如用於複製 + 粘貼），請覆寫此函式。

#### 返回

`"\n"`

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[getTextContent](lexical.LexicalNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:38](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L38)

---

### updateDOM

▸ **updateDOM**(): `false`

當節點更改並應更新 DOM 以對齊更新過程中可能發生的任何變更時調用。

返回 "true" 將導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生變化，則需要執行此操作。

#### 返回

`false`

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[updateDOM](lexical.LexicalNode.md#updatedom)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L46)

---

### clone

▸ **clone**(`node`): [`LineBreakNode`](lexical.LineBreakNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState（但不會附加到任何地方！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                        |
| :----- | :------------------------------------------ |
| `node` | [`LineBreakNode`](lexical.LineBreakNode.md) |

#### 返回

[`LineBreakNode`](lexical.LineBreakNode.md)

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[clone](lexical.LexicalNode.md#clone)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:30](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L30)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點都必須實現此函式，且在編輯器中註冊的節點中必須唯一。

#### 返回

`string`

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[getType](lexical.LexicalNode.md#gettype-1)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:26](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L26)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

LexicalNode.importDOM

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:50](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L50)

---

### importJSON

▸ **importJSON**(`serializedLineBreakNode`): [`LineBreakNode`](lexical.LineBreakNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現和序列化接口之間的抽象，這在對節點模式進行重大更改（如添加或移除屬性）時非常重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱                      | 類型                                                                   |
| :------------------------ | :--------------------------------------------------------------------- |
| `serializedLineBreakNode` | [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode) |

#### 返回

[`LineBreakNode`](lexical.LineBreakNode.md)

#### 覆寫

[LexicalNode](lexical.LexicalNode.md).[importJSON](lexical.LexicalNode.md#importjson)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L64)
