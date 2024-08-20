---
id: 'lexical_utils'
title: 'Module: @lexical/utils'
custom_edit_url: null
---

## 參考

### $splitNode

重新匯出 [$splitNode](lexical.md#$splitnode)

---

### isBlockDomNode

重新匯出 [isBlockDomNode](lexical.md#isblockdomnode)

---

### isHTMLAnchorElement

重新匯出 [isHTMLAnchorElement](lexical.md#ishtmlanchorelement)

---

### isHTMLElement

重新匯出 [isHTMLElement](lexical.md#ishtmlelement)

---

### isInlineDomNode

重新匯出 [isInlineDomNode](lexical.md#isinlinedomnode)

## 類型別名

### DFSNode

Ƭ **DFSNode**: `Readonly`\<\{ `depth`: `number` ; `node`: [`LexicalNode`](../classes/lexical.LexicalNode.md) }\>

#### 定義於

[packages/lexical-utils/src/index.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L66)

---

### DOMNodeToLexicalConversion

Ƭ **DOMNodeToLexicalConversion**: (`element`: `Node`) => [`LexicalNode`](../classes/lexical.LexicalNode.md)

#### 類型宣告

▸ (`element`): [`LexicalNode`](../classes/lexical.LexicalNode.md)

##### 參數

| 名稱      | 類型   |
| :-------- | :----- |
| `element` | `Node` |

##### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)

#### 定義於

[packages/lexical-utils/src/index.ts:309](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L309)

---

### DOMNodeToLexicalConversionMap

Ƭ **DOMNodeToLexicalConversionMap**: `Record`\<`string`, [`DOMNodeToLexicalConversion`](lexical_utils.md#domnodetolexicalconversion)\>

#### 定義於

[packages/lexical-utils/src/index.ts:311](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L311)

## 變數

### CAN_USE_BEFORE_INPUT

• `Const` **CAN_USE_BEFORE_INPUT**: `boolean` = `CAN_USE_BEFORE_INPUT_`

#### 定義於

[packages/lexical-utils/src/index.ts:55](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L55)

---

### CAN_USE_DOM

• `Const` **CAN_USE_DOM**: `boolean` = `CAN_USE_DOM_`

#### 定義於

[packages/lexical-utils/src/index.ts:56](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L56)

---

### IS_ANDROID

• `Const` **IS_ANDROID**: `boolean` = `IS_ANDROID_`

#### 定義於

[packages/lexical-utils/src/index.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L57)

---

### IS_ANDROID_CHROME

• `Const` **IS_ANDROID_CHROME**: `boolean` = `IS_ANDROID_CHROME_`

#### 定義於

[packages/lexical-utils/src/index.ts:58](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L58)

---

### IS_APPLE

• `Const` **IS_APPLE**: `boolean` = `IS_APPLE_`

#### 定義於

[packages/lexical-utils/src/index.ts:59](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L59)

---

### IS_APPLE_WEBKIT

• `Const` **IS_APPLE_WEBKIT**: `boolean` = `IS_APPLE_WEBKIT_`

#### 定義於

[packages/lexical-utils/src/index.ts:60](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L60)

---

### IS_CHROME

• `Const` **IS_CHROME**: `boolean` = `IS_CHROME_`

#### 定義於

[packages/lexical-utils/src/index.ts:61](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L61)

---

### IS_FIREFOX

• `Const` **IS_FIREFOX**: `boolean` = `IS_FIREFOX_`

#### 定義於

[packages/lexical-utils/src/index.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L62)

---

### IS_IOS

• `Const` **IS_IOS**: `boolean` = `IS_IOS_`

#### 定義於

[packages/lexical-utils/src/index.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L63)

---

### IS_SAFARI

• `Const` **IS_SAFARI**: `boolean` = `IS_SAFARI_`

#### 定義於

[packages/lexical-utils/src/index.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L64)

## 函數

### $dfs

▸ **$dfs**(`startingNode?`, `endingNode?`): [`DFSNode`](lexical_utils.md#dfsnode)[]

"深度優先搜尋" 從樹的根節點/頂部節點開始，向下搜尋直到分支結束後回溯並找到新路徑。可以想像成解迷宮的過程，沿著牆壁行走，直到遇到死胡同（葉子節點），然後回溯到最近的分支點並重複此過程。它會返回所有搜尋到的節點，並以物件數組的形式呈現。

#### 參數

| 名稱            | 類型                                               | 描述                                                                 |
| :-------------- | :------------------------------------------------- | :------------------------------------------------------------------- |
| `startingNode?` | [`LexicalNode`](../classes/lexical.LexicalNode.md) | 開始搜尋的節點，若省略，將從根節點開始。                             |
| `endingNode?`   | [`LexicalNode`](../classes/lexical.LexicalNode.md) | 結束搜尋的節點，若省略，將搜尋所有從 `startingNode` 開始的後代節點。 |

#### 返回

[`DFSNode`](lexical_utils.md#dfsnode)[]

包含搜尋到的所有節點的物件數組，包含它們在樹中的深度。
\{depth: number, node: LexicalNode\} 只要結束節點存在，將至少返回 1 個節點。

#### 定義於

[packages/lexical-utils/src/index.ts:179](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L179)

---

### $filter

▸ **$filter**\<`T`\>(`nodes`, `filterFn`): `T`[]

過濾節點

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱       | 類型                                                                          | 描述                                                    |
| :--------- | :---------------------------------------------------------------------------- | :------------------------------------------------------ |
| `nodes`    | [`LexicalNode`](../classes/lexical.LexicalNode.md)[]                          | 需要過濾的節點數組                                      |
| `filterFn` | (`node`: [`LexicalNode`](../classes/lexical.LexicalNode.md)) => `null` \| `T` | 過濾函數，如果當前節點符合條件則返回節點，否則返回 null |

#### 返回

`T`[]

過濾後的節點數組

#### 定義於

[packages/lexical-utils/src/index.ts:558](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L558)

---

### $findMatchingParent

▸ **$findMatchingParent**\<`T`\>(`startingNode`, `findFn`): `null` \| `T`

從一個節點開始，向上搜尋（朝向根節點），根據 `findFn` 的搜尋參數找到匹配的節點。（類似於 JavaScript 的 `.find()` 函數，需要傳入測試函數作為參數。例如：if( (node) => node.\_\_type === 'div') ) return true; 否則返回 false）

### 類型參數

| 名稱 | 類型                                                      |
| :--- | :-------------------------------------------------------- |
| `T`  | 擴展自 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱           | 類型                                                                        | 描述                                                |
| :------------- | :-------------------------------------------------------------------------- | :-------------------------------------------------- |
| `startingNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md)                          | 搜索開始的節點。                                    |
| `findFn`       | (`node`: [`LexicalNode`](../classes/lexical.LexicalNode.md)) => `node is T` | 測試函數，如果當前節點滿足測試參數，則返回 `true`。 |

#### 返回值

`null` \| `T`

與 `findFn` 參數匹配的父節點，若未找到則返回 `null`。

#### 定義於

[packages/lexical-utils/src/index.ts:325](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L325)

▸ **$findMatchingParent**(`startingNode`, `findFn`): `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)

從一個節點開始，向上遍歷樹（朝向根節點）以找到一個匹配的節點，基於 `findFn` 的搜索參數。（考慮 JavaScript 的 `.find()` 函數，其中需要傳遞一個測試函數作為參數。例如，如果 `(node) => node.__type === 'div')` 返回 `true`，則返回 `true`；否則返回 `false`。）

#### 參數

| 名稱           | 類型                                                                      | 描述                                                |
| :------------- | :------------------------------------------------------------------------ | :-------------------------------------------------- |
| `startingNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md)                        | 搜索開始的節點。                                    |
| `findFn`       | (`node`: [`LexicalNode`](../classes/lexical.LexicalNode.md)) => `boolean` | 測試函數，如果當前節點滿足測試參數，則返回 `true`。 |

#### 返回值

`null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)

與 `findFn` 參數匹配的父節點，若未找到則返回 `null`。

#### 定義於

[packages/lexical-utils/src/index.ts:329](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L329)

---

### $getNearestBlockElementAncestorOrThrow

▸ **$getNearestBlockElementAncestorOrThrow**(`startNode`): [`ElementNode`](../classes/lexical.ElementNode.md)

返回最近的祖先元素節點，否則拋出錯誤。

#### 參數

| 名稱        | 類型                                               | 描述           |
| :---------- | :------------------------------------------------- | :------------- |
| `startNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) | 搜索的起始節點 |

#### 返回值

[`ElementNode`](../classes/lexical.ElementNode.md)

找到的祖先節點

#### 定義於

[packages/lexical-utils/src/index.ts:292](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L292)

---

### $getNearestNodeOfType

▸ **$getNearestNodeOfType**\<`T`\>(`node`, `klass`): `T` \| `null`

從節點開始，向上遍歷其祖先（朝向根節點），以找到特定類型的節點。

#### 類型參數

| 名稱 | 類型                                                      |
| :--- | :-------------------------------------------------------- |
| `T`  | 擴展自 [`ElementNode`](../classes/lexical.ElementNode.md) |

#### 參數

| 名稱    | 類型                                               | 描述                     |
| :------ | :------------------------------------------------- | :----------------------- |
| `node`  | [`LexicalNode`](../classes/lexical.LexicalNode.md) | 開始搜索的節點。         |
| `klass` | [`Klass`](lexical.md#klass)\<`T`\>                 | 要查找的節點類型的實例。 |

#### 返回值

`T` \| `null`

傳遞的 `klass` 類型的節點，若不存在則返回 `null`。

#### 定義於

[packages/lexical-utils/src/index.ts:270](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L270)

---

### $getNextRightPreorderNode

▸ **$getNextRightPreorderNode**(`startingNode`): [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null`

執行從右到左的前序樹遍歷。
從起始節點開始，向右遍歷到最右側的子節點，然後回溯到父節點，找到新的最右側路徑。
將返回遍歷序列中起始節點之後的下一個節點。
該遍歷方式與上面的 `$dfs` 函數類似，但節點是從右到左訪問的，而不是從左到右。

#### 參數

| 名稱           | 類型                                               | 描述             |
| :------------- | :------------------------------------------------- | :--------------- |
| `startingNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) | 開始搜索的節點。 |

#### 返回值

[`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null`

前序右到左遍歷序列中的下一個節點，若該節點不存在則返回 `null`。

#### 定義於

[packages/lexical-utils/src/index.ts:240](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L240)

---

### $insertFirst

▸ **$insertFirst**(`parent`, `node`): `void`

將節點插入到父節點的第一個子節點之前

#### 參數

| 名稱     | 類型                                               | 描述           |
| :------- | :------------------------------------------------- | :------------- |
| `parent` | [`ElementNode`](../classes/lexical.ElementNode.md) | 父節點         |
| `node`   | [`LexicalNode`](../classes/lexical.LexicalNode.md) | 需要插入的節點 |

#### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/index.ts:576](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L576)

---

### $insertNodeToNearestRoot

▸ **$insertNodeToNearestRoot**\<`T`\>(`node`): `T`

如果選定的插入區域是根節點/影子根節點（參見 [lexical!$isRootOrShadowRoot](lexical.md#$isrootorshadowroot)），則節點將被插入到該處，否則將在插入區域之前插入。如果沒有選擇的區域，節點將在樹中的現有節點之後作為根節點的子節點插入。然後，會在插入的節點後添加一個段落節點並進行選擇。

#### 類型參數

| 名稱 | 類型                                                      |
| :--- | :-------------------------------------------------------- |
| `T`  | 擴展自 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱   | 類型 | 描述         |
| :----- | :--- | :----------- |
| `node` | `T`  | 要插入的節點 |

#### 返回值

`T`

插入後的節點

#### 定義於

[packages/lexical-utils/src/index.ts:469](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L469)

---

### $isEditorIsNestedEditor

▸ **$isEditorIsNestedEditor**(`editor`): `boolean`

檢查編輯器是否是由 `LexicalNestedComposer` 創建的嵌套編輯器

#### 參數

| 名稱     | 類型                                                   |
| :------- | :----------------------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |

#### 返回值

`boolean`

#### 定義於

[packages/lexical-utils/src/index.ts:605](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L605)

---

### $restoreEditorState

▸ **$restoreEditorState**(`editor`, `editorState`): `void`

克隆編輯器並將其標記為髒狀態以進行和解。如果存在選擇，將設置為先前的狀態，否則設置為 `null`。

#### 參數

| 名稱 | 類型 | 描述 |
| :--- | :--- | :--- |

|

`editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器 |
| `editorState` | [`EditorState`](../classes/lexical.EditorState.md) | 編輯器的狀態 |

#### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/index.ts:440](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L440)

---

### $wrapNodeInElement

▸ **$wrapNodeInElement**(`node`, `createElementNode`): [`ElementNode`](../classes/lexical.ElementNode.md)

將節點包裝到由 `createElementNode` 函數創建的另一個節點中，例如 `$createParagraphNode`

#### 參數

| 名稱                | 類型                                                     | 描述                                                  |
| :------------------ | :------------------------------------------------------- | :---------------------------------------------------- |
| `node`              | [`LexicalNode`](../classes/lexical.LexicalNode.md)       | 要包裝的節點。                                        |
| `createElementNode` | () => [`ElementNode`](../classes/lexical.ElementNode.md) | 創建一個新的 lexical 元素以包裝要包裝的節點並返回它。 |

#### 返回值

[`ElementNode`](../classes/lexical.ElementNode.md)

一個新的 lexical 元素，其中包含先前的節點（作為子節點，包括其子節點）。

#### 定義於

[packages/lexical-utils/src/index.ts:524](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L524)

---

### addClassNamesToElement

▸ **addClassNamesToElement**(`element`, `...classNames`): `void`

接受一個 HTML 元素，並添加傳遞的 classNames，忽略任何非字串類型。可以使用空格添加多個類別。例如 `addClassNamesToElement(element, ['element-inner active', true, null])` 將會將 'element-inner' 和 'active' 作為類別添加到該元素上。

#### 參數

| 名稱            | 類型                                               | 描述                             |
| :-------------- | :------------------------------------------------- | :------------------------------- |
| `element`       | `HTMLElement`                                      | 要添加類別的元素                 |
| `...classNames` | (`undefined` \| `null` \| `string` \| `boolean`)[] | 定義要添加到元素的類別名稱的數組 |

#### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/index.ts:79](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L79)

---

### calculateZoomLevel

▸ **calculateZoomLevel**(`element`): `number`

計算元素的縮放級別，結果基於使用 CSS 的 zoom 屬性。

#### 參數

| 名稱      | 類型                |
| :-------- | :------------------ |
| `element` | `null` \| `Element` |

#### 返回值

`number`

#### 定義於

[packages/lexical-utils/src/index.ts:590](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L590)

---

### isMimeType

▸ **isMimeType**(`file`, `acceptableMimeTypes`): `boolean`

如果檔案類型與 `acceptableMimeTypes` 數組中的類型匹配，則返回 `true`，否則返回 `false`。傳遞的類型必須是字串，並且區分大小寫。例如，如果檔案類型為 'text'，而 `acceptableMimeTypes` = ['TEXT', 'IMAGE']，則函數將返回 `false`。

#### 參數

| 名稱                  | 類型       | 描述                         |
| :-------------------- | :--------- | :--------------------------- |
| `file`                | `File`     | 要檢查類型的檔案。           |
| `acceptableMimeTypes` | `string`[] | 用於檢查檔案類型的字串數組。 |

#### 返回值

`boolean`

如果檔案是可接受的 MIME 類型，則返回 `true`，否則返回 `false`。

#### 定義於

[packages/lexical-utils/src/index.ts:115](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L115)

---

### markSelection

▸ **markSelection**(`editor`, `onReposition?`): () => `void`

#### 參數

| 名稱            | 類型                                                   |
| :-------------- | :----------------------------------------------------- |
| `editor`        | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `onReposition?` | (`node`: `HTMLElement`[]) => `void`                    |

#### 返回值

`fn`

▸ (): `void`

##### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/markSelection.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/markSelection.ts#L23)

---

### mediaFileReader

▸ **mediaFileReader**(`files`, `acceptableMimeTypes`): `Promise`\<\{ `file`: `File` ; `result`: `string` }[]\>

Lexical 檔案讀取器具有：

1. MIME 類型支援
2. 批次處理結果（與 HistoryPlugin 相容）
3. 順序感知（尊重多個檔案傳遞的順序）

```ts
const filesResult = await mediaFileReader(files, ['image/']);
filesResult.forEach((file) =>
  editor.dispatchCommand('INSERT_IMAGE', {
    src: file.result,
  }),
);
```

#### 參數

| 名稱                  | 類型       |
| :-------------------- | :--------- |
| `files`               | `File`[]   |
| `acceptableMimeTypes` | `string`[] |

#### 返回值

`Promise`\<\{ `file`: `File` ; `result`: `string` }[]\>

#### 定義於

[packages/lexical-utils/src/index.ts:138](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L138)

---

### mergeRegister

▸ **mergeRegister**(`...func`): () => `void`

返回一個函數，該函數在調用時將執行所有傳遞的函數。通常用於註冊多個 lexical 監聽器，然後通過一次函數調用將它們拆除，例如 React 的 useEffect 鉤子。

#### 參數

| 名稱      | 類型     | 描述                                       |
| :-------- | :------- | :----------------------------------------- |
| `...func` | `Func`[] | 一個包含要由返回函數執行的清理函數的數組。 |

#### 返回值

`fn`

返回一個函數，該函數執行所有傳遞的清理函數。

▸ (): `void`

##### 返回值

`void`

**範例**

```ts
useEffect(() => {
  return mergeRegister(
    editor.registerCommand(...registerCommand1 logic),
    editor.registerCommand(...registerCommand2 logic),
    editor.registerCommand(...registerCommand3 logic)
  )
}, [editor])
```

在這個例子中，useEffect 返回了 mergeRegister 返回的函數，作為一個清理函數，在 useEffect 再次運行（由於依賴項更新）或組件卸載時執行。注意，函數不一定需要放在數組中，所有參數都被視為 func 參數並從那裡展開。清理的順序是參數順序的反向。通常預期的是，第一個 "acquire" 會是最後一個 "released"（LIFO 順序），因為後面的步驟可能會依賴於前面的步驟。

#### 定義於

[packages/lexical-utils/src/mergeRegister.ts:36](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/mergeRegister.ts#L36)

### objectKlassEquals

▸ **objectKlassEquals**\<`T`\>(`object`, `objectClass`): `boolean`

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱          | 類型                 | 描述           |
| :------------ | :------------------- | :------------- |
| `object`      | `unknown`            | = 該類型的實例 |
| `objectClass` | `ObjectKlass`\<`T`\> | = 該類型的類別 |

#### 返回值

`boolean`

該物件是否具有與 `objectClass` 相同的類別，忽略不同視窗（例如，不同的 iframe）之間的差異。

#### 定義於

[packages/lexical-utils/src/index.ts:542](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L542)

---

### positionNodeOnRange

▸ **positionNodeOnRange**(`editor`, `range`, `onReposition`): () => `void`

#### 參數

| 名稱           | 類型                                                   |
| :------------- | :----------------------------------------------------- |
| `editor`       | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `range`        | `Range`                                                |
| `onReposition` | (`node`: `HTMLElement`[]) => `void`                    |

#### 返回值

`fn`

▸ (): `void`

##### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/positionNodeOnRange.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/positionNodeOnRange.ts#L23)

---

### registerNestedElementResolver

▸ **registerNestedElementResolver**\<`N`\>(`editor`, `targetNode`, `cloneNode`, `handleOverlap`): () => `void`

嘗試將相同類型的嵌套元素節點解決為該類型的單一節點。通常用於標記/註解。

#### 類型參數

| 名稱 | 類型                                                    |
| :--- | :------------------------------------------------------ |
| `N`  | 擴展 [`ElementNode`](../classes/lexical.ElementNode.md) |

#### 參數

| 名稱            | 類型                                                   | 描述                                           |
| :-------------- | :----------------------------------------------------- | :--------------------------------------------- |
| `editor`        | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | 該 lexical 編輯器                              |
| `targetNode`    | [`Klass`](lexical.md#klass)\<`N`\>                     | 要從中提取嵌套元素的目標                       |
| `cloneNode`     | (`from`: `N`) => `N`                                   | 見 $createMarkNode                             |
| `handleOverlap` | (`from`: `N`, `to`: `N`) => `void`                     | 處理要提取的節點與 `targetNode` 之間的任何重疊 |

#### 返回值

`fn`

該 lexical 編輯器

▸ (): `void`

##### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/index.ts:359](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L359)

---

### removeClassNamesFromElement

▸ **removeClassNamesFromElement**(`element`, `...classNames`): `void`

接受一個 HTML 元素，並從中移除傳遞的 classNames，忽略任何非字串類型。可以使用空格移除多個類別。例如 `removeClassNamesFromElement(element, ['active small', true, null])` 將會從該元素上移除 'active' 和 'small' 兩個類別。

#### 參數

| 名稱            | 類型                                               | 描述                               |
| :-------------- | :------------------------------------------------- | :--------------------------------- |
| `element`       | `HTMLElement`                                      | 要移除類別的元素                   |
| `...classNames` | (`undefined` \| `null` \| `string` \| `boolean`)[] | 定義要從元素中移除的類別名稱的數組 |

#### 返回值

`void`

#### 定義於

[packages/lexical-utils/src/index.ts:97](https://github.com/facebook/lexical/tree/main/packages/lexical-utils/src/index.ts#L97)
