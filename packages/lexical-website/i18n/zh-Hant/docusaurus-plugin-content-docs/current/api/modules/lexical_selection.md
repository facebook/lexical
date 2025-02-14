---
id: 'lexical_selection'
title: '模組: @lexical/selection'
custom_edit_url: null
---

## 參考

### $cloneWithProperties

重新匯出 [$cloneWithProperties](lexical.md#$clonewithproperties)

## 函數

### $addNodeStyle

▸ **$addNodeStyle**(`node`): `void`

獲取 TextNode 的樣式物件，並將樣式添加到 CSS 中。

#### 參數

| 名稱   | 類型                                         | 說明                    |
| :----- | :------------------------------------------- | :---------------------- |
| `node` | [`TextNode`](../classes/lexical.TextNode.md) | 要添加樣式的 TextNode。 |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/lexical-node.ts:236](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/lexical-node.ts#L236)

---

### $getSelectionStyleValueForProperty

▸ **$getSelectionStyleValueForProperty**(`selection`, `styleProperty`, `defaultValue?`): `string`

返回選擇中的 TextNodes 目前的 CSS 屬性值（如果已設定）。如果未設定，則返回 defaultValue。
如果所有 TextNodes 的值不相同，則返回空字串。

#### 參數

| 名稱            | 類型                                                                                                                       | 預設值      | 說明                            |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------- | :---------- | :------------------------------ |
| `selection`     | [`RangeSelection`](../classes/lexical.RangeSelection.md) \| [`TableSelection`](../classes/lexical_table.TableSelection.md) | `undefined` | 要查找值的 TextNodes 選擇範圍。 |
| `styleProperty` | `string`                                                                                                                   | `undefined` | CSS 樣式屬性。                  |
| `defaultValue`  | `string`                                                                                                                   | `''`        | 屬性的預設值，預設為空字串。    |

#### 返回

`string`

所選擇 TextNodes 的屬性值。

#### 定義於

[packages/lexical-selection/src/range-selection.ts:520](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L520)

---

### $isAtNodeEnd

▸ **$isAtNodeEnd**(`point`): `boolean`

判斷當前選擇是否在節點的末尾。

#### 參數

| 名稱    | 類型                                   | 說明             |
| :------ | :------------------------------------- | :--------------- |
| `point` | [`Point`](../classes/lexical.Point.md) | 要測試的選擇點。 |

#### 返回

`boolean`

如果提供的點偏移量在最後的位置，則返回 true，否則返回 false。

#### 定義於

[packages/lexical-selection/src/lexical-node.ts:92](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/lexical-node.ts#L92)

---

### $isParentElementRTL

▸ **$isParentElementRTL**(`selection`): `boolean`

測試父元素是否為從右到左的方向。

#### 參數

| 名稱        | 類型                                                     | 說明                       |
| :---------- | :------------------------------------------------------- | :------------------------- |
| `selection` | [`RangeSelection`](../classes/lexical.RangeSelection.md) | 要測試其父元素的選擇範圍。 |

#### 返回

`boolean`

如果選擇範圍的父元素的方向為 'rtl'（從右到左），則返回 true，否則返回 false。

#### 定義於

[packages/lexical-selection/src/range-selection.ts:426](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L426)

---

### $moveCaretSelection

▸ **$moveCaretSelection**(`selection`, `isHoldingShift`, `isBackward`, `granularity`): `void`

根據參數移動選擇範圍。

#### 參數

| 名稱             | 類型                                                     | 說明                                     |
| :--------------- | :------------------------------------------------------- | :--------------------------------------- |
| `selection`      | [`RangeSelection`](../classes/lexical.RangeSelection.md) | 選擇的文本或節點。                       |
| `isHoldingShift` | `boolean`                                                | 在操作期間是否按住了 shift 鍵。          |
| `isBackward`     | `boolean`                                                | 選擇是否向後選擇（焦點是否在錨點之前）？ |
| `granularity`    | `"character"` \| `"word"` \| `"lineboundary"`            | 調整當前選擇的距離。                     |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/range-selection.ts:412](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L412)

---

### $moveCharacter

▸ **$moveCharacter**(`selection`, `isHoldingShift`, `isBackward`): `void`

根據參數按字符移動選擇範圍。

#### 參數

| 名稱             | 類型                                                     | 說明                                     |
| :--------------- | :------------------------------------------------------- | :--------------------------------------- |
| `selection`      | [`RangeSelection`](../classes/lexical.RangeSelection.md) | 要移動的字符選擇。                       |
| `isHoldingShift` | `boolean`                                                | 在操作期間是否按住了 shift 鍵。          |
| `isBackward`     | `boolean`                                                | 選擇是否向後移動（焦點是否在錨點之前）？ |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/range-selection.ts:441](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L441)

---

### $patchStyleText

▸ **$patchStyleText**(`selection`, `patch`): `void`

將提供的樣式應用到提供的選擇中的 TextNodes。
會通過拆分 TextNode 並將樣式應用到適當的部分來更新部分選擇的 TextNodes。

#### 參數

| 名稱        | 類型                                                                                                                                                                                                                  | 說明                                                                                        |
| :---------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `selection` | [`BaseSelection`](../interfaces/lexical.BaseSelection.md)                                                                                                                                                             | 要更新的選擇節點。                                                                          |
| `patch`     | `Record`\<`string`, `null` \| `string` \| (`currentStyleValue`: `null` \| `string`, `target`: [`RangeSelection`](../classes/lexical.RangeSelection.md) \| [`TextNode`](../classes/lexical.TextNode.md)) => `string`\> | 要應用的樣式補丁，可以包含多個樣式。 \{CSSProperty: value\}。也可以接受返回新屬性值的函數。 |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/lexical-node.ts:279](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/lexical-node.ts#L279)

---

### $selectAll

▸ **$selectAll**(`selection`): `void`

擴展當前選擇範圍以涵蓋編輯器中的所有內容。

#### 參數

| 名稱        | 類型                                                     | 說明           |
| :---------- | :------------------------------------------------------- | :------------- |
| `selection` | [`RangeSelection`](../classes/lexical.RangeSelection.md) | 當前選擇範圍。 |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/range-selection.ts:459](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L459)

---

### $setBlocksType

▸ **$setBlocksType**(`selection`, `createElement`): `void`

將選擇中的所有節點從一個區塊類型轉換為另一個區塊類型。

#### 參數

| 名稱            | 類型                                                                | 說明                                         |
| :-------------- | :------------------------------------------------------------------ | :------------------------------------------- |
| `selection`     | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 要轉換的選擇區塊。                           |
| `createElement` | () => [`ElementNode`](../classes/lexical.ElementNode.md)            | 創建節點的函數。例如，$createParagraphNode。 |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/range-selection.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L44)

---

### $shouldOverrideDefaultCharacterSelection

▸ **$shouldOverrideDefaultCharacterSelection**(`selection`, `isBackward`): `boolean`

確定是否應該覆蓋默認的字符選擇。用於 DecoratorNodes。

#### 參數

| 名稱        | 類型                                                     | 說明       |
| :---------- | :------------------------------------------------------- | :--------- |
| `selection` | [`RangeSelection`](../classes/lexical.RangeSelection.md) | 可能需要覆 |

蓋默認字符選擇的選擇範圍。 |
| `isBackward` | `boolean` | 選擇是否向後選擇（焦點是否在錨點之前）？ |

#### 返回

`boolean`

如果應該被覆蓋則返回 true，否則返回 false。

#### 定義於

[packages/lexical-selection/src/range-selection.ts:391](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L391)

---

---

### $sliceSelectedTextNodeContent

▸ **$sliceSelectedTextNodeContent**(`selection`, `textNode`): [`LexicalNode`](../classes/lexical.LexicalNode.md)

通常用於將文本內容附加到 HTML 和 JSON。抓取文本內容並將其「切片」，以生成新的 TextNode。

#### 參數

| 名稱        | 類型                                                      | 說明                                     |
| :---------- | :-------------------------------------------------------- | :--------------------------------------- |
| `selection` | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 包含要編輯的 TextNode 的節點的選擇範圍。 |
| `textNode`  | [`TextNode`](../classes/lexical.TextNode.md)              | 要編輯的 TextNode。                      |

#### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)

更新後的 TextNode。

#### 定義於

[packages/lexical-selection/src/lexical-node.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/lexical-node.ts#L41)

---

### $trimTextContentFromAnchor

▸ **$trimTextContentFromAnchor**(`editor`, `anchor`, `delCount`): `void`

從節點中修剪文本以縮短其長度，例如強制文本的最大長度。如果刪除的是錨點的祖先文本，則會保留 2 個縮排，否則，如果沒有文本內容存在，則會刪除 TextNode。焦點將移動到剩餘文本的結尾或新 TextNode 的開頭。

#### 參數

| 名稱       | 類型                                                   | 說明                                                                     |
| :--------- | :----------------------------------------------------- | :----------------------------------------------------------------------- |
| `editor`   | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器。                                                         |
| `anchor`   | [`Point`](../classes/lexical.Point.md)                 | 當前選擇的錨點，選擇應該指向的位置。                                     |
| `delCount` | `number`                                               | 要刪除的字符數量。作為動態變數很有用，例如 textContentSize - maxLength； |

#### 返回

`void`

#### 定義於

[packages/lexical-selection/src/lexical-node.ts:113](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/lexical-node.ts#L113)

---

### $wrapNodes

▸ **$wrapNodes**(`selection`, `createElement`, `wrappingElement?`): `void`

#### 參數

| 名稱              | 類型                                                         | 預設值      | 說明                                                      |
| :---------------- | :----------------------------------------------------------- | :---------- | :-------------------------------------------------------- |
| `selection`       | [`BaseSelection`](../interfaces/lexical.BaseSelection.md)    | `undefined` | 要包裝的節點選擇範圍。                                    |
| `createElement`   | () => [`ElementNode`](../classes/lexical.ElementNode.md)     | `undefined` | 創建包裝 ElementNode 的函數。例如，$createParagraphNode。 |
| `wrappingElement` | `null` \| [`ElementNode`](../classes/lexical.ElementNode.md) | `null`      | 要附加包裝選擇及其子元素的元素。                          |

#### 返回

`void`

**`已棄用`**

將選擇中的所有節點包裝到由 createElement 返回的另一個節點中。

#### 定義於

[packages/lexical-selection/src/range-selection.ts:116](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/range-selection.ts#L116)

---

### createDOMRange

▸ **createDOMRange**(`editor`, `anchorNode`, `_anchorOffset`, `focusNode`, `_focusOffset`): `Range` \| `null`

為 DOM 創建一個選擇範圍。

#### 參數

| 名稱            | 類型                                                   | 說明                 |
| :-------------- | :----------------------------------------------------- | :------------------- |
| `editor`        | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器。     |
| `anchorNode`    | [`LexicalNode`](../classes/lexical.LexicalNode.md)     | 選擇的錨點節點。     |
| `_anchorOffset` | `number`                                               | 從錨點到焦點的距離。 |
| `focusNode`     | [`LexicalNode`](../classes/lexical.LexicalNode.md)     | 當前焦點。           |
| `_focusOffset`  | `number`                                               | 從焦點到錨點的距離。 |

#### 返回

`Range` \| `null`

創建的 DOM 選擇範圍。

#### 定義於

[packages/lexical-selection/src/utils.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/utils.ts#L47)

---

### createRectsFromDOMRange

▸ **createRectsFromDOMRange**(`editor`, `range`): `ClientRect`[]

創建 DOMRects，通常用於幫助編輯器找到屏幕上的特定位置。

#### 參數

| 名稱     | 類型                                                   | 說明                                   |
| :------- | :----------------------------------------------------- | :------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器                         |
| `range`  | `Range`                                                | 可以包含節點和文本節點部分的文檔片段。 |

#### 返回

`ClientRect`[]

選擇的矩形作為數組。

#### 定義於

[packages/lexical-selection/src/utils.ts:124](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/utils.ts#L124)

---

### getStyleObjectFromCSS

▸ **getStyleObjectFromCSS**(`css`): `Record`\<`string`, `string`\>

給定 CSS 字串，返回來自樣式快取的物件。

#### 參數

| 名稱  | 類型     | 說明           |
| :---- | :------- | :------------- |
| `css` | `string` | CSS 屬性字串。 |

#### 返回

`Record`\<`string`, `string`\>

給定 CSS 屬性的值。

#### 定義於

[packages/lexical-selection/src/utils.ts:198](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/utils.ts#L198)

---

### trimTextContentFromAnchor

▸ **trimTextContentFromAnchor**(`editor`, `anchor`, `delCount`): `void`

#### 參數

| 名稱       | 類型                                                   |
| :--------- | :----------------------------------------------------- |
| `editor`   | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `anchor`   | [`Point`](../classes/lexical.Point.md)                 |
| `delCount` | `number`                                               |

#### 返回

`void`

**`已棄用`**

被 @lexical/eslint-plugin rules-of-lexical 規則重命名為 [$trimTextContentFromAnchor](lexical_selection.md#$trimtextcontentfromanchor)

#### 定義於

[packages/lexical-selection/src/index.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical-selection/src/index.ts#L43)

---
