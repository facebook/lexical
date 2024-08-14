---
id: 'lexical_list.ListNode'
title: '類別: ListNode'
custom_edit_url: null
---

[@lexical/list](../modules/lexical_list.md).ListNode

## 階層

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`ListNode`**

## 建構子

### constructor

• **new ListNode**(`listType`, `start`, `key?`): [`ListNode`](lexical_list.ListNode.md)

#### 參數

| 名稱       | 類型                                              |
| :--------- | :------------------------------------------------ |
| `listType` | [`ListType`](../modules/lexical_list.md#listtype) |
| `start`    | `number`                                          |
| `key?`     | `string`                                          |

#### 返回

[`ListNode`](lexical_list.ListNode.md)

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L72)

## 方法

### append

▸ **append**(`...nodesToAppend`): `this`

#### 參數

| 名稱               | 類型                                      |
| :----------------- | :---------------------------------------- |
| `...nodesToAppend` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 返回

`this`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[append](lexical.ElementNode.md#append)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:191](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L191)

---

### canBeEmpty

▸ **canBeEmpty**(): `false`

#### 返回

`false`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:183](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L183)

---

### canIndent

▸ **canIndent**(): `false`

#### 返回

`false`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[canIndent](lexical.ElementNode.md#canindent)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:187](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L187)

---

### createDOM

▸ **createDOM**(`config`, `_editor?`): `HTMLElement`

在和諧過程中調用，以確定將哪些節點插入到此 Lexical Node 的 DOM 中。

此方法必須返回恰好一個 `HTMLElement`。不支持嵌套元素。

在更新生命週期的這個階段，不要嘗試更新 Lexical EditorState。

#### 參數

| 名稱       | 類型                                                 | 說明                                                     |
| :--------- | :--------------------------------------------------- | :------------------------------------------------------- |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在和諧過程中訪問像 EditorTheme（以應用類別）等項目。 |
| `_editor?` | [`LexicalEditor`](lexical.LexicalEditor.md)          | 允許在和諧過程中訪問編輯器以獲取上下文。                 |

#### 返回

`HTMLElement`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:100](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L100)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或者不同命名空間的 Lexical 編輯器非常重要，此時主要的傳輸格式是 HTML。如果你還有其他原因需要序列化為 HTML，可以使用 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 進行序列化。你也可以使用此方法構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 返回

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:157](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L157)

---

### exportJSON

▸ **exportJSON**(): [`SerializedListNode`](../modules/lexical_list.md#serializedlistnode)

控制此節點如何序列化為 JSON。這對於共享相同命名空間的 Lexical 編輯器之間的複製和粘貼非常重要。如果你需要將 JSON 序列化以便於持久存儲，這也很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedListNode`](../modules/lexical_list.md#serializedlistnode)

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:172](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L172)

---

### extractWithChild

▸ **extractWithChild**(`child`): `boolean`

#### 參數

| 名稱    | 類型                                    |
| :------ | :-------------------------------------- |
| `child` | [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`boolean`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[extractWithChild](lexical.ElementNode.md#extractwithchild)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:214](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L214)

---

### getListType

▸ **getListType**(): [`ListType`](../modules/lexical_list.md#listtype)

#### 返回

[`ListType`](../modules/lexical_list.md#listtype)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:90](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L90)

---

### getStart

▸ **getStart**(): `number`

#### 返回

`number`

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:94](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L94)

---

### getTag

▸ **getTag**(): `ListNodeTagType`

#### 返回

`ListNodeTagType`

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:80](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L80)

---

### setListType

▸ **setListType**(`type`): `void`

#### 參數

| 名稱   | 類型                                              |
| :----- | :------------------------------------------------ |
| `type` | [`ListType`](../modules/lexical_list.md#listtype) |

#### 返回

`void`

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:84](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L84)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`, `config`): `boolean`

當節點變更時調用，並且應該以必要的方式更新 DOM，以使其與更新過程中可能發生的任何變化對齊。

返回 "true" 將導致 Lexical 取消安裝並重新創建 DOM 節點（通過調用 `createDOM`）。如果元素標籤發生變化，則需要這樣做。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`ListNode`](lexical_list.ListNode.md)               |
| `dom`      | `HTMLElement`                                        |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回

`boolean`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:114](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L114)

---

### clone

▸ **clone**(`node`): [`ListNode`](lexical_list.ListNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState（但不附加到任何地方！）。所有節點必須實現此方法。

#### 參數

| 名稱   | 類型                                   |
| :----- | :------------------------------------- |
| `node` | [`ListNode`](lexical_list.ListNode.md) |

#### 返回

[`ListNode`](lexical_list.ListNode.md)

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L66)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須實現此方法，並且必須在編輯器中註冊的節點中唯一。

#### 返回

`string`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L62)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆蓋方法

ElementNode.importDOM

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:136](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L136)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`ListNode`](lexical_list.ListNode.md)

控制如何從 JSON 反序列化此節點。這通常是樣板代碼，但提供了節點實現和序列化接口之間的抽象，這在你對節點架構進行重大更改（通過添加或移除屬性）時可能很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                  |
| :--------------- | :-------------------------------------------------------------------- |
| `serializedNode` | [`SerializedListNode`](../modules/lexical_list.md#serializedlistnode) |

#### 返回

[`ListNode`](lexical_list.ListNode.md)

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:149](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L149)

---

### transform

▸ **transform**(): (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在編輯器初始化期間將返回的函數註冊為節點上的變換。大多數這樣的用例應該通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 進行處理。

實驗性 - 使用時請自行風險。

#### 返回

`fn`

▸ (`node`): `void`

##### 參數

| 名稱   | 類型                                    |
| :----- | :-------------------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) |

##### 返回

`void`

#### 覆蓋方法

[ElementNode](lexical.ElementNode.md).[transform](lexical.ElementNode.md#transform)

#### 定義於

[packages/lexical-list/src/LexicalListNode.ts:128](https://github.com/facebook/lexical/tree/main/packages/lexical-list/src/LexicalListNode.ts#L128)
