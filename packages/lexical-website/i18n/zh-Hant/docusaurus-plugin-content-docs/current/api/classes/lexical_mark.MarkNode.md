---
id: 'lexical_mark.MarkNode'
title: 'Class: MarkNode'
custom_edit_url: null
---

[@lexical/mark](../modules/lexical_mark.md).MarkNode

## 繼承結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`MarkNode`**

## 建構函式

### constructor

• **new MarkNode**(`ids`, `key?`): [`MarkNode`](lexical_mark.MarkNode.md)

#### 參數

| 名稱   | 類型       |
| :----- | :--------- |
| `ids`  | `string`[] |
| `key?` | `string`   |

#### 返回

[`MarkNode`](lexical_mark.MarkNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L66)

## 函式

### addID

▸ **addID**(`id`): `void`

#### 參數

| 名稱 | 類型     |
| :--- | :------- |
| `id` | `string` |

#### 返回

`void`

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:118](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L118)

---

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 返回

`false`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:164](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L164)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `false`

#### 返回

`false`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[canInsertTextAfter](lexical.ElementNode.md#caninserttextafter)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:160](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L160)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `false`

#### 返回

`false`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[canInsertTextBefore](lexical.ElementNode.md#caninserttextbefore)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:156](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L156)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在和解過程中調用此函式，以確定將哪些節點插入 DOM 以表示這個 Lexical 節點。

此函式必須返回一個 HTMLElement。嵌套元素不受支持。

在更新生命周期的這一階段，不要嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                         |
| :------- | :--------------------------------------------------- | :------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在和解期間訪問編輯器主題（以應用類別）。 |

#### 返回

`HTMLElement`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:71](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L71)

---

### deleteID

▸ **deleteID**(`id`): `void`

#### 參數

| 名稱 | 類型     |
| :--- | :------- |
| `id` | `string` |

#### 返回

`void`

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:133](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L133)

---

### excludeFromCopy

▸ **excludeFromCopy**(`destination`): `boolean`

#### 參數

| 名稱          | 類型                  |
| :------------ | :-------------------- |
| `destination` | `"clone"` \| `"html"` |

#### 返回

`boolean`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[excludeFromCopy](lexical.ElementNode.md#excludefromcopy)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:195](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L195)

---

### exportJSON

▸ **exportJSON**(): [`SerializedMarkNode`](../modules/lexical_mark.md#serializedmarknode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你將 JSON 序列化以便持久儲存在某處，也很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedMarkNode`](../modules/lexical_mark.md#serializedmarknode)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L57)

---

### extractWithChild

▸ **extractWithChild**(`child`, `selection`, `destination`): `boolean`

#### 參數

| 名稱          | 類型                                                      |
| :------------ | :-------------------------------------------------------- |
| `child`       | [`LexicalNode`](lexical.LexicalNode.md)                   |
| `selection`   | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |
| `destination` | `"clone"` \| `"html"`                                     |

#### 返回

`boolean`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[extractWithChild](lexical.ElementNode.md#extractwithchild)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:172](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L172)

---

### getIDs

▸ **getIDs**(): `string`[]

#### 返回

`string`[]

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:113](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L113)
以下是翻譯成繁體中文的內容：

### hasID

▸ **hasID**(`id`): `boolean`

#### 參數

| 名稱 | 類型     |
| :--- | :------- |
| `id` | `string` |

#### 返回

`boolean`

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:103](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L103)

---

### insertNewAfter

▸ **insertNewAfter**(`selection`, `restoreSelection?`): `null` \| [`ElementNode`](lexical.ElementNode.md)

#### 參數

| 名稱               | 類型                                          | 預設值      |
| :----------------- | :-------------------------------------------- | :---------- |
| `selection`        | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 返回

`null` \| [`ElementNode`](lexical.ElementNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:147](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L147)

---

### isInline

▸ **isInline**(): `true`

#### 返回

`true`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[isInline](lexical.ElementNode.md#isinline)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:168](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L168)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `element`, `config`): `boolean`

當節點發生變化時調用此函式，應根據需要更新 DOM，使其與更新期間可能發生的任何變化保持一致。

在此處返回 "true" 會導致 Lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。如果元素標籤發生變化，您需要這樣做。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`MarkNode`](lexical_mark.MarkNode.md)               |
| `element`  | `HTMLElement`                                        |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回

`boolean`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:80](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L80)

---

### clone

▸ **clone**(`node`): [`MarkNode`](lexical_mark.MarkNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState 中（但不將其附加到任何地方！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                   |
| :----- | :------------------------------------- |
| `node` | [`MarkNode`](lexical_mark.MarkNode.md) |

#### 返回

[`MarkNode`](lexical_mark.MarkNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L41)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且在註冊於編輯器中的節點之間必須是唯一的。

#### 返回

`string`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L37)

---

### importDOM

▸ **importDOM**(): `null`

#### 返回

`null`

#### 重寫自

ElementNode.importDOM

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L45)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`MarkNode`](lexical_mark.MarkNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現與序列化介面之間的抽象，如果你曾經對節點模式進行重大更改（通過添加或刪除屬性），這會變得很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                  |
| :--------------- | :-------------------------------------------------------------------- |
| `serializedNode` | [`SerializedMarkNode`](../modules/lexical_mark.md#serializedmarknode) |

#### 返回

[`MarkNode`](lexical_mark.MarkNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:49](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L49)
