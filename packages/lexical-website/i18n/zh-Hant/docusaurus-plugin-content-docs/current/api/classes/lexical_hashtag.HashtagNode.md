---
id: 'lexical_hashtag.HashtagNode'
title: '類別：HashtagNode'
custom_edit_url: null
---

[@lexical/hashtag](../modules/lexical_hashtag.md).HashtagNode

## 階層結構

- [`TextNode`](lexical.TextNode.md)

  ↳ **`HashtagNode`**

## 建構子

### constructor

• **new HashtagNode**(`text`, `key?`): [`HashtagNode`](lexical_hashtag.HashtagNode.md)

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |
| `key?` | `string` |

#### 回傳值

[`HashtagNode`](lexical_hashtag.HashtagNode.md)

#### 覆寫自

[TextNode](lexical.TextNode.md).[constructor](lexical.TextNode.md#constructor)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:29](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L29)

## 方法

### canInsertTextBefore

▸ **canInsertTextBefore**(): `boolean`

此方法應由 `TextNode` 子類別覆寫，以控制在使用者事件發生時，文字插入此節點之前的行為。如果回傳 `true`，Lexical 將嘗試將文字插入此節點。如果回傳 `false`，則會將文字插入新的兄弟節點。

#### 回傳值

`boolean`

如果可以在節點之前插入文字，則回傳 `true`，否則回傳 `false`。

#### 覆寫自

[TextNode](lexical.TextNode.md).[canInsertTextBefore](lexical.TextNode.md#caninserttextbefore)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:55](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L55)

---

### createDOM

▸ **createDOM**(`config`): `HTMLElement`

在對此 Lexical 節點進行對比時調用，以決定插入 DOM 的節點。

此方法必須回傳一個 `HTMLElement`。嵌套元素不支援。

請勿在此更新生命週期階段中嘗試更新 Lexical EditorState。

#### 參數

| 名稱     | 類型                                                 | 描述                                                            |
| :------- | :--------------------------------------------------- | :-------------------------------------------------------------- |
| `config` | [`EditorConfig`](../modules/lexical.md#editorconfig) | 允許在對比過程中訪問像是 `EditorTheme` 的東西（用於應用類別）。 |

#### 回傳值

`HTMLElement`

#### 覆寫自

[TextNode](lexical.TextNode.md).[createDOM](lexical.TextNode.md#createdom)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:33](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L33)

---

### exportJSON

▸ **exportJSON**(): [`SerializedTextNode`](../modules/lexical.md#serializedtextnode)

控制此節點如何序列化為 JSON。這對於在共享相同命名空間的 Lexical 編輯器之間的複製和粘貼非常重要。對於持久性存儲來說，也很重要。
參見[序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 回傳值

[`SerializedTextNode`](../modules/lexical.md#serializedtextnode)

#### 覆寫自

[TextNode](lexical.TextNode.md).[exportJSON](lexical.TextNode.md#exportjson)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:48](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L48)

---

### isTextEntity

▸ **isTextEntity**(): `true`

此方法應由 `TextNode` 子類別覆寫，以控制在使用 `registerLexicalTextEntity` 函數時，這些節點的行為。如果使用 `registerLexicalTextEntity`，則您創建並替換匹配文字的節點類別應回傳 `true`。

#### 回傳值

`true`

如果節點應被視為「文字實體」，則回傳 `true`，否則回傳 `false`。

#### 覆寫自

[TextNode](lexical.TextNode.md).[isTextEntity](lexical.TextNode.md#istextentity)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:59](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L59)

---

### clone

▸ **clone**(`node`): [`HashtagNode`](lexical_hashtag.HashtagNode.md)

複製此節點，創建一個具有不同 `key` 的新節點，並將其添加到 `EditorState` 中（但不附加到任何位置）。所有節點都必須實現此方法。

#### 參數

| 名稱   | 類型                                            |
| :----- | :---------------------------------------------- |
| `node` | [`HashtagNode`](lexical_hashtag.HashtagNode.md) |

#### 回傳值

[`HashtagNode`](lexical_hashtag.HashtagNode.md)

#### 覆寫自

[TextNode](lexical.TextNode.md).[clone](lexical.TextNode.md#clone)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:25](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L25)

---

### getType

▸ **getType**(): `string`

回傳此節點的字串類型。每個節點必須實現此方法，並且在編輯器中註冊的節點之間必須唯一。

#### 回傳值

`string`

#### 覆寫自

[TextNode](lexical.TextNode.md).[getType](lexical.TextNode.md#gettype-1)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:21](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L21)

---

### importJSON

▸ **importJSON**(`serializedNode`): [`HashtagNode`](lexical_hashtag.HashtagNode.md)

控制此節點如何從 JSON 反序列化。這通常是樣板，但為節點實現與序列化介面之間提供了抽象，這在您需要對節點架構進行破壞性更改（例如添加或移除屬性）時可能很重要。
參見[序列化與反序列化](https://lexical.dev/docs/concepts/serialization#lexical---html)。

#### 參數

| 名稱             | 類型                                                             |
| :--------------- | :--------------------------------------------------------------- |
| `serializedNode` | [`SerializedTextNode`](../modules/lexical.md#serializedtextnode) |

#### 回傳值

[`HashtagNode`](lexical_hashtag.HashtagNode.md)

#### 覆寫自

[TextNode](lexical.TextNode.md).[importJSON](lexical.TextNode.md#importjson)

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L39)
