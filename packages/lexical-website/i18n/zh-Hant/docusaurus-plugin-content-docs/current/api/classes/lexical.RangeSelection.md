---
id: 'lexical.RangeSelection'
title: '類別: RangeSelection'
custom_edit_url: null
---

[lexical](../modules/lexical.md).RangeSelection

## 實作

- [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

## 建構子

### constructor

• **new RangeSelection**(`anchor`, `focus`, `format`, `style`): [`RangeSelection`](lexical.RangeSelection.md)

#### 參數

| 名稱     | 類型                                           |
| :------- | :--------------------------------------------- |
| `anchor` | [`PointType`](../modules/lexical.md#pointtype) |
| `focus`  | [`PointType`](../modules/lexical.md#pointtype) |
| `format` | `number`                                       |
| `style`  | `string`                                       |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:405](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L405)

## 屬性

### \_cachedNodes

• **\_cachedNodes**: `null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[\_cachedNodes](../interfaces/lexical.BaseSelection.md#_cachednodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:402](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L402)

---

### anchor

• **anchor**: [`PointType`](../modules/lexical.md#pointtype)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:400](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L400)

---

### dirty

• **dirty**: `boolean`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[dirty](../interfaces/lexical.BaseSelection.md#dirty)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:403](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L403)

---

### focus

• **focus**: [`PointType`](../modules/lexical.md#pointtype)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L401)

---

### format

• **format**: `number`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:398](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L398)

---

### style

• **style**: `string`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:399](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L399)

## 方法

### applyDOMRange

▸ **applyDOMRange**(`range`): `void`

嘗試將 DOM 選取範圍映射到此 Lexical 選取，並相應設置 anchor、focus 和 type。

#### 參數

| 名稱    | 類型          | 描述                                   |
| :------ | :------------ | :------------------------------------- |
| `range` | `StaticRange` | 符合 StaticRange 介面的 DOM 選取範圍。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:608](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L608)

---

### clone

▸ **clone**(): [`RangeSelection`](lexical.RangeSelection.md)

創建一個新的 RangeSelection，並複製此範例中的所有屬性值。

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

一個新的 RangeSelection，其屬性值與此範例相同。

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[clone](../interfaces/lexical.BaseSelection.md#clone)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:644](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L644)

---

### deleteCharacter

▸ **deleteCharacter**(`isBackward`): `void`

根據當前的選取，對 EditorState 執行一次邏輯字符刪除操作。處理不同的節點類型。

#### 參數

| 名稱         | 類型      | 描述           |
| :----------- | :-------- | :------------- |
| `isBackward` | `boolean` | 選取是否向後。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1594](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1594)

---

### deleteLine

▸ **deleteLine**(`isBackward`): `void`

根據當前的選取，對 EditorState 執行一次邏輯行刪除操作。處理不同的節點類型。

#### 參數

| 名稱         | 類型      | 描述           |
| :----------- | :-------- | :------------- |
| `isBackward` | `boolean` | 選取是否向後。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1700](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1700)

---

### deleteWord

▸ **deleteWord**(`isBackward`): `void`

根據當前的選取，對 EditorState 執行一次邏輯字刪除操作。處理不同的節點類型。

#### 參數

| 名稱         | 類型      | 描述           |
| :----------- | :-------- | :------------- |
| `isBackward` | `boolean` | 選取是否向後。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1735](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1735)

---

### extract

▸ **extract**(): [`LexicalNode`](lexical.LexicalNode.md)[]

提取選取中的節點，必要時拆分節點以獲得偏移級別的精確度。

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

選取中的節點

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[extract](../interfaces/lexical.BaseSelection.md#extract)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1355](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1355)

---

### formatText

▸ **formatText**(`formatType`): `void`

將提供的格式應用到選取中的 TextNodes，必要時分割或合併節點。

#### 參數

| 名稱         | 類型                                                     | 描述                             |
| :----------- | :------------------------------------------------------- | :------------------------------- |
| `formatType` | [`TextFormatType`](../modules/lexical.md#textformattype) | 要應用於選取中的節點的格式類型。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1073](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1073)

---

### forwardDeletion

▸ **forwardDeletion**(`anchor`, `anchorNode`, `isBackward`): `boolean`

處理前向字符和單詞刪除的輔助工具，防止像表格、列佈局等元素節點被破壞。

#### 參數

| 名稱         | 類型                                                                         | 描述           |
| :----------- | :--------------------------------------------------------------------------- | :------------- |
| `anchor`     | [`PointType`](../modules/lexical.md#pointtype)                               | 錨點           |
| `anchorNode` | [`ElementNode`](lexical.ElementNode.md) \| [`TextNode`](lexical.TextNode.md) | 選取中的錨節點 |
| `isBackward` | `boolean`                                                                    | 選取是否向後   |

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1562](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1562)

---

### getCachedNodes

▸ **getCachedNodes**(): `null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

`null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getCachedNodes](../interfaces/lexical.BaseSelection.md#getcachednodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:421](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L421)

---

### getNodes

▸ **getNodes**(): [`LexicalNode`](lexical.LexicalNode.md)[]

獲取選取中的所有節點。使用緩存以使其一般適用於熱路徑。

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

一個包含選取中所有節點的數組

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getNodes](../interfaces/lexical.BaseSelection.md#getnodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:463](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L463)

---

### getStartEndPoints

▸ **getStartEndPoints**(): `null` \| [[`PointType`](../modules/lexical.md#pointtype), [`PointType`](../modules/lexical.md#pointtype)]

#### 回傳值

`null` \| [[`PointType`](../modules/lexical.md#pointtype), [`PointType`](../modules/lexical.md#pointtype)]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getStartEndPoints](../interfaces/lexical.BaseSelection.md#getstartendpoints)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1756](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1756)

---

### getTextContent

▸ **getTextContent**(): `string`

獲取選取中所有節點的（純）文本內容。

#### 回傳值

`string`

表示選取中所有節點文本內容的字符串
