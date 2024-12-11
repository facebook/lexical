---
id: 'lexical.Point'
title: 'Class: Point'
custom_edit_url: null
---

[lexical](../modules/lexical.md).Point

## 建構函式

### constructor

• **new Point**(`key`, `offset`, `type`): [`Point`](lexical.Point.md)

#### 參數

| 名稱     | 類型                    |
| :------- | :---------------------- |
| `key`    | `string`                |
| `offset` | `number`                |
| `type`   | `"text"` \| `"element"` |

#### 返回

[`Point`](lexical.Point.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:97](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L97)

## 屬性

### \_selection

• **\_selection**: `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:95](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L95)

---

### key

• **key**: `string`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:92](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L92)

---

### offset

• **offset**: `number`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:93](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L93)

---

### type

• **type**: `"text"` \| `"element"`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:94](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L94)

## 函式

### getNode

▸ **getNode**(): [`LexicalNode`](lexical.LexicalNode.md)

#### 返回

[`LexicalNode`](lexical.LexicalNode.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:132](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L132)

---

### is

▸ **is**(`point`): `boolean`

#### 參數

| 名稱    | 類型                                           |
| :------ | :--------------------------------------------- |
| `point` | [`PointType`](../modules/lexical.md#pointtype) |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:104](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L104)

---

### isBefore

▸ **isBefore**(`b`): `boolean`

#### 參數

| 名稱 | 類型                                           |
| :--- | :--------------------------------------------- |
| `b`  | [`PointType`](../modules/lexical.md#pointtype) |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:112](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L112)

---

### set

▸ **set**(`key`, `offset`, `type`): `void`

#### 參數

| 名稱     | 類型                    |
| :------- | :---------------------- |
| `key`    | `string`                |
| `offset` | `number`                |
| `type`   | `"text"` \| `"element"` |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:141](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L141)
