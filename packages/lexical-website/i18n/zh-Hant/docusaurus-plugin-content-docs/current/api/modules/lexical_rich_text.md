---
id: 'lexical_rich_text'
title: '模組: @lexical/rich-text'
custom_edit_url: null
---

## 類別

- [HeadingNode](../classes/lexical_rich_text.HeadingNode.md)
- [QuoteNode](../classes/lexical_rich_text.QuoteNode.md)

## 類型別名

### HeadingTagType

Ƭ **HeadingTagType**: `"h1"` \| `"h2"` \| `"h3"` \| `"h4"` \| `"h5"` \| `"h6"`

#### 定義於

[packages/lexical-rich-text/src/index.ts:221](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L221)

---

### SerializedHeadingNode

Ƭ **SerializedHeadingNode**: [`Spread`](lexical.md#spread)\<\{ `tag`: `"h1"` \| `"h2"` \| `"h3"` \| `"h4"` \| `"h5"` \| `"h6"` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-rich-text/src/index.ts:104](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L104)

---

### SerializedQuoteNode

Ƭ **SerializedQuoteNode**: [`SerializedElementNode`](lexical.md#serializedelementnode)

#### 定義於

[packages/lexical-rich-text/src/index.ts:115](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L115)

## 變數

### DRAG_DROP_PASTE

• `Const` **DRAG_DROP_PASTE**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`File`[]\>

#### 定義於

[packages/lexical-rich-text/src/index.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L111)

## 函數

### $createHeadingNode

▸ **$createHeadingNode**(`headingTag`): [`HeadingNode`](../classes/lexical_rich_text.HeadingNode.md)

#### 參數

| 名稱         | 類型                                                    |
| :----------- | :------------------------------------------------------ |
| `headingTag` | [`HeadingTagType`](lexical_rich_text.md#headingtagtype) |

#### 返回

[`HeadingNode`](../classes/lexical_rich_text.HeadingNode.md)

#### 定義於

[packages/lexical-rich-text/src/index.ts:432](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L432)

---

### $createQuoteNode

▸ **$createQuoteNode**(): [`QuoteNode`](../classes/lexical_rich_text.QuoteNode.md)

#### 返回

[`QuoteNode`](../classes/lexical_rich_text.QuoteNode.md)

#### 定義於

[packages/lexical-rich-text/src/index.ts:211](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L211)

---

### $isHeadingNode

▸ **$isHeadingNode**(`node`): node 是 HeadingNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node 是 HeadingNode

#### 定義於

[packages/lexical-rich-text/src/index.ts:436](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L436)

---

### $isQuoteNode

▸ **$isQuoteNode**(`node`): node 是 QuoteNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node 是 QuoteNode

#### 定義於

[packages/lexical-rich-text/src/index.ts:215](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L215)

---

### eventFiles

▸ **eventFiles**(`event`): [`boolean`, `File`[], `boolean`]

#### 參數

| 名稱    | 類型                                                             |
| :------ | :--------------------------------------------------------------- |
| `event` | `DragEvent` \| [`PasteCommandType`](lexical.md#pastecommandtype) |

#### 返回

[`boolean`, `File`[], `boolean`]

#### 定義於

[packages/lexical-rich-text/src/index.ts:486](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L486)

---

### registerRichText

▸ **registerRichText**(`editor`): () => `void`

#### 參數

| 名稱     | 類型                                                   |
| :------- | :----------------------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |

#### 返回

`fn`

▸ (): `void`

##### 返回

`void`

#### 定義於

[packages/lexical-rich-text/src/index.ts:549](https://github.com/facebook/lexical/tree/main/packages/lexical-rich-text/src/index.ts#L549)
