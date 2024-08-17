---
id: 'lexical_code'
title: '模組: @lexical/code'
custom_edit_url: null
---

## 類別

- [CodeHighlightNode](../classes/lexical_code.CodeHighlightNode.md)
- [CodeNode](../classes/lexical_code.CodeNode.md)

## 類型別名

### SerializedCodeNode

Ƭ **SerializedCodeNode**: [`Spread`](lexical.md#spread)\<\{ `language`: `string` \| `null` \| `undefined` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-code/src/CodeNode.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L44)

## 變數

### CODE_LANGUAGE_FRIENDLY_NAME_MAP

• `Const` **CODE_LANGUAGE_FRIENDLY_NAME_MAP**: `Record`\<`string`, `string`\>

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L44)

---

### CODE_LANGUAGE_MAP

• `Const` **CODE_LANGUAGE_MAP**: `Record`\<`string`, `string`\>

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L64)

---

### DEFAULT_CODE_LANGUAGE

• `Const` **DEFAULT_CODE_LANGUAGE**: `"javascript"`

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L35)

---

### PrismTokenizer

• `Const` **PrismTokenizer**: `Tokenizer`

#### 定義於

[packages/lexical-code/src/CodeHighlighter.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlighter.ts#L69)

## 函數

### $createCodeHighlightNode

▸ **$createCodeHighlightNode**(`text`, `highlightType?`): [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md)

#### 參數

| 名稱             | 類型               |
| :--------------- | :----------------- |
| `text`           | `string`           |
| `highlightType?` | `null` \| `string` |

#### 回傳值

[`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:214](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L214)

---

### $createCodeNode

▸ **$createCodeNode**(`language?`): [`CodeNode`](../classes/lexical_code.CodeNode.md)

#### 參數

| 名稱        | 類型               |
| :---------- | :----------------- |
| `language?` | `null` \| `string` |

#### 回傳值

[`CodeNode`](../classes/lexical_code.CodeNode.md)

#### 定義於

[packages/lexical-code/src/CodeNode.ts:343](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L343)

---

### $isCodeHighlightNode

▸ **$isCodeHighlightNode**(`node`): node is CodeHighlightNode

#### 參數

| 名稱   | 類型                                                                                                                                               |
| :----- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) |

#### 回傳值

node is CodeHighlightNode

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:221](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L221)

---

### $isCodeNode

▸ **$isCodeNode**(`node`): node is CodeNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳值

node is CodeNode

#### 定義於

[packages/lexical-code/src/CodeNode.ts:349](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeNode.ts#L349)

---

### getCodeLanguages

▸ **getCodeLanguages**(): `string`[]

#### 回傳值

`string`[]

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L86)

---

### getDefaultCodeLanguage

▸ **getDefaultCodeLanguage**(): `string`

#### 回傳值

`string`

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:84](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L84)

---

### getEndOfCodeInLine

▸ **getEndOfCodeInLine**(`anchor`): [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md)

#### 參數

| 名稱     | 類型                                                                                                              |
| :------- | :---------------------------------------------------------------------------------------------------------------- |
| `anchor` | [`TabNode`](../classes/lexical.TabNode.md) \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) |

#### 回傳值

[`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md)

#### 定義於

[packages/lexical-code/src/CodeHighlighter.ts:193](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlighter.ts#L193)

---

### getFirstCodeNodeOfLine

▸ **getFirstCodeNodeOfLine**(`anchor`): `null` \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`LineBreakNode`](../classes/lexical.LineBreakNode.md)

#### 參數

| 名稱     | 類型                                                                                                                                                                        |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchor` | [`LineBreakNode`](../classes/lexical.LineBreakNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) |

#### 回傳值

`null` \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`LineBreakNode`](../classes/lexical.LineBreakNode.md)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:227](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L227)

---

### getLanguageFriendlyName

▸ **getLanguageFriendlyName**(`lang`): `string`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `lang` | `string` |

#### 回傳值

`string`

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:79](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L79)

---

### getLastCodeNodeOfLine

▸ **getLastCodeNodeOfLine**(`anchor`): [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`LineBreakNode`](../classes/lexical.LineBreakNode.md)

#### 參數

| 名稱     | 類型                                                                                                                                                                        |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchor` | [`LineBreakNode`](../classes/lexical.LineBreakNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) |

#### 回傳值

[`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`LineBreakNode`](../classes/lexical.LineBreakNode.md)

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:239](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L239)

---

### getStartOfCodeInLine

▸ **getStartOfCodeInLine**(`anchor`, `offset`): `null` \| \{ `node`: [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`LineBreakNode`](../classes/lexical.LineBreakNode.md) ; `offset`: `number` }

#### 參數

| 名稱     | 類型                                                                                                              |
| :------- | :---------------------------------------------------------------------------------------------------------------- |
| `anchor` | [`TabNode`](../classes/lexical.TabNode.md) \| [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) |
| `offset` | `number`                                                                                                          |

#### 回傳值

`null` \| \{ `node`: [`CodeHighlightNode`](../classes/lexical_code.CodeHighlightNode.md) \| [`TabNode`](../classes/lexical.TabNode.md) \| [`LineBreakNode`](../classes/lexical.LineBreakNode.md) ; `offset`: `number` }

#### 定義於

[packages/lexical-code/src/CodeHighlighter.ts:80](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlighter.ts#L80)

---

### normalizeCodeLang

▸ **normalizeCodeLang**(`lang`): `string`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `lang` | `string` |

#### 回傳值

`string`

#### 定義於

[packages/lexical-code/src/CodeHighlightNode.ts:75](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlightNode.ts#L75)

---

### registerCodeHighlighting

▸ **registerCodeHighlighting**(`editor`, `tokenizer?`): () => `void`

#### 參數

| 名稱         | 類型                                                   |
| :----------- | :----------------------------------------------------- |
| `editor`     | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `tokenizer?` | `Tokenizer`                                            |

#### 回傳值

`fn`

▸ (): `void`

##### 回傳

`void`

#### 定義於

[packages/lexical-code/src/CodeHighlighter.ts:806](https://github.com/facebook/lexical/tree/main/packages/lexical-code/src/CodeHighlighter.ts#L806)
