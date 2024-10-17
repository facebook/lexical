---
id: 'lexical.ArtificialNode__DO_NOT_USE'
title: 'Class: ArtificialNode__DO_NOT_USE'
custom_edit_url: null
---

[lexical](../modules/lexical.md).ArtificialNode\_\_DO_NOT_USE

## 階層結構

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`ArtificialNode__DO_NOT_USE`**

## 建構函式

### constructor

• **new ArtificialNode\_\_DO_NOT_USE**(`key?`): [`ArtificialNode__DO_NOT_USE`](lexical.ArtificialNode__DO_NOT_USE.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 回傳值

[`ArtificialNode__DO_NOT_USE`](lexical.ArtificialNode__DO_NOT_USE.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:85](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L85)

## 屬性

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`ElementNode`](lexical.ElementNode.md)\>

#### 繼承自

ElementNode.constructor

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L69)

---

### importDOM

▪ `Static` `Optional` **importDOM**: () => `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

#### 類型宣告

▸ (): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

##### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

#### 繼承自

[ElementNode](lexical.ElementNode.md).[importDOM](lexical.ElementNode.md#importdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:265](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L265)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

對 `prevNode` 的克隆進行任何狀態更新，這些更新不會被靜態克隆函式中的建構函式處理。如果你的克隆中有狀態需要更新，而這些狀態並沒有被建構函式直接處理，建議覆寫此函式，但在你的實現中必須包含對 `super.afterCloneFrom(prevNode)` 的調用。此函式僅應由 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過 super 調用來呼叫。

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
    // 在這裡使用了繼承的 TextNode 建構函式，因此
    // classes 不會被此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這會調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式為私有實現細節，不適用於公開 API，因為它不會調用 getWritable
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

[ElementNode](lexical.ElementNode.md).[afterCloneFrom](lexical.ElementNode.md#afterclonefrom)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:96](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L96)

---

### append

▸ **append**(`...nodesToAppend`): `this`

#### 參數

| 名稱               | 類型                                      |
| :----------------- | :---------------------------------------- |
| `...nodesToAppend` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[append](lexical.ElementNode.md#append)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:373](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L373)

---

### canBeEmpty

▸ **canBeEmpty**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[canBeEmpty](lexical.ElementNode.md#canbeempty)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:566](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L566)

---

### canIndent

▸ **canIndent**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[canIndent](lexical.ElementNode.md#canindent)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:544](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L544)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[canInsertTextAfter](lexical.ElementNode.md#caninserttextafter)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:572](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L572)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[canInsertTextBefore](lexical.ElementNode.md#caninserttextbefore)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:569](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L569)

### canMergeWhenEmpty

▸ **canMergeWhenEmpty**(): `boolean`

確定當此節點為空時，是否可以與插入的第一個節點區塊合併。

此函式專門在 [RangeSelection.insertNodes](lexical.RangeSelection.md#insertnodes) 中調用，以確定在插入節點過程中的合併行為。

#### 回傳值

`boolean`

**`範例`**

```ts
// 在 ListItemNode 或 QuoteNode 實現中：
canMergeWhenEmpty(): true {
 return true;
}
```

#### 繼承自

[ElementNode](lexical.ElementNode.md).[canMergeWhenEmpty](lexical.ElementNode.md#canmergewhenempty)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:610](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L610)

---

### clear

▸ **clear**(): `this`

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[clear](lexical.ElementNode.md#clear)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:367](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L367)

---

### collapseAtStart

▸ **collapseAtStart**(`selection`): `boolean`

#### 參數

| 名稱        | 類型                                          |
| :---------- | :-------------------------------------------- |
| `selection` | [`RangeSelection`](lexical.RangeSelection.md) |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:552](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L552)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在重新調解過程中調用以確定要插入到 DOM 中的節點。

此函式必須返回正確的 `HTMLElement`。不支援嵌套元素。

在此更新生命週期階段中，不要嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                         |
| :------- | :--------------------------------------------------- | :----------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在重新調解過程中訪問例如 EditorTheme（應用類別）等內容。 |

#### 回傳值

`HTMLElement`

#### 覆寫自

[ElementNode](lexical.ElementNode.md).[createDOM](lexical.ElementNode.md#createdom)

#### 定義於

[packages/lexical/src/nodes/ArtificialNode.ts:18](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/ArtificialNode.ts#L18)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

創建任何所需父元素的邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，應實現此函式。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[createParentElementNode](lexical.ElementNode.md#createparentelementnode)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1094](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1094)

---

### excludeFromCopy

▸ **excludeFromCopy**(`destination?`): `boolean`

#### 參數

| 名稱           | 類型                  |
| :------------- | :-------------------- |
| `destination?` | `"clone"` \| `"html"` |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[excludeFromCopy](lexical.ElementNode.md#excludefromcopy)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:555](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L555)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制如何將此節點序列化為 HTML。這對於 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或不同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。在這種情況下，主要的轉移格式是 HTML。如果你正在通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 將其序列化為 HTML，這也很重要。你也可以使用此函式來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[exportDOM](lexical.ElementNode.md#exportdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:845](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L845)

---

### exportJSON

▸ **exportJSON**(): [`SerializedElementNode`](../modules/lexical.md#serializedelementnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

控制如何將此節點序列化為 JSON。這對於共享相同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。如果你要將其序列化為 JSON 以便在某個地方進行持久存儲，這也很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedElementNode`](../modules/lexical.md#serializedelementnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

#### 繼承自

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:527](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L527)

---

### extractWithChild

▸ **extractWithChild**(`child`, `selection`, `destination`): `boolean`

#### 參數

| 名稱          | 類型                                                                |
| :------------ | :------------------------------------------------------------------ |
| `child`       | [`LexicalNode`](lexical.LexicalNode.md)                             |
| `selection`   | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |
| `destination` | `"clone"` \| `"html"`                                               |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[extractWithChild](lexical.ElementNode.md#extractwithchild)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:589](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L589)

---

### getAllTextNodes

▸ **getAllTextNodes**(): [`TextNode`](lexical.TextNode.md)[]

#### 回傳值

[`TextNode`](lexical.TextNode.md)[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getAllTextNodes](lexical.ElementNode.md#getalltextnodes)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:158](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L158)

---

### getChildAtIndex

▸ **getChildAtIndex**\<`T`\>(`index`): `null` \| `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `index` | `number` |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getChildAtIndex](lexical.ElementNode.md#getchildatindex)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:239](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L239)

---

### getChildren

▸ **getChildren**\<`T`\>(): `T`[]

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getChildren](lexical.ElementNode.md#getchildren)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:123](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L123)

---

### getChildrenKeys

▸ **getChildrenKeys**(): `string`[]

#### 回傳值

`string`[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getChildrenKeys](lexical.ElementNode.md#getchildrenkeys)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:132](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L132)

---

### getChildrenSize

▸ **getChildrenSize**(): `number`

#### 回傳值

`number`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getChildrenSize](lexical.ElementNode.md#getchildrensize)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:141](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L141)

---

### getCommonAncestor

▸ **getCommonAncestor**\<`T`\>(`node`): `null` \| `T`

返回此節點和提供的節點之間最近的共同祖先，如果找不到則返回 null。

#### 類型參數

| 名稱 | 類型                                                                                   |
| :--- | :------------------------------------------------------------------------------------- |
| `T`  | 擴展 [`ElementNode`](lexical.ElementNode.md) = [`ElementNode`](lexical.ElementNode.md) |

#### 參數

| 名稱   | 類型                                    | 描述                         |
| :----- | :-------------------------------------- | :--------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) | 要找到共同祖先的另一個節點。 |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getCommonAncestor](lexical.ElementNode.md#getcommonancestor)

#### 定義於

[packages/lexical/src/LexicalNode.ts:553](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L553)

---

### getDescendantByIndex

▸ **getDescendantByIndex**\<`T`\>(`index`): `null` \| `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `index` | `number` |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getDescendantByIndex](lexical.ElementNode.md#getdescendantbyindex)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:195](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L195)

---

### getDirection

▸ **getDirection**(): `null` \| `"ltr"` \| `"rtl"`

#### 回傳值

`null` \| `"ltr"` \| `"rtl"`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getDirection](lexical.ElementNode.md#getdirection)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:300](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L300)

---

### getFirstChild

▸ **getFirstChild**\<`T`\>(): `null` \| `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getFirstChild](lexical.ElementNode.md#getfirstchild)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:215](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L215)

---

### getFirstChildOrThrow

▸ **getFirstChildOrThrow**\<`T`\>(): `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getFirstChildOrThrow](lexical.ElementNode.md#getfirstchildorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:220](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L220)

---

### getFirstDescendant

▸ **getFirstDescendant**\<`T`\>(): `null` \| `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getFirstDescendant](lexical.ElementNode.md#getfirstdescendant)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:173](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L173)

---

### getFormat

▸ **getFormat**(): `number`

#### 回傳值

`number`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getFormat](lexical.ElementNode.md#getformat)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:107](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L107)

### getFormatType

▸ **getFormatType**(): [`ElementFormatType`](../modules/lexical.md#elementformattype)

#### 回傳值

[`ElementFormatType`](../modules/lexical.md#elementformattype)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getFormatType](lexical.ElementNode.md#getformattype)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L111)

---

### getIndent

▸ **getIndent**(): `number`

#### 回傳值

`number`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getIndent](lexical.ElementNode.md#getindent)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:119](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L119)

---

### getIndexWithinParent

▸ **getIndexWithinParent**(): `number`

返回此節點在父節點中的零基索引。

#### 回傳值

`number`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getIndexWithinParent](lexical.ElementNode.md#getindexwithinparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:381](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L381)

---

### getKey

▸ **getKey**(): `string`

返回此節點的鍵。

#### 回傳值

`string`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getKey](lexical.ElementNode.md#getkey)

#### 定義於

[packages/lexical/src/LexicalNode.ts:373](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L373)

---

### getLastChild

▸ **getLastChild**\<`T`\>(): `null` \| `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getLastChild](lexical.ElementNode.md#getlastchild)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:227](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L227)

---

### getLastChildOrThrow

▸ **getLastChildOrThrow**\<`T`\>(): `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getLastChildOrThrow](lexical.ElementNode.md#getlastchildorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:232](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L232)

---

### getLastDescendant

▸ **getLastDescendant**\<`T`\>(): `null` \| `T`

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getLastDescendant](lexical.ElementNode.md#getlastdescendant)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:184](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L184)

---

### getLatest

▸ **getLatest**(): `this`

返回來自當前 EditorState 的節點的最新版本。這樣可以避免從過時的節點引用中獲取值。

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getLatest](lexical.ElementNode.md#getlatest)

#### 定義於

[packages/lexical/src/LexicalNode.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L739)

---

### getNextSibling

▸ **getNextSibling**\<`T`\>(): `null` \| `T`

返回「下一個」兄弟節點，即在相同父節點中，該節點後面的節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getNextSibling](lexical.ElementNode.md#getnextsibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:526](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L526)

---

### getNextSiblings

▸ **getNextSiblings**\<`T`\>(): `T`[]

返回所有「下一個」兄弟節點，即該節點到其父節點的最後一個子節點之間的所有節點（包括最後一個子節點）。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getNextSiblings](lexical.ElementNode.md#getnextsiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:537](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L537)

---

### getNodesBetween

▸ **getNodesBetween**(`targetNode`): [`LexicalNode`](lexical.LexicalNode.md)[]

返回一個節點列表，這些節點位於此節點和目標節點之間的 EditorState 中。

#### 參數

| 名稱         | 類型                                    | 描述                   |
| :----------- | :-------------------------------------- | :--------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 標記範圍另一端的節點。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getNodesBetween](lexical.ElementNode.md#getnodesbetween)

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

[ElementNode](lexical.ElementNode.md).[getParent](lexical.ElementNode.md#getparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L401)

---

### getParentKeys

▸ **getParentKeys**(): `string`[]

返回此節點的所有祖先節點的鍵列表，直到 RootNode。

#### 回傳值

`string`[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getParentKeys](lexical.ElementNode.md#getparentkeys)

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

[ElementNode](lexical.ElementNode.md).[getParentOrThrow](lexical.ElementNode.md#getparentorthrow)

#### 定義於

[packages/lexical/src/LexicalNode.ts:412](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L412)

---

### getParents

▸ **getParents**(): [`ElementNode`](lexical.ElementNode.md)[]

返回此節點的所有祖先節點列表，直到 RootNode。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getParents](lexical.ElementNode.md#getparents)

#### 定義於

[packages/lexical/src/LexicalNode.ts:463](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L463)

---

### getPreviousSibling

▸ **getPreviousSibling**\<`T`\>(): `null` \| `T`

返回「前一個」兄弟節點，即在相同父節點中，此節點之前的節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getPreviousSibling](lexical.ElementNode.md#getprevioussibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:493](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L493)

---

### getPreviousSiblings

▸ **getPreviousSiblings**\<`T`\>(): `T`[]

返回「前一個」兄弟節點，即此節點和其父節點的第一個子節點之間的所有節點（包括第一個子節點）。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getPreviousSiblings](lexical.ElementNode.md#getprevioussiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:504](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L504)

---

### getStyle

▸ **getStyle**(): `string`

#### 回傳值

`string`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getStyle](lexical.ElementNode.md#getstyle)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:115](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L115)

---

### getTextContent

▸ **getTextContent**(): `string`

返回節點的文本內容。對於應該以純文本格式表示的自定義節點（例如用於複製和粘貼），應覆蓋此函式。

#### 回傳值

`string`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getTextContent](lexical.ElementNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:266](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L266)

---

### getTextContentSize

▸ **getTextContentSize**(): `number`

返回通過調用 `getTextContent` 函式獲得的字符串的長度。

#### 回傳值

`number`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getTextContentSize](lexical.ElementNode.md#gettextcontentsize)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:283](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L283)

---

### getTopLevelElement

▸ **getTopLevelElement**(): `null` \| [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高層（非根）祖先節點，如果找不到則返回 null。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 以獲取更多有關哪些元素構成「根」的信息。

#### 回傳值

`null` \| [`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getTopLevelElement](lexical.ElementNode.md#gettoplevelelement)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L62)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高層（非根）祖先節點，如果找不到則拋出異常。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 以獲取更多有關哪些元素構成「根」的信息。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getTopLevelElementOrThrow](lexical.ElementNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L63)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。

#### 回傳值

`string`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype)

#### 定義於

[packages/lexical/src/LexicalNode.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L286)

---

### getWritable

▸ **getWritable**(): `this`

返回節點的可變版本，如有必要可使用 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties)。如果在 Lexical 編輯器 [LexicalEditor.update](lexical.LexicalEditor.md#update) 回調外調用此函式，將會拋出錯誤。

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[getWritable](lexical.ElementNode.md#getwritable)

#### 定義於

[packages/lexical/src/LexicalNode.ts:756](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L756)

---

### hasFormat

▸ **hasFormat**(`type`): `boolean`

#### 參數

| 名稱   | 類型                                                           |
| :----- | :------------------------------------------------------------- |
| `type` | [`ElementFormatType`](../modules/lexical.md#elementformattype) |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[hasFormat](lexical.ElementNode.md#hasformat)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:304](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L304)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要在此節點後插入的節點。                     |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇恢復到適當的位置。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[insertAfter](lexical.ElementNode.md#insertafter)

#### 定義於

[packages/lexical/src/LexicalNode.ts:979](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L979)

---

### insertBefore

▸ **insertBefore**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 前插入一個節點（作為上一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要在此節點前插入的節點。                     |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇恢復到適當的位置。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[insertBefore](lexical.ElementNode.md#insertbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1046](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1046)

---

### insertNewAfter

▸ **insertNewAfter**(`selection`, `restoreSelection?`): `null` \| [`LexicalNode`](lexical.LexicalNode.md)

#### 參數

| 名稱                | 類型                                          |
| :------------------ | :-------------------------------------------- |
| `selection`         | [`RangeSelection`](lexical.RangeSelection.md) |
| `restoreSelection?` | `boolean`                                     |

#### 回傳值

`null` \| [`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[insertNewAfter](lexical.ElementNode.md#insertnewafter)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:538](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L538)

---

### is

▸ **is**(`object`): `boolean`

如果提供的節點與此節點在 Lexical 的視角下完全相同，則返回 true。始終使用此函式來檢查等同性，而不是引用等同性。

#### 參數

| 名稱     | 類型                                                             | 描述                     |
| :------- | :--------------------------------------------------------------- | :----------------------- |
| `object` | `undefined` \| `null` \| [`LexicalNode`](lexical.LexicalNode.md) | 要進行等同性比較的節點。 |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[is](lexical.ElementNode.md#is)

#### 定義於

[packages/lexical/src/LexicalNode.ts:585](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L585)

---

### isAttached

▸ **isAttached**(): `boolean`

如果存在從此節點到 RootNode 的路徑，則返回 true，否則返回 false。這是一種確定節點是否「附加」到 EditorState 的函式。未附加的節點不會被重新合併，最終會被 Lexical 垃圾回收器清理。

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isAttached](lexical.ElementNode.md#isattached)

#### 定義於

[packages/lexical/src/LexicalNode.ts:303](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L303)

---

### isBefore

▸ **isBefore**(`targetNode`): `boolean`

如果此節點在編輯器狀態中邏輯上位於目標節點之前，則返回 true。

#### 參數

| 名稱         | 類型                                    | 描述                           |
| :----------- | :-------------------------------------- | :----------------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 要測試是否在此節點之後的節點。 |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isBefore](lexical.ElementNode.md#isbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:597](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L597)

---

### isDirty

▸ **isDirty**(): `boolean`

如果此節點在此次更新週期中被標記為「髒」，則返回 true。

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isDirty](lexical.ElementNode.md#isdirty)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:148](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L148)

---

### isEmpty

▸ **isEmpty**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isEmpty](lexical.ElementNode.md#isempty)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:145](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L145)

---

### isInline

▸ **isInline**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isInline](lexical.ElementNode.md#isinline)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:575](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L575)

---

### isLastChild

▸ **isLastChild**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isLastChild](lexical.ElementNode.md#islastchild)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:153](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L153)

---

### isParentOf

▸ **isParentOf**(`targetNode`): `boolean`

如果此節點是目標節點的父節點，則返回 true，否則返回 false。

#### 參數

| 名稱         | 類型                                    | 描述           |
| :----------- | :-------------------------------------- | :------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 潛在的子節點。 |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isParentOf](lexical.ElementNode.md#isparentof)

#### 定義於

[packages/lexical/src/LexicalNode.ts:636](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L636)

---

### isParentRequired

▸ **isParentRequired**(): `boolean`

此節點是否需要父節點。用於複製和粘貼操作，以標準化那些否則會變成孤立的節點。例如，沒有 ListNode 父節點的 ListItemNodes 或有 ParagraphNode 父節點的 TextNodes。

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isParentRequired](lexical.ElementNode.md#isparentrequired)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1086](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1086)

---

### isSelected

▸ **isSelected**(`selection?`): `boolean`

如果此節點包含在提供的選擇範圍內，則返回 true，否則返回 false。依賴於 [BaseSelection.getNodes](../interfaces/lexical.BaseSelection.md#getnodes) 實現的算法來確定包含的內容。

#### 參數

| 名稱         | 類型                                                                | 描述                                   |
| :----------- | :------------------------------------------------------------------ | :------------------------------------- |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 我們想要確定節點是否在其中的選擇範圍。 |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isSelected](lexical.ElementNode.md#isselected)

#### 定義於

[packages/lexical/src/LexicalNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L327)

---

### isShadowRoot

▸ **isShadowRoot**(): `boolean`

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[isShadowRoot](lexical.ElementNode.md#isshadowroot)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:582](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L582)

---

### markDirty

▸ **markDirty**(): `void`

將節點標記為「髒」，觸發變換並強制在更新週期內重新合併。

#### 回傳值

`void`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[markDirty](lexical.ElementNode.md#markdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1155)

---

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

從 EditorState 中移除此 LexicalNode。如果節點未重新插入到其他位置，Lexical 垃圾回收器最終會清理它。

#### 參數

| 名稱                   | 類型      | 描述                                                                                                                                                                                       |
| :--------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為 falsy，則在移除操作後，如果節點的父節點為空，將會移除該父節點。這是預設行為，但會受到其他節點啟發式算法（例如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty)）的影響。 |

#### 回傳值

`void`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[remove](lexical.ElementNode.md#remove)

#### 定義於

[packages/lexical/src/LexicalNode.ts:898](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L898)

---

### replace

▸ **replace**\<`N`\>(`replaceWith`, `includeChildren?`): `N`

用提供的節點替換此 LexicalNode，並可選擇將被替換節點的子節點轉移到替換節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `N`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 描述                                 |
| :----------------- | :-------- | :----------------------------------- |
| `replaceWith`      | `N`       | 要替換此節點的節點。                 |
| `includeChildren?` | `boolean` | 是否將此節點的子節點轉移到替換節點。 |

#### 回傳值

`N`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[replace](lexical.ElementNode.md#replace)

#### 定義於

[packages/lexical/src/LexicalNode.ts:909](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L909)

---

### select

▸ **select**(`_anchorOffset?`, `_focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

#### 參數

| 名稱             | 類型     |
| :--------------- | :------- |
| `_anchorOffset?` | `number` |
| `_focusOffset?`  | `number` |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[select](lexical.ElementNode.md#select)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:314](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L314)

---

### selectEnd

▸ **selectEnd**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[selectEnd](lexical.ElementNode.md#selectend)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:363](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L363)

---

### selectNext

▸ **selectNext**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇範圍移至此節點的下一個兄弟節點，並設置指定的偏移量。

#### 參數

| 名稱            | 類型     | 描述                   |
| :-------------- | :------- | :--------------------- |
| `anchorOffset?` | `number` | 選擇範圍的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇範圍的焦點偏移量。 |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[selectNext](lexical.ElementNode.md#selectnext)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1134](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1134)

---

### selectPrevious

▸ **selectPrevious**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇範圍移至此節點的前一個兄弟節點，並設置指定的偏移量。

#### 參數

| 名稱            | 類型     | 描述                   |
| :-------------- | :------- | :--------------------- |
| `anchorOffset?` | `number` | 選擇範圍的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇範圍的焦點偏移量。 |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[selectPrevious](lexical.ElementNode.md#selectprevious)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1112](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1112)

---

### selectStart

▸ **selectStart**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[selectStart](lexical.ElementNode.md#selectstart)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:359](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L359)

---

### setDirection

▸ **setDirection**(`direction`): `this`

#### 參數

| 名稱        | 類型                         |
| :---------- | :--------------------------- |
| `direction` | `null` \| `"ltr"` \| `"rtl"` |

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[setDirection](lexical.ElementNode.md#setdirection)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:376](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L376)

---

### setFormat

▸ **setFormat**(`type`): `this`

#### 參數

| 名稱   | 類型                                                           |
| :----- | :------------------------------------------------------------- |
| `type` | [`ElementFormatType`](../modules/lexical.md#elementformattype) |

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[setFormat](lexical.ElementNode.md#setformat)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:381](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L381)

---

### setIndent

▸ **setIndent**(`indentLevel`): `this`

#### 參數

| 名稱          | 類型     |
| :------------ | :------- |
| `indentLevel` | `number` |

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[setIndent](lexical.ElementNode.md#setindent)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:391](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L391)

---

### setStyle

▸ **setStyle**(`style`): `this`

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `style` | `string` |

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[setStyle](lexical.ElementNode.md#setstyle)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:386](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L386)

---

### splice

▸ **splice**(`start`, `deleteCount`, `nodesToInsert`): `this`

#### 參數

| 名稱            | 類型                                      |
| :-------------- | :---------------------------------------- |
| `start`         | `number`                                  |
| `deleteCount`   | `number`                                  |
| `nodesToInsert` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`this`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[splice](lexical.ElementNode.md#splice)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:396](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L396)

---

### updateDOM

▸ **updateDOM**(`_prevNode`, `_dom`, `_config`): `boolean`

當節點發生變化並且需要更新 DOM 以使其與更新期間可能發生的變化對齊時，會調用此函式。

如果返回「true」，則會導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生變化，你需要這樣做。

#### 參數

| 名稱        | 類型                                                 | 描述         |
| :---------- | :--------------------------------------------------- | :----------- |
| `_prevNode` | `unknown`                                            | 前一節點。   |
| `_dom`      | `HTMLElement`                                        | DOM 元素。   |
| `_config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) | 編輯器配置。 |

#### 回傳值

`boolean`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:829](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L829)

---

### clone

▸ **clone**(`_data`): [`LexicalNode`](lexical.LexicalNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState 中（但不將其附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱    | 類型      | 描述             |
| :------ | :-------- | :--------------- |
| `_data` | `unknown` | 需要克隆的數據。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical/src/LexicalNode.ts:200](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L200)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須實現此函式，並且在編輯器中註冊的節點類型必須唯一。

#### 回傳值

`string`

#### 重寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical/src/nodes/ArtificialNode.ts:14](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/ArtificialNode.ts#L14)

---

### importJSON

▸ **importJSON**(`_serializedNode`): [`LexicalNode`](lexical.LexicalNode.md)

控制如何從 JSON 反序列化此節點。這通常是模板代碼，但提供了節點實現和序列化接口之間的抽象，如果你在節點架構中進行重大更改（通過添加或移除屬性），這可能非常重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱              | 類型                                                                   | 描述           |
| :---------------- | :--------------------------------------------------------------------- | :------------- |
| `_serializedNode` | [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode) | 序列化的節點。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical/src/LexicalNode.ts:868](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L868)

---

### transform

▸ **transform**(): `null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在編輯器初始化期間將返回的函式註冊為節點的變換。大多數此類用例應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 來處理。

實驗性功能 - 使用需謹慎。

#### 回傳值

`null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

#### 繼承自

[ElementNode](lexical.ElementNode.md).[transform](lexical.ElementNode.md#transform)

#### 定義於

[packages/lexical/src/LexicalNode.ts:884](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L884)
