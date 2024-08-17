---
id: 'lexical_table.TableCellNode'
title: 'Class: TableCellNode'
custom_edit_url: null
---

[@lexical/table](../modules/lexical_table.md).TableCellNode

## 繼承結構

[`ElementNode`](lexical.ElementNode.md)

↳ **`TableCellNode`**

## 構造函式

### constructor

• **new TableCellNode**(`headerState?`, `colSpan?`, `width?`, `key?`): [`TableCellNode`](lexical_table.TableCellNode.md)

#### 參數

| 名稱          | 類型     | 預設值                            |
| :------------ | :------- | :-------------------------------- |
| `headerState` | `number` | `TableCellHeaderStates.NO_STATUS` |
| `colSpan`     | `number` | `1`                               |
| `width?`      | `number` | `undefined`                       |
| `key?`        | `string` | `undefined`                       |

#### 返回

[`TableCellNode`](lexical_table.TableCellNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:109](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L109)

## 函式

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 返回

`false`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:280](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L280)

---

### canIndent

▸ **canIndent**(): `false`

#### 返回

`false`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[canIndent](lexical.ElementNode.md#canindent)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:284](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L284)

---

### collapseAtStart

▸ **collapseAtStart**(): `true`

#### 返回

`true`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:276](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L276)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在調和過程中調用以確定應插入到 DOM 中的節點。

此函式必須返回一個 `HTMLElement`。不支援嵌套元素。

在此更新生命週期階段，請不要嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                   |
| :------- | :--------------------------------------------------- | :----------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在調和過程中訪問如 EditorTheme（應用類別）等內容。 |

#### 返回

`HTMLElement`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:123](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L123)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於 Lexical 與非 Lexical 編輯器之間的複製和粘貼，或具有不同命名空間的 Lexical 編輯器非常重要，因為主要的轉換格式是 HTML。如果你正在通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 將其序列化為 HTML，也很重要。你還可以使用此函式構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 返回

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:150](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L150)

---

### exportJSON

▸ **exportJSON**(): [`SerializedTableCellNode`](../modules/lexical_table.md#serializedtablecellnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你正在將其序列化為 JSON 以便於某處持久儲存，也很重要。
參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedTableCellNode`](../modules/lexical_table.md#serializedtablecellnode)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:180](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L180)

---

### getBackgroundColor

▸ **getBackgroundColor**(): `null` \| `string`

#### 返回

`null` \| `string`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:234](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L234)

---

### getColSpan

▸ **getColSpan**(): `number`

#### 返回

`number`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:192](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L192)

---

### getHeaderStyles

▸ **getHeaderStyles**(): `number`

#### 返回

`number`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:220](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L220)

---

### getRowSpan

▸ **getRowSpan**(): `number`

#### 返回

`number`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:201](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L201)

---

### getTag

▸ **getTag**(): `string`

#### 返回

`string`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:210](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L210)

### getWidth

▸ **getWidth**(): `undefined` \| `number`

#### 返回

`undefined` \| `number`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:230](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L230)

---

### hasHeader

▸ **hasHeader**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:258](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L258)

---

### hasHeaderState

▸ **hasHeaderState**(`headerState`): `boolean`

#### 參數

| 名稱          | 類型     |
| :------------ | :------- |
| `headerState` | `number` |

#### 返回

`boolean`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:254](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L254)

---

### isShadowRoot

▸ **isShadowRoot**(): `boolean`

#### 返回

`boolean`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[isShadowRoot](lexical.ElementNode.md#isshadowroot)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:272](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L272)

---

### setBackgroundColor

▸ **setBackgroundColor**(`newBackgroundColor`): `void`

#### 參數

| 名稱                 | 類型               |
| :------------------- | :----------------- |
| `newBackgroundColor` | `null` \| `string` |

#### 返回

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:238](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L238)

---

### setColSpan

▸ **setColSpan**(`colSpan`): `this`

#### 參數

| 名稱      | 類型     |
| :-------- | :------- |
| `colSpan` | `number` |

#### 返回

`this`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:196](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L196)

---

### setHeaderStyles

▸ **setHeaderStyles**(`headerState`): `number`

#### 參數

| 名稱          | 類型     |
| :------------ | :------- |
| `headerState` | `number` |

#### 返回

`number`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:214](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L214)

---

### setRowSpan

▸ **setRowSpan**(`rowSpan`): `this`

#### 參數

| 名稱      | 類型     |
| :-------- | :------- |
| `rowSpan` | `number` |

#### 返回

`this`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:205](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L205)

---

### setWidth

▸ **setWidth**(`width`): `undefined` \| `null` \| `number`

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `width` | `number` |

#### 返回

`undefined` \| `null` \| `number`

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:224](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L224)

---

### toggleHeaderStyle

▸ **toggleHeaderStyle**(`headerStateToToggle`): [`TableCellNode`](lexical_table.TableCellNode.md)

#### 參數

| 名稱                  | 類型     |
| :-------------------- | :------- |
| `headerStateToToggle` | `number` |

#### 返回

[`TableCellNode`](lexical_table.TableCellNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:242](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L242)

---

### updateDOM

▸ **updateDOM**(`prevNode`): `boolean`

當節點變更且應該更新 DOM 以使其與可能在更新過程中發生的任何變更對齊時調用。

返回 "true" 將導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，當元素標籤變更時，你需要這麼做。

#### 參數

| 名稱       | 類型                                              |
| :--------- | :------------------------------------------------ |
| `prevNode` | [`TableCellNode`](lexical_table.TableCellNode.md) |

#### 返回

`boolean`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:262](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L262)

---

### clone

▸ **clone**(`node`): [`TableCellNode`](lexical_table.TableCellNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState（但不附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱   | 類型                                              |
| :----- | :------------------------------------------------ |
| `node` | [`TableCellNode`](lexical_table.TableCellNode.md) |

#### 返回

[`TableCellNode`](lexical_table.TableCellNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:71](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L71)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且在編輯器中註冊的節點之間必須唯一。

#### 返回

`string`

#### 重寫自

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:67](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L67)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 重寫自

ElementNode.importDOM

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:83](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L83)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`TableCellNode`](lexical_table.TableCellNode.md)

控制如何從 JSON 反序列化此節點。這通常是模板代碼，但提供了節點實現與序列化介面之間的抽象，如果你對節點模式進行重大更改（通過添加或刪除屬性），這可能會很重要。
參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                             |
| :--------------- | :------------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedTableCellNode`](../modules/lexical_table.md#serializedtablecellnode) |

#### 返回

[`TableCellNode`](lexical_table.TableCellNode.md)

#### 重寫自

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:96](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L96)
