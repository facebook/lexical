---
id: 'lexical_table.TableRowNode'
title: '類別: TableRowNode'
custom_edit_url: null
---

[@lexical/table](../modules/lexical_table.md).TableRowNode

## 階層結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`TableRowNode`**

## 建構函式

### constructor

• **new TableRowNode**(`height?`, `key?`): [`TableRowNode`](lexical_table.TableRowNode.md)

#### 參數

| 名稱      | 類型     |
| :-------- | :------- |
| `height?` | `number` |
| `key?`    | `string` |

#### 回傳值

[`TableRowNode`](lexical_table.TableRowNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:58](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L58)

## 方法

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 回傳值

`false`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:102](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L102)

---

### canIndent

▸ **canIndent**(): `false`

#### 回傳值

`false`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[canIndent](lexical.ElementNode.md#canindent)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:106](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L106)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在調解過程中呼叫，以確定要將哪些節點插入到此 Lexical 節點的 DOM 中。

此方法必須返回一個 `HTMLElement`。不支援嵌套元素。

在更新生命周期的此階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 說明                                                       |
| :------- | :--------------------------------------------------- | :--------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在調解過程中訪問像是 EditorTheme（以應用類別）等內容。 |

#### 回傳值

`HTMLElement`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L72)

---

### exportJSON

▸ **exportJSON**(): [`SerializedTableRowNode`](../modules/lexical_table.md#serializedtablerownode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。如果你要將 JSON 用於持久儲存，也很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedTableRowNode`](../modules/lexical_table.md#serializedtablerownode)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L63)

---

### getHeight

▸ **getHeight**(): `undefined` \| `number`

#### 回傳值

`undefined` \| `number`

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:94](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L94)

---

### isShadowRoot

▸ **isShadowRoot**(): `boolean`

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[isShadowRoot](lexical.ElementNode.md#isshadowroot)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:84](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L84)

---

### setHeight

▸ **setHeight**(`height`): `undefined` \| `null` \| `number`

#### 參數

| 名稱     | 類型     |
| :------- | :------- |
| `height` | `number` |

#### 回傳值

`undefined` \| `null` \| `number`

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:88](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L88)

---

### updateDOM

▸ **updateDOM**(`prevNode`): `boolean`

當節點發生變更時被呼叫，並應更新 DOM
以使其對齊任何在更新過程中可能發生的變化。

此處返回 "true" 會使 lexical 卸載並重新創建 DOM 節點
（通過呼叫 createDOM）。例如，當元素標籤更改時，你需要這樣做。

#### 參數

| 名稱       | 類型                                            |
| :--------- | :---------------------------------------------- |
| `prevNode` | [`TableRowNode`](lexical_table.TableRowNode.md) |

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:98](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L98)

---

### clone

▸ **clone**(`node`): [`TableRowNode`](lexical_table.TableRowNode.md)

複製此節點，創建一個具有不同鍵的新節點
並將其添加到 EditorState（但不附加到任何地方！）。所有節點必須
實現此方法。

#### 參數

| 名稱   | 類型                                            |
| :----- | :---------------------------------------------- |
| `node` | [`TableRowNode`](lexical_table.TableRowNode.md) |

#### 回傳值

[`TableRowNode`](lexical_table.TableRowNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L41)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須
實現此方法，並且必須在編輯器中註冊的節點中唯一。

#### 回傳值

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L37)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

ElementNode.importDOM

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L45)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`TableRowNode`](lexical_table.TableRowNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，
但提供了節點實現和序列化接口之間的抽象，
這在你對節點模式進行破壞性更改（通過添加或刪除屬性）時可能很重要。
請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                           |
| :--------------- | :----------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedTableRowNode`](../modules/lexical_table.md#serializedtablerownode) |

#### 回傳值

[`TableRowNode`](lexical_table.TableRowNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:54](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L54)
