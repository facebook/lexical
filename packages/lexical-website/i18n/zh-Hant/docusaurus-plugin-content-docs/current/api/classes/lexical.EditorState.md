---
id: 'lexical.EditorState'
title: 'Class: EditorState'
custom_edit_url: null
---

[lexical](../modules/lexical.md).EditorState

## 構造函式

### constructor

• **new EditorState**(`nodeMap`, `selection?`): [`EditorState`](lexical.EditorState.md)

#### 參數

| 名稱         | 類型                                                                |
| :----------- | :------------------------------------------------------------------ |
| `nodeMap`    | [`NodeMap`](../modules/lexical.md#nodemap)                          |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 回傳值

[`EditorState`](lexical.EditorState.md)

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:104](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L104)

## 屬性

### \_flushSync

• **\_flushSync**: `boolean`

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:101](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L101)

---

### \_nodeMap

• **\_nodeMap**: [`NodeMap`](../modules/lexical.md#nodemap)

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:99](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L99)

---

### \_readOnly

• **\_readOnly**: `boolean`

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:102](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L102)

---

### \_selection

• **\_selection**: `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:100](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L100)

## 函式

### clone

▸ **clone**(`selection?`): [`EditorState`](lexical.EditorState.md)

#### 參數

| 名稱         | 類型                                                                |
| :----------- | :------------------------------------------------------------------ |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 回傳值

[`EditorState`](lexical.EditorState.md)

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:123](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L123)

---

### isEmpty

▸ **isEmpty**(): `boolean`

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:111](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L111)

---

### read

▸ **read**\<`V`\>(`callbackFn`, `options?`): `V`

#### 類型參數

| 名稱 |
| :--- |
| `V`  |

#### 參數

| 名稱         | 類型                                                                        |
| :----------- | :-------------------------------------------------------------------------- |
| `callbackFn` | () => `V`                                                                   |
| `options?`   | [`EditorStateReadOptions`](../interfaces/lexical.EditorStateReadOptions.md) |

#### 回傳值

`V`

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:115](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L115)

---

### toJSON

▸ **toJSON**(): [`SerializedEditorState`](../interfaces/lexical.SerializedEditorState.md)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

#### 回傳值

[`SerializedEditorState`](../interfaces/lexical.SerializedEditorState.md)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

#### 定義於

[packages/lexical/src/LexicalEditorState.ts:132](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditorState.ts#L132)
