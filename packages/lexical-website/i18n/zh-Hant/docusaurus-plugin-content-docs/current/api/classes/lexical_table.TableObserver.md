---
id: 'lexical_table.TableObserver'
title: 'Class: TableObserver'
custom_edit_url: null
---

[@lexical/table](../modules/lexical_table.md).TableObserver

## 構造函式

### constructor

• **new TableObserver**(`editor`, `tableNodeKey`): [`TableObserver`](lexical_table.TableObserver.md)

#### 參數

| 名稱           | 類型                                        |
| :------------- | :------------------------------------------ |
| `editor`       | [`LexicalEditor`](lexical.LexicalEditor.md) |
| `tableNodeKey` | `string`                                    |

#### 回傳值

[`TableObserver`](lexical_table.TableObserver.md)

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:77](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L77)

## 屬性

### anchorCell

• **anchorCell**: `null` \| [`TableDOMCell`](../modules/lexical_table.md#tabledomcell)

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:68](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L68)

---

### anchorCellNodeKey

• **anchorCellNodeKey**: `null` \| `string`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L70)

---

### anchorX

• **anchorX**: `number`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:65](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L65)

---

### anchorY

• **anchorY**: `number`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L66)

---

### editor

• **editor**: [`LexicalEditor`](lexical.LexicalEditor.md)

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L72)

---

### focusCell

• **focusCell**: `null` \| [`TableDOMCell`](../modules/lexical_table.md#tabledomcell)

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L69)

---

### focusCellNodeKey

• **focusCellNodeKey**: `null` \| `string`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:71](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L71)

---

### focusX

• **focusX**: `number`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:60](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L60)

---

### focusY

• **focusY**: `number`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:61](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L61)

---

### hasHijackedSelectionStyles

• **hasHijackedSelectionStyles**: `boolean`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L74)

---

### isHighlightingCells

• **isHighlightingCells**: `boolean`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L64)

---

### isSelecting

• **isSelecting**: `boolean`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:75](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L75)

---

### listenersToRemove

• **listenersToRemove**: `Set`\<() => `void`\>

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L62)

---

### table

• **table**: `TableDOMTable`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L63)

---

### tableNodeKey

• **tableNodeKey**: `string`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:67](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L67)

---

### tableSelection

• **tableSelection**: `null` \| [`TableSelection`](lexical_table.TableSelection.md)

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:73](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L73)

## 函式

### clearHighlight

▸ **clearHighlight**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:161](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L161)

### clearText

▸ **clearText**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:367](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L367)

---

### disableHighlightStyle

▸ **disableHighlightStyle**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:215](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L215)

---

### enableHighlightStyle

▸ **enableHighlightStyle**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:197](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L197)

---

### formatCells

▸ **formatCells**(`type`): `void`

#### 參數

| 名稱   | 類型                                                     |
| :----- | :------------------------------------------------------- |
| `type` | [`TextFormatType`](../modules/lexical.md#textformattype) |

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:340](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L340)

---

### getTable

▸ **getTable**(): `TableDOMTable`

#### 回傳值

`TableDOMTable`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:101](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L101)

---

### removeListeners

▸ **removeListeners**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:105](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L105)

---

### setAnchorCellForSelection

▸ **setAnchorCellForSelection**(`cell`): `void`

#### 參數

| 名稱   | 類型                                                       |
| :----- | :--------------------------------------------------------- |
| `cell` | [`TableDOMCell`](../modules/lexical_table.md#tabledomcell) |

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:320](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L320)

---

### setFocusCellForSelection

▸ **setFocusCellForSelection**(`cell`, `ignoreStart?`): `void`

#### 參數

| 名稱          | 類型                                                       | 預設值      |
| :------------ | :--------------------------------------------------------- | :---------- |
| `cell`        | [`TableDOMCell`](../modules/lexical_table.md#tabledomcell) | `undefined` |
| `ignoreStart` | `boolean`                                                  | `false`     |

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:244](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L244)

---

### trackTable

▸ **trackTable**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L111)

---

### updateTableTableSelection

▸ **updateTableTableSelection**(`selection`): `void`

#### 參數

| 名稱        | 類型                                                          |
| :---------- | :------------------------------------------------------------ |
| `selection` | `null` \| [`TableSelection`](lexical_table.TableSelection.md) |

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:229](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L229)
