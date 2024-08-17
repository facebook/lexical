---
id: 'lexical.RangeSelection'
title: 'Class: RangeSelection'
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

## 函式

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

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getTextContent](../interfaces/lexical.BaseSelection.md#gettextcontent)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:540](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L540)

---

### hasFormat

▸ **hasFormat**(`type`): `boolean`

返回提供的 TextFormatType 是否存在於選取中。如果選取中的任何節點具有指定格式，則為 true。

#### 參數

| 名稱   | 類型                                                     | 描述                      |
| :----- | :------------------------------------------------------- | :------------------------ |
| `type` | [`TextFormatType`](../modules/lexical.md#textformattype) | 要檢查的 TextFormatType。 |

#### 回傳值

`boolean`

如果提供的格式當前在選取中啟用，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/LexicalSelection.ts:683](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L683)

---

### insertLineBreak

▸ **insertLineBreak**(`selectStart?`): `void`

在 EditorState 的當前選取位置插入一個邏輯換行符，這可以是新的 LineBreakNode 或新的 ParagraphNode。

#### 參數

| 名稱           | 類型      |
| :------------- | :-------- |
| `selectStart?` | `boolean` |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1338](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1338)

---

### insertNodes

▸ **insertNodes**(`nodes`): `void`

嘗試根據一組啟發式函式「智能地」將任意列表的 Lexical 節點插入到 EditorState 的當前選取中，這些函式決定如何更改、替換或移動周圍的節點以容納插入的節點。

#### 參數

| 名稱    | 類型                                      | 描述         |
| :------ | :---------------------------------------- | :----------- |
| `nodes` | [`LexicalNode`](lexical.LexicalNode.md)[] | 要插入的節點 |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertNodes](../interfaces/lexical.BaseSelection.md#insertnodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1208](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1208)

---

### insertParagraph

▸ **insertParagraph**(): `null` \| [`ElementNode`](lexical.ElementNode.md)

在 EditorState 的當前選取位置插入一個新的 ParagraphNode。

#### 回傳值

`null` \| [`ElementNode`](lexical.ElementNode.md)

新插入的節點。

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1310](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1310)

---

### insertRawText

▸ **insertRawText**(`text`): `void`

嘗試將提供的文本插入到 EditorState 的當前選取中。將制表符、新行和回車符轉換為 LexicalNodes。

#### 參數

| 名稱   | 類型     | 描述                 |
| :----- | :------- | :------------------- |
| `text` | `string` | 要插入到選取中的文本 |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertRawText](../interfaces/lexical.BaseSelection.md#insertrawtext)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:694](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L694)

---

### insertText

▸ **insertText**(`text`): `void`

嘗試將提供的文本作為新的 Lexical TextNode 插入到 EditorState 的當前選取中，根據選取類型和位置的系列插入啟發式函式進行操作。

#### 參數

| 名稱   | 類型     | 描述                 |
| :----- | :------- | :------------------- |
| `text` | `string` | 要插入到選取中的文本 |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertText](../interfaces/lexical.BaseSelection.md#inserttext)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:717](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L717)

---

### is

▸ **is**(`selection`): `boolean`

用於檢查提供的選取是否在值上等於這個選取，包括錨點、焦點、格式和樣式屬性。

#### 參數

| 名稱        | 類型                                                                | 描述                     |
| :---------- | :------------------------------------------------------------------ | :----------------------- |
| `selection` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 要與這個選取比較的選取。 |

#### 回傳值

`boolean`

如果選取相等，則為 true，否則為 false。

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[is](../interfaces/lexical.BaseSelection.md#is)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:435](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L435)

---

### isBackward

▸ **isBackward**(): `boolean`

返回選取是否為「向後」，即焦點在 EditorState 中邏輯上位於錨點之前。

#### 回傳值

`boolean`

如果選取是向後的，則為 true，否則為 false。

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[isBackward](../interfaces/lexical.BaseSelection.md#isbackward)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1752](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1752)

---

### isCollapsed

▸ **isCollapsed**(): `boolean`

返回選取是否為「折疊」，即錨點和焦點是同一節點且有相同的偏移量。

#### 回傳值

`boolean`

如果選取是折疊的，則為 true，否則為 false。

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[isCollapsed](../interfaces/lexical.BaseSelection.md#iscollapsed)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:453](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L453)

---

### modify

▸ **modify**(`alter`, `isBackward`, `granularity`): `void`

根據參數和考慮各種節點類型的一組啟發式函式修改選取。可以用於安全地移動或擴展選取一個邏輯「單位」，而無需顯式處理所有可能的節點類型。

#### 參數

| 名稱          | 類型                                          | 描述             |
| :------------ | :-------------------------------------------- | :--------------- |
| `alter`       | `"move"` \| `"extend"`                        | 要執行的修改類型 |
| `isBackward`  | `boolean`                                     | 選取是否向後     |
| `granularity` | `"character"` \| `"word"` \| `"lineboundary"` | 應用修改的粒度   |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1413](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1413)

---

### removeText

▸ **removeText**(): `void`

刪除選取中的文本，並相應地調整 EditorState。

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1063](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1063)

---

### setCachedNodes

▸ **setCachedNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                                |
| :------ | :-------------------------------------------------- |
| `nodes` | `null` \| [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[setCachedNodes](../interfaces/lexical.BaseSelection.md#setcachednodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:425](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L425)

---

### setStyle

▸ **setStyle**(`style`): `void`

設置選取的樣式屬性值。

#### 參數

| 名稱    | 類型     | 描述                   |
| :------ | :------- | :--------------------- |
| `style` | `string` | 要設置的樣式屬性的值。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:671](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L671)

---

### setTextNodeRange

▸ **setTextNodeRange**(`anchorNode`, `anchorOffset`, `focusNode`, `focusOffset`): `void`

設置此選取為「文本」類型，並使用提供的錨點和焦點值。

#### 參數

| 名稱           | 類型                              | 描述                       |
| :------------- | :-------------------------------- | :------------------------- |
| `anchorNode`   | [`TextNode`](lexical.TextNode.md) | 要在選取上設置的錨點節點   |
| `anchorOffset` | `number`                          | 要在選取上設置的偏移量     |
| `focusNode`    | [`TextNode`](lexical.TextNode.md) | 要在選取上設置的焦點節點   |
| `focusOffset`  | `number`                          | 要在選取上設置的焦點偏移量 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:523](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L523)

---

### toggleFormat

▸ **toggleFormat**(`format`): `void`

在選取中的所有 TextNodes 上切換提供的格式。

#### 參數

| 名稱     | 類型                                                     | 描述                                    |
| :------- | :------------------------------------------------------- | :-------------------------------------- |
| `format` | [`TextFormatType`](../modules/lexical.md#textformattype) | 要在選取中的 TextNodes 上切換的格式類型 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:661](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L661)
