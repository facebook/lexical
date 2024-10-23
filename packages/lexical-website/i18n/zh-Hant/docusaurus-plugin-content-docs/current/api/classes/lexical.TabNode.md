---
id: 'lexical.TabNode'
title: 'Class: TabNode'
custom_edit_url: null
---

[lexical](../modules/lexical.md).TabNode

## 階層結構

- [`TextNode`](lexical.TextNode.md)

  ↳ **`TabNode`**

## 構造函式

### constructor

• **new TabNode**(`key?`): [`TabNode`](lexical.TabNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 返回

[`TabNode`](lexical.TabNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[constructor](lexical.TextNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L41)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

在 `prevNode` 的克隆上執行任何狀態更新，這些更新在靜態克隆函式中的構造函式調用時尚未處理。如果你的克隆中有狀態需要更新，而這些狀態沒有被構造函式直接處理，建議覆寫此函式，但實現中必須包含對 `super.afterCloneFrom(prevNode)` 的調用。這僅用於由 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過 super 調用。

#### 參數

| 名稱       | 類型   |
| :--------- | :----- |
| `prevNode` | `this` |

#### 返回

`void`

**`示例`**

```ts
class ClassesTextNode extends TextNode {
  // 未顯示：static getType, static importJSON, exportJSON, createDOM, updateDOM
  __classes = new Set<string>();
  static clone(node: ClassesTextNode): ClassesTextNode {
    // 這裡使用繼承的 TextNode 構造函式，所以
    // classes 不由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這會調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式是私有實現細節，不適用於公共 API 因為它不調用 getWritable
  __addClasses(classNames: Iterable<string>): this {
    for (const className of classNames) {
      this.__classes.add(className);
    }
    return this;
  }
  addClass(...classNames: string[]): this {
    return this.getWritable().__addClasses(classNames);
  }
  removeClass(...classNames: string[]): this {
    const node = this.getWritable();
    for (const className of classNames) {
      this.__classes.delete(className);
    }
    return this;
  }
  getClasses(): Set<string> {
    return this.getLatest().__classes;
  }
}
```

#### 覆寫

[TextNode](lexical.TextNode.md).[afterCloneFrom](lexical.TextNode.md#afterclonefrom)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L35)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `boolean`

此函式應由 TextNode 子類覆寫，以控制當用戶事件會導致文本在編輯器中插入在其之後的節點時的行為。如果返回 `true`，Lexical 將嘗試將文本插入到此節點中。如果返回 `false`，則會在新兄弟節點中插入文本。

#### 返回

`boolean`

如果可以在節點後插入文本，則返回 `true`，否則返回 `false`。

#### 覆寫

[TextNode](lexical.TextNode.md).[canInsertTextAfter](lexical.TextNode.md#caninserttextafter)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:81](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L81)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `boolean`

此函式應由 TextNode 子類覆寫，以控制當用戶事件會導致文本在編輯器中插入在其之前的節點時的行為。如果返回 `true`，Lexical 將嘗試將文本插入到此節點中。如果返回 `false`，則會在新兄弟節點中插入文本。

#### 返回

`boolean`

如果可以在節點之前插入文本，則返回 `true`，否則返回 `false`。

#### 覆寫

[TextNode](lexical.TextNode.md).[canInsertTextBefore](lexical.TextNode.md#caninserttextbefore)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:77](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L77)

---

### exportJSON

▸ **exportJSON**(): [`SerializedTextNode`](../modules/lexical.md#serializedtextnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間複製和粘貼非常重要。如果你將 JSON 用於持久存儲，也很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedTextNode`](../modules/lexical.md#serializedtextnode)

#### 覆寫

[TextNode](lexical.TextNode.md).[exportJSON](lexical.TextNode.md#exportjson)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L57)

---

### setDetail

▸ **setDetail**(`_detail`): `this`

將節點的詳細信息設置為提供的 `TextDetailType` 或 32 位整數。請注意，`TextDetailType` 版本的參數只能指定一個詳細值，這樣會移除可能應用於節點的所有其他詳細值。對於切換行為，考慮使用 [TextNode.toggleDirectionless](lexical.TextNode.md#toggledirectionless) 或 [TextNode.toggleUnmergeable](lexical.TextNode.md#toggleunmergeable)。

#### 參數

| 名稱      | 類型                         | 描述                                               |
| :-------- | :--------------------------- | :------------------------------------------------- |
| `_detail` | `number` \| `TextDetailType` | 代表節點詳細信息的 `TextDetailType` 或 32 位整數。 |

#### 返回

`this`

此 `TextNode`。
// TODO 0.12 這應該只是 `string`。

#### 覆寫

[TextNode](lexical.TextNode.md).[setDetail](lexical.TextNode.md#setdetail)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L69)

---

### setMode

▸ **setMode**(`_type`): `this`

設置節點的模式。

#### 參數

| 名稱    | 類型                                                 |
| :------ | :--------------------------------------------------- |
| `_type` | [`TextModeType`](../modules/lexical.md#textmodetype) |

#### 返回

`this`

此 `TextNode`。

#### 覆寫

[TextNode](lexical.TextNode.md).[setMode](lexical.TextNode.md#setmode)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:73](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L73)

---

### setTextContent

▸ **setTextContent**(`_text`): `this`

設置節點的文本內容。

#### 參數

| 名稱    | 類型     | 描述                       |
| :------ | :------- | :------------------------- |
| `_text` | `string` | 設置為節點文本值的字符串。 |

#### 返回

`this`

此 `TextNode`。

#### 覆寫

[TextNode](lexical.TextNode.md).[setTextContent](lexical.TextNode.md#settextcontent)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:65](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L65)

---

### clone

▸ **clone**(`node`): [`TabNode`](lexical.TabNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState 中（但不附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱   | 類型                            |
| :----- | :------------------------------ |
| `node` | [`TabNode`](lexical.TabNode.md) |

#### 返回

[`TabNode`](lexical.TabNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[clone](lexical.TextNode.md#clone)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:31](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L31)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須實現此函式，並且在編輯器中註冊的節點之間必須唯一。

#### 返回

`string`

#### 覆寫

[TextNode](lexical.TextNode.md).[getType](lexical.TextNode.md#gettype-1)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L27)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

[TextNode](lexical.TextNode.md).[importDOM](lexical.TextNode.md#importdom)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L46)

---

### importJSON

▸ **importJSON**(`serializedTabNode`): [`TabNode`](lexical.TabNode.md)

控制如何從 JSON 反序列化此節點。這通常是樣板代碼，但提供了節點實現和序列化介面之間的抽象，這在你對節點模式進行重大更改（通過添加或移除屬性）時可能很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱                | 類型                                                             |
| :------------------ | :--------------------------------------------------------------- |
| `serializedTabNode` | [`SerializedTextNode`](../modules/lexical.md#serializedtextnode) |

#### 返回

[`TabNode`](lexical.TabNode.md)

#### 覆寫

[TextNode](lexical.TextNode.md).[importJSON](lexical.TextNode.md#importjson)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:50](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L50)
