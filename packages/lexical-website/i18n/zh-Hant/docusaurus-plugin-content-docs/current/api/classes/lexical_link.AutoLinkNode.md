---
id: 'lexical_link.AutoLinkNode'
title: '類別：AutoLinkNode'
custom_edit_url: null
---

[@lexical/link](../modules/lexical_link.md).AutoLinkNode

## 階層結構

- [`LinkNode`](lexical_link.LinkNode.md)

  ↳ **`AutoLinkNode`**

## 構造函數

### constructor

• **new AutoLinkNode**(`url`, `attributes?`, `key?`): [`AutoLinkNode`](lexical_link.AutoLinkNode.md)

#### 參數

| 名稱         | 類型                                                                                                                                                  |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`        | `string`                                                                                                                                              |
| `attributes` | `Partial`\<[`Spread`](../modules/lexical.md#spread)\<[`LinkAttributes`](../modules/lexical_link.md#linkattributes), \{ `isUnlinked?`: `boolean` }\>\> |
| `key?`       | `string`                                                                                                                                              |

#### 返回值

[`AutoLinkNode`](lexical_link.AutoLinkNode.md)

#### 覆寫

[LinkNode](lexical_link.LinkNode.md).[constructor](lexical_link.LinkNode.md#constructor)

#### 定義於

[packages/lexical-link/src/index.ts:344](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L344)

## 屬性

### \_\_isUnlinked

• **\_\_isUnlinked**: `boolean`

指示自動鏈結是否曾經被取消鏈結。 \*

#### 定義於

[packages/lexical-link/src/index.ts:342](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L342)

---

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`ElementNode`](lexical.ElementNode.md)\>

#### 繼承自

LinkNode.constructor

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L69)

## 方法

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 返回值

`false`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[canBeEmpty](lexical_link.LinkNode.md#canbeempty)

#### 定義於

[packages/lexical-link/src/index.ts:253](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L253)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `false`

#### 返回值

`false`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[canInsertTextAfter](lexical_link.LinkNode.md#caninserttextafter)

#### 定義於

[packages/lexical-link/src/index.ts:249](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L249)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `false`

#### 返回值

`false`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[canInsertTextBefore](lexical_link.LinkNode.md#caninserttextbefore)

#### 定義於

[packages/lexical-link/src/index.ts:245](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L245)

---

### createDOM

▸ **createDOM**(`config`): `LinkHTMLElementType`

在重新調整過程中調用，以確定要插入到 DOM 中的節點。

此方法必須返回確切的一個 HTMLElement。不支持嵌套元素。

在更新生命週期的此階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                         |
| :------- | :--------------------------------------------------- | :----------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在重新調整期間訪問例如 EditorTheme（以應用樣式類別）等。 |

#### 返回值

`LinkHTMLElementType`

#### 覆寫

[LinkNode](lexical_link.LinkNode.md).[createDOM](lexical_link.LinkNode.md#createdom)

#### 定義於

[packages/lexical-link/src/index.ts:379](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L379)

---

### exportJSON

▸ **exportJSON**(): [`SerializedAutoLinkNode`](../modules/lexical_link.md#serializedautolinknode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼很重要。如果你要序列化為 JSON 以進行某處的持久存儲，也很重要。
請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回值

[`SerializedAutoLinkNode`](../modules/lexical_link.md#serializedautolinknode)

#### 覆寫

[LinkNode](lexical_link.LinkNode.md).[exportJSON](lexical_link.LinkNode.md#exportjson)

#### 定義於

[packages/lexical-link/src/index.ts:416](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L416)

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

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[extractWithChild](lexical_link.LinkNode.md#extractwithchild)

#### 定義於

[packages/lexical-link/src/index.ts:261](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L261)

---

### getIsUnlinked

▸ **getIsUnlinked**(): `boolean`

#### 返回值

`boolean`

#### 定義於

[packages/lexical-link/src/index.ts:369](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L369)

---

### getRel

▸ **getRel**(): `null` \| `string`

#### 返回值

`null` \| `string`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[getRel](lexical_link.LinkNode.md#getrel)

#### 定義於

[packages/lexical-link/src/index.ts:214](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L214)

---

### getTarget

▸ **getTarget**(): `null` \| `string`

#### 返回值

`null` \| `string`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[getTarget](lexical_link.LinkNode.md#gettarget)

#### 定義於

[packages/lexical-link/src/index.ts:205](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L205)

---

### getTitle

▸ **getTitle**(): `null` \| `string`

#### 返回

`null` \| `string`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[getTitle](lexical_link.LinkNode.md#gettitle)

#### 定義於

[packages/lexical-link/src/index.ts:223](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L223)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。

#### 返回

`string`

#### 繼承自

LinkNode.getType

#### 定義於

[packages/lexical/src/LexicalNode.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L286)

---

### getURL

▸ **getURL**(): `string`

#### 返回

`string`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[getURL](lexical_link.LinkNode.md#geturl)

#### 定義於

[packages/lexical-link/src/index.ts:196](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L196)

---

### insertNewAfter

▸ **insertNewAfter**(`selection`, `restoreSelection?`): `null` \| [`ElementNode`](lexical.ElementNode.md)

#### 參數

| 名稱 | 類

| 型                 | 預設值                                        |
| :----------------- | :-------------------------------------------- | :---------- |
| `selection`        | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 返回

`null` \| [`ElementNode`](lexical.ElementNode.md)

#### 重寫自

[LinkNode](lexical_link.LinkNode.md).[insertNewAfter](lexical_link.LinkNode.md#insertnewafter)

#### 定義於

[packages/lexical-link/src/index.ts:425](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L425)

---

### isEmailURI

▸ **isEmailURI**(): `boolean`

#### 返回

`boolean`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[isEmailURI](lexical_link.LinkNode.md#isemailuri)

#### 定義於

[packages/lexical-link/src/index.ts:280](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L280)

---

### isInline

▸ **isInline**(): `true`

#### 返回

`true`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[isInline](lexical_link.LinkNode.md#isinline)

#### 定義於

[packages/lexical-link/src/index.ts:257](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L257)

---

### isWebSiteURI

▸ **isWebSiteURI**(): `boolean`

#### 返回

`boolean`

#### 繼承自

[LinkNode](lexical_link.LinkNode.md).[isWebSiteURI](lexical_link.LinkNode.md#iswebsiteuri)

#### 定義於

[packages/lexical-link/src/index.ts:284](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L284)

---

### sanitizeUrl

▸ **sanitizeUrl**(`url`): `string`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `url` | `string` |

#### 返回

`string`
