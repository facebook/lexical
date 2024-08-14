---
id: 'lexical_offset.OffsetView'
title: '類別: OffsetView'
custom_edit_url: null
---

[@lexical/offset](../modules/lexical_offset.md).OffsetView

## 建構子

### constructor

• **new OffsetView**(`offsetMap`, `firstNode`, `blockOffsetSize?`): [`OffsetView`](lexical_offset.OffsetView.md)

#### 參數

| 名稱              | 類型                   | 預設值      |
| :---------------- | :--------------------- | :---------- |
| `offsetMap`       | `OffsetMap`            | `undefined` |
| `firstNode`       | `null` \| `OffsetNode` | `undefined` |
| `blockOffsetSize` | `number`               | `1`         |

#### 返回

[`OffsetView`](lexical_offset.OffsetView.md)

#### 定義於

[packages/lexical-offset/src/index.ts:65](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L65)

## 屬性

### \_blockOffsetSize

• **\_blockOffsetSize**: `number`

#### 定義於

[packages/lexical-offset/src/index.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L63)

---

### \_firstNode

• **\_firstNode**: `null` \| `OffsetNode`

#### 定義於

[packages/lexical-offset/src/index.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L62)

---

### \_offsetMap

• **\_offsetMap**: `OffsetMap`

#### 定義於

[packages/lexical-offset/src/index.ts:61](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L61)

## 方法

### createSelectionFromOffsets

▸ **createSelectionFromOffsets**(`originalStart`, `originalEnd`, `diffOffsetView?`): `null` \| [`RangeSelection`](lexical.RangeSelection.md)

#### 參數

| 名稱              | 類型                                         |
| :---------------- | :------------------------------------------- |
| `originalStart`   | `number`                                     |
| `originalEnd`     | `number`                                     |
| `diffOffsetView?` | [`OffsetView`](lexical_offset.OffsetView.md) |

#### 返回

`null` \| [`RangeSelection`](lexical.RangeSelection.md)

#### 定義於

[packages/lexical-offset/src/index.ts:75](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L75)

---

### getOffsetsFromSelection

▸ **getOffsetsFromSelection**(`selection`): [`number`, `number`]

#### 參數

| 名稱        | 類型                                          |
| :---------- | :-------------------------------------------- |
| `selection` | [`RangeSelection`](lexical.RangeSelection.md) |

#### 返回

[`number`, `number`]

#### 定義於

[packages/lexical-offset/src/index.ts:189](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L189)
