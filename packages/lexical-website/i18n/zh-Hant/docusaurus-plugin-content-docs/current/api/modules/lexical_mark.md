---
id: 'lexical_mark'
title: '模組: @lexical/mark'
custom_edit_url: null
---

## 類別

- [MarkNode](../classes/lexical_mark.MarkNode.md)

## 類型別名

### SerializedMarkNode

Ƭ **SerializedMarkNode**: [`Spread`](lexical.md#spread)\<\{ `ids`: `string`[] }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:25](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L25)

## 函數

### $createMarkNode

▸ **$createMarkNode**(`ids`): [`MarkNode`](../classes/lexical_mark.MarkNode.md)

#### 參數

| 名稱  | 類型       |
| :---- | :--------- |
| `ids` | `string`[] |

#### 返回

[`MarkNode`](../classes/lexical_mark.MarkNode.md)

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:200](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L200)

---

### $getMarkIDs

▸ **$getMarkIDs**(`node`, `offset`): `null` \| `string`[]

#### 參數

| 名稱     | 類型                                         |
| :------- | :------------------------------------------- |
| `node`   | [`TextNode`](../classes/lexical.TextNode.md) |
| `offset` | `number`                                     |

#### 返回

`null` \| `string`[]

#### 定義於

[packages/lexical-mark/src/index.ts:135](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/index.ts#L135)

---

### $isMarkNode

▸ **$isMarkNode**(`node`): node is MarkNode

#### 參數

| 名稱   | 類型                                                         |
| :----- | :----------------------------------------------------------- |
| `node` | `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node is MarkNode

#### 定義於

[packages/lexical-mark/src/MarkNode.ts:204](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/MarkNode.ts#L204)

---

### $unwrapMarkNode

▸ **$unwrapMarkNode**(`node`): `void`

#### 參數

| 名稱   | 類型                                              |
| :----- | :------------------------------------------------ |
| `node` | [`MarkNode`](../classes/lexical_mark.MarkNode.md) |

#### 返回

`void`

#### 定義於

[packages/lexical-mark/src/index.ts:16](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/index.ts#L16)

---

### $wrapSelectionInMarkNode

▸ **$wrapSelectionInMarkNode**(`selection`, `isBackward`, `id`, `createNode?`): `void`

#### 參數

| 名稱          | 類型                                                                     |
| :------------ | :----------------------------------------------------------------------- |
| `selection`   | [`RangeSelection`](../classes/lexical.RangeSelection.md)                 |
| `isBackward`  | `boolean`                                                                |
| `id`          | `string`                                                                 |
| `createNode?` | (`ids`: `string`[]) => [`MarkNode`](../classes/lexical_mark.MarkNode.md) |

#### 返回

`void`

#### 定義於

[packages/lexical-mark/src/index.ts:31](https://github.com/facebook/lexical/tree/main/packages/lexical-mark/src/index.ts#L31)
