---
id: 'lexical_markdown'
title: '模組: @lexical/markdown'
custom_edit_url: null
---

## 類型別名

### ElementTransformer

Ƭ **ElementTransformer**: `Object`

#### 類型定義

| 名稱           | 類型                                                                                                                                                                                       |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dependencies` | [`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\>[]                                                                                                        |
| `export`       | (`node`: [`LexicalNode`](../classes/lexical.LexicalNode.md), `traverseChildren`: (`node`: [`ElementNode`](../classes/lexical.ElementNode.md)) => `string`) => `string` \| `null`           |
| `regExp`       | `RegExp`                                                                                                                                                                                   |
| `replace`      | (`parentNode`: [`ElementNode`](../classes/lexical.ElementNode.md), `children`: [`LexicalNode`](../classes/lexical.LexicalNode.md)[], `match`: `string`[], `isImport`: `boolean`) => `void` |
| `type`         | `"element"`                                                                                                                                                                                |

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L46)

---

### TextFormatTransformer

Ƭ **TextFormatTransformer**: `Readonly`\<\{ `format`: `ReadonlyArray`\<[`TextFormatType`](lexical.md#textformattype)\> ; `intraword?`: `boolean` ; `tag`: `string` ; `type`: `"text-format"` }\>

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L63)

---

### TextMatchTransformer

Ƭ **TextMatchTransformer**: `Readonly`\<\{ `dependencies`: [`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\>[] ; `export`: (`node`: [`LexicalNode`](../classes/lexical.LexicalNode.md), `exportChildren`: (`node`: [`ElementNode`](../classes/lexical.ElementNode.md)) => `string`, `exportFormat`: (`node`: [`TextNode`](../classes/lexical.TextNode.md), `textContent`: `string`) => `string`) => `string` \| `null` ; `importRegExp`: `RegExp` ; `regExp`: `RegExp` ; `replace`: (`node`: [`TextNode`](../classes/lexical.TextNode.md), `match`: `RegExpMatchArray`) => `void` ; `trigger`: `string` ; `type`: `"text-match"` }\>

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L70)

---

### Transformer

Ƭ **Transformer**: [`ElementTransformer`](lexical_markdown.md#elementtransformer) \| [`TextFormatTransformer`](lexical_markdown.md#textformattransformer) \| [`TextMatchTransformer`](lexical_markdown.md#textmatchtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L41)

## 變數

### BOLD_ITALIC_STAR

• `Const` **BOLD_ITALIC_STAR**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:308](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L308)

---

### BOLD_ITALIC_UNDERSCORE

• `Const` **BOLD_ITALIC_UNDERSCORE**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:314](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L314)

---

### BOLD_STAR

• `Const` **BOLD_STAR**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:321](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L321)

---

### BOLD_UNDERSCORE

• `Const` **BOLD_UNDERSCORE**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:327](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L327)

---

### CHECK_LIST

• `Const` **CHECK_LIST**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:276](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L276)

---

### CODE

• `Const` **CODE**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:244](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L244)

---

### ELEMENT_TRANSFORMERS

• `Const` **ELEMENT_TRANSFORMERS**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)[]

#### 定義於

[packages/lexical-markdown/src/index.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/index.ts#L39)

---

### HEADING

• `Const` **HEADING**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:190](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L190)

---

### HIGHLIGHT

• `Const` **HIGHLIGHT**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:302](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L302)

---

### INLINE_CODE

• `Const` **INLINE_CODE**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:296](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L296)

---

### ITALIC_STAR

• `Const` **ITALIC_STAR**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:340](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L340)

---

### ITALIC_UNDERSCORE

• `Const` **ITALIC_UNDERSCORE**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:346](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L346)

---

### LINK

• `Const` **LINK**: [`TextMatchTransformer`](lexical_markdown.md#textmatchtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:357](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L357)

---

### ORDERED_LIST

• `Const` **ORDERED_LIST**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L286)

---

### QUOTE

• `Const` **QUOTE**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:207](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L207)

---

### STRIKETHROUGH

• `Const` **STRIKETHROUGH**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:334](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L334)

---

### TEXT_FORMAT_TRANSFORMERS

• `Const` **TEXT_FORMAT_TRANSFORMERS**: [`TextFormatTransformer`](lexical_markdown.md#textformattransformer)[]

#### 定義於

[packages/lexical-markdown/src/index.ts:51](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/index.ts#L51)

---

### TEXT_MATCH_TRANSFORMERS

• `Const` **TEXT_MATCH_TRANSFORMERS**: [`TextMatchTransformer`](lexical_markdown.md#textmatchtransformer)[]

#### 定義於

[packages/lexical-markdown/src/index.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/index.ts#L63)

---

### TRANSFORMERS

• `Const` **TRANSFORMERS**: [`Transformer`](lexical_markdown.md#transformer)[]

#### 定義於

[packages/lexical-markdown/src/index.ts:65](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/index.ts#L65)

---

### UNORDERED_LIST

• `Const` **UNORDERED_LIST**: [`ElementTransformer`](lexical_markdown.md#elementtransformer)

#### 定義於

[packages/lexical-markdown/src/MarkdownTransformers.ts:266](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L266)

## 函式

### $convertFromMarkdownString

▸ **$convertFromMarkdownString**(`markdown`, `transformers?`, `node?`, `shouldPreserveNewLines?`): `void`

從字串渲染 Markdown。操作後，選擇會移到開始位置。

#### 參數

| 名稱                     | 類型                                               | 預設值         |
| :----------------------- | :------------------------------------------------- | :------------- |
| `markdown`               | `string`                                           | `undefined`    |
| `transformers`           | [`Transformer`](lexical_markdown.md#transformer)[] | `TRANSFORMERS` |
| `node?`                  | [`ElementNode`](../classes/lexical.ElementNode.md) | `undefined`    |
| `shouldPreserveNewLines` | `boolean`                                          | `false`        |

#### 回傳

`void`

#### 定義於

[packages/lexical-markdown/src/index.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/index.ts#L74)

---

### $convertToMarkdownString

▸ **$convertToMarkdownString**(`transformers?`, `node?`, `shouldPreserveNewLines?`): `string`

從 Markdown 渲染字串。操作後，選擇會移到開始位置。

#### 參數

| 名稱                     | 類型                                               | 預設值         |
| :----------------------- | :------------------------------------------------- | :------------- |
| `transformers`           | [`Transformer`](lexical_markdown.md#transformer)[] | `TRANSFORMERS` |
| `node?`                  | [`ElementNode`](../classes/lexical.ElementNode.md) | `undefined`    |
| `shouldPreserveNewLines` | `boolean`                                          | `false`        |

#### 回傳

`string`

#### 定義於

[packages/lexical-markdown/src/index.ts:90](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/index.ts#L90)

---

### registerMarkdownShortcuts

▸ **registerMarkdownShortcuts**(`editor`, `transformers?`): () => `void`

#### 參數

| 名稱           | 類型                                                   | 預設值         |
| :------------- | :----------------------------------------------------- | :------------- |
| `editor`       | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | `undefined`    |
| `transformers` | [`Transformer`](lexical_markdown.md#transformer)[]     | `TRANSFORMERS` |

#### 回傳

`fn`

▸ (): `void`

##### 回傳

`void`

#### 定義於

[packages/lexical-markdown/src/MarkdownShortcuts.ts:323](https://github.com/facebook/lexical/tree/main/packages/lexical-markdown/src/MarkdownShortcuts.ts#L323)
