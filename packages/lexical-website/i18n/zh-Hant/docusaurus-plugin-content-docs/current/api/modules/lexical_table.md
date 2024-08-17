---
id: 'lexical_table'
title: '模組: @lexical/table'
custom_edit_url: null
---

## 類別

- [TableCellNode](../classes/lexical_table.TableCellNode.md)
- [TableNode](../classes/lexical_table.TableNode.md)
- [TableObserver](../classes/lexical_table.TableObserver.md)
- [TableRowNode](../classes/lexical_table.TableRowNode.md)
- [TableSelection](../classes/lexical_table.TableSelection.md)

## 類型別名

### HTMLTableElementWithWithTableSelectionState

Ƭ **HTMLTableElementWithWithTableSelectionState**: `HTMLTableElement` & `Record`\<typeof `LEXICAL_ELEMENT_KEY`, [`TableObserver`](../classes/lexical_table.TableObserver.md)\>

#### 定義於

[packages/lexical-table/src/LexicalTableSelectionHelpers.ts:897](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelectionHelpers.ts#L897)

---

### InsertTableCommandPayload

Ƭ **InsertTableCommandPayload**: `Readonly`\<\{ `columns`: `string` ; `includeHeaders?`: [`InsertTableCommandPayloadHeaders`](lexical_table.md#inserttablecommandpayloadheaders) ; `rows`: `string` }\>

#### 定義於

[packages/lexical-table/src/LexicalTableCommands.ts:20](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCommands.ts#L20)

---

### InsertTableCommandPayloadHeaders

Ƭ **InsertTableCommandPayloadHeaders**: `Readonly`\<\{ `columns`: `boolean` ; `rows`: `boolean` }\> \| `boolean`

#### 定義於

[packages/lexical-table/src/LexicalTableCommands.ts:13](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCommands.ts#L13)

---

### SerializedTableCellNode

Ƭ **SerializedTableCellNode**: [`Spread`](lexical.md#spread)\<\{ `backgroundColor?`: `null` \| `string` ; `colSpan?`: `number` ; `headerState`: `TableCellHeaderState` ; `rowSpan?`: `number` ; `width?`: `number` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L43)

---

### SerializedTableNode

Ƭ **SerializedTableNode**: [`SerializedElementNode`](lexical.md#serializedelementnode)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:33](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L33)

---

### SerializedTableRowNode

Ƭ **SerializedTableRowNode**: [`Spread`](lexical.md#spread)\<\{ `height?`: `number` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:25](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L25)

---

### TableDOMCell

Ƭ **TableDOMCell**: `Object`

#### 類型聲明

| 名稱                 | 類型          |
| :------------------- | :------------ |
| `elem`               | `HTMLElement` |
| `hasBackgroundColor` | `boolean`     |
| `highlighted`        | `boolean`     |
| `x`                  | `number`      |
| `y`                  | `number`      |

#### 定義於

[packages/lexical-table/src/LexicalTableObserver.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableObserver.ts#L43)

---

### TableMapType

Ƭ **TableMapType**: [`TableMapValueType`](lexical_table.md#tablemapvaluetype)[][]

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L40)

---

### TableMapValueType

Ƭ **TableMapValueType**: `Object`

#### 類型聲明

| 名稱          | 類型                                                         |
| :------------ | :----------------------------------------------------------- |
| `cell`        | [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |
| `startColumn` | `number`                                                     |
| `startRow`    | `number`                                                     |

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L35)

---

### TableSelectionShape

Ƭ **TableSelectionShape**: `Object`

#### 類型聲明

| 名稱    | 類型     |
| :------ | :------- |
| `fromX` | `number` |
| `fromY` | `number` |
| `toX`   | `number` |
| `toY`   | `number` |

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:28](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L28)

## 變數

### INSERT_TABLE_COMMAND

• `Const` **INSERT_TABLE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<[`InsertTableCommandPayload`](lexical_table.md#inserttablecommandpayload)\>

#### 定義於

[packages/lexical-table/src/LexicalTableCommands.ts:26](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCommands.ts#L26)

---

### TableCellHeaderStates

• `Const` **TableCellHeaderStates**: `Object`

#### 類型聲明

| 名稱        | 類型     |
| :---------- | :------- |
| `BOTH`      | `number` |
| `COLUMN`    | `number` |
| `NO_STATUS` | `number` |
| `ROW`       | `number` |

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:33](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L33)

## 函數

### $computeTableMap

▸ **$computeTableMap**(`grid`, `cellA`, `cellB`): [[`TableMapType`](lexical_table.md#tablemaptype), [`TableMapValueType`](lexical_table.md#tablemapvaluetype), [`TableMapValueType`](lexical_table.md#tablemapvaluetype)]

#### 參數

| 名稱    | 類型                                                         |
| :------ | :----------------------------------------------------------- |
| `grid`  | [`TableNode`](../classes/lexical_table.TableNode.md)         |
| `cellA` | [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |
| `cellB` | [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |

#### 返回

[[`TableMapType`](lexical_table.md#tablemaptype), [`TableMapValueType`](lexical_table.md#tablemapvaluetype), [`TableMapValueType`](lexical_table.md#tablemapvaluetype)]

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:724](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L724)

---

### $computeTableMapSkipCellCheck

▸ **$computeTableMapSkipCellCheck**(`grid`, `cellA`, `cellB`): [[`TableMapType`](lexical_table.md#tablemaptype), [`TableMapValueType`](lexical_table.md#tablemapvaluetype) \| `null`, [`TableMapValueType`](lexical_table.md#tablemapvaluetype) \| `null`]

#### 參數

| 名稱    | 類型                                                                   |
| :------ | :--------------------------------------------------------------------- |
| `grid`  | [`TableNode`](../classes/lexical_table.TableNode.md)                   |
| `cellA` | `null` \| [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |
| `cellB` | `null` \| [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |

#### 返回

[[`TableMapType`](lexical_table.md#tablemaptype), [`TableMapValueType`](lexical_table.md#tablemapvaluetype) \| `null`, [`TableMapValueType`](lexical_table.md#tablemapvaluetype) \| `null`]

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L739)

---

### $createTableCellNode

▸ **$createTableCellNode**(`

headerState`, `colSpan?`, `width?`): [`TableCellNode`](../classes/lexical_table.TableCellNode.md)

#### 參數

| 名稱          | 類型     | 預設值      |
| :------------ | :------- | :---------- |
| `headerState` | `number` | `undefined` |
| `colSpan`     | `number` | `1`         |
| `width?`      | `number` | `undefined` |

#### 返回

[`TableCellNode`](../classes/lexical_table.TableCellNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:362](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L362)

---

### $createTableNode

▸ **$createTableNode**(): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:248](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L248)

---

### $createTableNodeWithDimensions

▸ **$createTableNodeWithDimensions**(`rowCount`, `columnCount`, `includeHeaders?`): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱             | 類型                                                                                    | 預設值      |
| :--------------- | :-------------------------------------------------------------------------------------- | :---------- |
| `rowCount`       | `number`                                                                                | `undefined` |
| `columnCount`    | `number`                                                                                | `undefined` |
| `includeHeaders` | [`InsertTableCommandPayloadHeaders`](lexical_table.md#inserttablecommandpayloadheaders) | `true`      |

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L39)

---

### $createTableRowNode

▸ **$createTableRowNode**(`height?`): [`TableRowNode`](../classes/lexical_table.TableRowNode.md)

#### 參數

| 名稱      | 類型     |
| :-------- | :------- |
| `height?` | `number` |

#### 返回

[`TableRowNode`](../classes/lexical_table.TableRowNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:122](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L122)

---

### $createTableSelection

▸ **$createTableSelection**(): [`TableSelection`](../classes/lexical_table.TableSelection.md)

#### 返回

[`TableSelection`](../classes/lexical_table.TableSelection.md)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:347](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L347)

---

### $deleteTableColumn

▸ **$deleteTableColumn**(`tableNode`, `targetIndex`): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱          | 類型                                                 |
| :------------ | :--------------------------------------------------- |
| `tableNode`   | [`TableNode`](../classes/lexical_table.TableNode.md) |
| `targetIndex` | `number`                                             |

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:476](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L476)

---

### $deleteTableColumn\_\_EXPERIMENTAL

▸ **$deleteTableColumn\_\_EXPERIMENTAL**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:575](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L575)

---

### $deleteTableRow\_\_EXPERIMENTAL

▸ **$deleteTableRow\_\_EXPERIMENTAL**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:499](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L499)

---

### $findCellNode

▸ **$findCellNode**(`node`): `null` \| [`TableCellNode`](../classes/lexical_table.TableCellNode.md)

#### 參數

| 名稱   | 類型                                               |
| :----- | :------------------------------------------------- |
| `node` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

`null` \| [`TableCellNode`](../classes/lexical_table.TableCellNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableSelectionHelpers.ts:1284](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelectionHelpers.ts#L1284)

---

### $findTableNode

▸ **$findTableNode**(`node`): `null` \| [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱   | 類型                                               |
| :----- | :------------------------------------------------- |
| `node` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

`null` \| [`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableSelectionHelpers.ts:1289](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelectionHelpers.ts#L1289)

---

### $getElementForTableNode

▸ **$getElementForTableNode**(`editor`, `tableNode`): `TableDOMTable`

#### 參數

| 名稱        | 類型                                                   |
| :---------- | :----------------------------------------------------- |
| `editor`    | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `tableNode` | [`TableNode`](../classes/lexical_table.TableNode.md)   |

#### 返回

`TableDOMTable`

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:231](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L231)

---

### $getNodeTriplet

▸ **$getNodeTriplet**(`source`): [[`TableCellNode`](../classes/lexical_table.TableCellNode.md), [`TableRowNode`](../classes/lexical_table.TableRowNode.md), [`TableNode`](../classes/lexical_table.TableNode.md)]

#### 參數

| 名稱     | 類型                                                                                                                                                      |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source` | [`LexicalNode`](../classes/lexical.LexicalNode.md) \| [`PointType`](lexical.md#pointtype) \| [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |

#### 返回

[[`TableCellNode`](../classes/lexical_table.TableCellNode.md), [`TableRowNode`](../classes/lexical_table.TableRowNode.md), [`TableNode`](../classes/lexical_table.TableNode.md)]

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:798](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L798)

---

### $getTableCellNodeFromLexicalNode

▸ **$getTableCellNodeFromLexicalNode**(`startingNode`): [`TableCellNode`](../classes/lexical_table.TableCellNode.md) \| `null`

#### 參數

| 名稱           | 類型                                               |
| :------------- | :------------------------------------------------- |
| `startingNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

[`TableCellNode`](../classes/lexical_table.TableCellNode.md) \| `null`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:81](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L81)

---

### $getTableCellNodeRect

▸ **$getTableCellNodeRect**(`tableCellNode`): \{ `colSpan`: `number` ; `columnIndex`: `number` ; `rowIndex`: `number` ; `rowSpan`: `number` } \| `null`

#### 參數

| 名稱            | 類型                                                         |
| :-------------- | :----------------------------------------------------------- |
| `tableCellNode` | [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |

#### 返回

\{ `colSpan`: `number` ; `columnIndex`: `number` ; `rowIndex`: `number` ; `rowSpan`: `number` } \| `null`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:832](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L832)

---

### $getTableColumnIndexFromTableCellNode

▸ **$getTableColumnIndexFromTableCellNode**(`tableCellNode`): `number`

#### 參數

| 名稱            | 類型                                                         |
| :-------------- | :----------------------------------------------------------- |
| `tableCellNode` | [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |

#### 返回

`number`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:125](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L125)

---

### $getTableNodeFromLexicalNodeOrThrow

▸ **$getTableNodeFromLexicalNodeOrThrow**(`startingNode`): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱 | 類型 |
| :

------------- | :------------------------------------------------- |
| `startingNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:105](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L105)

### $getTableRowIndexFromTableCellNode

▸ **$getTableRowIndexFromTableCellNode**(`tableCellNode`): `number`

#### 參數

| 名稱            | 類型                                                         |
| :-------------- | :----------------------------------------------------------- |
| `tableCellNode` | [`TableCellNode`](../classes/lexical_table.TableCellNode.md) |

#### 返回

`number`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:117](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L117)

---

### $getTableRowNodeFromTableCellNodeOrThrow

▸ **$getTableRowNodeFromTableCellNodeOrThrow**(`startingNode`): [`TableRowNode`](../classes/lexical_table.TableRowNode.md)

#### 參數

| 名稱           | 類型                                               |
| :------------- | :------------------------------------------------- |
| `startingNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

[`TableRowNode`](../classes/lexical_table.TableRowNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:93](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L93)

---

### $insertTableColumn

▸ **$insertTableColumn**(`tableNode`, `targetIndex`, `shouldInsertAfter?`, `columnCount`, `table`): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱                | 類型                                                 | 預設值      |
| :------------------ | :--------------------------------------------------- | :---------- |
| `tableNode`         | [`TableNode`](../classes/lexical_table.TableNode.md) | `undefined` |
| `targetIndex`       | `number`                                             | `undefined` |
| `shouldInsertAfter` | `boolean`                                            | `true`      |
| `columnCount`       | `number`                                             | `undefined` |
| `table`             | `TableDOMTable`                                      | `undefined` |

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:317](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L317)

---

### $insertTableColumn\_\_EXPERIMENTAL

▸ **$insertTableColumn\_\_EXPERIMENTAL**(`insertAfter?`): `void`

#### 參數

| 名稱          | 類型      | 預設值 |
| :------------ | :-------- | :----- |
| `insertAfter` | `boolean` | `true` |

#### 返回

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:376](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L376)

---

### $insertTableRow

▸ **$insertTableRow**(`tableNode`, `targetIndex`, `shouldInsertAfter?`, `rowCount`, `table`): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱                | 類型                                                 | 預設值      |
| :------------------ | :--------------------------------------------------- | :---------- |
| `tableNode`         | [`TableNode`](../classes/lexical_table.TableNode.md) | `undefined` |
| `targetIndex`       | `number`                                             | `undefined` |
| `shouldInsertAfter` | `boolean`                                            | `true`      |
| `rowCount`          | `number`                                             | `undefined` |
| `table`             | `TableDOMTable`                                      | `undefined` |

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:168](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L168)

---

### $insertTableRow\_\_EXPERIMENTAL

▸ **$insertTableRow\_\_EXPERIMENTAL**(`insertAfter?`): `void`

#### 參數

| 名稱          | 類型      | 預設值 |
| :------------ | :-------- | :----- |
| `insertAfter` | `boolean` | `true` |

#### 返回

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:248](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L248)

---

### $isTableCellNode

▸ **$isTableCellNode**(`node`): node is TableCellNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node is TableCellNode

#### 定義於

[packages/lexical-table/src/LexicalTableCellNode.ts:370](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableCellNode.ts#L370)

---

### $isTableNode

▸ **$isTableNode**(`node`): node is TableNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node is TableNode

#### 定義於

[packages/lexical-table/src/LexicalTableNode.ts:252](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableNode.ts#L252)

---

### $isTableRowNode

▸ **$isTableRowNode**(`node`): node is TableRowNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node is TableRowNode

#### 定義於

[packages/lexical-table/src/LexicalTableRowNode.ts:126](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableRowNode.ts#L126)

---

### $isTableSelection

▸ **$isTableSelection**(`x`): x is TableSelection

#### 參數

| 名稱 | 類型      |
| :--- | :-------- |
| `x`  | `unknown` |

#### 返回

x is TableSelection

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:343](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L343)

---

### $removeTableRowAtIndex

▸ **$removeTableRowAtIndex**(`tableNode`, `indexToDelete`): [`TableNode`](../classes/lexical_table.TableNode.md)

#### 參數

| 名稱            | 類型                                                 |
| :-------------- | :--------------------------------------------------- |
| `tableNode`     | [`TableNode`](../classes/lexical_table.TableNode.md) |
| `indexToDelete` | `number`                                             |

#### 返回

[`TableNode`](../classes/lexical_table.TableNode.md)

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:153](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L153)

---

### $unmergeCell

▸ **$unmergeCell**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableUtils.ts:666](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableUtils.ts#L666)

---

### applyTableHandlers

▸ **applyTableHandlers**(`tableNode`, `tableElement`, `editor`, `hasTabHandler`): [`TableObserver`](../classes/lexical_table.TableObserver.md)

#### 參數

| 名稱            | 類型                                                                                                          |
| :-------------- | :------------------------------------------------------------------------------------------------------------ |
| `tableNode`     | [`TableNode`](../classes/lexical_table.TableNode.md)                                                          |
| `tableElement`  | [`HTMLTableElementWithWithTableSelectionState`](lexical_table.md#htmltableelementwithwithtableselectionstate) |
| `editor`        | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)                                                        |
| `hasTabHandler` | `boolean`                                                                                                     |

#### 返回

[`TableObserver`](../classes/lexical_table.TableObserver.md)

#### 定義於

[packages/lexical-table/src/LexicalTableSelectionHelpers.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelectionHelpers.ts#L86)

---

### getDOMCellFromTarget

▸ \*\*

getDOMCellFromTarget\*\*(`node`): [`TableDOMCell`](lexical_table.md#tabledomcell) \| `null`

#### 參數

| 名稱   | 類型   |
| :----- | :----- |
| `node` | `Node` |

#### 返回

[`TableDOMCell`](lexical_table.md#tabledomcell) \| `null`

#### 定義於

[packages/lexical-table/src/LexicalTableSelectionHelpers.ts:913](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelectionHelpers.ts#L913)

---

### getTableObserverFromTableElement

▸ **getTableObserverFromTableElement**(`tableElement`): [`TableObserver`](../classes/lexical_table.TableObserver.md) \| `null`

#### 參數

| 名稱           | 類型                                                                                                          |
| :------------- | :------------------------------------------------------------------------------------------------------------ |
| `tableElement` | [`HTMLTableElementWithWithTableSelectionState`](lexical_table.md#htmltableelementwithwithtableselectionstate) |

#### 返回

[`TableObserver`](../classes/lexical_table.TableObserver.md) \| `null`

#### 定義於

[packages/lexical-table/src/LexicalTableSelectionHelpers.ts:907](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelectionHelpers.ts#L907)
