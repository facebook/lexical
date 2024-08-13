---
id: "lexical_code.CodeHighlightNode"
title: "類別: CodeHighlightNode"
custom_edit_url: null
---

[@lexical/code](../modules/lexical_code.md).CodeHighlightNode

## 階層結構

- [`TextNode`](lexical.TextNode.md)

  ↳ **`CodeHighlightNode`**

## 建構函式

### constructor

• **new CodeHighlightNode**(`text`, `highlightType?`, `key?`): [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

#### 參數

| 名稱 | 類型 |
| :------ | :------ |
| `text` | `string` |
| `highlightType?` | ``null`` \| `string` |
| `key?` | `string` |

#### 回傳

[`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[constructor](lexical.TextNode.md#constructor)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:100](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L100)

## 函式

### canHaveFormat

▸ **canHaveFormat**(): `boolean`

#### 回傳

`boolean`

如果文字節點支援字體樣式，則為 true，否則為 false。

#### 覆寫

[TextNode](lexical.TextNode.md).[canHaveFormat](lexical.TextNode.md#canhaveformat)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:126](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L126)

___

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在調解過程中調用以確定要插入此 Lexical 節點的 DOM 元素。

此方法必須返回確切的一個 HTMLElement。嵌套元素不被支援。

不要在更新週期的此階段嘗試更新 Lexical EditorState。

#### 參數

| 名稱 | 類型 | 描述 |
| :------ | :------ | :------ |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在調解過程中訪問例如 EditorTheme（應用樣式類別）。 |

#### 回傳

`HTMLElement`

#### 覆寫

[TextNode](lexical.TextNode.md).[createDOM](lexical.TextNode.md#createdom)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:130](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L130)

___

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

任何所需父元素的創建邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，則應實現此方法。

#### 回傳

[`ElementNode`](lexical.ElementNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[createParentElementNode](lexical.TextNode.md#createparentelementnode)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:197](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L197)

___

### exportJSON

▸ **exportJSON**(): `SerializedCodeHighlightNode`

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼很重要。對於將 JSON 序列化以持久儲存在某處也很重要。
參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳

`SerializedCodeHighlightNode`

#### 覆寫

[TextNode](lexical.TextNode.md).[exportJSON](lexical.TextNode.md#exportjson)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:179](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L179)

___

### getHighlightType

▸ **getHighlightType**(): `undefined` \| ``null`` \| `string`

#### 回傳

`undefined` \| ``null`` \| `string`

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:121](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L121)

___

### isParentRequired

▸ **isParentRequired**(): ``true``

此節點是否有需要的父元素。在複製+粘貼操作期間使用，以標準化本來會成為孤立節點的節點。例如，沒有 ListNode 父節點的 ListItemNode 或具有 ParagraphNode 父節點的 TextNode。

#### 回傳

``true``

#### 覆寫

[TextNode](lexical.TextNode.md).[isParentRequired](lexical.TextNode.md#isparentrequired)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:193](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L193)

___

### setFormat

▸ **setFormat**(`format`): `this`

將節點格式設置為提供的 TextFormatType 或 32 位整數。請注意，作為參數的 TextFormatType 版本只能指定一種格式，這樣會移除可能應用於節點的所有其他格式。要切換行為，請考慮使用 [TextNode.toggleFormat](lexical.TextNode.md#toggleformat)。

#### 參數

| 名稱 | 類型 | 描述 |
| :------ | :------ | :------ |
| `format` | `number` | 表示節點格式的 TextFormatType 或 32 位整數。 |

#### 回傳

`this`

此 TextNode。
// TODO 0.12 這應該只是 `string`。

#### 覆寫

[TextNode](lexical.TextNode.md).[setFormat](lexical.TextNode.md#setformat)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:189](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L189)

___

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`, `config`): `boolean`

當節點變更時調用，應更新 DOM
以使其與更新過程中可能發生的任何變更對齊。

返回 "true" 將使 Lexical 卸載並重新創建 DOM 節點
（通過調用 createDOM）。例如，如果元素標籤更改，您將需要這樣做。

#### 參數

| 名稱 | 類型 |
| :------ | :------ |
| `prevNode` | [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md) |
| `dom` | `HTMLElement` |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 回傳

`boolean`

#### 覆寫

[TextNode](lexical.TextNode.md).[updateDOM](lexical.TextNode.md#updatedom)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:140](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L140)

___

### clone

▸ **clone**(`node`): [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

複製此節點，創建一個具有不同鍵的新節點
並將其添加到 EditorState（但不將其附加到任何位置！）。所有節點都必須
實現此方法。

#### 參數

| 名稱 | 類型 |
| :------ | :------ |
| `node` | [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md) |

#### 回傳

[`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[clone](lexical.TextNode.md#clone)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:113](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L113)

___

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點都必須
實現此方法，並且在註冊到編輯器上的節點中必須是唯一的。

#### 回傳

`string`

#### 覆寫

[TextNode](lexical.TextNode.md).[getType](lexical.TextNode.md#gettype-1)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:109](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L109)



___

### importJSON

▸ **importJSON**(`serializedNode`): [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板程式碼，
但為節點實現和序列化介面之間提供了一個抽象層，這在您對節點模式進行重大更改時（通過添加或刪除屬性）可能很重要。
參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱 | 類型 |
| :------ | :------ |
| `serializedNode` | `SerializedCodeHighlightNode` |

#### 回傳

[`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[importJSON](lexical.TextNode.md#importjson)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:165](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L165)
