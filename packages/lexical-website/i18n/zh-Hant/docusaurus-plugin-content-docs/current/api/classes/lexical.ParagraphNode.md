---
id: 'lexical.ParagraphNode'
title: 'Class: ParagraphNode'
custom_edit_url: null
---

[lexical](../modules/lexical.md).ParagraphNode

## 繼承層級

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`ParagraphNode`**

## 建構子

### constructor

• **new ParagraphNode**(`key?`): [`ParagraphNode`](lexical.ParagraphNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 返回

[`ParagraphNode`](lexical.ParagraphNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:52](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L52)

## 屬性

### \_\_textStyle

• **\_\_textStyle**: `string`

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:50](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L50)

---

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`ParagraphNode`](lexical.ParagraphNode.md)\>
#### 覆寫

ElementNode.constructor

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L47)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

對 `prevNode` 的克隆執行任何狀態更新，這些更新不由靜態克隆函式中的建構子調用處理。如果你的克隆需要更新的狀態，這些狀態未由建構子直接處理，建議覆寫此函式，但在實現中必須包含對 `super.afterCloneFrom(prevNode)` 的調用。這僅應由 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過超類調用進行調用。

#### 參數

| 名稱       | 類型   |
| :--------- | :----- |
| `prevNode` | `this` |

#### 返回

`void`

**`範例`**

```ts
class ClassesTextNode extends TextNode {
  // 未顯示: static getType, static importJSON, exportJSON, createDOM, updateDOM
  __classes = new Set<string>();
  static clone(node: ClassesTextNode): ClassesTextNode {
    // 此處使用繼承的 TextNode 建構子，因此
    // classes 不由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這會調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式是私有實現細節，並不
  // 適合用於公開 API，因為它不會調用 getWritable
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

[ElementNode](lexical.ElementNode.md).[afterCloneFrom](lexical.ElementNode.md#afterclonefrom)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:93](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L93)

---

### collapseAtStart

▸ **collapseAtStart**(): `boolean`

#### 返回

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:191](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L191)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在和解過程中調用，以確定要插入到 DOM 中的節點。

此函式必須返回正好一個 `HTMLElement`。不支持嵌套元素。

在此更新生命週期階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                     |
| :------- | :--------------------------------------------------- | :------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在和解過程中訪問如 EditorTheme（以應用類別）等內容。 |

#### 返回

`HTMLElement`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:101](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L101)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於在 Lexical 和非 Lexical 編輯器之間或不同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要，此時主要的傳輸格式是 HTML。如果你還需要通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 將其序列化為 HTML，這也很重要。你也可以使用此函式來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 返回

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:127](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L127)

---

### exportJSON

▸ **exportJSON**(): [`SerializedParagraphNode`](../modules/lexical.md#serializedparagraphnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你需要將其序列化為 JSON 以便在某處進行持久存儲，這也很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedParagraphNode`](../modules/lexical.md#serializedparagraphnode)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:164](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L164)

---

### getTextFormat

▸ **getTextFormat**(): `number`

#### 返回

`number`

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L62)

---

### getTextStyle

▸ **getTextStyle**(): `string`

#### 返回

`string`

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:78](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L78)

---

### hasTextFormat

▸ **hasTextFormat**(`type`): `boolean`

#### 參數

| 名稱   | 類型                                                     |
| :----- | :------------------------------------------------------- |
| `type` | [`TextFormatType`](../modules/lexical.md#textformattype) |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:73](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L73)

---

### insertNewAfter

▸ **insertNewAfter**(`rangeSelection`, `restoreSelection`): [`ParagraphNode`](lexical.ParagraphNode.md)

#### 參數

| 名稱               | 類型                                          |
| :----------------- | :-------------------------------------------- |
| `rangeSelection`   | [`RangeSelection`](lexical.RangeSelection.md) |
| `restoreSelection` | `boolean`                                     |

#### 返回

[`ParagraphNode`](lexical.ParagraphNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:176](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L176)

---

### setTextFormat

▸ **setTextFormat**(`type`): `this`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `type` | `number` |

#### 返回

`this`

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:67](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L67)

---

### setTextStyle

▸ **setTextStyle**(`style`): `this`

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `style` | `string` |

#### 返回

`this`

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:83](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L83)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`, `config`): `boolean`

當節點發生變化且需要更新 DOM 以使其與可能在更新期間發生的任何變化對齊時調用。

如果返回 "true"，則會導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤更改，你需要這樣做。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`ParagraphNode`](lexical.ParagraphNode.md)          |
| `dom`      | `HTMLElement`                                        |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回

`boolean`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:110](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L110)

---

### clone

▸ **clone**(`node`): [`ParagraphNode`](lexical.ParagraphNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState（但不附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱   | 類型                                        |
| :----- | :------------------------------------------ |
| `node` | [`ParagraphNode`](lexical.ParagraphNode.md) |

#### 返回

[`ParagraphNode`](lexical.ParagraphNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:89](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L89)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須實現此函式，且必須在編輯器中唯一。

#### 返回

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:58](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L58)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 覆寫

ElementNode.importDOM

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:118](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L118)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`ParagraphNode`](lexical.ParagraphNode.md)

控制此節點如何從 JSON 反序列化。這通常是模板代碼，但提供了節點實現和序列化接口之間的抽象，這在你進行結構變更（通過添加或刪除屬性）時可能很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                       |
| :--------------- | :------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedParagraphNode`](../modules/lexical.md#serializedparagraphnode) |

#### 返回

[`ParagraphNode`](lexical.ParagraphNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L155)
