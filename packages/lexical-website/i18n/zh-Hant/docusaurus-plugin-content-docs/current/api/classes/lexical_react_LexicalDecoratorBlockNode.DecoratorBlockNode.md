---
id: 'lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode'
title: 'Class: DecoratorBlockNode'
custom_edit_url: null
---

[@lexical/react/LexicalDecoratorBlockNode](../modules/lexical_react_LexicalDecoratorBlockNode.md).DecoratorBlockNode

## 層次結構

- [`DecoratorNode`](lexical.DecoratorNode.md)\<`JSX.Element`\>

  ↳ **`DecoratorBlockNode`**

## 建構函式

### 建構函式

• **new DecoratorBlockNode**(`format?`, `key?`): [`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

#### 參數

| 名稱      | 類型                                                           |
| :-------- | :------------------------------------------------------------- |
| `format?` | [`ElementFormatType`](../modules/lexical.md#elementformattype) |
| `key?`    | `string`                                                       |

#### 返回

[`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

#### 覆寫

[DecoratorNode](lexical.DecoratorNode.md).[constructor](lexical.DecoratorNode.md#constructor)

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:29](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L29)

## 屬性

### \_\_format

• **\_\_format**: [`ElementFormatType`](../modules/lexical.md#elementformattype)

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L27)

---

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<(`key?`: `string`) => [`DecoratorNode`](lexical.DecoratorNode.md)\<`Element`\>\>

#### 繼承自

DecoratorNode.constructor

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L27)

---

### importDOM

▪ `靜態` `選擇性` **importDOM**: () => `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

#### 類型宣告

▸ (): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

##### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)\<`any`\>

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[importDOM](lexical.DecoratorNode.md#importdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:265](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L265)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

對 `prevNode` 的克隆進行任何狀態更新，這些更新尚未由靜態克隆函式中的建構函式調用處理。如果你的克隆需要更新狀態，而該狀態並未由建構函式直接處理，建議覆寫此函式，但實現中必須包含對 `super.afterCloneFrom(prevNode)` 的調用。此函式僅供 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過超類調用使用。

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
    // 此處使用繼承的 TextNode 建構函式，因此
    // classes 不會由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這會調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式是私有實現細節，不適合用於公共 API，因為它不調用 getWritable
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

[DecoratorNode](lexical.DecoratorNode.md).[afterCloneFrom](lexical.DecoratorNode.md#afterclonefrom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:258](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L258)

---

### canIndent

▸ **canIndent**(): `false`

#### 返回

`false`

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L42)

---

### createDOM

▸ **createDOM**(): `HTMLElement`

在調解過程中調用，以確定要插入到此 Lexical 節點的 DOM 中的節點。

此函式必須返回正好一個 `HTMLElement`。不支持嵌套元素。

在更新生命週期的此階段不要嘗試更新 Lexical EditorState。

#### 返回

`HTMLElement`

#### 覆寫

[DecoratorNode](lexical.DecoratorNode.md).[createDOM](lexical.DecoratorNode.md#createdom)

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L46)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

創建任何所需的父節點的邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，應該實現此函式。

#### 返回

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[createParentElementNode](lexical.DecoratorNode.md#createparentelementnode)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1094](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1094)

---

### decorate

▸ **decorate**(`editor`, `config`): `Element`

返回的值會被添加到 LexicalEditor.\_decorators 中。

#### 參數

| 名稱     | 類型                                                 |
| :------- | :--------------------------------------------------- |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md)          |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 返回

`Element`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[decorate](lexical.DecoratorNode.md#decorate)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L35)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或不同命名空間的 Lexical 編輯器之間的複製和粘貼是很重要的，因為主要的傳輸格式是 HTML。如果你有其他原因需要將內容序列化為 HTML（例如通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes)），這也很重要。你也可以使用此函式來構建你自己的 HTML 渲染器。

####

參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 返回

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[exportDOM](lexical.DecoratorNode.md#exportdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:845](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L845)

---

### exportJSON

▸ **exportJSON**(): [`SerializedDecoratorBlockNode`](../modules/lexical_react_LexicalDecoratorBlockNode.md#serializeddecoratorblocknode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間的複製和貼上非常重要。如果你需要將內容序列化為 JSON 以便在其他地方進行持久儲存，這也同樣重要。參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedDecoratorBlockNode`](../modules/lexical_react_LexicalDecoratorBlockNode.md#serializeddecoratorblocknode)

#### 覆寫

[DecoratorNode](lexical.DecoratorNode.md).[exportJSON](lexical.DecoratorNode.md#exportjson)

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:34](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L34)

---

### getCommonAncestor

▸ **getCommonAncestor**\<`T`\>(`node`): `null` \| `T`

返回此節點和提供的節點之間最近的共同祖先，若找不到則返回 null。

#### 類型參數

| 名稱 | 類型                                                                                      |
| :--- | :---------------------------------------------------------------------------------------- |
| `T`  | extends [`ElementNode`](lexical.ElementNode.md) = [`ElementNode`](lexical.ElementNode.md) |

#### 參數

| 名稱   | 類型                                    | 描述                           |
| :----- | :-------------------------------------- | :----------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) | 需要找到共同祖先的另一個節點。 |

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getCommonAncestor](lexical.DecoratorNode.md#getcommonancestor)

#### 定義於

[packages/lexical/src/LexicalNode.ts:553](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L553)

---

### getIndexWithinParent

▸ **getIndexWithinParent**(): `number`

返回此節點在父節點中的零基索引。

#### 返回

`number`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getIndexWithinParent](lexical.DecoratorNode.md#getindexwithinparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:381](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L381)

---

### getKey

▸ **getKey**(): `string`

返回此節點的鍵值。

#### 返回

`string`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getKey](lexical.DecoratorNode.md#getkey)

#### 定義於

[packages/lexical/src/LexicalNode.ts:373](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L373)

---

### getLatest

▸ **getLatest**(): `this`

返回來自活動的 EditorState 的最新版本節點。這是為了避免從過時的節點引用中獲取值。

#### 返回

`this`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getLatest](lexical.DecoratorNode.md#getlatest)

#### 定義於

[packages/lexical/src/LexicalNode.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L739)

---

### getNextSibling

▸ **getNextSibling**\<`T`\>(): `null` \| `T`

返回“下一個”兄弟節點，即在相同父節點中，緊接在此節點之後的節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getNextSibling](lexical.DecoratorNode.md#getnextsibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:526](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L526)

---

### getNextSiblings

▸ **getNextSiblings**\<`T`\>(): `T`[]

返回所有“下一個”兄弟節點，即在此節點和其父節點的最後一個子節點之間的所有節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`T`[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getNextSiblings](lexical.DecoratorNode.md#getnextsiblings)

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

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getNodesBetween](lexical.DecoratorNode.md#getnodesbetween)

#### 定義於

[packages/lexical/src/LexicalNode.ts:658](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L658)

---

### getParent

▸ **getParent**\<`T`\>(): `null` \| `T`

返回此節點的父節點，如果找不到則返回 null。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`ElementNode`](lexical.ElementNode.md) |

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParent](lexical.DecoratorNode.md#getparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L401)

---

### getParentKeys

▸ **getParentKeys**(): `string`[]

返回此節點每個祖先的鍵值列表，一直到 RootNode。

#### 返回

`string`[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParentKeys](lexical.DecoratorNode.md#getparentkeys)

#### 定義於

[packages/lexical/src/LexicalNode.ts:478](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L478)

### getParentOrThrow

▸ **getParentOrThrow**\<`T`\>(): `T`

返回此節點的父節點，如果找不到則拋出錯誤。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`ElementNode`](lexical.ElementNode.md) |

#### 返回

`T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParentOrThrow](lexical.DecoratorNode.md#getparentorthrow)

#### 定義於

[packages/lexical/src/LexicalNode.ts:412](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L412)

---

### getParents

▸ **getParents**(): [`ElementNode`](lexical.ElementNode.md)[]

返回此節點每個祖先的列表，一直到 RootNode。

#### 返回

[`ElementNode`](lexical.ElementNode.md)[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParents](lexical.DecoratorNode.md#getparents)

#### 定義於

[packages/lexical/src/LexicalNode.ts:463](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L463)

---

### getPreviousSibling

▸ **getPreviousSibling**\<`T`\>(): `null` \| `T`

返回“前一個”兄弟節點，即在相同父節點中，位於此節點之前的節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getPreviousSibling](lexical.DecoratorNode.md#getprevioussibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:493](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L493)

---

### getPreviousSiblings

▸ **getPreviousSiblings**\<`T`\>(): `T`[]

返回“前一個”兄弟節點，即在此節點和其父節點的第一個子節點之間的所有節點（包括）。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`T`[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getPreviousSiblings](lexical.DecoratorNode.md#getprevioussiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:504](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L504)

---

### getTextContent

▸ **getTextContent**(): `string`

返回節點的文本內容。對於應該以純文本格式表示的自定義節點（例如，用於複製和粘貼），請覆寫此函式。

#### 返回

`string`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTextContent](lexical.DecoratorNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:789](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L789)

---

### getTextContentSize

▸ **getTextContentSize**(): `number`

返回調用 getTextContent 函式後產生的字串長度。

#### 返回

`number`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTextContentSize](lexical.DecoratorNode.md#gettextcontentsize)

#### 定義於

[packages/lexical/src/LexicalNode.ts:797](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L797)

---

### getTopLevelElement

▸ **getTopLevelElement**(): `null` \| [`ElementNode`](lexical.ElementNode.md) \| [`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

返回 EditorState 樹中最高層的非根祖先節點，如果找不到則返回 null。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 以了解哪些元素構成“根”。

#### 返回

`null` \| [`ElementNode`](lexical.ElementNode.md) \| [`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTopLevelElement](lexical.DecoratorNode.md#gettoplevelelement)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:20](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L20)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): [`ElementNode`](lexical.ElementNode.md) \| [`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

返回 EditorState 樹中最高層的非根祖先節點，如果找不到則拋出錯誤。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 以了解哪些元素構成“根”。

#### 返回

[`ElementNode`](lexical.ElementNode.md) \| [`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTopLevelElementOrThrow](lexical.DecoratorNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:21](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L21)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。

#### 返回

`string`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getType](lexical.DecoratorNode.md#gettype)

#### 定義於

[packages/lexical/src/LexicalNode.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L286)

---

### getWritable

▸ **getWritable**(): `this`

返回節點的可變版本，如果需要，會使用 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties)。如果在 Lexical 編輯器 [LexicalEditor.update](lexical.LexicalEditor.md#update) 回調之外調用，將拋出錯誤。

#### 返回

`this`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getWritable](lexical.DecoratorNode.md#getwritable)

#### 定義於

[packages/lexical/src/LexicalNode.ts:756](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L756)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 之後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入的節點。                               |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇恢復到適當的位置。 |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[insertAfter](lexical.DecoratorNode.md#insertafter)

#### 定義於

[packages/lexical/src/LexicalNode.ts:979](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L979)

---

### insertBefore

▸ **insertBefore**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 之前插入一個節點（作為前一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入的節點。                               |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇恢復到適當的位置。 |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[insertBefore](lexical.DecoratorNode.md#insertbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1046](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1046)

---

### is

▸ **is**(`object`): `boolean`

如果提供的節點與此節點完全相同（從 Lexical 的角度來看），則返回 true。始終使用此函式而不是引用相等性。

#### 參數

| 名稱     | 類型                                                             | 描述                     |
| :------- | :--------------------------------------------------------------- | :----------------------- |
| `object` | `undefined` \| `null` \| [`LexicalNode`](lexical.LexicalNode.md) | 要進行相等性比較的節點。 |

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[is](lexical.DecoratorNode.md#is)

#### 定義於

[packages/lexical/src/LexicalNode.ts:585](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L585)

---

### isAttached

▸ **isAttached**(): `boolean`

如果存在從此節點到 RootNode 的路徑則返回 true，否則返回 false。這是一種確定節點是否“附加”到 EditorState 的函式。未附加的節點不會被合併，最終會被 Lexical 的垃圾回收清理。

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isAttached](lexical.DecoratorNode.md#isattached)

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

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isBefore](lexical.DecoratorNode.md#isbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:597](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L597)

---

### isDirty

▸ **isDirty**(): `boolean`

如果此節點在此更新周期中被標記為“髒”，則返回 true。

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isDirty](lexical.DecoratorNode.md#isdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:728](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L728)

---

### isInline

▸ **isInline**(): `false`

#### 返回

`false`

#### 覆寫

[DecoratorNode](lexical.DecoratorNode.md).[isInline](lexical.DecoratorNode.md#isinline)

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:59](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L59)

---

### isIsolated

▸ **isIsolated**(): `boolean`

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isIsolated](lexical.DecoratorNode.md#isisolated)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L39)

---

### isKeyboardSelectable

▸ **isKeyboardSelectable**(): `boolean`

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isKeyboardSelectable](lexical.DecoratorNode.md#iskeyboardselectable)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L47)

---

### isParentOf

▸ **isParentOf**(`targetNode`): `boolean`

如果此節點是目標節點的父節點，則返回 true，否則返回 false。

#### 參數

| 名稱         | 類型                                    | 描述           |
| :----------- | :-------------------------------------- | :------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 可能的子節點。 |

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isParentOf](lexical.DecoratorNode.md#isparentof)

#### 定義於

[packages/lexical/src/LexicalNode.ts:636](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L636)

---

### isParentRequired

▸ **isParentRequired**(): `boolean`

此節點是否需要父節點。在複製和粘貼操作期間使用，以規範化那些本來會成為孤兒的節點。例如，沒有 ListNode 父節點的 ListItemNodes 或具有 ParagraphNode 父節點的 TextNodes。

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isParentRequired](lexical.DecoratorNode.md#isparentrequired)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1086](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1086)

---

### isSelected

▸ **isSelected**(`selection?`): `boolean`

如果此節點位於提供的 Selection 內部，則返回 true，否則返回 false。依賴於 [BaseSelection.getNodes](../interfaces/lexical.BaseSelection.md#getnodes) 中實現的算法來確定包含的範圍。

#### 參數

| 名稱         | 類型                                                                | 描述                                 |
| :----------- | :------------------------------------------------------------------ | :----------------------------------- |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 我們要確定節點是否在其中的選擇範圍。 |

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isSelected](lexical.DecoratorNode.md#isselected)

#### 定義於

[packages/lexical/src/LexicalNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L327)

---

### markDirty

▸ **markDirty**(): `void`

將節點標記為「髒」，觸發轉換並強制在更新循環中重新合併。

#### 返回

`void`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[markDirty](lexical.DecoratorNode.md#markdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1155)

---

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

將此 LexicalNode 從 EditorState 中移除。如果節點未被重新插入到其他位置，Lexical 垃圾回收器最終會清理它。

#### 參數

| 名稱                   | 類型      | 描述                                                                                                                                                                                       |
| :--------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為 `falsy`，則在移除操作後，如果節點的父節點為空，則會將其移除。這是預設行為，但可能會受到其他節點啟發式算法的影響，例如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty)。 |

#### 返回

`void`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[remove](lexical.DecoratorNode.md#remove)

#### 定義於

[packages/lexical/src/LexicalNode.ts:898](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L898)

---

### replace

▸ **replace**\<`N`\>(`replaceWith`, `includeChildren?`): `N`

用提供的節點替換此 LexicalNode，可選地將被替換節點的子節點轉移到替換節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `N`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 描述                                 |
| :----------------- | :-------- | :----------------------------------- |
| `replaceWith`      | `N`       | 用於替換此節點的節點。               |
| `includeChildren?` | `boolean` | 是否將此節點的子節點轉移到替換節點。 |

#### 返回

`N`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[replace](lexical.DecoratorNode.md#replace)

#### 定義於

[packages/lexical/src/LexicalNode.ts:909](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L909)

---

### selectEnd

▸ **selectEnd**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[selectEnd](lexical.DecoratorNode.md#selectend)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1102](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1102)

---

### selectNext

▸ **selectNext**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇移至此節點的下一個兄弟節點，並指定偏移量。

#### 參數

| 名稱            | 類型     | 描述               |
| :-------------- | :------- | :----------------- |
| `anchorOffset?` | `number` | 選擇的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇的焦點偏移量。 |

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[selectNext](lexical.DecoratorNode.md#selectnext)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1134](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1134)

---

### selectPrevious

▸ **selectPrevious**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇移至此節點的上一個兄弟節點，並指定偏移量。

#### 參數

| 名稱            | 類型     | 描述               |
| :-------------- | :------- | :----------------- |
| `anchorOffset?` | `number` | 選擇的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇的焦點偏移量。 |

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[selectPrevious](lexical.DecoratorNode.md#selectprevious)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1112](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1112)

---

### selectStart

▸ **selectStart**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 返回

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[selectStart](lexical.DecoratorNode.md#selectstart)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1098](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1098)

### setFormat

▸ **setFormat**(`format`): `void`

#### 參數

| 名稱     | 類型                                                           |
| :------- | :------------------------------------------------------------- |
| `format` | [`ElementFormatType`](../modules/lexical.md#elementformattype) |

#### 返回

`void`

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:54](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L54)

---

### updateDOM

▸ **updateDOM**(): `false`

當節點發生變化並且應該更新 DOM 以使其與更新期間可能發生的變化對齊時調用。

在此處返回 `true` 會導致 Lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤更改，則需要這樣做。

#### 返回

`false`

#### 覆蓋

[DecoratorNode](lexical.DecoratorNode.md).[updateDOM](lexical.DecoratorNode.md#updatedom)

#### 定義於

[packages/lexical-react/src/LexicalDecoratorBlockNode.ts:50](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalDecoratorBlockNode.ts#L50)

---

### clone

▸ **clone**(`_data`): [`LexicalNode`](lexical.LexicalNode.md)

克隆此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState（但不附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱    | 類型      |
| :------ | :-------- |
| `_data` | `unknown` |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[clone](lexical.DecoratorNode.md#clone)

#### 定義於

[packages/lexical/src/LexicalNode.ts:200](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L200)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且在編輯器中註冊的節點中必須唯一。

#### 返回

`string`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getType](lexical.DecoratorNode.md#gettype-1)

#### 定義於

[packages/lexical/src/LexicalNode.ts:186](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L186)

---

### importJSON

▸ **importJSON**(`_serializedNode`): [`LexicalNode`](lexical.LexicalNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但在節點實現和序列化介面之間提供了一個抽象，如果您對節點模式進行重大更改（通過添加或移除屬性），

這可能很重要。請參閱 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

### 參數

| 名稱              | 類型                                                                   |
| :---------------- | :--------------------------------------------------------------------- |
| `_serializedNode` | [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode) |

### 返回

[`LexicalNode`](lexical.LexicalNode.md)

### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[importJSON](lexical.DecoratorNode.md#importjson)

### 定義於

[packages/lexical/src/LexicalNode.ts:868](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L868)

---

### transform

▸ **transform**(): `null` 或 (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在 Editor 初始化期間，將返回的函式註冊為節點上的轉換。大多數這樣的使用情況應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 處理。

實驗性 - 使用時請小心。

### 返回

`null` 或 (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[transform](lexical.DecoratorNode.md#transform)

### 定義於

[packages/lexical/src/LexicalNode.ts:884](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L884)
