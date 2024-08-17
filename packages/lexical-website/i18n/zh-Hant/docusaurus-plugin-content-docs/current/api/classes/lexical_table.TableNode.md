---
id: 'lexical_table.TableNode'
title: 'Class: TableNode'
custom_edit_url: null
---

[@lexical/table](../modules/lexical_table.md).TableNode

## 階層

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`TableNode`**

## 建構子

### constructor

• **new TableNode**(`key?`): [`TableNode`](lexical_table.TableNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 回傳值

[`TableNode`](lexical_table.TableNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:58](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L58)

## 函式

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 回傳值

`false`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:114](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L114)

---

### canIndent

▸ **canIndent**(): `false`

#### 回傳值

`false`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[canIndent](lexical.ElementNode.md#canindent)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:226](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L226)

---

### canSelectBefore

▸ **canSelectBefore**(): `true`

#### 回傳值

`true`

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:222](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L222)

---

### createDOM

▸ **createDOM**(`config`, `editor?`): `HTMLElement`

在和解過程中呼叫，用於確定要插入到 DOM 中的節點。

此函式必須回傳一個 `HTMLElement`。不支援嵌套元素。

請勿在更新生命週期的此階段嘗試更新 Lexical EditorState。

#### 參數

| 名稱      | 類型                                                 | 描述                                                |
| :-------- | :--------------------------------------------------- | :-------------------------------------------------- |
| `config`  | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在和解期間訪問如 EditorTheme 等，以便應用樣式。 |
| `editor?` | [`LexicalEditor`](lexical.LexicalEditor.md)          | 允許在和解期間訪問編輯器的上下文。                  |

#### 回傳值

`HTMLElement`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L70)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制這個節點如何序列化為 HTML。這對於在 Lexical 和非 Lexical 編輯器之間複製和粘貼，或在具有不同命名空間的 Lexical 編輯器之間轉移，尤其重要，因為主要轉移格式是 HTML。如果你通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 將節點序列化為 HTML，也很重要。你也可以使用此函式構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:82](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L82)

---

### exportJSON

▸ **exportJSON**(): [`SerializedElementNode`](../modules/lexical.md#serializedelementnode)

控制這個節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼，以及在某處進行持久存儲時都很重要。

#### 回傳值

[`SerializedElementNode`](../modules/lexical.md#serializedelementnode)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L62)

---

### getCellNodeFromCords

▸ **getCellNodeFromCords**(`x`, `y`, `table`): `null` \| [`TableCellNode`](lexical_table.TableCellNode.md)

#### 參數

| 名稱    | 類型            |
| :------ | :-------------- |
| `x`     | `number`        |
| `y`     | `number`        |
| `table` | `TableDOMTable` |

#### 回傳值

`null` \| [`TableCellNode`](lexical_table.TableCellNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:188](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L188)

---

### getCellNodeFromCordsOrThrow

▸ **getCellNodeFromCordsOrThrow**(`x`, `y`, `table`): [`TableCellNode`](lexical_table.TableCellNode.md)

#### 參數

| 名稱    | 類型            |
| :------ | :-------------- |
| `x`     | `number`        |
| `y`     | `number`        |
| `table` | `TableDOMTable` |

#### 回傳值

[`TableCellNode`](lexical_table.TableCellNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:208](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L208)

---

### getCordsFromCellNode

▸ **getCordsFromCellNode**(`tableCellNode`, `table`): `Object`

#### 參數

| 名稱            | 類型                                              |
| :-------------- | :------------------------------------------------ |
| `tableCellNode` | [`TableCellNode`](lexical_table.TableCellNode.md) |
| `table`         | `TableDOMTable`                                   |

#### 回傳值

`Object`

| 名稱 | 類型     |
| :--- | :------- |
| `x`  | `number` |
| `y`  | `number` |

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:122](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L122)

---

### getDOMCellFromCords

▸ **getDOMCellFromCords**(`x`, `y`, `table`): `null` \| [`TableDOMCell`](../modules/lexical_table.md#tabledomcell)

#### 參數

| 名稱    | 類型            |
| :------ | :-------------- |
| `x`     | `number`        |
| `y`     | `number`        |
| `table` | `TableDOMTable` |

#### 回傳值

`null` \| [`TableDOMCell`](../modules/lexical_table.md#tabledomcell)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:152](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L152)

---

### getDOMCellFromCordsOrThrow

▸ **getDOMCellFromCordsOrThrow**(`x`, `y`, `table`): [`TableDOMCell`](../modules/lexical_table.md#tabledomcell)

#### 參數

| 名稱    | 類型            |
| :------ | :-------------- |
| `x`     | `number`        |
| `y`     | `number`        |
| `table` | `TableDOMTable` |

#### 回傳值

[`TableDOMCell`](../modules/lexical_table.md#tabledomcell)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:174](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L174)

---

### isShadowRoot

▸ **isShadowRoot**(): `boolean`

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[isShadowRoot](lexical.ElementNode.md#isshadowroot)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:118](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L118)

---

### updateDOM

▸ **updateDOM**(): `boolean`

當節點發生變化時呼叫，並且應該根據需要更新 DOM 以使其與更新過程中可能發生的任何變化對齊。

返回「true」將導致 Lexical 取消掛載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生更改，你需要這麼做。

#### 回傳值

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:78](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L78)

---

### clone

▸ **clone**(`node`): [`TableNode`](lexical_table.TableNode.md)

複製此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState（但不會附加到任何地方！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                      |
| :----- | :---------------------------------------- |
| `node` | [`TableNode`](lexical_table.TableNode.md) |

#### 回傳值

[`TableNode`](lexical_table.TableNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L41)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且在編輯器中必須是唯一的。

#### 回傳值

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L37)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

ElementNode.importDOM

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L45)

---

### importJSON

▸ **importJSON**(`_serializedNode`): [`TableNode`](lexical_table.TableNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現與序列化接口之間的抽象，這在你對節點模式進行重大更改（通過添加或刪除屬性）時可能很重要。

#### 參數

| 名稱              | 類型                                                                     |
| :---------------- | :----------------------------------------------------------------------- |
| `_serializedNode` | [`SerializedTableNode`](../modules/lexical_table.md#serializedtablenode) |

#### 回傳值

[`TableNode`](lexical_table.TableNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:54](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L54)
