---
id: 'lexical_overflow.OverflowNode'
title: '類別: OverflowNode'
custom_edit_url: null
---

[@lexical/overflow](../modules/lexical_overflow.md).OverflowNode

## 繼承結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`OverflowNode`**

## 建構子

### constructor

• **new OverflowNode**(`key?`): [`OverflowNode`](lexical_overflow.OverflowNode.md)

#### 參數

| 名稱   | 類型     | 描述                |
| :----- | :------- | :------------------ |
| `key?` | `string` | (選擇性) 節點的鍵值 |

#### 返回

[`OverflowNode`](lexical_overflow.OverflowNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-overflow/src/index.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L39)

## 方法

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在重新和諧處理過程中被調用，以決定要將哪些節點插入到此 Lexical 節點的 DOM 中。

此方法必須返回一個 `HTMLElement`。不支持嵌套元素。

在此更新生命周期階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                       |
| :------- | :--------------------------------------------------- | :--------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在重新和諧過程中訪問編輯器主題等設置（例如應用類別）。 |

#### 返回

`HTMLElement`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-overflow/src/index.ts:51](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L51)

---

### excludeFromCopy

▸ **excludeFromCopy**(): `boolean`

#### 返回

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[excludeFromCopy](lexical.ElementNode.md#excludefromcopy)

#### 定義於

[packages/lexical-overflow/src/index.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L72)

---

### exportJSON

▸ **exportJSON**(): [`SerializedElementNode`](../modules/lexical.md#serializedelementnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你將 JSON 用於持久存儲，也非常重要。
參見 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedElementNode`](../modules/lexical.md#serializedelementnode)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-overflow/src/index.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L44)

---

### insertNewAfter

▸ **insertNewAfter**(`selection`, `restoreSelection?`): `null` \| [`LexicalNode`](lexical.LexicalNode.md)

#### 參數

| 名稱               | 類型                                          | 預設值      |
| :----------------- | :-------------------------------------------- | :---------- |
| `selection`        | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 返回

`null` \| [`LexicalNode`](lexical.LexicalNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-overflow/src/index.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L64)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`): `boolean`

當節點發生變化時調用此方法，並應更新 DOM 以使其與更新期間可能發生的任何變化對齊。

返回 "true" 會導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，當元素標籤發生變化時，你需要這樣做。

#### 參數

| 名稱       | 類型                                               |
| :--------- | :------------------------------------------------- |
| `prevNode` | [`OverflowNode`](lexical_overflow.OverflowNode.md) |
| `dom`      | `HTMLElement`                                      |

#### 返回

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-overflow/src/index.ts:60](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L60)

---

### clone

▸ **clone**(`node`): [`OverflowNode`](lexical_overflow.OverflowNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState（但不附加到任何地方！）。所有節點都必須實現此方法。

#### 參數

| 名稱   | 類型                                               |
| :----- | :------------------------------------------------- |
| `node` | [`OverflowNode`](lexical_overflow.OverflowNode.md) |

#### 返回

[`OverflowNode`](lexical_overflow.OverflowNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-overflow/src/index.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L27)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須實現此方法，且必須在編輯器中註冊的節點之間唯一。

#### 返回

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-overflow/src/index.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L23)

---

### importDOM

▸ **importDOM**(): `null`

#### 返回

`null`

#### 覆寫

ElementNode.importDOM

#### 定義於

[packages/lexical-overflow/src/index.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#L35)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`OverflowNode`](lexical_overflow.OverflowNode.md)

控制此節點如何從 JSON 反序列化。這通常是模板代碼，但提供了節點實現和序列化介面之間的抽象，這在你進行破壞性變更（例如添加或移除屬性）時可能很重要。
參見 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                              |
| :--------------- | :-------------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedOverflowNode`](../modules/lexical_overflow.md#serializedoverflownode) |

#### 返回

[`OverflowNode`](lexical_overflow.OverflowNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-overflow/src/index.ts:31](https://github.com/facebook/lexical/tree/main/packages/lexical-overflow/src/index.ts#Lo31)
