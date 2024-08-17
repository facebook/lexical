---
id: 'lexical.DecoratorNode'
title: 'Class: DecoratorNode<T>'
custom_edit_url: null
---

[lexical](../modules/lexical.md).DecoratorNode

## 類型參數

| 名稱 |
| :--- |
| `T`  |

## 繼承結構

- [`LexicalNode`](lexical.LexicalNode.md)

  ↳ **`DecoratorNode`**

  ↳↳ [`DecoratorBlockNode`](lexical_react_LexicalDecoratorBlockNode.DecoratorBlockNode.md)

  ↳↳ [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

## 建構函式

### constructor

• **new DecoratorNode**\<`T`\>(`key?`): [`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\>

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 回傳值

[`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\>

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[constructor](lexical.LexicalNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:28](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L28)

## 屬性

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<(`key?`: `string`) => [`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\>\>

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L27)

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

在 `prevNode` 的複製品上執行任何狀態更新，這些更新在靜態複製函式的建構函式調用中尚未處理。如果您需要在複製品上更新狀態，但這些狀態更新不直接由建構函式處理，建議覆寫此函式，但實作中必須包含對 `super.afterCloneFrom(prevNode)` 的調用。此函式僅供 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過超類調用使用。

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
    // 此處使用繼承的 TextNode 建構函式，因此
    // classes 不由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這會調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式為私有實作細節，不適合用於公共 API，因為它不會調用 getWritable
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

[packages/lexical/src/LexicalNode.ts:258](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L258)

---

### createDOM

▸ **createDOM**(`_config`, `_editor`): `HTMLElement`

在調和過程中調用以確定將哪些節點插入 DOM 中以用於此 Lexical 節點。

此函式必須回傳一個 `HTMLElement`。不支援嵌套元素。

在此更新生命週期階段，不要嘗試更新 Lexical 編輯器狀態。

#### 參數

| 名稱      | 類型                                                 | 描述                                                       |
| :-------- | :--------------------------------------------------- | :--------------------------------------------------------- |
| `_config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在調和過程中訪問例如 EditorTheme（以應用類別）等功能。 |
| `_editor` | [`LexicalEditor`](lexical.LexicalEditor.md)          | 允許在調和過程中訪問編輯器以獲取上下文。                   |

#### 回傳值

`HTMLElement`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[createDOM](lexical.LexicalNode.md#createdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:815](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L815)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

為任何需要的父元素創建邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 回傳 true，則應實作此函式。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[createParentElementNode](lexical.LexicalNode.md#createparentelementnode)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1094](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1094)

---

### decorate

▸ **decorate**(`editor`, `config`): `T`

回傳值會被添加到 LexicalEditor.\_decorators 中。

#### 參數

| 名稱     | 類型                                                 |
| :------- | :--------------------------------------------------- |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md)          |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 回傳值

`T`

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L35)

---

### exportDOM

▸ **exportDOM**(`editor`): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於在 Lexical 和非 Lexical 編輯器之間，或不同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要，因為主要的傳輸格式是 HTML。如果您要通過 [@lexical/html!$generateHtmlFromNodes](../modules/lexical_html.md#$generatehtmlfromnodes) 將內容序列化為 HTML，此函式也很重要。您還可以使用此函式構建自己的 HTML 渲染器。

#### 參數

| 名稱     | 類型                                        |
| :------- | :------------------------------------------ |
| `editor` | [`LexicalEditor`](lexical.LexicalEditor.md) |

#### 回傳值

[`DOMExportOutput`](../modules/

lexical.md#domexportoutput)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[exportDOM](lexical.LexicalNode.md#exportdom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:845](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L845)

---

### exportJSON

▸ **exportJSON**(): [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果您要將內容序列化為 JSON 以進行持久性存儲，也很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[exportJSON](lexical.LexicalNode.md#exportjson)

#### 定義於

[packages/lexical/src/LexicalNode.ts:857](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L857)

---

### getCommonAncestor

▸ **getCommonAncestor**\<`T`\>(`node`): `null` \| `T`

返回此節點和提供的節點之間的最近公共祖先，若無法找到則返回 `null`。

#### 類型參數

| 名稱 | 類型                                                                                      |
| :--- | :---------------------------------------------------------------------------------------- |
| `T`  | extends [`ElementNode`](lexical.ElementNode.md) = [`ElementNode`](lexical.ElementNode.md) |

#### 參數

| 名稱   | 類型                                    | 描述                           |
| :----- | :-------------------------------------- | :----------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) | 另一個節點，用於尋找公共祖先。 |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getCommonAncestor](lexical.LexicalNode.md#getcommonancestor)

#### 定義於

[packages/lexical/src/LexicalNode.ts:553](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L553)

---

### getIndexWithinParent

▸ **getIndexWithinParent**(): `number`

返回此節點在其父節點中的零基索引。

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

返回來自活躍的 EditorState 的節點最新版本。這樣可以避免從過期的節點引用中獲取值。

#### 回傳值

`this`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getLatest](lexical.LexicalNode.md#getlatest)

#### 定義於

[packages/lexical/src/LexicalNode.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L739)

---

### getNextSibling

▸ **getNextSibling**\<`T`\>(): `null` \| `T`

返回「下一個」兄弟節點，即在相同父節點中，此節點之後的節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getNextSibling](lexical.LexicalNode.md#getnextsibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:526](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L526)

---

### getNextSiblings

▸ **getNextSiblings**\<`T`\>(): `T`[]

返回所有「下一個」兄弟節點，即在此節點和其父節點的最後一個子節點之間的節點（包括這些節點）。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getNextSiblings](lexical.LexicalNode.md#getnextsiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:537](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L537)

---

### getNodesBetween

▸ **getNodesBetween**(`targetNode`): [`LexicalNode`](lexical.LexicalNode.md)[]

返回此節點和目標節點之間的節點列表，位於 EditorState 中。

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

返回此節點的父節點，若未找到則返回 `null`。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`ElementNode`](lexical.ElementNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParent](lexical.LexicalNode.md#getparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L401)

---

### getParentKeys

▸ **getParentKeys**(): `string`[]

返回此節點的每個祖先的鍵列表，一直到 RootNode。

#### 回傳值

`string`[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParentKeys](lexical.LexicalNode.md#getparentkeys)

#### 定義於

[packages/lexical/src/LexicalNode.ts:478](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L478)

---

### getParentOrThrow

▸ **getParentOrThrow**\<`T`\>(): `T`

返回此節點的父節點，若未找到則會拋出錯誤。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`ElementNode`](lexical.ElementNode.md) |

#### 回傳值

`T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParentOrThrow](lexical.LexicalNode.md#getparentorthrow)

#### 定義於

[packages/lexical/src/LexicalNode.ts:412](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L412)

---

### getParents

▸ **getParents**(): [`ElementNode`](lexical.ElementNode.md)[]

返回此節點的所有祖先節點的列表，一直到 RootNode。

#### 回傳值

[`ElementNode`](lexical.ElementNode.md)[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getParents](lexical.LexicalNode.md#getparents)

#### 定義於

[packages/lexical/src/LexicalNode.ts:463](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L463)

---

### getPreviousSibling

▸ **getPreviousSibling**\<`T`\>(): `null` \| `T`

返回「前一個」兄弟節點，即在相同父節點中，此節點之前的節點。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`null` \| `T`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getPreviousSibling](lexical.LexicalNode.md#getprevioussibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:493](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L493)

---

### getPreviousSiblings

▸ **getPreviousSiblings**\<`T`\>(): `T`[]

返回所有「前一個」兄弟節點，即在此節點和其父節點的第一個子節點之間的節點（包括這些節點）。

#### 類型參數

| 名稱 | 類型                                            |
| :--- | :---------------------------------------------- |
| `T`  | extends [`LexicalNode`](lexical.LexicalNode.md) |

#### 回傳值

`T`[]

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getPreviousSiblings](lexical.LexicalNode.md#getprevioussiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:504](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L504)

---

### getTextContent

▸ **getTextContent**(): `string`

返回節點的文字內容。對於應該以純文字格式顯示的自訂節點（例如複製 + 粘貼），請覆寫此函式。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTextContent](lexical.LexicalNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:789](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L789)

---

### getTextContentSize

▸ **getTextContentSize**(): `number`

返回調用 `getTextContent` 函式生成的字串的長度。

#### 回傳值

`number`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTextContentSize](lexical.LexicalNode.md#gettextcontentsize)

#### 定義於

[packages/lexical/src/LexicalNode.ts:797](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L797)

---

### getTopLevelElement

▸ **getTopLevelElement**(): `null` \| [`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\> \| [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高的（非根）祖先節點，若未找到則返回 `null`。請參見 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 瞭解「根」元素的組成信息。

#### 回傳值

`null` \| [`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\> \| [`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTopLevelElement](lexical.LexicalNode.md#gettoplevelelement)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:20](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L20)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): [`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\> \| [`ElementNode`](lexical.ElementNode.md)

返回此節點在 EditorState 樹中最高的（非根）祖先節點，若未找到則會拋出錯誤。請參見 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 瞭解「根」元素的組成信息。

#### 回傳值

[`DecoratorNode`](lexical.DecoratorNode.md)\<`T`\> \| [`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getTopLevelElementOrThrow](lexical.LexicalNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:21](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L21)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getType](lexical.LexicalNode.md#gettype)

#### 定義於

[packages/lexical/src/LexicalNode.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L286)

---

### getWritable

▸ **getWritable**(): `this`

返回節點的可變版本（如果需要），使用 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties)。如果在 Lexical 編輯器 [LexicalEditor.update](lexical.LexicalEditor.md#update) 回調之外調用，將拋出錯誤。

#### 回傳值

`this`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getWritable](lexical.LexicalNode.md#getwritable)

#### 定義於

[packages/lexical/src/LexicalNode.ts:756](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L756)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 之後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入在此節點之後的節點。                   |
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

在此 LexicalNode 之前插入一個節點（作為前一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要插入在此節點之前的節點。                   |
| `restoreSelection` | `boolean`                               | `true`      | 是否在操作完成後嘗試將選擇恢復到適當的位置。 |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[insertBefore](lexical.LexicalNode.md#insertbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1046](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1046)

---

### is

▸ **is**(`object`): `boolean`

如果提供的節點與此節點在 Lexical 的角度來看完全相同，則返回 `true`。請始終使用此函式而不是參考等於（referential equality）。

#### 參數

| 名稱     | 類型                                                             | 描述                   |
| :------- | :--------------------------------------------------------------- | :--------------------- |
| `object` | `undefined` \| `null` \| [`LexicalNode`](lexical.LexicalNode.md) | 要進行相等比較的節點。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[is](lexical.LexicalNode.md#is)

#### 定義於

[packages/lexical/src/LexicalNode.ts:585](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L585)

---

### isAttached

▸ **isAttached**(): `boolean`

如果此節點與 RootNode 之間存在路徑，則返回 `true`，否則返回 `false`。這是一種判斷節點是否「附加」到 EditorState 的函式。未附加的節點不會被 reconciled，最終會被 Lexical GC 清理。

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isAttached](lexical.LexicalNode.md#isattached)

#### 定義於

[packages/lexical/src/LexicalNode.ts:303](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L303)

---

### isBefore

▸ **isBefore**(`targetNode`): `boolean`

如果此節點在編輯器狀態中邏輯上排在目標節點之前，則返回 `true`。

#### 參數

| 名稱         | 類型                                    | 描述                               |
| :----------- | :-------------------------------------- | :--------------------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 我們要測試是否在此節點之前的節點。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isBefore](lexical.LexicalNode.md#isbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:597](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L597)

---

### isDirty

▸ **isDirty**(): `boolean`

如果此節點在此次更新周期中被標記為髒節點，則返回 `true`。

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

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L43)

---

### isIsolated

▸ **isIsolated**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L39)

---

### isKeyboardSelectable

▸ **isKeyboardSelectable**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L47)

---

### isParentOf

▸ **isParentOf**(`targetNode`): `boolean`

如果此節點是目標節點的父節點，則返回 `true`，否則返回 `false`。

#### 參數

| 名稱         | 類型                                    | 描述           |
| :----------- | :-------------------------------------- | :------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 可能的子節點。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isParentOf](lexical.LexicalNode.md#isparentof)

#### 定義於

[packages/lexical/src/LexicalNode.ts:636](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L636)

---

### isParentRequired

▸ **isParentRequired**(): `boolean`

是否此節點需要父節點。在複製 + 粘貼操作期間使用，以正規化會成為孤立節點的節點。例如，沒有 ListNode 父節點的 ListItemNodes 或具有 ParagraphNode 父節點的 TextNodes。

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isParentRequired](lexical.LexicalNode.md#isparentrequired)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1086](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1086)

---

### isSelected

▸ **isSelected**(`selection?`): `boolean`

如果此節點包含在提供的選擇範圍內，則返回 `true`，否則返回 `false`。依賴於 [BaseSelection.getNodes](../interfaces/lexical.BaseSelection.md#getnodes) 實現的算法來確定包含內容。

#### 參數

| 名稱         | 類型                                                                | 描述                                 |
| :----------- | :------------------------------------------------------------------ | :----------------------------------- |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 我們要確定節點是否在其中的選擇範圍。 |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[isSelected](lexical.LexicalNode.md#isselected)

#### 定義於

[packages/lexical/src/LexicalNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L327)

---

### markDirty

▸ **markDirty**(): `void`

將節點標記為髒，觸發轉換並在更新週期中強制進行 reconciled。

#### 回傳值

`void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[markDirty](lexical.LexicalNode.md#markdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1155)

---

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

從 EditorState 中移除此 LexicalNode。如果節點沒有被重新插入到其他位置，Lexical 垃圾回收器最終會清理它。

#### 參數

| 名稱                   | 類型      | 描述                                                                                                                                                                   |
| :--------------------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為假，移除操作後如果節點的父節點為空，則會被移除。這是預設行為，但也會受到其他節點啟發式（如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty)）的影響。 |

#### 回傳值

`void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[remove](lexical.LexicalNode.md#remove)

#### 定義於

[packages/lexical/src/LexicalNode.ts:898](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L898)

---

### replace

▸ **replace**\<`N`\>(`replaceWith`, `includeChildren?`): `N`

用提供的節點替換此 LexicalNode，並可選擇將被替換節點的子節點轉移到替換節點上。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `N`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 描述                                   |
| :----------------- | :-------- | :------------------------------------- |
| `replaceWith`      | `N`       | 用來替換此節點的節點。                 |
| `includeChildren?` | `boolean` | 是否將此節點的子節點轉移到替換節點上。 |

#### 回傳值

`N`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[replace](lexical.LexicalNode.md#replace)

#### 定義於

[packages/lexical/src/LexicalNode.ts:909](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L909)

---

### selectEnd

▸ **selectEnd**(): [`RangeSelection`](lexical.RangeSelection.md)

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectEnd](lexical.LexicalNode.md#selectend)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1102](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1102)

---

### selectNext

▸ **selectNext**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇範圍移動到此節點的下一個兄弟節點，並指定偏移量。

#### 參數

| 名稱            | 類型     | 描述                   |
| :-------------- | :------- | :--------------------- |
| `anchorOffset?` | `number` | 選擇範圍的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇範圍的焦點偏移量。 |

#### 回傳值

[`RangeSelection`](lexical.RangeSelection.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[selectNext](lexical.LexicalNode.md#selectnext)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1134](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1134)

---

### selectPrevious

▸ **selectPrevious**(`anchorOffset?`, `focusOffset?`): [`RangeSelection`](lexical.RangeSelection.md)

將選擇範圍移動到此節點的上一個兄弟節點，並指定偏移量。

#### 參數

| 名稱            | 類型     | 描述                   |
| :-------------- | :------- | :--------------------- |
| `anchorOffset?` | `number` | 選擇範圍的錨點偏移量。 |
| `focusOffset?`  | `number` | 選擇範圍的焦點偏移量。 |

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

[packages/lexical/src/LexicalNode.ts:1098](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1098)

---

### updateDOM

▸ **updateDOM**(`_prevNode`, `_dom`, `_config`): `boolean`

當節點發生變化並需要以任何必要方式更新 DOM 以使其與可能在更新期間發生的變化對齊時調用。

返回 "true" 會使 lexical 解除安裝並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤發生變化，你需要這樣做。

#### 參數

| 名稱        | 類型                                                 |
| :---------- | :--------------------------------------------------- |
| `_prevNode` | `unknown`                                            |
| `_dom`      | `HTMLElement`                                        |
| `_config`   | [`EditorConfig`](../modules/lexical.md#editorconfig) |

#### 回傳值

`boolean`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[updateDOM](lexical.LexicalNode.md#updatedom)

#### 定義於

[packages/lexical/src/LexicalNode.ts:829](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L829)

---

### clone

▸ **clone**(`_data`): [`LexicalNode`](lexical.LexicalNode.md)

複製此節點，創建一個具有不同鍵的新節點，並將其添加到 EditorState 中（但不會將其附加到任何位置！）。所有節點必須實現此函式。

#### 參數

| 名稱    | 類型      |
| :------ | :-------- |
| `_data` | `unknown` |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[clone](lexical.LexicalNode.md#clone)

#### 定義於

[packages/lexical/src/LexicalNode.ts:200](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L200)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。每個節點必須實現此函式，且在編輯器中註冊的節點之間必須是唯一的。

#### 回傳值

`string`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[getType](lexical.LexicalNode.md#gettype-1)

#### 定義於

[packages/lexical/src/LexicalNode.ts:186](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L186)

---

### importJSON

▸ **importJSON**(`_serializedNode`): [`LexicalNode`](lexical.LexicalNode.md)

控制如何從 JSON 中反序列化此節點。這通常是樣板代碼，但提供了節點實現與序列化接口之間的抽象，如果你對節點架構進行破壞性更改（通過添加或移除屬性），這可能非常重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱              | 類型                                                                   |
| :---------------- | :--------------------------------------------------------------------- |
| `_serializedNode` | [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode) |

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[importJSON](lexical.LexicalNode.md#importjson)

#### 定義於

[packages/lexical/src/LexicalNode.ts:868](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L868)

---

### transform

▸ **transform**(): `null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在 Editor 初始化期間將返回的函式註冊為節點上的轉換。大多數這種用例應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 進行處理。

實驗性 - 請自行承擔風險使用。

#### 回傳值

`null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

#### 繼承自

[LexicalNode](lexical.LexicalNode.md).[transform](lexical.LexicalNode.md#transform)

#### 定義於

[packages/lexical/src/LexicalNode.ts:884](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L884)