---
id: 'lexical_list.ListItemNode'
title: 'Class: ListItemNode'
custom_edit_url: null
---

[@lexical/list](../modules/lexical_list.md).ListItemNode

## 階層

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`ListItemNode`**

## 建構子

### constructor

• **new ListItemNode**(`value?`, `checked?`, `key?`): [`ListItemNode`](lexical_list.ListItemNode.md)

#### 參數

| 名稱       | 類型      |
| :--------- | :-------- |
| `value?`   | `number`  |
| `checked?` | `boolean` |
| `key?`     | `string`  |

#### 返回值

[`ListItemNode`](lexical_list.ListItemNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:68](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L68)

## 函式

### append

▸ **append**(`...nodes`): `this`

#### 參數

| 名稱       | 類型                                      |
| :--------- | :---------------------------------------- |
| `...nodes` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 返回值

`this`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[append](lexical.ElementNode.md#append)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:152](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L152)

---

### canMergeWhenEmpty

▸ **canMergeWhenEmpty**(): `true`

確定當此節點為空時，是否可以與插入的第一個節點塊合併。

此函式專門在 [RangeSelection.insertNodes](lexical.RangeSelection.md#insertnodes) 中調用，以確定節點插入期間的合併行為。

#### 返回值

`true`

**`範例`**

```ts
// 在 ListItemNode 或 QuoteNode 實作中：
canMergeWhenEmpty(): true {
 return true;
}
```

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[canMergeWhenEmpty](lexical.ElementNode.md#canmergewhenempty)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:415](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L415)

---

### canMergeWith

▸ **canMergeWith**(`node`): `boolean`

#### 參數

| 名稱   | 類型                                    |
| :----- | :-------------------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回值

`boolean`

#### 覆蓋

ElementNode.canMergeWith

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:388](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L388)

---

### collapseAtStart

▸ **collapseAtStart**(`selection`): `true`

#### 參數

| 名稱        | 類型                                          |
| :---------- | :-------------------------------------------- |
| `selection` | [`RangeSelection`](lexical.RangeSelection.md) |

#### 返回值

`true`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:270](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L270)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在和解過程中調用，以確定要將哪些節點插入到此 Lexical 節點的 DOM 中。

此函式必須返回精確的一個 HTMLElement。嵌套元素不被支持。

請勿在此更新生命週期階段嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                     |
| :------- | :--------------------------------------------------- | :------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在和解過程中訪問如 EditorTheme（以應用類別）等內容。 |

#### 返回值

`HTMLElement`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L74)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

任何需要的父節點的創建邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，則應實現此函式。

#### 返回值

[`ElementNode`](lexical.ElementNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[createParentElementNode](lexical.ElementNode.md#createparentelementnode)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:411](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L411)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於在 Lexical 和非 Lexical 編輯器之間，或在具有不同命名空間的 Lexical 編輯器之間進行複製和粘貼很重要，在這種情況下，主要的傳輸格式是 HTML。如果您因其他原因需要序列化為 HTML，也很重要，可以通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 進行。您也可以使用此函式來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 返回值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:134](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L134)

---

### exportJSON

▸ **exportJSON**(): [`SerializedListItemNode`](../modules/lexical_list.md#serializedlistitemnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼很重要。如果您需要將其序列化為 JSON 以進行持久儲存，也很重要。請參見 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回值

[`SerializedListItemNode`](../modules/lexical_list.md#serializedlistitemnode)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:142](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L142)

---

### extractWithChild

▸ **extractWithChild**(`child`, `selection`): `boolean`

#### 參數

| 名稱        | 類型                                                      |
| :---------- | :-------------------------------------------------------- |
| `child`     | [`LexicalNode`](lexical.LexicalNode.md)                   |
| `selection` | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 返回

`boolean`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[extractWithChild](lexical.ElementNode.md#extractwithchild)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:392](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L392)

---

### getChecked

▸ **getChecked**(): `undefined` \| `boolean`

#### 返回

`undefined` \| `boolean`

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:320](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L320)

---

### getIndent

▸ **getIndent**(): `number`

#### 返回

`number`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[getIndent](lexical.ElementNode.md#getindent)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:342](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L342)

---

### getValue

▸ **getValue**(): `number`

#### 返回

`number`

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:309](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L309)

---

### insertAfter

▸ **insertAfter**(`node`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

插入一個節點作為此 LexicalNode 的下一個兄弟節點。

#### 參數

| 名稱               | 類型                                    | 預設值      | 說明                                     |
| :----------------- | :-------------------------------------- | :---------- | :--------------------------------------- |
| `node`             | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入在此節點之後的節點。               |
| `restoreSelection` | `boolean`                               | `true`      | 操作完成後是否嘗試將選擇恢復到適當位置。 |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[insertAfter](lexical.ElementNode.md#insertafter)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:212](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L212)

---

### insertNewAfter

▸ **insertNewAfter**(`_`, `restoreSelection?`): [`ParagraphNode`](lexical.ParagraphNode.md) \| [`ListItemNode`](lexical_list.ListItemNode.md)

#### 參數

| 名稱               | 類型                                          | 預設值      |
| :----------------- | :-------------------------------------------- | :---------- |
| `_`                | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 返回

[`ParagraphNode`](lexical.ParagraphNode.md) \| [`ListItemNode`](lexical_list.ListItemNode.md)

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:258](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L258)

---

### isParentRequired

▸ **isParentRequired**(): `true`

該節點是否需要一個必需的父節點。在複製和粘貼操作期間，用於規範可能孤立的節點。例如，沒有 ListNode 父節點的 ListItemNodes 或者沒有 ParagraphNode 父節點的 TextNodes。

#### 返回

`true`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[isParentRequired](lexical.ElementNode.md#isparentrequired)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:407](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L407)

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

將此 LexicalNode 從 EditorState 中移除。如果該節點未重新插入到其他地方，Lexical 垃圾收集器最終將清理它。

#### 參數

| 名稱                   | 類型      | 說明                                                                                                                                                                       |
| :--------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為假，則在刪除操作後，如果父節點是空的，則該父節點也將被刪除。這是默認行為，受其他節點啟發法則影響，例如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty)。 |

#### 返回

`void`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[remove](lexical.ElementNode.md#remove)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:242](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L242)

---

### replace

▸ **replace**\<`N`\>(`replaceWithNode`, `includeChildren?`): `N`

將此 LexicalNode 替換為提供的節點，並可選擇性地將替換節點的子節點轉移到新的節點中。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `N`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 說明                                   |
| :----------------- | :-------- | :------------------------------------- |
| `replaceWithNode`  | `N`       | 用來替換此節點的節點。                 |
| `includeChildren?` | `boolean` | 是否將此節點的子節點轉移到替換的節點。 |

#### 返回

`N`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[replace](lexical.ElementNode.md#replace)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:168](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L168)

---

### setChecked

▸ **setChecked**(`checked?`): `void`

#### 參數

| 名稱       | 類型      |
| :--------- | :-------- |
| `checked?` | `boolean` |

#### 返回

`void`

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:333](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L333)

---

### setIndent

▸ **setIndent**(`indent`): `this`

#### 參數

| 名稱     | 類型     |
| :------- | :------- |
| `indent` | `number` |

#### 返回

`this`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[setIndent](lexical.ElementNode.md#setindent)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:359](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L359)

---

### setValue

▸ **setValue**(`value`): `void`

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `value` | `number` |

#### 返回

`void`

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:315](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L315)

---

### toggleChecked

▸ **toggleChecked**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:338](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L338)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`, `config`): `boolean`

當節點發生變化並應更新 DOM 時調用，從而使其與更新過程中的任何變化保持一致。

返回 "true" 將導致 Lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤更改，則需要執行此操作。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`ListItemNode`](lexical_list.ListItemNode.md)       |
| `dom`      | `HTMLElement`                                        |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回

`boolean`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:85](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L85)

---

### clone

▸ **clone**(`node`): [`ListItemNode`](lexical_list.ListItemNode.md)

克隆此節點，創建具有不同鍵的新節點並將其添加到 EditorState 中（但不附加到任何位置！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                           |
| :----- | :--------------------------------------------- |
| `node` | [`ListItemNode`](lexical_list.ListItemNode.md) |

#### 返回

[`ListItemNode`](lexical_list.ListItemNode.md)

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L64)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點都必須實現此函式，並且在編輯器中註冊的節點之間必須是唯一的。

#### 返回

`string`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:60](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L60)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆蓋函式

ElementNode.importDOM

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:116](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L116)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`ListItemNode`](lexical_list.ListItemNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了一個在節點實現與序列化接口之間的抽象層，這在對節點模式進行重大更改（例如添加或刪除屬性）時可能非常重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                          |
| :--------------- | :---------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedListItemNode`](../modules/lexical_list.md#serializedlistitemnode) |

#### 返回

[`ListItemNode`](lexical_list.ListItemNode.md)

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:125](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L125)

---

### transform

▸ **transform**(): (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在編輯器初始化期間，將返回的函式註冊為節點上的轉換。大多數此類使用情況應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 來解決。

實驗性 - 使用風險自負。

#### 返回

`fn`

▸ (`node`): `void`

##### 參數

| 名稱 | 類型 |
|

:------ | :------ |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) |

##### 返回

`void`

#### 覆蓋函式

[ElementNode](lexical.ElementNode.md).[transform](lexical.ElementNode.md#transform)

#### 定義於

[packages/lexical-list/src/LexicalListItemNode.ts:101](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListItemNode.ts#L101)
