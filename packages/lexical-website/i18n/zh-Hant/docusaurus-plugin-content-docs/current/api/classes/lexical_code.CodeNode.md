---
id: 'lexical_code.CodeNode'
title: '類別：CodeNode'
custom_edit_url: null
---

[@lexical/code](../modules/lexical_code.md).CodeNode

## 層次結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`CodeNode`**

## 構造函數

### constructor

• **new CodeNode**(`language?`, `key?`): [`CodeNode`](lexical_code.CodeNode.md)

#### 參數

| 名稱        | 類型               |
| :---------- | :----------------- |
| `language?` | `null` \| `string` |
| `key?`      | `string`           |

#### 返回值

[`CodeNode`](lexical_code.CodeNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:90](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L90)

## 方法

### canIndent

▸ **canIndent**(): `false`

#### 返回值

`false`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[canIndent](lexical.ElementNode.md#canindent)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:315](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L315)

---

### collapseAtStart

▸ **collapseAtStart**(): `boolean`

#### 返回值

`boolean`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:319](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L319)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在對應過程中調用，以確定要插入到 DOM 中的節點。

此方法必須返回一個 HTMLElement。嵌套元素不受支持。

在更新生命周期的此階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                     |
| :------- | :--------------------------------------------------- | :------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 在對應過程中允許訪問像 EditorTheme（以應用類別）等事物。 |

#### 返回值

`HTMLElement`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:97](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L97)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或具有不同命名空間的 Lexical 編輯器很重要，此情況下主要的傳輸格式是 HTML。如果您通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 序列化為 HTML，這也很重要。您還可以使用此方法來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 返回值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:137](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L137)

---

### exportJSON

▸ **exportJSON**(): [`SerializedCodeNode`](../modules/lexical_code.md#serializedcodenode)

控制此節點如何序列化為 JSON。這對於共享相同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。如果您將 JSON 序列化為某個地方的持久存儲，也很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回值

[`SerializedCodeNode`](../modules/lexical_code.md#serializedcodenode)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:227](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L227)

---

### getIsSyntaxHighlightSupported

▸ **getIsSyntaxHighlightSupported**(): `boolean`

#### 返回值

`boolean`

#### 定義於

[packages/lexical-code/src/CodeNode.ts:338](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L338)

---

### getLanguage

▸ **getLanguage**(): `undefined` \| `null` \| `string`

#### 返回值

`undefined` \| `null` \| `string`

#### 定義於

[packages/lexical-code/src/CodeNode.ts:334](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L334)

---

### insertNewAfter

▸ **insertNewAfter**(`selection`, `restoreSelection?`): `null` \| [`ParagraphNode`](lexical.ParagraphNode.md) \| [`TabNode`](lexical.TabNode.md) \| [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

#### 參數

| 名稱               | 類型                                          | 預設值      |
| :----------------- | :-------------------------------------------- | :---------- |
| `selection`        | [`RangeSelection`](lexical.RangeSelection.md) | `undefined` |
| `restoreSelection` | `boolean`                                     | `true`      |

#### 返回值

`null` \| [`ParagraphNode`](lexical.ParagraphNode.md) \| [`TabNode`](lexical.TabNode.md) \| [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:237](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L237)

---

### setLanguage

▸ **setLanguage**(`language`): `void`

#### 參數

| 名稱       | 類型     |
| :--------- | :------- |
| `language` | `string` |

#### 返回值

`void`

#### 定義於

[packages/lexical-code/src/CodeNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L327)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`, `config`): `boolean`

當節點更改並且應根據更新中可能發生的任何更改更新 DOM 時調用。

返回 "true" 將導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。如果元素標籤發生變化，則需要這樣做。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`CodeNode`](lexical_code.CodeNode.md)               |
| `dom`      | `HTMLElement`                                        |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回值

`boolean`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L111)

---

### clone

▸ **clone**(`node`): [`CodeNode`](lexical_code.CodeNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState（但不附加到任何地方！）。所有節點必須實現此方法。

#### 參數

| 名稱   | 類型                                   |
| :----- | :------------------------------------- |
| `node` | [`CodeNode`](lexical_code.CodeNode.md) |

#### 返回值

[`CodeNode`](lexical_code.CodeNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L86)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實作此方法，並且在編輯器上註冊的節點中必須是唯一的。

#### 返回值

`string`

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:82](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L82)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆蓋

ElementNode.importDOM

#### 定義於

[packages/lexical-code/src/CodeNode.ts:152](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L152)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`CodeNode`](lexical_code.CodeNode.md)

控制如何從 JSON 反序列化此節點。這通常是樣板，但提供了節點實作與序列化介面之間的抽象，這在您對節點架構進行重大更改（例如添加或刪除屬性）時可能很重要。參見 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                  |
| :--------------- | :-------------------------------------------------------------------- |
| `serializedNode` | [`SerializedCodeNode`](../modules/lexical_code.md#serializedcodenode) |

#### 返回值

[`CodeNode`](lexical_code.CodeNode.md)

#### 覆蓋

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:219](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L219)
