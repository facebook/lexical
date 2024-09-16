---
id: 'lexical.TextNode'
title: 'Class: TextNode'
custom_edit_url: null
---

[lexical](../modules/lexical.md).TextNode

## 階層結構

- [`LexicalNode`](lexical.LexicalNode.md)

  ↳ **`TextNode`**

  ↳↳ [`TabNode`](lexical.TabNode.md)

  ↳↳ [`CodeHighlightNode`](lexical_code.CodeHighlightNode.md)

  ↳↳ [`HashtagNode`](lexical_hashtag.HashtagNode.md)

## 建構子

### constructor

• **new TextNode**(`text`, `key?`): [`TextNode`](lexical.TextNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |
| `key?` | `string` |

#### 回傳值

[`TextNode`](lexical.TextNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[constructor](lexical.LexicalNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:314](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L314)

## 屬性

### \_\_text

• **\_\_text**: `string`

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:288](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L288)

---

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`TextNode`](lexical.TextNode.md)\>

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:287](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L287)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

在克隆 prevNode 後執行任何狀態更新，這些更新未由靜態 clone 函式中的建構子調用處理。如果你的克隆需要更新的狀態未由建構子直接處理，建議覆蓋此函式，但需要在實現中包含對 `super.afterCloneFrom(prevNode)` 的調用。此函式僅應由 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過 super 調用來調用。

#### 參數

| 名稱       | 類型   |
| :--------- | :----- |
| `prevNode` | `this` |

#### 回傳值

`void`

**`範例`**

```ts
class ClassesTextNode extends TextNode {
  // 未顯示: static getType, static importJSON, exportJSON, createDOM, updateDOM
  __classes = new Set<string>();
  static clone(node: ClassesTextNode): ClassesTextNode {
    // 這裡使用繼承的 TextNode 建構子，因此
    // classes 不由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這會調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式為私有實現細節，不適合公開 API，因為它不調用 getWritable
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

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[afterCloneFrom](lexical.LexicalNode.md#afterclonefrom)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:306](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L306)

---

### canHaveFormat

▸ **canHaveFormat**(): `boolean`

#### 回傳值

`boolean`

如果文本節點支持字體樣式，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:464](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L464)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `boolean`

此函式旨在由 TextNode 子類覆蓋，以控制當用戶事件導致在編輯器中該節點後插入文本時的行為。如果為 true，Lexical 將嘗試在此節點中插入文本。如果為 false，則會在新的兄弟節點中插入文本。

#### 回傳值

`boolean`

如果文本可以在節點後插入，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:907](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L907)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `boolean`

此函式旨在由 TextNode 子類覆蓋，以控制當用戶事件導致在編輯器中該節點前插入文本時的行為。如果為 true，Lexical 將嘗試在此節點中插入文本。如果為 false，則會在新的兄弟節點中插入文本。

#### 回傳值

`boolean`

如果文本可以在節點前插入，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:896](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L896)

---

### createDOM

▸ **createDOM**(`config`, `editor?`): `HTMLElement`

在重建過程中調用此函式，以確定要將哪些節點插入到 DOM 中。

此函式必須返回一個 HTMLElement。嵌套元素不受支持。

在更新生命週期的此階段，不要嘗試更新 Lexical EditorState。

#### 參數

| 名稱      | 類型                                                 | 描述                                                    |
| :-------- | :--------------------------------------------------- | :------------------------------------------------------ |
| `config`  | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在重建期間訪問如 EditorTheme 等事物（以應用類別）。 |
| `editor?` | [`LexicalEditor`](lexical.LexicalEditor.md)          | 允許在重建期間訪問編輯器以獲取上下文。                  |

#### 回傳值

`HTMLElement`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[createDOM](lexical.LexicalNode.md#createdom)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:470](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L470)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

為任何所需的父節點創建邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，則應實現此函式。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[createParentElementNode](lexical.LexicalNode.md#createparentelementnode)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1094](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1094)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於在 Lexical 和非 Lexical 編輯器之間，或在不同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要，在這些情況下，主要的轉移格式是 HTML。如果你因其他原因需要序列化為 HTML，可以通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 使用此函式。你也可以使用此函式來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[exportDOM](lexical.LexicalNode.md#exportdom)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:621](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L621)

---

### exportJSON

▸ **exportJSON**(): [`SerializedTextNode`](../modules/lexical.md#serializedtextnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你需要將 JSON 序列化為持久存儲，也很重要。詳情見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedTextNode`](../modules/lexical.md#serializedtextnode)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[exportJSON](lexical.LexicalNode.md#exportjson)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:649](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L649)

---

### getCommonAncestor

▸ **getCommonAncestor**\<`T`\>(`node`): `null` \| `T`

返回此節點和提供的節點的最近共同祖先，如果找不到則返回 null。

#### 類型參數

| 名稱 | 類型                                                                                   |
| :--- | :------------------------------------------------------------------------------------- |
| `T`  | 擴展 [`ElementNode`](lexical.ElementNode.md) = [`ElementNode`](lexical.ElementNode.md) |

#### 參數

| 名稱   | 類型                                    | 描述                           |
| :----- | :-------------------------------------- | :----------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) | 需要尋找共同祖先的另一個節點。 |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getCommonAncestor](lexical.LexicalNode.md#getcommonancestor)

#### 定義於

[packages/lexical/src/LexicalNode.ts:553](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L553)

---

### getDetail

▸ **getDetail**(): `number`

返回一個 32 位整數，表示當前應用於 TextNode 的 TextDetailTypes。你可能不需要直接使用此函式 - 考慮使用 TextNode.isDirectionless 或 TextNode.isUnmergeable。

#### 回傳值

`number`

表示文本節點詳細資訊的數字。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:341](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L341)

---

### getFormat

▸ **getFormat**(): `number`

返回一個 32 位整數，表示當前應用於 TextNode 的 TextFormatTypes。你可能不需要直接使用此函式 - 考慮使用 TextNode.hasFormat。

#### 回傳值

`number`

表示文本節點格式的數字。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:329](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L329)

---

### getFormatFlags

▸ **getFormatFlags**(`type`, `alignWithFormat`): `number`

返回應用於節點的格式標誌，作為 32 位整數。

#### 參數

| 名稱              | 類型                                                     |
| :---------------- | :------------------------------------------------------- |
| `type`            | [`TextFormatType`](../modules/lexical.md#textformattype) |
| `alignWithFormat` | `null` \| `number`                                       |

#### 回傳值

`number`

表示應用於節點的 TextFormatTypes 的數字。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:454](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L454)

---

### getIndexWithinParent

▸ **getIndexWithinParent**(): `number`

返回此節點在父節點中的零基索引。

#### 回傳值

`number`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getIndexWithinParent](lexical.LexicalNode.md#getindexwithinparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:381](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L381)

---

### getKey

▸ **getKey**(): `string`

返回此節點的鍵。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getKey](lexical.LexicalNode.md#getkey)

#### 定義於

[packages/lexical/src/LexicalNode.ts:373](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L373)

---

### getLatest

▸ **getLatest**(): `this`

返回來自活動 EditorState 的節點的最新版本。這樣可以避免從過期的節點引用中獲取值。

#### 回傳值

`this`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getLatest](lexical.LexicalNode.md#getlatest)

#### 定義於

[packages/lexical/src/LexicalNode.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L739)

---

### getMode

▸ **getMode**(): [`TextModeType`](../modules/lexical.md#textmodetype)

返回 TextNode 的模式（TextModeType），可能是 "normal"、"token" 或 "segmented"。

#### 回傳值

[`TextModeType`](../modules/lexical.md#textmodetype)

TextModeType。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:351](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L351)

---

### getNextSibling

▸ **getNextSibling**\<`T`\>(): `null` \| `T`

返回「下一個」兄弟節點，即同一父節點中排在此節點後面的節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getNextSibling](lexical.LexicalNode.md#getnextsibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:526](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L526)

### getNextSiblings

▸ **getNextSiblings**\<`T`\>(): `T`[]

返回所有「下一個」兄弟節點，即介於此節點和其父節點的最後一個子節點之間的所有節點（包括兩端節點）。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getNextSiblings](lexical.LexicalNode.md#getnextsiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:537](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L537)

---

### getNodesBetween

▸ **getNodesBetween**(`targetNode`): [`LexicalNode`](lexical.LexicalNode.md)[]

返回此節點和目標節點之間的節點列表。

#### 參數

| 名稱         | 類型                                    | 描述                       |
| :----------- | :-------------------------------------- | :------------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 標記節點範圍另一端的節點。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getNodesBetween](lexical.LexicalNode.md#getnodesbetween)

#### 定義於

[packages/lexical/src/LexicalNode.ts:658](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L658)

---

### getParent

▸ **getParent**\<`T`\>(): `null` \| `T`

返回此節點的父節點，如果找不到則返回 null。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`ElementNode`](lexical.ElementNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParent](lexical.LexicalNode.md#getparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L401)

---

### getParentKeys

▸ **getParentKeys**(): `string`[]

返回此節點所有祖先節點的鍵列表，直到根節點。

#### 回傳值

`string`[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParentKeys](lexical.LexicalNode.md#getparentkeys)

#### 定義於

[packages/lexical/src/LexicalNode.ts:478](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L478)

---

### getParentOrThrow

▸ **getParentOrThrow**\<`T`\>(): `T`

返回此節點的父節點，如果找不到則拋出異常。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`ElementNode`](lexical.ElementNode.md) |

#### 回傳值

`T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParentOrThrow](lexical.LexicalNode.md#getparentorthrow)

#### 定義於

[packages/lexical/src/LexicalNode.ts:412](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L412)

---

### getParents

▸ **getParents**(): [`ElementNode`](lexical.ElementNode.md)[]

返回此節點所有祖先節點的列表，一直到根節點。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParents](lexical.LexicalNode.md#getparents)

#### 定義於

[packages/lexical/src/LexicalNode.ts:463](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L463)

---

### getPreviousSibling

▸ **getPreviousSibling**\<`T`\>(): `null` \| `T`

返回「上一個」兄弟節點，即在同一父節點中位於此節點之前的節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getPreviousSibling](lexical.LexicalNode.md#getprevioussibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:493](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L493)

---

### getPreviousSiblings

▸ **getPreviousSiblings**\<`T`\>(): `T`[]

返回所有「上一個」兄弟節點，即介於此節點和其父節點的第一個子節點之間的所有節點（包括兩端節點）。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getPreviousSiblings](lexical.LexicalNode.md#getprevioussiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:504](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L504)

---

### getStyle

▸ **getStyle**(): `string`

返回當前應用於節點的樣式。這類似於 DOM 中的 CSSText。

#### 回傳值

`string`

類似 CSSText 的樣式字符串。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:361](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L361)

---

### getTextContent

▸ **getTextContent**(): `string`

返回節點的文本內容，作為字符串。

#### 回傳值

`string`

表示節點文本內容的字符串。

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTextContent](lexical.LexicalNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:444](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L444)

---

### getTextContentSize

▸ **getTextContentSize**(): `number`

返回調用 getTextContent 產生的字符串的長度。

#### 回傳值

`number`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTextContentSize](lexical.LexicalNode.md#gettextcontentsize)

#### 定義於

[packages/lexical/src/LexicalNode.ts:797](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L797)

### getTopLevelElement

▸ **getTopLevelElement**(): `null` \| [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高的（非根）祖先節點，如果找不到則返回 null。詳細資訊請參見 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 了解哪些元素構成「根」。

#### 回傳值

`null` \| [`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTopLevelElement](lexical.LexicalNode.md#gettoplevelelement)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:280](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L280)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高的（非根）祖先節點，如果找不到則拋出異常。詳細資訊請參見 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 了解哪些元素構成「根」。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTopLevelElementOrThrow](lexical.LexicalNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:281](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L281)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getType](lexical.LexicalNode.md#gettype)

#### 定義於

[packages/lexical/src/LexicalNode.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L286)

---

### getWritable

▸ **getWritable**(): `this`

返回節點的可變版本（如果需要，使用 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties)）。如果在 Lexical 編輯器的 [LexicalEditor.update](lexical.LexicalEditor.md#update) 回調之外調用，將拋出錯誤。

#### 回傳值

`this`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getWritable](lexical.LexicalNode.md#getwritable)

#### 定義於

[packages/lexical/src/LexicalNode.ts:756](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L756)

---

### hasFormat

▸ **hasFormat**(`type`): `boolean`

返回節點是否應用了指定的格式。使用人類可讀的 TextFormatType 字符串值來獲取 TextNode 的格式。

#### 參數

| 名稱   | 類型                                                     | 描述                      |
| :----- | :------------------------------------------------------- | :------------------------ |
| `type` | [`TextFormatType`](../modules/lexical.md#textformattype) | 要檢查的 TextFormatType。 |

#### 回傳值

`boolean`

如果節點有指定的格式，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:424](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L424)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 之後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要在此節點之後插入的節點。                   |
| `restoreSelection` | `boolean`                               | `true`      | 是否嘗試在操作完成後將選擇恢復到適當的位置。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[insertAfter](lexical.LexicalNode.md#insertafter)

#### 定義於

[packages/lexical/src/LexicalNode.ts:979](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L979)

---

### insertBefore

▸ **insertBefore**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 之前插入一個節點（作為上一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要在此節點之前插入的節點。                   |
| `restoreSelection` | `boolean`                               | `true`      | 是否嘗試在操作完成後將選擇恢復到適當的位置。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[insertBefore](lexical.LexicalNode.md#insertbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1046](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1046)

---

### is

▸ **is**(`object`): `boolean`

如果提供的節點與此節點完全相同，則返回 true，從 Lexical 的角度來看。總是使用此函式而不是引用相等性。

#### 參數

| 名稱     | 類型                                                             | 描述                     |
| :------- | :--------------------------------------------------------------- | :----------------------- |
| `object` | `undefined` \| `null` \| [`LexicalNode`](lexical.LexicalNode.md) | 要進行等效性比較的節點。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[is](lexical.LexicalNode.md#is)

#### 定義於

[packages/lexical/src/LexicalNode.ts:585](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L585)

---

### isAttached

▸ **isAttached**(): `boolean`

如果此節點與根節點之間存在路徑，則返回 true，否則返回 false。這是一種確定節點是否「附加」到 EditorState 的函式。未附加的節點將不會被對帳，最終會被 Lexical GC 清理。

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isAttached](lexical.LexicalNode.md#isattached)

#### 定義於

[packages/lexical/src/LexicalNode.ts:303](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L303)

---

### isBefore

▸ **isBefore**(`targetNode`): `boolean`

如果此節點在編輯器狀態中邏輯上位於目標節點之前，則返回 true。

#### 參數

| 名稱         | 類型                                    | 描述                             |
| :----------- | :-------------------------------------- | :------------------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 要測試此節點是否在其之前的節點。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isBefore](lexical.LexicalNode.md#isbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:597](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L597)

---

### isComposing

▸ **isComposing**(): `boolean`

#### 回傳值

`boolean`

如果 Lexical 檢測到 IME 或其他第三方腳本正在嘗試變更 TextNode，則返回 true，否則返回 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:382](https://github.com

/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L382)

### isDirectionless

▸ **isDirectionless**(): `boolean`

返回節點是否為「無方向」的。無方向節點不會尊重 RTL 和 LTR 模式之間的變化。

#### 回傳值

`boolean`

如果節點是無方向的，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L401)

---

### isDirty

▸ **isDirty**(): `boolean`

如果此節點在更新循環中被標記為脏，則返回 true。

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isDirty](lexical.LexicalNode.md#isdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:728](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L728)

---

### isInline

▸ **isInline**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isInline](lexical.LexicalNode.md#isinline)

#### 定義於

[packages/lexical/src/LexicalNode.ts:290](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L290)

---

### isParentOf

▸ **isParentOf**(`targetNode`): `boolean`

如果此節點是目標節點的父節點，則返回 true，否則返回 false。

#### 參數

| 名稱         | 類型                                    | 描述           |
| :----------- | :-------------------------------------- | :------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 預期的子節點。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isParentOf](lexical.LexicalNode.md#isparentof)

#### 定義於

[packages/lexical/src/LexicalNode.ts:636](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L636)

---

### isParentRequired

▸ **isParentRequired**(): `boolean`

此節點是否有要求的父節點。在複製 + 粘貼操作中使用，以正常化否則會成為孤立的節點。例如，沒有 ListNode 父節點的 ListItemNodes 或具有 ParagraphNode 父節點的 TextNodes。

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isParentRequired](lexical.LexicalNode.md#isparentrequired)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1086](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1086)

---

### isSegmented

▸ **isSegmented**(): `boolean`

返回節點是否處於「分段」模式。在分段模式下的 TextNodes 可以通過字符逐個導航，但以空格分隔的「段」被刪除。

#### 回傳值

`boolean`

如果節點處於分段模式，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:392](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L392)

---

### isSelected

▸ **isSelected**(`selection?`): `boolean`

如果此節點包含在提供的 Selection 中，則返回 true，否則返回 false。依賴於 [BaseSelection.getNodes](../interfaces/lexical.BaseSelection.md#getnodes) 中實現的算法來確定包含的內容。

#### 參數

| 名稱         | 類型                                                                | 描述                               |
| :----------- | :------------------------------------------------------------------ | :--------------------------------- |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 我們想要確定節點是否在其中的選擇。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isSelected](lexical.LexicalNode.md#isselected)

#### 定義於

[packages/lexical/src/LexicalNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L327)

---

### isSimpleText

▸ **isSimpleText**(): `boolean`

返回節點是否為簡單文本。簡單文本被定義為具有字符串類型「text」（即非子類）的 TextNode，且未應用任何模式（即非分段或令牌模式）。

#### 回傳值

`boolean`

如果節點是簡單文本，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:435](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L435)

---

### isTextEntity

▸ **isTextEntity**(): `boolean`

此函式旨在由 TextNode 子類覆寫，以控制這些節點在使用 registerLexicalTextEntity 函式時的行為。如果您正在使用 registerLexicalTextEntity，則您創建並替換匹配文本的節點類應該從此函式返回 true。

#### 回傳值

`boolean`

如果節點應被視為「文本實體」，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:1104](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L1104)

---

### isToken

▸ **isToken**(): `boolean`

返回節點是否處於「令牌」模式。在令牌模式下的 TextNodes 可以通過字符逐個導航，但作為一個單一實體（而不是按字符單獨刪除）被刪除。

#### 回傳值

`boolean`

如果節點處於令牌模式，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:372](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L372)

---

### isUnmergeable

▸ **isUnmergeable**(): `boolean`

返回節點是否不可合併。在某些情況下，Lexical 嘗試將相鄰的 TextNodes 合併為一個單一的 TextNode。如果一個 TextNode 不可合併，則不會發生這種情況。

#### 回傳值

`boolean`

如果節點不可合併，則為 true，否則為 false。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:411](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L411)

---

### markDirty

▸ **markDirty**(): `void`

將節點標記為脏，觸發轉換並強制在更新循環中對其進行對帳。

#### 回傳值

`void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[markDirty](lexical.LexicalNode.md#markdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1155)

### mergeWithSibling

▸ **mergeWithSibling**(`target`): [`TextNode`](lexical.TextNode.md)

將目標 TextNode 合併到此 TextNode 中，並刪除目標節點。

#### 參數

| 名稱     | 類型                              | 描述                        |
| :------- | :-------------------------------- | :-------------------------- |
| `target` | [`TextNode`](lexical.TextNode.md) | 要合併到此節點的 TextNode。 |

#### 回傳值

[`TextNode`](lexical.TextNode.md)

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:1047](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L1047)

---

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

從 EditorState 中刪除此 LexicalNode。如果節點未被重新插入到其他地方，Lexical 垃圾回收器最終將會清理它。

#### 參數

| 名稱                   | 類型      | 描述                                                                                                                                                                                 |
| :--------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為 falsy，則如果刪除操作後節點的父節點為空，該父節點將被移除。這是默認行為，但會受到其他節點啟發式規則的影響，例如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty)。 |

#### 回傳值

`void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[remove](lexical.LexicalNode.md#remove)

#### 定義於

[packages/lexical/src/LexicalNode.ts:898](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L898)

---

### replace

▸ **replace**\<`N`\>(`replaceWith`, `includeChildren?`): `N`

用提供的節點替換此 LexicalNode，並可以選擇將被替換節點的子節點轉移到替換節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `N`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 描述                                 |
| :----------------- | :-------- | :----------------------------------- |
| `replaceWith`      | `N`       | 用於替換此節點的節點。               |
| `includeChildren?` | `boolean` | 是否將此節點的子節點轉移到替換節點。 |

#### 回傳值

`N`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[replace](lexical.LexicalNode.md#replace)

#### 定義於

[packages/lexical/src/LexicalNode.ts:909](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L909)

---

### select

▸ **select**(`_anchorOffset?`, `_focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將當前的 Lexical 選擇設置為一個 RangeSelection，並將錨點和焦點設置在此 TextNode 的指定偏移位置。

#### 參數

| 名稱             | 類型     | 描述                 |
| :--------------- | :------- | :------------------- |
| `_anchorOffset?` | `number` | 選擇錨點的偏移位置。 |
| `_focusOffset?`  | `number` | 選擇焦點的偏移位置。 |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

新的 RangeSelection。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:794](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L794)

---

### selectEnd

▸ **selectEnd**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectEnd](lexical.LexicalNode.md#selectend)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:839](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L839)

---

### selectNext

▸ **selectNext**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇移動到此節點的下一個兄弟節點，並設置指定的偏移位置。

#### 參數

| 名稱            | 類型     | 描述                 |
| :-------------- | :------- | :------------------- |
| `anchorOffset?` | `number` | 選擇的錨點偏移位置。 |
| `focusOffset?`  | `number` | 選擇的焦點偏移位置   |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectNext](lexical.LexicalNode.md#selectnext)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1134](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1134)

---

### selectPrevious

▸ **selectPrevious**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇移動到此節點的上一個兄弟節點，並設置指定的偏移位置。

#### 參數

| 名稱            | 類型     | 描述                 |
| :-------------- | :------- | :------------------- |
| `anchorOffset?` | `number` | 選擇的錨點偏移位置。 |
| `focusOffset?`  | `number` | 選擇的焦點偏移位置   |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectPrevious](lexical.LexicalNode.md#selectprevious)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1112](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1112)

---

### selectStart

▸ **selectStart**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectStart](lexical.LexicalNode.md#selectstart)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:835](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L835)

---

### selectionTransform

▸ **selectionTransform**(`prevSelection`, `nextSelection`): `void`

#### 參數

| 名稱            | 類型                                                                |
| :-------------- | :------------------------------------------------------------------ |
| `prevSelection` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |
| `nextSelection` | [`RangeSelection`](lexical.RangeSelection.md)                       |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:662](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L662)

---

### setDetail

▸ **setDetail**(`detail`): `this`

將節點的詳細信息設置為提供的 TextDetailType 或 32 位整數。請注意，TextDetailType 版本的參數只能指定一個詳細信息值，這樣做會移除應用於節點的所有其他詳細信息值。若要切換行為，請考慮使用 [TextNode.toggleDirectionless](lexical.TextNode.md#toggledirectionless) 或 [TextNode.toggleUnmergeable](lexical.TextNode.md#toggleunmergeable)。

#### 參數

| 名稱     | 類型                         | 描述                                             |
| :------- | :--------------------------- | :----------------------------------------------- |
| `detail` | `number` \| `TextDetailType` | 表示節點詳細信息的 TextDetailType 或 32 位整數。 |

#### 回傳值

`this`

此 TextNode。
// TODO 0.12 這應該只是 `string`。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:697](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L697)

---

### setFormat

▸ **setFormat**(`format`): `this`

將節點的格式設置為提供的 TextFormatType 或 32 位整數。請注意，TextFormatType 版本的參數只能指定一種格式，這樣做會移除應用於節點的所有其他格式。若要切換格式，請考慮使用 [TextNode.toggleFormat](lexical.TextNode.md#toggleformat)。

#### 參數

| 名稱     | 類型                                                                 | 描述                                         |
| :------- | :------------------------------------------------------------------- | :------------------------------------------- |
| `format` | `number` \| [`TextFormatType`](../modules/lexical.md#textformattype) | 表示節點格式的 TextFormatType 或 32 位整數。 |

#### 回傳值

`this`

此 TextNode。
// TODO 0.12 這應該只是 `string`。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:679](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L679)

---

### setMode

▸ **setMode**(`type`): `this`

設置節點的模式。

#### 參數

| 名稱   | 類型                                                 |
| :----- | :--------------------------------------------------- |
| `type` | [`TextModeType`](../modules/lexical.md#textmodetype) |

#### 回傳值

`this`

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:760](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L760)

---

### setStyle

▸ **setStyle**(`style`): `this`

將節點樣式設置為提供的類似 CSSText 的字串。像設置 HTMLElement 的樣式屬性一樣設置此屬性，以應用內聯樣式到底層的 DOM 元素。

#### 參數

| 名稱    | 類型     | 描述                                  |
| :------ | :------- | :------------------------------------ |
| `style` | `string` | 要應用於底層 HTMLElement 的 CSSText。 |

#### 回傳值

`this`

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:712](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L712)

---

### setTextContent

▸ **setTextContent**(`text`): `this`

設置節點的文本內容。

#### 參數

| 名稱   | 類型     | 描述                       |
| :----- | :------- | :------------------------- |
| `text` | `string` | 要設置為節點文本值的字串。 |

#### 回傳值

`this`

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:777](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L777)

---

### spliceText

▸ **spliceText**(`offset`, `delCount`, `newText`, `moveSelection?`): [`TextNode`](lexical.TextNode.md)

在提供的偏移位置將提供的文本插入此 TextNode 中，並刪除指定數量的字符。可以選擇在操作完成後計算新的選擇範圍。

#### 參數

| 名稱             | 類型      | 描述                                     |
| :--------------- | :-------- | :--------------------------------------- |
| `offset`         | `number`  | splice 操作應該開始的偏移位置。          |
| `delCount`       | `number`  | 從偏移位置開始刪除的字符數量。           |
| `newText`        | `string`  | 要插入到 TextNode 中的文本。             |
| `moveSelection?` | `boolean` | 可選，是否將選擇移動到插入子字串的末尾。 |

#### 回傳值

[`TextNode`](lexical.TextNode.md)

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:855](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L855)

---

### splitText

▸ **splitText**(`...splitOffsets`): [`TextNode`](lexical.TextNode.md)[]

在提供的字符偏移位置將此 TextNode 拆分，從拆分形成的新 TextNodes 將插入到編輯器中，替換掉被拆分的節點。

#### 參數

| 名稱              | 類型       | 描述                                             |
| :---------------- | :--------- | :----------------------------------------------- |
| `...splitOffsets` | `number`[] | 要拆分此節點的文本內容字符偏移位置的 rest 參數。 |

#### 回傳值

[`TextNode`](lexical.TextNode.md)[]

包含新創建的 TextNodes 的數組。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:919](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L919)

---

### toggleDirectionless

▸ **toggleDirectionless**(): `this`

切換節點的無方向性詳細信息值。建議使用此函式而不是 setDetail。

#### 回傳值

`this`

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:738](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L738)

---

### toggleFormat

▸ **toggleFormat**(`type`): `this`

如果節點上沒有應用提供的格式，則應用該格式。如果已經應用，則移除該格式。下標和上標格式是互斥的。建議使用此函式來開啟或關閉特定格式。

#### 參數

| 名稱   | 類型                                                     | 描述                      |
| :----- | :------------------------------------------------------- | :------------------------ |
| `type` | [`TextFormatType`](../modules/lexical.md#textformattype) | 要切換的 TextFormatType。 |

#### 回傳值

`this`

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:727](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L727)

---

### toggleUnmergeable

▸ **toggleUnmergeable**(): `this`

切換節點的不可合併詳細信息值。建議使用此函式而不是 setDetail。

#### 回傳值

`this`

此 TextNode。

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:749](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L749)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`, `config`): `boolean`

當節點發生變化時調用，應根據必要的方式更新 DOM，使其與更新期間可能發生的變化保持一致。

返回「true」會使 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生變化，則需要這樣做。

#### 參數

| 名稱       | 類型                                                 |
| :--------- | :--------------------------------------------------- |
| `prevNode` | [`TextNode`](lexical.TextNode.md)                    |
| `dom`      | `HTMLElement`                                        |
| `config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[updateDOM](lexical.LexicalNode.md#updatedom)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:493](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L493)

---

### clone

▸ **clone**(`node`): [`TextNode`](lexical.TextNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState 中（但不將其附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱   | 類型                              |
| :----- | :-------------------------------- |
| `node` | [`TextNode`](lexical.TextNode.md) |

#### 回傳值

[`TextNode`](lexical.TextNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[clone](lexical.LexicalNode.md#clone)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:302](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L302)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且在編輯器中註冊的節點中必須唯一。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getType](lexical.LexicalNode.md#gettype-1)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:298](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L298)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:560](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L560)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`TextNode`](lexical.TextNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現與序列化接口之間的抽象，如果你在節點架構中進行破壞性更改（通過添加或移除屬性），這可能很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                             |
| :--------------- | :--------------------------------------------------------------- |
| `serializedNode` | [`SerializedTextNode`](../modules/lexical.md#serializedtextnode) |

#### 回傳值

[`TextNode`](lexical.TextNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[importJSON](lexical.LexicalNode.md#importjson)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:609](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L609)

---

### transform

▸ **transform**(): `null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在編輯器初始化期間，將返回的函式註冊為節點上的變換。大多數此類用例應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 處理。

實驗性 - 自行風險使用。

#### 回傳值

`null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[transform](lexical.LexicalNode.md#transform)

#### 定義於

[packages/lexical/src/LexicalNode.ts:884](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L884)
