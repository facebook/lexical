---
id: 'lexical.RootNode'
title: 'Class: RootNode'
custom_edit_url: null
---

[lexical](../modules/lexical.md).RootNode

## 階層

- [`ElementNode`](lexical.ElementNode.md)

  ↳ **`RootNode`**

## 建構函式

### constructor

• **new RootNode**(): [`RootNode`](lexical.RootNode.md)

#### 返回

[`RootNode`](lexical.RootNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[constructor](lexical.ElementNode.md#constructor)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L37)

## 函式

### append

▸ **append**(`...nodesToAppend`): `this`

#### 參數

| 名稱               | 類型                                      |
| :----------------- | :---------------------------------------- |
| `...nodesToAppend` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 返回

`this`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[append](lexical.ElementNode.md#append)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L86)

---

### collapseAtStart

▸ **collapseAtStart**(): `true`

#### 返回

`true`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[collapseAtStart](lexical.ElementNode.md#collapseatstart)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:119](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L119)

---

### exportJSON

▸ **exportJSON**(): [`SerializedRootNode`](../modules/lexical.md#serializedrootnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間進行複製和粘貼非常重要。如果你要將其序列化為 JSON 以進行持久存儲，也非常重要。請參閱 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 返回

[`SerializedRootNode`](../modules/lexical.md#serializedrootnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

#### 覆寫

[ElementNode](lexical.ElementNode.md).[exportJSON](lexical.ElementNode.md#exportjson)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:108](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L108)

---

### getTextContent

▸ **getTextContent**(): `string`

返回節點的文本內容。對於應具有純文本表示的自定義節點（例如用於複製和粘貼），應該覆寫此函式。

#### 返回

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getTextContent](lexical.ElementNode.md#gettextcontent)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:49](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L49)

---

### getTopLevelElementOrThrow

▸ **getTopLevelElementOrThrow**(): `never`

返回此節點的最高（在 EditorState 樹中）非根祖先節點，如果找不到則拋出異常。請參閱 [lexical!$isRootOrShadowRoot](../modules/lexical.md#$isrootorshadowroot) 了解哪些元素構成“根”。

#### 返回

`never`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getTopLevelElementOrThrow](lexical.ElementNode.md#gettoplevelelementorthrow)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L42)

---

### insertAfter

▸ **insertAfter**(`nodeToInsert`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 後插入一個節點（作為下一個兄弟節點）。

#### 參數

| 名稱           | 類型                                    | 描述           |
| :------------- | :-------------------------------------- | :------------- |
| `nodeToInsert` | [`LexicalNode`](lexical.LexicalNode.md) | 要插入的節點。 |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[insertAfter](lexical.ElementNode.md#insertafter)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L74)

---

### insertBefore

▸ **insertBefore**(`nodeToInsert`): [`LexicalNode`](lexical.LexicalNode.md)

在此 LexicalNode 前插入一個節點（作為上一個兄弟節點）。

#### 參數

| 名稱           | 類型                                    | 描述           |
| :------------- | :-------------------------------------- | :------------- |
| `nodeToInsert` | [`LexicalNode`](lexical.LexicalNode.md) | 要插入的節點。 |

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[insertBefore](lexical.ElementNode.md#insertbefore)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L70)

---

### remove

▸ **remove**(): `never`

從 EditorState 中移除此 LexicalNode。如果該節點沒有被重新插入到某處，Lexical 的垃圾回收器最終會清理它。

#### 返回

`never`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[remove](lexical.ElementNode.md#remove)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L62)

---

### replace

▸ **replace**\<`N`\>(`node`): `never`

用提供的節點替換此 LexicalNode，可以選擇性地將被替換節點的子節點轉移到替換的節點。

#### 類型參數

| 名稱 | 類型                                    |
| :--- | :-------------------------------------- |
| `N`  | [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱   | 類型 | 描述                   |
| :----- | :--- | :--------------------- |
| `node` | `N`  | 用來替換此節點的節點。 |

#### 返回

`never`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[replace](lexical.ElementNode.md#replace)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L66)

---

### updateDOM

▸ **updateDOM**(`prevNode`, `dom`): `false`

當節點更改並且需要以任何必要的方式更新 DOM 以使其與可能在更新過程中發生的更改對齊時調用。

返回“true”將導致 lexical 卸載並重新創建 DOM 節點（通過調用 createDOM）。例如，如果元素標籤改變，你需要這麼做。

#### 參數

| 名稱       | 類型                              |
| :--------- | :-------------------------------- |
| `prevNode` | [`RootNode`](lexical.RootNode.md) |
| `dom`      | `HTMLElement`                     |

#### 返回

`false`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[updateDOM](lexical.ElementNode.md#updatedom)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:80](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L80)

---

### clone

▸ **clone**(): [`RootNode`](lexical.RootNode.md)

克隆此節點，創建一個具有不同鍵的新節點並將其添加到 EditorState（但不會附加到任何地方！）。所有節點必須實現此函式。

#### 返回

[`RootNode`](lexical.RootNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[clone](lexical.ElementNode.md#clone)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:33](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L33)

---

### getType

▸ **getType**(): `string`

返回此節點的字串類型。每個節點必須實現此函式，並且它在編輯器中必須是唯一的。

#### 返回

`string`

#### 覆寫

[ElementNode](lexical.ElementNode.md).[getType](lexical.ElementNode.md#gettype-1)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:29](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L29)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`RootNode`](lexical.RootNode.md)

控制此節點如何從 JSON 反序列化。這通常是模板代碼，但提供了節點實現和序列化接口之間的抽象，如果你對節點架構進行破壞性更改（例如添加或移除屬性），這可能會很重要。請參閱 [序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                                                                                                       |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `serializedNode` | [`SerializedRootNode`](../modules/lexical.md#serializedrootnode)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\> |

#### 返回

[`RootNode`](lexical.RootNode.md)

#### 覆寫

[ElementNode](lexical.ElementNode.md).[importJSON](lexical.ElementNode.md#importjson)

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:99](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L99)
