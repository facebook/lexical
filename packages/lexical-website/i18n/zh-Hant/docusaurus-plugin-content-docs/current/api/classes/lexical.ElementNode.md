---
id: 'lexical.ElementNode'
title: 'Class: ElementNode'
custom_edit_url: null
---

[lexical](../modules/lexical.md).ElementNode

## 階層結構

- [`LexicalNode`](lexical.LexicalNode.md)

  ↳ **`ElementNode`**

  ↳↳ [`LinkNode`](lexical_link.LinkNode.md)

  ↳↳ [`OverflowNode`](lexical_overflow.OverflowNode.md)

  ↳↳ [`QuoteNode`](lexical_rich_text.QuoteNode.md)

  ↳↳ [`HeadingNode`](lexical_rich_text.HeadingNode.md)

  ↳↳ [`ArtificialNode__DO_NOT_USE`](lexical.ArtificialNode__DO_NOT_USE.md)

  ↳↳ [`ParagraphNode`](lexical.ParagraphNode.md)

  ↳↳ [`RootNode`](lexical.RootNode.md)

  ↳↳ [`CodeNode`](lexical_code.CodeNode.md)

  ↳↳ [`ListItemNode`](lexical_list.ListItemNode.md)

  ↳↳ [`ListNode`](lexical_list.ListNode.md)

  ↳↳ [`MarkNode`](lexical_mark.MarkNode.md)

  ↳↳ [`TableCellNode`](lexical_table.TableCellNode.md)

  ↳↳ [`TableNode`](lexical_table.TableNode.md)

  ↳↳ [`TableRowNode`](lexical_table.TableRowNode.md)

## 建構子

### constructor

• **new ElementNode**(`key?`): [`ElementNode`](lexical.ElementNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[constructor](lexical.LexicalNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:85](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L85)

## 屬性

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`ElementNode`](lexical.ElementNode.md)\>

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L69)

---

### importDOM

▪ `Static` `Optional` **importDOM**: () => `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

#### 類型聲明

▸ (): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

##### 回傳值

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[importDOM](lexical.LexicalNode.md#importdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:265](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L265)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

在 prevNode 的克隆上執行任何狀態更新，這些更新不會由靜態克隆函式中的建構子調用處理。如果你的克隆中有狀態需要更新，而這些狀態並未直接由建構子處理，建議重寫此函式，但必須在實現中包含對 `super.afterCloneFrom(prevNode)` 的調用。此函式僅供 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過 super 調用使用。

#### 參數

| 名稱       | 類型   |
| :--------- | :----- |
| `prevNode` | `this` |

#### 回傳值

`void`

**`範例`**

```ts
class ClassesTextNode extends TextNode {
  // 未顯示: 靜態 getType, 靜態 importJSON, exportJSON, createDOM, updateDOM
  __classes = new Set<string>();
  static clone(node: ClassesTextNode): ClassesTextNode {
    // 這裡使用繼承的 TextNode 建構子，因此
    // classes 不由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這調用了 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式是私有實現細節，不適合公開 API，因為它不調用 getWritable
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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:373](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L373)

---

### canBeEmpty

▸ **canBeEmpty**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:566](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L566)

---

### canIndent

▸ **canIndent**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:544](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L544)

---

### canInsertTextAfter

▸ **canInsertTextAfter**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:572](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L572)

---

### canInsertTextBefore

▸ **canInsertTextBefore**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:569](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L569)

---

### canMergeWhenEmpty

▸ **canMergeWhenEmpty**(): `boolean`

確定當此節點為空時，是否可以與插入的第一個節點區塊合併。

此函式在 [RangeSelection.insertNodes](lexical.RangeSelection.md#insertnodes) 中被特別調用，用於確定節點插入過程中的合併行為。

#### 回傳值

`boolean`

**`範例`**

```ts
// 在 ListItemNode 或 QuoteNode 實現中：
canMergeWhenEmpty(): true {
 return true;
}
```

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:610](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L610)

---

### clear

▸ **clear**(): `this`

#### 回傳值

`this`

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:552](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L552)

---

### createDOM

▸ **createDOM**(`_config`, `_editor`): `HTMLElement`

在調解過程中被調用，以確定要插入到 DOM 中的 Lexical 節點。

此函式必須返回恰好一個 HTMLElement。不支持嵌套元素。

在更新生命週期的此階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱      | 類型                                                 | 描述                                                 |
| :-------- | :--------------------------------------------------- | :--------------------------------------------------- |
| `_config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 在調解過程中允許訪問像 EditorTheme（以應用類別）等。 |
| `_editor` | [`LexicalEditor`](lexical.LexicalEditor.md)          | 在調解過程中允許訪問編輯器以獲取上下文。             |

#### 回傳值

`HTMLElement`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[createDOM](lexical.LexicalNode.md#createdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:815](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L815)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

創建任何所需父節點的邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，應實現此函式。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[createParentElementNode](lexical.LexicalNode.md#createparentelementnode)

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:555](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L555)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或不同命名空間的 Lexical 編輯器來說很重要，此時主要的傳輸格式是 HTML。如果你因其他原因需要序列化為 HTML，通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 這個函式也很重要。你也可以使用此函式來構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[exportDOM](lexical.LexicalNode.md#exportdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:845](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L845)

---

### exportJSON

▸ **exportJSON**(): [`SerializedElementNode`](../modules/lexical.md#serializedelementnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

控制此節點如何序列化為 JSON。這對於共享相同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。如果你需要將 JSON 序列化到持久存儲中，也很重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedElementNode`](../modules/lexical.md#serializedelementnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[exportJSON](lexical.LexicalNode.md#exportjson)

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:589](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L589)

---

### getAllTextNodes

▸ **getAllTextNodes**(): [`TextNode`](lexical.TextNode.md)[]

#### 回傳值

[`TextNode`](lexical.TextNode.md)[]

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:123](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L123)

---

### getChildrenKeys

▸ **getChildrenKeys**(): `string`[]

#### 回傳值

`string`[]

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:132](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L132)

---

### getChildrenSize

▸ **getChildrenSize**(): `number`

#### 回傳值

`number`

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
| `node` | [`LexicalNode`](lexical.LexicalNode.md) | 要查找共同祖先的另一個節點。 |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getCommonAncestor](lexical.LexicalNode.md#getcommonancestor)

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:195](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L195)

---

### getDirection

▸ **getDirection**(): `null` \| `"ltr"` \| `"rtl"`

#### 回傳值

`null` \| `"ltr"` \| `"rtl"`

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:173](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L173)

---

### getFormat

▸ **getFormat**(): `number`

#### 回傳值

`number`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:107](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L107)

---

### getFormatType

▸ **getFormatType**(): [`ElementFormatType`](../modules/lexical.md#elementformattype)

#### 回傳值

[`ElementFormatType`](../modules/lexical.md#elementformattype)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L111)

---

### getIndent

▸ **getIndent**(): `number`

#### 回傳值

`number`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:119](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L119)

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

返回此節點的鍵值。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getKey](lexical.LexicalNode.md#getkey)

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:184](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L184)

---

### getLatest

▸ **getLatest**(): `this`

返回來自活躍的 EditorState 的節點最新版本。這用於避免從過時的節點引用中獲取值。

#### 回傳值

`this`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getLatest](lexical.LexicalNode.md#getlatest)

#### 定義於

[packages/lexical/src/LexicalNode.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L739)

---

### getNextSibling

▸ **getNextSibling**\<`T`\>(): `null` \| `T`

返回「下一個」兄弟節點，即同一父節點中緊跟在此節點後面的節點。

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

---

### getNextSiblings

▸ **getNextSiblings**\<`T`\>(): `T`[]

返回所有「下一個」兄弟節點，即位於此節點和其父節點最後一個子節點之間的節點（包括最後一個子節點）。

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

返回一個節點列表，這些節點位於此節點和 EditorState 中的目標節點之間。

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

返回此節點的所有祖先節點的鍵值列表，一直到 RootNode。

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

返回此節點的所有祖先節點列表，一直到 RootNode。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParents](lexical.LexicalNode.md#getparents)

#### 定義於

[packages/lexical/src/LexicalNode.ts:463](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L463)

---

### getPreviousSibling

▸ **getPreviousSibling**\<`T`\>(): `null` \| `T`

返回「前一個」兄弟節點，即同一父節點中位於此節點之前的節點。

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

返回所有「前一個」兄弟節點，即位於此節點和其父節點第一個子節點之間的節點（包括第一個子節點）。

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

#### 回傳值

`string`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:115](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L115)

---

### getTextContent

▸ **getTextContent**(): `string`

返回節點的文本內容。對於需要以純文本格式表示的自定義節點（例如，複製 + 粘貼），應重寫此函式。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTextContent](lexical.LexicalNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:266](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L266)

---

### getTextContentSize

▸ **getTextContentSize**(): `number`

返回調用 getTextContent 時產生的字符串的長度。

#### 回傳值

`number`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTextContentSize](lexical.LexicalNode.md#gettextcontentsize)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:283](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L283)

---

### getTopLevelElement

▸ **getTopLevelElement**(): `null` \| [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高層的（非根）祖先節點，如果找不到則返回 null。參見 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 了解哪些元素構成「根」。

#### 回傳值

`null` \| [`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTopLevelElement](lexical.LexicalNode.md#gettoplevelelement)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L62)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高層的（非根）祖先節點，如果找不到則拋出異常。參見 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 了解哪些元素構成「根」。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTopLevelElementOrThrow](lexical.LexicalNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L63)

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

返回節點的可變版本（如果需要），使用 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties)。如果在 Lexical 編輯器 [LexicalEditor.update](lexical.LexicalEditor.md#update) 回調之外調用此函式，將拋出錯誤。

#### 回傳值

`this`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getWritable](lexical.LexicalNode.md#getwritable)

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

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:304](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L304)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 之後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                       |
| :----------------- | :-------------------------------------- | :---------- | :----------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入在此節點之後的節點。                 |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇恢復到適當位置。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[insertAfter](lexical.LexicalNode.md#insertafter)

#### 定義於

[packages/lexical/src/LexicalNode.ts:979](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L979)

---

### insertBefore

▸ **insertBefore**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 前插入一個節點（作為前一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                           |
| :----------------- | :-------------------------------------- | :---------- | :--------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入到此節點前的節點。                       |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇範圍恢復到適當位置。 |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[insertBefore](lexical.LexicalNode.md#insertbefore)

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

#### 返回

`null` \| [`LexicalNode`](lexical.LexicalNode.md)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:538](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L538)

---

### is

▸ **is**(`object`): `boolean`

如果提供的節點與此節點完全相同，則返回 `true`，從 Lexical 的角度看。
始終使用此函式進行等同性比較，而不是參考等於比較。

#### 參數

| 名稱     | 類型                                                             | 描述                     |
| :------- | :--------------------------------------------------------------- | :----------------------- |
| `object` | `undefined` \| `null` \| [`LexicalNode`](lexical.LexicalNode.md) | 要進行等同性比較的節點。 |

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[is](lexical.LexicalNode.md#is)

#### 定義於

[packages/lexical/src/LexicalNode.ts:585](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L585)

---

### isAttached

▸ **isAttached**(): `boolean`

如果此節點與 RootNode 之間存在路徑，則返回 `true`，否則返回 `false`。
這是用來確定節點是否“附加”到 EditorState 上。未附加的節點
不會被調和，最終會被 Lexical 垃圾回收器清理。

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isAttached](lexical.LexicalNode.md#isattached)

#### 定義於

[packages/lexical/src/LexicalNode.ts:303](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L303)

---

### isBefore

▸ **isBefore**(`targetNode`): `boolean`

如果此節點在編輯器狀態中邏輯上位於目標節點之前，則返回 `true`。

#### 參數

| 名稱         | 類型                                    | 描述                           |
| :----------- | :-------------------------------------- | :----------------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 要測試是否在此節點之前的節點。 |

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isBefore](lexical.LexicalNode.md#isbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:597](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L597)

---

### isDirty

▸ **isDirty**(): `boolean`

如果此節點在此次更新循環中被標記為“髒”節點，則返回 `true`。

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isDirty](lexical.LexicalNode.md#isdirty)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:148](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L148)

---

### isEmpty

▸ **isEmpty**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:145](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L145)

---

### isInline

▸ **isInline**(): `boolean`

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isInline](lexical.LexicalNode.md#isinline)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:575](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L575)

---

### isLastChild

▸ **isLastChild**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:153](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L153)

---

### isParentOf

▸ **isParentOf**(`targetNode`): `boolean`

如果此節點是目標節點的父節點，則返回 `true`，否則返回 `false`。

#### 參數

| 名稱         | 類型                                    | 描述           |
| :----------- | :-------------------------------------- | :------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 潛在的子節點。 |

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isParentOf](lexical.LexicalNode.md#isparentof)

#### 定義於

[packages/lexical/src/LexicalNode.ts:636](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L636)

---

### isParentRequired

▸ **isParentRequired**(): `boolean`

此節點是否需要父節點。用於複製和粘貼操作中，
以標準化那些否則會成為孤立節點的節點。例如，沒有
ListNode 父節點的 ListItemNodes 或具有 ParagraphNode 父節點的 TextNodes。

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isParentRequired](lexical.LexicalNode.md#isparentrequired)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1086](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1086)

---

### isSelected

▸ **isSelected**(`selection?`): `boolean`

如果此節點包含在提供的 Selection 中，則返回 `true`，否則返回 `false`。
依賴於 [BaseSelection.getNodes](../interfaces/lexical.BaseSelection.md#getnodes) 中實現的算法來確定
包含哪些內容。

#### 參數

| 名稱         | 類型                                                                | 描述                                 |
| :----------- | :------------------------------------------------------------------ | :----------------------------------- |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 我們要判斷節點是否在其中的選擇範圍。 |

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isSelected](lexical.LexicalNode.md#isselected)

#### 定義於

[packages/lexical/src/LexicalNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L327)

### isShadowRoot

▸ **isShadowRoot**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:582](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L582)

---

### markDirty

▸ **markDirty**(): `void`

標記節點為“髒”，觸發轉換並
強制其在更新循環中進行調和。

#### 返回

`void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[markDirty](lexical.LexicalNode.md#markdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1155)

---

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

從 EditorState 中移除此 LexicalNode。如果節點未被重新插入到其他位置，
Lexical 垃圾回收器最終會清理它。

#### 參數

| 名稱                   | 類型      | 描述                                                                                                                                                                                 |
| :--------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為假，則在移除操作後，如果節點的父節點為空，則父節點也會被移除。這是預設行為，可能會受到其他節點啟發式函式的影響，如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty) |

#### 返回

`void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[remove](lexical.LexicalNode.md#remove)

#### 定義於

[packages/lexical/src/LexicalNode.ts:898](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L898)

---

### replace

▸ **replace**\<`N`\>(`replaceWith`, `includeChildren?`): `N`

用提供的節點替換此 LexicalNode，並可選擇將被替換節點的子節點轉移到替換節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `N`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 描述                                 |
| :----------------- | :-------- | :----------------------------------- |
| `replaceWith`      | `N`       | 要用來替換此節點的節點。             |
| `includeChildren?` | `boolean` | 是否將此節點的子節點轉移到替換節點。 |

#### 返回

`N`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[replace](lexical.LexicalNode.md#replace)

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

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:314](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L314)

---

### selectEnd

▸ **selectEnd**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectEnd](lexical.LexicalNode.md#selectend)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:363](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L363)

---

### selectNext

▸ **selectNext**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇範圍移動到此節點的下一個兄弟節點，並設置指定的偏移量。

#### 參數

| 名稱            | 類型     | 描述                   |
| :-------------- | :------- | :--------------------- |
| `anchorOffset?` | `number` | 選擇範圍的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇範圍的焦點偏移量   |

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectNext](lexical.LexicalNode.md#selectnext)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1134](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1134)

---

### selectPrevious

▸ **selectPrevious**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇範圍移動到此節點的上一個兄弟節點，並設置指定的偏移量。

#### 參數

| 名稱            | 類型     | 描述                   |
| :-------------- | :------- | :--------------------- |
| `anchorOffset?` | `number` | 選擇範圍的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇範圍的焦點偏移量   |

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectPrevious](lexical.LexicalNode.md#selectprevious)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1112](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1112)

---

### selectStart

▸ **selectStart**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectStart](lexical.LexicalNode.md#selectstart)

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:359](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L359)

---

### setDirection

▸ **setDirection**(`direction`): `this`

#### 參數

| 名稱        | 類型                         |
| :---------- | :--------------------------- |
| `direction` | `null` \| `"ltr"` \| `"rtl"` |

#### 返回

`this`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:376](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L376)

---

### setFormat

▸ **setFormat**(`type`): `this`

#### 參數

| 名稱   | 類型                                                           |
| :----- | :------------------------------------------------------------- |
| `type` | [`ElementFormatType`](../modules/lexical.md#elementformattype) |

#### 返回

`this`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:381](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L381)

### setIndent

▸ **setIndent**(`indentLevel`): `this`

#### 參數

| 名稱          | 類型     |
| :------------ | :------- |
| `indentLevel` | `number` |

#### 返回

`this`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:391](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L391)

---

### setStyle

▸ **setStyle**(`style`): `this`

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `style` | `string` |

#### 返回

`this`

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

#### 返回

`this`

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:396](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L396)

---

### updateDOM

▸ **updateDOM**(`_prevNode`, `_dom`, `_config`): `boolean`

當節點更改並需要更新 DOM 以對齊任何可能在更新過程中發生的更改時調用。

返回 "true" 將導致 lexical 解除安裝並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生變化，則需要執行此操作。

#### 參數

| 名稱        | 類型                                                 |
| :---------- | :--------------------------------------------------- |
| `_prevNode` | `unknown`                                            |
| `_dom`      | `HTMLElement`                                        |
| `_config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[updateDOM](lexical.LexicalNode.md#updatedom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:829](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L829)

---

### clone

▸ **clone**(`_data`): [`LexicalNode`](lexical.LexicalNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState（但不會附加到任何地方！）。所有節點都必須實現此函式。

#### 參數

| 名稱    | 類型      |
| :------ | :-------- |
| `_data` | `unknown` |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[clone](lexical.LexicalNode.md#clone)

#### 定義於

[packages/lexical/src/LexicalNode.ts:200](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L200)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點都必須實現此函式，且在編輯器中註冊的節點中必須唯一。

#### 返回

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getType](lexical.LexicalNode.md#gettype-1)

#### 定義於

[packages/lexical/src/LexicalNode.ts:186](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L186)

---

### importJSON

▸ **importJSON**(`_serializedNode`): [`LexicalNode`](lexical.LexicalNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現和序列化接口之間的抽象，這在對節點模式進行重大更改（如添加或移除屬性）時非常重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱              | 類型                                                                   |
| :---------------- | :--------------------------------------------------------------------- |
| `_serializedNode` | [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode) |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[importJSON](lexical.LexicalNode.md#importjson)

#### 定義於

[packages/lexical/src/LexicalNode.ts:868](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L868)

---

### transform

▸ **transform**(): `null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在 Editor 初始化期間，將返回的函式註冊為節點上的轉換。大多數此類用例應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 來處理。

實驗性 - 自行使用風險。

#### 返回

`null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[transform](lexical.LexicalNode.md#transform)

#### 定義於

[packages/lexical/src/LexicalNode.ts:884](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L884)
