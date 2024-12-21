---
id: 'lexical_offset'
title: '模組: @lexical/offset'
custom_edit_url: null
---

## 類別

- [OffsetView](../classes/lexical_offset.OffsetView.md)

## 函數

### $createChildrenArray

▸ **$createChildrenArray**(`element`, `nodeMap`): [`NodeKey`](lexical.md#nodekey)[]

#### 參數

| 名稱      | 類型                                               |
| :-------- | :------------------------------------------------- |
| `element` | [`ElementNode`](../classes/lexical.ElementNode.md) |
| `nodeMap` | `null` \| [`NodeMap`](lexical.md#nodemap)          |

#### 返回

[`NodeKey`](lexical.md#nodekey)[]

#### 定義於

[packages/lexical-offset/src/index.ts:540](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L540)

---

### $createOffsetView

▸ **$createOffsetView**(`editor`, `blockOffsetSize?`, `editorState?`): [`OffsetView`](../classes/lexical_offset.OffsetView.md)

#### 參數

| 名稱              | 類型                                                         | 預設值      |
| :---------------- | :----------------------------------------------------------- | :---------- |
| `editor`          | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)       | `undefined` |
| `blockOffsetSize` | `number`                                                     | `1`         |
| `editorState?`    | `null` \| [`EditorState`](../classes/lexical.EditorState.md) | `undefined` |

#### 返回

[`OffsetView`](../classes/lexical_offset.OffsetView.md)

#### 定義於

[packages/lexical-offset/src/index.ts:560](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L560)

---

### createChildrenArray

▸ **createChildrenArray**(`element`, `nodeMap`): [`NodeKey`](lexical.md#nodekey)[]

#### 參數

| 名稱      | 類型                                               |
| :-------- | :------------------------------------------------- |
| `element` | [`ElementNode`](../classes/lexical.ElementNode.md) |
| `nodeMap` | `null` \| [`NodeMap`](lexical.md#nodemap)          |

#### 返回

[`NodeKey`](lexical.md#nodekey)[]

**`已淘汰`**

已被 @lexical/eslint-plugin rules-of-lexical 重命名為 [$createChildrenArray](lexical_offset.md#$createchildrenarray)

#### 定義於

[packages/lexical-offset/src/index.ts:558](https://github.com/facebook/lexical/tree/main/packages/lexical-offset/src/index.ts#L558)
