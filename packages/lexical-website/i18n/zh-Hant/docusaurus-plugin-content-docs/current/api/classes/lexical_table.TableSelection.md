### TableSelection

[@lexical/table](../modules/lexical_table.md).TableSelection

## 實作

- [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

## 建構函式

### constructor

• **new TableSelection**(`tableKey`, `anchor`, `focus`): [`TableSelection`](lexical_table.TableSelection.md)

#### 參數

| 名稱       | 類型                                           |
| :--------- | :--------------------------------------------- |
| `tableKey` | `string`                                       |
| `anchor`   | [`PointType`](../modules/lexical.md#pointtype) |
| `focus`    | [`PointType`](../modules/lexical.md#pointtype) |

#### 回傳值

[`TableSelection`](lexical_table.TableSelection.md)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:49](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L49)

## 屬性

### \_cachedNodes

• **\_cachedNodes**: `null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[\_cachedNodes](../interfaces/lexical.BaseSelection.md#_cachednodes)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L46)

---

### anchor

• **anchor**: [`PointType`](../modules/lexical.md#pointtype)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L44)

---

### dirty

• **dirty**: `boolean`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[dirty](../interfaces/lexical.BaseSelection.md#dirty)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L47)

---

### focus

• **focus**: [`PointType`](../modules/lexical.md#pointtype)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L45)

---

### tableKey

• **tableKey**: `string`

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L43)

## 函式

### clone

▸ **clone**(): [`TableSelection`](lexical_table.TableSelection.md)

#### 回傳值

[`TableSelection`](lexical_table.TableSelection.md)

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[clone](../interfaces/lexical.BaseSelection.md#clone)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:99](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L99)

---

### extract

▸ **extract**(): [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[extract](../interfaces/lexical.BaseSelection.md#extract)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:107](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L107)

---

### getCachedNodes

▸ **getCachedNodes**(): `null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

`null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getCachedNodes](../interfaces/lexical.BaseSelection.md#getcachednodes)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L72)

---

### getNodes

▸ **getNodes**(): [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getNodes](../interfaces/lexical.BaseSelection.md#getnodes)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:181](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L181)

---

### getShape

▸ **getShape**(): [`TableSelectionShape`](../modules/lexical_table.md#tableselectionshape)

#### 回傳值

[`TableSelectionShape`](../modules/lexical_table.md#tableselectionshape)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:132](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L132)

---

### getStartEndPoints

▸ **getStartEndPoints**(): [[`PointType`](../modules/lexical.md#pointtype), [`PointType`](../modules/lexical.md#pointtype)]

#### 回傳值

[[`PointType`](../modules/lexical.md#pointtype), [`PointType`](../modules/lexical.md#pointtype)]

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getStartEndPoints](../interfaces/lexical.BaseSelection.md#getstartendpoints)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:59](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L59)

---

### getTextContent

▸ **getTextContent**(): `string`

#### 回傳值

`string`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getTextContent](../interfaces/lexical.BaseSelection.md#gettextcontent)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:333](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L333)

### insertNodes

▸ **insertNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                      |
| :------ | :---------------------------------------- |
| `nodes` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`void`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertNodes](../interfaces/lexical.BaseSelection.md#insertnodes)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:119](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L119)

---

### insertRawText

▸ **insertRawText**(`text`): `void`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

#### 回傳值

`void`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertRawText](../interfaces/lexical.BaseSelection.md#insertrawtext)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L111)

---

### insertText

▸ **insertText**(): `void`

#### 回傳值

`void`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertText](../interfaces/lexical.BaseSelection.md#inserttext)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:115](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L115)

---

### is

▸ **is**(`selection`): `boolean`

#### 參數

| 名稱        | 類型                                                                |
| :---------- | :------------------------------------------------------------------ |
| `selection` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 回傳值

`boolean`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[is](../interfaces/lexical.BaseSelection.md#is)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:80](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L80)

---

### isBackward

▸ **isBackward**(): `boolean`

回傳是否選擇範圍為「反向」，即焦點在邏輯上位於編輯狀態中的錨點之前。

#### 回傳值

`boolean`

如果選擇範圍為反向，回傳 `true`；否則回傳 `false`。

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[isBackward](../interfaces/lexical.BaseSelection.md#isbackward)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:68](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L68)

---

### isCollapsed

▸ **isCollapsed**(): `boolean`

#### 回傳值

`boolean`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[isCollapsed](../interfaces/lexical.BaseSelection.md#iscollapsed)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:103](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L103)

---

### set

▸ **set**(`tableKey`, `anchorCellKey`, `focusCellKey`): `void`

#### 參數

| 名稱            | 類型     |
| :-------------- | :------- |
| `tableKey`      | `string` |
| `anchorCellKey` | `string` |
| `focusCellKey`  | `string` |

#### 回傳值

`void`

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:91](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L91)

---

### setCachedNodes

▸ **setCachedNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                                |
| :------ | :-------------------------------------------------- |
| `nodes` | `null` \| [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`void`

#### 實作於

[BaseSelection](../interfaces/lexical.BaseSelection.md).[setCachedNodes](../interfaces/lexical.BaseSelection.md#setcachednodes)

#### 定義於

[packages/lexical-table/src/LexicalTableSelection.ts:76](https://github.com/facebook/lexical/tree/main/packages/lexical-table/src/LexicalTableSelection.ts#L76)
