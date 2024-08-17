---
id: 'lexical_link.LinkNode'
title: 'Class: LinkNode'
custom_edit_url: null
---

[@lexical/link](../modules/lexical_link.md).LinkNode

## 繼承結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`LinkNode`**

  ↳↳ [`AutoLinkNode`](lexical_link.AutoLinkNode.md)

## 建構子

### 建構子

• **new LinkNode**(`url`, `attributes?`, `key?`): [`LinkNode`](lexical_link.LinkNode.md)

#### 參數

| 名稱         | 類型                                                          |
| :----------- | :------------------------------------------------------------ |
| `url`        | `string`                                                      |
| `attributes` | [`LinkAttributes`](../modules/lexical_link.md#linkattributes) |
| `key?`       | `string`                                                      |

#### 返回值

[`LinkNode`](lexical_link.LinkNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-link/src/index.ts:82](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L82)

## 函式

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 返回值

`false`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical-link/src/index.ts:253](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L253)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `false`

#### 返回值

`false`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[canInsertTextAfter](lexical.ElementNode.md#caninserttextafter)

#### 定義於

[packages/lexical-link/src/index.ts:249](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L249)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `false`

#### 返回值

`false`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[canInsertTextBefore](lexical.ElementNode.md#caninserttextbefore)

#### 定義於

[packages/lexical-link/src/index.ts:245](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L245)

---

### createDOM

▸ **createDOM**(`config`): `LinkHTMLElementType`

在調解過程中調用以確定要將哪些節點插入此 Lexical Node 的 DOM 中。

此函式必須返回一個 HTMLElement。不支援嵌套元素。

在更新生命週期的此階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 說明                                             |
| :------- | :--------------------------------------------------- | :----------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在調解過程中訪問 EditorTheme（以應用類別）。 |

#### 返回值

`LinkHTMLElementType`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-link/src/index.ts:91](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L91)

---

### exportJSON

▸ **exportJSON**(): [`SerializedLinkNode`](../modules/lexical_link.md#serializedlinknode) \| [`SerializedAutoLinkNode`](../modules/lexical_link.md#serializedautolinknode)

控制如何將此節點序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間的複製和貼上非常重要。如果要將資料序列化為 JSON 並在其他地方進行持久存儲，這一點也很重要。請參見 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回值

[`SerializedLinkNode`](../modules/lexical_link.md#serializedlinknode) \| [`SerializedAutoLinkNode`](../modules/lexical_link.md#serializedautolinknode)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-link/src/index.ts:184](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L184)

---

### extractWithChild

▸ **extractWithChild**(`child`, `selection`, `destination`): `boolean`

#### 參數

| 名稱          | 類型                                                      |
| :------------ | :-------------------------------------------------------- |
| `child`       | [`LexicalNode`](lexical.LexicalNode.md)                   |
| `selection`   | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |
| `destination` | `"clone"` \| `"html"`                                     |

#### 返回值

`boolean`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[extractWithChild](lexical.ElementNode.md#extractwithchild)

#### 定義於

[packages/lexical-link/src/index.ts:261](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L261)

---

### getRel

▸ **getRel**(): `null` \| `string`

#### 返回值

`null` \| `string`

#### 定義於

[packages/lexical-link/src/index.ts:214](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L214)

---

### getTarget

▸ **getTarget**(): `null` \| `string`

#### 返回值

`null` \| `string`

#### 定義於

[packages/lexical-link/src/index.ts:205](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L205)

---

### getTitle

▸ **getTitle**(): `null` \| `string`

#### 返回值

`null` \| `string`

#### 定義於

[packages/lexical-link/src/index.ts:223](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L223)

---

### getURL

▸ **getURL**(): `string`

#### 返回值

`string`

#### 定義於

[packages/lexical-link/src/index.ts:196](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L196)

---

### insertNewAfter

▸ **insertNewAfter**(`_`, `restoreSelection?`): `null` \| [`ElementNode`](lexical.ElementNode.md)

#### 參數

| 名稱               | 類型                                          | 預設值      |
| :----------------- | :-------------------------------------------- | :---------- |
| `_`                | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 返回值

`null` \| [`ElementNode`](lexical.ElementNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-link/src/index.ts:232](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L232)

---

### isEmailURI

▸ **isEmailURI**(): `boolean`

#### 返回值

`boolean`

#### 定義於

[packages/lexical-link/src/index.ts:280](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L280)

---

### isInline

▸ **isInline**(): `true`

#### 返回值

`true`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[isInline](lexical.ElementNode.md#isinline)

#### 定義於

[packages/lexical-link/src/index.ts:257](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L257)

---

### isWebSiteURI

▸ **isWebSiteURI**(): `boolean`

#### 返回值

`boolean`

#### 定義於

[packages/lexical-link/src/index.ts:284](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L284)

---

### sanitizeUrl

▸ **sanitizeUrl**(`url`): `string`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `url` | `string` |

#### 返回值

`string`

#### 定義於

[packages/lexical-link/src/index.ts:171](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L171)

---

### setRel

▸ **setRel**(`rel`): `void`

#### 參數

| 名稱  | 類型               |
| :---- | :----------------- |
| `rel` | `null` \| `string` |

#### 返回值

`void`

#### 定義於

[packages/lexical-link/src/index.ts:218](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L218)

---

### setTarget

▸ **setTarget**(`target`): `void`

#### 參數

| 名稱     | 類型               |
| :------- | :----------------- |
| `target` | `null` \| `string` |

#### 返回值

`void`

#### 定義於

[packages/lexical-link/src/index.ts:209](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L209)

---

### setTitle

▸ **setTitle**(`title`): `void`

#### 參數

| 名稱    | 類型               |
| :------ | :----------------- |
| `title` | `null` \| `string` |

#### 返回值

`void`

#### 定義於

[packages/lexical-link/src/index.ts:227](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L227)

---

### setURL

▸ **setURL**(`url`): `void`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `url` | `string` |

#### 返回值

`void`

#### 定義於

[packages/lexical-link/src/index.ts:200](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L200)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `anchor`, `config`): `boolean`

當節點發生變更並且需要更新 DOM 以使其與更新期間可能發生的變化對齊時，將調用此函式。

如果返回 "true"，則會導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，當元素標籤更改時，您需要這樣做。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`LinkNode`](lexical_link.LinkNode.md)               |
| `anchor`   | `LinkHTMLElementType`                                |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回值

`boolean`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-link/src/index.ts:107](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L107)

---

### clone

▸ **clone**(`node`): [`LinkNode`](lexical_link.LinkNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState（但不將其附加到任何地方！）。所有節點都必須實現此函式。

#### 參數

| 名稱   | 類型                                   |
| :----- | :------------------------------------- |
| `node` | [`LinkNode`](lexical_link.LinkNode.md) |

#### 返回值

[`LinkNode`](lexical_link.LinkNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-link/src/index.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L74)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且在編輯器中註冊的節點中必須是唯一的。

#### 返回值

`string`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-link/src/index.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L70)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆蓋

ElementNode.importDOM

#### 定義於

[packages/lexical-link/src/index.ts:148](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L148)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`LinkNode`](lexical_link.LinkNode.md)

控制如何將此節點從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現和序列化介面之間的抽象，如果您對節點架構進行重大更改（例如添加或移除屬性），這可能很重要。請參見 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                                                                                                   |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedLinkNode`](../modules/lexical_link.md#serializedlinknode) \| [`SerializedAutoLinkNode`](../modules/lexical_link.md#serializedautolinknode) |

#### 返回值

[`LinkNode`](lexical_link.LinkNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-link/src/index.ts:157](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L157)
