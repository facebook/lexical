---
id: 'lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode'
title: 'Class: HorizontalRuleNode'
custom_edit_url: null
---

[@lexical/react/LexicalHorizontalRuleNode](../modules/lexical_react_LexicalHorizontalRuleNode.md).HorizontalRuleNode

## 層級結構

- [`DecoratorNode`](lexical.DecoratorNode.md)\<`JSX.Element`\>

  ↳ **`HorizontalRuleNode`**

## 建構函式

### constructor

• **new HorizontalRuleNode**(`key?`): [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `key?` | `string` |

#### 返回

[`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[constructor](lexical.DecoratorNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:28](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L28)

## 屬性

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<(`key?`: `string`) => [`DecoratorNode`](lexical.DecoratorNode.md)\<`Element`\>\>

#### 繼承自

DecoratorNode.constructor

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:27](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L27)

## 函式

### afterCloneFrom

▸ **afterCloneFrom**(`prevNode`): `void`

在 `prevNode` 的複製品上執行任何狀態更新，這些更新不是由靜態複製函式中的建構函式處理的。如果您在複製品中有狀態需要更新，而建構函式無法直接處理，建議覆寫此函式，但必須在實作中包含對 `super.afterCloneFrom(prevNode)` 的調用。這僅應由 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties) 函式或通過 super 調用來使用。

#### 參數

| 名稱       | 類型   |
| :--------- | :----- |
| `prevNode` | `this` |

#### 返回

`void`

**`範例`**

```ts
class ClassesTextNode extends TextNode {
  // 未顯示：static getType, static importJSON, exportJSON, createDOM, updateDOM
  __classes = new Set<string>();
  static clone(node: ClassesTextNode): ClassesTextNode {
    // 此處使用繼承的 TextNode 建構函式，因此
    // classes 不會由此函式設置。
    return new ClassesTextNode(node.__text, node.__key);
  }
  afterCloneFrom(node: this): void {
    // 這將調用 TextNode.afterCloneFrom 和 LexicalNode.afterCloneFrom
    // 以進行必要的狀態更新
    super.afterCloneFrom(node);
    this.__addClasses(node.__classes);
  }
  // 此函式是私有實作細節，不適用於公開 API，因為它不調用 getWritable
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

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在協調過程中調用此函式以確定要將哪些節點插入到這個 Lexical 節點的 DOM 中。

此函式必須返回一個 `HTMLElement`。不支援嵌套元素。

在更新生命週期的此階段，請勿嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                       |
| :------- | :--------------------------------------------------- | :--------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在協調過程中訪問像是 EditorTheme（以應用樣式）的內容。 |

#### 返回

`HTMLElement`

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[createDOM](lexical.DecoratorNode.md#createdom)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:150](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L150)

---

### createParentElementNode

▸ **createParentElementNode**(): [`ElementNode`](lexical.ElementNode.md)

為任何需要的父元素創建邏輯。如果 [isParentRequired](lexical.LexicalNode.md#isparentrequired) 返回 true，則應實作此函式。

#### 返回

[`ElementNode`](lexical.ElementNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[createParentElementNode](lexical.DecoratorNode.md#createparentelementnode)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1094](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1094)

---

### decorate

▸ **decorate**(): `Element`

返回的值會被添加到 LexicalEditor.\_decorators 中

#### 返回

`Element`

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[decorate](lexical.DecoratorNode.md#decorate)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:168](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L168)

---

### exportDOM

▸ **exportDOM**(): [`DOMExportOutput`](../modules/lexical.md#domexportoutput)

控制此節點如何序列化為 HTML。這對於在 Lexical 和非 Lexical 編輯器之間的複製和粘貼，或在不同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。在這種情況下，主要的轉移格式是 HTML。如果您出於其他原因將其序列化為 HTML，也很重要。您也可以使用此函式構建自己的 HTML 渲染器。

#### 返回

[`DOMExportOutput`](../modules/lexical.md#domexportoutput)

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[exportDOM](lexical.DecoratorNode.md#exportdom)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:146](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L146)

---

### exportJSON

▸ **exportJSON**(): [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間的複製和粘貼很重要。如果您將其序列化為 JSON 以進行持久存儲，也很重要。請參閱 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[exportJSON](lexical.DecoratorNode.md#exportjson)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:139](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L139)

---

### getCommonAncestor

▸ **getCommonAncestor**\<`T`\>(`node`): `null` \| `T`

返回此節點和提供的節點的最近共同祖先，如果找不到則返回 null。

#### 類型參數

| 名稱 | 類型 |
| :--- | :--- |

| `T

`  | 擴展 [`ElementNode`](lexical.ElementNode.md) = [`ElementNode`](lexical.ElementNode.md) |

#### 參數

| 名稱   | 類型                                    | 描述                           |
| :----- | :-------------------------------------- | :----------------------------- |
| `node` | [`LexicalNode`](lexical.LexicalNode.md) | 另一個節點，用於尋找共同祖先。 |

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

返回此節點的鍵。

#### 返回

`string`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getKey](lexical.DecoratorNode.md#getkey)

#### 定義於

[packages/lexical/src/LexicalNode.ts:373](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L373)

---

### getLatest

▸ **getLatest**(): `this`

返回來自活躍 EditorState 的最新版本節點。
這用於避免從過期的節點引用中獲取值。

#### 返回

`this`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getLatest](lexical.DecoratorNode.md#getlatest)

#### 定義於

[packages/lexical/src/LexicalNode.ts:739](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L739)

---

### getNextSibling

▸ **getNextSibling**\<`T`\>(): `null` \| `T`

返回「下一個」兄弟節點，即在相同父節點中，這個節點之後的節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getNextSibling](lexical.DecoratorNode.md#getnextsibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:526](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L526)

---

### getNextSiblings

▸ **getNextSiblings**\<`T`\>(): `T`[]

返回所有「下一個」兄弟節點，即在此節點和其父節點的最後一個子節點之間的所有節點（包括這些節點）。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`T`[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getNextSiblings](lexical.DecoratorNode.md#getnextsiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:537](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L537)

---

### getNodesBetween

▸ **getNodesBetween**(`targetNode`): [`LexicalNode`](lexical.LexicalNode.md)[]

返回此節點和目標節點之間的節點列表，在 EditorState 中。

#### 參數

| 名稱         | 類型                                    | 描述                   |
| :----------- | :-------------------------------------- | :--------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 標記範圍另一端的節點。 |

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

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`ElementNode`](lexical.ElementNode.md) |

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParent](lexical.DecoratorNode.md#getparent)

#### 定義於

[packages/lexical/src/LexicalNode.ts:401](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L401)

---

### getParentKeys

▸ **getParentKeys**(): `string`[]

返回此節點的每個祖先節點的鍵的列表，一直到 RootNode。

#### 返回

`string`[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParentKeys](lexical.DecoratorNode.md#getparentkeys)

#### 定義於

[packages/lexical/src/LexicalNode.ts:478](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L478)

---

### getParentOrThrow

▸ **getParentOrThrow**\<`T`\>(): `T`

返回此節點的父節點，如果找不到則拋出錯誤。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`ElementNode`](lexical.ElementNode.md) |

#### 返回

`T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParentOrThrow](lexical.DecoratorNode.md#getparentorthrow)

#### 定義於

[packages/lexical/src/LexicalNode.ts:412](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L412)

---

### getParents

▸ **getParents**(): [`ElementNode`](lexical.ElementNode.md)[]

返回此節點的所有祖先節點，一直到 RootNode。

#### 返回

[`ElementNode`](lexical.ElementNode.md)[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getParents](lexical.DecoratorNode.md#getparents)

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

#### 返回

`null` \| `T`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getPreviousSibling](lexical.DecoratorNode.md#getprevioussibling)

#### 定義於

[packages/lexical/src/LexicalNode.ts:493](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L493)

---

### getPreviousSiblings

▸ **getPreviousSiblings**\<`T`\>(): `T`[]

返回「前一個」兄弟節點，即在此節點和其父節點的第一個子節點之間的所有節點（包括這些節點）。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 返回

`T`[]

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getPreviousSiblings](lexical.DecoratorNode.md#getprevioussiblings)

#### 定義於

[packages/lexical/src/LexicalNode.ts:504](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L504)

---

### getTextContent

▸ **getTextContent**(): `string`

返回此節點的文字內容。對於需要以純文字格式表示的自訂節點（例如複製與貼上），應覆寫此函式。

#### 返回

`string`

#### 覆寫自

[DecoratorNode](lexical.DecoratorNode.md).[getTextContent](lexical.DecoratorNode.md#gettextcontent)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:156](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L156)

---

### getTextContentSize

▸ **getTextContentSize**(): `number`

返回調用 `getTextContent` 時生成的字符串長度。

#### 返回

`number`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTextContentSize](lexical.DecoratorNode.md#gettextcontentsize)

#### 定義於

[packages/lexical/src/LexicalNode.ts:797](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L797)

---

### getTopLevelElement

▸ **getTopLevelElement**(): `null` \| [`ElementNode`](lexical.ElementNode.md) \| [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

返回此節點在 `EditorState` 樹中最高的非根祖先節點，如果找不到則返回 `null`。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 以了解哪些元素構成「根」。

#### 返回

`null` \| [`ElementNode`](lexical.ElementNode.md) \| [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTopLevelElement](lexical.DecoratorNode.md#gettoplevelelement)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:20](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L20)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): [`ElementNode`](lexical.ElementNode.md) \| [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

返回此節點在 `EditorState` 樹中最高的非根祖先節點，如果找不到則拋出錯誤。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 以了解哪些元素構成「根」。

#### 返回

[`ElementNode`](lexical.ElementNode.md) \| [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getTopLevelElementOrThrow](lexical.DecoratorNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:21](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L21)

---

### getType

▸ **getType**(): `string`

返回此節點的字符串類型。

#### 返回

`string`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getType](lexical.DecoratorNode.md#gettype)

#### 定義於

[packages/lexical/src/LexicalNode.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L286)

---

### getWritable

▸ **getWritable**(): `this`

返回此節點的可變版本，必要時使用 [$cloneWithProperties](../modules/lexical.md#$clonewithproperties)。如果在 Lexical Editor 的 [LexicalEditor.update](lexical.LexicalEditor.md#update) 回調之外調用，將拋出錯誤。

#### 返回

`this`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[getWritable](lexical.DecoratorNode.md#getwritable)

#### 定義於

[packages/lexical/src/LexicalNode.ts:756](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L756)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`, `restoreSelection?`): [`LexicalNode`](lexical.LexicalNode.md)

在此 `LexicalNode` 之後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要在此節點之後插入的節點。                   |
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

在此 `LexicalNode` 之前插入一個節點（作為上一個兄弟節點）。

#### 參數

| 名稱               | 類型                                    | 預設值      | 描述                                         |
| :----------------- | :-------------------------------------- | :---------- | :------------------------------------------- |
| `nodeToInsert`     | [`LexicalNode`](lexical.LexicalNode.md) | `undefined` | 要在此節點之前插入的節點。                   |
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

如果提供的節點在 Lexical 的觀點下與此節點完全相同，則返回 `true`。請始終使用此函式，而不是引用相等性比較。

#### 參數

| 名稱     | 類型                 | 描述 |
| :------- | :------------------- | :--- |
| `object` | `undefined` \| `null |

` \| [`LexicalNode`](lexical.LexicalNode.md) | 要進行相等性比較的節點。 |

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[is](lexical.DecoratorNode.md#is)

#### 定義於

[packages/lexical/src/LexicalNode.ts:585](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L585)

---

### isAttached

▸ **isAttached**(): `boolean`

如果此節點與 RootNode 之間存在路徑，則返回 `true`，否則返回 `false`。這是一種判斷節點是否「附著」於 EditorState 的函式。未附著的節點不會被協調，最終會由 Lexical GC 清理。

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isAttached](lexical.DecoratorNode.md#isattached)

#### 定義於

[packages/lexical/src/LexicalNode.ts:303](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L303)

---

### isBefore

▸ **isBefore**(`targetNode`): `boolean`

如果此節點在編輯器狀態中邏輯上位於目標節點之前，則返回 `true`。

#### 參數

| 名稱         | 類型                                    | 描述                               |
| :----------- | :-------------------------------------- | :--------------------------------- |
| `targetNode` | [`LexicalNode`](lexical.LexicalNode.md) | 我們要測試是否在此節點之前的節點。 |

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isBefore](lexical.DecoratorNode.md#isbefore)

#### 定義於

[packages/lexical/src/LexicalNode.ts:597](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L597)

---

### isDirty

▸ **isDirty**(): `boolean`

如果此節點在更新週期中被標記為「髒」，則返回 `true`。

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

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[isInline](lexical.DecoratorNode.md#isinline)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:160](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L160)

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

如果此節點是目標節點的父節點，則返回 `true`，否則返回 `false`。

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

此節點是否需要有一個父節點。在複製和粘貼操作期間使用，以標準化那些可能會被孤立的節點。例如，沒有 ListNode 父節點的 ListItemNodes 或擁有 ParagraphNode 父節點的 TextNodes。

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isParentRequired](lexical.DecoratorNode.md#isparentrequired)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1086](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1086)

---

### isSelected

▸ **isSelected**(`selection?`): `boolean`

如果此節點在提供的 Selection 中，則返回 `true`，否則返回 `false`。依賴於 [BaseSelection.getNodes](../interfaces/lexical.BaseSelection.md#getnodes) 中實現的算法來確定包含哪些內容。

#### 參數

| 名稱         | 類型                                                                | 描述                             |
| :----------- | :------------------------------------------------------------------ | :------------------------------- |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) | 我們要判斷節點是否在其中的選擇。 |

#### 返回

`boolean`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[isSelected](lexical.DecoratorNode.md#isselected)

#### 定義於

[packages/lexical/src/LexicalNode.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L327)

---

### markDirty

▸ **markDirty**(): `void`

標記節點為「髒」，觸發變換並強制在更新週期中進行協調。

#### 返回

`void`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[markDirty](lexical.DecoratorNode.md#markdirty)

#### 定義於

[packages/lexical/src/LexicalNode.ts:1155](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L1155)

---

### remove

▸ **remove**(`preserveEmptyParent?`): `void`

從 EditorState 中移除此 LexicalNode。如果節點沒有被重新插入到其他地方，Lexical 的垃圾回收器最終會清理它。

#### 參數

| 名稱                   | 類型      | 描述                                                                                                                                                                       |
| :--------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveEmptyParent?` | `boolean` | 如果為假，則在移除操作後，如果節點的父節點為空，將會移除該父節點。這是默認行為，受到其他節點啟發式的影響，如 [ElementNode#canBeEmpty](lexical.ElementNode.md#canbeempty)。 |

#### 返回

`void`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[remove](lexical.DecoratorNode.md#remove)

#### 定義於

[packages/lexical/src/LexicalNode.ts:898](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L898)

---

### replace

▸ **replace**\<`N`\>(`replaceWith`, `includeChildren?`): `N`

用提供的節點替換此 LexicalNode，並選擇性地將被替換節點的子節點轉移到替換節點。

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `N`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱               | 類型      | 描述                                 |
| :----------------- | :-------- | :----------------------------------- |
| `replaceWith`      | `N`       | 用來替換此節點的節點。               |
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

將選擇範圍移動到此節點的下一個兄弟節點，並在指定的偏移量處。

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

將選擇範圍移動到此節點的上一個兄弟節點，並在指定的偏移量處。

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

---

### updateDOM

▸ **updateDOM**(): `boolean`

當節點發生變化並且需要更新 DOM 以使其與更新期間可能發生的變化對齊時調用。

返回 "true" 將導致 Lexical 重新卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤更改時需要這樣做。

#### 返回

`boolean`

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[updateDOM](lexical.DecoratorNode.md#updatedom)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:164](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L164)

---

### clone

▸ **clone**(`node`): [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState 中（但不會附加到任何地方！）。所有節點必須實現此函式。

#### 參數

| 名稱   | 類型                                                                                  |
| :----- | :------------------------------------------------------------------------------------ |
| `node` | [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md) |

#### 返回

[`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[clone](lexical.DecoratorNode.md#clone)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:120](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L120)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點都必須實現此函式，並且在編輯器中註冊的節點中必須是唯一的。

#### 返回

`string`

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[getType](lexical.DecoratorNode.md#gettype-1)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:116](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L116)

---

### importDOM

▸ **importDOM**(): `null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 返回

`null` \| [`DOMConversionMap`](../modules/lexical.md#domconversionmap)

#### 重寫自

DecoratorNode.importDOM

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:130](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L130)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板代碼，但提供了節點實現與序列化接口之間的抽象，如果你對節點架構進行了破壞性的更改（例如添加或刪除屬性），這可能會很重要。請參見 [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                   |
| :--------------- | :--------------------------------------------------------------------- |
| `serializedNode` | [`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode) |

#### 返回

[`HorizontalRuleNode`](lexical_react_LexicalHorizontalRuleNode.HorizontalRuleNode.md)

#### 重寫自

[DecoratorNode](lexical.DecoratorNode.md).[importJSON](lexical.DecoratorNode.md#importjson)

#### 定義於

[packages/lexical-react/src/LexicalHorizontalRuleNode.tsx:124](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalHorizontalRuleNode.tsx#L124)

---

### transform

▸ **transform**(): `null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

在編輯器初始化期間將返回的函式註冊為節點的轉換函式。大多數這類用例應通過 [LexicalEditor.registerNodeTransform](lexical.LexicalEditor.md#registernodetransform) API 解決。

實驗性 - 使用時請自行承擔風險。

#### 返回

`null` \| (`node`: [`LexicalNode`](lexical.LexicalNode.md)) => `void`

#### 繼承自

[DecoratorNode](lexical.DecoratorNode.md).[transform](lexical.DecoratorNode.md#transform)

#### 定義於

[packages/lexical/src/LexicalNode.ts:884](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L884)
