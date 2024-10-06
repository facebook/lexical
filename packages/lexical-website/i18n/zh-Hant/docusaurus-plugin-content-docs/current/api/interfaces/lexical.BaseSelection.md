---
id: 'lexical.BaseSelection'
title: '介面: BaseSelection'
custom_edit_url: null
---

[lexical](../modules/lexical.md).BaseSelection

## 實作類別

- [`NodeSelection`](../classes/lexical.NodeSelection.md)
- [`RangeSelection`](../classes/lexical.RangeSelection.md)
- [`TableSelection`](../classes/lexical_table.TableSelection.md)

## 屬性

### \_cachedNodes

• **\_cachedNodes**: `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 定義於

[packages/lexical/src/LexicalSelection.ts:249](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L249)

---

### dirty

• **dirty**: `boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:250](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L250)

## 方法

### clone

▸ **clone**(): [`BaseSelection`](lexical.BaseSelection.md)

#### 返回

[`BaseSelection`](lexical.BaseSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:252](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L252)

---

### extract

▸ **extract**(): [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 定義於

[packages/lexical/src/LexicalSelection.ts:253](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L253)

---

### getCachedNodes

▸ **getCachedNodes**(): `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 返回

`null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 定義於

[packages/lexical/src/LexicalSelection.ts:263](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L263)

---

### getNodes

▸ **getNodes**(): [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 定義於

[packages/lexical/src/LexicalSelection.ts:254](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L254)

---

### getStartEndPoints

▸ **getStartEndPoints**(): `null` \| [[`PointType`](../modules/lexical.md#pointtype), [`PointType`](../modules/lexical.md#pointtype)]

#### 返回

`null` \| [[`PointType`](../modules/lexical.md#pointtype), [`PointType`](../modules/lexical.md#pointtype)]

#### 定義於

[packages/lexical/src/LexicalSelection.ts:260](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L260)

---

### getTextContent

▸ **getTextContent**(): `string`

#### 返回

`string`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:255](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L255)

---

### insertNodes

▸ **insertNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                                 |
| :------ | :--------------------------------------------------- |
| `nodes` | [`LexicalNode`](../classes/lexical.LexicalNode.md)[] |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:259](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L259)

---

### insertRawText

▸ **insertRawText**(`text`): `void`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:257](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L257)

---

### insertText

▸ **insertText**(`text`): `void`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:256](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L256)

---

### is

▸ **is**(`selection`): `boolean`

#### 參數

| 名稱        | 類型                                                  |
| :---------- | :---------------------------------------------------- |
| `selection` | `null` \| [`BaseSelection`](lexical.BaseSelection.md) |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:258](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L258)

---

### isBackward

▸ **isBackward**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:262](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L262)

---

### isCollapsed

▸ **isCollapsed**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:261](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L261)

---

### setCachedNodes

▸ **setCachedNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                                           |
| :------ | :------------------------------------------------------------- |
| `nodes` | `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)[] |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:264](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L264)
